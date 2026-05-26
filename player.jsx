// VideoPlayer — direct port of openVideoPlayer() from the live miniapp.
// Key details that differ from a naive setup:
//   - hls.loadSource(url) is called *inside* the MEDIA_ATTACHED handler,
//     not right after attachMedia(). This avoids an Android race condition
//     where loadSource races attachMedia and the video never starts.
//   - Safari/iOS uses native HLS (video.canPlayType('application/vnd.apple.mpegurl')).
//   - Android always uses hls.js even if native HLS works (live miniapp does
//     this and it's more reliable on Android).
//   - Recovery: NETWORK_ERROR → startLoad after 1s, MEDIA_ERROR → recoverMediaError.
//     After 3 fatal events, give up.
//   - tryPlay() starts muted to dodge Android's autoplay block, then unmutes
//     on the play promise resolve.

// Module-level cache of resolved playable URLs. The /miniapp/content/play
// endpoint takes ~300-600ms and the URLs themselves last several minutes,
// so reusing the cached one when the user navigates back-and-forth is a
// huge UX win (shorts grid → player → back → grid no longer re-fetches).
const _playableCache = new Map(); // contentId → { url, ts, promise? }
const PLAYABLE_TTL_MS = 5 * 60 * 1000;

async function fetchPlayableContent(contentId) {
  if (contentId == null) {
    const err = new Error('Open from Telegram to watch');
    err.status = 403;
    throw err;
  }
  // Cache hit: hand back the URL without a round-trip.
  const cached = _playableCache.get(contentId);
  if (cached?.url && Date.now() - cached.ts < PLAYABLE_TTL_MS) {
    return { url: cached.url, cached: true };
  }
  // De-dup parallel calls for the same id.
  if (cached?.promise) return cached.promise;

  const initData = window.getInitData();
  if (!initData) {
    const err = new Error('Open from Telegram to watch');
    err.status = 403;
    throw err;
  }
  const p = (async () => {
    const res = await fetch(`${window.API_BASE}/miniapp/content/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, content_id: contentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      _playableCache.delete(contentId);
      const err = new Error(data.error || 'Video unavailable');
      err.status = res.status;
      throw err;
    }
    _playableCache.set(contentId, { url: data.url, ts: Date.now() });
    return data;
  })();
  _playableCache.set(contentId, { promise: p });
  return p;
}

// Prefetch a list of content_ids in the background. Used to warm shorts
// previews before the user opens the tab — concurrency capped so we don't
// hammer the backend with 50 parallel requests.
async function prefetchPlayable(ids, concurrency = 3) {
  const queue = ids.slice();
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const id = queue.shift();
      if (id == null) continue;
      try { await fetchPlayableContent(id); } catch (_) {}
    }
  });
  await Promise.all(workers);
}

function VideoPlayer({ video, accent, fillParent = false, vertical = false, autoStart = false, loop = false }) {
  const v = video;
  const [phase, setPhase] = React.useState('idle'); // 'idle' | 'loading' | 'playing' | 'error'
  const [errorMsg, setErrorMsg] = React.useState('');
  const videoRef = React.useRef(null);
  const hlsRef = React.useRef(null);
  const viewFiredRef = React.useRef(false);
  const posterUrl = v.thumb?.src || '';

  // Cleanup on unmount
  React.useEffect(() => () => {
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch (_) {} hlsRef.current = null; }
  }, []);

  // For shorts: auto-start playback as soon as the surface is mounted.
  // Avoids a redundant tap on a vertical immersive player.
  React.useEffect(() => {
    if ((vertical || autoStart) && phase === 'idle') {
      onPlayTap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.id]);

  const onPlayTap = async () => {
    if (phase === 'loading') return;
    setPhase('loading');
    setErrorMsg('');

    // Resolve a numeric backend content_id. Prefer raw.id / raw.content_id
    // (the unmodified server value); fall back to the normalized v.id.
    const contentId = v.raw?.id ?? v.raw?.content_id ?? v.id;
    if (contentId == null) {
      setPhase('error');
      setErrorMsg('No content id');
      return;
    }

    let url = '';
    try {
      const data = await fetchPlayableContent(contentId);
      url = data.url || '';
    } catch (e) {
      console.warn('[player] fetch failed:', e.status, e.message);
      setPhase('error');
      setErrorMsg(e.status === 403 ? 'Open from Telegram' : (e.message || 'Video unavailable'));
      return;
    }
    if (!url) {
      setPhase('error');
      setErrorMsg('Video unavailable');
      return;
    }

    // Mount the <video> first so the ref is wired up, then start HLS.
    setPhase('playing');

    // Wait one frame so React commits the <video> before we touch it.
    requestAnimationFrame(() => attachStream(url));
  };

  function attachStream(url) {
    const vEl = videoRef.current;
    if (!vEl) {
      console.warn('[player] no video ref');
      return;
    }
    if (posterUrl) vEl.setAttribute('poster', posterUrl);

    // View counter: fire once after the user has watched ≥10s.
    const onTime = () => {
      if (viewFiredRef.current) return;
      if ((vEl.currentTime || 0) >= 10) {
        viewFiredRef.current = true;
        const contentId = v.raw?.id ?? v.raw?.content_id ?? v.id;
        if (contentId != null) window.actionRegisterView?.(contentId);
        vEl.removeEventListener('timeupdate', onTime);
      }
    };
    vEl.addEventListener('timeupdate', onTime);

    const isM3U8 = url.includes('.m3u8') || url.includes('/hls/');
    const nativeHls = vEl.canPlayType('application/vnd.apple.mpegurl') !== '';
    const isAndroid = /android/i.test(navigator.userAgent);
    const hlsAvailable = typeof window.Hls !== 'undefined' && window.Hls.isSupported();

    console.log('[player]', { isM3U8, nativeHls, isAndroid, hlsAvailable, url: url.substring(0, 80) });

    function tryPlay() {
      vEl.muted = true; // Start muted to bypass Android autoplay block.
      const p = vEl.play();
      if (p && p.then) {
        p.then(() => { vEl.muted = false; }).catch(e => {
          console.log('[player] autoplay blocked:', e?.message);
        });
      }
    }

    function showError(msg) {
      setPhase('error');
      setErrorMsg(msg);
    }

    // Strategy mirrors openVideoPlayer() in index.html.html:
    //   Safari/iOS → native HLS (better battery, AirPlay etc)
    //   Android with hls.js → hls.js (more reliable than native)
    //   Native HLS fallback for Android-without-hls.js
    //   mp4/webm → direct src
    if (isM3U8 && nativeHls && !isAndroid) {
      console.log('[player] native HLS (Safari)');
      vEl.src = url;
      tryPlay();
    } else if (isM3U8 && hlsAvailable) {
      console.log('[player] hls.js');
      const Hls = window.Hls;
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        startLevel: -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        manifestLoadingTimeOut: 20000,
        fragLoadingTimeOut: 25000,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        xhrSetup: function (xhr) { xhr.withCredentials = false; },
      });
      hlsRef.current = hls;

      let recovery = 0;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[player] manifest OK');
        tryPlay();
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('[player] hls err:', data.type, data.details, data.fatal);
        if (!data.fatal) return;
        recovery++;
        if (recovery > 3) {
          try { hls.destroy(); } catch (_) {}
          hlsRef.current = null;
          showError('Video failed to load');
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setTimeout(() => hlsRef.current?.startLoad(), 1000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          try { hls.destroy(); } catch (_) {}
          hlsRef.current = null;
          vEl.src = url;
          tryPlay();
        }
      });

      hls.attachMedia(vEl);
      // KEY: wait for MEDIA_ATTACHED before loadSource (Android race fix).
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('[player] media attached, loading source...');
        hls.loadSource(url);
      });
    } else if (isM3U8 && nativeHls) {
      console.log('[player] native HLS (Android)');
      vEl.src = url;
      tryPlay();
    } else if (isM3U8) {
      showError('HLS not supported in this browser');
    } else {
      // mp4 / webm / etc.
      vEl.src = url;
      tryPlay();
    }
  }

  // Layout: shorts/vertical fill the parent; regular videos keep 16:9.
  const containerStyle = fillParent || vertical ? {
    position: 'absolute', inset: 0,
    background: v.thumb?.bg || '#000',
    overflow: 'hidden',
  } : {
    position: 'relative', aspectRatio: '16/9',
    background: v.thumb?.bg || '#000',
    overflow: 'hidden',
  };
  // Vertical shorts: cover the surface (crops a bit but no letterbox).
  // Regular videos: contain (full frame visible).
  const videoFit = vertical ? 'cover' : 'contain';

  return (
    <div style={containerStyle}>
      {phase === 'playing' && (
        <video
          ref={videoRef}
          controls={!vertical}
          playsInline
          webkit-playsinline="true"
          autoPlay={vertical || autoStart}
          loop={vertical || loop}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            background: '#000',
            objectFit: videoFit,
          }}
        />
      )}
      {phase !== 'playing' && (
        <React.Fragment>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
          <button
            onClick={onPlayTap}
            disabled={phase === 'loading'}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 64, height: 64, borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}, #C86BFF)`,
              border: 'none', color: '#000',
              boxShadow: `0 8px 28px ${accent}66`,
              cursor: phase === 'loading' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {phase === 'loading' ? (
              <div style={{
                width: 22, height: 22,
                border: '3px solid rgba(0,0,0,0.2)',
                borderTopColor: '#000',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          {phase === 'error' && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.78)',
              fontSize: 12, fontWeight: 600, textAlign: 'center',
              color: '#FFB4B4',
            }}>
              {errorMsg}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </React.Fragment>
      )}
    </div>
  );
}

// ShortsThumbVideo — muted, looping <video> that previews the actual short.
// Ports hydrateShortVideoThumbs() from the live miniapp: lazy-loads via
// IntersectionObserver so we don't hit /content/play for 20 tiles upfront,
// uses HLS.js for .m3u8 streams. Falls back to s.thumb.bg poster on error.
function ShortsThumbVideo({ short }) {
  const s = short;
  const containerRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const hlsRef = React.useRef(null);
  const [state, setState] = React.useState('idle'); // idle | loading | ready | error

  React.useEffect(() => () => {
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch (_) {} hlsRef.current = null; }
  }, []);

  // Start loading once the tile scrolls near the viewport.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      // SSR / very old browser — just load on mount.
      load();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          io.disconnect();
          load();
        }
      });
    }, { rootMargin: '160px' });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);

  async function load() {
    if (state !== 'idle') return;
    setState('loading');
    const contentId = s.raw?.id ?? s.raw?.content_id ?? s.id;
    if (contentId == null) { setState('error'); return; }
    let url = '';
    try {
      const data = await fetchPlayableContent(contentId);
      url = data.url || '';
      if (!url) throw new Error('no url');
    } catch (e) {
      console.warn('[short-thumb]', e.message);
      setState('error');
      return;
    }
    const vEl = videoRef.current;
    if (!vEl) return;
    vEl.muted = true; vEl.loop = true; vEl.playsInline = true; vEl.preload = 'metadata';
    vEl.setAttribute('playsinline', '');
    vEl.setAttribute('webkit-playsinline', '');
    const markReady = () => { setState('ready'); vEl.play().catch(() => {}); };
    vEl.addEventListener('loadeddata', markReady, { once: true });
    vEl.addEventListener('canplay', markReady, { once: true });
    vEl.addEventListener('error', () => setState('error'), { once: true });

    const isM3U8 = url.includes('.m3u8') || url.includes('/hls/');
    if (isM3U8 && window.Hls && window.Hls.isSupported()) {
      const Hls = window.Hls;
      const hls = new Hls({ enableWorker: false, maxBufferLength: 4, startLevel: -1 });
      hlsRef.current = hls;
      hls.attachMedia(vEl);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
      hls.on(Hls.Events.MANIFEST_PARSED, () => vEl.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          try { hls.destroy(); } catch (_) {}
          hlsRef.current = null;
          setState('error');
        }
      });
    } else {
      vEl.src = url;
      vEl.load();
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Always render <video> so the ref is wired up even before load() fires */}
      <video ref={videoRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        opacity: state === 'ready' ? 1 : 0,
        transition: 'opacity 200ms',
      }} />
      {/* Neutral preloader behind — dark surface + spinner, fades out when ready.
          We intentionally don't fall back to the artist photo so the tile
          doesn't mislead the user into thinking that's the short's content. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#161617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: state === 'ready' ? 0 : 1,
        transition: 'opacity 200ms',
        pointerEvents: 'none',
      }}>
        {state !== 'error' && (
          <div style={{
            width: 28, height: 28,
            border: '2.5px solid rgba(255,255,255,0.1)',
            borderTopColor: 'rgba(255,255,255,0.55)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
      </div>
    </div>
  );
}

// ── PhotoLightbox ─────────────────────────────────────────────
// Full-screen photo viewer. Takes a list of photo items (normalized — id,
// thumb.src) and the current index. ‹ / › navigate, ✕ closes. Resolves the
// real image URL via fetchPlayableContent (same protected pipeline as video)
// and caches per id. Watermark in the bottom-left matches the live miniapp.
function PhotoLightbox({ photos, index, onClose, onNav }) {
  const total = photos?.length || 0;
  const safe = Math.max(0, Math.min(total - 1, index));
  const photo = photos[safe];
  const [url, setUrl] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Like-state for the current photo — uses the same favorites pipeline as
  // videos/shorts. Optimistic flip, rollback on backend failure.
  const contentId = photo?.raw?.id ?? photo?.id;
  const favStatus = window.useFavoriteStatus ? window.useFavoriteStatus(contentId) : { favorited: false };
  const [override, setOverride] = React.useState({});
  const isLiked = override[contentId] != null ? override[contentId] : favStatus.favorited;
  const onLike = () => {
    if (contentId == null) return;
    const next = !isLiked;
    setOverride(o => ({ ...o, [contentId]: next }));
    window.actionFavoriteToggle?.(contentId).then(r => {
      if (!r.ok) {
        setOverride(o => ({ ...o, [contentId]: !next }));
        console.warn('[photo like]', r);
      }
    });
  };

  React.useEffect(() => {
    if (!photo) return;
    let alive = true;
    setLoading(true); setErr(''); setUrl('');
    const id = photo.raw?.id ?? photo.id;
    fetchPlayableContent(id)
      .then(({ url }) => { if (alive) { setUrl(url); setLoading(false); } })
      .catch(e => { if (alive) { setErr(e.status === 403 ? 'Subscribe to view photos' : 'Photo unavailable'); setLoading(false); } });
    return () => { alive = false; };
  }, [photo?.id]);

  // Swipe horizontally to navigate.
  const startX = React.useRef(null);
  const onTouchStart = (e) => { startX.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (e) => {
    if (startX.current == null) return;
    const dx = (e.changedTouches?.[0]?.clientX ?? startX.current) - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && safe < total - 1) onNav(safe + 1);
      else if (dx > 0 && safe > 0) onNav(safe - 1);
    }
  };
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && safe > 0) onNav(safe - 1);
      else if (e.key === 'ArrowRight' && safe < total - 1) onNav(safe + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safe, total, onClose, onNav]);

  if (!photo) return null;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'pan-y',
      }}>
      {/* Counter */}
      <span style={{
        position: 'absolute', top: 'calc(14px + env(safe-area-inset-top, 0px))',
        left: '50%', transform: 'translateX(-50%)',
        fontSize: 13, fontWeight: 600,
        background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 999,
        color: '#fff',
      }}>{safe + 1} / {total}</span>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 'calc(10px + env(safe-area-inset-top, 0px))',
        right: 12,
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
        fontSize: 22, cursor: 'pointer', lineHeight: 1,
      }}>×</button>
      {/* Prev / next arrows */}
      {total > 1 && safe > 0 && (
        <button onClick={() => onNav(safe - 1)} style={lbNavStyle('left')}>‹</button>
      )}
      {total > 1 && safe < total - 1 && (
        <button onClick={() => onNav(safe + 1)} style={lbNavStyle('right')}>›</button>
      )}
      {/* Image */}
      {loading && (
        <div style={{
          width: 36, height: 36,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'rgba(255,255,255,0.55)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      )}
      {err && (
        <div style={{ color: '#FFB4B4', fontSize: 13, textAlign: 'center', padding: 20 }}>{err}</div>
      )}
      {url && (
        <img
          src={url}
          alt=""
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none', pointerEvents: 'none',
          }}
        />
      )}
      {/* Heart button — like = add to favorites (Liked photos tab) */}
      {contentId != null && (
        <button onClick={onLike} style={{
          position: 'absolute',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          right: 16,
          width: 52, height: 52, borderRadius: '50%',
          background: isLiked ? '#FF7EC8' : 'rgba(0,0,0,0.55)',
          border: 'none',
          color: isLiked ? '#000' : '#fff',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isLiked ? '0 8px 24px rgba(255,126,200,0.5)' : '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
            {isLiked
              ? <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
              : <path fill="none" d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />}
          </svg>
        </button>
      )}
      {/* Watermark — same SVG path as the live miniapp lightbox. */}
      <div style={{ position: 'absolute', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', left: 16, pointerEvents: 'none', userSelect: 'none', opacity: 0.28 }}>
        <svg viewBox="50 350 935 420" width="110" height="49" xmlns="http://www.w3.org/2000/svg">
          <path fill="white" d="M54.42 668L249.735 363.5H334.56L408.075 668H322.38L268.005 404.39H301.935L145.335 668H54.42ZM139.68 608.84L174.48 545.33H323.25L332.82 608.84H139.68ZM432.928 668L493.828 363.5H579.958L532.978 599.705H678.268L664.348 668H432.928ZM734.349 668L781.764 431.795H688.239L702.159 363.5H974.904L960.984 431.795H867.894L820.479 668H734.349Z" />
        </svg>
      </div>
    </div>
  );
}
function lbNavStyle(side) {
  return {
    position: 'absolute',
    [side]: 12,
    top: '50%', transform: 'translateY(-50%)',
    width: 40, height: 60,
    background: 'rgba(0,0,0,0.45)',
    border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 28, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

Object.assign(window, { VideoPlayer, ShortsThumbVideo, PhotoLightbox, fetchPlayableContent, prefetchPlayable });
