// Home page — 3 variations
// V1: Feed-first (YouTube-inspired) — clean recommendation feed
// V2: Editorial — hero card + categories + chunked feed
// V3: Mosaic — alt-grid with featured tiles

const PHONE_W = 390, PHONE_H = 844;
const SCROLL_BODY = {
  flex: 1, overflowY: 'auto', overflowX: 'hidden',
  paddingBottom: 8,
};

// ── HOME V1 — Feed-first ──────────────────────────────────────
function HomeV1({ accent = C.pink, density = 'comfortable' }) {
  const chips = ['All', 'Latest', 'Whisper', '3DIO', 'Roleplay', 'Sleep', 'Mouth', 'Tap'];
  const [activeChip, setChip] = React.useState('All');
  const gap = density === 'compact' ? 12 : 18;

  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Subscribe banner — slim */}
        <div style={{ padding: '12px 14px 6px' }}>
          <PromoBanner kind="event" accent={accent} />
        </div>

        {/* Stats strip — compact */}
        <div style={{ padding: '8px 14px 6px' }}>
          <StatsStrip compact />
        </div>

        {/* Chips row */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 14px 6px', overflowX: 'auto' }}>
          {chips.map(c => (
            <Chip key={c} active={c === activeChip} accent={accent} onClick={() => setChip(c)}>{c}</Chip>
          ))}
        </div>

        {/* Feed */}
        <div style={{ padding: '8px 14px 16px', display: 'flex', flexDirection: 'column', gap }}>
          {VIDEOS.slice(0, 5).map((v, i) => (
            <FeedCard key={v.id} v={v} accent={accent} density={density} featured={i === 0} />
          ))}
        </div>
      </div>
      <BottomNav active="home" accent={accent} />
    </Phone>
  );
}

// Cheap hook: pulls the live artist record (with photo) by name. The
// normalizeVideo output only carries {id, name, handle}, so video tiles
// would otherwise show a letter avatar. useArtists is module-cached, so
// the lookup is effectively O(N) once and free thereafter.
function useEnrichedArtist(artist) {
  const artistsState = window.useArtists();
  if (!artist?.name) return artist;
  const live = (artistsState.data || []).find(a => a.name === artist.name);
  if (!live) return artist;
  return { ...artist, photo: live.photo, profilePhoto: live.profilePhoto };
}

// Big-card row used in V1
function FeedCard({ v, accent, density, featured }) {
  const nav = window.useNav();
  const artist = useEnrichedArtist(v.artist);
  // Home thumbnails stay clear even for non-Pro users (per spec) — but
  // the tap is gated through nav.gate so the paywall sheet pops instead
  // of opening the player.
  return (
    <div onClick={() => nav.gate(() => nav.go('video', { id: v.id, video: v }))} style={{ cursor: 'pointer' }}>
      <Thumb thumb={v.thumb} duration={v.duration} badge={featured ? { label: 'Just dropped', bg: accent } : null} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <Avatar artist={artist} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: density === 'compact' ? 13 : 14,
            fontWeight: 600, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{v.title}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span onClick={(e) => { e.stopPropagation(); nav.go('artist', { id: artist.id }); }} style={{ color: C.muted2, fontWeight: 600, cursor: 'pointer' }}>{artist.name}</span>
            <span>·</span>
            <span>{v.age}</span>
          </div>
        </div>
        <button onClick={(e) => e.stopPropagation()} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}><Ico.more /></button>
      </div>
    </div>
  );
}

