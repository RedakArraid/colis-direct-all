import { ArrowLeft } from 'lucide-react';

interface LegalNoticePageProps {
  onNavigate: (page: string) => void;
}

function LegalNoticePage({ onNavigate }: LegalNoticePageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Orange gradient hero */}
      <section className="bg-gradient-to-br from-[#FF6C00] to-[#FF8C33] text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </button>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Mentions Légales
          </h1>
          <p className="text-white/80 mt-3 text-base">COLISDIRECT – SAS — Dernière mise à jour : 2025</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">1. Informations sur l'Éditeur du Site</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-2">Le présent site est édité par :</p>
            <p className="text-[#3A3A3A] leading-relaxed mb-2"><strong>COLISDIRECT – SAS</strong></p>
            <p className="text-[#3A3A3A] leading-relaxed">Siège social : Bouaké, Belle-ville 2, 01 BP 11 Bouaké 01, Côte d'Ivoire</p>
            <p className="text-[#3A3A3A] leading-relaxed">Email : contact.colisdirect@gmail.com</p>
            <p className="text-[#3A3A3A] leading-relaxed">Téléphone : +225 XX XX XX XX XX</p>
            <p className="text-[#3A3A3A] leading-relaxed">RCCM : En attente d'attribution</p>
            <p className="text-[#3A3A3A] leading-relaxed">NIF : En attente d'attribution</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">2. Directeur de la publication</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Le directeur de la publication est le représentant légal de COLISDIRECT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">3. Hébergement</h2>
            <p className="text-[#3A3A3A] leading-relaxed">Le site est hébergé par : Contabo GmbH, Munich, Allemagne.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">4. Propriété intellectuelle</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              L'ensemble des éléments du site COLISDIRECT, incluant notamment textes, images, logo,
              graphismes, vidéos, icônes, structure, interface utilisateur et base de données, est protégé par le
              droit de la propriété intellectuelle.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed mt-2">
              Toute reproduction, modification, distribution ou représentation, totale ou partielle, sans autorisation
              écrite est interdite.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">5. Description du service</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-2">COLISDIRECT est une plateforme permettant :</p>
            <ul className="list-disc list-inside text-[#3A3A3A] space-y-2">
              <li>la création d'envois de colis,</li>
              <li>le paiement de prestations de livraison,</li>
              <li>le suivi des livraisons,</li>
              <li>l'accès dédié aux transporteurs et aux points relais,</li>
              <li>la gestion administrative et logistique des envois.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">6. Données personnelles</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              COLISDIRECT collecte et traite des données personnelles conformément aux lois ivoiriennes en
              vigueur.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed mt-2">
              Les utilisateurs disposent d'un droit d'accès, de rectification et de suppression de leurs données.
              Toute demande doit être adressée à : contact.colisdirect@gmail.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">7. Responsabilité</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-2">
              COLISDIRECT s'efforce de fournir des informations exactes mais ne saurait être tenue
              responsable :
            </p>
            <ul className="list-disc list-inside text-[#3A3A3A] space-y-2">
              <li>d'erreurs éventuelles,</li>
              <li>de pannes techniques,</li>
              <li>d'interruptions du service,</li>
              <li>d'un usage non conforme du site par l'utilisateur.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">8. Liens externes</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Le site peut contenir des liens vers des sites tiers. COLISDIRECT décline toute responsabilité
              concernant leur contenu, leur sécurité ou leur politique de confidentialité.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">9. Cookies</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Le site peut utiliser des cookies afin d'améliorer l'expérience utilisateur, analyser la navigation et
              sécuriser les sessions.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed mt-2">
              L'utilisateur peut configurer son navigateur pour refuser les cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">10. Droit applicable</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les présentes mentions légales sont régies par le droit ivoirien. Tout litige sera porté devant les
              juridictions compétentes du ressort du siège social de COLISDIRECT.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default LegalNoticePage;
