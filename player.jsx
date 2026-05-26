// VideoPlayer — surface that lazily loads the protected playback URL and
// drives a <video> element (HLS via hls.js, or native for mp4/webm).
//
// Initial state: poster + big Play button (matching the thumb of the card).
// On tap: POST /miniapp/content/play → { url } → mount <video> + autoplay.
// On error: show inline message ("Open from Telegram" if no initData, etc.).

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
  const [state, setState] = React.useState({
    phase: 'idle', // 'idle' | 'loading' | 'playing' | 'error'
    url: '',
    error: '',
  });
  const videoRef = React.useRef(null);
  const hlsRef = React.useRef(null);

  // Clean up HLS when component unmounts or URL changes.
  React.useEffect(() => {
    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch (_) {}
        hlsRef.current = null;
      }
    };
  }, []);

  // When url lands, attach to <video>.
  React.useEffect(() => {
    if (!state.url || !videoRef.current) return;
    const el = videoRef.current;
    const url = state.url;
    const isHls = /\.m3u8(\?|$)/i.test(url);
    if (isHls && window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls();
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(el);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        el.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('[hls] fatal', data);
          setState(s => ({ ...s, phase: 'error', error: 'Playback failed' }));
        }
      });
    } else if (isHls && el.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS WebView — native HLS
      el.src = url;
      el.play().catch(() => {});
    } else {
      // mp4 / webm / etc.
      el.src = url;
      el.play().catch(() => {});
    }
    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch (_) {}
        hlsRef.current = null;
      }
    };
  }, [state.url]);

  const onPlayTap = async () => {
    if (state.phase === 'loading') return;
    setState({ phase: 'loading', url: '', error: '' });
    try {
      const { url } = await fetchPlayableContent(v.raw?.id || v.id);
      setState({ phase: 'playing', url, error: '' });
    } catch (e) {
      console.warn('[play]', e);
      setState({ phase: 'error', url: '', error: e.message || 'Failed' });
    }
  };

  return (
    <div style={{
      position: 'relative', aspectRatio: '16/9',
      background: v.thumb.bg, overflow: 'hidden',
    }}>
      {state.phase === 'playing' && (
        <video
          ref={videoRef}
          controls
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
        />
      )}
      {state.phase !== 'playing' && (
        <React.Fragment>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
          <button
            onClick={onPlayTap}
            disabled={state.phase === 'loading'}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 64, height: 64, borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}, #C86BFF)`,
              border: 'none', color: '#000',
              boxShadow: `0 8px 28px ${accent}66`,
              cursor: state.phase === 'loading' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {state.phase === 'loading' ? (
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
          {state.phase === 'error' && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.78)',
              fontSize: 12, fontWeight: 600, textAlign: 'center',
              color: '#FFB4B4',
            }}>
              {state.error}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </React.Fragment>
      )}
    </div>
  );
}

Object.assign(window, { VideoPlayer, fetchPlayableContent });