// ── HOME V2 — Editorial ───────────────────────────────────────
// Newest drop on top, Browse tags, then a personalised feed that grows
// with Load more taps. No more static slice / mixed FeedCard sandwich.
function HomeV2({ accent = C.pink, density = 'comfortable' }) {
  const nav = window.useNav();
  // 30 rows give a fast first paint while we wait for the full catalog
  // (10000 is an effective "all videos" cap — DB has nowhere near).
  // Both are warmed by AppShell so we just read from cache. Once the
  // bigger payload lands we upgrade `videos` in place; the hero stays
  // the same since both lists share newest-first ordering. Backend
  // /miniapp/videos now also filters out rows tagged 'shorts'.
  const liteState = window.useVideos(30);
  const fullState = window.useVideos(10000);
  const videos = (fullState.data && fullState.data.length) ? fullState.data : (liteState.data || []);
  const hero = videos[0];

  // Personalisation signals — only relevant for Pro users with some
  // history. We don't gate the personalisation by isPro itself; the
  // followed / liked lookups are no-ops outside Telegram anyway.
  const followsState = window.useFollows();
  const favState = window.useFavorites();

  // For-you feed:
  //   · Pro w/ follows → 60% videos from followed artists, 40% shuffled
  //     rest. Mixed by an alternating zip so the rail still feels
  //     varied rather than chunked.
  //   · Pro w/ favorites only → boost artists from liked videos (same
  //     mechanic but the priming set comes from saves).
  //   · Otherwise (Pro w/ no signals OR Free user) → straight shuffle
  //     from the full catalog. Free users get the same surface — they
  //     can't actually open anything (gate kicks in), but the variety
  //     helps the upsell.
  // useMemo keys on the source-list length + signal set sizes so the
  // shuffle is stable within a single Home open. A fresh open
  // reshuffles.
  const feed = React.useMemo(() => {
    const tail = videos.slice(1);
    if (tail.length <= 1) return tail;
    const shuffle = (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };

    // Collect names of artists the user has signalled affinity for.
    const followedNames = new Set((followsState.data?.artists || []).map(a => a.name));
    const likedNames = new Set();
    for (const v of (favState.data?.videos || [])) {
      if (v.artist?.name) likedNames.add(v.artist.name);
    }
    const signalNames = followedNames.size ? followedNames
                       : likedNames.size    ? likedNames
                       : null;

    if (!signalNames) return shuffle(tail);

    // Split tail into hits (from signal artists) and rest, shuffle each
    // half independently, then interleave 3:2 so the rail feels like a
    // mix instead of a wall of one creator.
    const hits = [], rest = [];
    for (const v of tail) {
      if (signalNames.has(v.artist?.name)) hits.push(v);
      else rest.push(v);
    }
    if (!hits.length) return shuffle(rest);
    if (!rest.length) return shuffle(hits);
    const sHits = shuffle(hits);
    const sRest = shuffle(rest);
    // Interleave: 3 hits, 2 rest, repeat. Roughly 60/40.
    const out = [];
    let hi = 0, ri = 0;
    while (hi < sHits.length || ri < sRest.length) {
      for (let k = 0; k < 3 && hi < sHits.length; k++) out.push(sHits[hi++]);
      for (let k = 0; k < 2 && ri < sRest.length; k++) out.push(sRest[ri++]);
    }
    return out;
  }, [videos.length, followsState.data?.artists?.length, favState.data?.videos?.length]);

  const [visible, setVisible] = React.useState(8);
  const shown = feed.slice(0, visible);
  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Hero — newest drop. Featured chip + tap to play. */}
        {hero && (
        <div style={{ padding: '12px 14px 4px' }}>
          <div onClick={() => nav.gate(() => nav.go('video', { id: hero.id, video: hero }))} style={{
            position: 'relative', borderRadius: 18, overflow: 'hidden',
            aspectRatio: '16/10', background: hero.thumb.bg, cursor: 'pointer',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
            <span style={{
              position: 'absolute', left: 12, top: 12,
              background: accent, color: '#000', fontWeight: 700,
              fontSize: 10, padding: '4px 8px', borderRadius: 999, letterSpacing: 0.6, textTransform: 'uppercase',
            }}>Newest drop</span>
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>{hero.title}</div>
              <HeroArtistLine artist={hero.artist} age={hero.age} />
            </div>
          </div>
        </div>
        )}

        {/* Auto-ticker. Trial slide only when the user can still claim
            one — paid subs + anyone who already burned the trial see
            just the stats slide. Ad slide is parked until we have real
            promo content to surface. */}
        {(() => {
          const userState = nav.user || {};
          const trialEligible = !userState.isPro && !userState.trialUsed;
          const slides = trialEligible
            ? [TickerSlides.freeTrial, TickerSlides.stats]
            : [TickerSlides.stats];
          return (
            <div style={{ padding: '10px 14px 4px' }}>
              <TickerBanner accent={accent} slides={slides} />
            </div>
          );
        })()}

        {/* Category pills — tap to open Search pre-filled with that tag. */}
        <div style={{ padding: '12px 14px 4px' }}>
          <SectionHeader title="Browse" accent={accent} action="" />
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '8px 14px 4px', overflowX: 'auto' }}>
          {(window.useTags().data || CATEGORIES).slice(0, 10).map((c, i) => (
            <div key={c.id} onClick={() => nav.go('search', { q: c.label })} style={{
              flexShrink: 0,
              width: 82, height: 82, borderRadius: 16,
              background: i % 2 === 0
                ? `linear-gradient(135deg, ${accent}30, ${C.purple}20)`
                : `linear-gradient(135deg, ${C.lime}30, ${C.blue}20)`,
              border: `1px solid ${C.border2}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 22, color: i % 2 === 0 ? accent : C.lime, fontWeight: 700, lineHeight: 1 }}>{c.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>{c.label}</div>
              {typeof c.count === 'number' && c.count > 0 && (
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{c.count}</div>
              )}
            </div>
          ))}
        </div>

        {/* Personalised feed */}
        <div style={{ padding: '16px 14px 6px' }}>
          <SectionHeader
            title="For you"
            accent={accent}
            action={feed.length > visible ? '' : ''}
            icon={<span style={{ color: accent }}><Ico.flame /></span>}
          />
        </div>
        <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shown.map(v => <CompactRow key={v.id} v={v} accent={accent} />)}
        </div>
        {feed.length > visible && (
          <div style={{ padding: '4px 14px 18px' }}>
            <button onClick={() => setVisible(n => n + 8)} style={{
              width: '100%', background: 'transparent', color: accent,
              border: `1px solid ${accent}55`, borderRadius: 12,
              padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Load more ({feed.length - visible} left)</button>
          </div>
        )}
      </div>
      <BottomNav active="home" accent={accent} />
    </Phone>
  );
}

// Hero artist line — pulls live photo via useEnrichedArtist so the
// hero avatar isn't a letter when the catalog ships an unenriched record.
function HeroArtistLine({ artist, age }) {
  const live = useEnrichedArtist(artist);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar artist={live} size={24} />
      <span style={{ fontSize: 11, color: C.muted2 }}>{live.name} · {age}</span>
    </div>
  );
}

// Compact horizontal row — thumbnail + title + tiny avatar/name line.
function CompactRow({ v, accent }) {
  const nav = window.useNav();
  // Enrich with live artist record so the avatar shows the real photo,
  // not just a letter fallback (v.artist from normalizeVideo has no photo).
  const artist = useEnrichedArtist(v.artist);
  return (
    <div onClick={() => nav.gate(() => nav.go('video', { id: v.id, video: v }))} style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <Thumb thumb={v.thumb} duration={v.duration} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{v.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Avatar artist={artist} size={18} />
          <span style={{ fontSize: 11, color: C.muted2, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{artist.name}</span>
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>{v.age}</div>
      </div>
    </div>
  );
}

// ── HOME V3 — Mosaic ──────────────────────────────────────────
// 2-column staggered grid with featured wide tiles
function HomeV3({ accent = C.pink, density = 'comfortable' }) {
  // assign sizes — every 5th is wide
  const items = VIDEOS.slice(0, 8);
  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Compact stats+banner combo */}
        <div style={{ padding: '12px 14px 6px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PromoBanner kind="subscribe" accent={accent} />
          <StatsStrip compact />
        </div>

        {/* Single chips row */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px 8px', overflowX: 'auto' }}>
          <Chip active accent={accent}>For you</Chip>
          <Chip accent={accent}>Latest</Chip>
          <Chip accent={accent}>Most viewed</Chip>
          <Chip accent={accent}>Saved artists</Chip>
        </div>

        {/* Section */}
        <div style={{ padding: '4px 14px 6px' }}>
          <SectionHeader title="Tonight's mix" accent={accent} action="See all ›" icon={<span style={{ color: accent }}><Ico.sparkle /></span>} />
        </div>

        {/* Mosaic grid */}
        <div style={{ padding: '6px 14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {items.map((v, i) => {
            const isWide = i === 0 || i === 5;
            return (
              <div key={v.id} style={{ gridColumn: isWide ? 'span 2' : 'span 1' }}>
                <MosaicCard v={v} accent={accent} wide={isWide} />
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav active="home" accent={accent} />
    </Phone>
  );
}

function MosaicCard({ v, accent, wide }) {
  const nav = window.useNav();
  return (
    <div onClick={() => nav.go('video', { id: v.id, video: v })} style={{ cursor: 'pointer' }}>
      <Thumb thumb={v.thumb} duration={v.duration} aspect={wide ? 16/9 : 4/3} />
      <div style={{ marginTop: 7 }}>
        <div style={{
          fontSize: wide ? 13 : 12, fontWeight: 600, lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{v.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Avatar artist={v.artist} size={16} />
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.artist.name}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeV1, HomeV2, HomeV3 });
