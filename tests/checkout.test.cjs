const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function apiRuntime(fetch) {
  const events = new Map(), tgEvents = new Map();
  const document = { visibilityState: 'visible', documentElement: { style: { setProperty() {} } },
    addEventListener: (name, cb) => events.set(name, cb), removeEventListener: name => events.delete(name) };
  const window = { document, Telegram: { WebApp: { initData: 'fixture',
    onEvent: (name, cb) => tgEvents.set(name, cb), offEvent: name => tgEvents.delete(name) } } };
  const context = vm.createContext({ window, document, fetch, React: {}, URL, URLSearchParams,
    Map, Set, Date, Math, console, location: { hostname: 'localhost', search: '' },
    setTimeout() {}, requestAnimationFrame() {}, setInterval() {}, clearInterval() {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api.jsx'), 'utf8'), context);
  return { context, events, tgEvents, document };
}

test('pending invite requests are deduplicated across checkout and return checks', async () => {
  let resolveFetch, calls = 0;
  const { context } = apiRuntime(() => { calls++; return new Promise(resolve => { resolveFetch = resolve; }); });
  const first = context.actionCheckInvite(), second = context.actionCheckInvite();
  assert.equal(first, second);
  resolveFetch({ ok: true, json: async () => ({ invite_link: 'https://example.test/invite' }) });
  assert.equal((await first).invite_link, 'https://example.test/invite');
  assert.equal(calls, 1);
});

test('returning from checkout rechecks pending links and invalidates all access caches', async () => {
  let calls = 0, shown = 0;
  const { context, events, tgEvents, document } = apiRuntime(async () => ({ ok: true,
    json: async () => { calls++; return { access_links: [{ project: 'asmrleaks', url: 'https://example.test/invite' }] }; } }));
  const stop = context.watchInviteReturns(() => shown++);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(shown, 1);
  for (const key of ['user', 'my_invite', 'access_links']) context.window._apiCache.set(key, { data: 'old' });
  document.visibilityState = 'hidden';
  await events.get('visibilitychange')();
  assert.equal(calls, 1);
  document.visibilityState = 'visible';
  await events.get('visibilitychange')();
  assert.equal(calls, 2);
  for (const key of ['user', 'my_invite', 'access_links']) assert.equal(context.window._apiCache.has(key), false);
  await tgEvents.get('activated')();
  assert.equal(calls, 3);
  stop();
  assert.equal(events.size, 0);
  assert.equal(tgEvents.has('activated'), false);
});

function checkoutRuntime(method, tier, overrides = {}) {
  const calls = [];
  const context = vm.createContext({ busy: false, payingRef: { current: false }, isTierAvailable: true,
    isInsideTg: true, method, tier, bundleTarget: tier === 'king' ? 'all' : 'asianleaks',
    appliedPromo: null, promo: '', planDays: 31, tributeUrl: 'https://example.test/selected-tier',
    applyPromo: async () => null, alert: message => calls.push(['alert', message]),
    setBusy: value => calls.push(['busy', value]), setCheckoutNotice: value => calls.push(['modal', value]),
    nav: { reset: value => calls.push(['reset', value]), openInvite: value => calls.push(['invite', value]) },
    window: {
      actionPrepareBundleCheckout: async (...args) => { calls.push(['prepare', ...args]); return { ok: true }; },
      actionOpenTribute: url => { calls.push(['tribute', url]); return { ok: true }; },
      actionCreateStarsInvoice: async (...args) => { calls.push(['stars', ...args]); return { ok: true, invoice_link: 'fixture' }; },
      actionOpenCryptoSupport: async value => { calls.push(['crypto', value]); return { ok: true }; },
      Telegram: { WebApp: { openInvoice: url => calls.push(['invoice', url]) } },
    }, ...overrides,
  });
  const source = fs.readFileSync(path.join(__dirname, '../pages.jsx'), 'utf8');
  const start = source.indexOf('const onPay = async () =>');
  const end = source.indexOf('// Free trial onClick', start);
  vm.runInContext(source.slice(start, end).replace('const onPay =', 'globalThis.onPay ='), context);
  return { context, calls };
}

for (const method of [0, 1, 2, 3]) {
  test(`PAY preserves selected method ${method} and bundle target`, async () => {
    const { context, calls } = checkoutRuntime(method, 'elite');
    await context.onPay();
    const route = method === 1 ? 'stars' : method === 3 ? 'crypto' : 'tribute';
    assert.equal(calls.filter(call => call[0] === route).length, 1);
    if (method === 0 || method === 2) assert.deepEqual(Array.from(calls.find(call => call[0] === 'prepare')), ['prepare', 'elite', 'asianleaks']);
    if (method === 1) assert.deepEqual(Array.from(calls.find(call => call[0] === 'stars')), ['stars', 31, 'elite', '', 'asianleaks']);
    if (method === 3) assert.equal(calls.find(call => call[0] === 'crypto')[1].bundleTarget, 'asianleaks');
    assert.equal(calls.some(call => call[0] === 'modal' && call[1] === false), true);
  });
}

test('checkout preparation errors keep the notice open and never launch payment', async () => {
  const { context, calls } = checkoutRuntime(0, 'king');
  context.window.actionPrepareBundleCheckout = async () => ({ ok: false, message: 'retry' });
  await context.onPay();
  assert.equal(calls.some(call => call[0] === 'tribute'), false);
  assert.equal(calls.some(call => call[0] === 'modal'), false);
  assert.equal(context.payingRef.current, false);
});

test('rapid repeated PAY clicks open checkout only once', async () => {
  const { context, calls } = checkoutRuntime(1, 'pro');
  await Promise.all([context.onPay(), context.onPay()]);
  assert.equal(calls.filter(call => call[0] === 'stars').length, 1);
});
