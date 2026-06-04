// ColisDirect — Web courier/transporter dashboard
// Exports to window: WebCourier

const Wc_C = window.CD;
const Wc_Ic = window.CDIcon;

function WcSidebar({ active = 'dashboard' }) {
  const nav = [
    { id: 'dashboard', l: 'Tableau de bord', i: 'home' },
    { id: 'courses', l: 'Courses disponibles', i: 'truck', badge: '5' },
    { id: 'active', l: 'Course en cours', i: 'pin' },
    { id: 'history', l: 'Historique', i: 'history' },
    { id: 'earnings', l: 'Mes gains', i: 'wallet' },
    { id: 'profile', l: 'Profil', i: 'user' },
  ];
  return (
    <aside style={{
      width: 260, background: '#111', color: '#fff', flexShrink: 0,
      display: 'flex', flexDirection: 'column', padding: '24px 16px',
    }}>
      <div style={{ padding: '0 8px 24px' }}>
        <window.CDLogo size={20} light />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.6, padding: '0 12px 10px' }}>
        Espace livreur
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nav.map(n => {
          const on = n.id === active;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
              borderRadius: 10, background: on ? Wc_C.orange : 'transparent',
              color: on ? '#fff' : 'rgba(255,255,255,0.7)',
            }}>
              <Wc_Ic name={n.i} size={20} color={on ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: on ? 700 : 500 }}>{n.l}</span>
              {n.badge && (
                <span style={{
                  background: on ? '#fff' : Wc_C.orange, color: on ? Wc_C.orange : '#fff',
                  fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                }}>{n.badge}</span>
              )}
            </div>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: '#34D058', boxShadow: '0 0 0 4px rgba(52,208,88,0.25)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>En ligne</span>
          </div>
          <div style={{ width: 40, height: 24, borderRadius: 12, background: Wc_C.orange, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 3 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff' }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Vous recevez les nouvelles courses</div>
      </div>
    </aside>
  );
}

function WcStat({ icon, n, l, accent }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 16, padding: 20 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: Wc_C.orangeSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Wc_Ic name={icon} size={22} color={Wc_C.orange} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 14 }}>{n}</div>
      <div style={{ fontSize: 13, color: Wc_C.muted, marginTop: 2 }}>{l}</div>
    </div>
  );
}

function WcRouteDots({ h = 26 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: Wc_C.green }} />
      <span style={{ width: 2, height: h, background: Wc_C.line }} />
      <span style={{ width: 10, height: 10, borderRadius: 5, background: Wc_C.orange }} />
    </div>
  );
}

