const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173';
const routes = [
  { path: '/', lang: 'en', dir: 'ltr', nextLang: 'tr', nextPath: '/languages/tr.html' },
  { path: '/languages/tr.html', lang: 'tr', dir: 'ltr', nextLang: 'ar', nextPath: '/languages/ar.html' },
  { path: '/languages/ar.html', lang: 'ar', dir: 'rtl', nextLang: 'en', nextPath: '/index.html' },
];


async function assertResponsiveText(page, width, routePath) {
  const metrics = await page.evaluate(() => {
    const headings = [...document.querySelectorAll('h1, h2, h3, .h1, .section-title')];
    const tightHeadings = headings.filter(el => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const style = getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight);
      return Number.isFinite(fontSize) && Number.isFinite(lineHeight) && lineHeight < fontSize * 1.02;
    }).map(el => ({ text: (el.innerText || '').trim().slice(0, 70), fontSize: getComputedStyle(el).fontSize, lineHeight: getComputedStyle(el).lineHeight }));
    return { viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, tightHeadings };
  });
  assert.ok(metrics.scrollWidth <= width + 1, routePath + ' must not horizontally overflow at ' + width + 'px: ' + JSON.stringify(metrics));
  assert.equal(metrics.tightHeadings.length, 0, routePath + ' headings must have non-overlapping line-height at ' + width + 'px: ' + JSON.stringify(metrics.tightHeadings));
}

