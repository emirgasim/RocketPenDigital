const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

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
    const overflowers = [...document.querySelectorAll('body *')].map(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      let clippedBy = '';
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const ps = getComputedStyle(parent);
        if (/(hidden|clip|scroll|auto)/.test(ps.overflowX)) {
          const pr = parent.getBoundingClientRect();
          if (r.left < pr.left - 1 || r.right > pr.right + 1) {
            clippedBy = parent.id ? '#' + parent.id : parent.className ? '.' + String(parent.className).split(/\\s+/).join('.') : parent.tagName.toLowerCase();
            break;
          }
        }
      }
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className.slice(0, 90) : '',
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        width: Math.round(r.width * 10) / 10,
        display: style.display,
        position: style.position,
        clippedBy,
        text: (el.innerText || '').trim().slice(0, 48)
      };
    }).filter(el => el.width > 0 && !el.clippedBy &&
                    (el.left < -1 || el.right > document.documentElement.clientWidth + 1))
      .sort((a,b) => Math.max(0, b.right-document.documentElement.clientWidth, -b.left) - Math.max(0, a.right-document.documentElement.clientWidth, -a.left))
      .slice(0, 15);
    const internalOverflowers = [...document.querySelectorAll('html, body, body *')].map(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className.slice(0, 90) : '',
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflowX: style.overflowX,
        position: style.position,
        text: (el.innerText || '').trim().slice(0, 48)
      };
    }).filter(el => el.scrollWidth > el.clientWidth + 1 && !/(hidden|clip|scroll|auto)/.test(el.overflowX))
      .sort((a,b) => (b.scrollWidth-b.clientWidth) - (a.scrollWidth-a.clientWidth))
      .slice(0, 15);
    return {
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      tightHeadings, overflowers, internalOverflowers
    };
  });
  const overflowIsClipped = metrics.htmlOverflowX === 'clip' || metrics.bodyOverflowX === 'clip';
  assert.ok(metrics.scrollWidth <= width + 1 || overflowIsClipped,
    routePath + ' must not allow horizontal page scrolling at ' + width + 'px: ' + JSON.stringify(metrics));
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


async function reviewCarouselState(page) {
  return page.evaluate(() => {
    const viewport = document.querySelector('#reviewsViewport');
    const track = document.querySelector('#reviewsTrack');
    if (!viewport || !track) throw new Error('reviews carousel markup is missing');
    const cards = [...track.querySelectorAll('.reviews-card')];
    if (cards.length !== 5) throw new Error('reviews carousel should render a five-card rolling window');
    const viewportRect = viewport.getBoundingClientRect();
    const cardRects = cards.map((el) => ({ el, rect: el.getBoundingClientRect() }));
    const nearest = cardRects
      .map((item) => ({ ...item, delta: Math.abs(item.rect.left - (viewportRect.left + 1)) }))
      .sort((a, b) => a.delta - b.delta)[0];
    const step = cardRects[1].rect.left - cardRects[0].rect.left;
    const matrix = new DOMMatrix(getComputedStyle(track).transform);
    const offset = -matrix.m41;
    const visible = cardRects.filter((item) => item.rect.right > viewportRect.left + 1 && item.rect.left < viewportRect.right - 1);
    const next = cardRects
      .filter((item) => item.rect.left > nearest.rect.left + 2)
      .sort((a, b) => a.rect.left - b.rect.left)[0];
    const peek = next ? Math.max(0, Math.min(viewportRect.right, next.rect.right) - Math.max(viewportRect.left, next.rect.left)) : 0;
    const indexText = nearest.el.querySelector('.reviews-card-index')?.textContent || '0';
    return {
      offset,
      step,
      alignment: nearest.delta,
      leftIndex: parseInt(indexText.split('/')[0], 10),
      visibleCards: visible.length,
      nextCardPeek: peek,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      setCount: track.querySelectorAll('.reviews-set').length,
      viewportWidth: viewportRect.width,
      sectionWidth: viewport.parentElement.getBoundingClientRect().width,
      firstCardWidth: cardRects[1].rect.width
    };
  });
}
async function dragReviews(page, direction, step) {
  await page.locator('#reviewsViewport').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const viewport = document.querySelector('#reviewsViewport');
    if (!viewport || viewport.dataset.qaTrace === 'true') return;
    viewport.dataset.qaTrace = 'true';
    window.__rpDragTrace = [];
    for (const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) {
      viewport.addEventListener(type, event => window.__rpDragTrace.push({
        type, x: Math.round(event.clientX), y: Math.round(event.clientY),
        button: event.button, pointerType: event.pointerType
      }));
    }
  });
  const box = await page.locator('#reviewsViewport').boundingBox();
  assert.ok(box, 'reviews viewport should have a bounding box');
  const startX = box.x + Math.min(box.width - 24, step * 0.8);
  const endX = startX - direction * step * 0.7;
  const y = box.y + Math.max(20, Math.min(box.height / 2, 72));
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  return page.evaluate(() => window.__rpDragTrace || []);
}

