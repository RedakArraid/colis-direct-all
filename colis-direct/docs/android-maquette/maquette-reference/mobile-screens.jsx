// ColisDirect — 7 mobile screens (reusable inside iOS or Android frame)
// Exports to window: MobileHome, MobileCreate, MobileSummary, MobileTracking,
// MobileRelays, MobileProfile, MobileCourier

const C = window.CD;
const Ic = window.CDIcon;
const Slot = window.ImgSlot;

// Shared bottom tab bar (client app)
function TabBar({ active = 'home', variant = 'client' }) {
  const tabs = variant === 'courier'
    ? [
        { id: 'home', label: 'Accueil', icon: 'home' },
        { id: 'courses', label: 'Courses', icon: 'truck' },
        { id: 'gains', label: 'Gains', icon: 'wallet' },
        { id: 'profile', label: 'Profil', icon: 'user' },
      ]
    : [
        { id: 'home', label: 'Accueil', icon: 'home' },
        { id: 'envois', label: 'Envois', icon: 'box' },
        { id: 'relays', label: 'Points relais', icon: 'pin' },
        { id: 'profile', label: 'Profil', icon: 'user' },
      ];
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: '#fff',
      borderTop: `1px solid ${C.line}`,
      padding: '8px 8px 14px',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: on ? C.orange : '#9CA3AF', flex: 1,
          }}>
            <Ic name={t.icon} size={22} color={on ? C.orange : '#9CA3AF'} stroke={on ? 2 : 1.7} />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ScreenBase({ children, tab = 'home', variant, safeTop = 0 }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#fff', fontFamily: C.font, color: C.ink,
    }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {safeTop > 0 && <div style={{ height: safeTop, flexShrink: 0 }} />}
        {children}
      </div>
      <TabBar active={tab} variant={variant} />
    </div>
  );
}

// Lightweight in-screen top bar (back arrow + title)
function TopBar({ title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', borderBottom: `1px solid ${C.line}`, background: '#fff',
    }}>
      <Ic name="chev-left" size={24} color={C.ink} />
      <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
      <div style={{ width: 24 }}>{action}</div>
    </div>
  );
}