function WcMap({ height = 300, route = true }) {
  return (
    <div style={{ position: 'relative', height, borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #E8F0E8 0%, #DDEBDD 100%)' }}>
      <svg width="100%" height="100%" viewBox="0 0 700 300" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
        <path d="M-20 90 L740 110" stroke="#fff" strokeWidth="20" />
        <path d="M-20 210 L740 230" stroke="#fff" strokeWidth="14" />
        <path d="M180 -20 L200 340" stroke="#fff" strokeWidth="16" />
        <path d="M430 -20 L450 340" stroke="#fff" strokeWidth="20" />
        <path d="M600 -20 L620 340" stroke="#fff" strokeWidth="12" />
        <rect x="250" y="130" width="120" height="70" fill="#D0E0E8" opacity="0.6" rx="6" />
        {route && <path d="M90 250 C 230 150, 360 200, 560 60" stroke={Wc_C.orange} strokeWidth="5" fill="none" strokeLinecap="round" />}
        {route && <circle cx="90" cy="250" r="10" fill={Wc_C.green} stroke="#fff" strokeWidth="4" />}
        {route && <circle cx="560" cy="60" r="10" fill={Wc_C.orange} stroke="#fff" strokeWidth="4" />}
      </svg>
    </div>
  );
}

function WebCourier() {
  const available = [
    { from: 'Plateau, Rue du Commerce', to: 'Cocody Angré, 8e Tranche', dist: '6.2 km', time: '18 min', price: '2 500', tag: 'Express', cat: 'Vêtements · 1 kg' },
    { from: 'Marcory Zone 4', to: 'Yopougon Niangon', dist: '11.8 km', time: '32 min', price: '3 800', cat: 'Documents · 0.5 kg' },
    { from: 'Treichville', to: 'Adjamé Liberté', dist: '4.5 km', time: '14 min', price: '1 800', cat: 'Électronique · 2 kg' },
  ];
  const bars = [40, 65, 50, 80, 55, 95, 70];
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div style={{ display: 'flex', minHeight: 1240, fontFamily: Wc_C.font, color: Wc_C.ink, background: Wc_C.bgSoft }}>
      <WcSidebar active="dashboard" />

      {/* Main */}
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Bonjour, Aboubacar 👋</h1>
            <div style={{ fontSize: 14, color: Wc_C.muted, marginTop: 2 }}>Voici votre activité du jour</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 22, background: '#fff', border: `1px solid ${Wc_C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wc_Ic name="bell" size={20} color={Wc_C.ink} />
              <span style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, background: Wc_C.orange, border: '2px solid #fff' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: Wc_C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>AK</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Aboubacar K.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: Wc_C.muted }}>
                  <Wc_Ic name="star" size={13} color="#FFC93C" /> 4.9
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
          <WcStat icon="truck" n="12" l="Courses aujourd'hui" />
          <WcStat icon="wallet" n="35 000" l="Gains du jour (FCFA)" />
          <WcStat icon="star" n="4.9" l="Note moyenne" />
          <WcStat icon="check-circle" n="98%" l="Taux de réussite" />
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 24 }}>
          {/* Left: available courses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Courses disponibles</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Toutes', 'Express', 'Proche'].map((c, i) => (
                    <span key={c} style={{
                      background: i === 0 ? Wc_C.orange : Wc_C.bgSoft, color: i === 0 ? '#fff' : Wc_C.ink2,
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    }}>{c}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                {available.map((r, i) => (
                  <div key={i} style={{ border: `1px solid ${Wc_C.line}`, borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <WcRouteDots h={28} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{r.from}</div>
                          <div style={{ fontSize: 12, color: Wc_C.muted, margin: '6px 0' }}>{r.cat}</div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{r.to}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {r.tag && <div style={{ marginBottom: 6 }}><span style={{ background: Wc_C.orangeSoft, color: Wc_C.orange, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{r.tag}</span></div>}
                        <div style={{ fontSize: 22, fontWeight: 800, color: Wc_C.orange }}>{r.price}</div>
                        <div style={{ fontSize: 11, color: Wc_C.muted }}>FCFA</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${Wc_C.line}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: Wc_C.muted }}>
                        <Wc_Ic name="pin" size={15} color={Wc_C.muted} /> {r.dist}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: Wc_C.muted }}>
                        <Wc_Ic name="clock" size={15} color={Wc_C.muted} /> {r.time}
                      </span>
                      <button style={{ background: '#fff', color: Wc_C.ink, border: `1.5px solid ${Wc_C.line}`, padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13 }}>Détails</button>
                      <button style={{ marginLeft: 'auto', background: Wc_C.orange, color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 9, fontWeight: 700, fontSize: 13 }}>Accepter</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings chart */}
            <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Revenus de la semaine</div>
                  <div style={{ fontSize: 13, color: Wc_C.muted, marginTop: 2 }}>184 500 FCFA · +12% vs semaine dernière</div>
                </div>
                <button style={{ background: Wc_C.orange, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Retirer mes gains</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 14, marginTop: 20 }}>
                {bars.map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: '100%', height: h + '%', borderRadius: 8, background: i === 5 ? Wc_C.orange : Wc_C.orangeSoft }} />
                    <span style={{ fontSize: 12, color: Wc_C.muted, fontWeight: 600 }}>{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: active delivery + history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Course en cours</div>
                <span style={{ background: Wc_C.greenSoft, color: '#0f5a2b', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>En route</span>
              </div>
              <WcMap height={200} route />
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: Wc_C.orangeSoft, color: Wc_C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>ET</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Eric Touré</div>
                  <div style={{ fontSize: 12, color: Wc_C.muted }}>Cocody Angré · Arrivée ~11 min</div>
                </div>
                <button style={{ width: 40, height: 40, borderRadius: 20, border: `1px solid ${Wc_C.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wc_Ic name="phone" size={18} color={Wc_C.ink} />
                </button>
              </div>
              <button style={{ width: '100%', background: Wc_C.orange, color: '#fff', border: 'none', padding: '13px', borderRadius: 11, fontWeight: 700, fontSize: 14, marginTop: 14 }}>Confirmer la livraison</button>
            </div>

            {/* Recent history */}
            <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Courses récentes</div>
                <span style={{ fontSize: 13, color: Wc_C.orange, fontWeight: 700 }}>Voir tout</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { from: 'Plateau', to: 'Cocody', price: '2 500', time: '14:32', ok: true },
                  { from: 'Marcory', to: 'Yopougon', price: '3 800', time: '11:10', ok: true },
                  { from: 'Treichville', to: 'Adjamé', price: '1 800', time: '09:45', ok: true },
                  { from: 'Koumassi', to: 'Port-Bouët', price: '2 200', time: 'Hier', ok: false },
                ].map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: it.ok ? Wc_C.greenSoft : '#FCEBEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wc_Ic name={it.ok ? 'check-circle' : 'package'} size={18} color={it.ok ? Wc_C.green : Wc_C.red} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{it.from} → {it.to}</div>
                      <div style={{ fontSize: 11, color: Wc_C.muted }}>{it.time} · {it.ok ? 'Livré' : 'Annulé'}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: it.ok ? Wc_C.ink : Wc_C.muted, textDecoration: it.ok ? 'none' : 'line-through' }}>{it.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { WebCourier });

// Shared page shell (sidebar + main) for the other courier pages
function WcPage({ active, title, subtitle, children }) {
  return (
    <div style={{ display: 'flex', minHeight: 1000, fontFamily: Wc_C.font, color: Wc_C.ink, background: Wc_C.bgSoft }}>
      <WcSidebar active={active} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 14, color: Wc_C.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 22, background: '#fff', border: `1px solid ${Wc_C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wc_Ic name="bell" size={20} color={Wc_C.ink} />
              <span style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, background: Wc_C.orange, border: '2px solid #fff' }} />
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: Wc_C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>AK</div>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>{children}</div>
      </main>
    </div>
  );
}

// ─────────── COURSES DISPONIBLES ───────────
function WebCourierAvailable() {
  const rides = [
    { from: 'Plateau, Rue du Commerce', to: 'Cocody Angré, 8e Tranche', dist: '6.2 km', time: '18 min', price: '2 500', tag: 'Express', cat: 'Vêtements · 1 kg', client: 'Awa Koné' },
    { from: 'Marcory Zone 4', to: 'Yopougon Niangon', dist: '11.8 km', time: '32 min', price: '3 800', cat: 'Documents · 0.5 kg', client: 'Jean B.' },
    { from: 'Treichville', to: 'Adjamé Liberté', dist: '4.5 km', time: '14 min', price: '1 800', cat: 'Électronique · 2 kg', client: 'Fatou D.' },
    { from: 'Riviera Palmeraie', to: 'Plateau Cité Admin', dist: '8.1 km', time: '24 min', price: '2 900', tag: 'Express', cat: 'Colis · 3 kg', client: 'Marc T.' },
    { from: 'Cocody II Plateaux', to: 'Abobo Gare', dist: '13.2 km', time: '38 min', price: '4 200', cat: 'Colis · 5 kg', client: 'Salif K.' },
  ];
  return (
    <WcPage active="courses" title="Courses disponibles" subtitle="5 courses correspondent à votre zone">
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['Toutes', 'Express', 'Proche', 'Mieux payées'].map((c, i) => (
          <span key={c} style={{
            background: i === 0 ? Wc_C.orange : '#fff', color: i === 0 ? '#fff' : Wc_C.ink2,
            border: i === 0 ? 'none' : `1px solid ${Wc_C.line}`,
            padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
          }}>{c}</span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, color: Wc_C.muted }}>
          <Wc_Ic name="search" size={16} color={Wc_C.muted} /> Rechercher une zone
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {rides.map((r, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <WcRouteDots h={30} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.from}</div>
                  <div style={{ fontSize: 12, color: Wc_C.muted, margin: '6px 0' }}>{r.cat} · {r.client}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.to}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {r.tag && <div style={{ marginBottom: 6 }}><span style={{ background: Wc_C.orangeSoft, color: Wc_C.orange, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{r.tag}</span></div>}
                <div style={{ fontSize: 22, fontWeight: 800, color: Wc_C.orange }}>{r.price}</div>
                <div style={{ fontSize: 11, color: Wc_C.muted }}>FCFA</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${Wc_C.line}` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: Wc_C.muted }}><Wc_Ic name="pin" size={15} color={Wc_C.muted} /> {r.dist}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: Wc_C.muted }}><Wc_Ic name="clock" size={15} color={Wc_C.muted} /> {r.time}</span>
              <button style={{ marginLeft: 'auto', background: Wc_C.orange, color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 9, fontWeight: 700, fontSize: 13 }}>Accepter</button>
            </div>
          </div>
        ))}
      </div>
    </WcPage>
  );
}

