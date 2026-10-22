import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "news" / "scripts" / "collect_feeds.py"
spec = importlib.util.spec_from_file_location("collect_feeds", SCRIPT)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class FeedParserTests(unittest.TestCase):
    def test_rss_extracts_source_link_and_metadata(self):
        xml = b"""<?xml version="1.0"?><rss version="2.0"><channel><item><title>Test &amp; Tech</title><link>https://example.com/story</link><description>A short summary.</description><pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>"""
        items = collector.parse_feed(xml, {"name":"Example","url":"https://example.com/feed.xml","language":"en"})
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Test & Tech")
        self.assertEqual(items[0]["article_url"], "https://example.com/story")
        self.assertEqual(items[0]["status"], "needs_editor_review")
        self.assertEqual(items[0]["language"], "en")

    def test_atom_link(self):
        xml = b"""<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom story</title><link href="https://example.com/atom-story" rel="alternate"/><summary>Summary</summary><updated>2026-10-21T10:00:00Z</updated></entry></feed>"""
        items = collector.parse_feed(xml, {"name":"Atom","url":"https://example.com/atom.xml"})
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["article_url"], "https://example.com/atom-story")

    def test_rejects_items_without_http_link(self):
        xml = b"""<rss><channel><item><title>Bad</title><link>javascript:alert(1)</link></item></channel></rss>"""
        self.assertEqual(collector.parse_feed(xml, {"url":"https://example.com/feed"}), [])

if __name__ == "__main__":
    unittest.main()