// ─────────────────────────── 1. ACCUEIL ───────────────────────────
function MobileHome({ safeTop = 0 }) {
  return (
    <ScreenBase tab="home" safeTop={safeTop}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <window.CDLogo size={20} />
        <div style={{
          width: 38, height: 38, borderRadius: 19, background: C.bgSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic name="search" size={20} color={C.ink} />
        </div>
      </div>

      {/* Hero card */}
      <div style={{ padding: '4px 16px 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #FFF6EE 0%, #FFE8D2 100%)',
          borderRadius: 20, padding: 18, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, maxWidth: '60%' }}>
            Envoyez et recevez vos colis en toute sécurité
          </div>
          <div style={{ position: 'absolute', right: -6, bottom: -4 }}>
            <Slot label="Livreur" height={132} radius={14} tone="orange" style={{ width: 132 }} />
          </div>
        </div>
      </div>

      {/* CTA pills */}
      <div style={{ padding: '0 16px', display: 'flex', gap: 10 }}>
        <button style={{
          flex: 1, background: C.orange, color: '#fff', border: 'none',
          padding: '12px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
        }}>Envoyer un colis</button>
        <button style={{
          flex: 1, background: '#fff', color: C.ink, border: `1.5px solid ${C.line}`,
          padding: '12px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
        }}>Suivre un colis</button>
      </div>

      {/* Quick actions grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { i: 'pin', l: 'Points relais' },
            { i: 'wallet', l: 'Tarifs' },
            { i: 'briefcase', l: 'Devenir partenaire' },
            { i: 'history', l: 'Historique' },
            { i: 'support', l: 'Support' },
            { i: 'user', l: 'Mon profil' },
          ].map(q => (
            <div key={q.l} style={{
              background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14,
              padding: '14px 8px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: C.orangeSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ic name={q.i} size={20} color={C.orange} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: C.ink2, lineHeight: 1.2 }}>{q.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent shipment card */}
      <div style={{ padding: '20px 16px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Dernier envoi</div>
        <div style={{
          border: `1px solid ${C.line}`, borderRadius: 14, padding: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic name="package" size={22} color={C.orange} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>CD123456789CI</div>
            <div style={{ fontSize: 12, color: C.muted }}>Abidjan → Bouaké · En transit</div>
          </div>
          <Ic name="chev-right" size={18} color={C.muted} />
        </div>
      </div>
    </ScreenBase>
  );
}

// ─────────────────────────── 2. CRÉER UN ENVOI ───────────────────────────
function MobileCreate({ safeTop = 0 }) {
  const Option = ({ from, to, icons, active }) => (
    <div style={{
      flex: 1, border: `1.5px solid ${active ? C.orange : C.line}`,
      background: active ? C.orangeSoft : '#fff',
      borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: active ? C.orange : C.ink2 }}>
        <Ic name={icons[0]} size={18} color={active ? C.orange : C.ink2} />
        <span style={{ fontSize: 11, color: C.muted }}>→</span>
        <Ic name={icons[1]} size={18} color={active ? C.orange : C.ink2} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
        {from}<br/>→ {to}
      </div>
    </div>
  );
  return (
    <ScreenBase tab="envois" safeTop={safeTop}>
      <TopBar title="Créer un envoi" />
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, marginBottom: 10 }}>Type de livraison</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Option from="Domicile" to="Domicile" icons={['home','home']} active />
          <Option from="Domicile" to="Point relais" icons={['home','pin']} />
          <Option from="Point relais" to="Domicile" icons={['pin','home']} />
          <Option from="Point relais" to="Point relais" icons={['pin','pin']} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, margin: '20px 0 10px' }}>Taille du colis</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { id: 'p', n: 'Petit', s: '< 2 kg', icon: 'package', active: true },
            { id: 'm', n: 'Moyen', s: '2 — 10 kg', icon: 'box' },
            { id: 'g', n: 'Grand', s: '10 — 30 kg', icon: 'truck' },
          ].map(c => (
            <div key={c.id} style={{
              border: `1.5px solid ${c.active ? C.orange : C.line}`,
              background: c.active ? C.orangeSoft : '#fff',
              borderRadius: 12, padding: '10px 6px', textAlign: 'center',
            }}>
              <Ic name={c.icon} size={20} color={c.active ? C.orange : C.ink2} />
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{c.n}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{c.s}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, margin: '18px 0 10px' }}>Détails du colis</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Catégorie">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: C.muted }}>
              Choisissez <Ic name="chev-down" size={16} color={C.muted} />
            </div>
          </Field>
          <Field label="Ville de départ">
            <div style={{ color: C.muted }}>Ex : Abidjan</div>
          </Field>
          <Field label="Ville d'arrivée">
            <div style={{ color: C.muted }}>Ex : Bouaké</div>
          </Field>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, margin: '20px 0 10px' }}>Destinataire</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Prénom"><div style={{ color: C.muted }}>Eric</div></Field>
            <Field label="Nom"><div style={{ color: C.muted }}>Touré</div></Field>
          </div>
          <Field label="Téléphone">
            <div style={{ color: C.muted }}>+225 07 00 00 00 00</div>
          </Field>
        </div>
      </div>

      <div style={{ padding: '4px 16px 20px' }}>
        <button style={primaryBtn}>Continuer</button>
      </div>
    </ScreenBase>
  );
}

