// Artists page + Saved/Library page (4 tabs: liked videos, video playlists, liked photos, photo albums)

// Mock saved data
const SAVED_VIDEOS = window.VIDEOS.slice(0, 6).map(v => ({ ...v, savedAt: '2d ago' }));
const VIDEO_PLAYLISTS = [
  { id: 'pl1', name: 'Sleep tonight', count: 14, thumbs: [0,1,2,3] },
  { id: 'pl2', name: 'Late nights', count: 28, thumbs: [4,5,6,7] },
  { id: 'pl3', name: 'Roleplay only', count: 9, thumbs: [2,4,6,0] },
  { id: 'pl4', name: '3DIO collection', count: 41, thumbs: [1,3,5,7] },
];
const LIKED_PHOTOS = Array.from({ length: 18 }, (_, i) => ({
  id: 'p' + i,
  artist: window.ARTISTS[i % window.ARTISTS.length],
  thumb: window.makeThumb(i),
}));
const PHOTO_ALBUMS = [
  { id: 'al1', name: 'Heyhelen · April', count: 84, thumbs: [0,1,2,3], artist: window.ARTISTS[0] },
  { id: 'al2', name: 'Studio shoots', count: 142, thumbs: [4,5,6,7] },
  { id: 'al3', name: 'Cozy mood', count: 56, thumbs: [2,3,4,5] },
  { id: 'al4', name: 'Mar1o gallery', count: 38, thumbs: [1,5,6,2], artist: window.ARTISTS[1] },
];

