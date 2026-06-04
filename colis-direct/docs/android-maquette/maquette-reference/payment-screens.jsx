// ColisDirect — Payment screens (mobile)
// Exports to window: PayMethod, PayMobileMoney, PayCard, PaySuccess

const Pm_C = window.CD;
const Pm_Ic = window.CDIcon;

function PmScreen({ children, safeTop = 0, footer }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: Pm_C.font, color: Pm_C.ink }}>
      {safeTop > 0 && <div style={{ height: safeTop, flexShrink: 0 }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${Pm_C.line}` }}>
        <Pm_Ic name="chev-left" size={24} color={Pm_C.ink} />
        <div style={{ fontWeight: 700, fontSize: 17 }}>Paiement</div>
        <div style={{ width: 24 }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      {footer && <div style={{ padding: 16, borderTop: `1px solid ${Pm_C.line}` }}>{footer}</div>}
    </div>
  );
}

const pmPrimary = { width: '100%', background: Pm_C.orange, color: '#fff', border: 'none', padding: '15px', borderRadius: 12, fontWeight: 700, fontSize: 15 };

function PmOperator({ name, bg, fg = '#fff' }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{name}</div>
  );
}

function PmAmount() {
  return (
    <div style={{ margin: 16, background: Pm_C.orangeSoft, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: Pm_C.ink2, marginBottom: 6 }}>
        <span>Envoi Abidjan → Bouaké</span><span>5 000 FCFA</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: Pm_C.muted, marginBottom: 10 }}>
        <span>Réduction (-10%)</span><span style={{ color: Pm_C.green }}>-500 FCFA</span>
      </div>
      <div style={{ borderTop: `1px dashed ${Pm_C.orange}44`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Total à payer</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: Pm_C.orange }}>4 500 FCFA</span>
      </div>
    </div>
  );
}

// ─────────── 1. CHOIX DU MODE DE PAIEMENT ───────────
function PayMethod({ safeTop = 0 }) {
  const methods = [
    { id: 'om', op: <PmOperator name="OM" bg="#FF7900" />, l: 'Orange Money', s: 'Paiement instantané', sel: true },
    { id: 'mtn', op: <PmOperator name="MTN" bg="#FFCC00" fg="#111" />, l: 'MTN MoMo', s: 'Paiement instantané' },
    { id: 'wave', op: <PmOperator name="Wave" bg="#1DC8FF" />, l: 'Wave', s: 'Paiement instantané' },
    { id: 'moov', op: <PmOperator name="Moov" bg="#0066B3" />, l: 'Moov Money', s: 'Paiement instantané' },
    { id: 'card', op: <div style={{ width: 44, height: 44, borderRadius: 10, background: Pm_C.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pm_Ic name="card" size={22} color={Pm_C.ink} /></div>, l: 'Carte bancaire', s: 'Visa, Mastercard' },
    { id: 'cash', op: <div style={{ width: 44, height: 44, borderRadius: 10, background: Pm_C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pm_Ic name="wallet" size={22} color={Pm_C.green} /></div>, l: 'Espèces à la livraison', s: 'Payé par le destinataire' },
  ];
  return (
    <PmScreen safeTop={safeTop} footer={<button style={pmPrimary}>Continuer</button>}>
      <PmAmount />
      <div style={{ padding: '0 16px', fontSize: 13, fontWeight: 800, color: Pm_C.ink, marginBottom: 10 }}>Choisissez un moyen de paiement</div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {methods.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 14,
            border: `1.5px solid ${m.sel ? Pm_C.orange : Pm_C.line}`,
            background: m.sel ? Pm_C.orangeSoft : '#fff', borderRadius: 14,
          }}>
            {m.op}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.l}</div>
              <div style={{ fontSize: 12, color: Pm_C.muted }}>{m.s}</div>
            </div>
            <div style={{
              width: 22, height: 22, borderRadius: 11,
              border: `2px solid ${m.sel ? Pm_C.orange : Pm_C.line}`,
              background: m.sel ? Pm_C.orange : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {m.sel && <Pm_Ic name="check" size={13} color="#fff" />}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8, color: Pm_C.muted, fontSize: 12 }}>
        <Pm_Ic name="shield" size={15} color={Pm_C.green} /> Paiement 100% sécurisé et chiffré
      </div>
    </PmScreen>
  );
}

// ─────────── 2. PAIEMENT MOBILE MONEY ───────────
function PayMobileMoney({ safeTop = 0 }) {
  return (
    <PmScreen safeTop={safeTop} footer={<button style={pmPrimary}>Payer 4 500 FCFA</button>}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <PmOperator name="OM" bg="#FF7900" />
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>Paiement Orange Money</div>
        <div style={{ fontSize: 13, color: Pm_C.muted, marginTop: 4 }}>Vous recevrez une demande de confirmation sur votre téléphone</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 12, color: Pm_C.muted, marginBottom: 6 }}>Numéro Orange Money</div>
        <div style={{ border: `1.5px solid ${Pm_C.orange}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: Pm_C.ink }}>+225</span>
          <span style={{ width: 1, height: 20, background: Pm_C.line }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>07 58 42 19 03</span>
        </div>

        <div style={{ marginTop: 20, background: Pm_C.bgSoft, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Comment ça marche</div>
          {[
            'Saisissez votre numéro Orange Money',
            'Validez le montant de 4 500 FCFA',
            'Confirmez avec votre code secret',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: i < 2 ? 10 : 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: Pm_C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: Pm_C.ink2 }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, color: Pm_C.muted }}>Montant</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: Pm_C.orange }}>4 500 FCFA</span>
        </div>
      </div>
    </PmScreen>
  );
}

