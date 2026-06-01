// debug.jsx — in-app log panel. Always wired up; the FAB only renders when
// either ?debug=1 is in the URL or the user is on the Telegram WebView and
// we've spotted an API failure. Captures every fetch through apiGet/apiPost
// (we monkey-patch them after they're defined) so the user can see request
// URLs, status codes, and raw response JSON without a desktop devtools.

(function () {
  const MAX_ENTRIES = 100;
  const log = [];
  const subs = new Set();

  function push(entry) {
    log.push({ ...entry, ts: Date.now() });
    if (log.length > MAX_ENTRIES) log.shift();
    subs.forEach(fn => fn());
  }

  window.__debugLog = {
    get: () => log.slice(),
    push,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    clear: () => { log.length = 0; subs.forEach(fn => fn()); },
  };

  // Monkey-patch apiGet/apiPost once api.jsx has defined them.
  const wrap = () => {
    if (window.__debugWrapped) return;
    if (!window.apiGet || !window.apiPost) { setTimeout(wrap, 50); return; }
    window.__debugWrapped = true;

    const origGet = window.apiGet;
    const origPost = window.apiPost;

    window.apiGet = async function patchedGet(path, query) {
      const t0 = Date.now();
      try {
        const data = await origGet(path, query);
        push({ kind: 'GET', path, query, ok: true, ms: Date.now() - t0, data: clip(data) });
        return data;
      } catch (e) {
        push({ kind: 'GET', path, query, ok: false, ms: Date.now() - t0, error: e.message });
        throw e;
      }
    };
    window.apiPost = async function patchedPost(path, body) {
      const t0 = Date.now();
      // Don't log raw initData (it's a JWT-like signed string).
      const safeBody = body && body.initData
        ? { ...body, initData: '[' + body.initData.slice(0, 24) + '…]' }
        : body;
      try {
        const data = await origPost(path, body);
        push({ kind: 'POST', path, body: safeBody, ok: true, ms: Date.now() - t0, data: clip(data) });
        return data;
      } catch (e) {
        push({ kind: 'POST', path, body: safeBody, ok: false, ms: Date.now() - t0, error: e.message });
        throw e;
      }
    };
  };
  function clip(v) {
    try {
      const s = JSON.stringify(v);
      if (s.length < 4000) return v;
      return JSON.parse(s.slice(0, 4000) + (s.endsWith('}') ? '"…"}' : '"…"'));
    } catch (_) {
      return String(v).slice(0, 4000);
    }
  }
  wrap();
})();

function DebugFab() {
  const [open, setOpen] = React.useState(false);
  const [, force] = React.useReducer(x => x + 1, 0);
  // Auto-show panel after first error so the user notices.
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    return window.__debugLog.subscribe(() => {
      force();
      const last = window.__debugLog.get().slice(-1)[0];
      if (last && !last.ok) setPulse(true);
    });
  }, []);

  // Gated behind ?debug=1 — prod users shouldn't see a bug emoji
  // floating in the corner. Tweaks panel uses the same mechanism.
  const isDebug = (() => {
    try { return new URLSearchParams(location.search).get('debug') === '1'; }
    catch (_) { return false; }
  })();
  if (!isDebug) return null;

  const entries = window.__debugLog.get().slice().reverse();
  const errors = entries.filter(e => !e.ok).length;

  return (
    <React.Fragment>
      <button onClick={() => { setOpen(o => !o); setPulse(false); }} style={{
        position: 'fixed', right: 12, bottom: 80, zIndex: 9998,
        width: 44, height: 44, borderRadius: '50%',
        background: errors ? '#FF4D4D' : 'rgba(40,40,42,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff', fontSize: 18, cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: pulse ? 'debug-pulse 1.2s ease-in-out infinite' : 'none',
      }}>
        🐛
        {errors > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#fff', color: '#FF4D4D',
            width: 18, height: 18, borderRadius: '50%',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{errors}</span>
        )}
      </button>
      <style>{`@keyframes debug-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }`}</style>
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9997,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif', color: '#fff',
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(20,20,22,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 'calc(12px + var(--tg-safe-top, env(safe-area-inset-top, 0px)))',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>API debug log</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {entries.length} entries · {errors} failed
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.__debugLog.clear()} style={debugBtnStyle}>Clear</button>
              <button onClick={() => setOpen(false)} style={debugBtnStyle}>Close</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 24px' }}>
            {/* Quick summary block at the top */}
            <DebugSummary />
            {entries.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                No API calls yet
              </div>
            )}
            {entries.map((e, i) => (
              <details key={entries.length - i} style={{
                marginBottom: 6,
                background: e.ok ? 'rgba(255,255,255,0.04)' : 'rgba(255,77,77,0.16)',
                border: `1px solid ${e.ok ? 'rgba(255,255,255,0.08)' : 'rgba(255,77,77,0.4)'}`,
                borderRadius: 8, padding: '8px 10px',
                fontSize: 12,
              }}>
                <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 4,
                    background: e.kind === 'POST' ? '#3B82F6' : '#10B981',
                    color: '#fff', letterSpacing: 0.5,
                  }}>{e.kind}</span>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.path}</span>
                  <span style={{ fontSize: 10, color: e.ok ? '#4ADE80' : '#FF8888', fontWeight: 700 }}>
                    {e.ok ? 'OK' : 'ERR'} · {e.ms}ms
                  </span>
                </summary>
                <div style={{ marginTop: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.4, color: 'rgba(255,255,255,0.85)', wordBreak: 'break-all' }}>
                  {e.query && <div><b style={{ color: '#A5B4FC' }}>query:</b> {JSON.stringify(e.query)}</div>}
                  {e.body && <div><b style={{ color: '#A5B4FC' }}>body:</b> <pre style={prePillStyle}>{JSON.stringify(e.body, null, 2)}</pre></div>}
                  {e.error && <div style={{ color: '#FF8888' }}><b>error:</b> {e.error}</div>}
                  {e.data !== undefined && <div><b style={{ color: '#A5B4FC' }}>response:</b> <pre style={prePillStyle}>{JSON.stringify(e.data, null, 2)}</pre></div>}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