const stepBtn = {
  width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`,
  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const primaryBtn = {
  width: '100%', background: C.orange, color: '#fff', border: 'none',
  padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 15,
};
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{
        border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px',
        background: '#fff', fontSize: 14,
      }}>{children}</div>
    </div>
  );
}

// ─────────────────────────── 3. RÉCAPITULATIF ───────────────────────────
function MobileSummary({ safeTop = 0 }) {
  return (
    <ScreenBase tab="envois" safeTop={safeTop}>
      <TopBar title="Récapitulatif" />
      <div style={{ padding: '16px' }}>
        <div style={{
          background: C.orangeSoft, borderRadius: 14, padding: 14,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>De</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Abidjan</div>
            <div style={{ fontSize: 12, color: C.muted }}>(Plateau)</div>
          </div>
          <Ic name="chev-right" size={20} color={C.orange} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>À</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Bouaké</div>
            <div style={{ fontSize: 12, color: C.muted }}>(N'Gattakro)</div>
          </div>
        </div>

        <div style={{ marginTop: 14, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <Row label="Type de livraison" value={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Point relais → Point relais <Pill>-10%</Pill></span>} />
          <Row label="Poids du colis" value="1 kg" />
          <Row label="Catégorie" value="Vêtements" />
          <Row label="Code promo" value="WELCOME10" />
        </div>

        <div style={{ marginTop: 14, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
          <Line label="Prix de base" value="5 000 FCFA" />
          <Line label="Réduction (-10%)" value="-500 FCFA" muted />
          <Line label="Assurance" value="0 FCFA" muted />
          <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Prix total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.orange }}>4 500 FCFA</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '4px 16px 20px' }}>
        <button style={primaryBtn}>Confirmer l'envoi</button>
      </div>
    </ScreenBase>
  );
}
function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 14px', borderBottom: `1px solid ${C.line}`, fontSize: 13,
    }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontWeight: 600, color: C.ink, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
function Line({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontWeight: 600, color: muted ? C.muted : C.ink }}>{value}</span>
    </div>
  );
}
function Pill({ children, color = C.orange }) {
  return (
    <span style={{
      background: color, color: '#fff', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 999,
    }}>{children}</span>
  );
}

// ─────────────────────────── 4. SUIVI ───────────────────────────
function MobileTracking({ safeTop = 0 }) {
  const steps = [
    { id: 'created', label: 'Enregistré', date: '20 Mai 2024 - 09:30', done: true },
    { id: 'pickup', label: 'Pris en charge par le livreur', date: '20 Mai 2024 - 11:15', done: true },
    { id: 'transit', label: 'En transit', date: '20 Mai 2024 - 15:40', active: true },
    { id: 'done', label: 'Livré', date: 'En attente', done: false },
  ];
  return (
    <ScreenBase tab="envois" safeTop={safeTop}>
      <TopBar title="Suivi de colis" />
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 12, color: C.muted }}>Numéro de suivi</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>CD123456789CI</div>

        <div style={{ marginTop: 16, padding: 14, background: C.greenSoft, borderRadius: 12, color: '#0f5a2b', fontWeight: 700, fontSize: 14 }}>
          En cours de livraison
        </div>

        {/* Mini progress bar */}
        <div style={{ marginTop: 16, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 18, left: 16, right: 16, height: 2, background: C.line }} />
          <div style={{ position: 'absolute', top: 18, left: 16, width: '52%', height: 2, background: C.orange }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            {['Enregistré','Pris en charge','En transit','Livré'].map((s, i) => {
              const done = i < 2, active = i === 2;
              const fill = done ? C.orange : active ? C.orange : '#fff';
              const stroke = active || done ? C.orange : C.line;
              return (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, background: fill, border: `2px solid ${stroke}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done || active ? <Ic name="check" size={16} color="#fff" /> : <Ic name="package" size={16} color={C.muted} />}
                  </div>
                  <div style={{ fontSize: 10, textAlign: 'center', fontWeight: active ? 700 : 500, color: active ? C.orange : C.muted, lineHeight: 1.2 }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, color: C.ink }}>Détails</div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((s, i) => {
            const last = i === steps.length - 1;
            return (
              <div key={s.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ position: 'relative', width: 16, flexShrink: 0 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 7,
                    background: s.done ? C.orange : s.active ? C.orange : '#fff',
                    border: `2px solid ${s.done || s.active ? C.orange : C.line}`, marginTop: 4,
                  }} />
                  {!last && <div style={{ position: 'absolute', top: 20, bottom: -12, left: 6, width: 2, background: C.line }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: s.done || s.active ? C.ink : C.muted }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenBase>
  );
}

// ─────────────────────────── 5. POINTS RELAIS ───────────────────────────
function MobileRelays({ safeTop = 0 }) {
  return (
    <ScreenBase tab="relays" safeTop={safeTop}>
      {/* Search header on top of map */}
      <div style={{ padding: 12 }}>
        <div style={{
          background: '#fff', borderRadius: 12, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)', border: `1px solid ${C.line}`,
        }}>
          <Ic name="search" size={18} color={C.muted} />
          <span style={{ fontSize: 14, color: C.muted }}>Rechercher un point relais</span>
        </div>
      </div>

      {/* Map area */}
      <div style={{ position: 'relative', margin: '0 12px', borderRadius: 14, overflow: 'hidden', height: 280 }}>
        {/* fake map */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #E8F0E8 0%, #DDEBDD 100%)',
        }} />
        {/* streets */}
        <svg width="100%" height="100%" viewBox="0 0 360 280" style={{ position: 'absolute', inset: 0 }}>
          <path d="M-20 60 L380 80" stroke="#fff" strokeWidth="14" />
          <path d="M-20 160 L380 180" stroke="#fff" strokeWidth="10" />
          <path d="M-20 230 L380 240" stroke="#fff" strokeWidth="8" />
          <path d="M80 -20 L100 300" stroke="#fff" strokeWidth="10" />
          <path d="M220 -20 L240 300" stroke="#fff" strokeWidth="14" />
          <path d="M300 -20 L320 300" stroke="#fff" strokeWidth="8" />
          <rect x="120" y="100" width="80" height="50" fill="#D0E0E8" opacity="0.7" />
        </svg>
        {/* Pins */}
        {[
          { x: 60, y: 90 }, { x: 130, y: 130 }, { x: 200, y: 70 },
          { x: 280, y: 120 }, { x: 100, y: 200 }, { x: 250, y: 210 },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: p.x, top: p.y,
            width: 28, height: 28, transform: 'translate(-50%,-100%)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14, background: C.orange,
              border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
            }}>
              <Ic name="package" size={14} color="#fff" />
            </div>
          </div>
        ))}
      </div>

      {/* Selected relay card */}
      <div style={{ padding: '16px' }}>
        <div style={{
          background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14,
          padding: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>POINT RELAIS AKWABA</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Cocody, Angré 8ème Tranche</div>
              <div style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 700 }}>
                Ouvert · 08h - 20h
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.bgSoft, padding: '3px 8px', borderRadius: 999 }}>
              1.2 km
            </div>
          </div>
          <button style={{ ...primaryBtn, marginTop: 14, padding: 12, fontSize: 14 }}>Itinéraire</button>
        </div>
      </div>
    </ScreenBase>
  );
}

