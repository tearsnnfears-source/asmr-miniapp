// Shared UI: Phone frame, icons, header, thumbnails, bottom navs
// All names prefixed/specific to avoid collisions.

// Nav context — created here so screen files (loaded after ui.jsx) can read it
// without worrying about load order. app.jsx provides the value at the root.
window.NavContext = window.NavContext || React.createContext(null);
// Safe consumer: returns a no-op stub when no provider is mounted (e.g. when a
// component is used outside the AppShell, like in standalone previews).
function useNav() {
  const ctx = React.useContext(window.NavContext);
  return ctx || { go: () => {}, back: () => {}, replace: () => {}, reset: () => {},
                  onTab: () => {}, activeTab: '', centerMode: 'subscribe',
                  isPro: false, screen: 'home', params: {}, canGoBack: false };
}
window.useNav = useNav;

const C = {
  pink: '#FF7EC8',
  lime: '#CCFF00',
  blue: '#44C8FF',
  purple: '#C86BFF',
  orange: '#FF9F44',
  dark: '#0E0E0F',
  dark2: '#161617',
  dark3: '#1E1E20',
  dark4: '#252527',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  muted2: 'rgba(255,255,255,0.65)',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)',
};

const tagColor = (tag) => ({
  pink: C.pink, lime: C.lime, blue: C.blue, purple: C.purple, orange: C.orange
}[tag] || C.pink);

// Phone wrapper — 390x844 on desktop (preview look), full-screen on mobile/Telegram.
// data-phone="true" lets the .phone-fill CSS in app.jsx override the desktop
// styling regardless of how many layers of wrapper sit between this and the
// .phone-fill root (needed for the persistent ShortsTab layer).
function Phone({ children, label, width = 390, height = 844 }) {
  // NOTE: the safe-area inset is applied at the PhoneStage outer container
  // (app.jsx) so every screen — including the persistent ShortsTab layer —
  // gets it for free. Don't add paddingTop here or you'll double-pad.
  return (
    <div data-phone="true" style={{
      width, height,
      background: C.dark,
      color: C.text,
      borderRadius: 38,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      border: `1px solid ${C.border2}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
      display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
  );
}

// SVG icons — tiny library
const Ico = {
  home: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>,
  homeFilled: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>,
  shorts: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M7 4l10 5v6L7 20zM5 7v10"/></svg>,
  shortsFilled: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...props}><path d="M7 3v18l13-7.5z"/></svg>,
  artists: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="12" cy="8" r="4"/><path d="M4 22c1-4 5-6 8-6s7 2 8 6"/></svg>,
  star: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M12 3l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 17l-5.6 3.2L7.9 14 3 9.6 9.4 9z"/></svg>,
  starFilled: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...props}><path d="M12 3l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 17l-5.6 3.2L7.9 14 3 9.6 9.4 9z"/></svg>,
  card: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>,
  user: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="12" cy="8" r="4"/><path d="M5 21c1-4 4-6 7-6s6 2 7 6"/></svg>,
  search: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>,
  bell: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z"/><path d="M10 21h4"/></svg>,
  play: (props={}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}><path d="M8 5v14l11-7z"/></svg>,
  heart: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>,
  heartFilled: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" {...props}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>,
  bookmark: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M6 4h12v17l-6-4-6 4z"/></svg>,
  share: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"/></svg>,
  more: (props={}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" {...props}><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>,
  chevL: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...props}><path d="m15 5-7 7 7 7"/></svg>,
  chevR: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...props}><path d="m9 5 7 7-7 7"/></svg>,
  plus: (props={}) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}><path d="M12 5v14M5 12h14"/></svg>,
  crown: (props={}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}><path d="M3 7l4 3 5-6 5 6 4-3-2 11H5z"/></svg>,
  sparkle: (props={}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z"/></svg>,
  flame: (props={}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 4 3 4 6a6 6 0 0 1-12 0c0-5 4-7 6-12z"/></svg>,
  filter: (props={}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 6h16M7 12h10M10 18h4"/></svg>,
};

// Mock thumbnail — abstract gradient with overlay marks resembling an ASMR shot
function Thumb({ thumb, duration, height = 'auto', aspect = 16/9, badge, children }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: aspect,
      height,
      borderRadius: 14,
      overflow: 'hidden',
      background: thumb.bg,
      flexShrink: 0,
    }}>
      {duration && (
        <span style={{
          position: 'absolute', right: 8, bottom: 8,
          background: 'rgba(0,0,0,0.78)', color: '#fff',
          fontSize: 11, padding: '2px 6px', borderRadius: 6,
          fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        }}>{duration}</span>
      )}
      {badge && (
        <span style={{
          position: 'absolute', left: 8, top: 8,
          background: badge.bg || C.pink, color: badge.fg || '#000',
          fontSize: 10, padding: '3px 7px', borderRadius: 999,
          fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
        }}>{badge.label}</span>
      )}
      {children}
    </div>
  );
}

// Round avatar — uses real photo when artist has one, falls back to a
// gradient circle with the first letter.
function Avatar({ artist, size = 36, ring }) {
  const palette = ['#FF7EC8', '#C86BFF', '#44C8FF', '#CCFF00', '#FF9F44'];
  const idx = (artist?.id?.charCodeAt(1) || 0) % palette.length;
  // Real artists from /miniapp/artists have .photo; videos.artist may not.
  // profilePhoto > photo > letter fallback.
  const photoUrl = artist?.profilePhoto || artist?.photo || '';
  const baseStyle = {
    width: size, height: size, borderRadius: '50%',
    flexShrink: 0,
    border: ring ? `2px solid ${ring}` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  if (photoUrl) {
    return (
      <div style={{
        ...baseStyle,
        backgroundImage: `url('${photoUrl.replace(/'/g, "\\'")}')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        background: `linear-gradient(135deg, ${palette[idx]}, ${palette[(idx+1)%palette.length]}) url('${photoUrl.replace(/'/g, "\\'")}') center/cover`,
      }} />
    );
  }
  return (
    <div style={{
      ...baseStyle,
      background: `linear-gradient(135deg, ${palette[idx]}, ${palette[(idx+1)%palette.length]})`,
      color: '#000', fontWeight: 800, fontSize: size * 0.38,
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: -0.3,
    }}>{artist?.name?.[0]}</div>
  );
}

