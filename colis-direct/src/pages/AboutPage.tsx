import { Users, Target, Heart, Award, Home, MapPin, CheckCircle, Zap, Package } from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';

function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-[#FF6C00] to-[#FF8C33] text-white py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">À propos de COLISDIRECT</h1>
          <p className="text-xl text-white/90 mb-2">Révolutionner la logistique urbaine en Côte d'Ivoire</p>
          <p className="text-base text-white/80">
            Livraison express à domicile le jour même • Livraison économique en point relais le lendemain
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Services de Livraison - Placée en premier pour mettre en avant */}
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8 sm:p-12 mb-12 lg:mb-20 border-2 border-orange-200 shadow-xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-6 lg:mb-8 text-[#1A1A1A] text-center">
              Nos Services de Livraison
            </h2>
            <p className="text-base sm:text-lg text-[#6B7280] text-center mb-8 lg:mb-12 max-w-3xl mx-auto">
              COLISDIRECT vous propose deux options de livraison complémentaires pour répondre à tous vos besoins : <strong>livraison express à domicile</strong> pour vos envois urgents et <strong>livraison économique en point relais</strong> pour vos envois réguliers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Livraison à domicile - Mise en avant en premier */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 sm:p-8 shadow-xl border-2 border-yellow-300 transform hover:scale-105 transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-4 shadow-lg">
                    <Home className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1A1A1A]">Livraison à Domicile</h3>
                    <p className="text-sm sm:text-base text-[#6B7280] font-medium">Service express ⚡</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-1">
                        Livré le jour même
                      </p>
                      <p className="text-sm sm:text-base text-[#6B7280]">
                        Votre colis livré directement à votre domicile le jour même par un transporteur professionnel de COLISDIRECT. Plus besoin de vous déplacer !
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <p className="text-sm sm:text-base font-bold text-[#3A3A3A]">
                        Idéal pour vos envois urgents et importants
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-yellow-300">
                    <p className="text-sm font-bold text-[#3A3A3A] mb-2">
                      <strong>Options disponibles :</strong>
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-[#6B7280] ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">✓</span>
                        <span>Ramassage à domicile par notre transporteur</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">✓</span>
                        <span>Livraison directe chez le destinataire</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">✓</span>
                        <span>Paiement en ligne ou à la livraison</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">✓</span>
                        <span>Suivi en temps réel de votre colis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">✓</span>
                        <span>Validation par code secret pour plus de sécurité</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Livraison en point relais */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8 shadow-lg border-2 border-blue-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-4 shadow-lg">
                    <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1A1A1A]">Livraison en Point Relais</h3>
                    <p className="text-sm sm:text-base text-[#6B7280]">Service économique</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-1">
                        Livré le lendemain
                      </p>
                      <p className="text-sm sm:text-base text-[#6B7280]">
                        Votre colis disponible dans un point relais proche de chez vous, au moment qui vous convient.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4 border-l-4 border-blue-400">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <p className="text-sm sm:text-base font-bold text-[#3A3A3A]">
                        Solution pratique et économique pour tous vos envois
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-blue-200">
                    <p className="text-sm text-[#6B7280]">
                      <strong>Avantages :</strong>
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-[#6B7280] ml-4">
                      <li>• Tarifs avantageux à partir de 600 FCFA</li>
                      <li>• Plus de 100 points relais à Abidjan</li>
                      <li>• Horaires d'ouverture étendus</li>
                      <li>• Retrait à votre convenance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mb-12 lg:mb-20">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-6 lg:mb-8 text-[#1A1A1A] text-center">Notre Mission</h2>
            <p className="text-base sm:text-lg lg:text-xl text-[#6B7280] leading-relaxed text-center mb-6 lg:mb-8">
              COLISDIRECT révolutionne la livraison de colis à Abidjan en proposant des services adaptés à tous vos besoins : <strong>livraison express à domicile le jour même</strong> et <strong>livraison économique en point relais le lendemain</strong>.
            </p>
            <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed text-center mb-4">
              Que vous ayez besoin d'une livraison urgente directement chez vous, ou que vous préfériez retirer votre colis à votre convenance dans un point relais proche, nous avons la solution qu'il vous faut.
            </p>
            <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed text-center">
              En transformant les commerces de proximité en points relais connectés, nous créons un réseau logistique participatif qui profite à tous : particuliers, entreprises et commerçants partenaires.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <div className="text-center">
              <div className="bg-[#FF6C00] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight mb-3 text-[#1A1A1A]">Proximité</h3>
              <p className="text-[#6B7280]">
                Livraison à domicile partout à Abidjan et un réseau dense de points relais accessibles dans tous les quartiers
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#FF6C00] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight mb-3 text-[#1A1A1A]">Fiabilité</h3>
              <p className="text-[#6B7280]">
                Traçabilité complète et sécurité garantie pour chaque colis, avec validation par code secret
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#FF6C00] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight mb-3 text-[#1A1A1A]">Inclusivité</h3>
              <p className="text-[#6B7280]">
                Des services accessibles à tous avec des tarifs abordables, de la livraison express au service économique
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#FF6C00] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight mb-3 text-[#1A1A1A]">Innovation</h3>
              <p className="text-[#6B7280]">
                Une plateforme digitale moderne au service de la communauté avec suivi en temps réel
              </p>
            </div>
          </div>

          <div className="bg-[#F6F7F9] rounded-2xl p-8 sm:p-12 mb-12 lg:mb-20">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-8 lg:mb-12 text-[#1A1A1A] text-center">Notre Vision</h2>
            <div className="max-w-3xl mx-auto space-y-6 text-center">
              <p className="text-lg text-[#3A3A3A] leading-relaxed">
                Devenir la première infrastructure logistique participative d'Afrique de l'Ouest
              </p>
              <p className="text-lg text-[#3A3A3A] leading-relaxed">
                Nous voulons démocratiser l'accès à des services de livraison professionnels tout en créant des opportunités économiques pour les commerçants locaux
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-white p-6 rounded-xl">
                  <p className="text-4xl font-bold text-[#FF6C00] mb-2">100</p>
                  <p className="text-[#3A3A3A] font-bold">Points relais en 2026</p>
                </div>
                <div className="bg-white p-6 rounded-xl">
                  <p className="text-4xl font-bold text-[#FF6C00] mb-2">300</p>
                  <p className="text-[#3A3A3A] font-bold">Points relais en 2027</p>
                </div>
                <div className="bg-white p-6 rounded-xl">
                  <p className="text-4xl font-bold text-[#FF6C00] mb-2">500+</p>
                  <p className="text-[#3A3A3A] font-bold">Extension nationale 2028</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section équipe fondatrice retirée selon la demande */}

          <div className="mt-20 text-center bg-gradient-to-br from-[#FF6C00] to-[#ff8c33] text-white rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Conçu et développé en Côte d'Ivoire</h2>
            <p className="text-xl text-white/90 mb-8">
              Une solution 100% locale pour répondre aux besoins de notre communauté
            </p>
            <p className="text-lg text-white/80">
              COLISDIRECT est fier de contribuer au développement de l'écosystème digital ivoirien
            </p>
          </div>
        </div>
      </section>
      <Footer onNavigate={(page) => {
        if (typeof window !== 'undefined' && (window as any).onNavigate) {
          (window as any).onNavigate(page);
        }
      }} />
      <Chatbot />
    </div>
  );
}

export default AboutPage;
