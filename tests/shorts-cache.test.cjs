const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime(fetch) {
  const window = { document: {}, Telegram: { WebApp: { initData: 'test-only' } } };
  const context = vm.createContext({ window, fetch, URLSearchParams, URL, Map, Set, console,
    location: { hostname: 'localhost', search: '' }, React: {},
    document: { documentElement: { style: { setProperty() {} } } },
    setTimeout() {}, requestAnimationFrame() {}, Date, Math,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api.jsx'), 'utf8'), context);
  const player = fs.readFileSync(path.join(__dirname, '../player.jsx'), 'utf8');
  vm.runInContext(player.slice(0, player.indexOf('function VideoPlayer(')), context);
  return context;
}

test('warm-up and tab share one request; append keeps order, seed and snapshot', async () => {
  const requests = [];
  const ctx = runtime(async url => {
    const query = Object.fromEntries(new URL(url).searchParams);
    requests.push(query);
    const ids = query.offset === '0' ? [9, 2, 47, 10] : [6, 3, 19];
    return { ok: true, json: async () => ({ shorts: ids.map(id => ({ id })),
      next_offset: query.offset === '0' ? 4 : 7, max_id: 100, has_more: query.offset === '0' }) };
  });
  const entry = ctx._shortsEntry(24, 'random', '');
  let notifications = 0;
  entry.subscribers.add(() => notifications++);
  await Promise.all([ctx._loadShortsPage(entry), ctx._loadShortsPage(ctx._shortsEntry(24, 'random', ''))]);
  assert.equal(requests.length, 1);
  await ctx._loadShortsPage(entry);
  assert.deepEqual(Array.from(entry.state.items, item => item.id), [9, 2, 47, 10, 6, 3, 19]);
  assert.equal(requests[1].seed, requests[0].seed);
  assert.equal(requests[0].order, 'random');
  assert.equal(requests[1].max_id, '100');
  assert.equal(requests[1].offset, '4');
  await ctx._loadShortsPage(entry);
  assert.equal(requests.length, 2);
  assert.ok(notifications >= 6);
  assert.notEqual(entry, ctx._shortsEntry(24, 'newest', ''));
});

test('failed page can retry; duplicates do not corrupt the server offset', async () => {
  let calls = 0;
  const ctx = runtime(async () => {
    if (++calls === 1) throw new Error('offline');
    return { ok: true, json: async () => ({ shorts: [{ id: 8 }, { id: 8 }, { id: 2 }], next_offset: 3, has_more: true }) };
  });
  const entry = ctx._shortsEntry(24, 'random', '');
  await ctx._loadShortsPage(entry);
  assert.equal(entry.state.loading, false);
  assert.equal(entry.state.error.message, 'offline');
  await ctx._loadShortsPage(entry);
  assert.equal(entry.state.error, null);
  assert.equal(entry.offset, 3);
  assert.deepEqual(Array.from(entry.state.items, item => item.id), [8, 2]);
});

test('preview warm-up limits concurrency and a network failure remains retryable', async () => {
  let calls = 0, active = 0, peak = 0;
  const ctx = runtime(async url => {
    if (!url.includes('/content/play')) return { ok: true };
    calls++;
    if (calls === 1) throw new Error('offline');
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return { ok: true, json: async () => ({ url: 'https://media.test/clip.mp4' }) };
  });
  ctx.window.getInitData = () => 'test-only';
  await assert.rejects(ctx.fetchPlayableContent(9), /offline/);
  await ctx.prefetchPlayable([9, 2, 47, 10], 2);
  assert.equal(peak, 2);
  assert.equal(calls, 5);
  await ctx.fetchPlayableContent(9);
  assert.equal(calls, 5);
});
