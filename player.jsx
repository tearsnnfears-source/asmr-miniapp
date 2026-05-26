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

async function fetchPlayableContent(contentId) {
  const initData = window.getInitData();
  if (!initData || !contentId) {
    const err = new Error('Open from Telegram to watch');
    err.status = 403;
    throw err;
  }
  const res = await fetch(`${window.API_BASE}/miniapp/content/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, content_id: contentId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    const err = new Error(data.error || 'Video unavailable');
    err.status = res.status;
    throw err;
  }
  return data;
}

function VideoPlayer({ video, accent, fillParent = false, vertical = false, autoStart = false }) {
  const v = video;
  const [phase, setPhase] = React.useState('idle'); // 'idle' | 'loading' | 'playing' | 'error'
  const [errorMsg, setErrorMsg] = React.useState('');
  const videoRef = React.useRef(null);
  const hlsRef = React.useRef(null);
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
          loop={vertical}
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
      {/* Poster behind, fades out when ready */}
      <div style={{
        position: 'absolute', inset: 0,
        background: short.thumb?.bg || '#161617',
        opacity: state === 'ready' ? 0 : 1,
        transition: 'opacity 200ms',
      }} />
    </div>
  );
}

Object.assign(window, { VideoPlayer, ShortsThumbVideo, fetchPlayableContent });
