from io import BytesIO
import base64
from contextlib import closing
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape as html_escape
import hmac
import ipaddress
import json
import os
import random
import re
import sqlite3
import time
import traceback
from xml.sax.saxutils import escape as xml_escape

import requests
import user_agents
import qrcode
import cowsay
from PIL import Image
from flask import (
    Flask,
    Response,
    jsonify,
    render_template,
    request,
    send_from_directory,
)
from bs4 import BeautifulSoup, NavigableString
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer


def load_dotenv():
    # shortcut: KEY=value, quotes and # comments only; no interpolation/multiline.
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    try:
        with open(path, encoding="utf-8-sig") as env_file:
            for line in env_file:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                if line.startswith("export "):
                    line = line[7:].lstrip()
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()
                if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                    value = value[1:-1]
                if key:
                    os.environ.setdefault(key, value)
    except FileNotFoundError:
        pass


# .env lives next to app.py; real environment variables take priority.
load_dotenv()

app = Flask(__name__)


@app.context_processor
def inject_globals():
    return {"current_year": datetime.now().year}

NEWS_CACHE = {
    "data": [],
    "timestamp": 0,
    "ttl": 600,
}

TELEGRAM_CHANNELS = ["vntrum_public"]

TG_CHANNEL_SLUG = os.environ.get("TG_CHANNEL_SLUG", TELEGRAM_CHANNELS[0])
TG_CHANNEL_ID = os.environ.get("TG_CHANNEL_ID", "").strip()
TG_BOT_TOKEN = os.environ.get("TG_BOT_TOKEN", "").strip()
TG_WEBHOOK_SECRET = os.environ.get("TG_WEBHOOK_SECRET", "").strip()
TG_DB_PATH = os.environ.get("TG_DB_PATH", "posts.db")
TG_MEDIA_DIR = os.path.join("static", "tg-media")
TG_MEDIA_URL = "/tg-media"


COOL_404_MESSAGES = [
    "The page you seek had been distroyed by quantum fluctations.",
    "Looks like you've taken a wrong turn.",
    "Error 404: Your destination is more elusive than developer's first salary",
    "This URL is a mirage. Keep searching.",
    "The server greets you with silence. Page not found.",
    "Access to this page is denied. It does not exist.",
    "You have reached the edge of the internet. Turn back.",
    "404: The requested resource is playing hide and seek.",
    "This is not the web page you are looking for. Move along.",
    "Houston, we have a problem. Page not found..."
]

ALLOWED_POST_TAGS = {
    "a",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "code",
    "pre",
    "blockquote",
    "s",
    "del",
    "u",
}

URL_RE = re.compile(r"(https?://[^\s<]+|t\.me/[^\s<]+)")


def normalize_href(raw_href):
    href = (raw_href or "").strip()
    if href.startswith("//"):
        href = f"https:{href}"
    elif href.startswith("/"):
        href = f"https://t.me{href}"
    elif href.startswith("t.me/"):
        href = f"https://{href}"
    return href


def linkify_text_node(text):
    if not text or not URL_RE.search(text):
        return None

    fragment = BeautifulSoup("", "html.parser")
    cursor = 0
    found = False

    for match in URL_RE.finditer(text):
        start, end = match.span()
        if start > cursor:
            fragment.append(NavigableString(text[cursor:start]))

        raw_url = match.group(0)
        trailing = ""
        while raw_url and raw_url[-1] in ".,!?:;)":
            trailing = raw_url[-1] + trailing
            raw_url = raw_url[:-1]

        href = normalize_href(raw_url)
        if href.startswith(("http://", "https://", "tg://")) and raw_url:
            a = fragment.new_tag("a", href=href)
            a["target"] = "_blank"
            a["rel"] = "noopener noreferrer nofollow"
            a.string = raw_url
            fragment.append(a)
            found = True
        else:
            fragment.append(NavigableString(match.group(0)))

        if trailing:
            fragment.append(NavigableString(trailing))

        cursor = end

    if cursor < len(text):
        fragment.append(NavigableString(text[cursor:]))

    return fragment if found else None


