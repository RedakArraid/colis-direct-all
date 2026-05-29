import { ArrowLeft, Shield } from 'lucide-react';

interface InsurancePolicyPageProps {
  onNavigate: (page: string) => void;
}

function InsurancePolicyPage({ onNavigate }: InsurancePolicyPageProps) {
  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Hero orange gradient */}
      <section className="bg-gradient-to-br from-[#FF6C00] to-[#FF8C33] text-white py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-8">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 rounded-full p-3">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Politique Assurance &amp; Remboursement
              </h1>
              <p className="text-white/80 mt-1 text-base">
                Protection de vos envois sur ColisDirect
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-8 md:p-12 space-y-8">

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">1. Objet</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                La présente politique définit les règles appliquées en cas de perte, dommage ou retard.
              </p>
            </section>

            <div className="border-t border-[#F0F0F0]" />

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">2. Sans assurance</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                Remboursement jusqu'à 25 % de la valeur déclarée après enquête.
              </p>
            </section>

            <div className="border-t border-[#F0F0F0]" />

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">3. Avec assurance complète</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                Remboursement jusqu'à 100 % de la valeur déclarée après enquête.
              </p>
            </section>

            <div className="border-t border-[#F0F0F0]" />

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">4. Exclusions</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                Non remboursé : dommage dû à un emballage non conforme ou insuffisant.
              </p>
            </section>

            <div className="border-t border-[#F0F0F0]" />

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">5. Dommages acceptés</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                Perte, casse due au transport, retard supérieur à 5 jours ouvrés (selon enquête).
              </p>
            </section>

            <div className="border-t border-[#F0F0F0]" />

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">6. Réclamations</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                Délai : 7 jours à compter de la date prévue de livraison.
              </p>
            </section>

            <div className="border-t border-[#F0F0F0]" />

            <section>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">7. Modes de remboursement</h2>
              <p className="text-[#3A3A3A] leading-relaxed">
                Mobile Money ou virement bancaire.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export default InsurancePolicyPage;
