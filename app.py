from io import BytesIO
import base64
import ipaddress
import random
import re
import time
import traceback

import requests
import user_agents
import qrcode
import cowsay
from PIL import Image
from flask import Flask, render_template, request, send_from_directory, jsonify
from bs4 import BeautifulSoup, NavigableString
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

app = Flask(__name__)

NEWS_CACHE = {
    "data": [],
    "timestamp": 0,
    "ttl": 600,
}

TELEGRAM_CHANNELS = ["vntrum_public"]


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


@app.route("/ip")
def ip_lookup():
    ip_address = request.headers.get("X-Forwarded-For", request.remote_addr).split(
        ","
    )[0].strip()

    query_ip = ip_address
    try:
        ip_obj = ipaddress.ip_address(ip_address)
        if ip_obj.is_private or ip_obj.is_loopback:
            query_ip = ""
    except ValueError:
        pass

    api_url = (
        f"http://ip-api.com/json/{query_ip}"
        "?fields=status,message,country,countryCode,regionName,city,lat,lon,"
        "timezone,isp,org,query,proxy,hosting,mobile"
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

    return render_template("ip.html", ip_data=ip_data, user_agent=user_agent_data)


@app.route("/get_news")
def get_news():
    current_time = time.time()
    force_refresh = request.args.get("force", "false").lower() == "true"

    if (
        not force_refresh
        and NEWS_CACHE["data"]
        and (current_time - NEWS_CACHE["timestamp"] < NEWS_CACHE["ttl"])
    ):
        return jsonify(NEWS_CACHE["data"])

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
                        video_thumb = msg.find("i", class_="tgme_widget_message_video_thumb")
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

        all_news.sort(key=lambda x: x["datetime"], reverse=True)
        latest_news = all_news[:8]

        if not latest_news:
            return jsonify({"error": "No valid content found"}), 404

        NEWS_CACHE["data"] = latest_news
        NEWS_CACHE["timestamp"] = current_time

        return jsonify(latest_news)

    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Parsing error"}), 500


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
    return render_template("404.html", cow_art=cow_art), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10007)
