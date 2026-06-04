// ColisDirect — Web payment / checkout page
// Exports to window: WebCheckout

const Pay_C = window.CD;
const Pay_Ic = window.CDIcon;

function PayHeader() {
  return (
    <header style={{ background: '#fff', borderBottom: `1px solid ${Pay_C.line}`, padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <window.CDLogo size={24} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: Pay_C.muted }}>
        <Pay_Ic name="shield" size={16} color={Pay_C.green} /> Paiement sécurisé
      </div>
    </header>
  );
}

function PayOperator({ name, bg, fg = '#fff', size = 48 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.26, flexShrink: 0 }}>{name}</div>
  );
}

function WebCheckout() {
  const methods = [
    { id: 'om', op: <PayOperator name="OM" bg="#FF7900" />, l: 'Orange Money', s: 'Paiement instantané', sel: true },
    { id: 'mtn', op: <PayOperator name="MTN" bg="#FFCC00" fg="#111" />, l: 'MTN MoMo', s: 'Paiement instantané' },
    { id: 'wave', op: <PayOperator name="Wave" bg="#1DC8FF" />, l: 'Wave', s: 'Paiement instantané' },
    { id: 'moov', op: <PayOperator name="Moov" bg="#0066B3" />, l: 'Moov Money', s: 'Paiement instantané' },
    { id: 'card', op: <div style={{ width: 48, height: 48, borderRadius: 12, background: Pay_C.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pay_Ic name="card" size={24} color={Pay_C.ink} /></div>, l: 'Carte bancaire', s: 'Visa, Mastercard' },
    { id: 'cash', op: <div style={{ width: 48, height: 48, borderRadius: 12, background: Pay_C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pay_Ic name="wallet" size={24} color={Pay_C.green} /></div>, l: 'Espèces à la livraison', s: 'Payé par le destinataire' },
  ];
  const Field = ({ label, value, w = '100%' }) => (
    <div style={{ width: w }}>
      <div style={{ fontSize: 12, color: Pay_C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ border: `1px solid ${Pay_C.line}`, borderRadius: 10, padding: '13px 14px', fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ background: Pay_C.bgSoft, fontFamily: Pay_C.font, color: Pay_C.ink, minHeight: 980 }}>
      <PayHeader />

      {/* Steps */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${Pay_C.line}`, padding: '18px 40px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {['Détails du colis', 'Adresses', 'Paiement', 'Confirmation'].map((s, i) => {
            const done = i < 2, active = i === 2;
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 15,
                    background: done || active ? Pay_C.orange : '#fff',
                    border: `2px solid ${done || active ? Pay_C.orange : Pay_C.line}`,
                    color: done || active ? '#fff' : Pay_C.muted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
                  }}>{done ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? Pay_C.orange : Pay_C.ink2 }}>{s}</span>
                </div>
                {i < 3 && <div style={{ flex: 1, height: 2, background: i < 2 ? Pay_C.orange : Pay_C.line }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 28, alignItems: 'flex-start' }}>
        {/* Left: methods + form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#fff', border: `1px solid ${Pay_C.line}`, borderRadius: 18, padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 18px' }}>Moyen de paiement</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {methods.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  border: `1.5px solid ${m.sel ? Pay_C.orange : Pay_C.line}`,
                  background: m.sel ? Pay_C.orangeSoft : '#fff', borderRadius: 14,
                }}>
                  {m.op}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.l}</div>
                    <div style={{ fontSize: 12, color: Pay_C.muted }}>{m.s}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${m.sel ? Pay_C.orange : Pay_C.line}`, background: m.sel ? Pay_C.orange : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.sel && <Pay_Ic name="check" size={13} color="#fff" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected method form: Orange Money */}
          <div style={{ background: '#fff', border: `1px solid ${Pay_C.line}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <PayOperator name="OM" bg="#FF7900" size={40} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Payer avec Orange Money</div>
                <div style={{ fontSize: 13, color: Pay_C.muted }}>Une demande de confirmation sera envoyée sur votre téléphone</div>
              </div>
            </div>
            <Field label="Numéro Orange Money" value="+225 07 58 42 19 03" />
            <div style={{ marginTop: 18, background: Pay_C.bgSoft, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Comment ça marche</div>
              {['Saisissez votre numéro Orange Money', 'Validez le montant de 4 500 FCFA', 'Confirmez avec votre code secret #144#'].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: i < 2 ? 10 : 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: Pay_C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: Pay_C.ink2 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: Pay_C.muted, fontSize: 12, marginTop: 16 }}>
              <Pay_Ic name="shield" size={15} color={Pay_C.green} /> Paiement 100% sécurisé et chiffré — ColisDirect ne stocke jamais vos identifiants
            </div>
          </div>
        </div>

        {/* Right: order summary */}
        <div style={{ background: '#fff', border: `1px solid ${Pay_C.line}`, borderRadius: 18, padding: 24, position: 'sticky', top: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Récapitulatif</div>

          {/* Route */}
          <div style={{ background: Pay_C.bgSoft, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: Pay_C.muted, textTransform: 'uppercase' }}>De</div>
              <div style={{ fontWeight: 800 }}>Abidjan</div>
            </div>
            <Pay_Ic name="chev-right" size={18} color={Pay_C.orange} />
            <div>
              <div style={{ fontSize: 11, color: Pay_C.muted, textTransform: 'uppercase' }}>À</div>
              <div style={{ fontWeight: 800 }}>Bouaké</div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Type de livraison', 'Relais → Relais'],
              ['Taille du colis', 'Moyen · 1 kg'],
              ['Destinataire', 'Eric Touré'],
              ['Code promo', 'WELCOME10'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: Pay_C.muted }}>{l}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${Pay_C.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: Pay_C.muted }}>Prix de base</span><span style={{ fontWeight: 600 }}>5 000 FCFA</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: Pay_C.muted }}>Réduction (-10%)</span><span style={{ fontWeight: 600, color: Pay_C.green }}>-500 FCFA</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: Pay_C.muted }}>Assurance</span><span style={{ fontWeight: 600 }}>0 FCFA</span></div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${Pay_C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total à payer</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: Pay_C.orange }}>4 500 FCFA</span>
          </div>

          <button style={{ width: '100%', background: Pay_C.orange, color: '#fff', border: 'none', padding: '16px', borderRadius: 12, fontWeight: 800, fontSize: 16, marginTop: 18 }}>Payer 4 500 FCFA</button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: Pay_C.muted, marginTop: 12 }}>
            <Pay_Ic name="shield" size={14} color={Pay_C.green} /> Transaction protégée
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WebCheckout });
