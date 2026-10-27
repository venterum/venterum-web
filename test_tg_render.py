import os
import tempfile
import unittest

TMP_DIR = tempfile.TemporaryDirectory()
os.environ["TG_DB_PATH"] = os.path.join(TMP_DIR.name, "posts.db")
os.environ["TG_BOT_TOKEN"] = ""

from app import (  # noqa: E402
    _find_tg_photo,
    load_bot_posts,
    render_rich_message,
    save_tg_post,
)


class RichRenderTest(unittest.TestCase):
    def test_rich_blocks_and_escaping(self):
        rich = {
            "blocks": [
                {"type": "heading", "size": 2, "text": "Заголовок"},
                {
                    "type": "paragraph",
                    "text": [
                        "Привет, ",
                        {"type": "bold", "text": "мир"},
                        " <script>alert(1)</script> ",
                        {
                            "type": "url",
                            "url": "https://example.com",
                            "text": "ссылка",
                        },
                    ],
                },
                {
                    "type": "list",
                    "items": [
                        {"blocks": [{"type": "paragraph", "text": "раз"}]},
                        {"blocks": [{"type": "paragraph", "text": "два"}]},
                    ],
                },
                {
                    "type": "table",
                    "cells": [
                        [{"text": "a"}, {"text": "b"}],
                        [{"text": "c"}, {"text": "d"}],
                    ],
                },
            ]
        }

        html = render_rich_message(rich)

        self.assertIn("<strong>Заголовок</strong>", html)
        self.assertIn("<strong>мир</strong>", html)
        self.assertNotIn("<script>", html)
        self.assertIn('href="https://example.com"', html)
        self.assertIn("• раз<br/>• два", html)
        self.assertIn("a — b<br/>c — d", html)

    def test_empty_rich_message(self):
        self.assertEqual(render_rich_message({}), "")
        self.assertEqual(render_rich_message({"blocks": []}), "")

    def test_finds_nested_photo(self):
        message = {
            "rich_message": {
                "blocks": [
                    {
                        "type": "collage",
                        "blocks": [
                            {
                                "type": "photo",
                                "photo": [
                                    {"file_id": "small"},
                                    {"file_id": "big"},
                                ],
                            }
                        ],
                    }
                ]
            }
        }

        self.assertEqual(_find_tg_photo(message), "big")

    def test_save_and_load_post(self):
        message = {
            "message_id": 1,
            "date": 1700000000,
            "chat": {
                "id": -1001,
                "username": "vntrum_public",
                "title": "vntrum",
            },
            "rich_message": {
                "blocks": [{"type": "paragraph", "text": "тестовый пост"}]
            },
        }

        save_tg_post(message)
        posts = load_bot_posts()

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["content"], "тестовый пост")
        self.assertEqual(posts[0]["url"], "https://t.me/vntrum_public/1")
        self.assertTrue(posts[0]["_rich"])


if __name__ == "__main__":
    unittest.main()