// Tier color palette — matches the live miniapp.
const TIER_COLORS = {
  plus: '#FF7EC8',   // pink
  pro: '#00E5FF',    // cyan
  elite: '#FFD700',  // gold
  vip: '#C86BFF',    // purple
  founder: '#FF9F44', // orange
};

// App Header — avatar + name + tier, clickable area on left → profile.
// Pulls user data from nav context (live API or Telegram fallback).
function AppHeader({ user: userProp, accent = C.pink }) {
  const nav = useNav();
  const user = userProp || nav.user || { name: 'You', daysLeft: 0, isPro: false };
  // While /miniapp/profile is in flight we don't yet know the user's tier.
  // Skip the badge entirely so we don't flash FREE → ELITE.
  const userLoading = nav.userLoading;
  const tier = (user.tier || 'free').toLowerCase();
  const tierColor = TIER_COLORS[tier] || accent;
  const daysLabel = user.isInfinite ? '∞' : (user.daysLeft || 0);
  const showTier = !userLoading && (user.isPro || (tier && tier !== 'free'));
  const showFree = !userLoading && !user.isPro && tier === 'free';
  return (
    <div style={{
      padding: '8px 14px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      background: C.dark2,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* clickable cluster → profile */}
      <div onClick={() => nav.go('profile')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <Avatar artist={{ id: 'u-' + (user.telegramId || 0), name: user.name, photo: user.photo }} size={40} ring={showTier ? tierColor : accent} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.name}
            {showTier ? (
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 12, letterSpacing: 1, padding: '2px 6px', borderRadius: 4,
                background: tierColor, color: '#000', lineHeight: 1, fontWeight: 700,
              }}>{tier.toUpperCase()}{user.isInfinite ? ' ∞' : ''}</span>
            ) : showFree ? (
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 12, letterSpacing: 1, padding: '2px 6px', borderRadius: 4,
                background: 'rgba(255,255,255,0.15)', color: C.muted2, lineHeight: 1, fontWeight: 700,
              }}>FREE</span>
            ) : (
              // userLoading: show a neutral placeholder so we don't flash FREE.
              <span style={{
                width: 40, height: 14, borderRadius: 4,
                background: 'rgba(255,255,255,0.08)',
                display: 'inline-block',
              }} />
            )}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            {user.isPro
              ? (user.isInfinite ? 'lifetime · view profile ›' : `${daysLabel} days left · view profile ›`)
              : 'view profile ›'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={iconBtn}><Ico.search /></button>
        <button style={iconBtn}>
          <Ico.bell />
          <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: '50%', background: accent }} />
        </button>
      </div>
    </div>
  );
}

