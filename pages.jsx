// Profile · Subscription · FAQ · Paywall lock · Artist page

// ── PROFILE PAGE ──────────────────────────────────────────────
function ProfilePage({ accent = C.pink }) {
  const nav = window.useNav();
  const user = nav.user || { name: 'You', daysLeft: 0, isPro: false };
  const initials = (user.name || 'U').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const tier = (user.tier || 'free').toLowerCase();
  const tierColor = window.TIER_COLORS?.[tier] || C.lime;
  // Real counts — favorites covers liked videos+shorts+photos, follows is
  // the artist subscription list. Falls back to 0 while the hooks load.
  const favState  = window.useFavorites();
  const followState = window.useFollows();
  const savedCount = favState.data?.count
    ?? ((favState.data?.videos?.length || 0)
      + (favState.data?.shorts?.length || 0)
      + (favState.data?.photos?.length || 0));
  const followingCount = (followState.data?.artists || []).length;
  const stats = [
    user.isPro
      ? { val: String(user.daysLeft || 0), unit: 'd', label: 'Days left' }
      : { val: 'Free', label: 'Plan' },
    { val: String(savedCount), label: 'Saved' },
    { val: String(followingCount), label: 'Following' },
  ];
  return (
    <Phone>
      <AppHeader accent={accent} />
      <div style={SCROLL_BODY}>
        {/* Cover + avatar — gear button removed (was a no-op). */}
        <div style={{ position: 'relative', height: 130, background: `linear-gradient(135deg, ${accent}55, ${C.purple}55, ${C.dark3})` }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 60%, rgba(255,255,255,0.15), transparent 60%)' }} />
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

        {/* Subscription card — three variants: active sub / grace / free */}
        {user.isGrace ? (
        <div style={{ padding: '12px 14px 6px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,152,0,0.18), transparent 70%)',
            border: '1px solid rgba(255,152,0,0.55)',
            borderRadius: 16, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#FF9800', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Grace period</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#FF9800', letterSpacing: 1, lineHeight: 1, marginTop: 4 }}>
                  {user.graceDaysLeft} day{user.graceDaysLeft === 1 ? '' : 's'} left
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Renew to keep access — your saves stay intact.</div>
              </div>
              <button onClick={() => nav.go('subscription')} style={{
                background: '#FF9800', color: '#000', border: 'none',
                padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>Renew</button>
            </div>
            <div style={{ height: 4, marginTop: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <div style={{ width: `${(user.graceDaysLeft / 7) * 100}%`, height: '100%', background: '#FF9800', borderRadius: 2 }} />
            </div>
          </div>
        </div>
        ) : user.isPro ? (
        <div style={{ padding: '12px 14px 6px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${tierColor}22, transparent 70%)`,
            border: `1px solid ${tierColor}55`,
            borderRadius: 16, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, color: tierColor, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Active plan</div>
                {/* Tier + days. > 9000 days is the bot's marker for a
                    lifetime account → show 'LIFETIME' instead of the
                    raw number; finite subscribers see '· N days'. */}
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: tierColor, letterSpacing: 1, lineHeight: 1, marginTop: 4 }}>
                  {tier.toUpperCase()}
                  {user.daysLeft > 9000
                    ? ' · LIFETIME'
                    : user.daysLeft > 0 ? ` · ${user.daysLeft} days` : ''}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  {user.daysLeft > 9000
                    ? 'Permanent access'
                    : user.daysLeft > 0 ? 'Subscription active' : 'Subscription inactive'}
                </div>
              </div>
              {/* Hide Manage when there are real days left — we don't want
                  the user to accidentally re-buy on top of an active sub. */}
              {!(user.daysLeft > 0) && (
                <button onClick={() => nav.go('subscription')} style={{ background: 'transparent', border: `1px solid ${tierColor}`, color: tierColor, padding: '7px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Manage</button>
              )}
            </div>
            {/* Skip the bar for lifetime — it'd just be a full strip
                forever, no useful info there. */}
            {user.daysLeft > 0 && user.daysLeft <= 9000 && (
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

        {/* Row list — only rows that actually work. Mock Language /
            Notifications / Appearance / Support / Terms entries were
            removed; they'll come back when their screens exist. */}
        <div style={{ padding: '8px 14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <RowGroup label="Library">
            <Row icon="⭐" color={accent} label="My saved" badge={String(savedCount)} onClick={() => nav.go('saved')} />
            <Row icon="📂" color={accent} label="Playlists" badge={String((window.useUserPlaylists().data?.playlists || []).length)} onClick={() => nav.go('saved', { tab: 'playlists' })} />
            <Row icon="🎤" color={accent} label="Followed artists" badge={String(followingCount)} onClick={() => nav.go('artists')} />
            {/* Subscribe row only shown when the user has no remaining
                days — otherwise we don't want to encourage a second
                purchase on top of an active sub. */}
            {!(user.daysLeft > 0) && (
              <Row icon="🔄" color={accent} label={user.isPro ? 'Renew subscription' : 'Get PRO'} onClick={() => nav.go('subscription')} />
            )}
          </RowGroup>
          <RowGroup label="Help">
            <Row icon="❓" label="FAQ" onClick={() => nav.go('faq')} />
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
// ── Subscription page — 1:1 port of the live miniapp flow ──────
// Tiers PLUS / PRO / ELITE (ELITE = SOON, disabled); one monthly plan
// (31 days). Payment methods: Card via Tribute / TG Stars / SBP via
// Tribute / Crypto via Cryptocloud. Trial card up top calls
// actionStartFreeTrial. After paid checkout the AppShell-level
// startInvitePolling picks up the bot-issued group invite link.
const TIER_PRICES = {
  plus:  { eur: 6, stars: 500 },
  pro:   { eur: 8, stars: 650 },
  elite: { eur: 10, stars: 800 },
};
function SubscriptionPage({ accent = C.pink }) {
  const nav = window.useNav();
  const userState = window.useUser();
  const user = userState.data || {};
  const isInsideTg = !!(window.isInsideTelegram && window.isInsideTelegram());
  const hasAnySub = user.isPro;
  const isInfiniteSub = user.isInfinite;

  // Tier carousel state. ELITE is "SOON" and cannot be picked.
  const [tier, setTier] = React.useState('plus');
  // Payment method: 0=Card 1=Stars 2=SBP 3=Crypto
  const [method, setMethod] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // Promo: local-only ASMR2026 = +7 days note (matches live miniapp).
  const [promo, setPromo] = React.useState('');
  const [promoState, setPromoState] = React.useState(''); // 'ok' | 'bad' | ''
  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) { setPromoState('bad'); return; }
    if (code === 'ASMR2026') { setPromoState('ok'); }
    else { setPromoState('bad'); }
  };

  // Match live miniapp's per-tier Tribute URLs (provided via /miniapp/profile).
  const tributeUrl = tier === 'pro'
    ? (user.tributeProUrl || 'https://t.me/tribute/app?startapp=sT5D')
    : (user.tributePlusUrl || 'https://t.me/tribute/app?startapp=sQSn');

  const planDays = 31;
  const tierMeta = {
    plus:  { name: 'PLUS',  color: C.pink,   accent: C.pink,  gradient: 'linear-gradient(145deg,#1a0d1f,#260d1a)' },
    pro:   { name: 'PRO',   color: '#00E5FF', accent: '#00E5FF', gradient: 'linear-gradient(145deg,#091820,#0d1f26)' },
    elite: { name: 'ELITE', color: '#FFD700', accent: '#FFD700', gradient: 'linear-gradient(145deg,#1a1508,#261d08)' },
  };
  const cur = tierMeta[tier];
  const price = TIER_PRICES[tier].eur;

  const onPay = async () => {
    if (busy) return;
    // Preview-mode (outside Telegram): just flip Pro locally.
    if (!isInsideTg) {
      nav.setPro(true); nav.reset('home'); return;
    }
    setBusy(true);
    try {
      // ── Card / SBP via Tribute ──────────────────────────────
      if (method === 0 || method === 2) {
        const r = window.actionOpenTribute(tributeUrl,
          (link) => {
            // Bot issued the invite — pop the modal and reset caches.
            nav.openInvite?.(link);
            window.invalidate?.('user');
            window.invalidate?.('my_invite');
          },
          () => { /* timeout — silent; user can re-open via bell */ },
        );
        if (!r.ok) { alert(r.message || 'Could not open Tribute'); return; }
        // Drop back to home so the polling overlay isn't sitting on a
        // dead subscription screen. The invite modal will surface when
        // the bot finishes.
        nav.reset('home');
        return;
      }
      // ── TG Stars ────────────────────────────────────────────
      if (method === 1) {
        const r = await window.actionCreateStarsInvoice(planDays, tier);
        if (!r.ok) { alert(r.message || 'Could not create Stars invoice'); return; }
        const tg = window.Telegram?.WebApp;
        if (tg && typeof tg.openInvoice === 'function') {
          tg.openInvoice(r.invoice_link, (status) => {
            if (status === 'paid') {
              window.invalidate?.('user');
              window.invalidate?.('my_invite');
              // Bot issues invite via postback — poll for it.
              window.startInvitePolling?.(
                (link) => nav.openInvite?.(link),
                () => {},
              );
              nav.reset('home');
            } else if (status === 'failed') {
              alert('❌ Payment failed');
            } else if (status === 'cancelled') {
              // user cancelled — no toast needed
            }
          });
        } else if (tg?.openLink) {
          tg.openLink(r.invoice_link);
        }
        return;
      }
      // ── Cryptocloud ─────────────────────────────────────────
      if (method === 3) {
        const r = await window.actionStartCryptoCheckout(tier);
        if (!r.ok) { alert(r.message || 'Could not create crypto invoice'); return; }
        // Open hosted Cryptocloud page in external browser/WebApp.
        const tg = window.Telegram?.WebApp;
        if (tg?.openLink) tg.openLink(r.pay_url);
        else window.open(r.pay_url, '_blank', 'noopener');
        // Start polling for the bot-issued invite link.
        window.startInvitePolling?.(
          (link) => nav.openInvite?.(link),
          () => {},
        );
        nav.reset('home');
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  // Free trial onClick — guarded by user.trialUsed (also enforced server-side).
  const onTrial = async () => {
    if (busy) return;
    if (user.trialUsed) { alert('You\'ve already used your free trial.'); return; }
    setBusy(true);
    try {
      if (!isInsideTg) { nav.setPro(true); nav.reset('home'); return; }
      const r = await window.actionStartFreeTrial();
      if (!r.ok) {
        if (r.reason === 'trial-used') alert('You\'ve already used your free trial.');
        else alert(r.message || 'Could not activate trial.');
        return;
      }
      nav.reset('home');
      if (r.invite_link) setTimeout(() => nav.openInvite?.(r.invite_link), 350);
      window.invalidate?.('user');
      window.invalidate?.('my_invite');
    } finally { setBusy(false); }
  };

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
        <div style={{ padding: '20px 18px 4px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1.5 }}>
            {hasAnySub
              ? <>You're <span style={{ color: accent }}>Subscribed</span></>
              : <>Choose <span style={{ color: accent }}>Plan</span></>}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {hasAnySub
              ? (isInfiniteSub ? 'Lifetime access · everything unlocked' : `Current: ${user.daysLeft} days · max 60 total`)
              : 'Cancel anytime'}
          </div>
        </div>

        {/* Tier carousel — 3 cards horizontally scrollable, snap-to */}
        <div style={{
          display: 'flex', gap: 12, padding: '14px 14px 6px',
          overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
        }}>
          {['plus','pro','elite'].map((id) => {
            const t = tierMeta[id];
            const isActive = id === tier;
            const isSoon = id === 'elite';
            const onTap = () => { if (!isSoon) setTier(id); };
            return (
              <div key={id} onClick={onTap} style={{
                flexShrink: 0, width: 220, scrollSnapAlign: 'center',
                background: t.gradient,
                border: `2px solid ${isActive ? t.color : C.border}`,
                borderRadius: 18,
                padding: '14px 14px 12px',
                cursor: isSoon ? 'default' : 'pointer',
                opacity: isSoon ? 0.65 : 1,
                position: 'relative',
                boxShadow: isActive ? `0 10px 28px ${t.color}33` : 'none',
                transition: 'all 200ms',
              }}>
                {isSoon && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: t.color, color: '#000',
                    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.4,
                  }}>SOON</div>
                )}
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: t.color, letterSpacing: 1, lineHeight: 1 }}>{t.name}</div>
                {!isSoon ? (
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, marginTop: 6, lineHeight: 1 }}>
                    €{TIER_PRICES[id].eur} <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>/ mo</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, marginTop: 6, color: 'rgba(255,215,0,0.6)' }}>privateleaks.tv</div>
                )}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.78)' }}>
                  {id === 'plus' && (<>
                    <div>✅ All ASMR videos</div>
                    <div>✅ Photo galleries</div>
                    <div>✅ Favorites & playlists</div>
                  </>)}
                  {id === 'pro' && (<>
                    <div>✅ Everything in PLUS</div>
                    <div>📺 Stream VODs</div>
                    <div>▶️ YouTube backups</div>
                    <div>💎 PRO badge</div>
                  </>)}
                  {id === 'elite' && (<>
                    <div>✅ Everything in PRO</div>
                    <div>🌐 asmrleaks.tv + privateleaks.tv</div>
                    <div>👑 ELITE badge</div>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
        {/* Tier dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 0 10px' }}>
          {['plus','pro','elite'].map((id) => (
            <span key={id} style={{
              width: id === tier ? 18 : 6, height: 6, borderRadius: 999,
              background: id === tier ? tierMeta[id].color : 'rgba(255,255,255,0.18)',
              transition: 'all 200ms',
            }} />
          ))}
        </div>

        {/* Free trial card */}
        {!user.trialUsed && (
          <div onClick={onTrial} style={{
            margin: '4px 14px 10px',
            background: 'rgba(204,255,68,0.07)',
            border: '1px solid rgba(204,255,68,0.25)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <div>
                <div style={{ fontSize: 12.5, color: C.lime, fontWeight: 700 }}>New? Try 5 days free</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>no card · cancel anytime</div>
              </div>
            </div>
            <span style={{
              background: C.lime, color: '#000',
              padding: '6px 12px', borderRadius: 999,
              fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4,
            }}>{busy ? '…' : 'Try free →'}</span>
          </div>
        )}

        {/* Plan card — single 1-month option */}
        <div style={{ padding: '4px 14px 6px' }}>
          <div style={{
            background: C.dark2, border: `1.5px solid ${cur.color}`,
            borderRadius: 16, padding: '14px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 9.5, color: cur.color, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase' }}>Most popular</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 2, lineHeight: 1 }}>1 Month</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>€{(price/planDays).toFixed(2)}/day · ⭐ {TIER_PRICES[tier].stars} Stars</div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: cur.color, lineHeight: 1 }}>
              €{price}
            </div>
          </div>
        </div>

        {/* Payment method section */}
        <div style={{ padding: '14px 14px 6px' }}>
          <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Payment method</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { i: 0, icon: '💳', name: 'Card',     desc: 'via Tribute' },
              { i: 1, icon: '⭐', name: 'TG Stars', desc: 'Telegram Stars' },
              { i: 2, icon: '🏦', name: 'СБП',      desc: 'Russian banks · Tribute' },
              { i: 3, icon: '₿',  name: 'Crypto',   desc: 'USDT · TON · BTC · ETH' },
            ].map((m) => {
              const active = method === m.i;
              return (
                <div key={m.i} onClick={() => setMethod(m.i)} style={{
                  background: active ? `${cur.color}14` : C.dark2,
                  border: `1.5px solid ${active ? cur.color : C.border}`,
                  borderRadius: 12, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{m.desc}</div>
                  </div>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `2px solid ${active ? cur.color : C.border2}`,
                    background: active ? cur.color : 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#000' }} />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promo code */}
        <div style={{ padding: '12px 14px 4px' }}>
          <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Promo code</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={promo}
              onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoState(''); }}
              placeholder="Enter promo code"
              style={{
                flex: 1, minWidth: 0,
                background: C.dark2,
                border: `1px solid ${promoState === 'ok' ? C.lime : promoState === 'bad' ? '#FF6B6B' : C.border}`,
                color: C.text, padding: '11px 12px', borderRadius: 12,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={applyPromo} style={{
              background: 'transparent', color: accent,
              border: `1px solid ${accent}55`, borderRadius: 12,
              padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Apply</button>
          </div>
          {promoState === 'ok' && (
            <div style={{ fontSize: 11, color: C.lime, marginTop: 6 }}>🎉 Promo applied · +7 days bonus</div>
          )}
          {promoState === 'bad' && (
            <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 6 }}>❌ Invalid promo code</div>
          )}
        </div>

        {/* Pay CTA */}
        <div style={{ padding: '16px 14px 8px' }}>
          <button onClick={onPay} disabled={busy} style={{
            width: '100%',
            background: busy ? 'rgba(255,255,255,0.08)'
                            : `linear-gradient(135deg, ${cur.color}, ${C.purple})`,
            color: busy ? C.muted2 : '#000',
            border: 'none', padding: '16px', borderRadius: 16,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 17, letterSpacing: 1.2,
            cursor: busy ? 'default' : 'pointer',
            boxShadow: busy ? 'none' : `0 8px 24px ${cur.color}44`,
          }}>
            {busy ? 'PROCESSING…' : `SUBSCRIBE — ${cur.name} €${price}/MO →`}
          </button>
          <div style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            Cancel anytime · Powered by Tribute / Cryptocloud
          </div>
        </div>

      </div>
    </Phone>
  );
}

// ── FAQ PAGE ──────────────────────────────────────────────────
// Q&A copied from the live miniapp so answers stay consistent across
// both versions. If you change the live FAQ, mirror it here.
const FAQ_ITEMS = [
  { q: 'How do I access the group?', a: "After subscribing, you'll receive an invite link automatically. Just click it to join." },
  { q: 'Does it auto-renew?',         a: 'Yes! Your subscription will automatically renew on the day it expires. You can cancel anytime.' },
  { q: 'Can I try for free?',         a: 'Yes! New users get 5 free days. Just tap "Try Free" in the main menu.' },
  { q: 'I paid but no access?',       a: 'Contact support — we usually fix it within minutes.' },
];
// Telegram handle for the support chat — same one the live miniapp
// uses (openTelegramChat('sonnnnnua') → https://t.me/sonnnnnua).
const SUPPORT_TG_USERNAME = 'sonnnnnua';
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
            <button onClick={() => {
              // Open support chat in Telegram. Same handle as the live miniapp.
              const url = `https://t.me/${SUPPORT_TG_USERNAME}`;
              const tg = window.Telegram?.WebApp;
              if (tg && typeof tg.openTelegramLink === 'function') tg.openTelegramLink(url);
              else if (tg && typeof tg.openLink === 'function') tg.openLink(url);
              else window.open(url, '_blank', 'noopener');
            }} style={{
              background: accent, color: '#000', border: 'none',
              padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit',
            }}>💬 Chat</button>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// ── SEARCH PAGE ───────────────────────────────────────────────
// Single-screen search across artists + videos. Opened from AppHeader's
// magnifier icon and from Home's Browse pills (with the tag pre-filled).
//
// Layout:
//   slim back bar + input (autofocused) + ✕ to clear
//   then either:
//     · no query → Browse rail (tags as quick-pick chips)
//     · with query → artist row (filtered locally from useArtists by name)
//                    + video list (from /miniapp/search)
//
// We debounce the q → deferredQ transition by 280ms so the backend isn't
// hammered on every keystroke; the artist filter is local & instant.
function SearchPage({ accent = C.pink }) {
  const nav = window.useNav();
  const initialQ = nav.params?.q || '';
  const [q, setQ] = React.useState(initialQ);
  const [deferredQ, setDeferredQ] = React.useState(initialQ);
  const inputRef = React.useRef(null);

  // Debounce backend search — local artist filter responds instantly so
  // the user sees something the moment they start typing.
  React.useEffect(() => {
    const id = setTimeout(() => setDeferredQ(q.trim()), 280);
    return () => clearTimeout(id);
  }, [q]);

  // Focus the input on mount so the keyboard pops automatically.
  React.useEffect(() => {
    const t = setTimeout(() => { try { inputRef.current?.focus(); } catch (_) {} }, 80);
    return () => clearTimeout(t);
  }, []);

  const tagsState  = window.useTags();
  const tags       = (tagsState.data || []);
  const artistsAll = (window.useArtists().data || []);
  const searchState = window.useSearch(deferredQ, 24);
  const videoResults = searchState.data?.results || [];

  // Local artist match — case-insensitive contains. Cap to a sensible
  // number so the rail stays scrollable rather than overwhelming.
  const matchedArtists = React.useMemo(() => {
    const needle = deferredQ.toLowerCase();
    if (!needle || needle.length < 2) return [];
    return artistsAll.filter(a => {
      const name = (a.name || '').toLowerCase();
      const handle = (a.handle || '').toLowerCase();
      return name.includes(needle) || handle.includes(needle);
    }).slice(0, 12);
  }, [deferredQ, artistsAll]);

  const showResults = deferredQ.length >= 2;
  const isLoading = showResults && searchState.loading;
  const noResults = showResults && !searchState.loading && matchedArtists.length === 0 && videoResults.length === 0;

  return (
    <Phone>
      {/* Slim header — back + input + clear */}
      <div style={{
        padding: '8px 10px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0, background: C.dark2, borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={() => nav.back()} style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'transparent', border: 'none',
          color: C.text, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><Ico.chevL /></button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: C.dark, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '8px 10px',
        }}>
          <span style={{ color: C.muted, flexShrink: 0 }}><Ico.search /></span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artists, tags, titles…"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            style={{
              flex: 1, minWidth: 0,
              background: 'transparent', border: 'none', color: C.text,
              fontSize: 14, outline: 'none', fontFamily: 'inherit',
              padding: 0,
            }}
          />
          {q && (
            <button onClick={() => { setQ(''); setDeferredQ(''); inputRef.current?.focus(); }} style={{
              background: 'transparent', border: 'none', color: C.muted,
              fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 2,
            }}>×</button>
          )}
        </div>
      </div>

      <div style={SCROLL_BODY}>
        {!showResults && (
          <React.Fragment>
            <div style={{ padding: '18px 14px 6px' }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Browse</div>
            </div>
            <div style={{ padding: '6px 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map(t => (
                <button key={t.id} onClick={() => { setQ(t.label); setDeferredQ(t.label); }} style={{
                  background: `${accent}18`, color: accent,
                  border: `1px solid ${accent}55`, borderRadius: 999,
                  padding: '8px 14px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
            {/* Hint */}
            <div style={{ padding: '6px 14px', color: C.muted, fontSize: 12 }}>
              Type 2+ characters to search across artists and videos.
            </div>
          </React.Fragment>
        )}

        {showResults && (
          <React.Fragment>
            {matchedArtists.length > 0 && (
              <React.Fragment>
                <div style={{ padding: '14px 14px 4px' }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Artists · {matchedArtists.length}
                  </div>
                </div>
                <div style={{ padding: '8px 14px 6px', display: 'flex', gap: 12, overflowX: 'auto' }}>
                  {matchedArtists.map(a => (
                    <div key={a.id} onClick={() => nav.go('artist', { id: a.id })} style={{
                      flexShrink: 0, width: 78, textAlign: 'center', cursor: 'pointer',
                    }}>
                      <Avatar artist={a} size={64} ring={accent} />
                      <div style={{
                        fontSize: 11, fontWeight: 600, marginTop: 6,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{a.name}</div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            )}

            <div style={{ padding: '14px 14px 4px' }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                Videos {videoResults.length ? `· ${videoResults.length}` : ''}
              </div>
            </div>

            {isLoading && (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
                Searching…
              </div>
            )}

            {!isLoading && videoResults.length > 0 && (
              <div style={{ padding: '6px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {videoResults.map(v => <CompactRow key={v.id} v={v} accent={accent} />)}
              </div>
            )}

            {noResults && (
              <div style={{ padding: '40px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>🔎</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Nothing matched "{deferredQ}"</div>
                <div style={{ fontSize: 12, color: C.muted }}>Try a different word or pick a tag above.</div>
              </div>
            )}
          </React.Fragment>
        )}
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

  // Live content with true pagination — each list fetches /artist_content
  // with offset when Load more is tapped.
  const videos = window.useArtistContentList(a.name, 'video');
  const shorts = window.useArtistContentList(a.name, 'short');
  const photos = window.useArtistContentList(a.name, 'photo');

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

  // Tab counts use the *total* from the artist record (a.videos / a.photos /
  // a.shorts) when available — that's the true catalog size. Live counts as
  // fallback so the UI still shows something if the artists endpoint hasn't
  // landed yet.
  const totalVideos = a.videos || videos.items.length;
  const totalPhotos = a.photos || photos.items.length;
  const totalShorts = a.shorts || shorts.items.length;
  const stats = [
    { v: totalVideos, l: 'Videos' },
    { v: (totalPhotos || 0).toLocaleString(), l: 'Photos' },
    { v: totalShorts || 0, l: 'Shorts' },
  ];

  // Photo lightbox state — null = closed, number = index in photos.items.
  const [lightboxIdx, setLightboxIdx] = React.useState(null);

  // Empty-state: artist exists but has no content uploaded yet — show a
  // link to the group thread if the backend gave us topic_url.
  const hasAnyContent = videos.items.length + shorts.items.length + photos.items.length > 0;
  const topicUrl = a.topicUrl || a.raw?.topic_url || '';

  const openTopic = () => {
    if (!topicUrl) return;
    const tg = window.Telegram?.WebApp;
    tg?.openLink ? tg.openLink(topicUrl) : window.open(topicUrl, '_blank');
  };

  return (
    <Phone>
      {/* Slim back bar — pinned to the top of the player surface, not 44px
          below it (the old offset was for the fake status bar we removed).
          Share button removed — Telegram WebView already shows the user a
          way to open the group via the bot if they need it. */}
      {/* Phone is rendered inside PhoneStage which already reserves the
          top safe area. Absolute top:8px is relative to Phone, so we
          don't re-add the inset here or it would double-pad. */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', flexShrink: 0, position: 'absolute', top: 8, left: 0, right: 0, zIndex: 5 }}>
        <button onClick={() => nav.back()} style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Ico.chevL /></button>
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
        {!videos.loading && !shorts.loading && !photos.loading && !hasAnyContent && (
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
                { id: 'videos', l: 'Videos', c: totalVideos },
                { id: 'shorts', l: 'Shorts', c: totalShorts },
                { id: 'photos', l: 'Photos', c: totalPhotos },
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

            {/* Videos — real list, paginated through /artist_content */}
            {tab === 'videos' && (
              <div>
                <div style={{ padding: '12px 14px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {videos.items.map(v => <CompactRow key={v.id} v={v} accent={accent} />)}
                </div>
                {videos.hasMore && (
                  <div style={{ padding: '6px 14px 18px' }}>
                    <button disabled={videos.loading} onClick={videos.loadMore} style={loadMoreBtnStyle(accent)}>
                      {videos.loading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Shorts — real video previews, 3-col grid (gated for free) */}
            {tab === 'shorts' && (
              <div>
                <div style={{ padding: '12px 14px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {shorts.items.map((s, i) => {
                    if (!nav.isPro) {
                      // Artist photo is the natural fallback here — we're
                      // already on the artist's page, and shorts rarely
                      // ship a thumbnail_url.
                      const bgUrl = s.thumb?.src || a.profilePhoto || a.photo;
                      return (
                        <div key={s.id || i} onClick={() => nav.openPaywall && nav.openPaywall()} style={{
                          aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden',
                          position: 'relative', background: '#161617', cursor: 'pointer',
                        }}>
                          <div style={{
                            position: 'absolute', inset: 0,
                            filter: 'blur(7px) brightness(0.7)',
                            WebkitFilter: 'blur(7px) brightness(0.7)',
                            transform: 'scale(1.08)',
                            background: bgUrl
                              ? `url('${bgUrl.replace(/'/g, "\\'")}') center/cover no-repeat`
                              : (s.thumb?.bg || '#1a1a1c'),
                          }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.6)',
                              border: `1px solid ${accent}55`,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14,
                            }}>🔒</div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={s.id || i} onClick={() => nav.openShorts(shorts.items, i)} style={{ aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#161617', cursor: 'pointer' }}>
                        <window.ShortsThumbVideo short={s} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
                        {s.duration && <span style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 9, fontWeight: 700, color: '#fff' }}>{s.duration}</span>}
                      </div>
                    );
                  })}
                </div>
                {shorts.hasMore && (
                  <div style={{ padding: '6px 14px 18px' }}>
                    <button disabled={shorts.loading} onClick={shorts.loadMore} style={loadMoreBtnStyle(accent)}>
                      {shorts.loading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Photos — real thumbnails from artist content; tap opens lightbox */}
            {tab === 'photos' && (
              <div>
                <div style={{ padding: '12px 14px 4px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {photos.items.map((p, i) => {
                    const url = p.thumb?.src || p.raw?.url || p.raw?.thumbnail_url || '';
                    if (!nav.isPro) {
                      return (
                        <div key={p.id || i} onClick={() => nav.openPaywall && nav.openPaywall()} style={{
                          aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden',
                          position: 'relative', cursor: 'pointer', background: '#1a1a1c',
                        }}>
                          <div style={{
                            position: 'absolute', inset: 0,
                            filter: 'blur(7px) brightness(0.7)',
                            WebkitFilter: 'blur(7px) brightness(0.7)',
                            transform: 'scale(1.08)',
                            background: url
                              ? `url('${url.replace(/'/g, "\\'")}') center/cover no-repeat`
                              : (p.thumb?.bg || '#1a1a1c'),
                          }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.6)',
                              border: `1px solid ${accent}55`,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12,
                            }}>🔒</div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={p.id || i} onClick={() => setLightboxIdx(i)} style={{
                        aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', position: 'relative',
                        cursor: 'pointer',
                        background: url
                          ? `url('${url.replace(/'/g, "\\'")}') center/cover no-repeat`
                          : (p.thumb?.bg || '#1a1a1c'),
                      }} />
                    );
                  })}
                </div>
                {photos.hasMore && (
                  <div style={{ padding: '6px 14px 18px' }}>
                    <button disabled={photos.loading} onClick={photos.loadMore} style={loadMoreBtnStyle(accent)}>
                      {photos.loading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        )}
      </div>
      {/* Photo lightbox overlay — full-screen, watermarked. */}
      {lightboxIdx != null && (
        <window.PhotoLightbox
          photos={photos.items}
          index={lightboxIdx}
          onNav={(i) => setLightboxIdx(i)}
          onClose={() => setLightboxIdx(null)}
        />
      )}
      <BottomNav active="artists" accent={accent} />
    </Phone>
  );
}

Object.assign(window, { ProfilePage, SubscriptionPage, FAQPage, PaywallLock, ArtistPage, SearchPage });
