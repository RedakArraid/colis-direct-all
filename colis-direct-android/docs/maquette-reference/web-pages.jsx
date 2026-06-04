// ColisDirect — web pages
// Exports to window: WebHome, WebTracking, WebPricing, WebMap, WebBecome, WebLogin, WebCreate

const W_C = window.CD;
const W_Ic = window.CDIcon;
const W_Slot = window.ImgSlot;

// ──────────────────── Shared Web Header ────────────────────
function WebHeader({ active = 'accueil' }) {
  const items = [
  { id: 'accueil', l: 'Accueil' },
  { id: 'envoi', l: 'Envoyer un colis' },
  { id: 'suivi', l: 'Suivi de colis' },
  { id: 'relais', l: 'Points relais' },
  { id: 'partenaire', l: 'Devenir partenaire' },
  { id: 'about', l: 'À propos' }];

  return (
    <header style={{
      background: '#fff', borderBottom: `1px solid ${W_C.line}`,
      padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <window.CDLogo size={24} />
      <nav style={{ display: 'flex', gap: 28 }}>
        {items.map((i) =>
        <span key={i.id} style={{
          fontSize: 14, fontWeight: i.id === active ? 700 : 500,
          color: i.id === active ? W_C.orange : W_C.ink2
        }}>{i.l}</span>
        )}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: W_C.ink2 }}>
          FR <W_Ic name="chev-down" size={14} color={W_C.ink2} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: W_C.ink }}>Se connecter</span>
        <button style={{
          background: W_C.orange, color: '#fff', border: 'none',
          padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13
        }}>S'inscrire</button>
      </div>
    </header>);

}

// Footer
function WebFooter() {
  const Col = ({ t, items }) =>
  <div>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: '#fff' }}>{t}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((i) => <span key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{i}</span>)}
      </div>
    </div>;

  return (
    <footer style={{ background: '#0f0f0f', color: '#fff', padding: '40px 40px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 32 }}>
        <div>
          <window.CDLogo size={22} light />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 14, lineHeight: 1.55, maxWidth: 280 }}>
            La plateforme logistique qui connecte particuliers, points relais et livreurs agréés partout en Côte d'Ivoire.
          </p>
        </div>
        <Col t="Services" items={['Envoyer un colis', 'Suivi de colis', 'Points relais', 'Tarifs', 'Assurance']} />
        <Col t="Entreprise" items={['À propos', 'Carrière', 'Presse', 'Blog', 'Contact']} />
        <Col t="Partenaires" items={['Devenir livreur', 'Devenir point relais', 'Espace pro', 'Tarifs entreprise']} />
        <Col t="Légal" items={['CGV', 'CGU', 'Confidentialité', 'Mentions légales']} />
      </div>
      <div style={{
        marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)'
      }}>
        <span>© 2026 COLISDIRECT. Tous droits réservés.</span>
        <span>Made with care in Abidjan, Côte d'Ivoire.</span>
      </div>
    </footer>);

}

const PrimaryBtn = ({ children, dark, style }) =>
<button style={{
  background: dark ? '#000' : W_C.orange, color: '#fff', border: 'none',
  padding: '14px 26px', borderRadius: 10, fontWeight: 700, fontSize: 15,
  ...style
}}>{children}</button>;

const OutlineBtn = ({ children, style }) =>
<button style={{
  background: '#fff', color: W_C.ink, border: `2px solid ${W_C.ink}`,
  padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15,
  ...style
}}>{children}</button>;


