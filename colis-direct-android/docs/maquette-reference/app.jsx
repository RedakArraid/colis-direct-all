// ColisDirect — Master design canvas
// Sections: Site Web · Mobile iOS · Mobile Android

const { DesignCanvas, DCSection, DCArtboard } = window;
const {
  WebHome, WebCreate, WebTracking, WebPricing, WebMap, WebBecome, WebLogin, WebCourier,
  WebCourierAvailable, WebCourierActive, WebCourierHistory, WebCourierEarnings, WebCourierProfile,
  WebCheckout,
  MobileHome, MobileCreate, MobileSummary, MobileTracking, MobileRelays, MobileProfile, MobileCourier,
  CourierDashboard, CourierAvailable, CourierDetail, CourierActive,
  CourierProof, CourierEarnings, CourierHistory, CourierProfile,
  PayMethod, PayMobileMoney, PayCard, PaySuccess,
  IOSDevice, AndroidDevice,
} = window;

// Slightly smaller iOS/Android frame so multiple fit on a row nicely.
const DEVICE_W_IOS = 360;
const DEVICE_H_IOS = 780;
const DEVICE_W_AND = 368;
const DEVICE_H_AND = 800;

function App() {
  // Web pages: each one is a fixed-size DCArtboard
  const webPages = [
    { id: 'web-home', label: 'Accueil', node: <WebHome />, h: 2360 },
    { id: 'web-create', label: 'Créer un envoi', node: <WebCreate />, h: 1500 },
    { id: 'web-tracking', label: 'Suivi de colis', node: <WebTracking />, h: 1300 },
    { id: 'web-map', label: 'Points relais', node: <WebMap />, h: 1300 },
    { id: 'web-become', label: 'Devenir partenaire', node: <WebBecome />, h: 1450 },
    { id: 'web-checkout', label: 'Paiement', node: <WebCheckout />, h: 980 },
    { id: 'web-login', label: 'Connexion', node: <WebLogin />, h: 760 },
  ];

  const courierWebPages = [
    { id: 'wc-dash', label: 'Tableau de bord', node: <WebCourier />, h: 1240 },
    { id: 'wc-avail', label: 'Courses disponibles', node: <WebCourierAvailable />, h: 1000 },
    { id: 'wc-active', label: 'Course en cours', node: <WebCourierActive />, h: 1000 },
    { id: 'wc-history', label: 'Historique des courses', node: <WebCourierHistory />, h: 1000 },
    { id: 'wc-earn', label: 'Mes gains', node: <WebCourierEarnings />, h: 1000 },
    { id: 'wc-profile', label: 'Profil livreur', node: <WebCourierProfile />, h: 1000 },
  ];

  const mobileScreens = [
    { id: 'm1', label: '1. Accueil', Comp: MobileHome },
    { id: 'm2', label: '2. Créer un envoi', Comp: MobileCreate },
    { id: 'm3', label: '3. Récapitulatif & prix', Comp: MobileSummary },
    { id: 'm4', label: '4. Suivi de colis', Comp: MobileTracking },
    { id: 'm5', label: '5. Trouver un point relais', Comp: MobileRelays },
    { id: 'm6', label: '6. Profil utilisateur', Comp: MobileProfile },
    { id: 'm7', label: '7. Espace livreur agréé', Comp: MobileCourier },
  ];

  const courierScreens = [
    { id: 'c1', label: '1. Tableau de bord', Comp: CourierDashboard },
    { id: 'c2', label: '2. Courses disponibles', Comp: CourierAvailable },
    { id: 'c3', label: '3. Détail de la course', Comp: CourierDetail },
    { id: 'c4', label: '4. Course en cours', Comp: CourierActive },
    { id: 'c5', label: '5. Preuve de livraison', Comp: CourierProof },
    { id: 'c6', label: '6. Mes gains', Comp: CourierEarnings },
    { id: 'c7', label: '7. Historique des courses', Comp: CourierHistory },
    { id: 'c8', label: '8. Profil livreur', Comp: CourierProfile },
  ];

  const paymentScreens = [
    { id: 'p1', label: '1. Mode de paiement', Comp: PayMethod },
    { id: 'p2', label: '2. Mobile Money', Comp: PayMobileMoney },
    { id: 'p3', label: '3. Carte bancaire', Comp: PayCard },
    { id: 'p4', label: '4. Confirmation', Comp: PaySuccess },
  ];

  return (
    <DesignCanvas>
      <DCSection
        id="web"
        title="Site web — COLISDIRECT"
        subtitle="Pages clés du site web responsive — Accueil, Envoi, Suivi, Tarifs, Points relais, Partenariat, Connexion."
      >
        {webPages.map(p => (
          <DCArtboard key={p.id} id={p.id} label={p.label} width={1280} height={p.h}>
            <div style={{ width: 1280, transformOrigin: 'top left' }}>
              {p.node}
            </div>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="web-courier"
        title="Site web — Espace livreur / transporteur"
        subtitle="Dashboard web du livreur agréé : tableau de bord, courses disponibles, course en cours, historique, gains et profil."
      >
        {courierWebPages.map(p => (
          <DCArtboard key={p.id} id={p.id} label={p.label} width={1280} height={p.h}>
            <div style={{ width: 1280, transformOrigin: 'top left' }}>
              {p.node}
            </div>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="ios"
        title="Application mobile iOS — COLISDIRECT"
        subtitle="iPhone — les 7 écrans principaux de l'application."
      >
        {mobileScreens.map(s => (
          <DCArtboard
            key={`ios-${s.id}`}
            id={`ios-${s.id}`}
            label={s.label}
            width={DEVICE_W_IOS}
            height={DEVICE_H_IOS}
          >
            <IOSDevice width={DEVICE_W_IOS} height={DEVICE_H_IOS}>
              <s.Comp safeTop={50} />
            </IOSDevice>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="android"
        title="Application mobile Android — COLISDIRECT"
        subtitle="Material 3 — les 7 écrans principaux de l'application."
      >
        {mobileScreens.map(s => (
          <DCArtboard
            key={`and-${s.id}`}
            id={`and-${s.id}`}
            label={s.label}
            width={DEVICE_W_AND}
            height={DEVICE_H_AND}
          >
            <AndroidDevice width={DEVICE_W_AND} height={DEVICE_H_AND}>
              <s.Comp safeTop={0} />
            </AndroidDevice>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="pay-ios"
        title="Paiement iOS — COLISDIRECT"
        subtitle="iPhone — parcours de paiement : mode de paiement, Mobile Money, carte bancaire, confirmation."
      >
        {paymentScreens.map(s => (
          <DCArtboard
            key={`pios-${s.id}`}
            id={`pios-${s.id}`}
            label={s.label}
            width={DEVICE_W_IOS}
            height={DEVICE_H_IOS}
          >
            <IOSDevice width={DEVICE_W_IOS} height={DEVICE_H_IOS}>
              <s.Comp safeTop={50} />
            </IOSDevice>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="pay-android"
        title="Paiement Android — COLISDIRECT"
        subtitle="Material 3 — parcours de paiement complet."
      >
        {paymentScreens.map(s => (
          <DCArtboard
            key={`pand-${s.id}`}
            id={`pand-${s.id}`}
            label={s.label}
            width={DEVICE_W_AND}
            height={DEVICE_H_AND}
          >
            <AndroidDevice width={DEVICE_W_AND} height={DEVICE_H_AND}>
              <s.Comp safeTop={0} />
            </AndroidDevice>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="courier-ios"
        title="Application Livreur iOS — COLISDIRECT"
        subtitle="iPhone — les 8 écrans de l'app livreur agréé : tableau de bord, courses, navigation, gains, profil."
      >
        {courierScreens.map(s => (
          <DCArtboard
            key={`cios-${s.id}`}
            id={`cios-${s.id}`}
            label={s.label}
            width={DEVICE_W_IOS}
            height={DEVICE_H_IOS}
          >
            <IOSDevice width={DEVICE_W_IOS} height={DEVICE_H_IOS}>
              <s.Comp safeTop={50} />
            </IOSDevice>
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="courier-android"
        title="Application Livreur Android — COLISDIRECT"
        subtitle="Material 3 — les 8 écrans de l'app livreur agréé."
      >
        {courierScreens.map(s => (
          <DCArtboard
            key={`cand-${s.id}`}
            id={`cand-${s.id}`}
            label={s.label}
            width={DEVICE_W_AND}
            height={DEVICE_H_AND}
          >
            <AndroidDevice width={DEVICE_W_AND} height={DEVICE_H_AND}>
              <s.Comp safeTop={0} />
            </AndroidDevice>
          </DCArtboard>
        ))}
      </DCSection>
    </DesignCanvas>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
