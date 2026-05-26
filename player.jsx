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

function VideoPlayer({ video, accent }) {
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

  const onPlayTap = async () => {
    if (phase === 'loading') return;
    setPhase('loading');
    setErrorMsg('');

    // Resolve a numeric backend content_id. Prefer raw.id (from /miniapp/videos).
    // Falls back to v.id but strips any 'v' prefix we added in normalizeVideo.
    const contentId = v.raw?.id ?? (typeof v.id === 'string' ? v.id.replace(/^v/, '') : v.id);

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

  return (
    <div style={{
      position: 'relative', aspectRatio: '16/9',
      background: v.thumb?.bg || '#000',
      overflow: 'hidden',
    }}>
      {phase === 'playing' && (
        <video
          ref={videoRef}
          controls
          playsInline
          webkit-playsinline="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            background: '#000',
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

Object.assign(window, { VideoPlayer, fetchPlayableContent });
