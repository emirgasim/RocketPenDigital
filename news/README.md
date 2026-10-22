# RocketPen Tech — staged newsroom rollout

Status: **scaffold only; not live/deployed**.

## Editions
- `/news/en/` — international English edition
- `/news/tr/` — Turkish edition
- `/news/ar/` — Modern Standard Arabic, RTL
- `/news/` — edition selector

## Current scope
This commit adds only a separate static landing-page scaffold. It does not collect feeds, generate AI stories, publish articles, modify the main navigation, or change the existing sitemap and redirects.

## Automation design (next stage)
1. Ingest permitted RSS feeds and official newsroom releases into an editorial queue.
2. Deduplicate by canonical source URL and normalized title.
3. Preserve source URLs, original publication time, retrieval time and language.
4. Use AI to draft original, source-grounded articles in each relevant edition; never merely spin a source article.
5. Apply risk gates. Only clearly low-risk stories with sufficient independent confirmation may be eligible for automatic publishing. Breaking, health, financial, legal, security, casualty, disputed or unverified claims require human approval.
6. Keep pending stories as drafts. Store article provenance and checks.
7. Validate metadata, canonical URL, hreflang only for true equivalents, Article/NewsArticle and BreadcrumbList schema, image rights and sitemap inclusion.
8. Deploy only after tests pass.

## Required secrets/configuration before AI automation
- `OPENAI_API_KEY` (GitHub Actions secret) or a deliberately selected provider key.
- `CLOUDFLARE_API_TOKEN` (GitHub Actions secret) and `CLOUDFLARE_ACCOUNT_ID` (GitHub Actions variable) are currently required by the existing production deploy workflow; the latest inspected run failed at credential verification.
- Feed list and licensing/source policy must be reviewed before enabling automatic ingestion.

Never put API keys in source files or chat. This scaffold intentionally has no scheduled publishing workflow and cannot publish live news yet.