const debugBtnStyle = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  padding: '6px 12px',
  borderRadius: 8,
  fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const prePillStyle = {
  margin: '4px 0 0',
  background: 'rgba(0,0,0,0.4)',
  borderRadius: 6,
  padding: 8,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  fontSize: 10.5,
  color: '#fff',
  maxHeight: 400,
  overflow: 'auto',
};

// Quick summary panel that pulls from the API cache so the user sees the
// resolved 'user' and 'favorites' values without scrolling through logs.
function DebugSummary() {
  const cache = window._apiCache;
  if (!cache) return null;
  const userEntry = cache.get('user');
  const favEntry = cache.get('favorites');
  const artistsEntry = cache.get('artists');
  const videosEntry = cache.get('videos:500');

  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  // Parse initData query string into key→decoded-value pairs so we can spot
  // missing or malformed fields without leaking the raw hash.
  const initData = window.getInitData?.() || '';
  const initDataPairs = React.useMemo(() => {
    if (!initData) return [];
    return initData.split('&').map(pair => {
      const [k, ...rest] = pair.split('=');
      const v = rest.join('=');
      let decoded = '';
      try { decoded = decodeURIComponent(v); } catch (_) { decoded = v; }
      // For long values (user JSON, hash) show length, then a preview.
      const preview = decoded.length > 80 ? decoded.slice(0, 60) + '… (' + decoded.length + ' chars)' : decoded;
      return { key: k, preview, full: decoded };
    });
  }, [initData]);

  const copyInitData = () => {
    try {
      navigator.clipboard.writeText(initData);
    } catch (_) {}
  };

  return (
    <div style={{
      background: 'rgba(80,40,140,0.18)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 10,
      fontSize: 11.5, lineHeight: 1.5,
      fontFamily: 'ui-monospace, monospace',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: 'system-ui' }}>Live state</div>
      <Field label="API_BASE" value={window.API_BASE} />
      <Field label="initData length" value={String(initData.length)} />
      <Field label="tg.user" value={tgUser ? `${tgUser.first_name || ''} (${tgUser.id})` : '(none)'} />
      <Field label="user.data" value={summarize(userEntry)} multi={userEntry?.data} />
      <Field label="favorites.data" value={summarize(favEntry)} multi={favEntry?.data} />
      <Field label="artists.data" value={summarize(artistsEntry, true)} />
      <Field label="videos:500" value={summarize(videosEntry, true)} />

      {/* initData field breakdown */}
      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#A5B4FC', display: 'flex', alignItems: 'center', gap: 8 }}>
          initData fields
          <button onClick={copyInitData} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 9, padding: '2px 8px', borderRadius: 4,
            fontWeight: 600, cursor: 'pointer',
          }}>copy raw</button>
        </div>
        {initDataPairs.length === 0 && (
          <div style={{ color: '#FFB4B4', fontSize: 11 }}>(empty initData)</div>
        )}
        {initDataPairs.map((p, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <span style={{ color: p.key === 'user' ? '#4ADE80' : (p.key === 'hash' ? '#FFA94D' : '#A5B4FC') }}>{p.key}:</span>{' '}
            <span style={{ color: '#fff', fontSize: 10.5, wordBreak: 'break-all' }}>{p.preview}</span>
          </div>
        ))}
        {/* Highlight whether `user` key is present at all */}
        {!initDataPairs.find(p => p.key === 'user') && (
          <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(255,77,77,0.18)', borderRadius: 4, color: '#FF8888', fontSize: 11 }}>
            ⚠ No <b>user=</b> field in initData. Backend can't parse user.
          </div>
        )}
      </div>
    </div>
  );
}
function Field({ label, value, multi }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#A5B4FC' }}>{label}:</span>{' '}
      <span onClick={multi ? () => setOpen(o => !o) : undefined} style={{ cursor: multi ? 'pointer' : 'default', color: '#fff' }}>
        {value}{multi ? (open ? ' ▼' : ' ›') : ''}
      </span>
      {open && multi && (
        <pre style={prePillStyle}>{JSON.stringify(multi, null, 2)}</pre>
      )}
    </div>
  );
}
function summarize(entry, listLike) {
  if (!entry) return '(not loaded)';
  if (entry.promise && !entry.data) return '(loading…)';
  if (entry.error) return `ERR: ${entry.error.message}`;
  if (!entry.data) return '(empty)';
  if (listLike) return `${(entry.data.items || entry.data).length || 0} items`;
  if (Array.isArray(entry.data)) return `[${entry.data.length}]`;
  if (typeof entry.data === 'object') return `{...} click to expand`;
  return String(entry.data);
}

Object.assign(window, { DebugFab });
