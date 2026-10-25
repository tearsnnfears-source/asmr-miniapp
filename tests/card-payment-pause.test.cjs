const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
  const calls = [];
  const window = { Telegram: { WebApp: { initData: 'FIXTURE_ONLY',
    showAlert: message => calls.push(['notice', message]),
    openLink: () => calls.push(['external']), openTelegramLink: () => calls.push(['external']) } },
    alert: message => calls.push(['fallback', message]), open: () => calls.push(['external']) };
  const document = { documentElement: { style: { setProperty() {} } } };
  const context = vm.createContext({ window, document, React: {}, URL, URLSearchParams,
    Map, Set, Date, Math, console, location: { hostname: 'localhost', search: '' },
    fetch: async () => { calls.push(['fetch']); throw Error('unexpected network'); },
    setTimeout() {}, requestAnimationFrame() {}, setInterval: () => calls.push(['poll']), clearInterval() {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api.jsx'), 'utf8'), context);
  return { context, calls };
}

test('legacy Tribute action shows a notice without links, invoices or polling', () => {
  const { context, calls } = runtime();
  const result = context.actionOpenTribute('https://example.test/old-provider');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'card-unavailable');
  assert.deepEqual(calls.map(call => call[0]), ['notice']);
});

test('Card bundle preparation is paused before any request is made', async () => {
  const { context, calls } = runtime();
  const result = await context.actionPrepareBundleCheckout('king', 'all');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'card-unavailable');
  assert.deepEqual(calls, []);
});

test('notice supports all saved languages and handles unavailable Telegram popup API', () => {
  const { context, calls } = runtime();
  for (const language of ['en', 'ru', 'es']) {
    context.actionShowCardPaymentNotice(language);
    assert.ok(calls.at(-1)[1].includes(context.window.CARD_PAYMENT_NOTICE_COPY[language].body));
  }
  context.window.Telegram.WebApp.showAlert = () => { throw Error('unsupported'); };
  assert.doesNotThrow(() => context.actionShowCardPaymentNotice('unknown'));
  assert.equal(calls.at(-1)[0], 'fallback');
  assert.ok(calls.at(-1)[1].includes(context.window.CARD_PAYMENT_NOTICE_COPY.en.body));
});

