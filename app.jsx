// App entry — V2 is the picked direction; ticker banner replaces the stats strip.

const PHONE_W = 390, PHONE_H = 844;

function BottomNavCompare({ accent }) {
  return (
    <div style={{ display: 'flex', gap: 40, padding: 30, background: '#1a1a1c', borderRadius: 24, width: 880, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#fff', letterSpacing: 1.2, fontSize: 14, marginBottom: 10, opacity: 0.6, textTransform: 'uppercase' }}>Before</div>
        <OldNav />
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
          4 tabs · Profile took a slot · no dedicated Shorts · Home & Profile competed for thumb position.
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: accent, letterSpacing: 1.2, fontSize: 14, marginBottom: 10, textTransform: 'uppercase' }}>After</div>
        <NewNavStrip accent={accent} centerMode="subscribe" />
        <div style={{ height: 12 }} />
        <NewNavStrip accent={accent} centerMode="profile" />
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
          5 tabs · dedicated Shorts · center morphs Subscribe (pre-paid) → Profile (after subscribing).
        </div>
      </div>
    </div>
  );
}

function OldNav() {
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠', active: true },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'favorites', label: 'Favorites', icon: '⭐' },
    { id: 'support', label: 'Support', icon: '💬' },
  ];
  return (
    <div style={{ background: '#161617', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '8px 4px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {tabs.map(t => (
        <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 6, color: t.active ? '#FF7EC8' : 'rgba(255,255,255,0.5)' }}>
          <div style={{ fontSize: 22 }}>{t.icon}</div>
          <div style={{ fontSize: 10, fontWeight: t.active ? 700 : 500 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

function NewNavStrip({ accent, centerMode }) {
  return <BottomNav accent={accent} centerMode={centerMode} active="home" />;
}

function Note({ title, children, width = 380 }) {
  return (
    <div style={{ width, background: '#1a1a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.2, color: '#CCFF00', fontSize: 13, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)' }}>{children}</div>
    </div>
  );
}

// Animated ticker mini-preview (3 stages of the cycle as static frames)
function TickerStages({ accent }) {
  const slides = [window.TickerSlides.freeTrial, window.TickerSlides.stats, window.TickerSlides.ad];
  const labels = ['1 · Free trial CTA', '2 · Library stats', '3 · Sponsored slot'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: '20px 24px' }}>
      <div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: '#CCFF00' }}>Auto-ticker</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, maxWidth: 360 }}>
          One lime-bordered slot on home cycles every 5s. Swipe overrides auto-play. Slide 3 is an open ad slot — any promo, drop, event.
        </div>
      </div>
      {slides.map((render, i) => (
        <div key={i}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>{labels[i]}</div>
          <div style={{
            border: `1.5px solid #CCFF00`,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(204,255,0,0.06), transparent 60%)',
            padding: '12px 14px',
            width: 360,
          }}>
            {render({ accent, lime: '#CCFF00' })}
          </div>
        </div>
      ))}
    </div>
  );
}

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF7EC8",
  "density": "comfortable",
  "centerMode": "subscribe"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = window.useTweaks(TWEAKS_DEFAULTS);
  const accent = t.accent;
  const density = t.density;
  const centerMode = t.centerMode;

  return (
    <React.Fragment>
      <DesignCanvas>
        <DCSection id="brief" title="ASMR.LEAKS redesign" subtitle="Direction V2 · editorial home + auto-ticker">
          <DCArtboard id="notes" label="Brief" width={420} height={640}>
            <Note title="What changed">
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#FF7EC8', fontWeight: 700, marginBottom: 4 }}>1 · Bottom nav</div>
                Profile leaves the nav and moves to the header. New 5-tab layout: Home · <span style={{ color: '#FF7EC8' }}>Shorts</span> · Center · Artists · Saved. Center starts as <b>Subscribe</b> (gradient CTA), then becomes a profile avatar after subscribing.
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#FF7EC8', fontWeight: 700, marginBottom: 4 }}>2 · Home (V2 — editorial)</div>
                Hero featured drop → auto-ticker → categories → recommended feed. The lime ticker rotates every 5s: <b>Try 5 Days Free</b> → library stats → ad slot. Fully swipeable.
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#FF7EC8', fontWeight: 700, marginBottom: 4 }}>3 · Shorts tab</div>
                Grid catalog with filters · tap any tile opens the swipe-player overlay over the whole library.
              </div>
              <div>
                <div style={{ color: '#FF7EC8', fontWeight: 700, marginBottom: 4 }}>4 · Video page</div>
                Title row has prev/next arrows beside it. Order: title → action-row → artist-card → up-next. Custom player kept, no comments.
              </div>
            </Note>
          </DCArtboard>
          <DCArtboard id="ticker" label="Auto-ticker · 3 cycle stages" width={420} height={640} style={{ background: '#0E0E0F' }}>
            <TickerStages accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="home" title="Home — V2 editorial" subtitle="Picked direction · live ticker rotates every 5s">
          <DCArtboard id="home-v2" label="Home · V2 (final)" width={PHONE_W} height={PHONE_H}>
            <HomeV2 accent={accent} density={density} />
          </DCArtboard>
        </DCSection>

        <DCSection id="nav" title="Bottom navigation">
          <DCArtboard id="nav-cmp" label="Before / after" width={940} height={420}>
            <BottomNavCompare accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="shorts" title="Shorts">
          <DCArtboard id="shorts-grid" label="Grid catalog" width={PHONE_W} height={PHONE_H}>
            <ShortsTab accent={accent} mode="grid" />
          </DCArtboard>
          <DCArtboard id="shorts-player" label="Swipe-player overlay" width={PHONE_W} height={PHONE_H}>
            <ShortsTab accent={accent} mode="player" />
          </DCArtboard>
        </DCSection>

        <DCSection id="video" title="Video page">
          <DCArtboard id="video-page" label="Watch screen" width={PHONE_W} height={PHONE_H}>
            <VideoPage accent={accent} density={density} />
          </DCArtboard>
        </DCSection>

        <DCSection id="artists" title="Artists page" subtitle="Searchable grid · fresh / saved filter">
          <DCArtboard id="artists-page" label="All artists" width={PHONE_W} height={PHONE_H}>
            <ArtistsPage accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="saved" title="Saved · My library" subtitle="4 tabs · liked videos, video playlists, liked photos, photo albums">
          <DCArtboard id="saved-videos" label="Liked videos" width={PHONE_W} height={PHONE_H}>
            <SavedPage accent={accent} initialTab="videos" />
          </DCArtboard>
          <DCArtboard id="saved-playlists" label="Video playlists" width={PHONE_W} height={PHONE_H}>
            <SavedPage accent={accent} initialTab="playlists" />
          </DCArtboard>
          <DCArtboard id="saved-photos" label="Liked photos" width={PHONE_W} height={PHONE_H}>
            <SavedPage accent={accent} initialTab="photos" />
          </DCArtboard>
          <DCArtboard id="saved-albums" label="Photo albums" width={PHONE_W} height={PHONE_H}>
            <SavedPage accent={accent} initialTab="albums" />
          </DCArtboard>
        </DCSection>

        <DCSection id="artist" title="Artist page" subtitle="Hero · follow · tabs videos / shorts / photos">
          <DCArtboard id="artist-page" label="Heyhelen ASMR" width={PHONE_W} height={PHONE_H}>
            <ArtistPage accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="paywall" title="Paywall locks" subtitle="When free users tap a video or artist gallery">
          <DCArtboard id="paywall-video" label="Locked video" width={PHONE_W} height={PHONE_H}>
            <PaywallLock accent={accent} mode="video" />
          </DCArtboard>
          <DCArtboard id="paywall-artist" label="Locked artist" width={PHONE_W} height={PHONE_H}>
            <PaywallLock accent={accent} mode="artist" />
          </DCArtboard>
        </DCSection>

        <DCSection id="subscription" title="Subscription page" subtitle="Plans · trial CTA · perks bento">
          <DCArtboard id="subscription-page" label="Get PRO" width={PHONE_W} height={PHONE_H}>
            <SubscriptionPage accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="profile" title="Profile page" subtitle="Cover · plan card · settings rows">
          <DCArtboard id="profile-page" label="Profile" width={PHONE_W} height={PHONE_H}>
            <ProfilePage accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="faq" title="FAQ / Help" subtitle="Accordion + chat shortcut">
          <DCArtboard id="faq-page" label="Help center" width={PHONE_W} height={PHONE_H}>
            <FAQPage accent={accent} />
          </DCArtboard>
        </DCSection>

        <DCSection id="alts" title="Alternates (kept for reference)" subtitle="V1 feed-first · V3 mosaic — in case you want to compare">
          <DCArtboard id="home-v1" label="V1 · Feed-first" width={PHONE_W} height={PHONE_H}>
            <HomeV1 accent={accent} density={density} />
          </DCArtboard>
          <DCArtboard id="home-v3" label="V3 · Mosaic" width={PHONE_W} height={PHONE_H}>
            <HomeV3 accent={accent} density={density} />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <window.TweaksPanel>
        <window.TweakSection label="Theme">
          <window.TweakColor
            label="Accent"
            value={accent}
            options={['#FF7EC8', '#CCFF00', '#44C8FF', '#C86BFF', '#FF9F44']}
            onChange={v => setTweak('accent', v)}
          />
          <window.TweakRadio
            label="Density"
            value={density}
            options={[{ label: 'Compact', value: 'compact' }, { label: 'Comfy', value: 'comfortable' }]}
            onChange={v => setTweak('density', v)}
          />
        </window.TweakSection>
        <window.TweakSection label="Nav state">
          <window.TweakRadio
            label="Center btn"
            value={centerMode}
            options={[{ label: 'Subscribe', value: 'subscribe' }, { label: 'Profile', value: 'profile' }]}
            onChange={v => setTweak('centerMode', v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