// ── ARTISTS PAGE ──────────────────────────────────────────────
function ArtistsPage({ accent = C.pink }) {
  const [tab, setTab] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [visible, setVisible] = React.useState(24);
  const artistsState = window.useArtists();
  const statsState = window.useStats();
  const followsState = window.useFollows();
  const artists = artistsState.data || [];
  const stats = statsState.data || { photos: 0, videos: 0, artists: 0 };
  const followedNames = followsState.data?.names || new Set();

  // Filter pipeline: tab (All|Followed) → search query → visible cap.
  const filtered = React.useMemo(() => {
    let list = artists;
    if (tab === 'followed') {
      list = list.filter(a => followedNames.has(a.name));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || (a.handle || '').toLowerCase().includes(q));
    }
    return list;
  }, [artists, tab, query, followedNames]);

  // Reset Load-more when the filters change.
  React.useEffect(() => { setVisible(24); }, [tab, query]);

  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Search bar */}
        <div style={{ padding: '12px 14px 6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.dark2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '10px 12px',
          }}>
            <span style={{ color: C.muted }}><Ico.search /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artists…"
              style={{
                flex: 1, background: 'transparent', border: 'none', color: C.text,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}/>
            {query && (
              <button onClick={() => setQuery('')} style={{
                background: 'transparent', border: 'none', color: C.muted,
                cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* Title + tabs */}
        <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1.2,
          }}>{tab === 'followed' ? 'Followed' : 'All'} <span style={{ color: accent }}>artists</span></div>
          <div style={{ display: 'flex', gap: 4, background: C.dark3, borderRadius: 999, padding: 3 }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'followed', label: 'Followed' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? accent : 'transparent',
                color: tab === t.id ? '#000' : C.muted2,
                border: 'none', padding: '6px 12px',
                borderRadius: 999, fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 14px 12px', fontSize: 12, color: C.lime, fontWeight: 600 }}>
          {stats.photos.toLocaleString()} photos · {stats.videos.toLocaleString()} videos
        </div>

        {/* Empty states */}
        {tab === 'followed' && filtered.length === 0 && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💜</div>
            You aren't following anyone yet — tap the heart on a card.
          </div>
        )}
        {query.trim() && filtered.length === 0 && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No artists match "<b style={{ color: C.text }}>{query}</b>"
          </div>
        )}

        {/* Grid 2-col */}
        <div style={{ padding: '0 14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filtered.slice(0, visible).map(a => <ArtistCard key={a.id} a={a} accent={accent} />)}
        </div>
        {visible < filtered.length && (
          <div style={{ padding: '4px 14px 18px' }}>
            <button onClick={() => setVisible(v => v + 24)} style={{
              width: '100%', background: 'transparent', color: accent,
              border: `1px solid ${accent}55`, borderRadius: 12,
              padding: '12px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Load more ({filtered.length - visible} left)</button>
          </div>
        )}
      </div>
      <BottomNav active="artists" accent={accent} />
    </Phone>
  );
}

function ArtistCard({ a, accent }) {
  const nav = window.useNav();
  const tColor = tagColor(a.tag);
  const photoUrl = a.profilePhoto || a.photo || '';
  const followStatus = window.useFollowStatus(a.name);
  const [localFollow, setLocalFollow] = React.useState(null);
  const isFollowing = localFollow != null ? localFollow : followStatus.following;
  const onHeart = (e) => {
    e.stopPropagation();
    const next = !isFollowing;
    setLocalFollow(next);
    window.actionFollow(a.name).then(r => {
      if (!r.ok) { setLocalFollow(!next); console.warn('[follow]', r); }
    });
  };
  // Card has the artist photo filling its whole area; gradient is only used
  // when no photo is available (still preserves the layout).
  const cardBg = photoUrl
    ? `url('${photoUrl.replace(/'/g, "\\'")}') center/cover no-repeat`
    : `linear-gradient(135deg, ${tColor}, ${C.purple})`;
  return (
    <div onClick={() => nav.go('artist', { id: a.id })} style={{
      position: 'relative', aspectRatio: '3/4', borderRadius: 14,
      overflow: 'hidden', background: cardBg,
      cursor: 'pointer',
    }}>
      {/* Bottom-up scrim so text stays readable on any photo */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.92) 100%)' }} />
      {/* Letter fallback when no photo */}
      {!photoUrl && (
        <div style={{
          position: 'absolute', left: '50%', top: '38%',
          transform: 'translate(-50%, -50%)',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 80, color: 'rgba(255,255,255,0.8)', lineHeight: 1,
        }}>{a.name?.[0]}</div>
      )}
      {/* Priority: READY > NEW > HOT — only one badge at a time, matches main */}
      {a.ready ? (
        <span style={{
          position: 'absolute', left: 8, top: 8,
          background: '#4ADE80', color: '#000',
          fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
          letterSpacing: 0.5, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>▶ IN APP</span>
      ) : a.fresh ? (
        <span style={{
          position: 'absolute', left: 8, top: 8, background: C.lime, color: '#000',
          fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
          letterSpacing: 0.5, textTransform: 'uppercase',
        }}>✨ NEW</span>
      ) : a.hot ? (
        <span style={{
          position: 'absolute', left: 8, top: 8, background: '#FF6B4A', color: '#000',
          fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
          letterSpacing: 0.5, textTransform: 'uppercase',
        }}>🔥 HOT</span>
      ) : null}
      <div style={{ position: 'absolute', right: 8, top: 8 }}>
        <button onClick={onHeart} style={{
          background: isFollowing ? accent : 'rgba(0,0,0,0.55)',
          border: 'none', color: isFollowing ? '#000' : '#fff',
          width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{isFollowing ? <Ico.heartFilled /> : <Ico.heart />}</button>
      </div>
      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.15, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>{a.name}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{a.handle}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 9.5, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          <span>📹 {a.videos}</span>
          <span>📷 {(a.photos || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── SAVED / LIBRARY PAGE ──────────────────────────────────────
function SavedPage({ accent = C.pink, initialTab = 'videos' }) {
  const [tab, setTab] = React.useState(initialTab);
  const favState = window.useFavorites();
  const playlistsState = window.useUserPlaylists();
  const favVideos = favState.data?.videos || [];
  const favShorts = favState.data?.shorts || [];
  const favPhotos = favState.data?.photos || [];
  const playlists = playlistsState.data?.playlists || [];
  const tabs = [
    { id: 'videos', label: 'Liked videos', count: favVideos.length },
    { id: 'playlists', label: 'Playlists', count: playlists.length },
    { id: 'shorts', label: 'Liked shorts', count: favShorts.length },
    { id: 'photos', label: 'Liked photos', count: favPhotos.length },
  ];

  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Library title */}
        <div style={{ padding: '14px 14px 4px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1.2, lineHeight: 1 }}>
            My <span style={{ color: accent }}>library</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            {favVideos.length} videos · {favShorts.length} shorts · {favPhotos.length} photos · {playlists.length} playlists
          </div>
        </div>

        {/* Tab strip — horizontal scrollable pills */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 14px 8px', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? accent : 'transparent',
              color: tab === t.id ? '#000' : C.text,
              border: tab === t.id ? `1px solid ${accent}` : `1px solid ${C.border2}`,
              padding: '7px 12px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                fontSize: 10, opacity: 0.7,
                background: tab === t.id ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)',
                padding: '1px 6px', borderRadius: 999,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'videos' && <LikedVideos accent={accent} />}
        {tab === 'shorts' && <LikedShorts accent={accent} />}
        {tab === 'photos' && <LikedPhotos accent={accent} />}
        {tab === 'playlists' && <VideoPlaylists accent={accent} />}
      </div>
      <BottomNav active="favorites" accent={accent} />
    </Phone>
  );
}

function LikedVideos({ accent }) {
  const nav = window.useNav();
  const favState = window.useFavorites();
  const items = favState.data?.videos || [];
  const [visible, setVisible] = React.useState(8);
  if (favState.loading && !items.length) {
    return (
      <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
        Loading your saves…
      </div>
    );
  }
  if (!items.length) {
    return (
      <div style={{ padding: '40px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No saved videos yet</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Tap the heart on any video to save it for later
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.slice(0, visible).map(v => (
          <div key={v.id} onClick={() => nav.gate(() => nav.go('video', { id: v.id, video: v }))} style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
            <div style={{ width: 130, flexShrink: 0 }}>
              <Thumb thumb={v.thumb} duration={v.duration} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{v.artist.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ color: accent }}><Ico.heartFilled /></span>
                <span style={{ fontSize: 10, color: C.muted }}>{v.age || 'Saved'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {visible < items.length && (
        <div style={{ padding: '4px 14px 18px' }}>
          <button onClick={() => setVisible(v => v + 8)} style={{
            width: '100%', background: 'transparent', color: accent,
            border: `1px solid ${accent}55`, borderRadius: 12, padding: '12px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Load more ({items.length - visible} left)</button>
        </div>
      )}
    </div>
  );
}

// Liked shorts grid — mirrors the Shorts tab layout (9:16 tiles, live video
// preview via ShortsThumbVideo) but pulls from useFavorites().shorts.
function LikedShorts({ accent }) {
  const nav = window.useNav();
  const favState = window.useFavorites();
  const artistsState = window.useArtists();
  // Same artist-photo enrichment as the Shorts grid — saved tiles get real
  // faces instead of letters.
  const items = React.useMemo(() => {
    const raw = favState.data?.shorts || [];
    const byName = new Map((artistsState.data || []).map(a => [a.name, a]));
    return raw.map(s => {
      const live = byName.get(s.artist?.name);
      if (!live) return s;
      return { ...s, artist: { ...s.artist, photo: live.photo, profilePhoto: live.profilePhoto } };
    });
  }, [favState.data, artistsState.data]);
  if (favState.loading && !items.length) {
    return <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading your saved shorts…</div>;
  }
  if (!items.length) {
    return (
      <div style={{ padding: '40px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No saved shorts yet</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Tap the bookmark on any short to save it for later
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '12px 14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {items.map((s, i) => {
        // Non-Pro: blurred static thumb + paywall on tap (no video preview).
        if (!nav.isPro) {
          return (
            <div key={s.id} onClick={() => nav.openPaywall && nav.openPaywall()} style={{
              position: 'relative', aspectRatio: '9/16', borderRadius: 14,
              overflow: 'hidden', background: '#161617', cursor: 'pointer',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                filter: 'blur(7px) brightness(0.7)',
                WebkitFilter: 'blur(7px) brightness(0.7)',
                transform: 'scale(1.08)',
              }}>
                <Thumb thumb={s.thumb} duration={null} />
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${accent}55`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>🔒</div>
              </div>
            </div>
          );
        }
        return (
          <div key={s.id}
            onClick={() => nav.openShorts(items, i)}
            style={{
              position: 'relative', aspectRatio: '9/16', borderRadius: 14,
              overflow: 'hidden', background: '#161617', cursor: 'pointer',
            }}>
            <window.ShortsThumbVideo short={s} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Avatar artist={s.artist} size={20} />
                <div style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.artist.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.muted2, fontWeight: 500 }}>
                <span style={{ color: accent }}><Ico.heartFilled /></span>
                <span>Saved</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CollectionTile({ name, count, thumbs, accent, kind = 'playlist', subtitle, onClick }) {
  // 2x2 mosaic of REAL thumbnails (URL strings). Falls back to a gradient
  // panel for each slot the backend didn't fill (e.g. brand-new empty playlist).
  const slots = (thumbs || []).slice(0, 4);
  while (slots.length < 4) slots.push('');
  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        position: 'relative', aspectRatio: '1/1', borderRadius: 14,
        overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2,
        background: C.dark3,
      }}>
        {slots.map((url, i) => {
          const fallback = window.makeThumb(i).bg;
          return (
            <div key={i} style={{
              position: 'relative',
              background: url
                ? `url('${String(url).replace(/'/g, "\\'")}') center/cover no-repeat`
                : fallback,
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
            </div>
          );
        })}
        <span style={{
          position: 'absolute', right: 8, bottom: 8,
          background: 'rgba(0,0,0,0.78)', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          {kind === 'playlist' ? <Ico.play /> : <span style={{ width: 12, height: 12, borderRadius: 2, border: '1.5px solid #fff', display: 'inline-block' }} />}
          {count}
        </span>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{name}</div>
      {subtitle && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// Live playlists pulled from /miniapp/playlists. The user can create a new
// playlist; tapping a tile opens the playlist screen with all items.
function VideoPlaylists({ accent }) {
  const nav = window.useNav();
  const state = window.useUserPlaylists();
  const playlists = state.data?.playlists || [];
  const [busy, setBusy] = React.useState(false);
  const onCreate = async () => {
    const name = window.prompt('Name your playlist');
    if (!name || !name.trim()) return;
    setBusy(true);
    const r = await window.actionCreatePlaylist(name.trim());
    setBusy(false);
    if (!r.ok) alert(r.error || 'Could not create playlist');
  };
  return (
    <div style={{ padding: '6px 14px 16px' }}>
      <button onClick={onCreate} disabled={busy} style={{
        width: '100%', background: 'transparent', color: accent,
        border: `1px dashed ${accent}55`, borderRadius: 12,
        padding: '12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginBottom: 14, fontFamily: 'inherit',
      }}><Ico.plus /> {busy ? 'Creating…' : 'New playlist'}</button>
      {state.loading && !playlists.length && (
        <div style={{ padding: '24px 6px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading playlists…</div>
      )}
      {!state.loading && !playlists.length && (
        <div style={{ padding: '32px 14px', textAlign: 'center', color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
          No playlists yet — create one to organize your saved videos.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {playlists.map(p => (
          <CollectionTile
            key={p.id}
            name={p.name}
            count={p.item_count || 0}
            thumbs={p.thumbs || []}
            accent={accent}
            kind="playlist"
            subtitle={`${p.item_count || 0} videos`}
            onClick={() => nav.go('playlist', { id: p.id, name: p.name })}
          />
        ))}
      </div>
    </div>
  );
}

// Real liked photos — same shape as Liked videos / Liked shorts, just
// filtered by content_type='photo'. Tapping a tile opens PhotoLightbox.
function LikedPhotos({ accent }) {
  const nav = window.useNav();
  const favState = window.useFavorites();
  const items = favState.data?.photos || [];
  const [visible, setVisible] = React.useState(15);
  const [lightboxIdx, setLightboxIdx] = React.useState(null);
  if (favState.loading && !items.length) {
    return <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading liked photos…</div>;
  }
  if (!items.length) {
    return (
      <div style={{ padding: '40px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No liked photos yet</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Tap the heart in the photo viewer to like a photo.
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '6px 14px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {items.slice(0, visible).map((p, i) => {
          const url = p.thumb?.src || p.raw?.thumbnail_url || '';
          // Non-Pro: blur the thumb and pop paywall on tap. Lightbox stays
          // gated since each /content/play is a paid asset on the backend.
          if (!nav.isPro) {
            return (
              <div key={p.id || i} onClick={() => nav.openPaywall && nav.openPaywall()} style={{
                aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden',
                position: 'relative', cursor: 'pointer', background: '#1a1a1c',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  filter: 'blur(14px) brightness(0.5)',
                  WebkitFilter: 'blur(14px) brightness(0.5)',
                  transform: 'scale(1.15)',
                  background: url
                    ? `url('${url.replace(/'/g, "\\'")}') center/cover no-repeat`
                    : (p.thumb?.bg || '#1a1a1c'),
                }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${accent}55`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13,
                  }}>🔒</div>
                </div>
              </div>
            );
          }
          return (
            <div key={p.id || i} onClick={() => setLightboxIdx(i)} style={{
              aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden',
              position: 'relative', cursor: 'pointer',
              background: url
                ? `url('${url.replace(/'/g, "\\'")}') center/cover no-repeat`
                : (p.thumb?.bg || '#1a1a1c'),
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />
              <div style={{ position: 'absolute', right: 4, bottom: 4, color: accent }}><Ico.heartFilled /></div>
            </div>
          );
        })}
      </div>
      {visible < items.length && (
        <div style={{ padding: '10px 0 16px' }}>
          <button onClick={() => setVisible(v => v + 15)} style={{
            width: '100%', background: 'transparent', color: accent,
            border: `1px solid ${accent}55`, borderRadius: 12, padding: '12px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Load more ({items.length - visible} left)</button>
        </div>
      )}
      {lightboxIdx != null && (
        <window.PhotoLightbox
          photos={items}
          index={lightboxIdx}
          onNav={(i) => setLightboxIdx(i)}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}

// ── PLAYLIST PAGE ─────────────────────────────────────────────
// Items of one playlist. Opened from Saved → Playlists tile tap.
function PlaylistPage({ accent = C.pink }) {
  const nav = window.useNav();
  const playlistId = nav.params?.id;
  const name = nav.params?.name || 'Playlist';
  const state = window.usePlaylistItems(playlistId);
  const items = state.data?.items || [];
  return (
    <Phone>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.dark2, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => nav.back()} style={{
          position: 'relative',
          width: 38, height: 38, borderRadius: 12,
          background: 'transparent', border: 'none',
          color: C.text, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
        }}><Ico.chevL /></button>
        <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center', padding: '0 12px' }}>{name}</span>
        <div style={{ width: 38 }} />
      </div>
      <div style={SCROLL_BODY}>
        {/* Header summary + Play playlist CTA */}
        <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, lineHeight: 1 }}>{name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{items.length} videos</div>
          </div>
          {items.length > 0 && (
            <button onClick={() => nav.gate(() => nav.go('video', { id: items[0].id, video: items[0], queue: items, queueIdx: 0 }))} style={{
              background: accent, color: '#000', border: 'none',
              padding: '10px 16px', borderRadius: 999,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              <Ico.play /> Play
            </button>
          )}
        </div>
        {state.loading && !items.length && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading…</div>
        )}
        {!state.loading && !items.length && (
          <div style={{ padding: '40px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Empty playlist</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Add videos from any video page.
            </div>
          </div>
        )}
        <div style={{ padding: '6px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((v, i) => (
            <div key={v.id}
              onClick={() => nav.gate(() => nav.go('video', { id: v.id, video: v, queue: items, queueIdx: i }))}
              style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
              <div style={{ width: 130, flexShrink: 0 }}>
                <Thumb thumb={v.thumb} duration={v.duration} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{v.artist.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="favorites" accent={accent} />
    </Phone>
  );
}
Object.assign(window, { ArtistsPage, SavedPage, PlaylistPage });