// ─────────── COURSE EN COURS ───────────
function WebCourierActive() {
  return (
    <WcPage active="active" title="Course en cours" subtitle="Livraison #CD123456789CI">
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        {/* Map + live banner */}
        <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wc_Ic name="truck" size={20} color={Wc_C.orange} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>En route vers la livraison</div>
                <div style={{ fontSize: 12, color: Wc_C.muted }}>Arrivée estimée · 11 min · 3.4 km restants</div>
              </div>
            </div>
            <span style={{ background: Wc_C.greenSoft, color: '#0f5a2b', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999 }}>En cours</span>
          </div>
          <WcMap height={420} route />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={{ flex: 1, background: '#fff', color: Wc_C.ink, border: `1.5px solid ${Wc_C.line}`, padding: '13px', borderRadius: 11, fontWeight: 700, fontSize: 14 }}>Ouvrir le GPS</button>
            <button style={{ flex: 2, background: Wc_C.orange, color: '#fff', border: 'none', padding: '13px', borderRadius: 11, fontWeight: 700, fontSize: 14 }}>Confirmer la livraison</button>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Itinéraire</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <WcRouteDots h={40} />
              <div style={{ flex: 1 }}>
                <div style={{ paddingBottom: 18 }}>
                  <div style={{ fontSize: 11, color: Wc_C.muted }}>RÉCUPÉRATION</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Plateau, Rue du Commerce</div>
                  <div style={{ fontSize: 12, color: Wc_C.green, fontWeight: 700 }}>✓ Colis récupéré</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: Wc_C.muted }}>LIVRAISON</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Cocody Angré, 8e Tranche, Villa 12</div>
                  <div style={{ fontSize: 12, color: Wc_C.muted }}>Eric Touré</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: Wc_C.orangeSoft, color: Wc_C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>ET</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Eric Touré</div>
                <div style={{ fontSize: 12, color: Wc_C.muted }}>Destinataire</div>
              </div>
              <button style={{ width: 42, height: 42, borderRadius: 21, border: `1px solid ${Wc_C.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wc_Ic name="phone" size={18} color={Wc_C.ink} /></button>
              <button style={{ width: 42, height: 42, borderRadius: 21, border: `1px solid ${Wc_C.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wc_Ic name="mail" size={18} color={Wc_C.ink} /></button>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: Wc_C.muted }}>Montant</div><div style={{ fontSize: 16, fontWeight: 800, color: Wc_C.orange }}>2 500 FCFA</div></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: Wc_C.muted }}>Type</div><div style={{ fontSize: 16, fontWeight: 700 }}>Vêtements · 1 kg</div></div>
            </div>
          </div>
        </div>
      </div>
    </WcPage>
  );
}

