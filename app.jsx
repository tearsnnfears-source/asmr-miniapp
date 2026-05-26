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
  shorts:         ({ accent })                    => <window.ShortsTab accent={accent} />,
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
  // Warm both batches: small one for Home (fast), full 500 for detail
  // screens (in the background). Splash gates on the small one.
  window.useVideos(30);
  window.useVideos(500);
  // Must match SHORTS_LIMIT in screens.jsx — otherwise ShortsTab and the warm
  // cache would have different keys and the player would index into the wrong
  // array.
  const shortsState = window.useShorts(300);
  const artistsState = window.useArtists();
  window.useFavorites();

  // Prefetch playable URLs for the first batch of shorts so tile previews
  // come up almost instantly when the user opens the Shorts tab.
  React.useEffect(() => {
    const list = shortsState.data || [];
    if (!list.length) return;
    // Warm only the first 6 IDs (1.5 rows visible without scrolling) so we
    // don't hammer Railway with 24 parallel /content/play POSTs — that was
    // making the backend slow to respond to the very requests we're trying
    // to speed up. The rest load lazily via IntersectionObserver.
    const ids = list.slice(0, 6).map(s => s.raw?.id ?? s.id).filter(x => x != null);
    if (ids.length && window.prefetchPlayable) {
      window.prefetchPlayable(ids, 2);
    }
  }, [shortsState.data]);
  // Tweak toggle still wins for local testing.
  const [proOverride, setProOverride] = React.useState(null);
  const isPro = proOverride != null ? proOverride : (t.startPro ? true : user.isPro);
  const setPro = (v) => setProOverride(v);

  // Global shorts player overlay state. Any screen can call
  // nav.openShorts(items, idx) to pop the immersive player.
  const [shortsPlayer, setShortsPlayer] = React.useState(null); // { items, order, pos } | null

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
    // Open the immersive shorts overlay over the current screen.
    // items = array of normalized shorts; idx = starting position.
    openShorts: (items, idx = 0) => {
      if (!items || !items.length) return;
      setShortsPlayer({ items, pos: idx });
    },
    closeShorts: () => setShortsPlayer(null),
    shortsPlayer,
    setShortsPlayer,
  }), [current.screen, current.params, stack.length, isPro, user, userState.loading, shortsPlayer]);

  const renderScreen = SCREENS[current.screen] || SCREENS.home;
  const view = renderScreen({ accent, density, params: current.params });

  // TweaksPanel only when ?tweaks=1.
  const showTweaks = React.useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('tweaks') === '1'; }
    catch (e) { return false; }
  }, []);

  // Splash is now a static HTML element (#static-splash in redesign.html)
  // that's already on screen by the time React mounts — no more mock-flash.
  // We call window.__hideSplash() once the critical data is in cache.
  const hasReal = (key) => {
    const e = window._apiCache?.get(key);
    return e?.data !== undefined && !e.error;
  };
  // Splash hides when the lightweight Home payload is in *and* the user
  // profile has resolved (so AppHeader doesn't flash "FREE" before the real
  // tier badge appears). Outside Telegram there's no /profile to wait on.
  const isTg = !!(window.isInsideTelegram && window.isInsideTelegram());
  const userReady = !isTg || hasReal('user');
  const dataReady = hasReal('artists') && hasReal('videos:30') && userReady;
  React.useEffect(() => {
    if (!dataReady) return;
    // Give the screens one paint to render real data, then hide.
    const t = setTimeout(() => window.__hideSplash && window.__hideSplash(), 100);
    return () => clearTimeout(t);
  }, [dataReady]);

  // Telegram BackButton — the chrome-level Back arrow at the top-left of
  // the WebView. Show on any non-home screen so the user always has an
  // explicit way back. Single handler registered once on mount.
  React.useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const handler = () => nav.back();
    tg.BackButton.onClick(handler);
    return () => { try { tg.BackButton.offClick(handler); } catch (_) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    if (stack.length > 1) tg.BackButton.show();
    else tg.BackButton.hide();
  }, [stack.length]);

  // Hardware/gesture back on Android — intercept popstate so we navigate
  // within the app instead of closing the miniapp.  We push a history
  // entry every time the stack grows; popstate then pops our stack first.
  const prevStackLengthRef = React.useRef(stack.length);
  React.useEffect(() => {
    if (stack.length > prevStackLengthRef.current) {
      // New screen pushed — record a matching browser history entry.
      try { history.pushState({ stackLen: stack.length }, ''); } catch (_) {}
    }
    prevStackLengthRef.current = stack.length;
  }, [stack.length]);
  React.useEffect(() => {
    const onPop = (e) => {
      // If we still have screens to pop, intercept and consume the back.
      // Re-push so the browser doesn't drift past zero (which would close
      // the miniapp on the next hardware back).
      if (prevStackLengthRef.current > 1) {
        e.preventDefault?.();
        nav.back();
        try { history.pushState({ stackLen: prevStackLengthRef.current - 1 }, ''); } catch (_) {}
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Initial history entry so the first popstate doesn't fall off the stack.
  React.useEffect(() => {
    try { history.pushState({ stackLen: 1 }, ''); } catch (_) {}
  }, []);

  // Telegram fires this when the user tries to close the app via swipe-down
  // or the OS back gesture. On non-Home screens, intercept and nav.back().
  React.useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    if (stack.length > 1) {
      tg.enableClosingConfirmation?.();
    } else {
      tg.disableClosingConfirmation?.();
    }
  }, [stack.length]);


  return (
    <NavContext.Provider value={nav}>
      <PhoneStage>
        {/* Layered stage: ShortsTab is always mounted so the 200+ short-tile
            preview videos stay loaded across tab switches. The other screens
            are mounted on demand. visibility:hidden + position:absolute keep
            ShortsTab out of layout while still keeping its <video> elements
            alive in the DOM (no reload on return). */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            visibility: current.screen === 'shorts' ? 'visible' : 'hidden',
            pointerEvents: current.screen === 'shorts' ? 'auto' : 'none',
          }}>
            <window.ShortsTab accent={accent} />
          </div>
          {current.screen !== 'shorts' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              {view}
            </div>
          )}
        </div>
      </PhoneStage>
      {/* Global shorts overlay — opened from artist pages, search, etc.
          Lives above the BottomNav so it covers the whole viewport. */}
      {shortsPlayer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#000',
        }}>
          <window.ShortsPlayerOverlay
            items={shortsPlayer.items}
            pos={shortsPlayer.pos}
            setPos={(p) => setShortsPlayer(s => s ? { ...s, pos: p } : s)}
            onClose={() => setShortsPlayer(null)}
            accent={accent}
          />
        </div>
      )}
      <window.DebugFab />

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
// Uses [data-phone] attribute (set in ui.jsx Phone) so layering wrappers
// between .phone-fill and the Phone div don't break the override.
if (typeof document !== 'undefined' && !document.getElementById('phone-fill-styles')) {
  const s = document.createElement('style');
  s.id = 'phone-fill-styles';
  s.textContent = `
    .phone-fill [data-phone],
    .phone-fill > div {
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
      flex: 1 !important;
    }
  `;
  document.head.appendChild(s);
}