def sanitize_telegram_post_html(raw_html):
    if not raw_html:
        return ""

    # Remove visual separators that sometimes appear in scraped Telegram HTML.
    cleaned_raw = re.sub(r"\|\s*\|\s*", " ", raw_html)
    cleaned_raw = re.sub(r"\|\s*<br\s*/?>", "<br>", cleaned_raw, flags=re.IGNORECASE)
    cleaned_raw = cleaned_raw.strip(" |")

    soup = BeautifulSoup(cleaned_raw, "html.parser")

    for tag in soup.find_all(True):
        if tag.name in {"script", "style", "iframe", "object"}:
            tag.decompose()
            continue

        if tag.name not in ALLOWED_POST_TAGS:
            tag.unwrap()
            continue

        if tag.name == "a":
            href = normalize_href(tag.get("href") or "")

            if not href.startswith(("http://", "https://", "tg://")):
                tag.unwrap()
                continue

            tag.attrs = {
                "href": href,
                "target": "_blank",
                "rel": "noopener noreferrer nofollow",
            }
            continue

        tag.attrs = {}

    for text_node in list(soup.find_all(string=True)):
        parent_name = text_node.parent.name if text_node.parent else ""
        if parent_name in {"a", "code", "pre"}:
            continue
        linked_fragment = linkify_text_node(str(text_node))
        if linked_fragment:
            new_nodes = list(linked_fragment.contents)
            if new_nodes:
                text_node.replace_with(new_nodes[0])
                prev = new_nodes[0]
                for node in new_nodes[1:]:
                    prev.insert_after(node)
                    prev = node

    # Collapse excessive line breaks while preserving intentional spacing.
    for _ in range(3):
        for br in soup.find_all("br"):
            nxt = br.next_sibling
            if getattr(nxt, "name", None) == "br":
                nxt.extract()

    html = str(soup).strip()
    if not html:
        return ""

    # Avoid returning meaningless separators-only strings.
    text_only = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    if not text_only:
        return ""

    return html


def _rich_link(href, text):
    href = normalize_href((href or "").strip())
    body = render_rich_text(text) or html_escape(href)
    if not href.startswith(("http://", "https://", "tg://", "mailto:", "tel:")):
        return body
    return f'<a href="{html_escape(href, quote=True)}">{body}</a>'


def render_rich_text(node):
    if node is None:
        return ""
    if isinstance(node, str):
        return html_escape(node)
    if isinstance(node, list):
        return "".join(render_rich_text(item) for item in node)
    if not isinstance(node, dict):
        return html_escape(str(node))

    node_type = node.get("type")
    text = node.get("text")

    if node_type == "bold":
        return f"<strong>{render_rich_text(text)}</strong>"
    if node_type == "italic":
        return f"<em>{render_rich_text(text)}</em>"
    if node_type == "underline":
        return f"<u>{render_rich_text(text)}</u>"
    if node_type == "strikethrough":
        return f"<s>{render_rich_text(text)}</s>"
    if node_type == "code":
        return f"<code>{render_rich_text(text)}</code>"
    if node_type == "url":
        return _rich_link(node.get("url"), text)
    if node_type == "email_address":
        return _rich_link(f"mailto:{node.get('email_address') or ''}", text)
    if node_type == "phone_number":
        return _rich_link(f"tel:{node.get('phone_number') or ''}", text)
    if node_type == "text_mention":
        username = (node.get("user") or {}).get("username")
        return (
            _rich_link(f"https://t.me/{username}", text)
            if username
            else render_rich_text(text)
        )
    if node_type == "mention":
        return _rich_link(f"https://t.me/{str(text or '').lstrip('@')}", text)
    if node_type == "custom_emoji":
        return html_escape(node.get("alternative_text") or "")
    if node_type == "mathematical_expression":
        return f"<code>{html_escape(node.get('expression') or '')}</code>"

    # shortcut: spoilers, anchors and buttons lose styling, text only.
    return render_rich_text(text)


def _render_rich_caption(caption):
    if not isinstance(caption, dict):
        return ""
    return render_rich_text(caption.get("text"))


def _render_rich_list(block):
    items = [item for item in block.get("items") or [] if isinstance(item, dict)]
    ordered = any(
        item.get("label") or item.get("value") is not None or item.get("type")
        for item in items
    )
    parts = []
    for index, item in enumerate(items, start=1):
        body = render_rich_blocks(item.get("blocks"))
        if not body:
            continue
        if item.get("has_checkbox"):
            prefix = "☑" if item.get("is_checked") else "☐"
        else:
            prefix = f"{index}." if ordered else "•"
        parts.append(f"{prefix} {body}")
    return "<br>".join(parts)


