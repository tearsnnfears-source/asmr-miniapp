(function () {
  'use strict';
  let active = null;
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
      config = await post('/miniapp/crypto/config', {});
      if (config.provider === 'manual') { active = null; return options.manual(); }
      if (config.provider !== 'plisio' || !config.ready) throw Error('Crypto payments are temporarily unavailable.');
    } catch (error) { config = { methods: [], error: error.message || 'Could not load payment options.' }; }
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'crypto-checkout-overlay';
    overlay.innerHTML = '<style>' +
      '.crypto-checkout-overlay{position:fixed;inset:0;z-index:20000;background:#000b;display:grid;place-items:center;padding:16px;box-sizing:border-box;color:#f5f5f5;font-family:Arial,sans-serif}' +
      '.crypto-checkout-dialog{box-sizing:border-box;width:100%;max-width:420px;max-height:calc(100dvh - 32px);overflow:auto;background:#151518;border:1px solid #424248;border-radius:8px;padding:20px;box-shadow:0 18px 60px #0008;letter-spacing:0}' +
      '.crypto-checkout-dialog *{box-sizing:border-box;letter-spacing:0}' +
      '.crypto-checkout-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}' +
      '.crypto-checkout-heading h2{font-size:20px;margin:0;line-height:1.3}' +
      '.crypto-checkout-dialog button,.crypto-checkout-dialog select{font:inherit;border-radius:6px;min-height:44px;max-width:100%}' +
      '.crypto-checkout-close{width:44px;flex-shrink:0;background:none;color:#ddd;border:1px solid #494950;font-size:24px!important}' +
      '.crypto-checkout-dialog label{font-size:13px;display:block;margin-bottom:8px;color:#c9c9d0}' +
      '.crypto-checkout-dialog select{width:100%;padding:10px;background:#232328;color:#fff;border:1px solid #55555c}' +
      '.crypto-checkout-dialog .crypto-action{width:100%;margin-top:12px;padding:12px;cursor:pointer;font-size:14px;font-weight:700;border:1px solid #777;background:#ececf0;color:#17171b}' +
      '.crypto-checkout-dialog .crypto-secondary{background:transparent;color:#eee;border-color:#494950}' +
      '.crypto-checkout-dialog button:disabled{opacity:.5;cursor:wait}' +
      '.crypto-checkout-status{font-size:14px;line-height:1.5;margin:16px 0;overflow-wrap:anywhere;min-height:22px}' +
      '.crypto-checkout-dialog :focus-visible{outline:2px solid #d5ff63;outline-offset:3px}' +
      '</style><section class="crypto-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="crypto-checkout-title">' +
      '<div class="crypto-checkout-heading"><h2 id="crypto-checkout-title">Crypto payment</h2><button type="button" class="crypto-checkout-close" aria-label="Close">&#215;</button></div>' +
      '<div class="crypto-coin-controls"><label for="crypto-checkout-coin">Currency and network</label><select id="crypto-checkout-coin"></select></div>' +
      '<p class="crypto-checkout-status" role="status" aria-live="polite"></p>' +
      '<button type="button" class="crypto-action crypto-create">Create invoice</button>' +
      '<button type="button" class="crypto-action crypto-open" hidden>Open payment page</button>' +
      '<button type="button" class="crypto-action crypto-secondary crypto-check" hidden>Check payment</button>' +
      '<button type="button" class="crypto-action crypto-secondary crypto-change" hidden>Change currency</button>' +
      '<button type="button" class="crypto-action crypto-secondary crypto-manual">Contact support</button></section>';
    const get = selector => overlay.querySelector(selector);
    const select = get('select'), status = get('[role="status"]');
    let disposed = false, busy = false, order = null, polling = null;
    let requestId = window.crypto.randomUUID();
    const methods = Array.isArray(config.methods) ? config.methods : [];
    methods.forEach(method => {
      const option = document.createElement('option');
      option.value = method.key;
      option.textContent = method.asset + ' / ' + method.network;
      select.appendChild(option);
    });
    function setBusy(value) {
      busy = value;
      overlay.querySelectorAll('button:not(.crypto-checkout-close),select').forEach(el => { el.disabled = value; });
    }
    function close() {
      disposed = true;
      clearInterval(polling);
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (active === reservation) active = null;
      if (previousFocus?.isConnected) previousFocus.focus();
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll('button,select')].filter(el => !el.hidden && !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function renderOrder(value) {
      order = value;
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
      if (busy || !select.value) return;
      setBusy(true); status.textContent = 'Creating your invoice...';
      try {
        const result = await post('/miniapp/crypto/checkout', {
          tier: options.tier, bundle_target: options.bundleTarget || '', coin: select.value, request_id: requestId,
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
    select.onchange = () => { requestId = window.crypto.randomUUID(); };
    get('.crypto-open').onclick = () => { if (validUrl(order?.payment_url)) options.openLink(order.payment_url); };
    get('.crypto-check').onclick = check;
    get('.crypto-change').onclick = () => {
      clearInterval(polling); order = null; requestId = window.crypto.randomUUID();
      get('.crypto-coin-controls').hidden = false;
      get('.crypto-create').hidden = false;
      get('.crypto-create').textContent = 'Create invoice';
      ['.crypto-open', '.crypto-check', '.crypto-change'].forEach(name => { get(name).hidden = true; });
      status.textContent = '';
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
    document.addEventListener('keydown', onKey);
    get('.crypto-checkout-close').focus();
  }
  window.CryptoCheckout = { open, validUrl };
})();
