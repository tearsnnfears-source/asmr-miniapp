// Redesign beta — YouTube-style screens for the ASMR.LEAKS mini app.
// app.jsx loads this file only for testers (bot BETA_TESTER_IDS → profile.beta,
// or ?ui=v2) and swaps these screens in; the shell, player, shorts overlay,
// invites and payments stay the shared ones. Everything top-level is prefixed
// V2 so nothing collides with the globals the other scripts declare.

const V2C = {
  bg: '#0E0E0F',
  surface: '#161617',
  raised: '#1C1C1E',
  chip: '#272729',
  text: '#F1F1F1',
  soft: '#D1D1D6',
  muted: '#AAAAAA',
  pink: '#FF7EC8',
  lime: '#C8FF44',
  purple: '#C86BFF',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
};
const V2_SITE = 'https://asmrleaks.tv';
const V2_SAFE_BOTTOM = 'var(--tg-safe-bottom, env(safe-area-inset-bottom, 0px))';
// Room the floating bar takes over scrolling content.
const V2_NAV_SPACE = `calc(112px + ${V2_SAFE_BOTTOM})`;
const V2_ARTISTS_PAGE = 24; // artist cards mounted per scroll step
// Trigger covers that exist on the site (public/category-covers/<slug>.webp).
const V2_COVERS = new Set(['ahegao', 'blowing', 'blowjob', 'bodyplay', 'camshow', 'dancing', 'feet', 'free', 'handjob',
  'handsounds', 'kisses', 'lenslicking', 'licking', 'lipping', 'massage', 'masturbating', 'mouthsounds', 'pumping',
  'roleplay', 'scratching', 'sextape', 'spitpainting', 'sucking', 'tapping', 'titsplay', 'tryonhaul', 'visual', 'vod',
  'whispering', 'ytbackup']);
const V2_DROP = 'M20 1 L32.38 24.47 A14 14 0 1 1 7.62 24.47 Z';

if (!document.getElementById('v2-styles')) {
  const style = document.createElement('style');
  style.id = 'v2-styles';
  style.textContent = `
    .v2-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
    .v2-row { display: flex; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; overscroll-behavior-x: contain; }
    .v2-row::-webkit-scrollbar { display: none; }
    .v2-snap { scroll-snap-type: x mandatory; }
    .v2-snap > * { scroll-snap-align: start; }
    .v2-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .v2-press { transition: transform 0.15s ease; }
    .v2-press:active { transform: scale(0.97); }
    .v2-skel { background: linear-gradient(90deg, #161617 0%, #1E1E20 50%, #161617 100%); background-size: 200% 100%; animation: v2-skel 1.2s linear infinite; }
    @keyframes v2-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @keyframes v2-sheet { from { transform: translateY(100%); } to { transform: none; } }
    @keyframes v2-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes v2-enter { from { opacity: 0.35; } to { opacity: 1; } }
    @keyframes v2-push { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
    @keyframes v2-pop { 0% { transform: scale(0.82); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
    @keyframes v2-open { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
    @keyframes v2-dock { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: none; } }
    /* Older screens shown inside the redesign scroll under the floating bar too. */
    .v2-on [data-phone] > div[style*="overflow-y: auto"] { padding-bottom: ${V2_NAV_SPACE} !important; }
    /* Screens arrive softly: tabs fade in (cheap, no transform on long lists), pages slide in. */
    .v2-scroll { animation: v2-enter 0.2s ease-out both; }
    .v2-scroll.v2-push { animation: v2-push 0.26s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .v2-img { opacity: 0; transition: opacity 0.4s ease; }
    .v2-img.v2-loaded { opacity: 1; }
    .v2-chip, .v2-follow, .v2-choice { transition: background-color 0.22s ease, color 0.22s ease, border-color 0.22s ease, box-shadow 0.25s ease, transform 0.15s ease; }
    .v2-chip:active, .v2-follow:active, .v2-choice:active { transform: scale(0.96); }
    .v2-tab-icon { display: flex; }
    .v2-tab-icon.on { animation: v2-pop 0.38s cubic-bezier(0.34, 1.4, 0.64, 1); }
    .v2-backdrop { animation: v2-fade 0.25s ease both; }
    /* The minimised video docks as a card right above the floating bar. */
    .v2-on [data-persistent-player][data-minimized="true"] {
      left: 14px !important; right: 14px !important; z-index: 31 !important;
      bottom: calc(86px + ${V2_SAFE_BOTTOM}) !important;
      border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 14px 34px rgba(0,0,0,0.55); animation: v2-dock 0.36s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    .v2-on [data-persistent-player][data-minimized="false"] { animation: v2-open 0.36s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .v2-on.v2-mini .v2-scroll,
    .v2-on.v2-mini [data-phone] > div[style*="overflow-y: auto"] { padding-bottom: calc(206px + ${V2_SAFE_BOTTOM}) !important; }
    .v2-on .shorts-overlay { animation: v2-open 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  `;
  document.head.appendChild(style);
}
document.body.classList.add('v2-on');

// ── Icons ────────────────────────────────────────────────────────
const V2I = {
  home: (on) => on
    ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.2 3 10v10.3c0 .4.3.7.7.7H9.5v-6.2h5V21h5.8c.4 0 .7-.3.7-.7V10z" /></svg>
    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.2 3.5 9.8v10.7h5.8v-6.2h5.4v6.2h5.8V9.8z" /></svg>,
  shorts: (on) => on
    ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9.5 2.5h5A3.5 3.5 0 0 1 18 6v12a3.5 3.5 0 0 1-3.5 3.5h-5A3.5 3.5 0 0 1 6 18V6a3.5 3.5 0 0 1 3.5-3.5zM10.5 9v6l4-3z" /></svg>
    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3.5" /><polygon points="10.5 9 14.5 12 10.5 15" /></svg>,
  artists: (on) => <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d={on ? 'M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5z' : 'M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5'} /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" fill="none" /><path d="M18.3 14.8c1.8.7 2.9 2.4 3.2 5.2" fill="none" /></svg>,
  saved: (on) => <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.2L5.5 21V4.5a1 1 0 0 1 1-1z" /></svg>,
  search: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="20.5" y1="20.5" x2="16.2" y2="16.2" /></svg>,
  compass: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" /></svg>,
  shortsMark: (color) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3.5" /><polygon points="10.5 9 14.5 12 10.5 15" fill={color} /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  play: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4" /></svg>,
  shuffle: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>,
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  chevR: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>,
  link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>,
  globe: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  list: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h12M4 12h12M4 18h8" /></svg>,
  star: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" /></svg>,
  clock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M5 3 2 6M19 3l3 3" /></svg>,
  help: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" /><circle cx="12" cy="17.3" r="0.6" fill="currentColor" /></svg>,
  playlists: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h13M3 12h13M3 18h8" /><path d="M18 15v6M15 18h6" /></svg>,
  crown: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11H5z" /></svg>,
  lock: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.3" fill="currentColor" /></svg>,
  arrow: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  telegram: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.4 18.6 19.9c-.25 1.1-.9 1.37-1.82.85l-5.03-3.7-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.12 9.32-8.42c.4-.36-.09-.56-.63-.2L5.85 13.4 .9 11.85c-1.08-.34-1.1-1.08.22-1.6L20.5 2.8c.9-.33 1.68.2 1.4 1.6z" /></svg>,
};

// ── Small building blocks ───────────────────────────────────────
function V2Img({ src, style }) {
  const markLoaded = (el) => el && el.classList.add('v2-loaded');
  return (
    <img src={src} alt="" loading="lazy" decoding="async" className="v2-img"
      ref={el => { if (el && el.complete) markLoaded(el); }}
      onLoad={e => markLoaded(e.currentTarget)} onError={e => markLoaded(e.currentTarget)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />
  );
}

const v2IconBtn = {
  position: 'relative', width: 44, height: 44, padding: 0, border: 'none', background: 'transparent',
  color: V2C.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
};

function V2Wordmark({ size = 26, accent = V2C.pink }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Bebas Neue', sans-serif", fontSize: size, letterSpacing: size * 0.095, lineHeight: 1, paddingTop: 3, color: V2C.text }}>
      ASMR<svg width={size * 0.5} height={size * 0.58} viewBox="0 0 40 46" aria-hidden="true" style={{ margin: `0 1px ${size * 0.12}px 0` }}><path d={V2_DROP} fill={accent} /></svg>LEAKS
    </span>
  );
}

function V2Header({ accent = V2C.pink, title, badge, children }) {
  const nav = window.useNav();
  return (
    <header style={{ display: 'flex', alignItems: 'center', minHeight: 56, padding: '0 4px 0 14px', flexShrink: 0, background: V2C.bg, position: 'relative', zIndex: 2 }}>
      {title
        ? <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 700, color: V2C.text }}>
            {title}{badge != null && <span style={{ height: 22, padding: '0 8px', borderRadius: 999, background: V2C.chip, color: V2C.soft, fontSize: 12, fontWeight: 600, lineHeight: '22px' }}>{badge}</span>}
          </h1>
        : <button type="button" onClick={() => nav.reset('home')} aria-label="ASMR.LEAKS home" style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <V2Wordmark accent={accent} />
          </button>}
      <span style={{ flex: 1 }} />
      {children}
      {!title && <AppHeaderLinks accent={accent} iconOnly buttonStyle={v2IconBtn} />}
      {!title && <AppHeaderBell accent={accent} buttonStyle={v2IconBtn}
        dotStyle={{ position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: '50%', background: accent, border: `2px solid ${V2C.bg}` }} />}
      {!children && <button type="button" aria-label="Search" onClick={() => nav.go('search')} style={v2IconBtn}>{V2I.search}</button>}
    </header>
  );
}