def _render_rich_table(block):
    # shortcut: tables are flattened to text rows; upgrade if full posts are rendered.
    rows = []
    for row in block.get("cells") or []:
        cells = []
        for cell in row or []:
            if not isinstance(cell, dict):
                continue
            text = render_rich_text(cell.get("text")).strip()
            if text:
                cells.append(text)
        if cells:
            rows.append(" — ".join(cells))
    caption = _render_rich_caption(block.get("caption"))
    if caption:
        rows.insert(0, caption)
    return "<br>".join(rows)


def render_rich_block(block):
    block_type = block.get("type")

    if block_type == "paragraph":
        return render_rich_text(block.get("text"))
    if block_type == "heading":
        return f"<strong>{render_rich_text(block.get('text'))}</strong>"
    if block_type == "pre":
        return f"<pre><code>{render_rich_text(block.get('text'))}</code></pre>"
    if block_type in {"footer", "pullquote"}:
        return render_rich_text(block.get("text"))
    if block_type == "divider":
        return "—"
    if block_type == "list":
        return _render_rich_list(block)
    if block_type == "blockquote":
        inner = render_rich_blocks(block.get("blocks"))
        credit = render_rich_text(block.get("credit"))
        if credit:
            inner = f"{inner}<br><em>{credit}</em>"
        return f"<blockquote>{inner}</blockquote>" if inner else ""
    if block_type == "expandable_blockquote":
        inner = render_rich_text(block.get("text"))
        credit = render_rich_text(block.get("credit"))
        if credit:
            inner = f"{inner}<br><em>{credit}</em>"
        return f"<blockquote>{inner}</blockquote>" if inner else ""
    if block_type == "details":
        summary = f"<strong>{render_rich_text(block.get('summary'))}</strong>"
        inner = render_rich_blocks(block.get("blocks"))
        return f"{summary}<br>{inner}" if inner else summary
    if block_type == "table":
        return _render_rich_table(block)
    if block_type in {"collage", "slideshow"}:
        parts = [
            render_rich_blocks(block.get("blocks")),
            _render_rich_caption(block.get("caption")),
        ]
        return "<br>".join(part for part in parts if part)
    if block_type in {
        "animation",
        "audio",
        "document",
        "photo",
        "video",
        "voice_note",
    }:
        # shortcut: only the first photo is stored, other media stays in Telegram.
        return _render_rich_caption(block.get("caption"))

    return ""


def render_rich_blocks(blocks):
    parts = []
    for block in blocks or []:
        if not isinstance(block, dict):
            continue
        fragment = render_rich_block(block)
        if fragment:
            parts.append(fragment)
    return "<br>".join(parts)


def render_rich_message(rich_message):
    if not isinstance(rich_message, dict):
        return ""
    return sanitize_telegram_post_html(render_rich_blocks(rich_message.get("blocks")))


_tg_db_initialized = False


