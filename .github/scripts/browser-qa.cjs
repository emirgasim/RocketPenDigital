const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173';
const routes = [
  { path: '/', lang: 'en', dir: 'ltr', nextLang: 'tr', nextPath: '/languages/tr.html' },
  { path: '/languages/tr.html', lang: 'tr', dir: 'ltr', nextLang: 'ar', nextPath: '/languages/ar.html' },
  { path: '/languages/ar.html', lang: 'ar', dir: 'rtl', nextLang: 'en', nextPath: '/index.html' },
];

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
      await page.locator('.logo-image').evaluate(img => img.decode());
      assert.ok(await page.locator('.logo-image').evaluate(img => img.naturalWidth > 0), 'brand logo must decode');
      assert.equal(await page.locator('#primaryNavigation a').count(), 5, 'primary navigation should contain five links');

      await page.locator('#lang').click();
      assert.equal(await page.locator('#lang').getAttribute('aria-expanded'), 'true');
      assert.ok(await visible(page, '#languageMenu'), 'language menu should open');
      assert.equal(await page.locator('#languageMenu [data-lang]').count(), 3, 'all languages must be selectable');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#lang').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'lang', 'Escape should restore focus to language control');

      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
        assert.ok(await visible(page, '#mobileNavToggle'), width + 'px mobile menu button should be visible');
        assert.equal(await visible(page, '#primaryNavigation'), false, 'mobile navigation should start closed');
        await page.locator('#mobileNavToggle').click();
        assert.equal(await page.locator('#mobileNavToggle').getAttribute('aria-expanded'), 'true');
        assert.ok(await visible(page, '#primaryNavigation'), 'mobile navigation should open');
        const navRect = await page.locator('#primaryNavigation').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        });
        assert.ok(navRect.left >= -1 && navRect.right <= width + 1, width + 'px mobile navigation should stay within viewport: ' + JSON.stringify(navRect));
        assert.equal(await page.locator('#primaryNavigation a').count(), 5);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#mobileNavToggle').getAttribute('aria-expanded'), 'false');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'mobileNavToggle', 'Escape should restore focus to mobile menu control');

        await page.locator('#lang').click();
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
    console.log('Browser QA passed: locale routes, language menu, Escape/focus, mobile nav and viewport bounds (390px/320px), logo/favicon/video asset responses, no-JS content visibility, Arabic RTL, and reduced-motion video behavior.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
