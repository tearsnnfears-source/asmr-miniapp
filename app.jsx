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

  return (
    <NavContext.Provider value={nav}>
      <PhoneStage>{view}</PhoneStage>
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
