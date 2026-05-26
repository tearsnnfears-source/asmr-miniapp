// Shorts page — Hybrid: grid catalog on top, tap opens swipe-player
// Video page — Title → action-row → artist card → next videos (no comments)

// Single cache key for every consumer of the shorts list — anything that
// uses useShorts must pass this constant so ShortsTab grid and ShortsPlayer
// see the exact same array (preventing index/id mismatch on tap-through).
const SHORTS_LIMIT = 50;

// ── SHORTS TAB ────────────────────────────────────────────────
function ShortsTab({ accent = C.pink, mode = 'grid' /* 'grid' | 'player' */ }) {
  if (mode === 'player') return <ShortsPlayer accent={accent} />;

  const nav = window.useNav();
  const shortsState = window.useShorts(SHORTS_LIMIT);
  const allShorts = shortsState.data || [];
  const favState = window.useFavorites();
  const savedIds = new Set((favState.data?.items || []).map(it => Number(it.raw?.content_id ?? it.id)));

  // Static filter set; artist pills are appended dynamically below.
  const [filter, setFilter] = React.useState('latest');
  const [visible, setVisible] = React.useState(20);

  // Reset visible count when the filter changes (otherwise "Load more" leaks
  // state across filter changes and shows confusing tile counts).
  React.useEffect(() => { setVisible(20); }, [filter]);

  // Apply the active filter to produce the rendered list.
  const filteredShorts = React.useMemo(() => {
    if (filter === 'latest') return allShorts;
    if (filter === 'most-liked') {
      // No reaction-count field on /miniapp/shorts response yet, so this is
      // a best-effort: sort by views which usually correlates. Once the
      // backend exposes per-content reaction totals we can switch to that.
      return [...allShorts].sort((a, b) => (b.raw?.views || 0) - (a.raw?.views || 0));
    }
    if (filter === 'saved') {
      return allShorts.filter(s => savedIds.has(Number(s.raw?.id ?? s.id)));
    }
    if (filter.startsWith('artist:')) {
      const name = filter.slice('artist:'.length);
      return allShorts.filter(s => s.artist?.name === name);
    }
    return allShorts;
  }, [allShorts, filter, savedIds]);

  // Unique artist names appearing in the loaded shorts list — for dynamic
  // artist pills. Capped to keep the chip row short.
  const artistNames = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of allShorts) {
      const n = s.artist?.name;
      if (!n || seen.has(n)) continue;
      seen.add(n); out.push(n);
      if (out.length >= 10) break;
    }
    return out;
  }, [allShorts]);

  const onPlayAll = () => {
    // Shuffled index list, opens first shuffled idx. The shuffled order is
    // passed through nav.params.order so ShortsPlayer can render it.
    const order = Array.from({ length: filteredShorts.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (!order.length) return;
    // Map shuffled positions back to global useShorts indices so the player
    // can find the right entry in the same cached array.
    const globalIndexFor = (i) => {
      const s = filteredShorts[i];
      return allShorts.indexOf(s);
    };
    nav.go('shorts-player', { idx: globalIndexFor(order[0]), shuffleOrder: order.map(globalIndexFor) });
  };

  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Section header */}
        <div style={{ padding: '14px 14px 6px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1.4, lineHeight: 1 }}>
            <span style={{ color: accent }}>Shorts</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{allShorts.length} clips · all artists</div>
        </div>

        {/* Filter chips: Latest / Most Liked / Saved / <artists…> */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 14px 6px', overflowX: 'auto' }}>
          <Chip active={filter === 'latest'} accent={accent} onClick={() => setFilter('latest')}>Latest</Chip>
          <Chip active={filter === 'most-liked'} accent={accent} onClick={() => setFilter('most-liked')}>Most Liked</Chip>
          <Chip active={filter === 'saved'} accent={accent} onClick={() => setFilter('saved')}>Saved</Chip>
          {artistNames.map(name => (
            <Chip key={name} active={filter === `artist:${name}`} accent={accent} onClick={() => setFilter(`artist:${name}`)}>{name}</Chip>
          ))}
        </div>

        {/* Featured "Play all" row — shuffled */}
        <div style={{ padding: '8px 14px 6px' }}>
          <div onClick={onPlayAll} style={{
            background: `linear-gradient(110deg, ${accent}22 0%, ${C.purple}1a 100%)`,
            border: `1px solid ${accent}55`,
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Play all · shuffled</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Continuous feed · random order</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onPlayAll(); }} style={{
              width: 44, height: 44, borderRadius: '50%',
              background: accent, border: 'none', color: '#000',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: `0 4px 12px ${accent}55`,
            }}>
              <Ico.play />
            </button>
          </div>
        </div>

        {/* 2-column grid of shorts (capped to `visible`) */}
        <div style={{ padding: '12px 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filteredShorts.slice(0, visible).map((s) => {
            const globalIdx = allShorts.indexOf(s);
            return (
              <ShortsTile key={s.id} s={s} idx={globalIdx} accent={accent} fresh={globalIdx < 2} />
            );
          })}
        </div>
        {visible < filteredShorts.length && (
          <div style={{ padding: '4px 14px 18px' }}>
            <button onClick={() => setVisible(v => v + 20)} style={{
              width: '100%',
              background: 'transparent',
              color: accent,
              border: `1px solid ${accent}55`,
              borderRadius: 12,
              padding: '12px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Load more ({filteredShorts.length - visible} left)</button>
          </div>
        )}
        {filter === 'saved' && filteredShorts.length === 0 && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
            No saved shorts yet — tap the bookmark icon on any short to save.
          </div>
        )}
      </div>
      <BottomNav active="shorts" accent={accent} />
    </Phone>
  );
}

function ShortsTile({ s, idx, accent, fresh }) {
  const nav = window.useNav();
  // Pass the index, not the id — ShortsPlayer reads the same useShorts list
  // and opens by index, so we never mismatch on string-vs-number id quirks.
  return (
    <div onClick={() => nav.go('shorts-player', { idx })} style={{
      position: 'relative', aspectRatio: '9/16', borderRadius: 14,
      overflow: 'hidden', background: '#161617', cursor: 'pointer',
    }}>
      {/* Real video preview (lazy-loaded, muted, looping). Falls back to
          static thumb if /content/play fails. */}
      <window.ShortsThumbVideo short={s} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none' }} />
      {/* duration top-right (hide if backend didn't ship one) */}
      {s.duration && (
        <span style={{ position: 'absolute', right: 7, top: 7, background: 'rgba(0,0,0,0.78)', padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{s.duration}</span>
      )}
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
  // Same cache key as ShortsTab so we share one list — open by index to
  // guarantee we hit the exact short the user tapped.
  const shortsState = window.useShorts(SHORTS_LIMIT);
  const list = shortsState.data || [];
  const idx = Math.max(0, Math.min(list.length - 1, nav.params?.idx ?? 0));
  const s = list[idx];
  // Enrich artist with photo from useArtists (same matching by name as other screens).
  const artistsState = window.useArtists();
  const liveArtist = (artistsState.data || []).find(a => a.name === s?.artist?.name);
  const enrichedArtist = liveArtist ? { ...s?.artist, photo: liveArtist.photo, profilePhoto: liveArtist.profilePhoto } : s?.artist;

  // Hooks must run unconditionally — handle the "no short" branch later.
  const contentId = s?.raw?.id ?? s?.id;
  const reactionsState = window.useReactions(contentId);
  const reactions = reactionsState.data || { counts: {}, user_reactions: [] };
  const heartCount = reactions.counts?.['❤️'] || 0;
  const userHearted = (reactions.user_reactions || []).includes('❤️');
  const favStatus = window.useFavoriteStatus(contentId);
  const [followed, setFollowed] = React.useState(false);

  if (!s) return null;

  const onHeart = async () => {
    const r = await window.actionReact(contentId, '❤️');
    if (!r.ok) console.warn('[react]', r);
  };
  const onSave = async () => {
    const r = await window.actionFavoriteToggle(contentId);
    if (!r.ok) console.warn('[fav]', r);
  };
  const onFollow = async () => {
    setFollowed(f => !f);
    const r = await window.actionFollow(s.artist.name);
    if (!r.ok) { setFollowed(f => !f); console.warn('[follow]', r); }
  };

  const actionButtons = [
    {
      icon: userHearted ? <Ico.heartFilled /> : <Ico.heart />,
      label: compactNum(heartCount) || '0',
      color: userHearted ? accent : '#fff',
      onClick: onHeart,
    },
    {
      icon: <Ico.bookmark />,
      label: favStatus.favorited ? 'Saved' : 'Save',
      color: favStatus.favorited ? accent : '#fff',
      onClick: onSave,
    },
    {
      icon: <Ico.share />,
      label: 'Share',
      color: '#fff',
      onClick: () => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`;
        window.Telegram?.WebApp?.openLink?.(url) || window.open(url, '_blank');
      },
    },
  ];

  return (
    <Phone>
      {/* No header - immersive */}
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        {/* Real player fills the whole bleed; thumb is its poster. */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <window.VideoPlayer video={s} accent={accent} fillParent vertical />
        </div>
        {/* Bottom scrim for readable overlay text */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.85) 100%)', pointerEvents: 'none' }} />

        {/* top row: back + counter */}
        <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => nav.back()} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Ico.chevL /></button>
          <div style={{ background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{idx + 1} / {list.length}</div>
          <button style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Ico.more /></button>
        </div>

        {/* right-side action stack */}
        <div style={{
          position: 'absolute', right: 12, top: '40%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center',
        }}>
          {actionButtons.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <button onClick={b.onClick} style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: 'none',
                color: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>{b.icon}</button>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* bottom info card */}
        <div style={{ position: 'absolute', left: 14, right: 78, bottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar artist={enrichedArtist} size={36} ring={accent} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.artist.name}</div>
              <div style={{ fontSize: 10, color: C.muted2 }}>{s.artist.handle}</div>
            </div>
            <button onClick={onFollow} style={{
              background: followed ? 'transparent' : accent,
              color: followed ? accent : '#000',
              border: followed ? `1px solid ${accent}` : 'none',
              padding: '6px 14px', borderRadius: 999,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              flexShrink: 0,
            }}>{followed ? 'Following' : 'Follow'}</button>
          </div>
          {s.label && (
            <div style={{ fontSize: 13, lineHeight: 1.35, marginBottom: 6 }}>{s.label}</div>
          )}
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 0.5 }}>
            {s.views || '0'} views{s.duration ? ` · ${s.duration}` : ''}
          </div>
        </div>
      </div>
    </Phone>
  );
}

// Compact number → "12K" / "1.2M" / etc.
function compactNum(n) {
  n = +n || 0;
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1_000_000) return Math.round(n / 1000) + 'K';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
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
