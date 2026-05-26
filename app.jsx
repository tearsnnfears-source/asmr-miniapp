// SPA shell — single-screen viewer with history stack.
// Replaces the DesignCanvas (Figma-style artboards) with a real app:
// one screen at a time, BottomNav switches tabs, deep clicks open sub-screens.

// ── Nav context ─────────────────────────────────────────────────
// NavContext is created in ui.jsx (loaded earlier) so screen components can
// consume it without depending on app.jsx load order. Here we just provide.
const NavContext = window.NavContext;

// ── Screen registry ─────────────────────────────────────────────
// Each entry: a render function that returns the screen for given params.
// Names match what callers pass to go(name, params).
const SCREENS = {
  home:           ({ accent, density })           => <window.HomeV2 accent={accent} density={density} />,
  shorts:         ({ accent })                    => <window.ShortsTab accent={accent} mode="grid" />,
  'shorts-player':({ accent })                    => <window.ShortsTab accent={accent} mode="player" />,
  artists:        ({ accent })                    => <window.ArtistsPage accent={accent} />,
  saved:          ({ accent, params })            => <window.SavedPage accent={accent} initialTab={params.tab || 'videos'} />,
  video:          ({ accent, density })           => <window.VideoPage accent={accent} density={density} />,
  artist:         ({ accent })                    => <window.ArtistPage accent={accent} />,
  subscription:   ({ accent })                    => <window.SubscriptionPage accent={accent} />,
  profile:        ({ accent })                    => <window.ProfilePage accent={accent} />,
  faq:            ({ accent })                    => <window.FAQPage accent={accent} />,
  'paywall-video':({ accent })                    => <window.PaywallLock accent={accent} mode="video" />,
  'paywall-artist':({ accent })                   => <window.PaywallLock accent={accent} mode="artist" />,
};

// Which BottomNav tab is "active" for each screen.
// Sub-screens (video, artist, etc.) keep the parent tab highlighted.
const SCREEN_TO_TAB = {
  home: 'home',
  shorts: 'shorts',
  'shorts-player': 'shorts',
  artists: 'artists',
  artist: 'artists',
  saved: 'favorites',
  video: 'home',
  subscription: '',
  profile: '',
  faq: '',
  'paywall-video': 'home',
  'paywall-artist': 'artists',
};

// Clicks on a BottomNav tab route here.
const TAB_TO_SCREEN = {
  home: 'home',
  shorts: 'shorts',
  artists: 'artists',
  favorites: 'saved',
};

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF7EC8",
  "density": "comfortable",
  "startPro": false
}/*EDITMODE-END*/;

