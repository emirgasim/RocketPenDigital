# RocketPen Digital Studio — Digital Blog SEO Plan

## Audience and language split

The site uses separate crawlable URLs for each language rather than swapping copy on one URL.

- **English — US, UK and broader English-speaking markets:** 4 articles per day. Topics use market-specific examples rather than treating all English markets as identical.
- **Turkish — Türkiye:** 3 articles per day, written in natural Turkish and aimed at local business intent.
- **Arabic — UAE and Qatar:** 3 articles per day in Modern Standard Arabic. The article brief alternates UAE, Qatar and shared Gulf business contexts instead of copying the same page between markets.

Daily total: **10 original article pages**, not ten thin translations of the same article.

## Content pillars

1. Brand strategy, positioning, messaging, naming and visual identity.
2. Website strategy, UX, performance, accessibility, technical SEO, local SEO and conversion.
3. Creative production, product/service video, short-form content and motion.
4. Social media planning, editorial calendars, content repurposing and brand voice.
5. Digital campaigns, analytics, lead journeys, experimentation and AI-assisted workflows.
6. Useful industry guides for real estate, hospitality, ecommerce, professional services, clinics and other businesses that can use RocketPen's services.

Every article should answer one real question, add an actionable framework or checklist, link to relevant services, and avoid unsubstantiated outcome guarantees.

## Current implementation

- Localized blog hubs:
  - `/blog/en/index.html`
  - `/blog/tr/index.html`
  - `/blog/ar/index.html`
- Initial in-depth launch guides:
  - English: `/blog/en/articles/high-converting-website-guide.html`
  - Turkish: `/blog/tr/articles/donusum-odakli-web-sitesi-rehberi.html`
  - Arabic: `/blog/ar/articles/website-guide-uae-qatar.html`
- The homepage has a localized **Digital Blog / Dijital Blog / المدونة الرقمية** section that links to each language's hub.
- Article HTML includes a unique title and meta description, a visible publication date, source links and `BlogPosting` JSON-LD.
- Daily publishing scans existing article metadata, creates new article pages, refreshes the three blog hubs, and can create `sitemap.xml`, `robots.txt`, canonicals and `hreflang` tags once the canonical site origin is configured.

## Daily automation

The workflow is `.github/workflows/daily-digital-blog.yml`. It schedules a daily run at 05:17 UTC (08:17 in Türkiye during UTC+3) and also supports manual dispatch.

It uses the OpenAI Responses API with web search, then checks each generated article for a valid slug, useful metadata, at least six sections, at least four FAQs, HTTPS source links and a minimum word-count threshold. If any article fails the checks, the run fails rather than committing an incomplete batch. The requested target is 900–1,300 words; the hard validation threshold is 800 words.

### One-time configuration required

Automatic publishing is **not active until the repository secrets/variables are configured**.

1. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**. Add `OPENAI_API_KEY` using your own OpenAI API key. Keep the key secret; do not paste it into the repository or chat.
2. Under **Settings → Secrets and variables → Actions → Variables**, add `SITE_URL` as the canonical public origin of the live site, for example `https://www.your-domain.example` (replace with the actual domain, with no path). This enables canonical URLs, alternate-language links, `sitemap.xml` and `robots.txt`.
3. Optional: define `OPENAI_MODEL` if you want to override the default high-volume model.
4. Open **Actions → Daily Digital Blog Publishing → Run workflow** once to validate the configuration. Review the run and resulting pages before relying on the daily schedule.

A missing API key causes the schedule to skip publishing. Without `SITE_URL`, article generation can still run, but canonical metadata and the sitemap are skipped.

## SEO and measurement rules

- Use unique, descriptive titles and meta descriptions. Put the reader's task first; use keywords naturally.
- Keep each article in its own HTML URL with visible language-specific content and explicit links to other language hubs.
- Use `hreflang` for equivalent home/blog-hub language versions. Do not claim that distinct locally written articles are translations of one another.
- Link each article to a relevant service and to other useful articles; avoid orphan pages.
- Review titles, sources, claims, translations, internal links and conversion CTAs periodically. Automated length checks are not a substitute for editorial judgment.
- After the canonical domain is set, verify the property in Google Search Console and submit `/sitemap.xml`. Monitor indexing, query impressions, clicks, qualified enquiries and conversion rates. Rankings and sales cannot be guaranteed.

## Important quality note

Ten posts per day is an aggressive publishing cadence. Google warns that generating many pages mainly to manipulate rankings, especially without original value, can qualify as scaled content abuse. This pipeline therefore requires research sources and substantial content rather than publishing short keyword pages. The automatic checks reduce obvious failures but cannot guarantee factual accuracy or search performance; review the first several daily batches closely and adjust the cadence if quality slips.

References:
- Google Search spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Helpful, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Multilingual and multi-regional sites: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- Sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