def get_tg_db():
    conn = sqlite3.connect(TG_DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=10000")
    return conn


def init_tg_db():
    global _tg_db_initialized
    if _tg_db_initialized:
        return
    with closing(get_tg_db()) as conn, conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tg_posts ("
            "chat_id INTEGER NOT NULL, "
            "message_id INTEGER NOT NULL, "
            "posted_at TEXT NOT NULL, "
            "url TEXT, "
            "raw_json TEXT NOT NULL, "
            "image_path TEXT, "
            "updated_at TEXT NOT NULL, "
            "PRIMARY KEY (chat_id, message_id))"
        )
    _tg_db_initialized = True


def _find_tg_photo(message):
    photos = message.get("photo")
    if photos:
        return photos[-1].get("file_id")

    def walk(blocks):
        for block in blocks or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "photo":
                sizes = block.get("photo") or []
                if sizes:
                    return sizes[-1].get("file_id")
            found = walk(block.get("blocks"))
            if found:
                return found
            for item in block.get("items") or []:
                found = walk((item or {}).get("blocks"))
                if found:
                    return found
        return None

    rich = message.get("rich_message") or {}
    return walk(rich.get("blocks"))


def _download_tg_photo(file_id, chat_id, message_id):
    if not TG_BOT_TOKEN or not file_id:
        return None
    try:
        info = requests.get(
            f"https://api.telegram.org/bot{TG_BOT_TOKEN}/getFile",
            params={"file_id": file_id},
            timeout=10,
        )
        info.raise_for_status()
        file_path = (info.json().get("result") or {}).get("file_path")
        if not file_path:
            return None

        media = requests.get(
            f"https://api.telegram.org/file/bot{TG_BOT_TOKEN}/{file_path}",
            timeout=15,
        )
        media.raise_for_status()

        extension = os.path.splitext(file_path)[1].lower() or ".jpg"
        filename = f"{chat_id}_{message_id}{extension}"
        os.makedirs(TG_MEDIA_DIR, exist_ok=True)
        with open(os.path.join(TG_MEDIA_DIR, filename), "wb") as photo:
            photo.write(media.content)
        return f"{TG_MEDIA_URL}/{filename}"
    except Exception as exc:
        # The image is optional: a failed download must not drop the post.
        print(f"Could not download telegram photo: {exc}")
        return None


def _load_tg_post_image(chat_id, message_id):
    with closing(get_tg_db()) as conn:
        row = conn.execute(
            "SELECT image_path FROM tg_posts WHERE chat_id = ? AND message_id = ?",
            (chat_id, message_id),
        ).fetchone()
    return row["image_path"] if row else None


def save_tg_post(message):
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    message_id = message.get("message_id")
    if chat_id is None or message_id is None:
        return

    init_tg_db()
    posted_at = datetime.fromtimestamp(
        message.get("date") or time.time(), tz=timezone.utc
    ).isoformat()
    url = f"https://t.me/{chat.get('username') or TG_CHANNEL_SLUG}/{message_id}"

    photo_file_id = _find_tg_photo(message)
    image_path = (
        _download_tg_photo(photo_file_id, chat_id, message_id)
        if photo_file_id
        else None
    )
    if photo_file_id and not image_path:
        image_path = _load_tg_post_image(chat_id, message_id)

    with closing(get_tg_db()) as conn, conn:
        conn.execute(
            "INSERT INTO tg_posts "
            "(chat_id, message_id, posted_at, url, raw_json, image_path, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(chat_id, message_id) DO UPDATE SET "
            "posted_at = excluded.posted_at, "
            "url = excluded.url, "
            "raw_json = excluded.raw_json, "
            "image_path = excluded.image_path, "
            "updated_at = excluded.updated_at",
            (
                chat_id,
                message_id,
                posted_at,
                url,
                json.dumps(message, ensure_ascii=False),
                image_path,
                datetime.now(timezone.utc).isoformat(),
            ),
        )


def load_bot_posts(limit=50):
    try:
        init_tg_db()
        with closing(get_tg_db()) as conn:
            rows = conn.execute(
                "SELECT message_id, posted_at, url, raw_json, image_path "
                "FROM tg_posts ORDER BY posted_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    except Exception as exc:
        print(f"Could not load telegram posts: {exc}")
        return []

    posts = []
    for row in rows:
        try:
            message = json.loads(row["raw_json"])
        except (TypeError, ValueError):
            continue

        rich = message.get("rich_message")
        if isinstance(rich, dict):
            content = render_rich_message(rich)
        else:
            content = sanitize_telegram_post_html(
                message.get("text") or message.get("caption") or ""
            )
        image_url = row["image_path"]

        if not content and not image_url:
            continue

        chat = message.get("chat") or {}
        posts.append(
            {
                "content": content,
                "image_url": image_url,
                "datetime": row["posted_at"],
                "url": row["url"],
                "channel": {
                    "name": chat.get("title") or TG_CHANNEL_SLUG,
                    "avatar_url": "",
                    "slug": TG_CHANNEL_SLUG,
                },
                "_rich": bool(rich),
            }
        )
    return posts


@app.route("/tg/webhook/<secret>", methods=["POST"])
def telegram_webhook(secret):
    if not TG_WEBHOOK_SECRET or not hmac.compare_digest(secret, TG_WEBHOOK_SECRET):
        return "forbidden", 403
    header_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not hmac.compare_digest(header_secret, TG_WEBHOOK_SECRET):
        return "forbidden", 403

    update = request.get_json(silent=True)
    if not isinstance(update, dict):
        return "ok"

    message = update.get("channel_post") or update.get("edited_channel_post")
    if not message:
        return "ok"

    chat = message.get("chat") or {}
    if TG_CHANNEL_ID:
        if str(chat.get("id")) != TG_CHANNEL_ID:
            return "ok"
    elif (chat.get("username") or "").lower() != TG_CHANNEL_SLUG.lower():
        return "ok"

    try:
        save_tg_post(message)
    except Exception:
        traceback.print_exc()
        return "error", 500

    NEWS_CACHE["timestamp"] = 0
    return "ok"


@app.route("/qr/generate", methods=["POST"])
def generate_qr_code():
    data = request.json.get("data")
    if data:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return jsonify({"qr_code": img_str})
    return jsonify({"error": "No data provided"}), 400


@app.route("/qr")
def qr_page():
    return render_template("qr.html")


@app.route("/pswd")
def pswd_page():
    return render_template("pswd.html")


@app.route("/cidr")
def cidr_page():
    return render_template("cidr.html")


@app.route("/ip")
def ip_lookup():
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr).split(
        ","
    )[0].strip()
    requested_ip = request.args.get("ip", "").strip()
    ip_address = requested_ip or client_ip

    query_ip = ip_address
    try:
        ip_obj = ipaddress.ip_address(ip_address)
        if ip_obj.is_private or ip_obj.is_loopback:
            query_ip = ""
    except ValueError:
        # If custom input is not a valid IP, return a friendly error state.
        if requested_ip:
            ua_string = request.headers.get("User-Agent", "")
            user_agent_data = user_agents.parse(ua_string)
            ip_data = {
                "status": "fail",
                "message": "Invalid IP format",
                "query": requested_ip,
            }
            return render_template(
                "ip.html",
                ip_data=ip_data,
                user_agent=user_agent_data,
                requested_ip=requested_ip,
            )
        query_ip = ""

    api_url = (
        f"http://ip-api.com/json/{query_ip}"
        "?fields=status,message,continent,continentCode,country,countryCode,region,"
        "regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,"
        "as,asname,reverse,query,proxy,hosting,mobile"
    )

    ip_data = {}
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        ip_data = response.json()
    except requests.exceptions.RequestException as e:
        ip_data = {"status": "fail", "message": str(e), "query": ip_address}

    ua_string = request.headers.get("User-Agent", "")
    user_agent_data = user_agents.parse(ua_string)

    return render_template(
        "ip.html",
        ip_data=ip_data,
        user_agent=user_agent_data,
        requested_ip=requested_ip,
    )


def load_news(force_refresh=False):
    current_time = time.time()

    if (
        not force_refresh
        and NEWS_CACHE["data"]
        and (current_time - NEWS_CACHE["timestamp"] < NEWS_CACHE["ttl"])
    ):
        return NEWS_CACHE["data"], None

    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        }

        all_news = []

        for channel_slug in TELEGRAM_CHANNELS:
            try:
                response = requests.get(
                    f"https://t.me/s/{channel_slug}", headers=headers, timeout=10
                )
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "html.parser")

                channel_name_tag = soup.find(
                    "div", class_="tgme_channel_info_header_title"
                )
                channel_name = (
                    channel_name_tag.text.strip() if channel_name_tag else channel_slug
                )

                channel_avatar_i_tag = soup.find(
                    "i", class_="tgme_page_photo_image"
                )
                channel_avatar_url = ""
                if channel_avatar_i_tag:
                    channel_avatar_img_tag = channel_avatar_i_tag.find("img")
                    if channel_avatar_img_tag:
                        channel_avatar_url = channel_avatar_img_tag.get("src", "")

                messages = soup.find_all("div", class_="tgme_widget_message")
                if not messages:
                    continue

                for msg in messages:
                    post_html = ""
                    image_url = None
                    datetime_str = None
                    post_url = None

                    date_anchor = msg.find("a", class_="tgme_widget_message_date")
                    if date_anchor and date_anchor.find("time"):
                        datetime_str = date_anchor.find("time").get("datetime")
                        post_url = date_anchor.get("href")

                    text_div = msg.find("div", class_="tgme_widget_message_text")
                    if text_div:
                        raw_html = text_div.decode_contents()
                        post_html = sanitize_telegram_post_html(raw_html)

                    photo_div = msg.find("a", class_="tgme_widget_message_photo_wrap")
                    if photo_div:
                        style = photo_div.get("style", "")
                        if "url('" in style:
                            image_url = style.split("url('")[1].split("')")[0]

                    if not image_url:
                        video_thumb = msg.find(
                            "i", class_="tgme_widget_message_video_thumb"
                        )
                        if video_thumb:
                            style = video_thumb.get("style", "")
                            if "url('" in style:
                                image_url = style.split("url('")[1].split("')")[0]

                    if (post_html or image_url) and datetime_str:
                        all_news.append(
                            {
                                "content": post_html,
                                "image_url": image_url,
                                "datetime": datetime_str,
                                "url": post_url,
                                "channel": {
                                    "name": channel_name,
                                    "avatar_url": channel_avatar_url,
                                    "slug": channel_slug,
                                },
                            }
                        )
            except Exception as e:
                print(f"Could not parse channel {channel_slug}: {e}")

        merged = {post["url"]: post for post in all_news if post.get("url")}
        for post in load_bot_posts():
            rich = post.pop("_rich", False)
            url = post.get("url")
            if not url:
                continue
            # Keep web formatting for regular posts, the bot wins on rich ones.
            if url in merged and not rich and merged[url].get("content"):
                continue
            merged[url] = post
        all_news = list(merged.values())

        channel_avatar_url = next(
            (
                post["channel"]["avatar_url"]
                for post in all_news
                if post.get("channel", {}).get("avatar_url")
            ),
            "",
        )
        for post in all_news:
            channel = post.setdefault("channel", {})
            if not channel.get("avatar_url"):
                channel["avatar_url"] = channel_avatar_url

        all_news.sort(key=lambda x: x.get("datetime") or "", reverse=True)
        latest_news = all_news[:16]

        if not latest_news:
            return None, ("No valid content found", 404)

        NEWS_CACHE["data"] = latest_news
        NEWS_CACHE["timestamp"] = current_time

        return latest_news, None

    except Exception:
        traceback.print_exc()
        return None, ("Parsing error", 500)


