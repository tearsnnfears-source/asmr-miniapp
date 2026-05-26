// api.jsx — thin layer over the live Railway backend.
// All hooks return { data, loading, error } and fall back to window.* mocks
// when running outside Telegram (preview URLs in a regular browser).
//
// Loaded after mock-data.jsx so window.ARTISTS/VIDEOS/SHORTS exist as fallback.

const API_BASE = window.__MINIAPP_API_BASE__ || 'https://asmr-bot-production.up.railway.app';

// ── Telegram bootstrap ────────────────────────────────────────
// Call once at app start. Idempotent.
function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
  } catch (_) {}
  return tg;
}
function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}
function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}
function isInsideTelegram() {
  return !!(window.Telegram?.WebApp && getInitData());
}

// ── Low-level fetch helpers ───────────────────────────────────
async function apiGet(path, query = {}) {
  const qs = new URLSearchParams(query).toString();
  const url = `${API_BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return await res.json();
}
async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return await res.json();
}

// ── Generic data hook ─────────────────────────────────────────
// fetcher: async () => apiData
// fallback: data to return on error (e.g. mock)
function useFetch(fetcher, fallback, deps = []) {
  const [state, setState] = React.useState({ data: fallback, loading: true, error: null });
  React.useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    fetcher()
      .then(data => { if (alive) setState({ data, loading: false, error: null }); })
      .catch(error => {
        console.warn('[api]', error.message);
        if (alive) setState({ data: fallback, loading: false, error });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

// ── Normalizers ───────────────────────────────────────────────
// Real backend returns server-style records; UI expects mock-shaped objects.
// We bridge the difference here so screens stay clean.

const THUMB_PALETTES = window.THUMB_PALETTES || [
  ['#FF7EC8', '#C86BFF', '#44C8FF'],
  ['#CCFF00', '#44C8FF', '#0E0E0F'],
  ['#FF9F44', '#FF7EC8', '#1E1E20'],
  ['#44C8FF', '#C86BFF', '#161617'],
  ['#FF7EC8', '#FF9F44', '#252527'],
  ['#CCFF00', '#FF7EC8', '#1E1E20'],
  ['#C86BFF', '#FF7EC8', '#161617'],
  ['#FF9F44', '#CCFF00', '#0E0E0F'],
];
function paletteThumb(seed) {
  const p = THUMB_PALETTES[Math.abs(seed | 0) % THUMB_PALETTES.length];
  return { bg: `linear-gradient(135deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`, dot: p[0] };
}
function thumbFor(v) {
  // Real thumb URL → image background; otherwise palette gradient.
  if (v.thumbnail_url) {
    return {
      bg: `linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.5)), url('${v.thumbnail_url}') center/cover no-repeat`,
      dot: '#FF7EC8',
      src: v.thumbnail_url,
    };
  }
  return paletteThumb(v.id || 0);
}
function relativeAge(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function compactViews(n) {
  n = +n || 0;
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1_000_000) return Math.round(n / 1000) + 'K';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

function normalizeVideo(v, idx = 0) {
  const artistName = v.artist_name || v.artistName || 'Unknown';
  const artistId = 'a-' + (v.artist_id || artistName.toLowerCase().replace(/\W+/g, ''));
  return {
    id: v.id != null ? String(v.id) : `v${idx}`,
    title: v.title || 'Untitled',
    duration: v.duration || '',
    age: relativeAge(v.created_at),
    views: compactViews(v.views || v.view_count || 0),
    thumb: thumbFor(v),
    raw: v,
    artist: {
      id: artistId,
      name: artistName,
      handle: '@' + artistName.toLowerCase().replace(/\s+/g, ''),
      tag: ['pink', 'lime', 'blue', 'purple', 'orange'][Math.abs((idx | 0)) % 5],
      videos: 0, photos: 0,
      fresh: idx < 3, // first few feel "fresh"
    },
  };
}
function normalizeShort(s, idx = 0) {
  const artistName = s.artist_name || s.artistName || s.artist || 'Unknown';
  return {
    id: s.id != null ? String(s.id) : `s${idx}`,
    label: s.title || s.label || 'Short',
    duration: s.duration || '0:30',
    views: compactViews(s.views || 0),
    thumb: thumbFor(s),
    raw: s,
    artist: {
      id: 'a-' + artistName.toLowerCase().replace(/\W+/g, ''),
      name: artistName,
      handle: '@' + artistName.toLowerCase().replace(/\s+/g, ''),
    },
  };
}

// ── Hooks ─────────────────────────────────────────────────────

function useVideos(limit = 500) {
  return useFetch(
    async () => {
      const data = await apiGet('/miniapp/videos', { limit });
      const list = (data.videos || []).map(normalizeVideo);
      if (!list.length) throw new Error('empty videos');
      return list;
    },
    window.VIDEOS || [],
    [limit],
  );
}

function useShorts(limit = 10) {
  return useFetch(
    async () => {
      const data = await apiGet('/miniapp/shorts', { limit });
      const list = (data.shorts || []).map(normalizeShort);
      if (!list.length) throw new Error('empty shorts');
      return list;
    },
    window.SHORTS || [],
    [limit],
  );
}

function useTags() {
  return useFetch(
    async () => {
      const data = await apiGet('/miniapp/tags');
      const tags = data.tags || data || [];
      if (!Array.isArray(tags) || !tags.length) throw new Error('empty tags');
      // Map server tag names to our CATEGORIES shape.
      const icons = ['◐','◑','◒','◓','◔','◕','◗','◘'];
      return tags.slice(0, 8).map((t, i) => ({
        id: (t.id || t.name || t).toString().toLowerCase(),
        label: t.name || t.label || t,
        icon: icons[i] || '◐',
      }));
    },
    window.CATEGORIES || [],
    [],
  );
}

// User profile drives isPro / centerMode / days-left in the header.
function useUser() {
  return useFetch(
    async () => {
      const initData = getInitData();
      if (!initData) throw new Error('no initData');
      const p = await apiPost('/miniapp/profile', { initData });
      return {
        name: p.full_name || getTelegramUser()?.first_name || 'You',
        username: (p.username || '').replace(/^@/, ''),
        telegramId: p.telegram_id,
        daysLeft: typeof p.days_left === 'number' ? p.days_left : 0,
        isPro: typeof p.days_left === 'number' ? p.days_left > 0 : false,
        trialUsed: !!p.trial_used,
        tier: p.tier || 'free',
        badges: Array.isArray(p.badges) ? p.badges : (p.badge ? p.badge.split(',') : []),
        tributeProUrl: p.tribute_pro_url || '',
        tributePlusUrl: p.tribute_plus_url || '',
        raw: p,
      };
    },
    // Fallback when not in Telegram: pretend free user with mock name.
    {
      name: 'Sofia R.', username: 'sofia', telegramId: 0,
      daysLeft: 0, isPro: false, trialUsed: false, tier: 'free',
      badges: [], tributeProUrl: '', tributePlusUrl: '',
      raw: null,
    },
    [],
  );
}

// ── Actions (no React state — fire-and-forget POSTs) ──────────

async function actionFavoriteToggle(contentId) {
  const initData = getInitData();
  if (!initData) return { ok: false, reason: 'no-tg' };
  try {
    const res = await apiPost('/miniapp/favorites/toggle', { initData, content_id: contentId });
    return { ok: true, ...res };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function actionFollow(artistName) {
  const initData = getInitData();
  if (!initData) return { ok: false, reason: 'no-tg' };
  try {
    const res = await apiPost('/miniapp/follow', { initData, artist: artistName });
    return { ok: true, ...res };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function actionStartCryptoCheckout(plan = 'year') {
  const initData = getInitData();
  if (!initData) {
    return { ok: false, reason: 'no-tg', message: 'Open from Telegram to subscribe' };
  }
  try {
    const data = await apiPost('/miniapp/cryptocloud/checkout', { initData, plan });
    if (data.link) {
      // Open Cryptocloud hosted checkout — Telegram WebApp supports openLink.
      window.Telegram?.WebApp?.openLink?.(data.link) || window.open(data.link, '_blank');
      return { ok: true, link: data.link };
    }
    return { ok: false, error: 'no checkout link' };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function actionStartFreeTrial() {
  const initData = getInitData();
  if (!initData) return { ok: false, reason: 'no-tg' };
  try {
    const res = await apiPost('/miniapp/free_trial', { initData });
    return { ok: true, ...res };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── Boot ──────────────────────────────────────────────────────
initTelegram();

// Expose everything on window so screens can pull what they need without
// per-file imports (this codebase uses globals).
Object.assign(window, {
  API_BASE, initTelegram, getInitData, getTelegramUser, isInsideTelegram,
  apiGet, apiPost, useFetch,
  useVideos, useShorts, useTags, useUser,
  actionFavoriteToggle, actionFollow, actionStartCryptoCheckout, actionStartFreeTrial,
  normalizeVideo, normalizeShort, thumbFor, paletteThumb,
});
