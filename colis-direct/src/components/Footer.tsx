import Logo from './Logo';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const NavCol = ({
    title,
    items,
  }: {
    title: string;
    items: { label: string; page?: string; href?: string }[];
  }) => (
    <div>
      <div className="text-sm font-extrabold mb-3 text-white">{title}</div>
      <div className="flex flex-col gap-2">
        {items.map((i) =>
          i.href ? (
            <a
              key={i.label}
              href={i.href}
              className="text-sm hover:text-[#FF6C00] transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              {i.label}
            </a>
          ) : (
            <button
              key={i.label}
              onClick={() => onNavigate?.(i.page!)}
              className="text-sm text-left hover:text-[#FF6C00] transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              {i.label}
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <footer style={{ background: '#0f0f0f', color: '#fff', padding: '40px 40px 24px' }}>
      <div className="grid gap-8" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr' }}>
        {/* Brand */}
        <div>
          <Logo size="sm" showText className="text-white mb-4" />
          <p className="text-sm leading-relaxed mt-3" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 280 }}>
            La plateforme logistique qui connecte particuliers, points relais et livreurs agréés partout en Côte d'Ivoire.
          </p>
        </div>

        <NavCol
          title="Services"
          items={[
            { label: 'Envoyer un colis',   page: 'create-shipment' },
            { label: 'Suivi de colis',      page: 'tracking' },
            { label: 'Points relais',       page: 'map' },
            { label: 'Tarifs',              page: 'pricing' },
            { label: 'Assurance',           page: 'how-it-works' },
          ]}
        />

        <NavCol
          title="Entreprise"
          items={[
            { label: 'À propos',  page: 'about' },
            { label: 'Carrière',  page: 'career' },
            { label: 'Presse',    href: '#' },
            { label: 'Blog',      href: '#' },
            { label: 'Contact',   href: 'mailto:contact@colisdirect.ci' },
          ]}
        />

        <NavCol
          title="Partenaires"
          items={[
            { label: 'Devenir livreur',      page: 'become-transporter' },
            { label: 'Devenir point relais', page: 'relay-application' },
            { label: 'Espace pro',           page: 'login' },
            { label: 'Tarifs entreprise',    page: 'pricing' },
          ]}
        />

        <NavCol
          title="Légal"
          items={[
            { label: 'CGV',                         page: 'cgv' },
            { label: 'CGU',                         page: 'cgu' },
            { label: 'Confidentialité',             page: 'privacy-policy' },
            { label: 'Mentions légales',            page: 'legal-notice' },
          ]}
        />
      </div>

      {/* Bottom bar */}
      <div
        className="flex justify-between items-center"
        style={{
          marginTop: 32,
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        <span>© 2026 COLISDIRECT. Tous droits réservés.</span>
        <span>Made with care in Abidjan, Côte d'Ivoire.</span>
      </div>
    </footer>
  );
}
