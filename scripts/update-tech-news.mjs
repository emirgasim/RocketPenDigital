import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = "news/data/news.json";
const now = Date.now();
const cutoff = now - 48 * 60 * 60 * 1000;
const feeds = [
  { name: "ShiftDelete.Net", url: "https://shiftdelete.net/sdn-feed" },
  { name: "Webtekno", url: "https://www.webtekno.com/rss.xml" },
  { name: "Technopat", url: "https://www.technopat.net/feed/" }
];
function decodeXml(s = "") {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function tag(block, names) {
  for (const name of names) {
    const m = block.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + "\\s*>", "i"));
    if (m) return decodeXml(m[1]).trim();
  }
  return "";
}
function imageFrom(block) {
  for (const name of ["media:content", "media:thumbnail", "enclosure"]) {
    const m = block.match(new RegExp("<" + name + "\\b[^>]*\\burl=['\"]([^'\"]+)['\"]", "i"));
    if (m && /^https:\/\//i.test(m[1])) return decodeXml(m[1]);
  }
  const img = block.match(/<img\b[^>]*\bsrc=['"](https:\/\/[^'"]+)['"]/i);
  return img ? decodeXml(img[1]) : "";
}
function cleanHtml(s = "") {
  return decodeXml(s.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim().slice(0, 420);
}
function categoryFor(text) {
  const s = text.toLocaleLowerCase("tr-TR");
  if (/güvenlik|siber|hack|saldırı|veri sızınt|açık bulundu|zararlı yazılım|fidye yazılım|parola|şifre/.test(s)) return "security";
  if (/yapay zekâ|yapay zeka|chatgpt|gemini|claude|copilot|modelini duyur|modeli duyur/.test(s)) return "ai";
  if (/oyun|playstation|xbox|steam|nintendo|geforce|gpu|ekran kart/.test(s)) return "gaming";
  if (/telefon|iphone|android|samsung|xiaomi|oppo|pixel|tablet|katlanabilir/.test(s)) return "devices";
  if (/bilim|uzay|nasa|uydu|roket|astronomi/.test(s)) return "science";
  if (/otomobil|elektrikli araç|otomotiv|tesla|mobilite|bisiklet/.test(s)) return "mobility";
  return "apps";
}
function requiresReview(title, summary, category) {
  const s = (title + " " + summary).toLocaleLowerCase("tr-TR");
  return category === "security" || /ölüm|yaralan|sağlık|ilaç|mahkeme|savcılık|dolandırıcılık|sızıntı|saldırı|savaş|kriz|acil|skandal|iddiası|yatırım tavsiyesi/.test(s);
}
function slugFor(url, title) {
  return "rss-" + createHash("sha256").update(url || title).digest("hex").slice(0, 12);
}
async function getFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: { "user-agent": "RocketPenTechNewsBot/1.0 (+https://rocketpendigital.com/news/)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const xml = await response.text();
    const chunks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
    const items = [];
    for (const block of chunks) {
      const title = cleanHtml(tag(block, ["title"]));
      const linkTag = block.match(/<link\b[^>]*\bhref=['"]([^'"]+)['"][^>]*\/?\s*>/i);
      const link = tag(block, ["link", "guid"]) || (linkTag ? decodeXml(linkTag[1]) : "");
      const dateText = tag(block, ["pubDate", "published", "updated", "dc:date"]);
      const time = Date.parse(dateText);
      if (!title || !link || !/^https:\/\//i.test(link) || !Number.isFinite(time) || time < cutoff || time > now + 2 * 60 * 60 * 1000) continue;
      const description = cleanHtml(tag(block, ["description", "summary", "content:encoded", "content"]));
      const category = categoryFor(title + " " + description);
      const review = requiresReview(title, description, category);
      const image = imageFrom(block);
      items.push({
        slug: slugFor(link, title), lang: "tr", title,
        summary: description || "Kaynak haberi açarak ayrıntıları okuyun.",
        body: "## Haber özeti\n" + (description || "Kaynak beslemesinde ayrıntılı açıklama verilmedi.") +
          "\n\nBu kısa özet, " + feed.name + " RSS kaydındaki başlık ve açıklamaya dayanır. Ayrıntılar, güncellemeler ve bağlam için özgün kaynağı okuyun. RocketPen Tech, kaynakta yer alan iddiaları bağımsız doğruladığını ileri sürmez.",
        category, dateISO: new Date(time).toISOString().slice(0, 10),
        dateDisplay: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(time)),
        publishedAt: new Date(time).toISOString(), author: feed.name,
        status: review ? "pending" : "published", approved: !review, editorialApproved: !review,
        editorialApproval: review ? "pending" : "approved",
        sourceName: feed.name, sourceUrl: link, sources: [{ name: feed.name, url: link }],
        ...(image ? { imageUrl: image, imageAlt: title + " — kaynak görseli", imageCredit: feed.name + " RSS", imageLicense: "Kaynağın görsel kullanım koşulları geçerlidir.", imageSourceUrl: link } : {})
      });
    }
    console.log(feed.name + ": " + items.length + " stories within 48 hours");
    return items;
  } catch (error) {
    console.warn("Feed failed:", feed.name, String(error));
    return [];
  }
}
const original = JSON.parse(await readFile(DATA_PATH, "utf8"));
const existing = (original.stories || []).filter(s => {
  const stamp = Date.parse(s.publishedAt || s.dateISO || "");
  return Number.isFinite(stamp) && stamp >= cutoff && stamp <= now + 2 * 60 * 60 * 1000;
});
const fresh = (await Promise.all(feeds.map(getFeed))).flat();
const combined = new Map();
for (const story of [...existing, ...fresh]) {
  const key = story.sourceUrl || story.slug;
  const old = combined.get(key);
  if (!old || Date.parse(story.publishedAt || story.dateISO) > Date.parse(old.publishedAt || old.dateISO)) combined.set(key, story);
}
const stories = [...combined.values()].sort((a, b) => Date.parse(b.publishedAt || b.dateISO) - Date.parse(a.publishedAt || a.dateISO)).slice(0, 100);
if (JSON.stringify(stories) === JSON.stringify(original.stories || [])) {
  console.log("No new or changed headlines; leaving the data file untouched.");
  process.exit(0);
}
await writeFile(DATA_PATH, JSON.stringify({
  schemaVersion: 1, lastUpdated: new Date(now).toISOString(),
  editorialNote: "RSS summaries retain source attribution. Security and other sensitive/high-impact items remain pending editorial review. Source image rights remain subject to publisher terms.",
  stories
}, null, 2) + "\n");
console.log("Saved " + stories.length + " stories.");
