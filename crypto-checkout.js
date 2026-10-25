(function () {
  'use strict';
  let active = null;
  const assetBase = new URL('.', document.currentScript?.src || window.location.href);
  const assets = {
    USDT: { name: 'Tether', file: 'coin-usdt.png' }, BTC: { name: 'Bitcoin', file: 'coin-btc.png' },
    TON: { name: 'Toncoin', file: 'coin-ton.png' }, ETH: { name: 'Ethereum', file: 'coin-eth.png' },
    BNB: { name: 'BNB', file: 'coin-bnb.png' }, LTC: { name: 'Litecoin', file: 'coin-ltc.png' },
    USDC: { name: 'USD Coin', file: 'coin-usdc.png' },
  };
  const networks = { BEP20: 'BNB Smart Chain', TRC20: 'Tron', ERC20: 'Ethereum', TON: 'TON',
    Bitcoin: 'Bitcoin', Ethereum: 'Ethereum', Litecoin: 'Litecoin' };
  const validUrl = value => {
    try {
      const url = new URL(value);
      return url.origin === 'https://plisio.net' && !url.username && !url.password
        && !url.search && !url.hash && /^\/invoice\/[A-Za-z0-9_-]{8,100}\/?$/.test(url.pathname);
    } catch (_) { return false; }
  };
  async function open(options) {
    if (active) return;
    const reservation = {};
    active = reservation;
    async function post(path, body) {
      let timer;
      try {
        return await Promise.race([
          options.post(path, body),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Request timed out. Check payment status or contact support.')), 25000); }),
        ]);
      } finally { clearTimeout(timer); }
    }
    let config;
    try {
      config = await post('/miniapp/crypto/config', { tier: options.tier });
      if (config.provider === 'manual') { active = null; return options.manual(); }
      if (config.provider !== 'plisio' || !config.ready) throw Error('Crypto payments are temporarily unavailable.');
    } catch (error) { config = { methods: [], error: error.message || 'Could not load payment options.' }; }
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const overlay = document.createElement('div');
    overlay.className = 'crypto-checkout-overlay';
    overlay.innerHTML = '<style>' +
      '.crypto-checkout-overlay{--crypto-accent:var(--cyan,#ff7ec8);position:fixed;inset:0;z-index:20000;background:#000b;display:grid;place-items:center;padding:12px;box-sizing:border-box;color:#f5f5f5;font-family:inherit}' +
      '.crypto-checkout-dialog{box-sizing:border-box;width:100%;max-width:440px;max-height:calc(100dvh - 24px);display:flex;flex-direction:column;background:#151619;border:1px solid #3b3d43;border-radius:8px;overflow:hidden;box-shadow:0 18px 60px #0008;letter-spacing:0}' +
      '.crypto-checkout-dialog *{box-sizing:border-box;letter-spacing:0}' +
      '.crypto-checkout-heading{display:flex;flex-shrink:0;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid #303238}' +
      '.crypto-checkout-heading h2{font-size:20px;margin:0;line-height:1.3}.crypto-plan{font-size:11px;color:#989ca8;margin-top:3px}' +
      '.crypto-checkout-dialog button{font:inherit;border-radius:6px;min-height:44px;max-width:100%}' +
      '.crypto-checkout-close{width:36px;min-height:36px!important;flex-shrink:0;background:none;color:#ddd;border:1px solid #404249;font-size:24px!important}' +
      '.crypto-checkout-main{padding:16px 18px;overflow:auto;overscroll-behavior:contain;min-height:0}.crypto-checkout-footer{padding:12px 18px 8px;border-top:1px solid #303238;flex-shrink:0}' +
      '.crypto-checkout-dialog fieldset{border:0;margin:0 0 18px;padding:0;min-width:0}.crypto-checkout-dialog legend{font-size:12px;font-weight:700;color:#b7bac4;padding:0 0 10px}' +
      '.crypto-assets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.crypto-asset{position:relative;min-width:0;min-height:78px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid #373a42;border-radius:6px;background:#1c1e23;cursor:pointer;padding:7px 3px;color:#f4f4f5}' +
      '.crypto-asset input,.crypto-network input{position:absolute;inset:0;z-index:1;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}.crypto-asset img{width:28px;height:28px;object-fit:contain;display:block}.crypto-asset strong{font-size:12px;line-height:15px}.crypto-asset small{font-size:9px;line-height:12px;color:#989ca8;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
      '.crypto-asset.is-selected,.crypto-network.is-selected{border-color:var(--crypto-accent);background:#25272d;box-shadow:inset 0 0 0 1px var(--crypto-accent)}.crypto-asset.is-selected strong{color:var(--crypto-accent)}' +
      '.crypto-networks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.crypto-networks.is-single{grid-template-columns:1fr}.crypto-network{position:relative;display:flex;align-items:center;gap:9px;min-width:0;min-height:49px;border:1px solid #373a42;border-radius:6px;padding:8px 10px;background:#1c1e23;cursor:pointer}' +
      '.crypto-network-dot{width:12px;height:12px;flex-shrink:0;border:1px solid #666b76;border-radius:50%}.crypto-network.is-selected .crypto-network-dot{border:3px solid var(--crypto-accent);background:#151619}.crypto-network strong{display:block;font-size:11px;line-height:15px;font-weight:600;overflow-wrap:anywhere}.crypto-network small{display:block;font-size:10px;line-height:14px;color:#989ca8}' +
      '.crypto-selection{display:flex;align-items:center;gap:9px;min-height:30px;margin-bottom:10px;font-size:12px;color:#e5e6eb}.crypto-selection img{width:23px;height:23px;flex-shrink:0}.crypto-selection-main{min-width:0;flex:1}.crypto-selection-main strong{font-size:12px}.crypto-selection-main small{display:block;color:#a4a8b3;font-size:10px}.crypto-selection-amount{font-size:12px;font-weight:700;white-space:nowrap}' +
      '.crypto-checkout-dialog .crypto-action{width:100%;margin-top:7px;padding:11px;cursor:pointer;font-size:13px;font-weight:700;border:1px solid transparent;background:var(--crypto-accent);color:#101114}' +
      '.crypto-checkout-dialog .crypto-secondary{background:transparent;color:#dddfe7;border-color:#404249}.crypto-checkout-dialog .crypto-manual{background:none;border:0;font-size:11px;font-weight:500;color:#a6aab5;min-height:32px;padding:5px;text-decoration:underline;margin-top:4px}' +
      '.crypto-checkout-dialog button:disabled,.crypto-asset.is-disabled,.crypto-network.is-disabled{opacity:.5;cursor:wait}.crypto-checkout-dialog [hidden]{display:none!important}' +
      '.crypto-checkout-status{font-size:12px;line-height:1.5;margin:0;overflow-wrap:anywhere;min-height:0}.crypto-checkout-status:empty{display:none}' +
      '.crypto-checkout-dialog :focus-visible{outline:2px solid var(--crypto-accent);outline-offset:3px}.crypto-asset:focus-within,.crypto-network:focus-within{outline:2px solid var(--crypto-accent);outline-offset:2px}' +
      '</style><section class="crypto-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="crypto-checkout-title">' +
      '<div class="crypto-checkout-heading"><div><h2 id="crypto-checkout-title">Crypto payment</h2><div class="crypto-plan"></div></div><button type="button" class="crypto-checkout-close" aria-label="Close">&#215;</button></div>' +
      '<div class="crypto-checkout-main"><div class="crypto-coin-controls"><fieldset><legend>Currency</legend><div class="crypto-assets"></div></fieldset><fieldset><legend>Network</legend><div class="crypto-networks"></div></fieldset></div>' +
      '<p class="crypto-checkout-status" role="status" aria-live="polite"></p></div>' +
      '<div class="crypto-checkout-footer"><div class="crypto-selection"><img alt=""><span class="crypto-selection-main"><strong></strong><small></small></span><span class="crypto-selection-amount"></span></div>' +
      '<button type="button" class="crypto-action crypto-create">Create invoice</button>' +
      '<button type="button" class="crypto-action crypto-open" hidden>Open payment page</button>' +
      '<button type="button" class="crypto-action crypto-secondary crypto-check" hidden>Check payment</button>' +
      '<button type="button" class="crypto-action crypto-secondary crypto-change" hidden>Change currency</button>' +
      '<button type="button" class="crypto-action crypto-secondary crypto-manual">Contact support</button></div></section>';
    const get = selector => overlay.querySelector(selector);
    const status = get('[role="status"]');
    let disposed = false, busy = false, order = null, polling = null;
    let requestId = window.crypto.randomUUID();
    const methods = (Array.isArray(config.methods) ? config.methods : []).filter(method => assets[method.asset] && networks[method.network]);
    const groups = new Map();
    methods.forEach(method => { if (!groups.has(method.asset)) groups.set(method.asset, []); groups.get(method.asset).push(method); });
    let selectedMethod = methods[0] || null;
    const remembered = new Map();
    get('.crypto-plan').textContent = ({ plus: 'PLUS', pro: 'PRO', elite: 'ELITE', king: 'KING' })[options.tier] || '';
    function refreshSummary() {
      const summary = get('.crypto-selection');
      summary.hidden = !selectedMethod;
      if (!selectedMethod) return;
      get('.crypto-selection img').src = new URL(assets[selectedMethod.asset].file, assetBase).href;
      get('.crypto-selection strong').textContent = selectedMethod.asset;
      get('.crypto-selection small').textContent = networks[selectedMethod.network] + ' / ' + selectedMethod.network;
      get('.crypto-selection-amount').textContent = order?.price_cents ? 'EUR ' + (order.price_cents / 100).toFixed(2) : '';
    }
    function choose(method) {
      if (busy) return;
      if (selectedMethod?.key !== method.key) requestId = window.crypto.randomUUID();
      selectedMethod = method;
      remembered.set(method.asset, method.key);
      overlay.querySelectorAll('.crypto-asset').forEach(el => {
        const checked = el.querySelector('input').value === method.asset;
        el.classList.toggle('is-selected', checked); el.querySelector('input').checked = checked;
      });
      const container = get('.crypto-networks');
      if (container.dataset.asset === method.asset) {
        container.querySelectorAll('.crypto-network').forEach(el => {
          const input = el.querySelector('input'); input.checked = input.value === method.key;
          el.classList.toggle('is-selected', input.checked);
        });
        refreshSummary(); return;
      }
      container.dataset.asset = method.asset;
      container.replaceChildren();
      const entries = groups.get(method.asset);
      container.classList.toggle('is-single', entries.length === 1);
      entries.forEach(entry => {
        const label = document.createElement('label'); label.className = 'crypto-network';
        const input = document.createElement('input'); input.type = 'radio'; input.name = 'crypto-network'; input.value = entry.key;
        input.setAttribute('aria-label', entry.asset + ' / ' + entry.network);
        input.checked = entry.key === method.key; label.classList.toggle('is-selected', input.checked);
        const dot = document.createElement('span'); dot.className = 'crypto-network-dot'; dot.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span'), title = document.createElement('strong'), detail = document.createElement('small');
        title.textContent = networks[entry.network]; detail.textContent = entry.network;
        text.append(title, detail); label.append(input, dot, text);
        input.onchange = () => choose(entry);
        container.appendChild(label);
      });
      refreshSummary();
    }
    groups.forEach((entries, symbol) => {
      const label = document.createElement('label'); label.className = 'crypto-asset';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'crypto-asset'; input.value = symbol;
      input.setAttribute('aria-label', assets[symbol].name + ' (' + symbol + ')');
      const image = document.createElement('img'); image.src = new URL(assets[symbol].file, assetBase).href;
      image.alt = ''; image.width = 28; image.height = 28;
      const title = document.createElement('strong'), detail = document.createElement('small');
      title.textContent = symbol; detail.textContent = assets[symbol].name;
      label.append(input, image, title, detail);
      input.onchange = () => choose(entries.find(entry => entry.key === remembered.get(symbol)) || entries[0]);
      get('.crypto-assets').appendChild(label);
    });
    if (selectedMethod) choose(selectedMethod);
    else { refreshSummary(); config.error = config.error || 'No currencies are available. Please contact support.'; }
    if (config.test_only && config.price_cents === 600) status.textContent = 'Private test: ASMR PLUS / EUR 6.00';
    function setBusy(value) {
      busy = value;
      overlay.querySelectorAll('button:not(.crypto-checkout-close),input').forEach(el => { el.disabled = value; });
      overlay.querySelectorAll('.crypto-asset,.crypto-network').forEach(el => { el.classList.toggle('is-disabled', value); });
    }
    function close() {
      disposed = true;
      clearInterval(polling);
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      document.body.style.overflow = previousOverflow;
      if (active === reservation) active = null;
      if (previousFocus?.isConnected) previousFocus.focus();
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll('button,input')].filter(el => !el.hidden && !el.disabled && el.getClientRects().length && !el.closest('[hidden]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function renderOrder(value) {
      order = value;
      selectedMethod = methods.find(method => method.key === order.coin) || selectedMethod;
      refreshSummary();
      get('.crypto-open').hidden = !validUrl(order.payment_url);
      get('.crypto-check').hidden = false;
      get('.crypto-create').hidden = order.status !== 'confirmed';
      get('.crypto-create').textContent = order.status === 'confirmed' ? 'Done' : 'Create invoice';
      get('.crypto-change').hidden = order.status === 'confirmed';
      get('.crypto-coin-controls').hidden = true;
      const messages = {
        confirmed: 'Payment confirmed. Your subscription is active.',
        delivery_pending: 'Payment received. Your access is being prepared.',
        expired: 'This invoice has expired.', failed: 'The provider could not complete this payment.',
        attention: 'The payment needs review. Please contact support.',
        creation_unknown: 'Invoice creation could not be confirmed. Please contact support before retrying.',
        creating: 'Your invoice is being prepared. Check its status in a moment.',
      };
      status.textContent = messages[order.status] || 'Waiting for payment confirmation. EUR ' + (order.price_cents / 100).toFixed(2);
      if (order.status === 'confirmed') {
        clearInterval(polling);
        get('.crypto-check').hidden = true;
        get('.crypto-open').hidden = true;
        options.onPaid?.();
      }
    }
    async function check() {
      if (busy || !order || disposed) return;
      setBusy(true);
      try {
        const result = await post('/miniapp/crypto/status', { order_id: order.order_id });
        if (!disposed) renderOrder(result);
      } catch (error) {
        if (!disposed) status.textContent = error.message || 'Could not check payment. Try again later.';
      } finally { if (!disposed) setBusy(false); }
    }
    get('.crypto-create').onclick = async () => {
      if (order?.status === 'confirmed') { close(); return; }
      if (busy || !selectedMethod) return;
      setBusy(true); status.textContent = 'Creating your invoice...';
      try {
        const result = await post('/miniapp/crypto/checkout', {
          tier: options.tier, bundle_target: options.bundleTarget || '', coin: selectedMethod.key, request_id: requestId,
        });
        if (disposed) return;
        if (result.provider === 'manual') { close(); await options.manual(); return; }
        if (!result.order_id || (result.payment_url && !validUrl(result.payment_url))) throw Error('Invalid payment response.');
        renderOrder(result);
        clearInterval(polling);
        polling = setInterval(() => { if (document.visibilityState === 'visible') check(); }, 15000);
      } catch (error) {
        if (!disposed) status.textContent = error.message || 'Could not create an invoice. Please contact support.';
      } finally { if (!disposed) setBusy(false); }
    };
    get('.crypto-open').onclick = () => { if (validUrl(order?.payment_url)) options.openLink(order.payment_url); };
    get('.crypto-check').onclick = check;
    get('.crypto-change').onclick = () => {
      clearInterval(polling); order = null; requestId = window.crypto.randomUUID();
      get('.crypto-coin-controls').hidden = false;
      get('.crypto-create').hidden = false;
      get('.crypto-create').textContent = 'Create invoice';
      ['.crypto-open', '.crypto-check', '.crypto-change'].forEach(name => { get(name).hidden = true; });
      status.textContent = '';
      choose(selectedMethod);
    };
    get('.crypto-manual').onclick = () => { close(); options.manual(); };
    get('.crypto-checkout-close').onclick = close;
    overlay.onclick = event => { if (event.target === overlay) close(); };
    if (config.error) {
      status.textContent = config.error;
      get('.crypto-coin-controls').hidden = true;
      get('.crypto-create').hidden = true;
    }
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    get('.crypto-checkout-close').focus();
  }
  window.CryptoCheckout = { open, validUrl };
})();