@app.route("/get_news")
def get_news():
    force_refresh = request.args.get("force", "false").lower() == "true"
    data, error = load_news(force_refresh)
    if error:
        return jsonify({"error": error[0]}), error[1]
    return jsonify(data)


@app.route("/rss.xml")
def rss_feed():
    data, error = load_news()
    if error:
        return Response(
            "RSS temporarily unavailable",
            status=error[1],
            mimetype="text/plain",
        )

    items = []
    for post in data:
        plain = BeautifulSoup(post["content"] or "", "html.parser").get_text(
            " ", strip=True
        )
        title = (plain[:90] + "...") if len(plain) > 90 else (plain or "Новый пост")
        link = post.get("url") or f"https://t.me/{TELEGRAM_CHANNELS[0]}"
        published = ""

        try:
            published = format_datetime(datetime.fromisoformat(post["datetime"]))
        except (TypeError, ValueError):
            pass

        description = post.get("content") or ""
        image_url = post.get("image_url") or ""
        if image_url.startswith("/"):
            image_url = f"{request.url_root.rstrip('/')}{image_url}"
        if image_url:
            description += f'<p><img src="{xml_escape(image_url)}" alt=""></p>'

        items.append(
            "<item>"
            f"<title>{xml_escape(title)}</title>"
            f"<link>{xml_escape(link)}</link>"
            f"<guid>{xml_escape(link)}</guid>"
            f"<pubDate>{published}</pubDate>"
            f"<description><![CDATA[{description.replace(']]>', ']]&gt;')}]]></description>"
            "</item>"
        )

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0"><channel>'
        "<title>venterum — notes</title>"
        "<link>https://venterum.com/</link>"
        "<description>Посты из Telegram-канала vntrum_public</description>"
        "<language>ru</language>"
        + "".join(items)
        + "</channel></rss>"
    )
    return Response(feed, mimetype="application/rss+xml")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/now")
def now():
    return render_template("now.html")


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory("static", filename)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/kernel_panic")
def kernel_panic():
    return render_template("kernel_panic.html")


@app.route("/kernel_panic/thread/1")
def thread_grub():
    return render_template("thread_grub.html")


@app.route("/kernel_panic/404")
def not_found_retro():
    return render_template("404_retro.html"), 404


@app.route("/kernel_panic/thread/2")
def thread_pentium():
    return render_template("thread_pentium.html")


@app.route("/kernel_panic/thread/3")
def thread_linux():
    return render_template("thread_linux.html")


@app.route("/kernel_panic/thread/4")
def thread_bash():
    return render_template("thread_bash.html")


@app.errorhandler(404)
def page_not_found(e):
    message = random.choice(COOL_404_MESSAGES)
    random_cow_name = random.choice(cowsay.char_names)
    cow_art = cowsay.get_output_string(random_cow_name, message)
    path = request.path.lstrip("/")
    return render_template("404.html", cow_art=cow_art, path=path), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10007)
