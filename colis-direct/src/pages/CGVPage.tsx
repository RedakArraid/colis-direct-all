import { ArrowLeft } from 'lucide-react';

interface CGVPageProps {
  onNavigate: (page: string) => void;
}

function CGVPage({ onNavigate }: CGVPageProps) {
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
            Conditions Générales de Vente
          </h1>
          <p className="text-white/80 mt-3 text-base">COLISDIRECT — Dernière mise à jour : 2025</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">1. Objet</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les présentes CGV régissent les prestations de livraison proposées par COLISDIRECT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">2. Modes de livraison</h2>
            <ul className="list-disc list-inside text-[#3A3A3A] space-y-2">
              <li>Domicile vers domicile</li>
              <li>Domicile vers point relais</li>
              <li>Point relais vers domicile</li>
              <li>Point relais vers point relais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">3. Tarifs</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les tarifs sont disponibles sur le site et l'application. Ils varient selon la taille du colis, le mode de
              livraison et les options.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">4. Délais indicatifs</h2>
            <ul className="list-disc list-inside text-[#3A3A3A] space-y-2">
              <li>Livraison à domicile : 24h maximum</li>
              <li>Livraison en point relais : 48h maximum</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">5. Colis interdits</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Armes, produits dangereux, substances illicites, argent liquide.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">6. Refus de colis</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              COLISDIRECT peut refuser un colis en cas d'emballage non conforme ou de poids supérieur à
              celui déclaré.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">7. Responsabilité</h2>
            <ul className="list-disc list-inside text-[#3A3A3A] space-y-2">
              <li>Sans assurance : remboursement jusqu'à 25 % de la valeur déclarée.</li>
              <li>Avec assurance : remboursement jusqu'à 100 % de la valeur déclarée.</li>
              <li>Les dommages liés à un emballage inadéquat ne sont pas remboursés.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">8. Retard</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Un retard supérieur à 5 jours ouvrés peut ouvrir droit à un remboursement après enquête.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">9. Réclamations</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Délai de 7 jours pour déposer une réclamation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">10. Paiements acceptés</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Mobile Money, paiement au transporteur, au relais, ou en ligne.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">11. Droit applicable</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les CGV sont soumises au droit ivoirien.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CGVPage;
