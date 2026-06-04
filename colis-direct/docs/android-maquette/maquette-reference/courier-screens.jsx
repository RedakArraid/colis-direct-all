// ColisDirect — Courier (livreur) app screens
// Exports to window: CourierDashboard, CourierAvailable, CourierDetail,
// CourierActive, CourierProof, CourierEarnings, CourierHistory, CourierProfile

const CrC = window.CD;
const CrIc = window.CDIcon;

// Courier bottom tab bar
function CrTabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Accueil', icon: 'home' },
    { id: 'courses', label: 'Courses', icon: 'truck' },
    { id: 'gains', label: 'Gains', icon: 'wallet' },
    { id: 'profile', label: 'Profil', icon: 'user' },
  ];
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: '#fff',
      borderTop: `1px solid ${CrC.line}`, padding: '8px 8px 14px',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: on ? CrC.orange : '#9CA3AF', flex: 1,
          }}>
            <CrIc name={t.icon} size={22} color={on ? CrC.orange : '#9CA3AF'} stroke={on ? 2 : 1.7} />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CrScreen({ children, tab = 'home', safeTop = 0, noTab = false }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#fff', fontFamily: CrC.font, color: CrC.ink,
    }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {safeTop > 0 && <div style={{ height: safeTop, flexShrink: 0 }} />}
        {children}
      </div>
      {!noTab && <CrTabBar active={tab} />}
    </div>
  );
}

function CrTop({ title, action, light }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: light ? 'none' : `1px solid ${CrC.line}`,
      background: light ? 'transparent' : '#fff',
      color: light ? '#fff' : CrC.ink,
    }}>
      <CrIc name="chev-left" size={24} color={light ? '#fff' : CrC.ink} />
      <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
      <div style={{ width: 24, display: 'flex', justifyContent: 'flex-end' }}>{action}</div>
    </div>
  );
}

// Reusable map backdrop
function CrMap({ height = 200, route = false }) {
  return (
    <div style={{ position: 'relative', height, overflow: 'hidden', background: 'linear-gradient(135deg, #E8F0E8 0%, #DDEBDD 100%)' }}>
      <svg width="100%" height="100%" viewBox="0 0 360 240" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
        <path d="M-20 70 L380 90" stroke="#fff" strokeWidth="16" />
        <path d="M-20 160 L380 180" stroke="#fff" strokeWidth="11" />
        <path d="M90 -20 L110 300" stroke="#fff" strokeWidth="12" />
        <path d="M250 -20 L270 300" stroke="#fff" strokeWidth="16" />
        <rect x="140" y="100" width="80" height="50" fill="#D0E0E8" opacity="0.6" rx="4" />
        {route && <path d="M50 200 C 130 150, 200 170, 300 50" stroke={CrC.orange} strokeWidth="4" strokeDasharray="2 0" fill="none" strokeLinecap="round" />}
        {route && <circle cx="50" cy="200" r="8" fill={CrC.green} stroke="#fff" strokeWidth="3" />}
        {route && <circle cx="300" cy="50" r="8" fill={CrC.orange} stroke="#fff" strokeWidth="3" />}
      </svg>
    </div>
  );
}

const crPrimary = {
  width: '100%', background: CrC.orange, color: '#fff', border: 'none',
  padding: '15px', borderRadius: 12, fontWeight: 700, fontSize: 15,
};
const crOutline = {
  width: '100%', background: '#fff', color: CrC.ink, border: `1.5px solid ${CrC.line}`,
  padding: '15px', borderRadius: 12, fontWeight: 700, fontSize: 15,
};

function CrPill({ children, bg = CrC.orangeSoft, color = CrC.orange }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{children}</span>
  );
}