// ─────────────────────── HOME ───────────────────────
function WebHome() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink }}>
      <WebHeader active="accueil" />

      {/* Hero with truck background */}
      <section style={{ position: 'relative', padding: '0 40px' }}>
        <div style={{
          margin: '24px 0', borderRadius: 24, overflow: 'hidden',
          background: '#fff', position: 'relative', minHeight: 560,
        }}>
          {/* Truck image slot fills the hero */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <image-slot id="hero-truck"
              style={{ width: '100%', height: '100%', display: 'block' }}
              shape="rect"
              fit="cover"
              position="center right"
              src="assets/camion-colisdirect.jpeg"
              placeholder="Déposez camion.png (image principale du site)">
            </image-slot>
          </div>
          {/* White fade overlay — opaque on left so text is readable */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.88) 30%, rgba(255,255,255,0.35) 55%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0) 80%)',
          }} />

          {/* Content grid: text-buttons (left) · spacer (truck) · calc card (right) */}
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'grid', gridTemplateColumns: '1.2fr 1fr 380px', gap: 32,
            alignItems: 'center', padding: '60px 56px',
          }}>
            <div>
              <h1 style={{
                fontSize: 54, fontWeight: 800, lineHeight: 1.05, margin: 0,
                letterSpacing: -1, color: W_C.ink,
              }}>
                Envoyez et recevez vos colis <span style={{ color: W_C.orange }}>en toute sécurité</span>
              </h1>
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <PrimaryBtn>Envoyer un colis</PrimaryBtn>
                <OutlineBtn>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <W_Ic name="pin" size={18} color={W_C.ink} />
                    Trouver un point relais
                  </span>
                </OutlineBtn>
              </div>
            </div>

            {/* Spacer column — lets the truck breathe in the middle */}
            <div />

            {/* Calc card on the right */}
            <div style={{
              background: '#fff', borderRadius: 16, padding: 22,
              boxShadow: '0 18px 50px rgba(0,0,0,0.15)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Calculer votre livraison</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SmallField label="Ville de départ" placeholder="Ex : Abidjan" />
                <SmallField label="Ville d'arrivée" placeholder="Ex : Bouaké" />
                <SmallField label="Type de livraison" placeholder="Choisissez le type" chev />
                <div>
                  <div style={{ fontSize: 12, color: W_C.muted, marginBottom: 6 }}>Taille du colis</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Petit', 'Moyen', 'Grand'].map((s, i) => (
                      <button key={s} style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        border: `1.5px solid ${i === 0 ? W_C.orange : W_C.line}`,
                        background: i === 0 ? W_C.orangeSoft : '#fff',
                        color: i === 0 ? W_C.orange : W_C.ink2,
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
                <PrimaryBtn style={{ padding: '12px', fontSize: 14, marginTop: 4 }}>Voir les prix</PrimaryBtn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ padding: '0 40px' }}>
        <div style={{
          background: '#fff', border: `1px solid ${W_C.line}`, borderRadius: 18,
          padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: -10
        }}>
          {[
          { i: 'shield', t: 'Livraison sécurisée', s: 'Vos colis sont protégés à chaque étape.' },
          { i: 'pin', t: 'Réseau de points relais', s: 'Déposez et retirez vos colis près de chez vous.' },
          { i: 'user', t: 'Livreurs agréés', s: 'Des livreurs fiables pour un service rapide.' },
          { i: 'check-circle', t: 'Suivi en temps réel', s: 'Suivez votre colis à chaque étape de la livraison.' }].
          map((f) =>
          <div key={f.t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
              width: 44, height: 44, borderRadius: 12, background: W_C.orangeSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <W_Ic name={f.i} size={22} color={W_C.orange} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{f.t}</div>
                <div style={{ fontSize: 13, color: W_C.muted, marginTop: 2, lineHeight: 1.45 }}>{f.s}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pourquoi + Comment ça marche */}
      <section style={{ padding: '60px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {/* Pourquoi */}
        <div style={{ background: '#fff', border: `1px solid ${W_C.line}`, borderRadius: 22, padding: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, textAlign: 'center' }}>Pourquoi choisir COLISDIRECT ?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 28 }}>
            {[
            { i: 'pin', n: '+500', l: 'Points relais' },
            { i: 'user', n: '+1000', l: 'Livreurs agréés' },
            { i: 'box', n: '+50 000', l: 'Colis livrés' },
            { i: 'support', n: '24/7', l: 'Support client' }].
            map((s) =>
            <div key={s.l} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                width: 38, height: 38, borderRadius: 19, background: W_C.orangeSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                  <W_Ic name={s.i} size={20} color={W_C.orange} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: W_C.muted }}>{s.l}</div>
                </div>
              </div>
            )}
          </div>
          {/* Comment ça marche */}
          <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 36, marginBottom: 18, textAlign: 'center' }}>Comment ça marche ?</h3>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 22, left: 28, right: 28, height: 2,
              background: `repeating-linear-gradient(to right, ${W_C.orange} 0 6px, transparent 6px 12px)`
            }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', position: 'relative' }}>
              {[
              { n: 1, i: 'clipboard', l: 'Créez votre envoi' },
              { n: 2, i: 'calendar', l: 'Choisissez le type de livraison' },
              { n: 3, i: 'box', l: 'Déposez ou faites récupérer le colis' },
              { n: 4, i: 'truck', l: 'Un livreur agréé accepte la course' },
              { n: 5, i: 'pin', l: 'Suivi en temps réel' },
              { n: 6, i: 'check-circle', l: 'Colis livré en toute sécurité' }].
              map((s) =>
              <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                  width: 44, height: 44, borderRadius: 22, background: W_C.orange, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16,
                  border: '4px solid #fff', boxShadow: '0 0 0 1px ' + W_C.orange
                }}>{s.n}</div>
                  <div style={{
                  width: 56, height: 56, borderRadius: 12, background: '#fff', border: `1px solid ${W_C.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <W_Ic name={s.i} size={26} color={W_C.orange} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: W_C.ink2, lineHeight: 1.25, maxWidth: 90 }}>{s.l}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Partner CTA */}
        <div style={{
          background: '#0f0f0f', color: '#fff', borderRadius: 22, padding: 32,
          display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.15 }}>Rejoignez notre réseau de partenaires</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 14, lineHeight: 1.55 }}>
              Devenez livreur agréé ou point relais et développez votre activité avec COLISDIRECT.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <PrimaryBtn>Devenir livreur agréé</PrimaryBtn>
              <button style={{
                background: 'transparent', color: '#fff', border: '2px solid #fff',
                padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14
              }}>Devenir point relais</button>
            </div>
          </div>
          <W_Slot label="Partenaires" height={220} radius={16} tone="orange" />
        </div>
      </section>

      {/* Modes de livraison */}
      <section style={{ padding: '20px 40px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            {
              accent: '#F5B400', soft: '#FEF8E7',
              iconBg: 'linear-gradient(135deg, #FFB020, #FF8A00)',
              icon: 'home', title: 'Livraison à domicile', sub: 'Service de livraison à domicile',
              feat: 'Livré le jour même', featColor: W_C.green,
              desc: 'Votre colis livré directement à votre domicile le jour même',
              note: 'Service rapide et pratique pour vos envois urgents', noteIcon: 'zap',
            },
            {
              accent: '#5B9BFF', soft: '#EEF4FF',
              iconBg: 'linear-gradient(135deg, #4F8DF7, #2F6BE0)',
              icon: 'pin', title: 'Livraison en point relais', sub: 'Service en point relais',
              feat: 'Livré le lendemain', featColor: '#2F6BE0',
              desc: 'Votre colis disponible dans un point relais proche de chez vous',
              note: 'Service fiable et économique pour tous vos envois', noteIcon: 'box',
            },
          ].map(c => (
            <div key={c.title} style={{
              border: `2px solid ${c.accent}`, borderRadius: 22, padding: 28, background: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18, background: c.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: `0 8px 18px ${c.accent}55`,
                }}>
                  <W_Ic name={c.icon} size={30} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>{c.title}</div>
                  <div style={{ fontSize: 15, color: W_C.muted, marginTop: 2 }}>{c.sub}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                <W_Ic name="check-circle" size={24} color={c.featColor} />
                <span style={{ fontSize: 20, fontWeight: 800 }}>{c.feat}</span>
              </div>
              <p style={{ fontSize: 15, color: W_C.muted, marginTop: 8, lineHeight: 1.5 }}>{c.desc}</p>
              <div style={{
                marginTop: 18, background: c.soft, borderLeft: `4px solid ${c.accent}`,
                borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <W_Ic name={c.noteIcon} size={18} color={c.accent} />
                <span style={{ fontSize: 14, fontWeight: 700, color: W_C.ink2 }}>{c.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tarifs + suivi rapide */}
      <section style={{ padding: '64px 40px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, margin: 0, letterSpacing: -1 }}>Des tarifs simples et accessibles</h2>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 14 }}>
          À partir de <span style={{ color: W_C.orange }}>600 FCFA</span> seulement !
        </div>
        <div style={{
          margin: '36px auto 0', maxWidth: 460, background: W_C.bgSoft,
          border: `1px solid ${W_C.line}`, borderRadius: 18, padding: 28, textAlign: 'left',
        }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Entrez votre numéro de suivi</div>
          <div style={{
            background: '#fff', border: `1px solid ${W_C.line}`, borderRadius: 10,
            padding: '14px 16px', fontSize: 15, color: W_C.muted,
          }}>Ex : CD123456789</div>
          <button style={{
            background: '#000', color: '#fff', border: 'none', marginTop: 14,
            padding: '14px 26px', borderRadius: 10, fontWeight: 700, fontSize: 15,
          }}>Suivre mon colis</button>
        </div>
      </section>

      <WebFooter />
    </div>);

}
const miniStep = {
  width: 28, height: 28, borderRadius: 6, border: `1px solid ${W_C.line}`, background: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
};
function SmallField({ label, placeholder, chev }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: W_C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{
        border: `1px solid ${W_C.line}`, borderRadius: 8, padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: W_C.muted
      }}>
        <span>{placeholder}</span>
        {chev ? <W_Ic name="chev-down" size={14} color={W_C.muted} /> : <W_Ic name="refresh" size={14} color={W_C.muted} />}
      </div>
    </div>);

}

// ─────────────────────── TRACKING ───────────────────────
function WebTracking() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink }}>
      <WebHeader active="suivi" />
      <section style={{ background: 'linear-gradient(135deg, #FF6C00, #FF8C33)', color: '#fff', padding: '60px 40px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: 0 }}>Suivez votre colis en temps réel</h1>
          <p style={{ fontSize: 16, opacity: 0.95, marginTop: 12 }}>Entrez votre numéro de suivi pour connaître l'avancement de votre livraison.</p>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 8, marginTop: 24,
            display: 'flex', gap: 8, maxWidth: 620
          }}>
            <input placeholder="Ex : CD123456789CI" style={{
              flex: 1, border: 'none', outline: 'none', padding: '0 16px', fontSize: 15, color: W_C.ink
            }} />
            <button style={{
              background: '#000', color: '#fff', border: 'none', padding: '12px 22px',
              borderRadius: 10, fontWeight: 700, fontSize: 14
            }}>Suivre mon colis</button>
          </div>
        </div>
      </section>

      <section style={{ padding: '40px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28 }}>
          {/* Left: status */}
          <div style={{ border: `1px solid ${W_C.line}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: W_C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Numéro de suivi</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>CD123456789CI</div>
                <div style={{ fontSize: 13, color: W_C.muted, marginTop: 4 }}>Abidjan (Plateau) → Bouaké (N'Gattakro)</div>
              </div>
              <div style={{
                background: W_C.greenSoft, color: '#0f5a2b',
                padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13
              }}>En cours de livraison</div>
            </div>

            {/* Stepper */}
            <div style={{ marginTop: 28, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 20, left: 24, right: 24, height: 3, background: W_C.line, borderRadius: 2 }} />
              <div style={{ position: 'absolute', top: 20, left: 24, width: '52%', height: 3, background: W_C.orange, borderRadius: 2 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative' }}>
                {['Enregistré', 'Pris en charge', 'En transit', 'Livré'].map((s, i) => {
                  const done = i < 2,active = i === 2;
                  return (
                    <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 21,
                        background: done || active ? W_C.orange : '#fff',
                        border: `2px solid ${done || active ? W_C.orange : W_C.line}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {done || active ? <W_Ic name="check" size={20} color="#fff" /> : <W_Ic name="package" size={20} color={W_C.muted} />}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? W_C.orange : W_C.ink2 }}>{s}</div>
                    </div>);

                })}
              </div>
            </div>

            {/* Detail rows */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
              { l: 'Enregistré', d: '20 Mai 2024 — 09:30', done: true },
              { l: "Pris en charge par le livreur — Aboubacar K.", d: '20 Mai 2024 — 11:15', done: true },
              { l: "En transit · Autoroute du Nord", d: '20 Mai 2024 — 15:40', active: true },
              { l: 'Livré', d: 'En attente', done: false }].
              map((s, i, arr) => {
                const last = i === arr.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ position: 'relative', width: 18, flexShrink: 0 }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 7,
                        background: s.done || s.active ? W_C.orange : '#fff',
                        border: `2px solid ${s.done || s.active ? W_C.orange : W_C.line}`, marginTop: 5
                      }} />
                      {!last && <div style={{ position: 'absolute', top: 22, bottom: -14, left: 6, width: 2, background: W_C.line }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: s.done || s.active ? W_C.ink : W_C.muted }}>{s.l}</div>
                      <div style={{ fontSize: 12, color: W_C.muted }}>{s.d}</div>
                    </div>
                  </div>);

              })}
            </div>
          </div>

          {/* Right: info card + map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ border: `1px solid ${W_C.line}`, borderRadius: 18, padding: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Détails de l'envoi</div>
              {[
              ['Type', 'Point relais → Point relais'],
              ['Poids', '1 kg'],
              ['Catégorie', 'Vêtements'],
              ['Expéditeur', 'Awa K.'],
              ['Destinataire', 'Eric T.'],
              ['Prix total', '4 500 FCFA']].
              map(([l, v]) =>
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderBottom: `1px solid ${W_C.line}` }}>
                  <span style={{ color: W_C.muted }}>{l}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              )}
            </div>
            <div style={{ border: `1px solid ${W_C.line}`, borderRadius: 18, padding: 16 }}>
              <div style={{ position: 'relative', height: 180, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #E8F0E8, #DDEBDD)' }}>
                <svg width="100%" height="100%" viewBox="0 0 360 180" style={{ position: 'absolute', inset: 0 }}>
                  <path d="M30 150 C 120 80, 220 130, 330 30" stroke={W_C.orange} strokeWidth="3" strokeDasharray="6 6" fill="none" />
                  <circle cx="30" cy="150" r="7" fill={W_C.orange} stroke="#fff" strokeWidth="3" />
                  <circle cx="330" cy="30" r="7" fill="#000" stroke="#fff" strokeWidth="3" />
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: W_C.muted }}>
                <span>Abidjan</span><span>Bouaké</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WebFooter />
    </div>);

}

// ─────────────────────── PRICING ───────────────────────
function WebPricing() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink }}>
      <WebHeader active="tarifs" />
      <section style={{ background: 'linear-gradient(135deg, #FF6C00, #FF8C33)', color: '#fff', padding: '60px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: 0 }}>Des tarifs simples et accessibles</h1>
          <p style={{ fontSize: 16, opacity: 0.95, marginTop: 12 }}>À partir de 600 FCFA seulement — pas de frais cachés.</p>
        </div>
      </section>

      <section style={{ padding: '40px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${W_C.line}`, paddingBottom: 14 }}>
          <button style={pillBtn(true)}><W_Ic name="pin" size={16} color="#fff" /> Point relais</button>
          <button style={pillBtn(false)}><W_Ic name="home" size={16} color={W_C.muted} /> Domicile</button>
          <div style={{ width: 1, height: 28, background: W_C.line, margin: '0 14px' }} />
          <button style={tabBtn(true)}>Colis</button>
          <button style={tabBtn(false)}>Courrier</button>
          <button style={tabBtn(false)}>Options</button>
        </div>

        {/* Size selector */}
        <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
          {[
          { id: 'p', n: 'Petit colis', s: '< 2 kg', icon: 'package', active: true },
          { id: 'm', n: 'Colis moyen', s: '2 — 10 kg', icon: 'box' },
          { id: 'g', n: 'Grand colis', s: '10 — 30 kg', icon: 'truck' }].
          map((c) =>
          <div key={c.id} style={{
            flex: 1, border: `2px solid ${c.active ? W_C.orange : W_C.line}`, borderRadius: 14,
            background: c.active ? W_C.orangeSoft : '#fff', padding: 20,
            display: 'flex', alignItems: 'center', gap: 14
          }}>
              <div style={{
              width: 52, height: 52, borderRadius: 14, background: c.active ? W_C.orange : W_C.bgSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <W_Ic name={c.icon} size={26} color={c.active ? '#fff' : W_C.ink2} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{c.n}</div>
                <div style={{ fontSize: 13, color: W_C.muted }}>{c.s}</div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing grid */}
        <div style={{ marginTop: 28, border: `1px solid ${W_C.line}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', background: W_C.bgSoft, padding: '14px 18px', fontSize: 13, fontWeight: 800, color: W_C.ink2 }}>
            <div>Trajet</div><div>0 — 1 kg</div><div>1 — 5 kg</div><div>5 — 10 kg</div><div>10+ kg</div>
          </div>
          {[
          ['Abidjan ↔ Abidjan', '600', '1 000', '1 800', '2 500'],
          ['Abidjan ↔ Bouaké', '1 500', '2 500', '4 500', '6 000'],
          ['Abidjan ↔ Yamoussoukro', '1 200', '2 000', '3 500', '5 000'],
          ['Abidjan ↔ San Pedro', '1 800', '3 000', '5 200', '7 000'],
          ['Abidjan ↔ Korhogo', '2 200', '3 800', '6 500', '8 500']].
          map((row, i) =>
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)',
            padding: '14px 18px', fontSize: 14,
            borderTop: `1px solid ${W_C.line}`,
            background: i % 2 === 0 ? '#fff' : '#FAFAFB'
          }}>
              <div style={{ fontWeight: 700 }}>{row[0]}</div>
              {row.slice(1).map((v, j) =>
            <div key={j} style={{ color: W_C.ink2 }}>
                  <span style={{ fontWeight: 700 }}>{v}</span> <span style={{ fontSize: 11, color: W_C.muted }}>FCFA</span>
                </div>
            )}
            </div>
          )}
        </div>

        {/* Add-ons */}
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
          { i: 'shield', n: 'Assurance complète', d: 'Couverture jusqu\'à 100 000 FCFA', p: '+ 500 FCFA' },
          { i: 'clock', n: 'Livraison express', d: 'Livré le jour même', p: '+ 1 500 FCFA' },
          { i: 'bell', n: 'Notifications SMS', d: 'Suivi par SMS à chaque étape', p: 'Gratuit' }].
          map((o) =>
          <div key={o.n} style={{ border: `1px solid ${W_C.line}`, borderRadius: 14, padding: 18 }}>
              <div style={{
              width: 40, height: 40, borderRadius: 10, background: W_C.orangeSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><W_Ic name={o.i} size={20} color={W_C.orange} /></div>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 12 }}>{o.n}</div>
              <div style={{ fontSize: 13, color: W_C.muted, marginTop: 4 }}>{o.d}</div>
              <div style={{ fontWeight: 800, color: W_C.orange, marginTop: 10, fontSize: 14 }}>{o.p}</div>
            </div>
          )}
        </div>
      </section>
      <WebFooter />
    </div>);

}
function pillBtn(active) {
  return {
    background: active ? W_C.orange : W_C.bgSoft, color: active ? '#fff' : W_C.ink2,
    border: 'none', padding: '8px 16px', borderRadius: 999,
    fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6
  };
}
function tabBtn(active) {
  return {
    background: 'transparent', color: active ? W_C.orange : W_C.muted,
    border: 'none', padding: '8px 6px', fontWeight: 700, fontSize: 14,
    borderBottom: active ? `2px solid ${W_C.orange}` : '2px solid transparent',
    marginBottom: -15
  };
}

// ─────────────────────── MAP / RELAIS ───────────────────────
function WebMap() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink }}>
      <WebHeader active="relais" />
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: 700 }}>
        {/* Sidebar */}
        <aside style={{ borderRight: `1px solid ${W_C.line}`, padding: 20, overflow: 'auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Points relais</h2>
          <div style={{ fontSize: 13, color: W_C.muted, marginTop: 4 }}>523 points relais à Abidjan</div>
          <div style={{
            border: `1px solid ${W_C.line}`, borderRadius: 10, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 14
          }}>
            <W_Ic name="search" size={18} color={W_C.muted} />
            <input placeholder="Rechercher commune ou quartier" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {['Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Treichville', 'Adjamé'].map((c) =>
            <span key={c} style={{
              background: c === 'Cocody' ? W_C.orange : W_C.bgSoft,
              color: c === 'Cocody' ? '#fff' : W_C.ink2,
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600
            }}>{c}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            {[
            { n: 'POINT RELAIS AKWABA', a: 'Cocody, Angré 8e Tranche', d: '1.2 km', open: true, active: true },
            { n: 'BOUTIQUE EXPRESS', a: 'Cocody, Riviera Palmeraie', d: '2.5 km', open: true },
            { n: 'POINT RELAIS LIBERTÉ', a: 'Cocody, Deux Plateaux', d: '3.1 km', open: false },
            { n: 'MARCHÉ COCODY RELAIS', a: 'Cocody, Centre', d: '3.4 km', open: true },
            { n: 'CARREFOUR ANGRÉ', a: 'Cocody, Angré 7e', d: '3.8 km', open: true }].
            map((r) =>
            <div key={r.n} style={{
              border: `1.5px solid ${r.active ? W_C.orange : W_C.line}`,
              background: r.active ? W_C.orangeSoft : '#fff',
              borderRadius: 12, padding: 14
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{r.n}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: W_C.muted }}>{r.d}</span>
                </div>
                <div style={{ fontSize: 12, color: W_C.muted, marginTop: 2 }}>{r.a}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.open ? W_C.green : W_C.red, marginTop: 6 }}>
                  {r.open ? 'Ouvert · 08h - 20h' : 'Fermé · Ouvre à 09h'}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Fake map */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #E8F0E8 0%, #DDEBDD 100%)', overflow: 'hidden' }}>
          <svg width="100%" height="100%" viewBox="0 0 800 700" style={{ position: 'absolute', inset: 0 }}>
            <path d="M-20 150 L820 200" stroke="#fff" strokeWidth="20" />
            <path d="M-20 350 L820 380" stroke="#fff" strokeWidth="16" />
            <path d="M-20 530 L820 560" stroke="#fff" strokeWidth="12" />
            <path d="M200 -20 L220 720" stroke="#fff" strokeWidth="18" />
            <path d="M450 -20 L470 720" stroke="#fff" strokeWidth="14" />
            <path d="M650 -20 L670 720" stroke="#fff" strokeWidth="10" />
            <rect x="280" y="240" width="120" height="80" fill="#D0E0E8" opacity="0.7" rx="4" />
            <rect x="500" y="400" width="100" height="60" fill="#D0E0E8" opacity="0.7" rx="4" />
            <path d="M-20 100 Q 400 80, 820 120" stroke="#A8D5E8" strokeWidth="8" fill="none" opacity="0.7" />
          </svg>
          {[
          { x: 150, y: 200, hl: false }, { x: 280, y: 300, hl: true },
          { x: 380, y: 180, hl: false }, { x: 500, y: 250, hl: false },
          { x: 620, y: 320, hl: false }, { x: 200, y: 450, hl: false },
          { x: 450, y: 480, hl: false }, { x: 580, y: 540, hl: false },
          { x: 700, y: 200, hl: false }, { x: 350, y: 580, hl: false }].
          map((p, i) =>
          <div key={i} style={{
            position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-100%)'
          }}>
              <div style={{
              width: p.hl ? 44 : 32, height: p.hl ? 44 : 32, borderRadius: 22,
              background: W_C.orange, border: '3px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <W_Ic name="package" size={p.hl ? 22 : 16} color="#fff" />
              </div>
            </div>
          )}
          {/* Floating info card */}
          <div style={{
            position: 'absolute', top: 220, left: 320,
            background: '#fff', borderRadius: 14, padding: 16,
            boxShadow: '0 12px 28px rgba(0,0,0,0.15)', width: 260
          }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>POINT RELAIS AKWABA</div>
            <div style={{ fontSize: 12, color: W_C.muted, marginTop: 2 }}>Cocody, Angré 8e Tranche</div>
            <div style={{ fontSize: 12, color: W_C.green, fontWeight: 700, marginTop: 6 }}>Ouvert · 08h - 20h</div>
            <button style={{ ...PrimaryBtn, marginTop: 10, background: W_C.orange, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, width: '100%' }}>Itinéraire</button>
          </div>
        </div>
      </div>
      <WebFooter />
    </div>);

}

// ─────────────────────── DEVENIR PARTENAIRE ───────────────────────
function WebBecome() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink }}>
      <WebHeader active="partenaire" />
      <section style={{ padding: '0 40px' }}>
        <div style={{
          margin: '24px 0', borderRadius: 24, padding: '56px 56px',
          background: '#0f0f0f', color: '#fff',
          display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 28, alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: W_C.orange, letterSpacing: 1, textTransform: 'uppercase' }}>Devenez partenaire</div>
            <h1 style={{ fontSize: 50, fontWeight: 800, margin: '14px 0 16px', lineHeight: 1.05 }}>
              Boostez vos revenus avec <span style={{ color: W_C.orange }}>COLISDIRECT</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, maxWidth: 540 }}>
              Devenez livreur agréé ou point relais et développez votre activité avec un réseau de plus de 500 partenaires en Côte d'Ivoire.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <PrimaryBtn>Devenir livreur agréé</PrimaryBtn>
              <button style={{
                background: 'transparent', color: '#fff', border: '2px solid #fff',
                padding: '12px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14
              }}>Devenir point relais</button>
            </div>
          </div>
          <image-slot id="partner-hero"
            style={{ width: '100%', height: '340px', display: 'block', borderRadius: '18px' }}
            shape="rounded"
            radius="18"
            fit="cover"
            position="center"
            src="assets/partenaires.png"
            placeholder="Image partenaires COLISDIRECT">
          </image-slot>
        </div>
      </section>

      <section style={{ padding: '60px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', margin: 0 }}>Les avantages à devenir partenaire</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, marginTop: 36 }}>
          {[
          { i: 'eye', t: 'Plus de visibilité pour votre commerce', d: 'Votre boutique apparaît sur la carte COLISDIRECT et attire de nouveaux clients potentiels à proximité.' },
          { i: 'wallet', t: 'Un revenu supplémentaire chaque mois', d: 'Recevez une commission pour chaque colis déposé ou retiré dans votre point relais.' },
          { i: 'refresh', t: 'Une activité simple et complémentaire', d: "Devenez relais sans changer votre activité principale — COLISDIRECT s'occupe du transport et du suivi." }].
          map((c) =>
          <div key={c.t} style={{ textAlign: 'center', padding: 28 }}>
              <div style={{
              width: 64, height: 64, borderRadius: 32, background: W_C.orangeSoft, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <W_Ic name={c.i} size={32} color={W_C.orange} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, marginTop: 14 }}>{c.t}</div>
              <p style={{ fontSize: 14, color: W_C.muted, lineHeight: 1.55, marginTop: 8 }}>{c.d}</p>
            </div>
          )}
        </div>

        {/* Two cards: relay vs courier */}
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
          { t: 'Point relais', s: 'Pour les commerçants', i: 'pin', items: ['Commission sur chaque colis', 'Visibilité sur la carte', 'Aucun matériel requis', 'Formation offerte'] },
          { t: 'Livreur agréé', s: 'Pour les indépendants', i: 'truck', items: ['Courses flexibles', 'Paiement hebdomadaire', 'Assurance incluse', 'App livreur dédiée'] }].
          map((c) =>
          <div key={c.t} style={{ border: `1px solid ${W_C.line}`, borderRadius: 18, padding: 28 }}>
              <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: W_C.orangeSoft, padding: '6px 14px', borderRadius: 999
            }}>
                <W_Ic name={c.i} size={16} color={W_C.orange} />
                <span style={{ fontSize: 12, fontWeight: 700, color: W_C.orange }}>{c.s}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 14 }}>{c.t}</div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.items.map((x) =>
              <div key={x} style={{ display: 'flex', gap: 10, fontSize: 14, color: W_C.ink2 }}>
                    <W_Ic name="check-circle" size={18} color={W_C.green} /> {x}
                  </div>
              )}
              </div>
              <PrimaryBtn style={{ marginTop: 20, width: '100%' }}>Postuler maintenant</PrimaryBtn>
            </div>
          )}
        </div>
      </section>

      <WebFooter />
    </div>);

}

// ─────────────────────── LOGIN ───────────────────────
function WebLogin() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 700 }}>
      <div style={{ background: '#0f0f0f', color: '#fff', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <window.CDLogo size={22} light />
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>Bienvenue sur COLISDIRECT</h1>
          <p style={{ fontSize: 16, marginTop: 14, opacity: 0.92, maxWidth: 380 }}>
            Connectez-vous pour envoyer, suivre et recevoir vos colis en toute simplicité.
          </p>
          <div style={{ marginTop: 32 }}>
            <W_Slot label="Mockup app" height={260} radius={18} tone="orange" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }} />
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>© 2026 COLISDIRECT — Côte d'Ivoire</div>
      </div>

      <div style={{ padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Se connecter</h2>
          <p style={{ fontSize: 14, color: W_C.muted, marginTop: 6 }}>Pas encore de compte ? <span style={{ color: W_C.orange, fontWeight: 700 }}>S'inscrire</span></p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
            <SmallField label="Email ou numéro de téléphone" placeholder="exemple@email.com" />
            <SmallField label="Mot de passe" placeholder="••••••••" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: W_C.ink2 }}>
                <input type="checkbox" style={{ accentColor: W_C.orange }} /> Se souvenir de moi
              </label>
              <span style={{ color: W_C.orange, fontWeight: 700 }}>Mot de passe oublié ?</span>
            </div>
            <PrimaryBtn style={{ marginTop: 6 }}>Se connecter</PrimaryBtn>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: W_C.muted, fontSize: 12, margin: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: W_C.line }} /> ou continuer avec <div style={{ flex: 1, height: 1, background: W_C.line }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Google', 'Apple', 'Facebook'].map((p) =>
              <button key={p} style={{
                flex: 1, background: '#fff', border: `1.5px solid ${W_C.line}`,
                padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: 13
              }}>{p}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}

// ─────────────────────── CREATE SHIPMENT ───────────────────────
function WebCreate() {
  return (
    <div style={{ background: '#fff', fontFamily: W_C.font, color: W_C.ink }}>
      <WebHeader active="envoi" />
      <section style={{ padding: '40px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Créer un envoi</h1>
        <p style={{ fontSize: 14, color: W_C.muted, marginTop: 6 }}>Quelques étapes pour préparer votre colis.</p>

        {/* Stepper */}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          {['Type de livraison', 'Détails du colis', 'Adresses', 'Paiement'].map((s, i) => {
            const active = i === 1,done = i === 0;
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: done ? W_C.orange : active ? W_C.orange : '#fff',
                    border: `2px solid ${done || active ? W_C.orange : W_C.line}`,
                    color: done || active ? '#fff' : W_C.muted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800
                  }}>{done ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? W_C.orange : W_C.ink2 }}>{s}</span>
                </div>
                {i < 3 && <div style={{ flex: 1, height: 2, background: i < 1 ? W_C.orange : W_C.line }} />}
              </React.Fragment>);

          })}
        </div>

        <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          {/* Form */}
          <div style={{ border: `1px solid ${W_C.line}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Détails du colis</div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, color: W_C.muted, marginBottom: 8 }}>Taille du colis</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                { id: 'p', n: 'Petit', s: '< 2 kg', icon: 'package', active: true },
                { id: 'm', n: 'Moyen', s: '2 — 10 kg', icon: 'box' },
                { id: 'g', n: 'Grand', s: '10 — 30 kg', icon: 'truck' }].
                map((c) =>
                <div key={c.id} style={{
                  border: `2px solid ${c.active ? W_C.orange : W_C.line}`,
                  background: c.active ? W_C.orangeSoft : '#fff',
                  borderRadius: 12, padding: 14, textAlign: 'center'
                }}>
                    <W_Ic name={c.icon} size={26} color={c.active ? W_C.orange : W_C.ink2} />
                    <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}>{c.n}</div>
                    <div style={{ fontSize: 11, color: W_C.muted }}>{c.s}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
              <SmallField label="Catégorie" placeholder="Vêtements" chev />
              <SmallField label="Valeur déclarée (FCFA)" placeholder="0" />
            </div>
            <div style={{ marginTop: 14 }}>
              <SmallField label="Description du colis" placeholder="Décrivez brièvement le contenu" />
            </div>

            <div style={{ fontWeight: 800, fontSize: 16, marginTop: 26 }}>Destinataire</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
              <SmallField label="Prénom" placeholder="Eric" />
              <SmallField label="Nom" placeholder="Touré" />
              <SmallField label="Téléphone" placeholder="+225 07 00 00 00 00" />
              <SmallField label="Email (optionnel)" placeholder="exemple@email.com" />
            </div>

            <div style={{ marginTop: 22, padding: 16, background: W_C.orangeSoft, borderRadius: 12, display: 'flex', gap: 12 }}>
              <W_Ic name="shield" size={20} color={W_C.orange} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Ajouter une assurance ?</div>
                <div style={{ fontSize: 12, color: W_C.ink2, marginTop: 2 }}>Protégez votre colis jusqu'à 100 000 FCFA pour seulement 500 FCFA.</div>
              </div>
              <div style={{
                width: 44, height: 26, borderRadius: 13, background: W_C.orange, marginLeft: 'auto', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 3
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <OutlineBtn>Retour</OutlineBtn>
              <PrimaryBtn style={{ marginLeft: 'auto' }}>Continuer</PrimaryBtn>
            </div>
          </div>

          {/* Summary */}
          <div style={{ border: `1px solid ${W_C.line}`, borderRadius: 16, padding: 24, alignSelf: 'flex-start', position: 'sticky', top: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Récapitulatif</div>
            <div style={{ marginTop: 14, padding: 12, background: W_C.bgSoft, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: W_C.muted, textTransform: 'uppercase' }}>De</div>
                  <div style={{ fontWeight: 800 }}>Abidjan</div>
                </div>
                <W_Ic name="chev-right" size={18} color={W_C.orange} />
                <div>
                  <div style={{ fontSize: 11, color: W_C.muted, textTransform: 'uppercase' }}>À</div>
                  <div style={{ fontWeight: 800 }}>Bouaké</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Line label="Type de livraison" value="Relais → Relais" />
              <Line label="Poids" value="1 kg" muted />
              <Line label="Distance" value="~ 350 km" muted />
              <Line label="Assurance" value="Incluse" muted />
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${W_C.line}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Total estimé</span>
              <span style={{ fontWeight: 800, color: W_C.orange, fontSize: 22 }}>4 500 FCFA</span>
            </div>
          </div>
        </div>
      </section>
      <WebFooter />
    </div>);

}
// Local Line for WebCreate (mobile-screens.jsx has its own, but separate scope)
function Line({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: W_C.muted }}>{label}</span>
      <span style={{ fontWeight: 700, color: muted ? W_C.muted : W_C.ink }}>{value}</span>
    </div>);

}

Object.assign(window, { WebHome, WebTracking, WebPricing, WebMap, WebBecome, WebLogin, WebCreate });