(async () => {
  const browserType = process.env.QA_BROWSER === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
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
      assert.notEqual(await page.locator('.hero-video').evaluate(v => getComputedStyle(v).display), 'none',
        route.path + ' hero video must not be hidden by responsive/accessibility CSS');
      assert.equal(await page.locator('.hero-video source').evaluate(source => new URL(source.src).pathname),
        '/asset/video/banner-vid1.MP4', route.path + ' hero video source must resolve correctly from every locale');
      await page.locator('.nav .logo-image').evaluate(img => img.decode());
      assert.ok(await page.locator('.nav .logo-image').evaluate(img => img.naturalWidth > 0), 'brand logo must decode');
      assert.equal(await page.locator('#primaryNavigation').count(), 0, 'top navigation menu must be removed');
      assert.equal(await page.locator('.nav-links').count(), 0, 'top navigation links must be removed');
      assert.equal(await page.locator('#mobileNavToggle').count(), 0, 'hamburger markup must not be included');

      assert.equal(await page.locator('.reviews-view-all').getAttribute('href'), '/reviews/' + route.lang + '/index.html', 'read-all link must point to the matching locale page');
      assert.ok(!/[↗↖⬆]/u.test(await page.locator('.reviews-view-all').innerText()), route.path + ' read-all link must not display decorative arrow emoji');
      await page.waitForFunction(() => document.querySelectorAll('#reviewsTrack .reviews-card').length === 5);
      assert.equal(await page.locator('#reviewsTrack .reviews-card').count(), 5, 'carousel should keep a small rolling window to avoid oversized WebKit layers');
      assert.equal(await page.locator('#reviewsTrack .reviews-set').count(), 0, 'carousel should not render giant duplicate review sets');
// Verify both wrap boundaries and rapid repeated navigation before unrelated
      // language-menu checks, so carousel regressions are surfaced directly.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#reviewsViewport').hover();
      await page.waitForTimeout(80);
      const boundaryStart = await reviewCarouselState(page);
      assert.ok(boundaryStart.viewportWidth >= boundaryStart.sectionWidth - 2,
        route.path + ' reviews viewport must use the full available mobile width: ' + JSON.stringify(boundaryStart));
      assert.ok(boundaryStart.viewportWidth > boundaryStart.firstCardWidth,
        route.path + ' mobile reviews viewport must reveal the next card instead of clipping to one narrow slice: ' + JSON.stringify(boundaryStart));
      assert.ok(boundaryStart.visibleCards >= 2,
        route.path + ' reviews carousel must render cards before the first interaction: ' + JSON.stringify(boundaryStart));
      const previousExpected = ((boundaryStart.leftIndex - 2 + 50) % 50) + 1;
      await page.locator('#reviewsPrev').click();
      await page.waitForTimeout(500);
      const afterPrevBoundary = await reviewCarouselState(page);
      assert.equal(afterPrevBoundary.leftIndex, previousExpected, route.path + ' previous arrow must wrap from review 1 to review 50: ' + JSON.stringify({boundaryStart,afterPrevBoundary}));
      assert.ok(afterPrevBoundary.alignment <= 5 && afterPrevBoundary.visibleCards >= 2, route.path + ' previous boundary must keep cards visible: ' + JSON.stringify(afterPrevBoundary));

      const nextExpected = (afterPrevBoundary.leftIndex % 50) + 1;
      await page.locator('#reviewsNext').click();
      await page.waitForTimeout(500);
      const afterNextBoundary = await reviewCarouselState(page);
      assert.equal(afterNextBoundary.leftIndex, nextExpected, route.path + ' next arrow must wrap from review 50 to review 1: ' + JSON.stringify({afterPrevBoundary,afterNextBoundary}));
      assert.ok(afterNextBoundary.alignment <= 5 && afterNextBoundary.visibleCards >= 2, route.path + ' next boundary must keep cards visible: ' + JSON.stringify(afterNextBoundary));

      const burstStart = await reviewCarouselState(page);
      const burstMoves = 137;
      await page.evaluate(count => {
        const button = document.getElementById('reviewsPrev');
        for (let i=0;i<count;i++) button.click();
      }, burstMoves);
      await page.waitForTimeout(520);
      const afterPrevBurst = await reviewCarouselState(page);
      const expectedAfterPrevBurst = ((burstStart.leftIndex - 1 - burstMoves + 5000) % 50) + 1;
      assert.equal(afterPrevBurst.leftIndex, expectedAfterPrevBurst, route.path + ' 137 rapid previous clicks must keep the loop stable: ' + JSON.stringify({burstStart,afterPrevBurst}));
      assert.ok(afterPrevBurst.alignment <= 5 && afterPrevBurst.visibleCards >= 2, route.path + ' previous burst must not make cards disappear: ' + JSON.stringify(afterPrevBurst));

      const nextBurstMoves = 189;
      await page.evaluate(count => {
        const button = document.getElementById('reviewsNext');
        for (let i=0;i<count;i++) button.click();
      }, nextBurstMoves);
      await page.waitForTimeout(520);
      const afterNextBurst = await reviewCarouselState(page);
      const expectedAfterNextBurst = ((expectedAfterPrevBurst - 1 + nextBurstMoves) % 50) + 1;
      assert.equal(afterNextBurst.leftIndex, expectedAfterNextBurst, route.path + ' 189 rapid next clicks must keep the loop stable: ' + JSON.stringify({afterNextBurst,expectedAfterNextBurst}));
      assert.ok(afterNextBurst.alignment <= 5 && afterNextBurst.visibleCards >= 2, route.path + ' next burst must not make cards disappear: ' + JSON.stringify(afterNextBurst));

      await page.evaluate(() => window.scrollTo(0,0));
      await page.waitForTimeout(80);
      if (route.lang === 'ar') {
        const headerAlignment = await page.evaluate(() => {
          const logoElement = document.querySelector('header.nav > .logo');
          const imageElement = logoElement.querySelector('.logo-image');
          const logo = logoElement.getBoundingClientRect();
          const image = imageElement.getBoundingClientRect();
          const language = document.querySelector('header.nav .language-picker').getBoundingClientRect();
          const glow = getComputedStyle(logoElement, '::before');
          const glowLeft = logo.left + (parseFloat(glow.left) || 0);
          const glowWidth = parseFloat(glow.width) || 0;
          return {
            width: innerWidth,
            logoCenter: (logo.left + logo.right) / 2,
            languageCenter: (language.left + language.right) / 2,
            logoRightGap: innerWidth - logo.right,
            languageLeftGap: language.left,
            logoWidth: logo.width,
            imageWidth: image.width,
            imageLeft: image.left,
            glowLeft,
            glowRight: glowLeft + glowWidth,
            glowWidth
          };
        });
        assert.ok(headerAlignment.logoCenter > headerAlignment.width / 2, 'Arabic homepage logo should stay on the right: ' + JSON.stringify(headerAlignment));
        assert.ok(headerAlignment.languageCenter < headerAlignment.width / 2, 'Arabic language control should stay on the left: ' + JSON.stringify(headerAlignment));
        assert.ok(Math.abs(headerAlignment.logoRightGap - headerAlignment.languageLeftGap) <= 8,
          'Arabic homepage logo and language menu must have equal outer gutters: ' + JSON.stringify(headerAlignment));
        assert.ok(Math.abs(headerAlignment.logoWidth - headerAlignment.imageWidth) <= 2,
          'Arabic logo link must shrink-wrap the actual logo image instead of leaving a wide empty area: ' + JSON.stringify(headerAlignment));
        assert.ok(headerAlignment.glowWidth > 0,
          'Arabic homepage rocket backlight must exist: ' + JSON.stringify(headerAlignment));
        assert.ok(headerAlignment.glowRight <= headerAlignment.imageLeft + headerAlignment.imageWidth * 0.42,
          'Arabic rocket backlight must stay behind the rocket mark, not float between the menu and wordmark: ' + JSON.stringify(headerAlignment));
      }

      await page.locator('#lang').click();
      assert.equal(await page.locator('#lang').getAttribute('aria-expanded'), 'true');
      await page.waitForFunction(() => { const menu = document.querySelector('#languageMenu'); const style = getComputedStyle(menu); return style.visibility === 'visible' && Number(style.opacity) > 0; });
      assert.ok(await visible(page, '#languageMenu'), 'language menu should open');
      assert.equal(await page.locator('#languageMenu [data-lang]').count(), 3, 'all languages must be selectable');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#lang').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'lang', 'Escape should restore focus to language control');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#reviewsViewport').hover();
      await page.waitForTimeout(100);
      const beforeNext = await reviewCarouselState(page);
      const expectedNext = (beforeNext.leftIndex % 50) + 1;
      await page.locator('#reviewsNext').click();
      await page.waitForTimeout(500);
      const afterNext = await reviewCarouselState(page);
      assert.ok(afterNext.alignment <= 5, route.path + ' next arrow must align a card to the left edge: ' + JSON.stringify(afterNext));
      assert.equal(afterNext.leftIndex, expectedNext, route.path + ' next arrow must advance exactly one review');
      assert.ok(afterNext.visibleCards >= 2 && afterNext.nextCardPeek > 0, route.path + ' the next card edge should remain visible: ' + JSON.stringify(afterNext));

      const expectedPrevious = ((afterNext.leftIndex - 2 + 50) % 50) + 1;
      await page.locator('#reviewsPrev').click();
      await page.waitForTimeout(500);
      const afterPrevious = await reviewCarouselState(page);
      assert.ok(afterPrevious.alignment <= 5, route.path + ' previous arrow must align a card to the left edge: ' + JSON.stringify(afterPrevious));
      assert.equal(afterPrevious.leftIndex, expectedPrevious, route.path + ' previous arrow must go back exactly one review');

      const beforeLeftDrag = await reviewCarouselState(page);
      const expectedAfterLeftDrag = (beforeLeftDrag.leftIndex % 50) + 1;
      const leftDragTrace = await dragReviews(page, 1, beforeLeftDrag.step);
      const afterLeftDrag = await reviewCarouselState(page);
      assert.ok(afterLeftDrag.alignment <= 5, route.path + ' left swipe must snap a review to the left edge: ' + JSON.stringify({ afterLeftDrag, leftDragTrace }));
      assert.equal(afterLeftDrag.leftIndex, expectedAfterLeftDrag, route.path + ' left swipe should advance to the next review: ' + JSON.stringify({ beforeLeftDrag, afterLeftDrag, leftDragTrace }));

      const beforeRightDrag = await reviewCarouselState(page);
      const expectedAfterRightDrag = ((beforeRightDrag.leftIndex - 2 + 50) % 50) + 1;
      await dragReviews(page, -1, beforeRightDrag.step);
      const afterRightDrag = await reviewCarouselState(page);
      assert.ok(afterRightDrag.alignment <= 5, route.path + ' right swipe must snap a review to the left edge: ' + JSON.stringify(afterRightDrag));
      assert.equal(afterRightDrag.leftIndex, expectedAfterRightDrag, route.path + ' right swipe should return to the previous review');

      if (!afterRightDrag.reducedMotion) {
        await page.waitForTimeout(2600);
        const afterAutoplay = await reviewCarouselState(page);
        assert.notEqual(afterAutoplay.leftIndex, afterRightDrag.leftIndex, route.path + ' carousel should advance to another review automatically after interaction');
      }

      for (const width of [1024, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await assertResponsiveText(page, width, route.path);

        if (route.lang === 'ar') {
          const headerAlignment = await page.evaluate(() => {
            const logo = document.querySelector('header.nav > .logo').getBoundingClientRect();
            const language = document.querySelector('header.nav .language-picker').getBoundingClientRect();
            return { width: innerWidth, logoCenter: (logo.left + logo.right) / 2, languageCenter: (language.left + language.right) / 2 };
          });
          assert.ok(headerAlignment.logoCenter > width / 2, width + 'px Arabic logo should stay on the right: ' + JSON.stringify(headerAlignment));
          assert.ok(headerAlignment.languageCenter < width / 2, width + 'px Arabic language control should stay on the left: ' + JSON.stringify(headerAlignment));
        }
      }

      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
        await assertResponsiveText(page, width, route.path);
        if (route.lang === 'ar') {
          const headerAlignment = await page.evaluate(() => {
            const logo = document.querySelector('header.nav > .logo').getBoundingClientRect();
            const language = document.querySelector('header.nav .language-picker').getBoundingClientRect();
            return { width: innerWidth, logoCenter: (logo.left + logo.right) / 2, languageCenter: (language.left + language.right) / 2 };
          });
          assert.ok(headerAlignment.logoCenter > width / 2, width + 'px Arabic logo should stay on the right: ' + JSON.stringify(headerAlignment));
          assert.ok(headerAlignment.languageCenter < width / 2, width + 'px Arabic language control should stay on the left: ' + JSON.stringify(headerAlignment));
        }
        assert.equal(await page.locator('#primaryNavigation').count(), 0, width + 'px mobile view must not include a navigation menu');
        assert.equal(await page.locator('#mobileNavToggle').count(), 0, width + 'px mobile view must not include hamburger markup');
        assert.equal(await page.locator('.hero-bottom').count(), 0, 'scroll hint and hero footer should be removed');
        assert.ok(await visible(page, '.hero-bottom-copy'), width + 'px lower hero copy should be visible');
        const heroCopyMetrics = await page.evaluate(() => {
          const hero = document.querySelector('.hero').getBoundingClientRect();
          const title = document.querySelector('.hero-inner h1').getBoundingClientRect();
          const copy = document.querySelector('.hero-bottom-copy').getBoundingClientRect();
          const paragraph = document.querySelector('.hero-bottom-copy .hero-sub').getBoundingClientRect();
          const actions = document.querySelector('.hero-bottom-copy .hero-actions').getBoundingClientRect();
          return { heroBottom: hero.bottom, titleBottom: title.bottom, copyTop: copy.top, copyBottom: copy.bottom, paragraphTop: paragraph.top, actionsTop: actions.top, scrollWidth: document.documentElement.scrollWidth };
        });
        assert.ok(heroCopyMetrics.copyTop > heroCopyMetrics.titleBottom + 50, width + 'px hero paragraph/actions should sit clearly below the heading: ' + JSON.stringify(heroCopyMetrics));
        assert.ok(heroCopyMetrics.heroBottom - heroCopyMetrics.copyBottom < 180, width + 'px hero copy should sit near the removed scroll hint area: ' + JSON.stringify(heroCopyMetrics));
        assert.ok(heroCopyMetrics.actionsTop >= heroCopyMetrics.paragraphTop, width + 'px CTA buttons must follow the intro paragraph');

        await page.locator('#lang').click();
        await page.waitForFunction(() => { const menu = document.querySelector('#languageMenu'); const style = getComputedStyle(menu); return style.visibility === 'visible' && Number(style.opacity) > 0; });
        const menuRect = await page.locator('#languageMenu').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, position: getComputedStyle(el).position };
        });
        const langButtonRect = await page.locator('#lang').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        });
        assert.ok(menuRect.left >= -1 && menuRect.right <= width + 1, width + 'px language menu should stay within viewport: ' + JSON.stringify(menuRect));
        assert.equal(menuRect.position, 'absolute', width + 'px homepage locale menu should stay anchored to its language control: ' + JSON.stringify(menuRect));
        assert.ok(menuRect.top >= langButtonRect.bottom - 2,
          width + 'px locale menu should open underneath its trigger rather than at a fixed screen coordinate: ' + JSON.stringify({ menuRect, langButtonRect }));
        await page.keyboard.press('Escape');
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 1, width + 'px page should not overflow horizontally');
      }


      await page.evaluate(() => window.scrollTo(0, 360));
      await page.waitForFunction(() => document.querySelector('header.nav').classList.contains('is-scrolled'));
      // The nav enters with a 400ms keyframe animation; wait for that motion to finish
      // before asserting its final fixed position, especially in WebKit.
      await page.waitForTimeout(450);
      const stickyState = await page.locator('header.nav').evaluate(el => ({ position: getComputedStyle(el).position, top: el.getBoundingClientRect().top, zIndex: getComputedStyle(el).zIndex }));
      assert.equal(stickyState.position, 'fixed', 'mobile top bar should remain fixed during scroll: ' + JSON.stringify(stickyState));
      assert.ok(Math.abs(stickyState.top) <= 1, 'fixed top bar should stay aligned to the viewport top: ' + JSON.stringify(stickyState));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => !document.querySelector('header.nav').classList.contains('is-scrolled'));

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
      assert.equal(await page.locator('link[href="/asset/css/site-global-ui.css"]').count(), 1, 'blog must load shared top-bar styles');
      assert.equal(await page.locator('#articleSearch').count(), 0, route.path + ' blog should not show a search box');
      assert.equal(await page.locator('#categoryFilter').count(), 0, route.path + ' blog should not show a topic category filter');
      assert.equal(await page.locator('#archiveStatus').count(), 0, route.path + ' blog should not show archive filter status');
      assert.ok(await page.locator('.latest .article-card').count() > 0, route.path + ' blog should show its guide list');
      if (route.lang === 'ar') {
        const headerAlignment = await page.evaluate(() => {
          const logo = document.querySelector('header.nav > .logo').getBoundingClientRect();
          const language = document.querySelector('header.nav .language-picker').getBoundingClientRect();
          return { width: innerWidth, logoCenter: (logo.left + logo.right) / 2, languageCenter: (language.left + language.right) / 2 };
        });
        assert.ok(headerAlignment.logoCenter > headerAlignment.width / 2, 'Arabic blog logo should stay on the right: ' + JSON.stringify(headerAlignment));
        assert.ok(headerAlignment.languageCenter < headerAlignment.width / 2, 'Arabic blog language control should stay on the left: ' + JSON.stringify(headerAlignment));
      }

      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        const metrics = await page.evaluate(() => {
          const hero = document.querySelector('main > .hero');
          const header = document.querySelector('header.nav');
          const tag = document.querySelector('main > .hero .tag');
          const nav = document.querySelector('header.nav');
          const headerItems = [...document.querySelectorAll('header.nav > .logo, header.nav > .nav-right, header.nav .language-picker, header.nav .lang')];
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


    const reviewListRoutes = [
      { path: '/reviews/en/index.html', lang: 'en', dir: 'ltr' },
      { path: '/reviews/tr/index.html', lang: 'tr', dir: 'ltr' },
      { path: '/reviews/ar/index.html', lang: 'ar', dir: 'rtl' },
    ];
    for (const route of reviewListRoutes) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(route.path + ' pageerror: ' + error.message));
      const response = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route.path + ' should load');
      assert.equal(await page.locator('html').getAttribute('lang'), route.lang);
      assert.equal(await page.locator('html').getAttribute('dir'), route.dir);
      assert.ok((await page.locator('h1').innerText()).trim().length > 0, route.path + ' should have a localized heading');
      assert.equal(await page.locator('.review-list-card').count(), 50, route.path + ' should list all 50 reviews');
      await page.locator('.brand img').evaluate(img => img.decode());
      assert.ok(await page.locator('.brand img').evaluate(img => img.naturalWidth > 0), route.path + ' brand logo must decode');
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(50);
        const metrics = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          logo: (() => { const r = document.querySelector('.site-header .brand').getBoundingClientRect(); return { left:r.left, right:r.right, center:(r.left+r.right)/2 }; })(),
          locale: (() => { const r = document.querySelector('.site-header .locale-nav').getBoundingClientRect(); return { left:r.left, right:r.right, center:(r.left+r.right)/2 }; })(),
          actions: (() => { const r = document.querySelector('.site-header .header-actions').getBoundingClientRect(); return { left:r.left, right:r.right, center:(r.left+r.right)/2 }; })(),
          backHomeDisplay: getComputedStyle(document.querySelector('.site-header .back-home')).display,
        }));
        assert.ok(metrics.scrollWidth <= width + 1, route.path + ' must not horizontally overflow at ' + width + 'px: ' + JSON.stringify(metrics));
        if (route.lang === 'ar') {
          assert.ok(metrics.logo.center > width / 2, width + 'px Arabic review-list logo should stay on the right: ' + JSON.stringify(metrics));
          assert.ok(metrics.locale.center < width / 2, width + 'px Arabic language choices should stay on the left: ' + JSON.stringify(metrics));
          assert.ok(Math.abs((width - metrics.logo.right) - metrics.locale.left) <= 10,
            width + 'px Arabic logo and locale menu should have symmetric outer margins: ' + JSON.stringify(metrics));
          assert.equal(metrics.backHomeDisplay, 'none',
            width + 'px Arabic review header should hide the return link rather than push languages onto a second centered row');
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
    assert.equal(await noJsPage.locator('#primaryNavigation').count(), 0, 'top navigation menu must remain absent without JS');
    assert.ok(await visible(noJsPage, '.hero-bottom-copy'), 'lower hero copy should remain visible without JS');
    assert.equal(await noJsPage.locator('.hero-bottom').count(), 0, 'old scroll prompt should remain absent without JS');
    await noJsContext.close();

    const reduceContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    const reducePage = await reduceContext.newPage();
    await reducePage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await reducePage.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
    assert.notEqual(await reducePage.locator('.hero-video').evaluate(v => getComputedStyle(v).display), 'none',
      'hero video frame should remain visible for reduced-motion users instead of leaving a blank hero');
    assert.equal(await reducePage.locator('.hero-video').evaluate(v => v.paused), true, 'hero video should remain paused for reduced-motion users');
    await reduceContext.close();

    if (failures.length) throw new Error(failures.join('\n'));
    console.log('Browser QA passed (' + (process.env.QA_BROWSER === 'webkit' ? 'WebKit' : 'Chromium') + '): locale routes, review boundaries/rapid navigation and mobile viewport geometry, language menu, responsive navigation, assets, no-JS visibility, Arabic RTL, and reduced motion.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
