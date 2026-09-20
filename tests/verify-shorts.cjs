// Isolated browser regression: all Telegram/API/media traffic is mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const screenshotDir = process.env.SHORTS_SCREENSHOTS || path.join(root, '../shorts-screenshots');
const fixture = fs.readFileSync(process.env.SHORTS_VIDEO_FIXTURE);
const hlsDir = process.env.SHORTS_HLS_FIXTURE;
const shorts = Array.from({ length: 240 }, (_, i) => ({
  id: i + 1, content_type: 'short', title: `Clip ${i + 1}`, artist_name: `Artist ${i % 4}`,
  views: i % 17, created_at: new Date(2025, 0, i + 1).toISOString(),
}));
const videos = Array.from({ length: 30 }, (_, i) => ({ ...shorts[i], id: 1000 + i, content_type: 'video' }));

async function run() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', filename.endsWith('.html') ? 'text/html' : 'text/javascript');
    res.end(fs.readFileSync(filename));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = process.env.SHORTS_TEST_ORIGIN || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const pro of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await context.addInitScript(() => {
        window.__MINIAPP_API_BASE__ = 'https://fixture.invalid';
        const noop = () => {};
        window.Telegram = { WebApp: { initData: 'fixture-only', platform: 'ios',
          initDataUnsafe: { user: { id: 1, first_name: 'Test' } },
          ready: noop, expand: noop, requestFullscreen: noop, onEvent: noop, offEvent: noop,
          disableVerticalSwipes: noop, enableVerticalSwipes: noop, disableClosingConfirmation: noop,
          BackButton: { onClick: noop, offClick: noop, show: noop, hide: noop },
          HapticFeedback: { impactOccurred: noop, selectionChanged: noop },
        } };
      });
      const page = await context.newPage();
      const errors = [], catalog = [], playRequests = [];
      let inflight = 0, peak = 0;
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://telegram.org/js/**', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
      await page.route('https://fixture.invalid/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/media/')) {
          const manifest = url.pathname.endsWith('.m3u8');
          const body = hlsDir ? fs.readFileSync(path.join(hlsDir, manifest ? 'stream.m3u8' : path.basename(url.pathname))) : fixture;
          await route.fulfill({ status: 200, contentType: hlsDir ? (manifest ? 'application/vnd.apple.mpegurl' : 'video/mp2t') : 'video/mp4', body }); return;
        }
        let data = {};
        if (url.pathname === '/miniapp/shorts') {
          const params = Object.fromEntries(url.searchParams);
          catalog.push(params);
          let list = shorts.filter(s => !params.artist || s.artist_name === params.artist);
          if (params.order === 'random') {
            const hash = id => createHash('md5').update(`${id}:${params.seed}`).digest('hex');
            list.sort((a, b) => hash(a.id).localeCompare(hash(b.id)));
          } else if (params.order === 'best') list.sort((a, b) => b.views - a.views || b.id - a.id);
          else list.sort((a, b) => b.id - a.id);
          const offset = +params.offset || 0, end = offset + (+params.limit || 24);
          data = { shorts: list.slice(offset, end), has_more: end < list.length, next_offset: Math.min(end, list.length), max_id: 240 };
        } else if (url.pathname === '/miniapp/content/play') {
          const id = route.request().postDataJSON().content_id;
          playRequests.push(Number(id));
          peak = Math.max(peak, ++inflight);
          await new Promise(resolve => setTimeout(resolve, 50));
          inflight--;
          data = { url: `https://fixture.invalid/media/${id}.${hlsDir ? 'm3u8' : 'mp4'}` };
        } else if (url.pathname === '/miniapp/profile') {
          data = { days_left: pro ? 30 : 0, tier: pro ? 'pro' : 'free', full_name: 'Test' };
        } else if (url.pathname === '/miniapp/artists') {
          data = { artists: Array.from({ length: 4 }, (_, i) => ({ name: `Artist ${i}`, shorts: 60, videos: 30 })) };
        } else if (url.pathname === '/miniapp/videos') data = { videos, has_more: false };
        else if (url.pathname === '/miniapp/tags') data = { tags: [{ name: 'Whispering', count: 30 }] };
        else if (url.pathname === '/miniapp/favorites') data = { items: [{ ...shorts[0], content_id: 1 }] };
        else if (url.pathname === '/miniapp/follows') data = { artists: [] };
        else if (url.pathname === '/miniapp/reactions') data = { reactions: [], user_reactions: [] };
        await route.fulfill({ status: 200, json: data, headers: { 'access-control-allow-origin': '*' } });
      });
      await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.locator('#static-splash').waitFor({ state: 'hidden', timeout: 60000 });
      await page.waitForFunction(() => window.SHORTS_PAGE_SIZE === 24);
      await page.waitForTimeout(1200);
      assert.equal(catalog.length, 1, 'one shared background page');
      assert.equal(catalog[0].limit, '24');
      assert.equal(catalog[0].order, 'random');
      if (pro) {
        await page.waitForFunction(() => document.querySelectorAll('[data-short-preview][data-preview-state="ready"]').length === 4);
        const expected = await page.locator('[data-short-id]').evaluateAll(nodes => nodes.slice(0, 4).map(node => Number(node.dataset.shortId)));
        assert.deepEqual(playRequests, expected, 'only actual first four shuffled cards are warmed');
        assert.ok(peak <= 2, `warm-up concurrency: ${peak}`);
        assert.ok(await page.locator('[data-short-preview] video').evaluateAll(nodes => nodes.every(v => v.paused)), 'Home previews remain paused');
      } else assert.equal(playRequests.length, 0, 'free users do not preload premium streams');
      await page.getByRole('button', { name: 'Shorts', exact: true }).click();
      await page.locator('[data-short-id]:visible').first().waitFor();
      const ids = await page.locator('[data-short-id]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.shortId));
      assert.equal(ids.length, 20);
      assert.equal(catalog.length, 1, 'tab uses the already warmed page');
      assert.ok(ids.some(id => Number(id) < 120));
      await page.screenshot({ path: path.join(screenshotDir, pro ? 'shorts-pro-mobile.png' : 'shorts-free-mobile.png') });
      await page.getByRole('button', { name: 'Home', exact: true }).filter({ visible: true }).click();
      await page.getByRole('button', { name: 'Shorts', exact: true }).filter({ visible: true }).click();
      assert.deepEqual(await page.locator('[data-short-id]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.shortId)), ids);
      await page.getByRole('button', { name: /Load more/ }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-short-id]').length === 40);
      const after = await page.locator('[data-short-id]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.shortId));
      assert.deepEqual(after.slice(0, 20), ids);
      assert.equal(new Set(after).size, 40);
      assert.equal(catalog[1].offset, '24');
      assert.equal(catalog[1].seed, catalog[0].seed);
      assert.equal(catalog[1].max_id, '240');
      await page.getByText('Newest', { exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-short-id]')?.dataset.shortId === '240');
      await page.getByText('Newest', { exact: true }).click();
      assert.deepEqual(await page.locator('[data-short-id]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.shortId)), ids);
      if (pro) {
        await page.locator('[data-short-id]:visible').first().click();
        await page.locator('[data-shorts-player]').waitFor();
        assert.equal(await page.locator('[data-shorts-player]').getAttribute('data-shorts-player'), ids[0]);
        await page.getByRole('button', { name: 'Close shorts player' }).click();
        await page.getByRole('button', { name: 'Play all shorts' }).click();
        await page.locator('[data-shorts-player]').waitFor();
        await page.getByRole('button', { name: 'Close shorts player' }).click();
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.screenshot({ path: path.join(screenshotDir, 'shorts-desktop.png') });
      } else assert.equal(playRequests.length, 0);
      assert.deepEqual(errors, []);
      console.log(`PASS ${pro ? 'paid' : 'free'}: warm-up, session order, shared requests, load more, filters and playback gating`);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