// ─────────────────── 1. DASHBOARD ───────────────────
function CourierDashboard({ safeTop = 0 }) {
  return (
    <CrScreen tab="home" safeTop={0}>
      {/* Dark header */}
      <div style={{ background: '#111', color: '#fff', padding: `${16 + safeTop}px 18px 22px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 23, background: CrC.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 17,
            }}>AK</div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Bonjour 👋</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Aboubacar K.</div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <CrIc name="bell" size={24} color="#fff" />
            <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5, background: CrC.orange, border: '2px solid #111' }} />
          </div>
        </div>

        {/* Online toggle */}
        <div style={{
          marginTop: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 14,
          padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#34D058', boxShadow: '0 0 0 4px rgba(52,208,88,0.25)' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>En ligne</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Vous recevez les nouvelles courses</div>
            </div>
          </div>
          <div style={{
            width: 48, height: 28, borderRadius: 14, background: CrC.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 3,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: '#fff' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <CrStat icon="truck" n="12" l="Courses aujourd'hui" />
          <CrStat icon="wallet" n="35 000" l="Gains du jour (FCFA)" />
          <CrStat icon="star" n="4.9" l="Note moyenne" />
          <CrStat icon="check-circle" n="98%" l="Taux de réussite" />
        </div>

        {/* Available rides preview */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Courses disponibles</div>
          <span style={{ fontSize: 13, color: CrC.orange, fontWeight: 700 }}>Voir tout</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CrRideCard from="Plateau" to="Cocody" dist="6.2 km" price="2 500" tag="Express" />
          <CrRideCard from="Marcory" to="Yopougon" dist="11.8 km" price="3 800" />
        </div>
      </div>
    </CrScreen>
  );
}
function CrStat({ icon, n, l }) {
  return (
    <div style={{ background: CrC.bgSoft, borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: CrC.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CrIc name={icon} size={16} color={CrC.orange} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: CrC.ink, marginTop: 8 }}>{n}</div>
      <div style={{ fontSize: 11, color: CrC.muted, lineHeight: 1.2 }}>{l}</div>
    </div>
  );
}
function CrRideCard({ from, to, dist, price, tag }) {
  return (
    <div style={{ border: `1px solid ${CrC.line}`, borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* route dots */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: CrC.green }} />
            <span style={{ width: 2, height: 22, background: CrC.line }} />
            <span style={{ width: 9, height: 9, borderRadius: 5, background: CrC.orange }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{from}</div>
            <div style={{ fontSize: 11, color: CrC.muted, margin: '4px 0' }}>{dist}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{to}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {tag && <div style={{ marginBottom: 6 }}><CrPill>{tag}</CrPill></div>}
          <div style={{ fontSize: 18, fontWeight: 800, color: CrC.orange }}>{price}</div>
          <div style={{ fontSize: 11, color: CrC.muted }}>FCFA</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── 2. COURSES DISPONIBLES ───────────────────
function CourierAvailable({ safeTop = 0 }) {
  const rides = [
    { from: 'Plateau', to: 'Cocody Angré', dist: '6.2 km', time: '18 min', price: '2 500', tag: 'Express', cat: 'Vêtements · 1 kg' },
    { from: 'Marcory', to: 'Yopougon', dist: '11.8 km', time: '32 min', price: '3 800', cat: 'Documents · 0.5 kg' },
    { from: 'Treichville', to: 'Adjamé', dist: '4.5 km', time: '14 min', price: '1 800', cat: 'Électronique · 2 kg' },
    { from: 'Riviera', to: 'Plateau', dist: '8.1 km', time: '24 min', price: '2 900', tag: 'Express', cat: 'Colis · 3 kg' },
  ];
  return (
    <CrScreen tab="courses" safeTop={safeTop}>
      <CrTop title="Courses disponibles" action={<CrIc name="settings" size={22} color={CrC.ink} />} />
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px', overflowX: 'auto' }}>
        {['Toutes', 'Express', 'Proche', 'Mieux payées'].map((c, i) => (
          <span key={c} style={{
            background: i === 0 ? CrC.orange : CrC.bgSoft, color: i === 0 ? '#fff' : CrC.ink2,
            padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
          }}>{c}</span>
        ))}
      </div>
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rides.map((r, i) => (
          <div key={i} style={{ border: `1px solid ${CrC.line}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 5, background: CrC.green }} />
                  <span style={{ width: 2, height: 24, background: CrC.line }} />
                  <span style={{ width: 9, height: 9, borderRadius: 5, background: CrC.orange }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.from}</div>
                  <div style={{ fontSize: 11, color: CrC.muted, margin: '5px 0' }}>{r.cat}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.to}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {r.tag && <div style={{ marginBottom: 6 }}><CrPill>{r.tag}</CrPill></div>}
                <div style={{ fontSize: 20, fontWeight: 800, color: CrC.orange }}>{r.price}</div>
                <div style={{ fontSize: 11, color: CrC.muted }}>FCFA</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${CrC.line}` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: CrC.muted }}>
                <CrIc name="pin" size={14} color={CrC.muted} /> {r.dist}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: CrC.muted }}>
                <CrIc name="clock" size={14} color={CrC.muted} /> {r.time}
              </span>
              <button style={{
                marginLeft: 'auto', background: CrC.orange, color: '#fff', border: 'none',
                padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13,
              }}>Accepter</button>
            </div>
          </div>
        ))}
      </div>
    </CrScreen>
  );
}

// ─────────────────── 3. DÉTAIL COURSE ───────────────────
function CourierDetail({ safeTop = 0 }) {
  return (
    <CrScreen tab="courses" safeTop={0} noTab>
      <div style={{ position: 'relative' }}>
        <CrMap height={240 + safeTop} route />
        <div style={{ position: 'absolute', top: safeTop, left: 0, right: 0 }}>
          <CrTop title="" light action={<span />} />
        </div>
      </div>
      {/* Sheet */}
      <div style={{ flex: 1, overflow: 'auto', marginTop: -22, background: '#fff', borderRadius: '22px 22px 0 0', position: 'relative', padding: '18px 16px 16px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: CrC.line, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CrPill>Course Express</CrPill>
          <div style={{ fontSize: 24, fontWeight: 800, color: CrC.orange }}>2 500 <span style={{ fontSize: 13, color: CrC.muted }}>FCFA</span></div>
        </div>

        {/* Route */}
        <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: 6, background: CrC.green }} />
            <span style={{ width: 2, flex: 1, background: CrC.line, minHeight: 36 }} />
            <span style={{ width: 11, height: 11, borderRadius: 6, background: CrC.orange }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ paddingBottom: 16 }}>
              <div style={{ fontSize: 11, color: CrC.muted }}>RÉCUPÉRATION</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Plateau, Rue du Commerce</div>
              <div style={{ fontSize: 12, color: CrC.muted }}>Awa Koné · +225 07 00 00 00</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: CrC.muted }}>LIVRAISON</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Cocody Angré, 8e Tranche</div>
              <div style={{ fontSize: 12, color: CrC.muted }}>Eric Touré · +225 05 00 00 00</div>
            </div>
          </div>
        </div>

        {/* Package details */}
        <div style={{ marginTop: 16, background: CrC.bgSoft, borderRadius: 14, padding: 14, display: 'flex', gap: 16 }}>
          <CrMeta label="Distance" value="6.2 km" />
          <CrMeta label="Durée" value="~18 min" />
          <CrMeta label="Poids" value="1 kg" />
          <CrMeta label="Type" value="Vêtements" />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button style={crOutline}>Refuser</button>
          <button style={crPrimary}>Accepter la course</button>
        </div>
      </div>
    </CrScreen>
  );
}
function CrMeta({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: CrC.muted }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─────────────────── 4. COURSE EN COURS ───────────────────
function CourierActive({ safeTop = 0 }) {
  return (
    <CrScreen tab="courses" safeTop={0} noTab>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <CrMap height={300 + safeTop} route />
        {/* Live banner */}
        <div style={{ position: 'absolute', top: 16 + safeTop, left: 16, right: 16 }}>
          <div style={{
            background: '#111', color: '#fff', borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          }}>
            <CrIc name="truck" size={20} color={CrC.orange} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>En route vers la livraison</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Arrivée estimée · 11 min</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action sheet */}
      <div style={{ padding: '18px 16px', borderTop: `1px solid ${CrC.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: CrC.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: CrC.orange }}>ET</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Eric Touré</div>
            <div style={{ fontSize: 12, color: CrC.muted }}>Destinataire · Cocody Angré</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={crIconBtn}><CrIc name="phone" size={20} color={CrC.ink} /></button>
            <button style={crIconBtn}><CrIc name="mail" size={20} color={CrC.ink} /></button>
          </div>
        </div>

        <div style={{ marginTop: 14, background: CrC.bgSoft, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CrIc name="pin" size={18} color={CrC.orange} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Cocody Angré, 8e Tranche, Villa 12</div>
        </div>

        {/* Slide to confirm */}
        <div style={{
          marginTop: 16, background: CrC.orange, borderRadius: 14, padding: 6,
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 11, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CrIc name="chev-right" size={22} color={CrC.orange} />
          </div>
          <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>Glisser pour livrer</span>
        </div>
      </div>
    </CrScreen>
  );
}
const crIconBtn = {
  width: 44, height: 44, borderRadius: 22, border: `1px solid ${CrC.line}`, background: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─────────────────── 5. PREUVE DE LIVRAISON ───────────────────
function CourierProof({ safeTop = 0 }) {
  return (
    <CrScreen tab="courses" safeTop={safeTop}>
      <CrTop title="Preuve de livraison" />
      <div style={{ padding: 16 }}>
        <div style={{ background: CrC.greenSoft, borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <CrIc name="check-circle" size={28} color={CrC.green} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f5a2b' }}>Vous êtes arrivé !</div>
            <div style={{ fontSize: 12, color: '#0f5a2b', opacity: 0.8 }}>Confirmez la livraison du colis</div>
          </div>
        </div>

        {/* Photo capture */}
        <div style={{ marginTop: 18, fontSize: 13, fontWeight: 800, color: CrC.ink }}>Photo du colis livré</div>
        <div style={{
          marginTop: 10, border: `2px dashed ${CrC.line}`, borderRadius: 14, padding: '28px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: CrC.bgSoft,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${CrC.line}` }}>
            <CrIc name="eye" size={24} color={CrC.orange} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Prendre une photo</div>
          <div style={{ fontSize: 11, color: CrC.muted }}>Touchez pour ouvrir l'appareil photo</div>
        </div>

        {/* Confirmation code */}
        <div style={{ marginTop: 18, fontSize: 13, fontWeight: 800 }}>Code de confirmation</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          {['4', '7', '2', '9'].map((d, i) => (
            <div key={i} style={{
              flex: 1, height: 56, border: `1.5px solid ${i < 2 ? CrC.orange : CrC.line}`,
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: i < 2 ? CrC.ink : CrC.muted,
            }}>{i < 2 ? d : ''}</div>
          ))}
        </div>

        {/* Signature */}
        <div style={{ marginTop: 18, fontSize: 13, fontWeight: 800 }}>Signature du destinataire</div>
        <div style={{ marginTop: 10, height: 90, border: `1px solid ${CrC.line}`, borderRadius: 12, background: CrC.bgSoft, position: 'relative', overflow: 'hidden' }}>
          <svg width="100%" height="90" viewBox="0 0 320 90">
            <path d="M30 60 C 60 20, 90 80, 120 50 S 180 30, 220 55 S 270 70, 295 40" stroke={CrC.ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <button style={{ ...crPrimary, marginTop: 20 }}>Confirmer la livraison</button>
      </div>
    </CrScreen>
  );
}

// ─────────────────── 6. GAINS ───────────────────
function CourierEarnings({ safeTop = 0 }) {
  const bars = [40, 65, 50, 80, 55, 95, 70];
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return (
    <CrScreen tab="gains" safeTop={0}>
      <div style={{ background: CrC.orange, color: '#fff', padding: `${16 + safeTop}px 18px 26px` }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Gains cette semaine</div>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 4 }}>184 500 <span style={{ fontSize: 18 }}>FCFA</span></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 13, alignItems: 'center' }}>
          <CrIc name="refresh" size={15} color="#fff" />
          <span style={{ opacity: 0.92 }}>+12% vs semaine dernière</span>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Chart card */}
        <div style={{ border: `1px solid ${CrC.line}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Revenus par jour</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, gap: 8 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: '100%', height: h + '%', borderRadius: 6,
                  background: i === 5 ? CrC.orange : CrC.orangeSoft,
                }} />
                <span style={{ fontSize: 11, color: CrC.muted, fontWeight: 600 }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <CrStat icon="truck" n="47" l="Courses cette semaine" />
          <CrStat icon="clock" n="32h" l="Temps en ligne" />
        </div>

        {/* Wallet / payout */}
        <div style={{ marginTop: 16, border: `1px solid ${CrC.line}`, borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: CrC.muted }}>Solde disponible</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>184 500 FCFA</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: CrC.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CrIc name="wallet" size={22} color={CrC.orange} />
            </div>
          </div>
          <button style={{ ...crPrimary, marginTop: 14 }}>Retirer mes gains</button>
          <div style={{ fontSize: 11, color: CrC.muted, textAlign: 'center', marginTop: 10 }}>Virement Mobile Money sous 24h</div>
        </div>
      </div>
    </CrScreen>
  );
}

// ─────────────────── 7. HISTORIQUE ───────────────────
function CourierHistory({ safeTop = 0 }) {
  const groups = [
    { day: "Aujourd'hui", items: [
      { from: 'Plateau', to: 'Cocody', price: '2 500', time: '14:32', status: 'Livré' },
      { from: 'Marcory', to: 'Yopougon', price: '3 800', time: '11:10', status: 'Livré' },
    ]},
    { day: 'Hier', items: [
      { from: 'Treichville', to: 'Adjamé', price: '1 800', time: '17:45', status: 'Livré' },
      { from: 'Riviera', to: 'Plateau', price: '2 900', time: '15:20', status: 'Livré' },
      { from: 'Koumassi', to: 'Port-Bouët', price: '2 200', time: '09:05', status: 'Annulé' },
    ]},
  ];
  return (
    <CrScreen tab="courses" safeTop={safeTop}>
      <CrTop title="Historique" action={<CrIc name="settings" size={22} color={CrC.ink} />} />
      <div style={{ padding: 16 }}>
        {groups.map(g => (
          <div key={g.day} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: CrC.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{g.day}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {g.items.map((it, i) => {
                const cancelled = it.status === 'Annulé';
                return (
                  <div key={i} style={{ border: `1px solid ${CrC.line}`, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: cancelled ? '#FCEBEA' : CrC.greenSoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CrIc name={cancelled ? 'package' : 'check-circle'} size={20} color={cancelled ? CrC.red : CrC.green} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{it.from} → {it.to}</div>
                      <div style={{ fontSize: 12, color: CrC.muted, marginTop: 2 }}>
                        {it.time} · <span style={{ color: cancelled ? CrC.red : CrC.green, fontWeight: 700 }}>{it.status}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: cancelled ? CrC.muted : CrC.ink, textDecoration: cancelled ? 'line-through' : 'none' }}>{it.price}</div>
                      <div style={{ fontSize: 10, color: CrC.muted }}>FCFA</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </CrScreen>
  );
}

// ─────────────────── 8. PROFIL LIVREUR ───────────────────
function CourierProfile({ safeTop = 0 }) {
  return (
    <CrScreen tab="profile" safeTop={0}>
      <div style={{ background: '#111', color: '#fff', padding: `${20 + safeTop}px 18px 26px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 68, height: 68, borderRadius: 34, background: CrC.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, border: '3px solid rgba(255,255,255,0.25)' }}>AK</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Aboubacar K.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <CrIc name="star" size={15} color="#FFC93C" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>4.9</span>
              <span style={{ fontSize: 12, opacity: 0.6 }}>· 1 248 courses</span>
            </div>
            <div style={{ marginTop: 6 }}><CrPill bg="rgba(52,208,88,0.18)" color="#34D058">Livreur vérifié</CrPill></div>
          </div>
        </div>
      </div>

      {/* Vehicle card */}
      <div style={{ padding: 16 }}>
        <div style={{ border: `1px solid ${CrC.line}`, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: CrC.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CrIc name="truck" size={24} color={CrC.orange} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Moto · Yamaha</div>
            <div style={{ fontSize: 12, color: CrC.muted }}>Immatriculation · CI-4582-AB</div>
          </div>
          <CrPill bg={CrC.greenSoft} color={CrC.green}>Actif</CrPill>
        </div>

        {/* Menu */}
        <div style={{ marginTop: 8 }}>
          {[
            { i: 'user', l: 'Informations personnelles' },
            { i: 'shield', l: 'Documents & vérification' },
            { i: 'card', l: 'Moyens de paiement' },
            { i: 'wallet', l: 'Historique des gains' },
            { i: 'bell', l: 'Notifications' },
            { i: 'support', l: 'Aide & Support' },
            { i: 'settings', l: 'Paramètres' },
            { i: 'logout', l: 'Déconnexion', danger: true },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', borderBottom: `1px solid ${CrC.line}` }}>
              <CrIc name={r.i} size={20} color={r.danger ? CrC.red : CrC.ink2} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.danger ? CrC.red : CrC.ink }}>{r.l}</span>
              {!r.danger && <CrIc name="chev-right" size={18} color={CrC.muted} />}
            </div>
          ))}
        </div>
      </div>
    </CrScreen>
  );
}

Object.assign(window, {
  CourierDashboard, CourierAvailable, CourierDetail, CourierActive,
  CourierProof, CourierEarnings, CourierHistory, CourierProfile,
});
