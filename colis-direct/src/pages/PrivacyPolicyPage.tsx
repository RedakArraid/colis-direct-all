import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigate: (page: string) => void;
}

function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
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
            Politique de Confidentialité
          </h1>
          <p className="text-white/80 mt-3 text-base">COLISDIRECT — Dernière mise à jour : 2025</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">1. Données collectées</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-2">
              COLISDIRECT collecte : nom, prénom, email, téléphone, adresses, géolocalisation des
              transporteurs, historique de livraisons et informations de paiement (non stockées directement).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">2. Utilisation des données</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les données sont utilisées pour la gestion des envois, la facturation, le suivi, la prévention de
              fraude et l'amélioration du service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">3. Services externes</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Google Maps, Firebase, hébergement (à préciser), API WhatsApp ou SMS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">4. Durée de conservation</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Données conservées 3 ans.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">5. Droits des utilisateurs</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Tout utilisateur peut demander suppression, rectification ou anonymisation de ses données.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">6. Responsable des données</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Le responsable des données de COLISDIRECT peut être contacté via
              contact.colisdirect@gmail.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">7. Sécurité</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Des mesures de protection sont appliquées contre l'accès non autorisé, la perte ou la divulgation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">8. Droit applicable</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Cette politique est soumise au droit ivoirien.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
