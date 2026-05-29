import { ArrowLeft } from 'lucide-react';

interface CGUPageProps {
  onNavigate: (page: string) => void;
}

function CGUPage({ onNavigate }: CGUPageProps) {
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
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-white/80 mt-3 text-base">COLISDIRECT – SAS — Dernière mise à jour : 2025</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">1. Objet</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) encadrent l'accès et l'utilisation de la
              plateforme COLISDIRECT, incluant le site web et l'application mobile. Toute utilisation implique
              l'acceptation sans réserve des présentes CGU.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">2. Présentation de l'entreprise</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-2">
              <strong>COLISDIRECT – SAS</strong>
            </p>
            <p className="text-[#3A3A3A] leading-relaxed">
              Siège social : Bouaké, Belle-ville 2, 01 BP 11 Bouaké 01, Côte d'Ivoire
            </p>
            <p className="text-[#3A3A3A] leading-relaxed">
              Email contact : contact.colisdirect@gmail.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">3. Services proposés</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-2">La plateforme permet :</p>
            <ul className="list-disc list-inside text-[#3A3A3A] space-y-2">
              <li>Création d'envois</li>
              <li>Paiement</li>
              <li>Suivi de colis</li>
              <li>Accès transporteur</li>
              <li>Accès point relais</li>
              <li>Accès support client</li>
              <li>Accès administrateur</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">4. Conditions d'accès</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              L'accès nécessite un compte utilisateur et des identifiants valides. L'utilisateur s'engage à fournir
              des informations exactes et à ne pas utiliser la plateforme de manière frauduleuse.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">5. Obligations des points relais</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les points relais doivent respecter les horaires, manipuler les colis avec soin, imprimer et coller les
              bordereaux, vérifier les codes de retrait et mettre à jour les statuts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">6. Obligations des transporteurs</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les transporteurs doivent respecter leur tournée, assurer la sécurité des colis, vérifier le code de
              retrait et mettre à jour les statuts de livraison.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">7. Restrictions d'utilisation</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Toute usurpation d'identité, usage illégal ou manipulation frauduleuse est strictement interdite.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">8. Propriété intellectuelle</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Le nom COLISDIRECT, son logo et son application sont protégés. Toute reproduction est interdite
              sans autorisation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">9. Responsabilité</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              COLISDIRECT n'est pas responsable en cas de mauvaise utilisation, de force majeure ou de
              données erronées fournies par l'utilisateur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">10. Suppression de compte</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              COLISDIRECT peut suspendre ou supprimer un compte en cas de non-respect des CGU.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">11. Droit applicable</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Les CGU sont soumises au droit ivoirien.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CGUPage;