function V2Chips({ items, value, onPick, leading }) {
  return (
    <nav className="v2-row" aria-label="Filter" style={{ gap: 8, padding: '2px 14px 14px', flexShrink: 0 }}>
      {leading}
      {items.map(it => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" className="v2-chip" aria-pressed={on} onClick={() => onPick(it)} style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
            border: 'none', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
            background: on ? V2C.text : V2C.chip, color: on ? V2C.bg : V2C.text,
            fontSize: 14, fontWeight: on ? 600 : 500,
          }}>{it.label}{it.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: V2C.lime }} />}</button>
        );
      })}
    </nav>
  );
}

function V2Avatar({ artist, size = 38, ring }) {
  const photo = artist?.profilePhoto || artist?.photo || '';
  const inner = {
    width: '100%', height: '100%', borderRadius: '50%', boxSizing: 'border-box',
    background: photo ? `url('${photo.replace(/'/g, "\\'")}') center/cover, ${V2C.chip}` : `linear-gradient(135deg, ${V2C.pink}, ${V2C.purple})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: V2C.bg, fontWeight: 800, fontSize: size * 0.38,
    border: ring ? `2px solid ${V2C.bg}` : 'none',
  };
  return (
    <span style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', padding: ring ? 2 : 0, boxSizing: 'border-box', background: ring || 'transparent', display: 'flex' }}>
      <span style={inner}>{photo ? '' : (artist?.name || '?')[0]}</span>
    </span>
  );
}

function V2Cover({ v, radius = 16, height, aspect = '16 / 9', children }) {
  const src = v?.thumb?.src;
  return (
    <span style={{ position: 'relative', display: 'block', width: '100%', height, aspectRatio: height ? undefined : aspect, borderRadius: radius, overflow: 'hidden', background: src ? V2C.surface : (v?.thumb?.bg || V2C.surface) }}>
      {src && <V2Img src={src} />}
      {children}
    </span>
  );
}

function V2Duration({ text }) {
  if (!text) return null;
  return <span style={{ position: 'absolute', right: 8, bottom: 8, height: 20, padding: '0 6px', borderRadius: 5, background: 'rgba(14,14,15,0.82)', color: V2C.text, fontSize: 12, fontWeight: 600, lineHeight: '20px' }}>{text}</span>;
}

function V2SectionHead({ title, icon, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
      {icon}
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: V2C.text }}>{title}</h2>
      <span style={{ flex: 1 }} />
      {action && <button type="button" onClick={onAction} style={{ padding: '6px 0', border: 'none', background: 'transparent', color: V2C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{action}</button>}
    </div>
  );
}

const v2Tag = (v) => String(v?.raw?.tags || '').split(',').map(t => t.trim()).find(t => t && !['shorts', 'free', 'vod', 'ytbackup'].includes(t.toLowerCase())) || '';
const v2Label = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
const v2Num = (n) => (Number(n) || 0).toLocaleString('en-US');
const v2CoverSlug = (label) => {
  const slug = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return V2_COVERS.has(slug) ? slug : 'triggers';
};

function useV2ArtistIndex() {
  const state = window.useArtists();
  return React.useMemo(() => {
    const map = new Map();
    for (const a of state.data || []) map.set(a.name, a);
    return map;
  }, [state.data]);
}

function useV2EditorPicks() {
  // app.jsx starts this fetch while v2.jsx is still downloading.
  return window.useFetch('v2_editor_picks', window.fetchEditorPicks, [], []);
}

function v2OpenVideo(nav, v, extra = {}) {
  nav.gate(() => nav.go('video', { id: v.id, video: v, ...extra }));
}

// Editor's picks are free: without a subscription they play as a queue of
// the picks only (the bot's /content/play allows exactly these ids).
function v2OpenPick(nav, v, picks) {
  if (nav.isPro) return nav.go('video', { id: v.id, video: v });
  const queueIdx = picks.findIndex(p => String(p.id) === String(v.id));
  nav.go('video', { id: v.id, video: v, queue: picks, queueIdx, free: true });
}

// ── Floating bottom bar ─────────────────────────────────────────
// Every screen renders its own bar (the Shorts tab keeps a hidden one
// mounted), so the highlight remembers where the visible bar left it
// and glides from there to the new tab.
let v2NavLast = null;
const V2_FLOW = 'transform 0.46s cubic-bezier(0.34, 1.25, 0.64, 1), width 0.46s cubic-bezier(0.34, 1.25, 0.64, 1), height 0.3s ease, opacity 0.25s ease';

function useV2NavPill(navRef, pillRef, current) {
  const state = React.useRef({ placed: null, shown: false });
  const place = (pill, p) => {
    pill.style.width = `${p.w}px`;
    pill.style.height = `${p.h}px`;
    pill.style.transform = `translate(${p.x}px, -50%)`;
    pill.style.opacity = '1';
  };
  React.useLayoutEffect(() => {
    const bar = navRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const st = state.current;
    const shown = getComputedStyle(bar).visibility !== 'hidden';
    const justShown = shown && !st.shown;
    st.shown = shown;
    const button = bar.querySelector(`[data-v2-tab="${current}"]`);
    if (!button || !button.offsetWidth) {
      pill.style.transition = V2_FLOW;
      pill.style.opacity = '0';
      st.placed = null;
      return;
    }
    const target = { x: button.offsetLeft, w: button.offsetWidth, h: button.offsetHeight };
    const same = (a, b) => a && a.x === b.x && a.w === b.w && a.h === b.h;
    const from = (justShown || !st.placed) ? (v2NavLast || st.placed || target) : st.placed;
    if (!(st.placed && !justShown && same(st.placed, target))) {
      pill.style.transition = 'none';
      place(pill, from);
      if (!same(from, target)) {
        pill.getBoundingClientRect(); // commit the start position before animating
        pill.style.transition = V2_FLOW;
        place(pill, target);
      }
      st.placed = target;
    }
    if (shown) v2NavLast = target;
  });
  // A rotated or resized phone moves the buttons; snap the pill to them.
  React.useEffect(() => {
    const onResize = () => {
      const pill = pillRef.current;
      const button = navRef.current?.querySelector(`[data-v2-tab="${current}"]`);
      if (!pill || !button) return;
      const target = { x: button.offsetLeft, w: button.offsetWidth, h: button.offsetHeight };
      pill.style.transition = 'none';
      place(pill, target);
      state.current.placed = target;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [current]);
}

function V2BottomNav({ active }) {
  const nav = window.useNav();
  const tab = active != null ? active : nav.activeTab;
  const user = nav.user || {};
  const onCenter = tab === '' && (nav.screen === 'profile' || nav.screen === 'subscription');
  const current = onCenter ? 'center' : tab;
  const tier = String(user.tier || '').toLowerCase();
  const ring = user.isGrace ? '#FF9800' : ((window.TIER_COLORS || {})[tier] || V2C.lime);
  const navRef = React.useRef(null);
  const pillRef = React.useRef(null);
  useV2NavPill(navRef, pillRef, current);
  const item = (id, label, icon) => {
    const on = tab === id;
    return (
      <button key={id} type="button" data-v2-tab={id} aria-label={label} aria-current={on ? 'page' : undefined} onClick={() => nav.onTab(id)} style={{
        position: 'relative', zIndex: 1, width: 56, height: 48, padding: 0, border: 'none', borderRadius: 24, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: V2C.text,
      }}><span className={`v2-tab-icon${on ? ' on' : ''}`}>{icon(on)}</span></button>
    );
  };
  return (
    <React.Fragment>
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `calc(${nav.videoMinimized ? 200 : 118}px + ${V2_SAFE_BOTTOM})`, background: 'linear-gradient(rgba(14,14,15,0), #0E0E0F 72%)', pointerEvents: 'none', zIndex: 29, transition: 'height 0.3s ease' }} />
      <nav ref={navRef} data-bottom-nav aria-label="Main" style={{
        position: 'absolute', left: 14, right: 14, bottom: `calc(14px + ${V2_SAFE_BOTTOM})`, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 8px', boxSizing: 'border-box',
        borderRadius: 32, background: 'rgba(33,33,35,0.94)', border: `1px solid ${V2C.line}`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}>
        <span ref={pillRef} aria-hidden="true" style={{ position: 'absolute', left: 0, top: '50%', width: 0, height: 0, opacity: 0, borderRadius: 999, background: 'rgba(255,255,255,0.14)', pointerEvents: 'none' }} />
        {item('home', 'Home', V2I.home)}
        {item('shorts', 'Shorts', V2I.shorts)}
        {nav.isPro
          ? <button type="button" data-v2-tab="center" aria-label="Profile" aria-current={onCenter ? 'page' : undefined} onClick={() => nav.onTab('center')} style={{
              position: 'relative', zIndex: 1, width: 60, height: 56, padding: 0, border: 'none', borderRadius: 28, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent',
            }}>
              <span className={`v2-tab-icon${onCenter ? ' on' : ''}`} style={{ borderRadius: '50%', boxShadow: onCenter ? `0 0 16px ${ring}77` : 'none', transition: 'box-shadow 0.3s ease' }}>
                <V2Avatar artist={{ name: user.name, photo: user.photo }} size={44} ring={ring} />
              </span>
            </button>
          : <button type="button" className="v2-chip" onClick={() => nav.onTab('center')} style={{
              position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 6, height: 46, padding: '0 16px', border: 'none', borderRadius: 23, cursor: 'pointer',
              background: `linear-gradient(135deg, ${V2C.pink}, ${V2C.purple})`, color: V2C.bg,
              fontSize: 14, fontWeight: 800, letterSpacing: 0.4, whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(255,126,200,0.4)',
            }}>{V2I.crown}GET PRO</button>}
        {item('artists', 'Artists', V2I.artists)}
        {item('favorites', 'Saved', V2I.saved)}
      </nav>
    </React.Fragment>
  );
}

// ── Home ────────────────────────────────────────────────────────
function V2VideoCard({ v, artist, pick, onOpen, onArtist, style }) {
  const tag = v2Tag(v);
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 12px', ...style }}>
      <button type="button" className="v2-press" onClick={onOpen} aria-label={`Play ${v.title}`} style={{ display: 'block', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
        <V2Cover v={v} radius={16}>
          {pick && <span style={{ position: 'absolute', left: 12, top: 12, height: 24, padding: '0 11px', borderRadius: 999, background: V2C.lime, color: V2C.bg, fontSize: 11, fontWeight: 800, letterSpacing: 1.4, lineHeight: '24px', boxShadow: '0 4px 14px rgba(200,255,68,0.35)' }}>FREE</span>}
          {pick && pick.total > 1 && <span style={{ position: 'absolute', right: 12, top: 12, height: 24, padding: '0 9px', borderRadius: 999, background: 'rgba(14,14,15,0.72)', color: V2C.text, fontSize: 12, fontWeight: 600, lineHeight: '24px' }}>{pick.index + 1}/{pick.total}</span>}
          <V2Duration text={v.duration} />
        </V2Cover>
      </button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <button type="button" onClick={onArtist} aria-label={`Open ${v.artist?.name}`} style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <V2Avatar artist={artist || v.artist} size={38} />
        </button>
        <button type="button" onClick={onOpen} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: 0, border: 'none', background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
          <span className="v2-clamp2" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</span>
          <span style={{ fontSize: 13, color: V2C.muted }}>{[v.artist?.name, v2Label(tag), v.age].filter(Boolean).join(' · ')}</span>
        </button>
      </div>
    </article>
  );
}

// Today's three Editor's picks, free for everyone, as a swipeable carousel.
function V2PickCarousel({ picks, artistIndex }) {
  const nav = window.useNav();
  const [index, setIndex] = React.useState(0);
  const many = picks.length > 1;
  return (
    <section aria-label="Free picks" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="v2-row v2-snap" onScroll={e => {
        const el = e.currentTarget;
        const w = el.firstChild?.getBoundingClientRect().width || 1;
        setIndex(Math.min(picks.length - 1, Math.round(el.scrollLeft / (w + 10))));
      }} style={{ gap: 10, padding: '0 12px', scrollPaddingLeft: 12 }}>
        {picks.map((v, i) => (
          <V2VideoCard key={v.id} v={v} artist={artistIndex.get(v.artist?.name)} pick={{ index: i, total: picks.length }}
            style={{ flexShrink: 0, width: many ? 'calc(100% - 34px)' : '100%', padding: 0 }}
            onOpen={() => v2OpenPick(nav, v, picks)} onArtist={() => nav.go('artist', { id: v.artist?.id })} />
        ))}
      </div>
      {many && (
        <span aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
          {picks.map((_, i) => <span key={i} style={{ width: i === index ? 16 : 4, height: 4, borderRadius: 2, background: i === index ? V2C.lime : 'rgba(241,241,241,0.35)', transition: 'width 0.2s' }} />)}
        </span>
      )}
    </section>
  );
}

function V2StatsSlider({ accent }) {
  const nav = window.useNav();
  const stats = window.useStats().data || {};
  const user = nav.user || {};
  const [index, setIndex] = React.useState(0);
  const [name, setName] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const trial = !user.isPro && !user.trialUsed;
  const [trialBusy, setTrialBusy] = React.useState(false);
  const startTrial = async () => {
    if (trialBusy) return;
    setTrialBusy(true);
    try {
      const r = await window.actionStartFreeTrial();
      if (r?.ok) {
        if (r.invite_link) nav.openInvite?.(r.invite_link);
        // Fresh tier, days and link: refetch so the header and bar update now.
        window.invalidate?.('user');
        window.invalidate?.('my_invite');
        return;
      }
      if (r?.reason === 'trial-used') alert("You've already used your free trial.");
      else if (r?.reason === 'no-tg') alert('Open from Telegram to activate trial');
      else alert(r?.message || 'Could not activate trial. Try again.');
    } finally {
      setTrialBusy(false);
    }
  };
  const send = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const r = await window.actionSuggestArtist(trimmed);
    setBusy(false);
    if (r?.ok) { setSent(true); setName(''); } else alert(r?.message || 'Could not send. Try again.');
  };
  const slide = { flexShrink: 0, width: 'calc(100% - 40px)', boxSizing: 'border-box', borderRadius: 16, background: V2C.surface };
  const stat = (value, label, edge) => (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderLeft: edge ? `1px solid ${V2C.line}` : 'none' }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 0.5, lineHeight: 1, color: V2C.lime }}>{v2Num(value)}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: V2C.soft }}>{label}</span>
    </span>
  );
  const slides = [
    <div key="stats" style={{ ...slide, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', padding: '16px 6px', background: `radial-gradient(120% 140% at 0% 0%, rgba(200,255,68,0.16), rgba(200,255,68,0) 60%), ${V2C.surface}`, border: '1px solid rgba(200,255,68,0.35)' }}>
      {stat(stats.photos, 'PHOTOS')}{stat(stats.videos, 'VIDEOS', true)}{stat(stats.artists, 'ARTISTS', true)}
    </div>,
    <div key="suggest" style={{ ...slide, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1px solid ${accent}59` }}>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: V2C.text }}>{sent ? 'Thanks, we got it' : 'Missing an artist?'}</span>
        {sent
          ? <span style={{ fontSize: 12, color: V2C.muted }}>We'll take a look.</span>
          : <input value={name} onChange={e => setName(e.target.value)} placeholder="Tell us who to add" aria-label="Artist name"
              style={{ width: '100%', padding: 0, border: 'none', outline: 'none', background: 'transparent', color: V2C.text, fontSize: 13, fontFamily: 'inherit' }} />}
      </span>
      {!sent && <button type="button" onClick={send} disabled={busy || !name.trim()} style={{
        height: 36, padding: '0 14px', border: 'none', borderRadius: 999, cursor: name.trim() ? 'pointer' : 'default',
        background: name.trim() ? accent : V2C.chip, color: name.trim() ? V2C.bg : V2C.muted, fontSize: 13, fontWeight: 700,
      }}>{busy ? '…' : 'Suggest'}</button>}
    </div>,
  ];
  // Anyone who can still claim the trial sees it first: trial, numbers, suggest.
  if (trial) {
    slides.unshift(
      <div key="trial" style={{ ...slide, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 14px 16px', border: '1px solid rgba(255,126,200,0.45)', background: `radial-gradient(120% 140% at 0% 0%, rgba(255,126,200,0.22), rgba(255,126,200,0) 60%), ${V2C.surface}` }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: V2C.pink }}>LIMITED OFFER</span>
            <span style={{ padding: '1px 5px', borderRadius: 4, background: V2C.lime, color: V2C.bg, fontSize: 9, fontWeight: 800, letterSpacing: 0.4 }}>NEW</span>
          </span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, lineHeight: 1, letterSpacing: 0.6, color: V2C.text }}>Try <span style={{ color: V2C.lime }}>5 days free</span></span>
          <span style={{ fontSize: 11.5, color: V2C.soft }}>Full library access · no card required</span>
        </span>
        <button type="button" className="v2-follow" onClick={startTrial} disabled={trialBusy} style={{
          flexShrink: 0, height: 38, padding: '0 16px', border: 'none', borderRadius: 999, cursor: trialBusy ? 'default' : 'pointer',
          background: V2C.lime, color: V2C.bg, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', opacity: trialBusy ? 0.65 : 1,
        }}>{trialBusy ? '…' : 'Get it →'}</button>
      </div>,
    );
  }
  return (
    <section aria-label="ASMR.LEAKS in numbers" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="v2-row v2-snap" onScroll={e => {
        const el = e.currentTarget;
        const w = el.firstChild?.getBoundingClientRect().width || 1;
        setIndex(Math.min(slides.length - 1, Math.round(el.scrollLeft / (w + 10))));
      }} style={{ gap: 10, padding: '0 12px', scrollPaddingLeft: 12 }}>{slides}</div>
      <span aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
        {slides.map((_, i) => <span key={i} style={{ width: i === index ? 16 : 4, height: 4, borderRadius: 2, background: i === index ? V2C.lime : 'rgba(241,241,241,0.35)', transition: 'width 0.2s' }} />)}
      </span>
    </section>
  );
}