const iconBtn = {
  position: 'relative',
  width: 38, height: 38, borderRadius: 12,
  background: 'transparent',
  border: `1px solid ${C.border}`,
  color: C.text, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

// NEW Bottom nav — 5 tabs with center action (Subscribe → Profile after subscribing)
// `active` / `centerMode` props from screens override; otherwise pulled from nav context.
function BottomNav({ active, centerMode, accent = C.pink, subAccent = C.lime }) {
  const nav = useNav();
  const activeTab = active != null ? active : nav.activeTab;
  const center = centerMode != null ? centerMode : nav.centerMode;
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home', filled: 'homeFilled' },
    { id: 'shorts', label: 'Shorts', icon: 'shorts', filled: 'shortsFilled' },
    { id: 'center', label: center === 'subscribe' ? 'Subscribe' : 'Profile', center: true },
    { id: 'artists', label: 'Artists', icon: 'artists', filled: 'artists' },
    { id: 'favorites', label: 'Saved', icon: 'star', filled: 'starFilled' },
  ];

  return (
    <div style={{
      flexShrink: 0,
      background: C.dark2,
      borderTop: `1px solid ${C.border}`,
      // Bottom padding absorbs the device home indicator / gesture bar
      // (--tg-safe-bottom from api.jsx). The nav's background reaches the
      // edge of the viewport while the tab labels sit above the indicator.
      padding: '8px 6px calc(14px + var(--tg-safe-bottom, env(safe-area-inset-bottom, 0px)))',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      position: 'relative',
    }}>
      {tabs.map(t => {
        if (t.center) {
          const isSub = center === 'subscribe';
          if (isSub) {
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => nav.onTab('center')} style={{
                  marginTop: -24,
                  height: 50, padding: '0 14px',
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
                  border: 'none', color: '#000',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 6px 22px ${accent}66, 0 0 0 4px ${C.dark2}`,
                  whiteSpace: 'nowrap',
                }}>
                  <Ico.crown />
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 17, letterSpacing: 1.2, lineHeight: 1, fontWeight: 700,
                  }}>GET PRO</span>
                </button>
              </div>
            );
          }
          // Profile avatar in the center slot — uses the live user from
          // context so it shows the real Telegram photo, not a letter.
          const u = nav.user || {};
          return (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => nav.onTab('center')} style={{
                marginTop: -22, position: 'relative',
                width: 56, height: 56, borderRadius: '50%',
                background: C.dark3,
                border: `2px solid ${subAccent}`,
                cursor: 'pointer', padding: 0,
                boxShadow: `0 0 0 4px ${C.dark2}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Avatar artist={{ id: 'u-' + (u.telegramId || 0), name: u.name || 'You', photo: u.photo }} size={44} />
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  background: subAccent, color: '#000',
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                  border: `2px solid ${C.dark2}`,
                }}>✓</span>
              </button>
            </div>
          );
        }
        const isActive = t.id === activeTab;
        const IconC = Ico[isActive ? t.filled : t.icon];
        return (
          <button key={t.id} onClick={() => nav.onTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: isActive ? accent : C.muted2,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: 6,
          }}>
            <IconC />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Stats strip — compact lime-outlined panel (kept as requested but lighter)
function StatsStrip({ stats, accent = C.lime, compact = false }) {
  const statsState = window.useStats?.();
  if (!stats) stats = statsState?.data || window.STATS || { photos: 0, videos: 0, artists: 0 };
  const items = [
    { val: stats.photos.toLocaleString(), label: 'Photos' },
    { val: stats.videos.toLocaleString(), label: 'Videos' },
    { val: stats.artists, label: 'Artists' },
  ];
  return (
    <div style={{
      border: `1.5px solid ${accent}`,
      borderRadius: 14,
      padding: compact ? '10px 4px' : '12px 4px',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      background: `linear-gradient(135deg, rgba(204,255,0,0.06), transparent 60%)`,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          textAlign: 'center',
          borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
          padding: '2px 4px',
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: compact ? 19 : 22, letterSpacing: 0.5,
            color: accent, lineHeight: 1.05,
          }}>{it.val}</div>
          <div style={{ fontSize: 10, color: accent, opacity: 0.85, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// Promo / banner slot — used on home
function PromoBanner({ accent = C.pink, kind = 'event' }) {
  // 'event' = colored hero with title; 'subscribe' = call-to-action
  if (kind === 'subscribe') {
    return (
      <div style={{
        background: `linear-gradient(110deg, ${accent} 0%, ${C.purple} 100%)`,
        borderRadius: 16, padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        color: '#0E0E0F',
      }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1, lineHeight: 1 }}>5 days free</div>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, opacity: 0.8 }}>Full library · zero ads · ends 23 May</div>
        </div>
        <div style={{
          background: '#0E0E0F', color: '#fff',
          padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>Try free →</div>
      </div>
    );
  }
  return (
    <div style={{
      background: `linear-gradient(120deg, ${C.dark3} 0%, ${C.dark4} 100%)`,
      border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '14px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${accent}30, transparent 70%)` }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 10, color: accent, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>NEW · 12 may</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 0.8, lineHeight: 1.1, marginTop: 4 }}>Heyhelen <span style={{ color: accent }}>drop</span></div>
        <div style={{ fontSize: 11, color: C.muted2, marginTop: 4 }}>14 new videos · 220 photos</div>
      </div>
      <div style={{ position: 'relative', textAlign: 'right' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#000', boxShadow: `0 4px 14px ${accent}55`,
        }}><Ico.play /></div>
      </div>
    </div>
  );
}

// Chip — small filter pill
function Chip({ active, accent = C.pink, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? accent : 'transparent',
      color: active ? '#000' : C.text,
      border: active ? `1px solid ${accent}` : `1px solid ${C.border2}`,
      padding: '6px 12px', borderRadius: 999,
      fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap', cursor: 'pointer',
      fontFamily: 'inherit',
    }}>{children}</button>
  );
}

// Section header
function SectionHeader({ title, accent = C.pink, action = 'See all ›', icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase',
        }}>{title}</div>
      </div>
      <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{action}</div>
    </div>
  );
}

// ── TICKER BANNER ─────────────────────────────────────────────
// Auto-rotating lime panel that cycles between: free trial, content stats, custom ads.
// Swipeable, dots indicator, 5s auto-advance.
function TickerBanner({ accent = C.pink, lime = C.lime, slides, interval = 5000 }) {
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const total = slides.length;

  React.useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % total), interval);
    return () => clearTimeout(t);
  }, [idx, paused, total, interval]);

  // touch swipe
  const startX = React.useRef(null);
  const onStart = e => { startX.current = (e.touches?.[0]||e).clientX; setPaused(true); };
  const onEnd = e => {
    if (startX.current == null) return;
    const dx = ((e.changedTouches?.[0]||e).clientX) - startX.current;
    if (Math.abs(dx) > 30) setIdx(i => (i + (dx < 0 ? 1 : total - 1)) % total);
    startX.current = null;
    setTimeout(() => setPaused(false), 600);
  };

  return (
    <div
      onTouchStart={onStart} onTouchEnd={onEnd}
      onMouseDown={onStart} onMouseUp={onEnd}
      style={{
        border: `1.5px solid ${lime}`,
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(204,255,0,0.06), transparent 60%)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'grab',
        width: '100%',
        boxSizing: 'border-box',
      }}>
      <div style={{
        display: 'flex',
        width: '100%',
        transform: `translateX(-${idx * 100}%)`,
        transition: 'transform 450ms cubic-bezier(.4,0,.2,1)',
      }}>
        {slides.map((s, i) => (
          <div key={i} style={{
            width: '100%', flexShrink: 0,
            padding: '12px 14px 18px',
            boxSizing: 'border-box',
            minWidth: 0,
          }}>
            {s({ accent, lime })}
          </div>
        ))}
      </div>
      {/* dots */}
      <div style={{
        position: 'absolute', bottom: 6, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 5,
        pointerEvents: 'none',
      }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 12 : 4, height: 4, borderRadius: 999,
            background: i === idx ? lime : 'rgba(204,255,0,0.3)',
            transition: 'width 300ms ease',
          }} />
        ))}
      </div>
    </div>
  );
}

