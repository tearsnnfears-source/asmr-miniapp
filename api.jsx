// api.jsx — thin layer over the live Railway backend.
// All hooks return { data, loading, error } and fall back to window.* mocks
// when running outside Telegram (preview URLs in a regular browser).
//
// Loaded after mock-data.jsx so window.ARTISTS/VIDEOS/SHORTS exist as fallback.

// Default points at the staging Railway service so the redesign uses the
// staging bot (@privateleakstvbot) without touching the production backend
// that the live miniapp (index.html.html) still uses. Override via
// ?api=prod in the URL or window.__MINIAPP_API_BASE__ if needed.
const API_BASE = (function () {
  if (window.__MINIAPP_API_BASE__) return window.__MINIAPP_API_BASE__;
  try {
    const override = new URLSearchParams(location.search).get('api');
    if (override === 'prod') return 'https://asmr-bot-production.up.railway.app';
    if (override && override.startsWith('http')) return override;
  } catch (_) {}
  return 'https://test-bot-production-e824.up.railway.app';
})();

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
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GET ${path} → ${res.status}: ${text.slice(0, 240)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return await res.json();
}
async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`POST ${path} → ${res.status}: ${text.slice(0, 240)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return await res.json();
}

// ── Module-level cache ────────────────────────────────────────
// Survives screen remounts: once a key is fetched, subsequent useFetch(key)
// calls return the cached value synchronously without a loading flash.
// Pending promises are deduped so simultaneous mounts don't hit the API twice.
const _apiCache = new Map(); // key → { data?: any, promise?: Promise, ts?: number }
// Subscribers per key — so a late-arriving fetch wakes all mounted hooks.
const _apiSubs = new Map(); // key → Set<(state) => void>

function _emit(key, state) {
  const subs = _apiSubs.get(key);
  if (subs) subs.forEach(fn => fn(state));
}

function _getOrFetch(key, fetcher, fallback) {
  const entry = _apiCache.get(key);
  if (entry?.data !== undefined) return entry; // hit
  if (entry?.promise) return entry; // in flight
  const promise = fetcher()
    .then(data => {
      _apiCache.set(key, { data, ts: Date.now() });
      _emit(key, { data, loading: false, error: null });
      return data;
    })
    .catch(err => {
      console.warn('[api]', key, err.message);
      // Cache the fallback so we don't refetch on every screen mount; the user
      // can still refresh by reload. Mark error so callers can detect it.
      _apiCache.set(key, { data: fallback, ts: Date.now(), error: err });
      _emit(key, { data: fallback, loading: false, error: err });
      throw err;
    });
  const inflight = { promise };
  _apiCache.set(key, inflight);
  return inflight;
}

// Invalidate a key — next useFetch refetches.
function invalidate(key) {
  _apiCache.delete(key);
  _emit(key, { data: undefined, loading: true, error: null });
}

// ── Generic data hook ─────────────────────────────────────────
function useFetch(key, fetcher, fallback, deps = []) {
  // Seed synchronously from cache if available — no flicker.
  const cached = _apiCache.get(key);
  const initial = cached?.data !== undefined
    ? { data: cached.data, loading: false, error: cached.error || null }
    : { data: fallback, loading: true, error: null };
  const [state, setState] = React.useState(initial);

  React.useEffect(() => {
    let alive = true;
    // Subscribe so a fetch finishing elsewhere wakes us.
    if (!_apiSubs.has(key)) _apiSubs.set(key, new Set());
    const sub = (s) => { if (alive) setState(s); };
    _apiSubs.get(key).add(sub);

    const entry = _getOrFetch(key, fetcher, fallback);
    if (entry.data !== undefined && state.data !== entry.data) {
      setState({ data: entry.data, loading: false, error: entry.error || null });
    }
    return () => {
      alive = false;
      _apiSubs.get(key)?.delete(sub);
    };
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
  // Real backend id (numeric). If missing — return null id so the UI can
  // skip the row rather than show a broken thumb that opens the wrong video.
  const rawId = (v.id ?? v.content_id) != null ? (v.id ?? v.content_id) : null;
  return {
    id: rawId,
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
      fresh: idx < 3,
    },
  };
}
function normalizeShort(s, idx = 0) {
  const artistName = s.artist_name || s.artistName || s.artist || 'Unknown';
  const rawId = (s.id ?? s.content_id) != null ? (s.id ?? s.content_id) : null;
  return {
    id: rawId,
    label: s.title || s.label || '',
    duration: s.duration || '',         // no '0:30' fallback — UI hides empty
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
    `videos:${limit}`,
    async () => {
      const data = await apiGet('/miniapp/videos', { limit });
      // Drop entries without a real backend id — they'd open the wrong video
      // when tapped (mismatch on content_id during /content/play lookup).
      const list = (data.videos || []).map(normalizeVideo).filter(v => v.id != null);
      if (!list.length) throw new Error('empty videos');
      return list;
    },
    window.VIDEOS || [],
    [limit],
  );
}

function useShorts(limit = 10) {
  return useFetch(
    `shorts:${limit}`,
    async () => {
      const data = await apiGet('/miniapp/shorts', { limit });
      const list = (data.shorts || []).map(normalizeShort).filter(s => s.id != null);
      if (!list.length) throw new Error('empty shorts');
      return list;
    },
    window.SHORTS || [],
    [limit],
  );
}

// Normalize an artist record from /miniapp/artists into the UI shape.
function normalizeArtist(a, idx = 0) {
  const tags = ['pink', 'lime', 'blue', 'purple', 'orange'];
  return {
    id: 'a-' + String(a.name || '').toLowerCase().replace(/\W+/g, ''),
    name: a.name || 'Unknown',
    handle: '@' + String(a.name || '').toLowerCase().replace(/\s+/g, ''),
    tag: tags[idx % tags.length],
    videos: a.videos || 0,
    photos: a.photos || 0,
    photo: a.photo_url && a.photo_url.trim() ? a.photo_url : '',
    profilePhoto: a.profile_photo_url && a.profile_photo_url.trim() ? a.profile_photo_url : '',
    fresh: !!a.tag_new,
    hot: !!a.tag_hot,
    promoted: !!a.tag_prom,
    ready: !!a.tag_ready,
    topicUrl: a.topic_url || '',
    hasProfile: !!a.has_profile,
    raw: a,
  };
}

// Sort priority matches the live miniapp's renderArtistsGrid():
//   READY (▶ IN APP) → 3
//   NEW              → 2
//   HOT              → 1
//   none             → 0
// Within the same tier, more content (photos + videos) comes first.
function artistTagPriority(a) {
  if (a.ready) return 3;
  if (a.fresh) return 2; // tag_new
  if (a.hot) return 1;
  return 0;
}
function artistTotalContent(a) {
  return (a.photos || 0) + (a.videos || 0);
}

function useArtists() {
  return useFetch(
    'artists',
    async () => {
      const data = await apiGet('/miniapp/artists');
      const list = (data.artists || []).map(normalizeArtist);
      if (!list.length) throw new Error('empty artists');
      // Sort: READY > NEW > HOT > by content count.
      list.sort((a, b) => {
        const pa = artistTagPriority(a);
        const pb = artistTagPriority(b);
        if (pa !== pb) return pb - pa;
        return artistTotalContent(b) - artistTotalContent(a);
      });
      return list;
    },
    window.ARTISTS || [],
    [],
  );
}

// Aggregate stats (photos / videos / artists) from the artist list, matching
// what the original miniapp does — no separate /stats endpoint exists.
function useStats() {
  const a = useArtists();
  const data = React.useMemo(() => {
    const list = a.data || [];
    let photos = 0, videos = 0;
    for (const it of list) {
      photos += +it.photos || 0;
      videos += +it.videos || 0;
    }
    if (!list.length) return window.STATS || { photos: 0, videos: 0, artists: 0 };
    return { photos, videos, artists: list.length };
  }, [a.data]);
  return { data, loading: a.loading, error: a.error };
}

function useTags() {
  return useFetch(
    'tags',
    async () => {
      const data = await apiGet('/miniapp/tags');
      const tags = data.tags || data || [];
      if (!Array.isArray(tags) || !tags.length) throw new Error('empty tags');
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

// Build a "best we can" user from Telegram WebApp data alone (no server).
// Used as the fallback shape so even if /miniapp/profile dies the header
// still shows the right name/username from initDataUnsafe.user.
function userFromTelegram() {
  const tgUser = getTelegramUser();
  if (!tgUser) {
    return {
      name: 'You', username: '', telegramId: 0, photo: '',
      daysLeft: 0, isPro: false, isInfinite: false, trialUsed: false, tier: 'free',
      badges: [], tributeProUrl: '', tributePlusUrl: '',
      raw: null,
    };
  }
  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
  return {
    name: fullName || tgUser.username || 'You',
    username: (tgUser.username || '').replace(/^@/, ''),
    telegramId: tgUser.id || 0,
    // photo_url is provided by Telegram when the user has a public profile photo
    photo: tgUser.photo_url || '',
    daysLeft: 0,
    isPro: false,
    isInfinite: false,
    trialUsed: false,
    tier: 'free',
    badges: [],
    tributeProUrl: '',
    tributePlusUrl: '',
    raw: null,
  };
}

// Favorites — POST /miniapp/favorites with initData → list of saved videos.
// Server returns { count, items: [{content_id, title, thumbnail_url, artist_name, duration, ...}] }
function useFavorites() {
  return useFetch(
    'favorites',
    async () => {
      const initData = getInitData();
      if (!initData) throw new Error('no initData');
      const data = await apiPost('/miniapp/favorites', { initData });
      const items = (data.items || data.favorites || []).map((it, i) => {
        // Items shaped like videos — reuse the same normalizer for thumbs/artist
        return normalizeVideo({
          id: it.content_id || it.id,
          title: it.title,
          thumbnail_url: it.thumbnail_url,
          artist_name: it.artist_name,
          duration: it.duration,
          created_at: it.saved_at || it.created_at,
          views: it.views || 0,
        }, i);
      });
      return { items, count: data.count != null ? data.count : items.length };
    },
    { items: [], count: 0 },
    [],
  );
}

// Read mock override from URL: ?mock=pro / ?mock=elite / ?mock=vip.
// Lets us preview the PRO-side UI without a working backend session.
function getMockTier() {
  try {
    const m = (new URLSearchParams(location.search).get('mock') || '').toLowerCase();
    if (['plus', 'pro', 'elite', 'vip', 'founder'].includes(m)) return m;
    return '';
  } catch (_) { return ''; }
}

// User profile drives isPro / centerMode / days-left in the header.
function useUser() {
  return useFetch(
    'user',
    async () => {
      const initData = getInitData();
      const mockTier = getMockTier();
      if (mockTier) {
        // Force-PRO preview without hitting the backend.
        const tg = userFromTelegram();
        return { ...tg, tier: mockTier, isPro: true, isInfinite: true, daysLeft: 99999, badges: [mockTier, 'preview'] };
      }
      if (!initData) throw new Error('no initData');
      const p = await apiPost('/miniapp/profile', { initData });
      const tgFallback = userFromTelegram();
      // days_left can come back as number, string, or be absent. Coerce.
      const rawDays = p.days_left;
      const days = typeof rawDays === 'number' ? rawDays
                 : (typeof rawDays === 'string' && !isNaN(+rawDays) ? +rawDays : 0);
      const INFINITE_THRESHOLD = 9000;
      const tier = (p.tier || 'free').toLowerCase();
      // A user is "PRO" if they have remaining days OR a non-free tier
      // (covers lifetime users where days_left isn't returned).
      const knownTiers = ['plus', 'pro', 'elite', 'vip', 'founder'];
      const isPro = days > 0 || knownTiers.includes(tier);
      return {
        name: p.full_name || tgFallback.name,
        username: (p.username || tgFallback.username || '').replace(/^@/, ''),
        telegramId: p.telegram_id || tgFallback.telegramId,
        photo: tgFallback.photo, // server doesn't ship it; use Telegram's
        daysLeft: days,
        isPro,
        isInfinite: days > INFINITE_THRESHOLD || (isPro && days === 0),
        trialUsed: !!p.trial_used,
        tier,
        badges: Array.isArray(p.badges) ? p.badges : (p.badge ? p.badge.split(',').map(s => s.trim()).filter(Boolean) : []),
        tributeProUrl: p.tribute_pro_url || '',
        tributePlusUrl: p.tribute_plus_url || '',
        raw: p,
      };
    },
    // Fallback: real Telegram identity when available, generic outside Telegram.
    userFromTelegram(),
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
  apiGet, apiPost, useFetch, invalidate,
  useVideos, useShorts, useTags, useUser, useArtists, useStats, useFavorites, userFromTelegram,
  actionFavoriteToggle, actionFollow, actionStartCryptoCheckout, actionStartFreeTrial,
  normalizeVideo, normalizeShort, normalizeArtist, thumbFor, paletteThumb,
  // For SplashScreen to peek at whether everything is loaded
  _apiCache,
});