function AppShell() {
  const [t, setTweak] = window.useTweaks(TWEAKS_DEFAULTS);
  const accent = t.accent;
  const density = t.density;

  // History stack — each entry { screen, params }. Top of stack = current.
  const [stack, setStack] = React.useState([{ screen: 'home', params: {} }]);
  const current = stack[stack.length - 1];

  // User profile from real API — drives isPro, displayed name, days left.
  // Falls back to mock when not in Telegram (preview-URL browser testing).
  const userState = window.useUser();
  const user = userState.data;
  // Warm the cache for videos + shorts + artists at app start so tab-switching
  // is instant. Hooks return state but we don't use it here — the goal is to
  // populate the module-level cache before screens mount their own consumers.
  window.useVideos(500);
  window.useShorts(20);
  const artistsState = window.useArtists();
  window.useFavorites();
  // Tweak toggle still wins for local testing.
  const [proOverride, setProOverride] = React.useState(null);
  const isPro = proOverride != null ? proOverride : (t.startPro ? true : user.isPro);
  const setPro = (v) => setProOverride(v);

  const nav = React.useMemo(() => ({
    go: (screen, params = {}) => {
      if (!SCREENS[screen]) {
        console.warn(`[nav] unknown screen: ${screen}`);
        return;
      }
      setStack(s => [...s, { screen, params }]);
    },
    back: () => {
      setStack(s => s.length > 1 ? s.slice(0, -1) : s);
    },
    replace: (screen, params = {}) => {
      setStack(s => [...s.slice(0, -1), { screen, params }]);
    },
    reset: (screen = 'home', params = {}) => {
      setStack([{ screen, params }]);
    },
    canGoBack: stack.length > 1,
    screen: current.screen,
    params: current.params,
    activeTab: SCREEN_TO_TAB[current.screen] || '',
    centerMode: isPro ? 'profile' : 'subscribe',
    isPro,
    setPro,
    user,
    userLoading: userState.loading,
    // Tab-click handler used by BottomNav.
    onTab: (tabId) => {
      if (tabId === 'center') {
        return isPro ? setStack(s => [...s, { screen: 'profile', params: {} }])
                     : setStack(s => [...s, { screen: 'subscription', params: {} }]);
      }
      const target = TAB_TO_SCREEN[tabId];
      if (!target) return;
      setStack([{ screen: target, params: {} }]);
    },
  }), [current.screen, current.params, stack.length, isPro, user, userState.loading]);

  const renderScreen = SCREENS[current.screen] || SCREENS.home;
  const view = renderScreen({ accent, density, params: current.params });

  // TweaksPanel only when ?tweaks=1.
  const showTweaks = React.useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('tweaks') === '1'; }
    catch (e) { return false; }
  }, []);

  // Splash: covers the UI until artists are in. User loads in background — if
  // /profile is slow we don't want it to block first paint. Header falls back
  // to tg.initDataUnsafe.user.first_name (always available inside Telegram).
  const hasReal = (key) => {
    const e = window._apiCache?.get(key);
    return e?.data !== undefined && !e.error;
  };
  // Wait for both artists *and* videos so the Home hero doesn't flash mock
  // content while the real list is still loading.
  const dataReady = hasReal('artists') && hasReal('videos:500');

  const [splashVisible, setSplashVisible] = React.useState(true);
  // Hard timeout: 4s. Matches the live app's typical ready time and avoids
  // trapping the user when API is unreachable.
  React.useEffect(() => {
    const maxHide = setTimeout(() => setSplashVisible(false), 4000);
    return () => clearTimeout(maxHide);
  }, []);
  // Hide once artists are in. Minimum 500ms so it doesn't flicker.
  const mountTimeRef = React.useRef(Date.now());
  React.useEffect(() => {
    if (!dataReady) return;
    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, 500 - elapsed);
    const t = setTimeout(() => setSplashVisible(false), remaining);
    return () => clearTimeout(t);
  }, [dataReady]);

  return (
    <NavContext.Provider value={nav}>
      <PhoneStage>{view}</PhoneStage>
      {splashVisible && <SplashScreen accent={accent} />}
      {showTweaks && (
        <window.TweaksPanel>
          <window.TweakSection label="Theme">
            <window.TweakColor
              label="Accent"
              value={accent}
              options={['#FF7EC8', '#CCFF00', '#44C8FF', '#C86BFF', '#FF9F44']}
              onChange={v => setTweak('accent', v)}
            />
            <window.TweakRadio
              label="Density"
              value={density}
              options={[{ label: 'Compact', value: 'compact' }, { label: 'Comfy', value: 'comfortable' }]}
              onChange={v => setTweak('density', v)}
            />
          </window.TweakSection>
          <window.TweakSection label="User">
            <window.TweakToggle
              label="Pro user"
              value={isPro}
              onChange={v => setPro(!!v)}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </NavContext.Provider>
  );
}

// ── SplashScreen ────────────────────────────────────────────────
// Covers the UI during initial data load so the mock fallback never flashes.
function SplashScreen({ accent = '#FF7EC8' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0E0E0F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28,
      animation: 'splash-fade 250ms ease-out',
    }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 42, letterSpacing: 3, lineHeight: 1,
        color: '#fff',
      }}>
        ASMR<span style={{ color: accent }}>.LEAKS</span>
      </div>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(255,255,255,0.08)',
        borderTopColor: accent,
        borderRadius: '50%',
        animation: 'splash-spin 0.7s linear infinite',
      }} />
      <style>{`
        @keyframes splash-spin { to { transform: rotate(360deg); } }
        @keyframes splash-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ── PhoneStage ──────────────────────────────────────────────────
// On desktop: centered 390×844 frame on a dark backdrop (preview look).
// On mobile (≤480px) or inside Telegram WebApp: viewport-filling, no frame.
function PhoneStage({ children }) {
  const [mode, setMode] = React.useState(() => detectMode());
  React.useEffect(() => {
    const onResize = () => setMode(detectMode());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (mode === 'fill') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0E0E0F',
        display: 'flex', flexDirection: 'column',
      }}>
        <div className="phone-fill" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: '#0E0E0F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,126,200,0.06), transparent 50%), radial-gradient(circle at 70% 80%, rgba(204,255,0,0.04), transparent 50%)',
    }}>
      <div style={{ filter: 'drop-shadow(0 30px 80px rgba(0,0,0,0.6))' }}>
        {children}
      </div>
    </div>
  );
}

function detectMode() {
  if (typeof window === 'undefined') return 'frame';
  if (window.Telegram?.WebApp) return 'fill';
  if (window.innerWidth <= 480) return 'fill';
  return 'frame';
}

// .phone-fill overrides <Phone>'s inline 390×844/border-radius/border/shadow
// so screens stretch to viewport without editing each Phone usage site.
if (typeof document !== 'undefined' && !document.getElementById('phone-fill-styles')) {
  const s = document.createElement('style');
  s.id = 'phone-fill-styles';
  s.textContent = `
    .phone-fill > div {
      width: 100% !important;
      height: 100% !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
      flex: 1 !important;
    }
  `;
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppShell />);

window.AppShell = AppShell;
window.NavContext = NavContext;
window.useNav = useNav;