// Slide builders — pure render fns so the ticker can lazy-render
const TickerSlides = {
  freeTrial: ({ accent, lime }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ color: lime, fontWeight: 800, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' }}>Limited offer</span>
          <span style={{ background: lime, color: '#000', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, letterSpacing: 0.4 }}>NEW</span>
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, lineHeight: 1, letterSpacing: 0.8 }}>
          Try <span style={{ color: lime }}>5 days free</span>
        </div>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>Full library access · no card required</div>
      </div>
      <button style={{
        background: lime, color: '#000', border: 'none',
        padding: '8px 14px', borderRadius: 999, fontSize: 11, fontWeight: 800,
        whiteSpace: 'nowrap', cursor: 'pointer',
      }}>Get it →</button>
    </div>
  ),
  stats: ({ accent, lime }) => {
    // use spaces in numbers for compactness on phone widths
    const fmt = (n) => n.toLocaleString('en-US').replace(/,/g, ' ');
    // Pull from API-derived useStats; fallback to mock if nothing yet.
    const statsState = window.useStats?.();
    const s = statsState?.data || window.STATS || { photos: 0, videos: 0, artists: 0 };
    const items = [
      { val: fmt(s.photos), label: 'Photos' },
      { val: fmt(s.videos), label: 'Videos' },
      { val: String(s.artists), label: 'Artists' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', minHeight: 56, alignItems: 'center', gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            textAlign: 'center',
            borderRight: i < 2 ? `1px solid rgba(255,255,255,0.08)` : 'none',
            minWidth: 0,
            padding: '0 2px',
          }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: lime, lineHeight: 1.05, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{it.val}</div>
            <div style={{ fontSize: 9, color: lime, opacity: 0.85, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 3 }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
  },
  ad: ({ accent, lime }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#000',
        }}><Ico.sparkle /></div>
        <div>
          <div style={{ fontSize: 9, color: lime, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Sponsored</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Heyhelen exclusive drop</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>14 new videos · today only</div>
        </div>
      </div>
      <button style={{
        background: 'transparent', color: lime, border: `1px solid ${lime}`,
        padding: '7px 13px', borderRadius: 999, fontSize: 11, fontWeight: 700,
        whiteSpace: 'nowrap', cursor: 'pointer',
      }}>Open</button>
    </div>
  ),
};

Object.assign(window, { C, tagColor, Phone, Ico, Thumb, Avatar, AppHeader, BottomNav, StatsStrip, PromoBanner, Chip, SectionHeader, TickerBanner, TickerSlides, TIER_COLORS });
