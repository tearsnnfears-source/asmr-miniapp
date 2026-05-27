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

// Big-card row used in V1
function FeedCard({ v, accent, density, featured }) {
  const nav = window.useNav();
  return (
    <div onClick={() => nav.go('video', { id: v.id, video: v })} style={{ cursor: 'pointer' }}>
      <Thumb thumb={v.thumb} duration={v.duration} badge={featured ? { label: 'Just dropped', bg: accent } : null} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <Avatar artist={v.artist} size={36} ring={v.artist.fresh ? accent : null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: density === 'compact' ? 13 : 14,
            fontWeight: 600, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{v.title}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span onClick={(e) => { e.stopPropagation(); nav.go('artist', { id: v.artist.id }); }} style={{ color: C.muted2, fontWeight: 600, cursor: 'pointer' }}>{v.artist.name}</span>
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
// Hero promo on top, category tiles, mixed feed
function HomeV2({ accent = C.pink, density = 'comfortable' }) {
  const nav = window.useNav();
  // Home uses a small batch so the first paint isn't blocked on the giant
  // 500-row response (which takes ~12s on Railway). The full list is kept
  // warm in the background by AppShell so VideoPage / ArtistPage still
  // open instantly.
  const videosState = window.useVideos(30);
  const videos = videosState.data || [];
  const hero = videos[0];
  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Hero — large featured drop */}
        {hero && (
        <div style={{ padding: '12px 14px 4px' }}>
          <div onClick={() => nav.go('video', { id: hero.id, video: hero })} style={{
            position: 'relative', borderRadius: 18, overflow: 'hidden',
            aspectRatio: '16/10', background: hero.thumb.bg, cursor: 'pointer',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
            <span style={{
              position: 'absolute', left: 12, top: 12,
              background: accent, color: '#000', fontWeight: 700,
              fontSize: 10, padding: '4px 8px', borderRadius: 999, letterSpacing: 0.6, textTransform: 'uppercase',
            }}>Featured drop</span>
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>{hero.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar artist={hero.artist} size={24} />
                <span style={{ fontSize: 11, color: C.muted2 }}>{hero.artist.name} · {hero.age}</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Auto-ticker: free trial → stats → ads, every 5s */}
        <div style={{ padding: '10px 14px 4px' }}>
          <TickerBanner
            accent={accent}
            slides={[TickerSlides.freeTrial, TickerSlides.stats, TickerSlides.ad]}
          />
        </div>

        {/* Category pills (visual) */}
        <div style={{ padding: '12px 14px 4px' }}>
          <SectionHeader title="Browse" accent={accent} action="" />
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '8px 14px 4px', overflowX: 'auto' }}>
          {CATEGORIES.slice(0,6).map((c, i) => (
            <div key={c.id} style={{
              flexShrink: 0,
              width: 72, height: 72, borderRadius: 16,
              background: i % 2 === 0
                ? `linear-gradient(135deg, ${accent}30, ${C.purple}20)`
                : `linear-gradient(135deg, ${C.lime}30, ${C.blue}20)`,
              border: `1px solid ${C.border2}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <div style={{ fontSize: 24, color: i % 2 === 0 ? accent : C.lime, fontWeight: 700 }}>{c.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Trending row label */}
        <div style={{ padding: '14px 14px 6px' }}>
          <SectionHeader
            title="Recommended"
            accent={accent}
            icon={<span style={{ color: accent }}><Ico.flame /></span>}
          />
        </div>

        {/* Mixed feed: big card + 2x compact rows */}
        <div style={{ padding: '6px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {videos[1] && <FeedCard v={videos[1]} accent={accent} density={density} />}
          {videos.slice(2, 6).map(v => (
            <CompactRow key={v.id} v={v} accent={accent} />
          ))}
          {videos[6] && <FeedCard v={videos[6]} accent={accent} density={density} />}
        </div>
      </div>
      <BottomNav active="home" accent={accent} />
    </Phone>
  );
}

// Compact horizontal row — thumbnail-left
function CompactRow({ v, accent }) {
  const nav = window.useNav();
  // Pass the full video object too — needed for artist pages where the
  // video isn't in the global useVideos(500) cache (otherwise VideoPage
  // would fall back to the Home feed's first item).
  return (
    <div onClick={() => nav.go('video', { id: v.id, video: v })} style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <Thumb thumb={v.thumb} duration={v.duration} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{v.title}</div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, fontWeight: 500 }}>{v.artist.name}</div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{v.age}</div>
        {v.artist.fresh && (
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 9, padding: '2px 6px', background: `${accent}22`, color: accent, borderRadius: 4, fontWeight: 700, letterSpacing: 0.5 }}>FRESH ARTIST</span>
        )}
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