async function visible(page, selector) {
  return page.locator(selector).evaluate(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    const videoHead = await fetch(BASE + '/asset/video/banner-vid1.MP4', { method: 'HEAD' });
    assert.equal(videoHead.status, 200, 'hero video asset must be served');
    assert.ok(Number(videoHead.headers.get('content-length')) > 0, 'hero video must be non-empty');
    const responsiveCssHead = await fetch(BASE + '/asset/css/responsive-overrides.css', { method: 'HEAD' });
    assert.equal(responsiveCssHead.status, 200, 'shared responsive stylesheet must be served');
    assert.match(responsiveCssHead.headers.get('content-type') || '', /text\/css|application\/octet-stream/);
    const faviconHead = await fetch(BASE + '/asset/logo/favicon.svg', { method: 'HEAD' });
    assert.equal(faviconHead.status, 200, 'favicon SVG must be served');
    assert.match(faviconHead.headers.get('content-type') || '', /image\/svg\+xml|application\/octet-stream/);

    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(route.path + ' pageerror: ' + error.message));
      page.on('response', response => {
        if (response.url().startsWith(BASE) && response.status() >= 400)
          failures.push(route.path + ' HTTP ' + response.status() + ': ' + response.url());
      });

      const response = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route.path + ' should load');
      await page.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
      assert.equal(await page.locator('html').getAttribute('lang'), route.lang);
      assert.equal(await page.locator('html').getAttribute('dir') || 'ltr', route.dir);
      assert.ok((await page.locator('h1').innerText()).trim().length > 0, route.path + ' hero heading should be visible');
      await page.locator('.nav .logo-image').evaluate(img => img.decode());
      assert.ok(await page.locator('.nav .logo-image').evaluate(img => img.naturalWidth > 0), 'brand logo must decode');
      assert.equal(await page.locator('#primaryNavigation a').count(), 5, 'primary navigation should contain five links');

      await page.locator('#lang').click();
      assert.equal(await page.locator('#lang').getAttribute('aria-expanded'), 'true');
      await page.waitForFunction(() => { const menu = document.querySelector('#languageMenu'); const style = getComputedStyle(menu); return style.visibility === 'visible' && Number(style.opacity) > 0; });
      assert.ok(await visible(page, '#languageMenu'), 'language menu should open');
      assert.equal(await page.locator('#languageMenu [data-lang]').count(), 3, 'all languages must be selectable');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#lang').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'lang', 'Escape should restore focus to language control');

      for (const width of [1024, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await assertResponsiveText(page, width, route.path);
      }

      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
        await assertResponsiveText(page, width, route.path);
        assert.equal(await visible(page, '#mobileNavToggle'), false, width + 'px mobile view must not show a hamburger button');
        assert.ok(await visible(page, '#primaryNavigation'), width + 'px primary navigation should remain visible without a hamburger');
        const navRect = await page.locator('#primaryNavigation').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width, display: getComputedStyle(el).display, flexDirection: getComputedStyle(el).flexDirection, overflowX: getComputedStyle(el).overflowX };
        });
        assert.ok(navRect.left >= -1 && navRect.right <= width + 1, width + 'px horizontal navigation should stay within viewport: ' + JSON.stringify(navRect));
        assert.equal(await page.locator('#primaryNavigation a').count(), 5);
        assert.equal(navRect.flexDirection, 'row', width + 'px navigation should use a horizontal row');
        assert.equal(navRect.overflowX, 'auto', width + 'px navigation should scroll horizontally rather than wrap or overflow the page');

        await page.locator('#lang').click();
        await page.waitForFunction(() => { const menu = document.querySelector('#languageMenu'); const style = getComputedStyle(menu); return style.visibility === 'visible' && Number(style.opacity) > 0; });
        const menuRect = await page.locator('#languageMenu').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        });
        assert.ok(menuRect.left >= -1 && menuRect.right <= width + 1, width + 'px language menu should stay within viewport: ' + JSON.stringify(menuRect));
        await page.keyboard.press('Escape');
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 1, width + 'px page should not overflow horizontally');
      }

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('#lang').click();
      await Promise.all([
        page.waitForURL(url => url.pathname === route.nextPath),
        page.locator('#languageMenu [data-lang="' + route.nextLang + '"]').click(),
      ]);
      await page.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
      assert.equal(await page.locator('html').getAttribute('lang'), route.nextLang, 'language link should reach the right locale');

      await context.close();
    }


    // The blog uses a different hero markup (.inner, not .hero-inner). Keep
    // the homepage's full-height mobile hero rules from creating a blank gap.
    const blogRoutes = [
      { path: '/blog/en/index.html', lang: 'en' },
      { path: '/blog/tr/index.html', lang: 'tr' },
      { path: '/blog/ar/index.html', lang: 'ar' },
    ];
    for (const route of blogRoutes) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(route.path + ' pageerror: ' + error.message));
      page.on('response', response => {
        if (response.url().startsWith(BASE) && response.status() >= 400)
          failures.push(route.path + ' HTTP ' + response.status() + ': ' + response.url());
      });
      const response = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route.path + ' should load');
      assert.equal(await page.locator('html').getAttribute('lang'), route.lang);
      assert.ok((await page.locator('h1').innerText()).trim().length > 0, route.path + ' blog heading should be present');
      assert.equal(await page.locator('link[href="/asset/css/responsive-overrides.css"]').count(), 1, 'blog must load shared responsive overrides');

      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        const metrics = await page.evaluate(() => {
          const hero = document.querySelector('main > .hero');
          const header = document.querySelector('header.top');
          const tag = document.querySelector('main > .hero .tag');
          const nav = document.querySelector('header.top nav.nav');
          const headerItems = [...document.querySelectorAll('header.top nav.nav > a, header.top nav.nav summary')];
          const rect = el => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          return {
            viewport: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            hero: rect(hero),
            header: rect(header),
            tag: rect(tag),
            nav: rect(nav),
            itemBounds: headerItems.map(rect),
          };
        });
        assert.ok(metrics.scrollWidth <= width + 1, route.path + ' must not horizontally overflow at ' + width + 'px: ' + JSON.stringify(metrics));
        assert.ok(metrics.tag.top - metrics.hero.top <= 100, route.path + ' hero eyebrow must not have a large blank top gap at ' + width + 'px: ' + JSON.stringify(metrics));
        assert.ok(metrics.nav.left >= -1 && metrics.nav.right <= width + 1, route.path + ' mobile nav must stay within viewport at ' + width + 'px: ' + JSON.stringify(metrics.nav));
        for (const item of metrics.itemBounds) {
          assert.ok(item.left >= -1 && item.right <= width + 1, route.path + ' nav items must stay within viewport at ' + width + 'px: ' + JSON.stringify(item));
        }
      }
      await context.close();
    }

    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    });
    const noJsPage = await noJsContext.newPage();
    const noJsResponse = await noJsPage.goto(BASE + '/languages/ar.html', { waitUntil: 'domcontentloaded' });
    assert.equal(noJsResponse.status(), 200);
    assert.equal(await noJsPage.locator('html').getAttribute('dir'), 'rtl');
    assert.ok(await noJsPage.locator('body').evaluate(el => el.classList.contains('arabic')), 'Arabic styles must be present before JS');
    assert.ok((await noJsPage.locator('h1').innerText()).includes('مرحباً'), 'Arabic headline must be present without JS');
    assert.equal(await noJsPage.locator('.reveal').first().evaluate(el => getComputedStyle(el).opacity), '1', 'reveal content must remain visible without JS');
    assert.ok(await visible(noJsPage, '#primaryNavigation'), 'mobile navigation links must remain available without JS');
    await noJsContext.close();

    const reduceContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    const reducePage = await reduceContext.newPage();
    await reducePage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await reducePage.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
    assert.equal(await reducePage.locator('.hero-video').evaluate(v => getComputedStyle(v).display), 'none', 'hero video should be hidden for reduced-motion users');
    assert.equal(await reducePage.locator('.hero-video').evaluate(v => v.paused), true, 'hero video should remain paused for reduced-motion users');
    await reduceContext.close();

    if (failures.length) throw new Error(failures.join('\n'));
    console.log('Browser QA passed: locale routes, language menu, Escape/focus, hamburger-free horizontal mobile navigation and viewport bounds (390px/320px), logo/favicon/video asset responses, no-JS content visibility, Arabic RTL, and reduced-motion video behavior.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