function V2ShortsShelf({ items, start, all, accent }) {
  const nav = window.useNav();
  if (!items.length) return null;
  return (
    <section aria-label="Shorts" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <V2SectionHead title="Shorts" icon={V2I.shortsMark(accent)} action="See all" onAction={() => nav.onTab('shorts')} />
      <div className="v2-row" style={{ gap: 8, padding: '0 12px' }}>
        {items.map((s, i) => (
          <button key={s.id || i} type="button" className="v2-press" onClick={() => nav.openShorts(all, start + i)} style={{
            position: 'relative', flexShrink: 0, width: 150, height: 266, padding: 0, border: 'none', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
            background: s.thumb?.src ? V2C.surface : (s.thumb?.bg || V2C.surface), color: V2C.text, textAlign: 'left',
          }}>
            {s.thumb?.src && <V2Img src={s.thumb.src} />}
            {(s.label || s.artist?.name) && <span className="v2-clamp2" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '40px 10px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{s.label || s.artist?.name}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

function V2TriggersShelf({ tags, total }) {
  const nav = window.useNav();
  if (!tags.length) return null;
  return (
    <section aria-label="Triggers" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <V2SectionHead title="Triggers" action={total ? `All ${total}` : ''} onAction={() => nav.go('search')} />
      <div className="v2-row" style={{ gap: 10, padding: '0 12px' }}>
        {tags.map(t => (
          <button key={t.id} type="button" className="v2-press" onClick={() => nav.go('search', { q: t.label, mode: 'tag' })} style={{
            position: 'relative', flexShrink: 0, width: 132, height: 165, padding: 0, border: 'none', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', background: V2C.surface, color: V2C.text, textAlign: 'left',
          }}>
            <V2Img src={`${V2_SITE}/category-covers/${v2CoverSlug(t.label)}.webp`} />
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '34px 10px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.88))' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 0.8, lineHeight: 1 }}>{v2Label(t.label)}</span>
              {t.count > 0 && <span style={{ fontSize: 11, color: V2C.soft }}>{v2Num(t.count)} videos</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function V2Home({ accent = V2C.pink }) {
  const nav = window.useNav();
  const page = nav.homeVideos || { items: [], hasMore: false, loading: false, loadMore: () => {} };
  const picksState = useV2EditorPicks();
  const picks = picksState.data || [];
  const shorts = window.usePaginatedShorts(window.SHORTS_PAGE_SIZE, { enabled: true });
  const tags = window.useTags().data || [];
  const artistIndex = useV2ArtistIndex();
  const [cycles, setCycles] = React.useState(2);
  const scrollRef = React.useRef(null);
  const sentinelRef = React.useRef(null);

  const pickIds = React.useMemo(() => new Set(picks.map(p => String(p.id))), [picks]);
  const pool = React.useMemo(() => page.items.filter(v => !pickIds.has(String(v.id))), [page.items, pickIds]);
  const PER_CYCLE = 4; // one big card + three videos
  const SHORTS_PER_CYCLE = 8;
  const TAGS_SHOWN = 8;

  // Keep the feed endless: add a cycle when the sentinel shows, fetching more videos first if needed.
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      setCycles(c => c + 1);
    }, { root: scrollRef.current, rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  React.useEffect(() => {
    if (pool.length < (cycles + 1) * PER_CYCLE && page.hasMore && !page.loading) page.loadMore();
    if (shorts.items.length < (cycles + 1) * SHORTS_PER_CYCLE && shorts.hasMore && !shorts.loading) shorts.loadMore();
  }, [cycles, pool.length, page.hasMore, page.loading, shorts.items.length, shorts.hasMore, shorts.loading]);

  // Hold the loading screen until the top of Home has its data and first
  // pictures: the pick (or first video) cover and the first shorts.
  const homeReadyRef = React.useRef(false);
  const shortsSettled = shorts.items.length > 0 || !!shorts.error || (!shorts.loading && !shorts.hasMore);
  const topCover = (picks[0] || pool[0])?.thumb?.src;
  const topShorts = shorts.items.slice(0, 3).map(s => s.thumb?.src).join('|');
  React.useEffect(() => {
    if (homeReadyRef.current || picksState.loading || !shortsSettled || !(picks.length || pool.length)) return;
    homeReadyRef.current = true;
    const load = (src) => new Promise(done => {
      if (!src) return done();
      const img = new Image();
      img.onload = img.onerror = () => done();
      img.src = src;
    });
    Promise.all([topCover, ...topShorts.split('|')].map(load)).then(() => nav.markHomeReady?.());
  }, [picksState.loading, shortsSettled, picks.length, pool.length, topCover, topShorts]);

  const blocks = [];
  let cursor = 0;
  for (let k = 0; k < cycles; k += 1) {
    if (k === 0 && picks.length) {
      blocks.push(<V2PickCarousel key="picks" picks={picks} artistIndex={artistIndex} />);
    } else {
      const hero = pool[cursor++];
      if (!hero) break;
      blocks.push(<V2VideoCard key={`hero-${k}-${hero.id}`} v={hero} artist={artistIndex.get(hero.artist?.name)}
        onOpen={() => v2OpenVideo(nav, hero)} onArtist={() => nav.go('artist', { id: hero.artist?.id })} />);
    }
    if (k === 0) blocks.push(<V2StatsSlider key="stats" accent={accent} />);
    const shortStart = k * SHORTS_PER_CYCLE;
    const shortSlice = shorts.items.slice(shortStart, shortStart + SHORTS_PER_CYCLE);
    if (shortSlice.length) blocks.push(<V2ShortsShelf key={`shorts-${k}`} items={shortSlice} start={shortStart} all={shorts.items} accent={accent} />);
    for (const v of pool.slice(cursor, cursor + 3)) {
      blocks.push(<V2VideoCard key={`v-${k}-${v.id}`} v={v} artist={artistIndex.get(v.artist?.name)}
        onOpen={() => v2OpenVideo(nav, v)} onArtist={() => nav.go('artist', { id: v.artist?.id })} />);
    }
    cursor += 3;
    // Triggers appear once, fourth in the first cycle; later cycles repeat pick, shorts, videos.
    if (k === 0 && tags.length) blocks.push(<V2TriggersShelf key="tags" tags={tags.slice(0, TAGS_SHOWN)} total={tags.length} />);
  }

  const chips = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New', dot: true },
    { id: 'following', label: 'Following' },
    ...tags.slice(0, 6).map(t => ({ id: `tag:${t.id}`, label: v2Label(t.label), tag: t })),
  ];
  const onChip = (it) => {
    if (it.id === 'new') nav.go('search', { mode: 'newest' });
    else if (it.id === 'following') nav.go('followed-feed');
    else if (it.tag) nav.go('search', { q: it.tag.label, mode: 'tag' });
  };

  return (
    <Phone>
      <V2Header accent={accent} />
      <div ref={scrollRef} className="v2-scroll" style={{ paddingBottom: nav.videoMinimized ? `calc(196px + ${V2_SAFE_BOTTOM})` : V2_NAV_SPACE }}>
        <V2Chips items={chips} value="all" onPick={onChip}
          leading={<button type="button" aria-label="Browse everything" onClick={() => nav.go('search')} style={{ flexShrink: 0, width: 42, height: 34, border: 'none', borderRadius: 10, background: V2C.chip, color: V2C.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{V2I.compass}</button>} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {blocks.length ? blocks : [0, 1].map(i => (
            <div key={i} style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="v2-skel" style={{ aspectRatio: '16 / 9', borderRadius: 16 }} />
              <div className="v2-skel" style={{ height: 14, width: '70%', borderRadius: 7 }} />
            </div>
          ))}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
        {page.loading && blocks.length > 0 && <div style={{ padding: 20, textAlign: 'center', color: V2C.muted, fontSize: 13 }}>Loading more…</div>}
      </div>
      <V2BottomNav active="home" />
    </Phone>
  );
}

// ── Artists ─────────────────────────────────────────────────────
function V2FollowButton({ name, compact }) {
  const status = window.useFollowStatus(name);
  const [local, setLocal] = React.useState(null);
  const following = local != null ? local : status.following;
  const toggle = (e) => {
    e.stopPropagation();
    const next = !following;
    setLocal(next);
    window.actionFollow(name).then(r => {
      if (!r?.ok) setLocal(!next);
      else window.invalidate?.('follows');
    });
  };
  return (
    <button type="button" className="v2-follow" onClick={toggle} aria-pressed={following} style={{
      flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      height: compact ? 32 : 42, padding: compact ? '0 12px' : '0 18px', border: 'none', borderRadius: 999, cursor: 'pointer',
      background: following ? V2C.chip : V2C.text, color: following ? V2C.text : V2C.bg,
      fontSize: compact ? 12 : 15, fontWeight: following ? 600 : 700, flex: compact ? undefined : 1,
    }}>{!following && !compact && V2I.plus}{following ? 'Following' : 'Follow'}</button>
  );
}

function V2Artists({ accent = V2C.pink }) {
  const nav = window.useNav();
  const state = window.useArtists();
  const follows = window.useFollows().data || { names: new Set() };
  const [filter, setFilter] = React.useState(nav.params?.filter || 'popular');
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const all = state.data || [];
  const scrollRef = React.useRef(null);
  const sentinelRef = React.useRef(null);
  const [shown, setShown] = React.useState(V2_ARTISTS_PAGE);
  React.useEffect(() => { setShown(V2_ARTISTS_PAGE); }, [filter, query]);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) setShown(n => n + V2_ARTISTS_PAGE);
    }, { root: scrollRef.current, rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const list = React.useMemo(() => {
    let out = all.slice();
    const q = query.trim().toLowerCase();
    if (q) out = out.filter(a => a.name.toLowerCase().includes(q));
    if (filter === 'following') out = out.filter(a => follows.names?.has?.(a.name));
    if (filter === 'new') out = out.filter(a => a.fresh);
    if (filter === 'videos') out.sort((a, b) => (b.videos || 0) - (a.videos || 0));
    if (filter === 'az') out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [all, filter, query, follows.names]);
  const chips = [
    { id: 'popular', label: 'Popular' }, { id: 'following', label: 'Following' }, { id: 'new', label: 'New' },
    { id: 'videos', label: 'Most videos' }, { id: 'az', label: 'A–Z' },
  ];
  return (
    <Phone>
      <V2Header title="Artists" badge={all.length || null}>
        <button type="button" aria-label="Search artists" aria-expanded={searching} onClick={() => setSearching(s => !s)} style={v2IconBtn}>{V2I.search}</button>
      </V2Header>
      <div ref={scrollRef} className="v2-scroll" style={{ paddingBottom: V2_NAV_SPACE }}>
        {searching && (
          <div style={{ padding: '0 14px 12px' }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search artists" aria-label="Search artists" style={{
              width: '100%', height: 42, boxSizing: 'border-box', padding: '0 14px', borderRadius: 12, outline: 'none',
              border: `1px solid ${V2C.line2}`, background: V2C.surface, color: V2C.text, fontSize: 15, fontFamily: 'inherit',
            }} />
          </div>
        )}
        <V2Chips items={chips} value={filter} onPick={it => setFilter(it.id)} />
        {state.loading && !all.length && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 12px' }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="v2-skel" style={{ height: 214, borderRadius: 16 }} />)}
          </div>
        )}
        {!state.loading && !list.length && (
          <p style={{ padding: '32px 24px', margin: 0, textAlign: 'center', color: V2C.muted, fontSize: 14 }}>
            {filter === 'following' ? 'Follow artists to see them here.' : 'No artists found.'}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 10px', padding: '0 12px' }}>
          {list.slice(0, shown).map(a => {
            const photo = a.photo || a.profilePhoto;
            const meta = [a.videos ? `${a.videos} videos` : '', a.shorts ? `${a.shorts} shorts` : (a.photos ? `${v2Num(a.photos)} photos` : '')].filter(Boolean).join(' · ');
            return (
              <article key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <button type="button" className="v2-press" onClick={() => nav.go('artist', { id: a.id })} aria-label={`Open ${a.name}`} style={{
                  position: 'relative', display: 'block', height: 214, padding: 0, border: 'none', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                  background: photo ? V2C.surface : `linear-gradient(165deg, #6B3A55, #2A1A24)`,
                }}>
                  {photo && <V2Img src={photo} />}
                  <span style={{ position: 'absolute', left: 10, top: 10, display: 'flex', gap: 6 }}>
                    {a.fresh && <span style={{ height: 22, padding: '0 8px', borderRadius: 999, background: V2C.pink, color: V2C.bg, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, lineHeight: '22px' }}>NEW</span>}
                    {a.hot && <span style={{ height: 22, padding: '0 8px', borderRadius: 999, background: V2C.lime, color: V2C.bg, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, lineHeight: '22px' }}>HOT</span>}
                  </span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => nav.go('artist', { id: a.id })} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: 0, border: 'none', background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    <span style={{ fontSize: 12, color: V2C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</span>
                  </button>
                  <V2FollowButton name={a.name} compact />
                </div>
              </article>
            );
          })}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
      <V2BottomNav active="artists" />
    </Phone>
  );
}

// ── Artist page ─────────────────────────────────────────────────
function V2ArtistPage({ accent = V2C.pink }) {
  const nav = window.useNav();
  const all = window.useArtists().data || [];
  const a = all.find(x => x.id === nav.params?.id) || all.find(x => x.name === nav.params?.name) || all[0] || { id: '', name: '' };
  const [tab, setTab] = React.useState('videos');
  const [sort, setSort] = React.useState('latest');
  const [lightbox, setLightbox] = React.useState(null);
  const videos = window.useArtistContentList(a.name, 'video');
  const shorts = window.useArtistContentList(a.name, 'short');
  const photos = window.useArtistContentList(a.name, 'photo');
  const sortedVideos = React.useMemo(() => {
    const out = videos.items.slice();
    if (sort === 'popular') out.sort((x, y) => (Number(y.raw?.views) || 0) - (Number(x.raw?.views) || 0));
    if (sort === 'oldest') out.reverse();
    return out;
  }, [videos.items, sort]);
  const banner = a.photo || a.profilePhoto;
  const tabs = [
    { id: 'videos', label: 'Videos', count: a.videos },
    { id: 'shorts', label: 'Shorts', count: a.shorts },
    { id: 'photos', label: 'Photos', count: a.photos },
  ].filter(t => t.id === 'videos' || t.count);
  const shufflePlay = () => {
    const list = videos.items.slice().sort(() => Math.random() - 0.5);
    if (list.length) v2OpenVideo(nav, list[0], { queue: list, queueIdx: 0 });
  };
  const openTopic = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(a.topicUrl); else window.open(a.topicUrl, '_blank', 'noopener');
  };
  const loadMore = (list) => list.hasMore && (
    <div style={{ padding: '6px 16px 16px' }}>
      <button type="button" disabled={list.loading} onClick={list.loadMore} style={{ width: '100%', height: 44, border: `1px solid ${V2C.line2}`, borderRadius: 12, background: 'transparent', color: V2C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{list.loading ? 'Loading…' : 'Load more'}</button>
    </div>
  );
  return (
    <Phone>
      <div className="v2-scroll v2-push" style={{ paddingBottom: V2_NAV_SPACE }}>
        <div style={{ position: 'relative', height: 150, background: banner ? V2C.surface : 'linear-gradient(135deg, #6B3A55, #171117)', overflow: 'hidden' }}>
          {banner && <V2Img src={banner} style={{ filter: 'blur(2px) brightness(0.7)', transform: 'scale(1.05)' }} />}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(14,14,15,0) 40%, rgba(14,14,15,0.85))' }} />
        </div>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
          <div style={{ position: 'relative', zIndex: 1, marginTop: -42 }}><V2Avatar artist={a} size={84} ring={accent} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1.1, color: V2C.text }}>{a.name}</h1>
            <span style={{ fontSize: 13, color: V2C.muted }}>{a.handle}</span>
            <span style={{ fontSize: 13, color: V2C.soft }}>
              <strong style={{ color: V2C.text }}>{v2Num(a.videos)}</strong> videos · <strong style={{ color: V2C.text }}>{v2Num(a.photos)}</strong> photos{a.shorts ? <> · <strong style={{ color: V2C.text }}>{v2Num(a.shorts)}</strong> shorts</> : null}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <V2FollowButton name={a.name} />
            <button type="button" aria-label="Play shuffled" onClick={shufflePlay} disabled={!videos.items.length} style={{ width: 42, height: 42, border: 'none', borderRadius: '50%', background: V2C.chip, color: V2C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{V2I.shuffle}</button>
            {a.topicUrl && <button type="button" aria-label="Open in Telegram" onClick={openTopic} style={{ width: 42, height: 42, border: 'none', borderRadius: '50%', background: 'rgba(42,171,238,0.18)', color: '#2AABEE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{V2I.telegram}</button>}
          </div>
        </section>
        <nav aria-label={`${a.name} content`} style={{ display: 'flex', marginTop: 14, padding: '0 8px', borderBottom: `1px solid ${V2C.line2}` }}>
          {tabs.map(t => (
            <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)} style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 6, height: 46, padding: '0 12px', border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t.id ? V2C.text : V2C.muted, fontSize: 15, fontWeight: tab === t.id ? 700 : 600,
            }}>{t.label}<span style={{ fontSize: 12, color: V2C.muted }}>{v2Num(t.count)}</span>
              {tab === t.id && <span style={{ position: 'absolute', left: 12, right: 12, bottom: -1, height: 2, borderRadius: 2, background: V2C.text }} />}
            </button>
          ))}
        </nav>
        {tab === 'videos' && (
          <React.Fragment>
            <div className="v2-row" style={{ gap: 8, padding: '12px 16px' }}>
              {[['latest', 'Latest'], ['popular', 'Popular'], ['oldest', 'Oldest']].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)} style={{ flexShrink: 0, height: 32, padding: '0 12px', border: 'none', borderRadius: 8, cursor: 'pointer', background: sort === id ? V2C.text : V2C.chip, color: sort === id ? V2C.bg : V2C.text, fontSize: 13, fontWeight: sort === id ? 600 : 500 }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
              {sortedVideos.map((v, i) => (
                <button key={v.id || i} type="button" className="v2-press" onClick={() => v2OpenVideo(nav, v, { queue: sortedVideos, queueIdx: i })} style={{ display: 'flex', gap: 12, padding: 0, border: 'none', background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ flexShrink: 0, width: 160 }}><V2Cover v={v} radius={10}><V2Duration text={v.duration} /></V2Cover></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span className="v2-clamp2" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</span>
                    <span style={{ fontSize: 12, color: V2C.muted }}>{[v2Label(v2Tag(v)), v.age].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              ))}
              {videos.loading && !videos.items.length && [0, 1, 2].map(i => <div key={i} className="v2-skel" style={{ height: 90, borderRadius: 10 }} />)}
            </div>
            {loadMore(videos)}
          </React.Fragment>
        )}
        {tab === 'shorts' && (
          <React.Fragment>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '12px 12px 0' }}>
              {shorts.items.map((s, i) => (
                <button key={s.id || i} type="button" onClick={() => nav.openShorts(shorts.items, i)} style={{ position: 'relative', aspectRatio: '9 / 16', padding: 0, border: 'none', borderRadius: 10, overflow: 'hidden', background: V2C.surface, cursor: 'pointer' }}>
                  {s.thumb?.src && <V2Img src={s.thumb.src} />}
                </button>
              ))}
            </div>
            {loadMore(shorts)}
          </React.Fragment>
        )}
        {tab === 'photos' && (
          <React.Fragment>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '12px 12px 0' }}>
              {photos.items.map((p, i) => (
                <button key={p.id || i} type="button" onClick={() => (nav.isPro ? setLightbox(i) : nav.openPaywall())} style={{ position: 'relative', aspectRatio: '1', padding: 0, border: 'none', borderRadius: 8, overflow: 'hidden', background: V2C.surface, cursor: 'pointer' }}>
                  {p.thumb?.src && <V2Img src={p.thumb.src} style={{ filter: nav.isPro ? 'none' : 'blur(10px)' }} />}
                </button>
              ))}
            </div>
            {loadMore(photos)}
          </React.Fragment>
        )}
      </div>
      {lightbox != null && <window.PhotoLightbox photos={photos.items} index={lightbox} onNav={setLightbox} onClose={() => setLightbox(null)} />}
      <V2BottomNav active="artists" />
    </Phone>
  );
}

// ── Saved ───────────────────────────────────────────────────────
function V2Saved({ accent = V2C.pink, initialTab = 'all' }) {
  const nav = window.useNav();
  const [tab, setTab] = React.useState(initialTab === 'videos' ? 'all' : initialTab);
  const playlistsState = window.useUserPlaylists();
  const favsState = window.useFavorites();
  const playlists = playlistsState.data?.playlists || [];
  const favs = favsState.data || { videos: [] };
  const liked = favs.videos || [];
  const playlistsLoading = playlistsState.loading && !playlists.length;
  const likedLoading = favsState.loading && !liked.length;
  const chips = [
    { id: 'all', label: 'All' }, { id: 'videos', label: 'Videos' }, { id: 'shorts', label: 'Shorts' },
    { id: 'playlists', label: 'Playlists' }, { id: 'photos', label: 'Photos' },
  ];
  const playAll = () => liked.length && v2OpenVideo(nav, liked[0], { queue: liked, queueIdx: 0 });
  return (
    <Phone>
      <V2Header title="Saved" />
      <div className="v2-scroll" style={{ paddingBottom: V2_NAV_SPACE }}>
        <V2Chips items={chips} value={tab} onPick={it => setTab(it.id)} />
        {tab === 'videos' && <LikedVideos accent={accent} />}
        {tab === 'shorts' && <LikedShorts accent={accent} />}
        {tab === 'playlists' && <VideoPlaylists accent={accent} />}
        {tab === 'photos' && <LikedPhotos accent={accent} />}
        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <section aria-label="Playlists" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <V2SectionHead title="Playlists" action={playlists.length ? 'See all' : ''} onAction={() => setTab('playlists')} />
              <div className="v2-row" style={{ gap: 12, padding: '0 16px' }}>
                {playlistsLoading && [0, 1].map(i => (
                  <span key={`sk-${i}`} aria-hidden="true" style={{ flexShrink: 0, width: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="v2-skel" style={{ height: 92, marginTop: 8, borderRadius: 10 }} />
                    <span className="v2-skel" style={{ height: 14, width: '70%', borderRadius: 7 }} />
                  </span>
                ))}
                {playlists.map(p => (
                  <button key={p.id} type="button" className="v2-press" onClick={() => nav.go('playlist', { id: p.id, name: p.name })} style={{ flexShrink: 0, width: 160, display: 'flex', flexDirection: 'column', gap: 8, padding: 0, border: 'none', background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ position: 'relative', display: 'block', height: 100 }}>
                      <span style={{ position: 'absolute', left: 14, right: 14, top: 0, height: 6, borderRadius: '6px 6px 0 0', background: '#3A3A3C' }} />
                      <span style={{ position: 'absolute', left: 7, right: 7, top: 4, height: 6, borderRadius: '6px 6px 0 0', background: '#545457' }} />
                      <span style={{ position: 'absolute', left: 0, right: 0, top: 8, bottom: 0, borderRadius: 10, overflow: 'hidden', background: p.thumbs?.[0] ? `url('${p.thumbs[0]}') center/cover` : 'linear-gradient(140deg, #4A2A3D, #141216)' }}>
                        <span style={{ position: 'absolute', right: 6, bottom: 6, display: 'flex', alignItems: 'center', gap: 4, height: 20, padding: '0 6px', borderRadius: 5, background: 'rgba(14,14,15,0.82)', fontSize: 11, fontWeight: 600 }}>{V2I.list}{p.item_count || 0}</span>
                      </span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setTab('playlists')} style={{ flexShrink: 0, width: 160, height: 92, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px dashed ${V2C.line2}`, borderRadius: 10, background: 'transparent', color: V2C.soft, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {V2I.plus}New playlist
                </button>
              </div>
            </section>
            <section aria-label="Liked videos" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: V2C.text }}>Liked videos</h2>
                <span style={{ flex: 1 }} />
                {liked.length > 0 && <button type="button" onClick={playAll} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', border: 'none', borderRadius: 999, background: V2C.text, color: V2C.bg, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{V2I.play}Play all</button>}
              </div>
              {likedLoading && (
                <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ display: 'flex', gap: 12 }}>
                      <span className="v2-skel" style={{ flexShrink: 0, width: 152, aspectRatio: '16 / 9', borderRadius: 10 }} />
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}>
                        <span className="v2-skel" style={{ height: 13, width: '90%', borderRadius: 6 }} />
                        <span className="v2-skel" style={{ height: 13, width: '60%', borderRadius: 6 }} />
                        <span className="v2-skel" style={{ height: 11, width: '40%', borderRadius: 6 }} />
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {!liked.length && !likedLoading && <p style={{ margin: 0, padding: '8px 16px', color: V2C.muted, fontSize: 14 }}>Tap Save on any video to keep it here.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
                {liked.slice(0, 20).map((v, i) => (
                  <button key={v.id || i} type="button" className="v2-press" onClick={() => v2OpenVideo(nav, v, { queue: liked, queueIdx: i })} style={{ display: 'flex', gap: 12, padding: 0, border: 'none', background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ flexShrink: 0, width: 152 }}><V2Cover v={v} radius={10}><V2Duration text={v.duration} /></V2Cover></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span className="v2-clamp2" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</span>
                      <span style={{ fontSize: 12, color: V2C.muted }}>{v.artist?.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      <V2BottomNav active="favorites" />
    </Phone>
  );
}

// ── Profile (centre of the bar) ─────────────────────────────────
function V2Profile({ accent = V2C.pink }) {
  const nav = window.useNav();
  const user = nav.user || {};
  const follows = window.useFollows().data || { artists: [] };
  const playlists = window.useUserPlaylists().data?.playlists || [];
  const history = window.useFetch('v2_history', async () => {
    const initData = window.getInitData();
    if (!initData) return [];
    const data = await window.apiPost('/miniapp/continue_watching', { initData });
    return (data.items || []).map((it, i) => ({ ...window.normalizeVideo(it, i), progress: it.duration ? it.progress / it.duration : 0 }));
  }, [], []).data || [];
  const [notify, setNotify] = React.useState(user.raw?.notify_expiry !== false);
  const [links, setLinks] = React.useState(false);
  const tier = String(user.tier || '').toLowerCase();
  const ring = user.isGrace ? '#FF9800' : ((window.TIER_COLORS || {})[tier] || V2C.lime);
  const status = user.isGrace ? `Grace · ${user.graceDaysLeft} days to renew`
    : !user.isPro ? 'No active subscription'
    : user.isInfinite ? 'Lifetime access' : `${user.daysLeft} days left`;
  const toggleNotify = async () => {
    const next = !notify;
    setNotify(next);
    const r = await window.actionSetNotifyExpiry?.(next);
    if (r && r.ok === false) setNotify(!next);
  };
  const row = (icon, label, value, onClick, extra) => (
    <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 52, padding: '0 8px', border: 'none', borderRadius: 12, background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
      <span style={{ display: 'flex', color: V2C.text }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{label}</span>
      {value != null && <span style={{ fontSize: 13, color: V2C.muted }}>{value}</span>}
      {extra}
    </button>
  );
  return (
    <Phone>
      <V2Header title="Profile" />
      <div className="v2-scroll" style={{ paddingBottom: V2_NAV_SPACE }}>
        <section aria-label="Your account" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '6px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <V2Avatar artist={{ name: user.name, photo: user.photo }} size={76} ring={ring} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: V2C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'You'}</span>
              {user.username && <span style={{ fontSize: 13, color: V2C.muted }}>@{user.username} · Telegram</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.isPro && <span style={{ height: 22, padding: '0 8px', borderRadius: 6, background: ring, color: V2C.bg, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, lineHeight: '22px' }}>{(tier && tier !== 'free' ? tier : 'pro').toUpperCase()}</span>}
                <span style={{ fontSize: 13, color: V2C.soft }}>{status}</span>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => nav.go('subscription')} style={{ flex: 1, height: 40, border: 'none', borderRadius: 999, background: V2C.text, color: V2C.bg, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{user.isPro ? 'Subscription' : 'Get PRO'}</button>
            <button type="button" onClick={() => { window.invalidate?.('access_links'); setLinks(true); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, border: 'none', borderRadius: 999, background: V2C.chip, color: V2C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{V2I.link}My groups</button>
          </div>
        </section>
        {history.length > 0 && (
          <section aria-label="Continue watching" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
            <V2SectionHead title="Continue watching" />
            <div className="v2-row" style={{ gap: 10, padding: '0 16px' }}>
              {history.map((v, i) => (
                <button key={v.id || i} type="button" onClick={() => v2OpenVideo(nav, v)} style={{ flexShrink: 0, width: 160, display: 'flex', flexDirection: 'column', gap: 8, padding: 0, border: 'none', background: 'transparent', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
                  <V2Cover v={v} radius={10}>
                    <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.25)' }}><span style={{ display: 'block', width: `${Math.round((v.progress || 0) * 100)}%`, height: '100%', background: accent }} /></span>
                  </V2Cover>
                  <span className="v2-clamp2" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <section aria-label="Account" style={{ display: 'flex', flexDirection: 'column', padding: '16px 8px 0' }}>
          {row(V2I.star, 'Following', `${follows.artists?.length || 0} artists`, () => nav.reset('artists', { filter: 'following' }))}
          {row(V2I.playlists, 'Playlists', String(playlists.length), () => nav.reset('saved', { tab: 'playlists' }))}
          {row(V2I.clock, 'Remind me before it ends', null, toggleNotify,
            <span role="switch" aria-checked={notify} style={{ position: 'relative', width: 44, height: 26, borderRadius: 999, background: notify ? V2C.lime : 'rgba(255,255,255,0.18)', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 3, left: notify ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: notify ? V2C.bg : '#fff', transition: 'left 0.2s' }} />
            </span>)}
          {row(V2I.help, 'Help & FAQ', null, () => nav.go('faq'))}
        </section>
      </div>
      {links && <LinksPanel accent={accent} onClose={() => setLinks(false)} />}
      <V2BottomNav active="" />
    </Phone>
  );
}

// ── Plans and payment ───────────────────────────────────────────
const V2_TIERS = {
  plus: { name: 'ASMR PLUS', color: '#FF7EC8', line: 'Full video catalog · photos & playlists' },
  pro: { name: 'ASMR PRO', color: '#44C8FF', line: 'Everything in PLUS · stream VODs & backups', badge: 'MOST POPULAR' },
  elite: { name: 'LEAKS ELITE', color: '#FFC24B', line: 'ASMR + a page of your choice', tag: '2 PAGES' },
  king: { name: 'LEAKS KING', color: '#C86BFF', line: '4 private pages · 250+ artists', tag: 'ALL 4 PAGES' },
};

function V2Plans({ accent = V2C.pink }) {
  const nav = window.useNav();
  const user = window.useUser().data || {};
  const isInsideTg = !!(window.isInsideTelegram && window.isInsideTelegram());
  const stats = window.useStats().data || {};
  const [tier, setTier] = React.useState('plus');
  const [eliteTarget, setEliteTarget] = React.useState('privateleaks');
  const [method, setMethod] = React.useState(0); // 0 card, 1 stars, 2 sbp, 3 crypto
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState(false);
  const paying = React.useRef(false);
  const [promo, setPromo] = React.useState('');
  const [promoState, setPromoState] = React.useState('');
  const [promoMsg, setPromoMsg] = React.useState('');
  const [applied, setApplied] = React.useState(null);
  const noticeKey = `asmrleaks.checkout-notice.v1:${user.telegramId || 'guest'}`;
  const plan = TIER_PRICES[tier];
  const meta = V2_TIERS[tier];
  const bundleTarget = tier === 'elite' ? eliteTarget : tier === 'king' ? 'all' : '';

  // Same checkout flow as SubscriptionPage (pages.jsx), with the new layout.
  const applyPromo = async () => {
    const code = promo.trim().toUpperCase();
    if (!code) { setPromoState('bad'); setPromoMsg('Enter a promo code'); setApplied(null); return null; }
    if (!isInsideTg) { setPromoState('bad'); setPromoMsg('Open from Telegram to apply promo'); setApplied(null); return null; }
    const res = await window.actionApplyPromo(code);
    if (res.ok) {
      const next = { code: res.code || code, days: Number(res.days || 31) };
      setApplied(next); setPromo(next.code); setPromoState('ok'); setPromoMsg(`Promo applied · ${next.days} days after payment`);
      return next;
    }
    setApplied(null); setPromoState('bad'); setPromoMsg(res.message || 'Invalid promo code');
    return null;
  };
  const promoForPay = async () => {
    let p = applied;
    if (!p && promo.trim()) p = await applyPromo();
    if (promo.trim() && !p) return false;
    return p || null;
  };
  const onPay = async () => {
    if (busy || paying.current || !plan?.available) return;
    if (!isInsideTg) {
      if (method === 0 || method === 2) { alert('Open in Telegram to pay.'); return; }
      nav.setPro(true); nav.reset('home'); return;
    }
    paying.current = true; setBusy(true);
    try {
      const p = await promoForPay();
      if (p === false) return;
      if (method === 0 || method === 2) {
        const checkout = await window.actionCreateTributeCheckout(tier, bundleTarget);
        if (!checkout.ok) { alert(checkout.message || 'Could not prepare checkout'); return; }
        const opened = window.actionOpenTribute(checkout.url);
        if (!opened.ok) { alert(opened.message); return; }
        setNotice(false);
        return;
      }
      if (method === 1) {
        const r = await window.actionCreateStarsInvoice(31, tier, p?.code || '', bundleTarget);
        if (!r.ok) { alert(r.message || 'Could not create Stars invoice'); return; }
        setNotice(false);
        const tg = window.Telegram?.WebApp;
        if (tg && typeof tg.openInvoice === 'function') {
          tg.openInvoice(r.invoice_link, (status) => {
            if (status === 'paid') {
              window.refreshSubscriptionAccess?.();
              window.startInvitePolling?.((access) => nav.openInvite?.(access), () => {});
              nav.reset('home');
            } else if (status === 'failed') alert('Payment failed');
          });
        } else if (tg?.openLink) tg.openLink(r.invoice_link);
        return;
      }
      const r = await window.actionOpenCryptoCheckout?.({ tier, promoCode: p?.code || '', bundleTarget });
      if (!r?.ok) { alert(r?.message || 'Could not open crypto payment'); return; }
      setNotice(false);
    } finally {
      paying.current = false; setBusy(false);
    }
  };
  const onTrial = async () => {
    if (busy) return;
    if (user.trialUsed) { alert("You've already used your free trial."); return; }
    setBusy(true);
    try {
      if (!isInsideTg) { nav.setPro(true); nav.reset('home'); return; }
      const r = await window.actionStartFreeTrial();
      if (!r.ok) { alert(r.reason === 'trial-used' ? "You've already used your free trial." : (r.message || 'Could not activate trial.')); return; }
      nav.reset('home');
      if (r.invite_link) setTimeout(() => nav.openInvite?.(r.invite_link), 350);
      window.invalidate?.('user'); window.invalidate?.('my_invite');
    } finally { setBusy(false); }
  };
  const startPay = () => (isCheckoutNoticeHidden(noticeKey) ? onPay() : setNotice(true));
  const logo = (name) => `${V2_SITE}/redesign/pay/${name}.svg`;
  const methods = [
    { i: 0, name: 'Card', sub: 'via Tribute', logos: ['visa', 'mastercard', 'mir'] },
    { i: 1, name: 'Telegram Stars', sub: `${plan.stars} Stars`, stars: true },
    { i: 2, name: 'СБП', sub: 'via Tribute', logos: ['sbp'] },
    { i: 3, name: 'Crypto', sub: 'USDT, BTC, TON and more', coins: ['usdt', 'btc', 'ton'] },
  ];
  const priceLabel = method === 1 ? `${plan.stars} Stars` : `€${plan.eur}`;
  const label = { fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: V2C.muted, margin: '0 0 10px' };
  return (
    <Phone>
      <header style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 8px', flexShrink: 0 }}>
        <button type="button" aria-label="Back" onClick={() => nav.back()} style={v2IconBtn}>{V2I.back}</button>
        <h1 style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700, color: V2C.text }}>{user.isPro ? 'Subscription' : 'Get PRO'}</h1>
        <span style={{ width: 44 }} />
      </header>
      <div className="v2-scroll v2-push" style={{ padding: '6px 16px 0', paddingBottom: `calc(140px + ${V2_SAFE_BOTTOM})` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, letterSpacing: 1, lineHeight: 0.95, color: V2C.text }}>
            {user.isPro ? <>You're <span style={{ color: accent }}>subscribed</span></> : <>Unlock the <span style={{ color: accent }}>full archive</span></>}
          </span>
          <span style={{ fontSize: 14, color: V2C.muted }}>
            {user.isPro ? (user.isInfinite ? 'Lifetime access · everything unlocked' : `${user.daysLeft} days left · you can extend up to 60`)
              : `${v2Num(stats.photos)} photos · ${v2Num(stats.videos)} videos · ${v2Num(stats.artists)} artists`}
          </span>
        </div>

        <p style={label}>CHOOSE A PLAN</p>
        <div role="radiogroup" aria-label="Plan" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {SUBSCRIPTION_TIER_ORDER.map(id => {
            const t = V2_TIERS[id];
            const p = TIER_PRICES[id];
            const on = id === tier;
            return (
              <button key={id} type="button" className="v2-choice" role="radio" aria-checked={on} onClick={() => setTier(id)} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                background: on ? `radial-gradient(120% 140% at 0% 0%, ${t.color}2E, ${t.color}00 60%), ${V2C.surface}` : V2C.surface,
                border: on ? `2px solid ${t.color}` : `1px solid ${V2C.line2}`, boxShadow: on ? `0 10px 30px ${t.color}2E` : 'none', color: V2C.text,
              }}>
                {t.badge && <span style={{ position: 'absolute', right: 16, top: -10, height: 20, padding: '0 8px', borderRadius: 999, background: t.color, color: V2C.bg, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, lineHeight: '20px' }}>{t.badge}</span>}
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1, lineHeight: 1, color: t.color }}>{t.name}</span>
                    {t.tag && <span style={{ height: 18, padding: '0 6px', borderRadius: 5, border: `1px solid ${t.color}80`, color: t.color, fontSize: 10, fontWeight: 700, lineHeight: '16px', boxSizing: 'border-box' }}>{t.tag}</span>}
                  </span>
                  <span style={{ fontSize: 13, color: V2C.soft }}>{t.line}</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>€{p.eur}</span>
                  <span style={{ fontSize: 11, color: V2C.muted }}>/ month</span>
                </span>
                <span aria-hidden="true" style={{ width: 24, height: 24, boxSizing: 'border-box', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? t.color : 'transparent', border: on ? 'none' : '2px solid rgba(255,255,255,0.28)', color: V2C.bg }}>{on && V2I.check}</span>
              </button>
            );
          })}
        </div>
        {tier === 'elite' && (
          <div role="radiogroup" aria-label="Second page" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 5, marginBottom: 12, borderRadius: 12, background: V2C.surface, border: `1px solid ${V2C.line}` }}>
            {ELITE_TARGETS.map(item => {
              const on = item.id === eliteTarget;
              return <button key={item.id} type="button" className="v2-choice" role="radio" aria-checked={on} onClick={() => setEliteTarget(item.id)} style={{ height: 38, border: `1px solid ${on ? meta.color : 'transparent'}`, borderRadius: 8, background: on ? `${meta.color}22` : 'transparent', color: on ? meta.color : V2C.soft, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{item.label}</button>;
            })}
          </div>
        )}

        <p style={{ ...label, marginTop: 22 }}>PAY WITH</p>
        <div role="radiogroup" aria-label="Payment method" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {methods.map(m => {
            const on = m.i === method;
            return (
              <button key={m.i} type="button" className="v2-choice" role="radio" aria-checked={on} disabled={busy} onClick={() => setMethod(m.i)} style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '0 14px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                background: V2C.raised, border: on ? `2px solid ${V2C.text}` : `1px solid ${V2C.line}`, color: V2C.text,
              }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</span>
                  <span style={{ fontSize: 12, color: V2C.muted }}>{m.sub}</span>
                </span>
                {m.logos && <span style={{ display: 'flex', gap: 6 }}>{m.logos.map(l => <span key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 26, borderRadius: 5, background: '#fff' }}><img src={logo(l)} alt={l} style={{ maxWidth: 30, maxHeight: 16 }} /></span>)}</span>}
                {m.stars && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, background: 'rgba(255,194,75,0.14)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="#FFC24B" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg></span>}
                {m.coins && <span style={{ display: 'flex' }}>{m.coins.map((c, i) => <img key={c} src={logo(c)} alt={c} style={{ width: 30, height: 30, marginLeft: i ? -8 : 0, borderRadius: '50%', border: `2px solid ${V2C.raised}`, background: V2C.raised }} />)}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input value={promo} onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoState(''); setPromoMsg(''); setApplied(null); }} placeholder="Promo code" aria-label="Promo code" style={{
            flex: 1, minWidth: 0, height: 46, padding: '0 14px', borderRadius: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 15,
            border: `1px solid ${promoState === 'ok' ? V2C.lime : promoState === 'bad' ? '#FF6B6B' : V2C.line2}`, background: V2C.surface, color: V2C.text,
          }} />
          <button type="button" onClick={applyPromo} style={{ height: 46, padding: '0 18px', border: 'none', borderRadius: 14, background: V2C.chip, color: V2C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Apply</button>
        </div>
        {promoMsg && <p style={{ margin: '8px 0 0', fontSize: 12, color: promoState === 'ok' ? V2C.lime : '#FF6B6B' }}>{promoMsg}</p>}

        {!user.isPro && !user.trialUsed && (
          <button type="button" onClick={onTrial} disabled={busy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, padding: '12px 14px', borderRadius: 16, border: '1px solid rgba(42,171,238,0.3)', background: 'rgba(42,171,238,0.1)', color: V2C.text, textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: '#2AABEE', color: '#fff' }}>{V2I.telegram}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Not sure yet?</span>
              <span style={{ fontSize: 12, color: V2C.soft }}>Start a 5-day free trial</span>
            </span>
            {V2I.chevR}
          </button>
        )}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: `14px 16px calc(16px + ${V2_SAFE_BOTTOM})`, background: 'linear-gradient(rgba(14,14,15,0), #0E0E0F 30%)', zIndex: 5 }}>
        <button type="button" onClick={startPay} disabled={busy || !plan.available} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, border: 'none', borderRadius: 18, cursor: busy ? 'wait' : 'pointer',
          background: busy ? V2C.chip : meta.color, color: busy ? V2C.muted : V2C.bg, fontSize: 17, fontWeight: 800,
          boxShadow: busy ? 'none' : `0 12px 30px ${meta.color}4D`,
        }}>{busy ? 'Processing…' : <>Pay {priceLabel} · {meta.name}{V2I.arrow}</>}</button>
        <span style={{ textAlign: 'center', fontSize: 12, color: V2C.muted }}>31 days of access · cancel anytime</span>
      </div>
      {notice && <CheckoutNoticeModal initialLanguage={user.lang || 'en'} preferenceKey={noticeKey}
        plan={{ name: meta.name, eur: plan.eur, stars: plan.stars }} method={method}
        accent={meta.color} busy={busy} onClose={() => setNotice(false)} onPay={onPay} />}
    </Phone>
  );
}

// ── Locked sheet (no subscription) ──────────────────────────────
function V2PaywallSheet({ accent = V2C.pink, onClose }) {
  const nav = window.useNav();
  const user = nav.user || {};
  const stats = window.useStats().data || {};
  const plans = () => { onClose && onClose(); nav.go('subscription'); };
  const tile = (value, label) => (
    <li style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '12px 4px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: `1px solid ${V2C.line}` }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, lineHeight: 1, color: V2C.lime }}>{v2Num(value)}</span>
      <span style={{ fontSize: 11, color: V2C.soft }}>{label}</span>
    </li>
  );
  return ReactDOM.createPortal(
    <div className="v2-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9650, background: 'rgba(5,5,6,0.66)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="v2LockedTitle" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        padding: `12px 20px calc(22px + ${V2_SAFE_BOTTOM})`, borderRadius: '28px 28px 0 0', fontFamily: "'DM Sans', system-ui, sans-serif", color: V2C.text,
        background: `radial-gradient(90% 60% at 50% 0%, rgba(255,126,200,0.2), rgba(255,126,200,0) 70%), ${V2C.surface}`,
        borderTop: '1px solid rgba(255,126,200,0.35)', boxShadow: '0 -20px 60px rgba(0,0,0,0.6)', animation: 'v2-sheet 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        <span aria-hidden="true" style={{ width: 40, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.22)' }} />
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, marginTop: 4, borderRadius: 22, background: `linear-gradient(135deg, ${V2C.pink}, ${V2C.purple})`, color: V2C.bg, boxShadow: '0 12px 32px rgba(255,126,200,0.35)' }}>{V2I.lock}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <h2 id="v2LockedTitle" style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, fontSize: 36, letterSpacing: 1, lineHeight: 0.95 }}>This one is for <span style={{ color: V2C.pink }}>members</span></h2>
          <p style={{ margin: 0, maxWidth: 300, fontSize: 14, lineHeight: 1.45, color: V2C.soft }}>Subscribe to watch every video, short and photo from all {v2Num(stats.artists)} artists.</p>
        </div>
        <ul style={{ width: '100%', margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {tile(stats.videos, 'videos')}{tile(stats.photos, 'photos')}{tile(stats.artists, 'artists')}
        </ul>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={plans} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, border: 'none', borderRadius: 18, background: V2C.pink, color: V2C.bg, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 30px rgba(255,126,200,0.3)' }}>
            See plans · from €{TIER_PRICES.plus.eur}{V2I.arrow}
          </button>
          {!user.trialUsed && <button type="button" onClick={plans} style={{ height: 50, border: '1px solid rgba(200,255,68,0.5)', borderRadius: 18, background: 'rgba(200,255,68,0.08)', color: V2C.lime, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Try 5 days free</button>}
          <button type="button" onClick={onClose} style={{ height: 40, border: 'none', background: 'transparent', color: V2C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Maybe later</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

window.V2Header = V2Header;
window.V2BottomNav = V2BottomNav;
window.V2PaywallSheet = V2PaywallSheet;
window.V2_SCREENS = {
  home: ({ accent }) => <V2Home accent={accent} />,
  artists: ({ accent }) => <V2Artists accent={accent} />,
  artist: ({ accent }) => <V2ArtistPage accent={accent} />,
  saved: ({ accent, params }) => <V2Saved accent={accent} initialTab={params.tab || 'all'} />,
  profile: ({ accent }) => <V2Profile accent={accent} />,
  subscription: ({ accent }) => <V2Plans accent={accent} />,
};
