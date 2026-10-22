# RocketPen Tech newsroom

A standalone, static multilingual newsroom at `/news/`, separate from the RocketPen Digital main navigation.

## Editions
- `/news/en/` — international English-language technology coverage
- `/news/tr/` — Türkiye-focused Turkish edition
- `/news/ar/` — Modern Standard Arabic, RTL, with Gulf-region relevance

## Design and publishing approach
- Uses the uploaded brand logo at `/asset/logo/RocketPenTech-Logo.png`.
- Responsive dark editorial design, category navigation, editorial/about/contact/advertising pages and a story data file.
- No invented placeholder stories. `data/news.json` intentionally starts empty.
- Story pages and category/listing views can be expanded as supplied stories are added.
- Human review is required for high-impact, disputed, sensitive or fast-breaking material. AI-generated prose is not evidence; source links and rights checks are required.
- No API key is required for the static pages. Automated intake or AI drafting would be a later, separately configured stage using repository secrets.

## Deploy
Cloudflare Pages/Workers deployment must include `news/**` in the workflow path filters. Deployment requires valid repository secret `CLOUDFLARE_API_TOKEN` and Actions variable `CLOUDFLARE_ACCOUNT_ID`. Do not paste secrets into source files or chat.

## Adding supplied stories
Each story should have a stable slug, localized title/summary/body, edition, category, publication date and time zone, author/editor credit, original source URLs, image source and licence/permission, canonical URL, SEO title/description, and editorial review status. Verify facts and links before publication.

## Historical archive import
The three root-level RocketPen Tech ZIP files are indexed at build time by `scripts/build_news_archive.py`. The generated `news/data/news.json` contains all Markdown articles with their language, original date string, normalized sortable date, author, category and full body. The Turkish files provide month/year only; their sortable date uses the first day of the month while the visible label preserves the original month/year. Future-dated articles remain scheduled until their supplied date. Source links are never invented; articles without source URLs disclose that none were supplied in the archive.
