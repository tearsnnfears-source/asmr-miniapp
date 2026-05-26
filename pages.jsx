// Profile · Subscription · FAQ · Paywall lock · Artist page

// ── PROFILE PAGE ──────────────────────────────────────────────
function ProfilePage({ accent = C.pink }) {
  const nav = window.useNav();
  const user = nav.user || { name: 'You', daysLeft: 0, isPro: false };
  const initials = (user.name || 'U').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const tier = (user.tier || 'free').toLowerCase();
  const tierColor = window.TIER_COLORS?.[tier] || C.lime;
  const stats = [
    user.isPro
      ? { val: String(user.daysLeft || 0), unit: 'd', label: 'Days left' }
      : { val: 'Free', label: 'Plan' },
    { val: '0', label: 'Saved' },
    { val: '0', label: 'Following' },
  ];
  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Cover + avatar */}
        <div style={{ position: 'relative', height: 130, background: `linear-gradient(135deg, ${accent}55, ${C.purple}55, ${C.dark3})` }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 60%, rgba(255,255,255,0.15), transparent 60%)' }} />
          <button style={{
            position: 'absolute', right: 14, top: 14,
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>⚙</button>
        </div>
        <div style={{ padding: '0 14px', marginTop: -48, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              border: `4px solid ${C.dark}`,
              background: user.photo
                ? `url('${user.photo.replace(/'/g, "\\'")}') center/cover, linear-gradient(135deg, ${accent}, ${C.purple})`
                : `linear-gradient(135deg, ${accent}, ${C.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontWeight: 800, fontSize: 32,
              overflow: 'hidden',
            }}>{user.photo ? '' : initials}</div>
            <div style={{ paddingBottom: 8, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
                {user.isPro && (
                  <span style={{ background: tierColor, color: '#000', fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, padding: '2px 7px', borderRadius: 4, letterSpacing: 1 }}>
                    {tier.toUpperCase()}{user.isInfinite ? ' ∞' : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {user.username ? `@${user.username}` : 'No username'}
                {user.telegramId ? ` · ID ${user.telegramId}` : ''}
              </div>
              {/* User badges from /miniapp/profile (FOUNDER / OLD / VIP / ELITE etc) */}
              {Array.isArray(user.badges) && user.badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {user.badges.map((b, i) => {
                    const bk = b.toLowerCase();
                    const col = window.TIER_COLORS?.[bk] || accent;
                    return (
                      <span key={i} style={{
                        background: col, color: '#000',
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6,
                        padding: '2px 6px', borderRadius: 3,
                      }}>{b.toUpperCase()}</span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ padding: '16px 14px 4px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: C.dark2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: accent, lineHeight: 1 }}>
                {s.val}{s.unit && <span style={{ fontSize: 14, opacity: 0.7 }}>{s.unit}</span>}
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subscription card */}
        {user.isPro ? (
        <div style={{ padding: '12px 14px 6px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${tierColor}22, transparent 70%)`,
            border: `1px solid ${tierColor}55`,
            borderRadius: 16, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, color: tierColor, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Active plan</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: tierColor, letterSpacing: 1, lineHeight: 1, marginTop: 4 }}>
                  {tier.toUpperCase()} · {user.isInfinite ? 'lifetime' : `${user.daysLeft} days`}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{user.isInfinite ? 'Permanent access' : 'Renews soon · Tribute'}</div>
              </div>
              <button onClick={() => nav.go('subscription')} style={{ background: 'transparent', border: `1px solid ${tierColor}`, color: tierColor, padding: '7px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Manage</button>
            </div>
            {!user.isInfinite && (
              <div style={{ height: 4, marginTop: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <div style={{ width: `${Math.min(100, (user.daysLeft || 0) * 3)}%`, height: '100%', background: tierColor, borderRadius: 2 }} />
              </div>
            )}
          </div>
        </div>
        ) : (
        <div style={{ padding: '12px 14px 6px' }}>
          <div onClick={() => nav.go('subscription')} style={{
            background: `linear-gradient(135deg, ${accent}22, ${C.purple}22, transparent)`,
            border: `1px solid ${accent}55`,
            borderRadius: 16, padding: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 10, color: accent, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Upgrade</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: accent, letterSpacing: 1, lineHeight: 1, marginTop: 4 }}>Get PRO →</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>5 days free · cancel anytime</div>
            </div>
          </div>
        </div>
        )}

        {/* Row list */}
        <div style={{ padding: '8px 14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <RowGroup label="Library">
            <Row icon="⭐" color={accent} label="My saved" badge={String(window.useFavorites().data?.count || 0)} onClick={() => nav.go('saved')} />
            <Row icon="📂" color={accent} label="Albums & playlists" onClick={() => nav.go('saved', { tab: 'albums' })} />
            <Row icon="🔄" color={accent} label="Renew subscription" onClick={() => nav.go('subscription')} />
          </RowGroup>
          <RowGroup label="App">
            <Row icon="🌐" label="Language" value="English" />
            <Row icon="🔔" label="Notifications" />
            <Row icon="🌗" label="Appearance" value="Dark" />
          </RowGroup>
          <RowGroup label="Help">
            <Row icon="❓" label="FAQ" onClick={() => nav.go('faq')} />
            <Row icon="💬" label="Support" />
            <Row icon="📜" label="Terms · Privacy" />
          </RowGroup>
        </div>
      </div>
      <BottomNav active="" accent={accent} />
    </Phone>
  );
}

function RowGroup({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '12px 4px 6px' }}>{label}</div>
      <div style={{ background: C.dark2, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
function Row({ icon, color, label, value, badge, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: color ? `${color}1c` : 'rgba(255,255,255,0.05)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{label}</div>
      {badge && <span style={{ fontSize: 10, padding: '2px 8px', background: color ? `${color}1c` : 'rgba(255,255,255,0.05)', color: color || C.muted2, borderRadius: 999, fontWeight: 700 }}>{badge}</span>}
      {value && <span style={{ fontSize: 12, color: C.muted }}>{value}</span>}
      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
    </div>
  );
}

// ── SUBSCRIPTION PAGE ─────────────────────────────────────────
function SubscriptionPage({ accent = C.pink }) {
  const nav = window.useNav();
  const [plan, setPlan] = React.useState('year');
  const plans = [
    { id: 'week',  title: '5 days FREE', price: '$0', sub: 'then $4.99/wk · cancel anytime', tag: 'TRY FREE', tagBg: C.lime, accent: C.lime },
    { id: 'month', title: '1 Month',     price: '$8.99', sub: 'Billed monthly', tag: '', accent: accent },
    { id: 'year',  title: '12 Months',   price: '$3.33', sub: '/mo · $39.99 billed yearly', tag: 'SAVE 63%', tagBg: accent, accent: accent, recommended: true },
    { id: 'life',  title: 'Lifetime',    price: '$99', sub: 'One-time · all future content', tag: 'BEST', tagBg: C.purple, accent: C.purple },
  ];
  const perks = [
    { ico: '🎬', label: 'Full catalog · 11 385 videos' },
    { ico: '📸', label: '53 168 photos in HD' },
    { ico: '⚡', label: 'Unlimited shorts feed' },
    { ico: '⬇', label: 'Offline saves & playlists' },
    { ico: '🚫', label: 'No ads · no rate limits' },
    { ico: '🆕', label: 'Early access to new drops' },
  ];

  return (
    <Phone>
      {/* Slim header */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.dark2, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => nav.back()} style={{ ...iconBtn, border: 'none' }}><Ico.chevL /></button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Get PRO</span>
        <button onClick={() => nav.back()} style={{ ...iconBtn, border: 'none', fontSize: 18, color: C.muted }}>×</button>
      </div>

      <div style={SCROLL_BODY}>
        {/* Hero */}
        <div style={{ padding: '20px 18px 8px', textAlign: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `${C.lime}22`, color: C.lime,
            padding: '5px 12px', borderRadius: 999,
            fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
            marginBottom: 12,
          }}><Ico.sparkle /> Unlock everything</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: 1.5, lineHeight: 0.95 }}>
            Go <span style={{ color: accent }}>PRO.</span>
          </div>
          <div style={{ fontSize: 13, color: C.muted2, marginTop: 8, lineHeight: 1.5, maxWidth: 280, margin: '8px auto 0' }}>
            Every artist, every drop. First 5 days free, then it's yours.
          </div>
        </div>

        {/* Perks bento */}
        <div style={{ padding: '16px 14px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {perks.map((p, i) => (
            <div key={i} style={{
              background: C.dark2, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{p.ico}</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.3 }}>{p.label}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div style={{ padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plans.map(p => {
            const active = p.id === plan;
            return (
              <div key={p.id} onClick={() => setPlan(p.id)} style={{
                position: 'relative',
                background: active ? `linear-gradient(110deg, ${p.accent}22, transparent 90%)` : C.dark2,
                border: `1.5px solid ${active ? p.accent : C.border}`,
                borderRadius: 16, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}>
                {/* radio */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${active ? p.accent : C.border2}`,
                  background: active ? p.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</span>
                    {p.tag && <span style={{ background: p.tagBg, color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.4 }}>{p.tag}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{p.sub}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: active ? p.accent : C.text, lineHeight: 1 }}>{p.price}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ padding: '14px 14px 8px' }}>
          <button onClick={async () => {
            // In Telegram → real action; outside Telegram → local toggle.
            if (!(window.isInsideTelegram && window.isInsideTelegram())) {
              nav.setPro(true); nav.reset('home'); return;
            }
            const res = plan === 'week'
              ? await window.actionStartFreeTrial()
              : await window.actionStartCryptoCheckout(plan);
            if (!res.ok) {
              console.warn('checkout failed:', res);
              alert(res.message || 'Checkout unavailable. Try again.');
              return;
            }
            if (plan === 'week') {
              // Trial activated server-side; reload profile state.
              nav.reset('home');
            }
            // For paid plans Cryptocloud opens external link; user returns and profile refreshes on reload.
          }} style={{
            width: '100%',
            background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
            border: 'none', color: '#000',
            padding: '16px', borderRadius: 16,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, letterSpacing: 1.2, cursor: 'pointer',
            boxShadow: `0 8px 24px ${accent}44`,
          }}>{plan === 'week' ? 'START 5-DAY FREE TRIAL →' : 'CONTINUE →'}</button>
          <div style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            Cancel anytime · No charge during trial · Powered by Tribute
          </div>
        </div>

        <div style={{ padding: '4px 14px 16px', textAlign: 'center', fontSize: 11, color: C.muted }}>
          <span style={{ color: C.text, fontWeight: 600 }}>Restore purchase</span> · Terms · Privacy
        </div>
      </div>
    </Phone>
  );
}

// ── FAQ PAGE ──────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How do I cancel my subscription?', a: 'Go to Profile → Active plan → Manage. Cancel anytime — you keep access until the period ends.' },
  { q: 'Can I download videos?', a: 'PRO subscribers can save unlimited videos and photos for offline viewing on iOS and Android.' },
  { q: 'What payment methods do you accept?', a: 'We use Tribute — cards, Apple Pay, Google Pay, and crypto. Trial requires no card.' },
  { q: 'How often is new content added?', a: '20–40 new videos and 500+ photos every week. Subscribe to artists for instant drop notifications.' },
  { q: 'Is my data safe?', a: 'We never share your Telegram ID with creators. Your activity is private and end-to-end encrypted.' },
  { q: 'Can I request specific artists?', a: 'Yes — drop a request via Support. We add 2–3 new artists per month based on votes.' },
];
function FAQPage({ accent = C.pink }) {
  const nav = window.useNav();
  const [open, setOpen] = React.useState(0);
  return (
    <Phone>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.dark2, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => nav.back()} style={{ ...iconBtn, border: 'none' }}><Ico.chevL /></button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Help</span>
        <div style={{ width: 38 }} />
      </div>
      <div style={SCROLL_BODY}>
        <div style={{ padding: '20px 16px 6px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 1.4, lineHeight: 0.95 }}>
            How can we <span style={{ color: accent }}>help?</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Most answers live here · still stuck? Ping support below.</div>
        </div>

        {/* Quick search */}
        <div style={{ padding: '14px 14px 6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.dark2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '11px 12px',
          }}>
            <span style={{ color: C.muted }}><Ico.search /></span>
            <input placeholder="Search…" style={{ flex: 1, background: 'transparent', border: 'none', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}/>
          </div>
        </div>

        {/* Quick categories */}
        <div style={{ padding: '8px 14px 4px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { ico: '💳', label: 'Billing' },
            { ico: '🎬', label: 'Content' },
            { ico: '⚙️', label: 'Account' },
          ].map((c, i) => (
            <div key={i} style={{ background: C.dark2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 22 }}>{c.ico}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Accordion */}
        <div style={{ padding: '14px 14px 6px' }}>
          <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Top questions</div>
          <div style={{ background: C.dark2, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {FAQ_ITEMS.map((it, i) => {
              const isOpen = i === open;
              return (
                <div key={i} style={{ borderBottom: i < FAQ_ITEMS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div onClick={() => setOpen(isOpen ? -1 : i)} style={{
                    padding: '14px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{it.q}</div>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: isOpen ? accent : 'rgba(255,255,255,0.08)',
                      color: isOpen ? '#000' : C.muted2,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, transition: 'all 200ms',
                    }}>{isOpen ? '–' : '+'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 14px 14px', fontSize: 12, color: C.muted2, lineHeight: 1.55 }}>{it.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact card */}
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${accent}1c, ${C.purple}1c)`,
            border: `1px solid ${accent}55`,
            borderRadius: 16, padding: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Still need help?</div>
              <div style={{ fontSize: 11, color: C.muted2, marginTop: 4 }}>Avg reply in 2 hours · 24/7</div>
            </div>
            <button style={{
              background: accent, color: '#000', border: 'none',
              padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>💬 Chat</button>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// ── PAYWALL LOCK ──────────────────────────────────────────────
// Shown when a free user taps a locked video / artist
function PaywallLock({ accent = C.pink, mode = 'video' /* 'video' | 'artist' */ }) {
  const nav = window.useNav();
  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Background blurred preview */}
        <div style={{ position: 'absolute', inset: 0, background: window.VIDEOS[0].thumb.bg, filter: 'blur(28px) saturate(140%)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,14,15,0.7) 0%, rgba(14,14,15,0.95) 60%, #0E0E0F 100%)' }} />

        {/* Faux content peek */}
        {mode === 'artist' ? (
          <div style={{ position: 'absolute', inset: 0, padding: '18px 14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar artist={window.ARTISTS[0]} size={56} ring={accent} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{window.ARTISTS[0].name}</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>{window.ARTISTS[0].videos} videos · {window.ARTISTS[0].photos.toLocaleString()} photos</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, filter: 'blur(2px)', opacity: 0.55 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '1/1', borderRadius: 6, background: window.makeThumb(i).bg }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, padding: 14 }}>
            <div style={{ aspectRatio: '16/9', borderRadius: 14, background: window.VIDEOS[0].thumb.bg, filter: 'blur(3px)', opacity: 0.7 }} />
          </div>
        )}

        {/* Center lock card */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
        }}>
          <div style={{
            background: 'rgba(20,20,22,0.85)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${C.border2}`,
            borderRadius: 22, padding: 24,
            width: '100%',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: `0 8px 24px ${accent}55`,
            }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="#000"><path d="M7 11V8a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm2 0h6V8a3 3 0 1 0-6 0z"/></svg>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, textAlign: 'center', lineHeight: 1 }}>
              {mode === 'artist' ? 'Artists are' : 'This drop is'}<br/>
              <span style={{ color: accent }}>PRO only</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.muted2, lineHeight: 1.55, textAlign: 'center', marginTop: 10, padding: '0 8px' }}>
              {mode === 'artist'
                ? 'Unlock every artist gallery, future drops included.'
                : 'Subscribe once. Watch everything. Cancel whenever.'}
            </div>

            {/* perks mini */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
              {['11K+ videos', '53K+ photos', 'No ads', 'Offline'].map(p => (
                <span key={p} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted2, fontSize: 10.5, fontWeight: 600, padding: '4px 9px', borderRadius: 999 }}>{p}</span>
              ))}
            </div>

            {/* CTAs */}
            <button onClick={() => nav.go('subscription')} style={{
              width: '100%', marginTop: 18,
              background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
              border: 'none', color: '#000',
              padding: '14px', borderRadius: 14,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 17, letterSpacing: 1, cursor: 'pointer',
            }}>TRY 5 DAYS FREE</button>
            <button onClick={() => nav.go('subscription')} style={{
              width: '100%', marginTop: 8,
              background: 'transparent', border: `1px solid ${C.border2}`, color: C.muted2,
              padding: '11px', borderRadius: 14,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>See plans</button>
          </div>
        </div>
      </div>
      <BottomNav active="home" accent={accent} />
    </Phone>
  );
}

function loadMoreBtnStyle(accent) {
  return {
    width: '100%',
    background: 'transparent',
    color: accent,
    border: `1px solid ${accent}55`,
    borderRadius: 12,
    padding: '12px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

// ── ARTIST PAGE ───────────────────────────────────────────────
function ArtistPage({ accent = C.pink }) {
  const nav = window.useNav();
  const requestedId = nav.params?.id;
  const artistsState = window.useArtists();
  const allArtists = artistsState.data || [];
  let a = allArtists.find(x => x.id === requestedId);
  if (!a) a = allArtists[0] || window.ARTISTS[0];
  const tColor = tagColor(a.tag);
  const [tab, setTab] = React.useState('videos');

  // Live content from /miniapp/artist_content (mixed initial load).
  const contentState = window.useArtistContent(a.name);
  const content = contentState.data || { videos: [], photos: [], shorts: [] };

  // Follow state + optimistic toggle.
  const followStatus = window.useFollowStatus(a.name);
  const [localFollow, setLocalFollow] = React.useState(null);
  const isFollowing = localFollow != null ? localFollow : followStatus.following;
  const onFollowClick = () => {
    const next = !isFollowing;
    setLocalFollow(next);
    window.actionFollow(a.name).then(r => {
      if (!r.ok) { setLocalFollow(!next); console.warn('[follow]', r); }
    });
  };

  // Per-tab pagination state.
  const [visibleVideos, setVisibleVideos] = React.useState(10);
  const [visibleShorts, setVisibleShorts] = React.useState(9);
  const [visiblePhotos, setVisiblePhotos] = React.useState(24);
  // Best-effort follower count — we don't currently get this from the API.
  // The `videos + photos + shorts` totals are real; hide Followers if 0.
  const stats = [
    { v: content.videos.length || a.videos || 0, l: 'Videos' },
    { v: (content.photos.length || a.photos || 0).toLocaleString(), l: 'Photos' },
    { v: content.shorts.length || 0, l: 'Shorts' },
  ];

  // Empty-state: artist exists but has no content uploaded yet — show a
  // link to the group thread if the backend gave us topic_url.
  const hasAnyContent = content.videos.length + content.shorts.length + content.photos.length > 0;
  const topicUrl = a.topicUrl || a.raw?.topic_url || '';

  const openTopic = () => {
    if (!topicUrl) return;
    const tg = window.Telegram?.WebApp;
    tg?.openLink ? tg.openLink(topicUrl) : window.open(topicUrl, '_blank');
  };

  return (
    <Phone>
      {/* Slim back bar — pinned to the top of the player surface, not 44px
          below it (the old offset was for the fake status bar we removed). */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'absolute', top: 'calc(8px + env(safe-area-inset-top, 0px))', left: 0, right: 0, zIndex: 5 }}>
        <button onClick={() => nav.back()} style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Ico.chevL /></button>
        {topicUrl && (
          <button onClick={openTopic} style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Ico.share /></button>
        )}
      </div>

      <div style={SCROLL_BODY}>
        {/* Hero */}
        <div style={{
          position: 'relative', height: 220,
          background: a.profilePhoto || a.photo
            ? `url('${(a.profilePhoto || a.photo).replace(/'/g, "\\'")}') center/cover no-repeat, linear-gradient(135deg, ${tColor}, ${C.purple})`
            : `linear-gradient(135deg, ${tColor}, ${C.purple})`,
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 30%, rgba(14,14,15,0.95) 100%)' }} />
          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <Avatar artist={a} size={80} ring={C.text} />
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{a.handle}</div>
            </div>
          </div>
          {a.ready && (
            <span style={{
              position: 'absolute', right: 14, bottom: 18,
              background: '#4ADE80', color: '#000', fontSize: 9.5, fontWeight: 800,
              padding: '4px 10px', borderRadius: 999, letterSpacing: 0.8, textTransform: 'uppercase',
            }}>▶ In app</span>
          )}
          {!a.ready && a.fresh && (
            <span style={{
              position: 'absolute', right: 14, bottom: 18,
              background: C.lime, color: '#000', fontSize: 9.5, fontWeight: 800,
              padding: '4px 10px', borderRadius: 999, letterSpacing: 0.8, textTransform: 'uppercase',
            }}>Fresh</span>
          )}
        </div>

        {/* Stats row */}
        <div style={{ padding: '14px 14px 6px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', borderRight: i < 2 ? `1px solid ${C.border}` : 'none', padding: '0 4px' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: accent, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action row: Follow + bell only (bookmark removed per request) */}
        <div style={{ padding: '8px 14px 6px', display: 'flex', gap: 8 }}>
          <button onClick={onFollowClick} style={{
            flex: 1,
            background: isFollowing ? 'transparent' : accent,
            color: isFollowing ? accent : '#000',
            border: isFollowing ? `1px solid ${accent}` : 'none',
            padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{isFollowing ? '✓ Following' : '+ Follow'}</button>
          <button style={{
            background: C.dark3, border: `1px solid ${C.border2}`, color: C.text,
            padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }} title="Notify when new content drops"><Ico.bell /></button>
        </div>

        {/* Empty state when the artist exists but has nothing uploaded yet */}
        {!contentState.loading && !hasAnyContent && (
          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Available in the group
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
              {a.name}'s content lives in the Telegram group for now.
            </div>
            {topicUrl && (
              <button onClick={openTopic} style={{
                background: accent, color: '#000', border: 'none',
                padding: '10px 20px', borderRadius: 999,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>Open in Telegram</button>
            )}
          </div>
        )}

        {hasAnyContent && (
          <React.Fragment>
            {/* Tabs */}
            <div style={{ padding: '14px 14px 0', display: 'flex', gap: 18, borderBottom: `1px solid ${C.border}` }}>
              {[
                { id: 'videos', l: 'Videos', c: content.videos.length },
                { id: 'shorts', l: 'Shorts', c: content.shorts.length },
                { id: 'photos', l: 'Photos', c: content.photos.length },
              ].map(t => {
                const active = t.id === tab;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    background: 'none', border: 'none', padding: '10px 0',
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    color: active ? C.text : C.muted, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {t.l}
                    <span style={{ fontSize: 10, color: C.muted }}>{t.c}</span>
                  </button>
                );
              })}
            </div>

            {/* Videos */}
            {tab === 'videos' && (
              <div>
                <div style={{ padding: '12px 14px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {content.videos.slice(0, visibleVideos).map(v => <CompactRow key={v.id} v={v} accent={accent} />)}
                </div>
                {visibleVideos < content.videos.length && (
                  <div style={{ padding: '6px 14px 18px' }}>
                    <button onClick={() => setVisibleVideos(n => n + 10)} style={loadMoreBtnStyle(accent)}>Load more</button>
                  </div>
                )}
              </div>
            )}

            {/* Shorts */}
            {tab === 'shorts' && (
              <div>
                <div style={{ padding: '12px 14px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {content.shorts.slice(0, visibleShorts).map((s, i) => (
                    <div key={s.id || i} onClick={() => nav.go('shorts', {})} style={{ aspectRatio: '9/16', borderRadius: 10, background: s.thumb.bg, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)' }} />
                      {s.duration && <span style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 9, fontWeight: 700, color: '#fff' }}>{s.duration}</span>}
                    </div>
                  ))}
                </div>
                {visibleShorts < content.shorts.length && (
                  <div style={{ padding: '6px 14px 18px' }}>
                    <button onClick={() => setVisibleShorts(n => n + 9)} style={loadMoreBtnStyle(accent)}>Load more</button>
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            {tab === 'photos' && (
              <div>
                <div style={{ padding: '12px 14px 4px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {content.photos.slice(0, visiblePhotos).map((p, i) => (
                    <div key={p.id || i} style={{
                      aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', position: 'relative',
                      background: p.thumb?.src
                        ? `url('${p.thumb.src.replace(/'/g, "\\'")}') center/cover no-repeat`
                        : (p.thumb?.bg || '#1a1a1c'),
                    }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />
                    </div>
                  ))}
                </div>
                {visiblePhotos < content.photos.length && (
                  <div style={{ padding: '6px 14px 18px' }}>
                    <button onClick={() => setVisiblePhotos(n => n + 24)} style={loadMoreBtnStyle(accent)}>Load more</button>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        )}
      </div>
      <BottomNav active="artists" accent={accent} />
    </Phone>
  );
}

Object.assign(window, { ProfilePage, SubscriptionPage, FAQPage, PaywallLock, ArtistPage });