// ─────────────────────────── 6. PROFIL ───────────────────────────
function MobileProfile({ safeTop = 0 }) {
  return (
    <ScreenBase tab="profile" safeTop={0}>
      {/* Orange header (extends into safe-top area on iOS) */}
      <div style={{ background: C.orange, paddingTop: 20 + safeTop, padding: `${20 + safeTop}px 18px 28px`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <Ic name="settings" size={22} color="#fff" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.orange, fontWeight: 800, fontSize: 22,
            border: '3px solid rgba(255,255,255,0.4)',
          }}>AM</div>
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Bonjour</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Axel M.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 2, opacity: 0.95 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: '#9CFF9C' }} /> En ligne
            </div>
          </div>
        </div>
      </div>

      {/* Menu list */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { i: 'user', l: 'Mes informations' },
          { i: 'pin', l: 'Mes adresses' },
          { i: 'box', l: 'Mes envois' },
          { i: 'card', l: 'Moyens de paiement' },
          { i: 'bell', l: 'Notifications' },
          { i: 'settings', l: 'Paramètres' },
          { i: 'support', l: 'Aide & Support' },
          { i: 'logout', l: 'Déconnexion', danger: true },
        ].map(r => (
          <div key={r.l} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px',
            borderBottom: `1px solid ${C.line}`,
          }}>
            <Ic name={r.i} size={20} color={r.danger ? C.red : C.ink2} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.danger ? C.red : C.ink }}>{r.l}</span>
            <Ic name="chev-right" size={18} color={C.muted} />
          </div>
        ))}
      </div>
    </ScreenBase>
  );
}

// ─────────────────────────── 7. ESPACE LIVREUR ───────────────────────────
function MobileCourier({ safeTop = 0 }) {
  return (
    <ScreenBase tab="courses" variant="courier" safeTop={safeTop}>
      <TopBar title="Espace livreur" action={<Ic name="search" size={22} color={C.ink} />} />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#111', color: '#fff', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Disponible pour les courses</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Vous recevrez les nouvelles courses</div>
            </div>
            <div style={{
              width: 44, height: 26, borderRadius: 13, background: C.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 3,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff' }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat n="12" l="Courses aujourd'hui" />
          <Stat n="35 000" l="Gains du jour (FCFA)" />
        </div>

        <div style={{ marginTop: 22 }}>
          {[
            { i: 'truck', l: 'Courses disponibles', n: '5' },
            { i: 'history', l: 'Mes courses', n: '128' },
            { i: 'wallet', l: 'Gains', n: '' },
            { i: 'user', l: 'Profil', n: '' },
            { i: 'settings', l: 'Paramètres', n: '' },
            { i: 'support', l: 'Support 24/7', n: '' },
          ].map(r => (
            <div key={r.l} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px',
              borderBottom: `1px solid ${C.line}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: C.orangeSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ic name={r.i} size={18} color={C.orange} />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.l}</span>
              {r.n && <Pill color="#111">{r.n}</Pill>}
              <Ic name="chev-right" size={18} color={C.muted} />
            </div>
          ))}
        </div>
      </div>
    </ScreenBase>
  );
}
function Stat({ n, l }) {
  return (
    <div style={{ background: C.bgSoft, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.orange }}>{n}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.2 }}>{l}</div>
    </div>
  );
}

Object.assign(window, {
  MobileHome, MobileCreate, MobileSummary, MobileTracking,
  MobileRelays, MobileProfile, MobileCourier,
});
