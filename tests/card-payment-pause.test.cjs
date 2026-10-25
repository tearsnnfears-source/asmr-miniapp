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

test('retired or foreign checkout links cannot open a payment', () => {
  const { context, calls } = runtime();
  const result = context.actionOpenTribute('https://example.test/old-provider');
  assert.equal(result.ok, false);
  assert.deepEqual(calls, []);
});

test('bundle preparation uses an authenticated backend request and fails closed on network errors', async () => {
  const { context, calls } = runtime();
  const result = await context.actionPrepareBundleCheckout('king', 'all');
  assert.equal(result.ok, false);
  assert.ok(calls.every(call=>call[0]==='fetch'));
});

test('only a new Tribute product can open in Telegram without creating a Stars invoice', () => {
  const {context,calls}=runtime();
  assert.equal(context.actionOpenTribute('https://t.me/tribute/app?startapp=s1ajK').ok,true);
  assert.deepEqual(calls.map(c=>c[0]),['external']);
  assert.equal(context.actionOpenTribute('https://t.me/tribute/app?startapp=sQSn').ok,false);
  assert.equal(calls.length,1);
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

test('top-up explanation uses the approved sentence and no store names', () => {
  const { context } = runtime();
  const copy = context.window.CARD_PAYMENT_NOTICE_COPY;
  assert.equal(copy.ru.topUp, 'Stars можно удобно купить банковской картой прямо в Telegram.');
  for (const language of ['en', 'ru', 'es']) {
    assert.doesNotMatch(copy[language].topUp, /App Store|Google Play|Apple Pay|Google Pay|@PremiumBot/);
  }
});

