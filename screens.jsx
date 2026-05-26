// Shorts page — Hybrid: grid catalog on top, tap opens swipe-player
// Video page — Title → action-row → artist card → next videos (no comments)

// ── SHORTS TAB ────────────────────────────────────────────────
function ShortsTab({ accent = C.pink, mode = 'grid' /* 'grid' | 'player' */ }) {
  if (mode === 'player') return <ShortsPlayer accent={accent} />;

  // Paginated load: start with 20, +20 per "Load more" tap.
  const [limit, setLimit] = React.useState(20);
  const shortsState = window.useShorts(limit);
  // Enrich each short with the artist photo when API didn't ship a thumbnail.
  const artistsState = window.useArtists();
  const shorts = React.useMemo(() => {
    const list = shortsState.data || [];
    const byName = new Map((artistsState.data || []).map(a => [a.name, a]));
    return list.map(s => {
      if (s.thumb?.src) return s; // already has a real thumb URL
      const artist = byName.get(s.artist?.name);
      const photo = artist?.profilePhoto || artist?.photo;
      if (!photo) return s;
      return {
        ...s,
        thumb: {
          bg: `url('${photo.replace(/'/g, "\\'")}') center/cover no-repeat`,
          dot: '#FF7EC8',
          src: photo,
        },
      };
    });
  }, [shortsState.data, artistsState.data]);

  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Section header */}
        <div style={{ padding: '14px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1.4, lineHeight: 1 }}>
              <span style={{ color: accent }}>Shorts</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{shorts.length} clips · all artists</div>
          </div>
          <button style={{
            background: C.dark3, border: `1px solid ${C.border2}`,
            padding: '7px 12px', borderRadius: 999, color: C.text,
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}>
            <Ico.filter /> Filter
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px 6px', overflowX: 'auto' }}>
          <Chip active accent={accent}>Latest</Chip>
          <Chip accent={accent}>Trending</Chip>
          <Chip accent={accent}>Saved artists</Chip>
          <Chip accent={accent}>Heyhelen</Chip>
          <Chip accent={accent}>Mar1o</Chip>
        </div>

        {/* Featured "Play all" row */}
        <div style={{ padding: '8px 14px 6px' }}>
          <div style={{
            background: `linear-gradient(110deg, ${accent}22 0%, ${C.purple}1a 100%)`,
            border: `1px solid ${accent}55`,
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Play all · swipe through</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Continuous feed · all newest first</div>
            </div>
            <button style={{
              width: 44, height: 44, borderRadius: '50%',
              background: accent, border: 'none', color: '#000',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: `0 4px 12px ${accent}55`,
            }}>
              <Ico.play />
            </button>
          </div>
        </div>

        {/* 2-column grid of shorts */}
        <div style={{ padding: '12px 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {shorts.map((s, i) => (
            <ShortsTile key={s.id} s={s} accent={accent} fresh={i < 2} />
          ))}
        </div>
        {/* Load more */}
        {shorts.length >= limit && (
          <div style={{ padding: '4px 14px 18px' }}>
            <button onClick={() => setLimit(l => l + 20)} style={{
              width: '100%',
              background: 'transparent',
              color: accent,
              border: `1px solid ${accent}55`,
              borderRadius: 12,
              padding: '12px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>{shortsState.loading ? 'Loading…' : 'Load more'}</button>
          </div>
        )}
      </div>
      <BottomNav active="shorts" accent={accent} />
    </Phone>
  );
}

function ShortsTile({ s, accent, fresh }) {
  const nav = window.useNav();
  return (
    <div onClick={() => nav.go('shorts-player', { id: s.id })} style={{
      position: 'relative', aspectRatio: '9/16', borderRadius: 14,
      overflow: 'hidden', background: s.thumb.bg, cursor: 'pointer',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
      {/* duration top-right */}
      <span style={{ position: 'absolute', right: 7, top: 7, background: 'rgba(0,0,0,0.78)', padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{s.duration}</span>
      {fresh && (
        <span style={{ position: 'absolute', left: 7, top: 7, background: accent, color: '#000', padding: '3px 7px', borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>NEW</span>
      )}
      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Avatar artist={s.artist} size={20} />
          <div style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.artist.name}</div>
        </div>
        <div style={{ fontSize: 10, color: C.muted2, fontWeight: 500 }}>{s.views} views</div>
      </div>
    </div>
  );
}

// Swipe player (fullscreen vertical feed)
function ShortsPlayer({ accent = C.pink }) {
  const nav = window.useNav();
  const shortsState = window.useShorts(40);
  const list = shortsState.data || [];
  const requestedId = nav.params?.id;
  const s = list.find(x => String(x.id) === String(requestedId)) || list[0] || SHORTS[0];
  if (!s) return null;
  return (
    <Phone>
      {/* No header - immersive */}
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        {/* current short — full bleed */}
        <div style={{ position: 'absolute', inset: 0, background: s.thumb.bg }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.85) 100%)' }} />
        </div>

        {/* top row: back + counter */}
        <div style={{ position: 'absolute', top: 50, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => nav.back()} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Ico.chevL /></button>
          <div style={{ background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>1 / 410</div>
          <button style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Ico.more /></button>
        </div>

        {/* swipe hint */}
        <div style={{
          position: 'absolute', right: 12, top: '40%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center',
        }}>
          {[
            { icon: <Ico.heartFilled />, label: '12K', color: accent },
            { icon: <Ico.bookmark />, label: 'Save', color: '#fff' },
            { icon: <Ico.share />, label: 'Share', color: '#fff' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <button style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: 'none',
                color: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>{b.icon}</button>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* bottom info card */}
        <div style={{ position: 'absolute', left: 14, right: 78, bottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar artist={s.artist} size={32} ring={accent} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.artist.name}</div>
              <div style={{ fontSize: 10, color: C.muted2 }}>{s.artist.handle}</div>
            </div>
            <button style={{
              marginLeft: 'auto',
              background: accent, color: '#000', border: 'none',
              padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>Follow</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.35, marginBottom: 6 }}>{s.label} · slow trigger sounds for late-night winding down</div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 0.5 }}>{s.views} views · {s.duration}</div>
        </div>

        {/* progress bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', width: '34%', background: accent }} />
        </div>
      </div>
    </Phone>
  );
}

// ── VIDEO PAGE ────────────────────────────────────────────────
function VideoPage({ accent = C.pink, density = 'comfortable' }) {
  const nav = window.useNav();
  const videosState = window.useVideos(500);
  const list = videosState.data || [];
  const requestedId = nav.params?.id;
  const idx = Math.max(0, list.findIndex(x => String(x.id) === String(requestedId)));
  const v = list[idx] || list[0] || VIDEOS[0];
  const nextUp = list.slice(idx + 1, idx + 5);
  if (!v) return null;
  return (
    <Phone>
      {/* Slim back bar (replaces header on watch screen) */}
      <div style={{
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, background: C.dark,
      }}>
        <button onClick={() => nav.back()} style={{
          width: 36, height: 36, borderRadius: 12,
          background: C.dark2, border: `1px solid ${C.border}`,
          color: C.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Ico.chevL /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button style={iconBtnSmall}><Ico.search /></button>
          <button style={iconBtnSmall}><Ico.more /></button>
        </div>
      </div>

      <div style={SCROLL_BODY}>
        {/* Player area — real video element with HLS support, mounted on demand */}
        <window.VideoPlayer video={v} accent={accent} />


        {/* TITLE with prev/next arrows beside */}
        <div style={{ padding: '14px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <button style={navBtn}><Ico.chevL /></button>
            <div style={{ flex: 1, fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{v.title}</div>
            <button style={navBtn}><Ico.chevR /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
            <span style={{ color: accent, fontWeight: 600 }}>{v.artist.handle}</span>
            <span>·</span>
            <span>{v.views} views</span>
            <span>·</span>
            <span>{v.age}</span>
            <span style={{
              marginLeft: 6,
              fontSize: 9, padding: '2px 6px', background: `${accent}22`, color: accent, borderRadius: 4, fontWeight: 700, letterSpacing: 0.5,
            }}>2/47 LATEST</span>
          </div>
        </div>

        {/* Action row */}
        <div style={{ padding: '6px 12px 4px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[
            { icon: <Ico.heartFilled />, label: '150K', active: true },
            { icon: <Ico.bookmark />, label: 'Save' },
            { icon: <Ico.share />, label: 'Share' },
            { icon: <Ico.plus />, label: 'Follow' },
          ].map((b, i) => (
            <button key={i} style={{
              background: b.active ? `${accent}22` : C.dark3,
              border: b.active ? `1px solid ${accent}` : `1px solid ${C.border}`,
              color: b.active ? accent : C.text,
              padding: '8px 12px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700,
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}>{b.icon}<span>{b.label}</span></button>
          ))}
        </div>

        {/* Artist card */}
        <div style={{ padding: '12px 14px 6px' }}>
          <div onClick={() => nav.go('artist', { id: v.artist.id })} style={{
            background: C.dark2, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 12,
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <Avatar artist={v.artist} size={48} ring={accent} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                {v.artist.name}
                {v.artist.fresh && <span style={{ color: accent }}><Ico.sparkle /></span>}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{v.artist.videos} videos · {v.artist.photos.toLocaleString()} photos</div>
            </div>
            <button style={{
              background: accent, color: '#000', border: 'none',
              padding: '8px 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>Follow</button>
          </div>
        </div>

        {/* "Up next" header */}
        <div style={{ padding: '14px 14px 4px' }}>
          <SectionHeader title="Up next" accent={accent} action="Autoplay ON" />
        </div>

        {/* Next videos list */}
        <div style={{ padding: '6px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nextUp.map((nv) => (
            <CompactRow key={nv.id} v={nv} accent={accent} />
          ))}
        </div>
      </div>
    </Phone>
  );
}

const navBtn = {
  width: 32, height: 32, borderRadius: 10,
  background: C.dark3,
  border: `1px solid ${C.border2}`,
  color: C.text, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

const iconBtnSmall = {
  width: 34, height: 34, borderRadius: 10,
  background: 'transparent',
  border: `1px solid ${C.border}`,
  color: C.text, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

Object.assign(window, { ShortsTab, ShortsPlayer, VideoPage });