// ─────────── 3. PAIEMENT PAR CARTE ───────────
function PayCard({ safeTop = 0 }) {
  const F = ({ label, value }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: Pm_C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ border: `1px solid ${Pm_C.line}`, borderRadius: 10, padding: '13px 14px', fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
  return (
    <PmScreen safeTop={safeTop} footer={<button style={pmPrimary}>Payer 4 500 FCFA</button>}>
      <div style={{ padding: 16 }}>
        <div style={{
          borderRadius: 18, padding: 22, color: '#fff', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #1A1A1A 0%, #3A3A3A 100%)', height: 180,
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, background: Pm_C.orange, opacity: 0.25 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <window.CDLogo size={15} light />
            <div style={{ fontSize: 13, fontWeight: 800, fontStyle: 'italic', opacity: 0.9 }}>VISA</div>
          </div>
          <div style={{ width: 44, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #E6C36B, #C9A14A)', marginTop: 22 }} />
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 2, marginTop: 16 }}>5282 3456 7890 1289</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12 }}>
            <div><div style={{ opacity: 0.6, fontSize: 9 }}>TITULAIRE</div>AXEL M.</div>
            <div><div style={{ opacity: 0.6, fontSize: 9 }}>EXPIRE</div>08/28</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <F label="Numéro de carte" value="5282 3456 7890 1289" />
        <F label="Titulaire de la carte" value="Axel M." />
        <div style={{ display: 'flex', gap: 12 }}>
          <F label="Date d'expiration" value="08 / 28" />
          <F label="CVV" value="•••" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div style={{ width: 44, height: 26, borderRadius: 13, background: Pm_C.orange, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 3 }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff' }} />
          </div>
          <span style={{ fontSize: 13, color: Pm_C.ink2 }}>Enregistrer cette carte</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: Pm_C.muted, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
          <Pm_Ic name="shield" size={15} color={Pm_C.green} /> Vos données sont chiffrées et sécurisées
        </div>
      </div>
    </PmScreen>
  );
}

// ─────────── 4. CONFIRMATION / REÇU ───────────
function PaySuccess({ safeTop = 0 }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: Pm_C.font, color: Pm_C.ink }}>
      {safeTop > 0 && <div style={{ height: safeTop, flexShrink: 0 }} />}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ background: Pm_C.green, color: '#fff', padding: '40px 24px 32px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,255,255,0.2)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pm_Ic name="check" size={30} color={Pm_C.green} stroke={3} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 16 }}>Paiement réussi !</div>
          <div style={{ fontSize: 14, opacity: 0.95, marginTop: 4 }}>Votre envoi a été confirmé</div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 14 }}>4 500 FCFA</div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ border: `1px solid ${Pm_C.line}`, borderRadius: 16, overflow: 'hidden' }}>
            {[
              ['N° de transaction', 'TXN-2026-784512'],
              ['Mode de paiement', 'Orange Money'],
              ['N° de suivi', 'CD123456789CI'],
              ['Date', '30 Mai 2026 · 14:32'],
              ['Trajet', 'Abidjan → Bouaké'],
            ].map(([l, v], i, arr) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${Pm_C.line}` : 'none', fontSize: 13 }}>
                <span style={{ color: Pm_C.muted }}>{l}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: Pm_C.orangeSoft, borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Pm_Ic name="qr" size={36} color={Pm_C.orange} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Reçu disponible</div>
              <div style={{ fontSize: 12, color: Pm_C.ink2, marginTop: 2 }}>Présentez ce QR code au point relais</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${Pm_C.line}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={pmPrimary}>Suivre mon colis</button>
        <button style={{ width: '100%', background: '#fff', color: Pm_C.ink, border: `1.5px solid ${Pm_C.line}`, padding: '15px', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>Télécharger le reçu</button>
      </div>
    </div>
  );
}

Object.assign(window, { PayMethod, PayMobileMoney, PayCard, PaySuccess });
