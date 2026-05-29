import { ArrowRight, ClipboardList, Calendar, Box, Truck, MapPin, CheckCircle, Home } from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';

interface HowItWorksPageProps {
  onNavigate: (page: string) => void;
}

const HOW_STEPS = [
  { n: 1, icon: ClipboardList, label: 'Créez votre envoi' },
  { n: 2, icon: Calendar, label: 'Choisissez le type de livraison' },
  { n: 3, icon: Box, label: 'Déposez ou faites récupérer le colis' },
  { n: 4, icon: Truck, label: 'Un livreur agréé accepte la course' },
  { n: 5, icon: MapPin, label: 'Suivi en temps réel' },
  { n: 6, icon: CheckCircle, label: 'Colis livré en toute sécurité' },
];

function HowItWorksPage({ onNavigate }: HowItWorksPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero orange gradient */}
      <section className="bg-gradient-to-br from-[#FF6C00] to-[#FF8C33] text-white py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Comment ça marche ?
          </h1>
          <p className="text-xl text-white/90">Simple, rapide et sécurisé.</p>
        </div>
      </section>

      {/* 6-step section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center text-[#1A1A1A] tracking-tight mb-12">
            6 étapes pour envoyer votre colis
          </h2>

          {/* Steps row with connector */}
          <div className="relative">
            <div
              className="absolute hidden sm:block"
              style={{
                top: 20,
                left: '4%',
                right: '4%',
                height: 2,
                background: `repeating-linear-gradient(to right, #FF6C00 0 6px, transparent 6px 12px)`,
              }}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 relative">
              {HOW_STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.n} className="flex flex-col items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-base text-white border-4 border-white shadow-md"
                      style={{ background: '#FF6C00', boxShadow: '0 0 0 1px #FF6C00' }}
                    >
                      {s.n}
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-white border border-[#E6E6E6] flex items-center justify-center shadow-sm">
                      <Icon className="w-7 h-7 text-[#FF6C00]" />
                    </div>
                    <p className="text-xs font-semibold text-center text-[#3A3A3A] leading-tight max-w-[90px]">
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2 modes de collecte */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F6F7F9]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center text-[#1A1A1A] tracking-tight mb-4">
            2 modes de collecte
          </h2>
          <p className="text-center text-[#6B7280] mb-10">
            Choisissez la méthode qui correspond le mieux à vos besoins.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mode 1 — Dépôt au relais */}
            <div className="card p-7 border-2 border-[#FF6C00]">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF6C00, #FF8C33)', boxShadow: '0 8px 18px rgba(255,108,0,0.35)' }}
                >
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-[#1A1A1A]">Dépôt au point relais</div>
                  <div className="text-sm text-[#6B7280] mt-0.5">Service économique</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-lg font-bold text-[#1A1A1A]">Livré le lendemain</span>
              </div>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                Déposez votre colis dans un point relais COLISDIRECT proche de chez vous. Nos partenaires sont des kiosques informatiques et imprimeries de quartier.
              </p>
              <div className="bg-[#FFF3E8] border-l-4 border-[#FF6C00] rounded-xl px-4 py-3 flex items-center gap-3">
                <Box className="w-4 h-4 text-[#FF6C00] flex-shrink-0" />
                <span className="text-sm font-semibold text-[#3A3A3A]">Service fiable et économique pour tous vos envois</span>
              </div>
            </div>

            {/* Mode 2 — Collecte à domicile */}
            <div className="card p-7 border-2 border-[#F5B400]">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FFB020, #FF8A00)', boxShadow: '0 8px 18px rgba(245,180,0,0.35)' }}
                >
                  <Home className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-[#1A1A1A]">Collecte à domicile</div>
                  <div className="text-sm text-[#6B7280] mt-0.5">Service express</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-lg font-bold text-[#1A1A1A]">Livré le jour même</span>
              </div>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                Un transporteur COLISDIRECT passe récupérer votre colis à votre domicile. Plus besoin de vous déplacer — idéal pour les envois urgents.
              </p>
              <div className="bg-[#FEF8E7] border-l-4 border-[#F5B400] rounded-xl px-4 py-3 flex items-center gap-3">
                <Truck className="w-4 h-4 text-[#F5B400] flex-shrink-0" />
                <span className="text-sm font-semibold text-[#3A3A3A]">Service rapide et pratique pour vos envois urgents</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 étapes visuelles avec image */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="card p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <img
                src="/depot.png"
                alt="Point relais COLISDIRECT"
                className="w-full h-auto max-w-sm mx-auto rounded-xl shadow-lg"
              />
            </div>
            <div className="space-y-7">
              {[
                {
                  n: 1,
                  title: 'Je dépose mon colis',
                  desc: 'Deux options : notre équipe ramasse votre colis à domicile, ou vous le déposez dans un point relais COLISDIRECT proche de chez vous.',
                },
                {
                  n: 2,
                  title: 'Nous le transportons',
                  desc: 'Votre colis est enregistré, sécurisé et transporté par notre réseau de livreurs agréés.',
                },
                {
                  n: 3,
                  title: 'Le destinataire le récupère',
                  desc: 'Le destinataire reçoit une notification et récupère son colis en point relais ou directement à domicile.',
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4 items-start">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-extrabold text-lg"
                    style={{ background: '#FF6C00' }}
                  >
                    {step.n}
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold text-[#1A1A1A] mb-1">{step.title}</h4>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 text-center bg-[#F6F7F9]">
        <h3 className="text-2xl font-extrabold text-[#1A1A1A] mb-6">Prêt à envoyer votre colis ?</h3>
        <button
          onClick={() => onNavigate('create-shipment')}
          className="btn-primary inline-flex items-center gap-3 px-10 py-4 text-base shadow-lg"
        >
          Envoyer mon colis
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

export default HowItWorksPage;
