// Shorts page — Hybrid: grid catalog on top, tap opens swipe-player
// Video page — Title → action-row → artist card → next videos (no comments)

// Single cache key for every consumer of the shorts list — anything that
// uses useShorts must pass this constant so ShortsTab grid and ShortsPlayer
// see the exact same array (preventing index/id mismatch on tap-through).
const SHORTS_LIMIT = 300;

// ── SHORTS TAB ────────────────────────────────────────────────
// The grid and the immersive player live in one component now so the grid
// stays mounted while the player is open — preview videos don't have to
// reload when the user dismisses the player. AppShell additionally keeps
// the whole ShortsTab mounted across tab switches (via visibility:hidden)
// so the loaded video elements aren't blown away by Home/Saved tab clicks.
function ShortsTab({ accent = C.pink }) {
  const shortsState = window.useShorts(SHORTS_LIMIT);
  const allShorts = shortsState.data || [];
  const favState = window.useFavorites();
  const likedIds = new Set((favState.data?.items || []).map(it => Number(it.raw?.content_id ?? it.id)));

  // Player overlay state.
  // playingPos = position in the currently active list (allShorts or shuffled).
  // playOrder  = array of allShorts indices to walk through. null = use sequential.
  const [playingPos, setPlayingPos] = React.useState(null);
  const [playOrder, setPlayOrder] = React.useState(null);

  // While the overlay is open, swap the Telegram BackButton + history entry
  // so back/swipe closes the player instead of leaving the Shorts tab.
  React.useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (playingPos == null) {
      tg?.enableVerticalSwipes?.();
      return undefined;
    }
    tg?.disableVerticalSwipes?.();
    tg?.expand?.();
    // Push a history entry so hardware back is intercepted by popstate.
    try { history.pushState({ shortsOverlay: true }, ''); } catch (_) {}
    const onPop = (e) => { setPlayingPos(null); setPlayOrder(null); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      tg?.enableVerticalSwipes?.();
    };
  }, [playingPos != null]);

  // Filter state — null = default (random shuffle), or one of the named
  // filters: 'newest' | 'best' | 'liked' | 'artist:<name>'.
  const [filter, setFilter] = React.useState(null);
  const [visible, setVisible] = React.useState(20);

  // Reset visible count when the filter changes (otherwise "Load more" leaks
  // state across filter changes and shows confusing tile counts).
  React.useEffect(() => { setVisible(20); }, [filter]);

  // Stable random ordering for the default view. Reshuffled only when the
  // underlying shorts list itself changes (new fetch).
  const randomShorts = React.useMemo(() => {
    const arr = [...allShorts];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [allShorts]);

  // Apply the active filter to produce the rendered list.
  const filteredShorts = React.useMemo(() => {
    if (filter == null) return randomShorts;
    if (filter === 'newest') {
      // Latest first by created_at (raw.created_at), falling back to id.
      return [...allShorts].sort((a, b) => {
        const ta = new Date(a.raw?.created_at || 0).getTime();
        const tb = new Date(b.raw?.created_at || 0).getTime();
        if (ta !== tb) return tb - ta;
        return (b.raw?.id || 0) - (a.raw?.id || 0);
      });
    }
    if (filter === 'best') {
      // Best-effort sort by reaction/like count if backend ever ships it,
      // otherwise by views (proxy for popularity).
      return [...allShorts].sort((a, b) => {
        const la = a.raw?.reaction_count ?? a.raw?.likes ?? a.raw?.views ?? 0;
        const lb = b.raw?.reaction_count ?? b.raw?.likes ?? b.raw?.views ?? 0;
        return lb - la;
      });
    }
    if (filter === 'liked') {
      return allShorts.filter(s => likedIds.has(Number(s.raw?.id ?? s.id)));
    }
    if (filter.startsWith('artist:')) {
      const name = filter.slice('artist:'.length);
      return allShorts.filter(s => s.artist?.name === name);
    }
    return allShorts;
  }, [allShorts, randomShorts, filter, likedIds]);

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

  // Play All — build a shuffled index list spanning all shorts (not filtered),
  // start at position 0. Swiping inside the player walks through the order
  // top-to-bottom, so the counter reads "1/N" and goes to "N/N".
  const onPlayAll = () => {
    if (!allShorts.length) return;
    const order = Array.from({ length: allShorts.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setPlayOrder(order);
    setPlayingPos(0);
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

        {/* Filter chips: Newest / Best / Liked / <artists…>.
            No chip is active by default — tab opens with a random shuffle. */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 14px 6px', overflowX: 'auto' }}>
          <Chip active={filter === 'newest'} accent={accent} onClick={() => setFilter(filter === 'newest' ? null : 'newest')}>Newest</Chip>
          <Chip active={filter === 'best'} accent={accent} onClick={() => setFilter(filter === 'best' ? null : 'best')}>Best</Chip>
          <Chip active={filter === 'liked'} accent={accent} onClick={() => setFilter(filter === 'liked' ? null : 'liked')}>Liked</Chip>
          {artistNames.map(name => (
            <Chip key={name} active={filter === `artist:${name}`} accent={accent} onClick={() => setFilter(filter === `artist:${name}` ? null : `artist:${name}`)}>{name}</Chip>
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

        {/* 2-column grid of shorts (capped to `visible`).
            Tap on a tile opens the player in sequential mode over the
            *filtered* list, so swiping continues through the user's current
            filter (Newest, by-artist, etc.). */}
        <div style={{ padding: '12px 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filteredShorts.slice(0, visible).map((s, i) => (
            <ShortsTile key={s.id} s={s} idx={i} accent={accent} fresh={false}
              onOpen={(pos) => {
                // Use the filtered list as the playback order.
                const order = filteredShorts.map(x => allShorts.indexOf(x));
                setPlayOrder(order);
                setPlayingPos(pos);
              }} />
          ))}
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
        {filter === 'liked' && filteredShorts.length === 0 && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>❤️</div>
            No liked shorts yet — tap the heart on any short to like it.
          </div>
        )}
      </div>
      <BottomNav active="shorts" accent={accent} />
      {/* Overlay player. Grid stays mounted behind, so preview videos keep
          their loaded URLs / video elements between open and close. */}
      {playingPos != null && playOrder && (
        <ShortsPlayer
          accent={accent}
          allShorts={allShorts}
          order={playOrder}
          pos={playingPos}
          setPos={setPlayingPos}
          onClose={() => { setPlayingPos(null); setPlayOrder(null); }}
        />
      )}
    </Phone>
  );
}

function ShortsTile({ s, idx, accent, fresh, onOpen }) {
  return (
    <div onClick={() => onOpen && onOpen(idx)} style={{
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

// Swipe player (fullscreen vertical feed). Rendered as a sibling overlay
// inside ShortsTab so the grid stays mounted behind it.
//
// Two call shapes are supported so the same component drives both the
// ShortsTab overlay (uses `allShorts + order + pos`) and the global
// AppShell overlay (uses a self-contained `items + pos`).
function ShortsPlayer({ accent = C.pink, allShorts, order, items, pos, setPos, onClose }) {
  // Resolve a single `list` array regardless of call shape.
  const list = items || (order ? order.map(i => (allShorts || [])[i]) : (allShorts || []));
  const total = list.length;
  const safePos = Math.max(0, Math.min(total - 1, pos ?? 0));
  const s = list[safePos];
  const goIdx = (newPos) => {
    if (newPos < 0 || newPos >= total) return;
    setPos && setPos(newPos);
  };
  // Aliases so the rest of the function still reads naturally.
  const idx = safePos;
  // Enrich artist with photo from useArtists (same matching by name as other screens).
  const artistsState = window.useArtists();
  const liveArtist = (artistsState.data || []).find(a => a.name === s?.artist?.name);
  const enrichedArtist = liveArtist ? { ...s?.artist, photo: liveArtist.photo, profilePhoto: liveArtist.profilePhoto } : s?.artist;

  // Hooks must run unconditionally — handle the "no short" branch later.
  const contentId = s?.raw?.id ?? s?.id;
  const reactionsState = window.useReactions(contentId);
  const reactions = reactionsState.data || { counts: {}, user_reactions: [] };
  const serverHearted = (reactions.user_reactions || []).includes('❤️');
  const serverHeartCount = reactions.counts?.['❤️'] || 0;
  const favStatus = window.useFavoriteStatus(contentId);

  // One source of truth: a tap on the heart toggles BOTH the public reaction
  // (so the count updates for everyone) AND the user's personal favorites
  // (so the short shows up under Saved → Liked shorts). The button's filled
  // state follows the favorite, since that's the user-personal side; the
  // count tracks public reactions.
  const [likeOverride, setLikeOverride] = React.useState({});
  const [followed, setFollowed] = React.useState(false);

  const localLiked = likeOverride[contentId];
  const isLiked = localLiked != null ? localLiked : (favStatus.favorited || serverHearted);
  // Heart counter: server total, adjusted by ±1 while the optimistic flip
  // hasn't yet been confirmed.
  const heartCount = serverHeartCount + (
    localLiked == null ? 0 :
    localLiked && !serverHearted ? 1 :
    !localLiked && serverHearted ? -1 : 0
  );

  if (!s) return null;

  const onLike = () => {
    const next = !isLiked;
    setLikeOverride(o => ({ ...o, [contentId]: next }));
    // Fire both in parallel — independent endpoints, rollback only if both fail.
    Promise.all([
      window.actionReact(contentId, '❤️'),
      window.actionFavoriteToggle(contentId),
    ]).then(([r1, r2]) => {
      if (!r1.ok && !r2.ok) {
        setLikeOverride(o => ({ ...o, [contentId]: !next }));
        console.warn('[like]', { react: r1, fav: r2 });
      }
    });
  };
  const onFollow = () => {
    setFollowed(f => !f);
    window.actionFollow(s.artist.name).then(r => {
      if (!r.ok) { setFollowed(f => !f); console.warn('[follow]', r); }
    });
  };

  const actionButtons = [
    {
      icon: isLiked ? <Ico.heartFilled /> : <Ico.heart />,
      label: compactNum(Math.max(0, heartCount)),
      color: isLiked ? accent : '#fff',
      onClick: onLike,
    },
  ];

  // Vertical swipe between shorts — TikTok-style. Up = next, down = prev.
  // We attach a native touch listener (not React's synthetic one) so we can
  // call preventDefault — needed in Telegram WebView to stop the gesture
  // from triggering the host's vertical pull-to-close.
  const swipeStartY = React.useRef(null);
  const swipeContainerRef = React.useRef(null);

  React.useEffect(() => {
    const el = swipeContainerRef.current;
    if (!el) return;
    const onStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      // Ignore touches on overlay buttons so they keep working.
      if (e.target.closest && e.target.closest('button, a, input, .vp-controls')) return;
      swipeStartY.current = t.clientY;
    };
    const onMove = (e) => {
      if (swipeStartY.current == null) return;
      const dy = (e.touches?.[0]?.clientY ?? swipeStartY.current) - swipeStartY.current;
      // After we've started a vertical drag, claim the gesture exclusively.
      if (Math.abs(dy) > 8) {
        try { e.preventDefault(); } catch (_) {}
      }
    };
    const onEnd = (e) => {
      if (swipeStartY.current == null) return;
      const endY = e.changedTouches?.[0]?.clientY ?? swipeStartY.current;
      const dy = endY - swipeStartY.current;
      swipeStartY.current = null;
      if (Math.abs(dy) < 60) return;
      if (dy < 0) goIdx(idx + 1);
      else if (dy > 0) goIdx(idx - 1);
    };
    // passive:false required so preventDefault works.
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [idx, list.length]);

  return (
    <div
      ref={swipeContainerRef}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        touchAction: 'pan-y', overscrollBehavior: 'contain',
      }}
    >
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        {/* Real player fills the whole bleed; key on video.id forces a fresh
            instance per short so swiping actually changes what plays. */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <window.VideoPlayer key={s.id} video={s} accent={accent} fillParent vertical />
        </div>
        {/* Bottom scrim for readable overlay text */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.85) 100%)', pointerEvents: 'none' }} />

        {/* top row: back + counter */}
        <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => onClose && onClose()} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Ico.chevL /></button>
          <div style={{ background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{idx + 1} / {list.length}</div>
          <div style={{ width: 36 }} />
        </div>

        {/* right-side action stack (heart + save only) */}
        <div style={{
          position: 'absolute', right: 12, bottom: 110,
          display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center',
        }}>
          {actionButtons.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <button onClick={b.onClick} style={{
                width: 46, height: 46, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: 'none',
                color: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>{b.icon}</button>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* bottom info card — Follow sits in the same row as name, tight to handle */}
        <div style={{ position: 'absolute', left: 14, right: 78, bottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar artist={enrichedArtist} size={40} ring={accent} />
            <div style={{ minWidth: 0, flex: '0 1 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{s.artist.name}</div>
                <button onClick={onFollow} style={{
                  background: followed ? 'transparent' : accent,
                  color: followed ? accent : '#000',
                  border: followed ? `1px solid ${accent}` : 'none',
                  padding: '4px 12px', borderRadius: 999,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                }}>{followed ? 'Following' : 'Follow'}</button>
              </div>
              <div style={{ fontSize: 11, color: C.muted2, marginTop: 2 }}>{s.artist.handle}</div>
            </div>
          </div>
          {s.label && (
            <div style={{ fontSize: 13, lineHeight: 1.35, marginBottom: 6 }}>{s.label}</div>
          )}
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 0.5 }}>
            {s.views || '0'} views{s.duration ? ` · ${s.duration}` : ''}
          </div>
        </div>
      </div>
    </div>
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
  const passed = nav.params?.video;
  const requestedId = nav.params?.id;
  // Three-tier resolution so any video in the DB opens, no matter how big
  // the catalog gets:
  //  1) `nav.params.video` — the object was handed to us by the tile click
  //     (covers Home / Artist / Saved / Search tiles).
  //  2) `useVideo(id)` — single-row fetch by id (covers deep-links, push
  //     notifications, restored sessions, anything-by-id).
  //  3) Latest list (useVideos(30)) — last-ditch fallback so the screen
  //     doesn't blank out on weird states.
  const liteState = window.useVideos(30);
  const list = liteState.data || [];
  const fetchedState = window.useVideo(passed ? null : requestedId);
  const v = passed || fetchedState.data || list.find(x => String(x.id) === String(requestedId)) || list[0] || VIDEOS[0];
  // "Up next" comes from the lite list, starting after this video if it's
  // there; otherwise just the head of the list.
  const matchedIdx = list.findIndex(x => String(x.id) === String(v?.id));
  const nextUp = matchedIdx >= 0 ? list.slice(matchedIdx + 1, matchedIdx + 5) : list.slice(0, 4);
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
        <div style={{ width: 36 }} />
      </div>

      <VideoPageBody v={v} nextUp={nextUp} accent={accent} />
    </Phone>
  );
}

// Body extracted so it can use hooks on `v.id` cleanly without making the
// outer fallback resolution noisy. Re-mounts when v.id changes via key.
function VideoPageBody({ v, nextUp, accent }) {
  const nav = window.useNav();
  // Pull the live artist record so we get the real photo + counts (not the
  // bare {name, handle, 0, 0} stub embedded on each video row).
  const artistsState = window.useArtists();
  const liveArtist = (artistsState.data || []).find(a => a.name === v.artist?.name) || v.artist;

  const contentId = v.raw?.id ?? v.raw?.content_id ?? v.id;
  const reactionsState = window.useReactions(contentId);
  const reactions = reactionsState.data || { counts: {}, user_reactions: [] };
  const serverHearted = (reactions.user_reactions || []).includes('❤️');
  const serverHeartCount = reactions.counts?.['❤️'] || 0;
  const favStatus = window.useFavoriteStatus(contentId);
  const followStatus = window.useFollowStatus(liveArtist?.name);

  // Optimistic state for actions. Like ≠ Save here: Like is the public
  // reaction (counter goes up for everyone), Save adds to a playlist.
  const [localLike, setLocalLike] = React.useState(null);
  const [localFollow, setLocalFollow] = React.useState(null);
  const [replay, setReplay] = React.useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = React.useState(false);
  // Local +1 bump on views once the registerView fires. Backend dedupes,
  // so the user only ever pushes the counter once; this just makes the
  // UI reflect that immediately without waiting for a refetch.
  const [viewBump, setViewBump] = React.useState(0);
  React.useEffect(() => {
    const onView = (e) => {
      if (e.detail?.contentId == null) return;
      if (Number(e.detail.contentId) !== Number(contentId)) return;
      if (e.detail.counted) setViewBump(1);
    };
    window.addEventListener('miniapp:view', onView);
    return () => window.removeEventListener('miniapp:view', onView);
  }, [contentId]);
  const viewsDisplay = (Number(v.raw?.views || v.views || 0) || 0) + viewBump;

  const isLiked = localLike != null ? localLike : serverHearted;
  const heartCount = serverHeartCount + (
    localLike == null ? 0 :
    localLike && !serverHearted ? 1 :
    !localLike && serverHearted ? -1 : 0
  );
  const isFollowing = localFollow != null ? localFollow : followStatus.following;

  const onLike = () => {
    const next = !isLiked;
    setLocalLike(next);
    window.actionReact(contentId, '❤️').then(r => {
      if (!r.ok) { setLocalLike(!next); console.warn('[like]', r); }
    });
  };
  const onFollow = () => {
    const next = !isFollowing;
    setLocalFollow(next);
    window.actionFollow(liveArtist.name).then(r => {
      if (!r.ok) { setLocalFollow(!next); console.warn('[follow]', r); }
    });
  };
  const onReplay = () => setReplay(r => !r);

  return (
    <div style={SCROLL_BODY}>
      {/* Player. loop prop drives Replay toggle. */}
      <window.VideoPlayer key={v.id} video={v} accent={accent} loop={replay} />

      {/* Title row — kept clean: just the title, no prev/next arrows. */}
      <div style={{ padding: '14px 14px 6px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{v.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: C.muted }}>
          <span>{viewsDisplay} views</span>
          <span>·</span>
          <span>{v.age || 'recent'}</span>
        </div>
      </div>

      {/* Action row — Like (reaction) + Save (playlist picker) + Replay. */}
      <div style={{ padding: '6px 12px 4px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        <ActionPill
          active={isLiked} accent={accent}
          icon={isLiked ? <Ico.heartFilled /> : <Ico.heart />}
          label={compactNum(Math.max(0, heartCount))}
          onClick={onLike}
        />
        <ActionPill
          active={false} accent={accent}
          icon={<Ico.bookmark />}
          label="Save"
          onClick={() => setShowPlaylistPicker(true)}
        />
        <ActionPill
          active={replay} accent={accent}
          icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 21v-5h5" /></svg>}
          label={replay ? 'Replay on' : 'Replay'}
          onClick={onReplay}
        />
      </div>

      {/* Artist card — real photo + counts + working Follow */}
      <div style={{ padding: '12px 14px 6px' }}>
        <div style={{
          background: C.dark2, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div onClick={() => nav.go('artist', { id: liveArtist.id })} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <Avatar artist={liveArtist} size={48} ring={accent} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{liveArtist.name}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {(liveArtist.videos || 0)} videos · {(liveArtist.photos || 0).toLocaleString()} photos
              </div>
            </div>
          </div>
          <button onClick={onFollow} style={{
            background: isFollowing ? 'transparent' : accent,
            color: isFollowing ? accent : '#000',
            border: isFollowing ? `1px solid ${accent}` : 'none',
            padding: '8px 14px', borderRadius: 999,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', fontFamily: 'inherit',
          }}>{isFollowing ? '✓ Following' : '+ Follow'}</button>
        </div>
      </div>

      {/* "Up next" header */}
      <div style={{ padding: '14px 14px 4px' }}>
        <SectionHeader title="Up next" accent={accent} action="" />
      </div>

      {/* Next videos list */}
      <div style={{ padding: '6px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {nextUp.map((nv) => (
          <CompactRow key={nv.id} v={nv} accent={accent} />
        ))}
      </div>

      {/* Playlist picker modal */}
      {showPlaylistPicker && (
        <PlaylistPicker
          contentId={contentId}
          accent={accent}
          onClose={() => setShowPlaylistPicker(false)}
        />
      )}
    </div>
  );
}

// Compact action pill used in the VideoPage action row.
function ActionPill({ icon, label, active, accent, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${accent}22` : C.dark3,
      border: active ? `1px solid ${accent}` : `1px solid ${C.border}`,
      color: active ? accent : C.text,
      padding: '8px 12px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap', cursor: 'pointer',
      fontFamily: 'inherit',
    }}>{icon}<span>{label}</span></button>
  );
}

// Modal picker: pick an existing playlist OR create a new one for this video.
function PlaylistPicker({ contentId, accent, onClose }) {
  const state = window.useUserPlaylists();
  const playlists = state.data?.playlists || [];
  const [busy, setBusy] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  const add = async (playlistId) => {
    setBusy(true);
    const r = await window.actionAddToPlaylist(playlistId, contentId);
    setBusy(false);
    if (!r.ok) alert(r.error || 'Could not add to playlist');
    else onClose();
  };
  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const r = await window.actionCreatePlaylist(name, contentId);
    setBusy(false);
    if (!r.ok) alert(r.error || 'Could not create playlist');
    else onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480,
        background: C.dark2,
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '16px 16px calc(20px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1 }}>Add to playlist</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: C.muted,
            fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Existing playlists */}
        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
          {playlists.length === 0 && !state.loading && (
            <div style={{ padding: '20px 4px', color: C.muted, fontSize: 13, textAlign: 'center' }}>
              You don't have any playlists yet.
            </div>
          )}
          {playlists.map(p => (
            <button key={p.id} disabled={busy} onClick={() => add(p.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '10px 12px',
              marginBottom: 8, cursor: 'pointer',
              fontFamily: 'inherit', color: C.text, textAlign: 'left',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.dark3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
                <Ico.play />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.item_count || 0} videos</div>
              </div>
              <span style={{ color: C.muted, fontSize: 16 }}>+</span>
            </button>
          ))}
        </div>

        {/* New playlist row */}
        {!creating ? (
          <button onClick={() => setCreating(true)} disabled={busy} style={{
            width: '100%', background: 'transparent', color: accent,
            border: `1px dashed ${accent}55`, borderRadius: 12, padding: '12px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}><Ico.plus /> New playlist</button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Playlist name"
              style={{
                flex: 1, background: C.dark3, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '10px 12px', color: C.text,
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={create} disabled={busy || !newName.trim()} style={{
              background: accent, color: '#000', border: 'none',
              padding: '10px 16px', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: busy || !newName.trim() ? 0.5 : 1,
            }}>Create</button>
          </div>
        )}
      </div>
    </div>
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

Object.assign(window, { ShortsTab, ShortsPlayer, ShortsPlayerOverlay: ShortsPlayer, VideoPage });