// Error boundary so a crashed screen doesn't leave the user staring at
// black. Shows the error + a back-to-home button. Catches errors from any
// screen below it.
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    console.error('[boundary]', err, info);
    this.setState({ err, info });
    // Make sure the static splash is gone so the user can see the error.
    try { window.__hideSplash && window.__hideSplash(); } catch (_) {}
    // Also feed it into the debug log so the 🐛 panel shows it.
    try {
      window.__debugLog?.push({
        kind: 'POST', path: '(react crash)', ok: false, ms: 0,
        error: String(err && err.message || err),
        data: { stack: (err && err.stack || '').slice(0, 1200), componentStack: (info && info.componentStack || '').slice(0, 1200) },
      });
    } catch (_) {}
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: '#0E0E0F', color: '#fff',
          padding: 24, overflowY: 'auto',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#FF6B4A', marginBottom: 8 }}>UI crashed</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{String(this.state.err && this.state.err.message || this.state.err)}</div>
          <pre style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {String((this.state.err && this.state.err.stack) || '').slice(0, 1500)}
          </pre>
          <pre style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8, marginTop: 8, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {String((this.state.info && this.state.info.componentStack) || '').slice(0, 1500)}
          </pre>
          <button onClick={() => { this.setState({ err: null, info: null }); try { location.reload(); } catch (_) {} }} style={{
            marginTop: 16, padding: '10px 20px',
            background: '#FF7EC8', color: '#000', border: 'none',
            borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary><AppShell /></AppErrorBoundary>
);

window.AppShell = AppShell;
window.NavContext = NavContext;
window.useNav = useNav;
