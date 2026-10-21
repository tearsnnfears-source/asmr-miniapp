const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const file = fs.existsSync(path.join(root, 'checkout-notice.jsx')) ? 'checkout-notice.jsx' : 'pages.jsx';
const source = fs.readFileSync(path.join(root, file), 'utf8');
const helpers = source.slice(source.indexOf('function isCheckoutNoticeHidden('), source.indexOf('const CHECKOUT_NOTICE_COPY'));
function preferenceRuntime(storage) {
  const ctx = vm.createContext({ window: {}, localStorage: storage });
  vm.runInContext(helpers, ctx);
  return ctx;
}
test('dont-show preference persists across reloads and stays per app/account', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key) };
  const first = preferenceRuntime(storage);
  assert.equal(first.isCheckoutNoticeHidden('archive:123'), false);
  first.setCheckoutNoticeHidden('archive:123', true);
  const next = preferenceRuntime(storage);
  assert.equal(next.isCheckoutNoticeHidden('archive:123'), true);
  assert.equal(next.isCheckoutNoticeHidden('archive:456'), false);
  assert.equal(next.isCheckoutNoticeHidden('kingdom:123'), false);
  next.setCheckoutNoticeHidden('archive:123', false);
  assert.equal(first.isCheckoutNoticeHidden('archive:123'), false);
});
test('blocked local storage keeps the reminder enabled without crashing', () => {
  const ctx = preferenceRuntime({ getItem() { throw Error('blocked'); },
    setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } });
  assert.equal(ctx.isCheckoutNoticeHidden('account'), false);
  assert.doesNotThrow(() => ctx.setCheckoutNoticeHidden('account', true));
  assert.doesNotThrow(() => ctx.setCheckoutNoticeHidden('account', false));
});
test('all languages contain a labelled native checkbox below the instructions', () => {
  assert.match(source, /Don't show me again/);
  assert.match(source, /Больше не показывать/);
  assert.match(source, /No volver a mostrar/);
  assert.ok(source.indexOf('type="checkbox"') > source.indexOf('text.linksText'));
  assert.match(source, /appearance: 'auto'/);
});
test('Subscribe skips the notice and keeps the existing payment handler', async () => {
  const parentFile = fs.existsSync(path.join(root, 'archive.jsx')) ? 'archive.jsx'
    : fs.existsSync(path.join(root, 'kingdom.jsx')) ? 'kingdom.jsx' : 'pages.jsx';
  const parent = fs.readFileSync(path.join(root, parentFile), 'utf8');
  const pattern = /onClick=\{\(\) => \{\s*if \((?:window\.)?isCheckoutNoticeHidden\(noticePreferenceKey\)\) (\w+)\(\);\s*else setCheckoutNotice\(true\);\s*\}\}/;
  const match = parent.match(pattern);
  assert.ok(match, 'Subscribe must check the saved preference');
  for (const skip of [false, true]) {
    const calls = [];
    const context = vm.createContext({ window: { isCheckoutNoticeHidden: () => skip },
      isCheckoutNoticeHidden: () => skip, noticePreferenceKey: 'test',
      setCheckoutNotice: value => calls.push(['notice', value]),
      [match[1]]: () => calls.push(['payment']) });
    vm.runInContext('(' + match[0].slice('onClick={'.length, -1) + ')()', context);
    assert.deepEqual(calls, skip ? [['payment']] : [['notice', true]]);
  }
});
