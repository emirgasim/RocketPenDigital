# RocketPen Tech — staged newsroom rollout

Status: **scaffold and API-free feed intake are in the draft PR; not live/deployed**.

## Editions
- `/news/en/` — international English edition
- `/news/tr/` — Turkish edition
- `/news/ar/` — Modern Standard Arabic, RTL
- `/news/` — edition selector

## API-free automation now included
- `.github/workflows/rocketpen-tech-feeds.yml` runs every six hours or manually.
- `news/sources.json` is the curated RSS/Atom source list. It starts empty intentionally; no feed sources are silently assumed.
- `news/scripts/collect_feeds.py` uses Python's standard library only; no AI provider, API key, paid service, or third-party Python package is needed.
- Items are deduplicated by URL and stored in `news/queue/items.json` with source URL, original link, publication time when available, retrieval time, language, and review status.
- The workflow opens/updates a pull request for queue changes rather than publishing content directly.

## Important limitations
The collector gathers feed metadata and summaries for editorial triage; it does not write finished news articles, translate them, verify factual claims, fetch images, or publish anything. All entries remain `needs_editor_review`. Configure and review licensed/authorized HTTPS feed URLs in `news/sources.json` before expecting feed items.

## Editorial and publishing safeguards
1. Preserve source URLs, original publication time, retrieval time and language.
2. Write original, source-grounded articles; do not spin or republish source text verbatim.
3. Breaking, health, financial, legal, security, casualty, disputed or unverified claims require human approval.
4. Before any future publishing automation, validate facts, metadata, canonical URL, hreflang only for true equivalents, Article/NewsArticle and BreadcrumbList schema, image rights and sitemap inclusion.
5. No story is auto-published by the current workflow.

## Deployment
The existing Cloudflare deploy workflow still needs valid repository configuration: `CLOUDFLARE_API_TOKEN` as a GitHub Actions secret and `CLOUDFLARE_ACCOUNT_ID` as a GitHub Actions variable. A previously inspected run failed at credential verification. Never put secrets in source files or chat.