// ─────────── HISTORIQUE ───────────
function WebCourierHistory() {
  const rows = [
    { id: 'CD12459', from: 'Plateau', to: 'Cocody', date: "Aujourd'hui · 14:32", price: '2 500', status: 'Livré' },
    { id: 'CD12458', from: 'Marcory', to: 'Yopougon', date: "Aujourd'hui · 11:10", price: '3 800', status: 'Livré' },
    { id: 'CD12455', from: 'Treichville', to: 'Adjamé', date: 'Hier · 17:45', price: '1 800', status: 'Livré' },
    { id: 'CD12454', from: 'Riviera', to: 'Plateau', date: 'Hier · 15:20', price: '2 900', status: 'Livré' },
    { id: 'CD12451', from: 'Koumassi', to: 'Port-Bouët', date: 'Hier · 09:05', price: '2 200', status: 'Annulé' },
    { id: 'CD12448', from: 'Abobo', to: 'Adjamé', date: '28 Mai · 16:12', price: '2 600', status: 'Livré' },
    { id: 'CD12445', from: 'Yopougon', to: 'Plateau', date: '28 Mai · 10:30', price: '3 100', status: 'Livré' },
  ];
  return (
    <WcPage active="history" title="Historique des courses" subtitle="847 courses réalisées au total">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <WcStat icon="check-circle" n="831" l="Courses livrées" />
        <WcStat icon="wallet" n="2.4M" l="Total gagné (FCFA)" />
        <WcStat icon="star" n="4.9" l="Note moyenne" />
      </div>
      <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.4fr 1fr 1fr', padding: '14px 24px', background: Wc_C.bgSoft, fontSize: 12, fontWeight: 800, color: Wc_C.ink2, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          <div>Réf.</div><div>Trajet</div><div>Date</div><div>Montant</div><div style={{ textAlign: 'right' }}>Statut</div>
        </div>
        {rows.map((r, i) => {
          const cancelled = r.status === 'Annulé';
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.4fr 1fr 1fr', padding: '16px 24px', alignItems: 'center', borderTop: `1px solid ${Wc_C.line}`, fontSize: 14 }}>
              <div style={{ fontWeight: 700, color: Wc_C.muted, fontSize: 13 }}>{r.id}</div>
              <div style={{ fontWeight: 700 }}>{r.from} → {r.to}</div>
              <div style={{ color: Wc_C.muted, fontSize: 13 }}>{r.date}</div>
              <div style={{ fontWeight: 800, color: cancelled ? Wc_C.muted : Wc_C.ink, textDecoration: cancelled ? 'line-through' : 'none' }}>{r.price} <span style={{ fontSize: 11, color: Wc_C.muted }}>FCFA</span></div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: cancelled ? '#FCEBEA' : Wc_C.greenSoft, color: cancelled ? Wc_C.red : '#0f5a2b', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{r.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </WcPage>
  );
}

// ─────────── MES GAINS ───────────
function WebCourierEarnings() {
  const bars = [45, 70, 55, 85, 60, 98, 72];
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return (
    <WcPage active="earnings" title="Mes gains" subtitle="Suivez vos revenus et vos retraits">
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Balance hero */}
          <div style={{ background: Wc_C.orange, color: '#fff', borderRadius: 18, padding: 28 }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Solde disponible</div>
            <div style={{ fontSize: 40, fontWeight: 800, marginTop: 4 }}>184 500 <span style={{ fontSize: 18 }}>FCFA</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <button style={{ background: '#fff', color: Wc_C.orange, border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14 }}>Retirer mes gains</button>
              <span style={{ fontSize: 13, opacity: 0.9 }}>Virement Mobile Money sous 24h</span>
            </div>
          </div>
          {/* Chart */}
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Revenus par jour</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Semaine', 'Mois', 'Année'].map((p, i) => (
                  <span key={p} style={{ background: i === 0 ? Wc_C.orangeSoft : 'transparent', color: i === 0 ? Wc_C.orange : Wc_C.muted, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{p}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 180, gap: 14, marginTop: 20 }}>
              {bars.map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: '100%', height: h + '%', borderRadius: 8, background: i === 5 ? Wc_C.orange : Wc_C.orangeSoft }} />
                  <span style={{ fontSize: 12, color: Wc_C.muted, fontWeight: 600 }}>{days[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: stats + payouts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <WcStat icon="truck" n="47" l="Courses (semaine)" />
            <WcStat icon="clock" n="32h" l="Temps en ligne" />
          </div>
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Derniers retraits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { date: '25 Mai 2026', method: 'Orange Money', amount: '150 000' },
                { date: '18 Mai 2026', method: 'MTN Money', amount: '120 000' },
                { date: '11 Mai 2026', method: 'Wave', amount: '98 000' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: Wc_C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wc_Ic name="check-circle" size={18} color={Wc_C.green} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.method}</div>
                    <div style={{ fontSize: 11, color: Wc_C.muted }}>{p.date}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: Wc_C.green }}>+{p.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WcPage>
  );
}

// ─────────── PROFIL ───────────
function WebCourierProfile() {
  return (
    <WcPage active="profile" title="Profil livreur" subtitle="Gérez vos informations et documents">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
        {/* Left: identity card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#111', color: '#fff', borderRadius: 18, padding: 28, textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: 44, background: Wc_C.orange, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 32, border: '4px solid rgba(255,255,255,0.2)' }}>AK</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 14 }}>Aboubacar Koné</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
              <Wc_Ic name="star" size={16} color="#FFC93C" />
              <span style={{ fontWeight: 700 }}>4.9</span>
              <span style={{ fontSize: 13, opacity: 0.6 }}>· 847 courses</span>
            </div>
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(52,208,88,0.18)', color: '#34D058', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              <Wc_Ic name="shield" size={14} color="#34D058" /> Livreur vérifié
            </div>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: Wc_C.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wc_Ic name="truck" size={24} color={Wc_C.orange} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Moto · Yamaha</div>
              <div style={{ fontSize: 12, color: Wc_C.muted }}>CI-4582-AB</div>
            </div>
            <span style={{ background: Wc_C.greenSoft, color: Wc_C.green, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>Actif</span>
          </div>
        </div>

        {/* Right: forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>Informations personnelles</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Prénom', 'Aboubacar'], ['Nom', 'Koné'],
                ['Téléphone', '+225 07 00 00 00 00'], ['Email', 'a.kone@email.com'],
                ['Ville', 'Abidjan'], ['Zone', 'Cocody · Plateau'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 12, color: Wc_C.muted, marginBottom: 6 }}>{l}</div>
                  <div style={{ border: `1px solid ${Wc_C.line}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${Wc_C.line}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>Documents & vérification</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { l: 'Pièce d\'identité (CNI)', ok: true },
                { l: 'Permis de conduire', ok: true },
                { l: 'Carte grise du véhicule', ok: true },
                { l: 'Photo de profil', ok: false },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${Wc_C.line}`, borderRadius: 12 }}>
                  <Wc_Ic name={d.ok ? 'check-circle' : 'clipboard'} size={20} color={d.ok ? Wc_C.green : Wc_C.muted} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{d.l}</span>
                  {d.ok
                    ? <span style={{ background: Wc_C.greenSoft, color: '#0f5a2b', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>Validé</span>
                    : <button style={{ background: Wc_C.orange, color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>Téléverser</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WcPage>
  );
}

Object.assign(window, { WebCourierAvailable, WebCourierActive, WebCourierHistory, WebCourierEarnings, WebCourierProfile });
