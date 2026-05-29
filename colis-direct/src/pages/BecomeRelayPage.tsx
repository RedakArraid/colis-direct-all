import { MapPin, Truck, Check, Eye, Wallet, RefreshCw, Banknote, Star, Shield } from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';

interface BecomeRelayPageProps {
  onNavigate?: (page: string) => void;
}

const RELAY_ITEMS = [
  'Commission sur chaque colis reçu ou remis',
  'Visibilité sur la carte ColisDirect',
  'Aucun matériel requis — formation incluse',
  'Activité complémentaire à votre commerce',
];

const TRANSPORTER_ITEMS = [
  '80% du prix de chaque course',
  'Courses flexibles — acceptez quand vous voulez',
  'Paiement automatique après livraison (Orange Money)',
  'Assurance incluse sur chaque livraison',
];

const RELAY_ADVANTAGES = [
  { icon: Eye,       title: 'Plus de visibilité',      desc: 'Votre boutique apparaît sur la carte ColisDirect et attire de nouveaux clients à proximité.' },
  { icon: Wallet,    title: 'Revenu supplémentaire',   desc: 'Percevez une commission pour chaque colis déposé ou retiré dans votre point relais.' },
  { icon: RefreshCw, title: 'Activité complémentaire', desc: "Rejoignez le réseau sans changer votre activité principale — ColisDirect gère le transport et le suivi." },
];

const TRANSPORTER_ADVANTAGES = [
  { icon: Banknote, title: '80% du prix de la course', desc: 'Vous percevez 80% de chaque livraison. ColisDirect prélève 20% de commission.' },
  { icon: Star,     title: 'Liberté totale',           desc: "Acceptez ou refusez chaque course. Aucun engagement d'exclusivité." },
  { icon: Shield,   title: 'Paiement sécurisé',        desc: 'Vos gains sont sécurisés par ColisDirect et virés sur votre Orange Money.' },
];

function PartnerCard({
  icon: Icon,
  tag,
  title,
  items,
  advantages,
  ctaLabel,
  onCta,
}: {
  icon: React.ElementType;
  tag: string;
  title: string;
  items: string[];
  advantages: { icon: React.ElementType; title: string; desc: string }[];
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="bg-white border border-[#E6E6E6] rounded-2xl overflow-hidden flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] transition-shadow">
      {/* Card header */}
      <div className="bg-[#0f0f0f] px-8 py-8">
        <div className="inline-flex items-center gap-2 bg-[#FF6C00]/20 text-[#FF6C00] px-3 py-1 rounded-full text-xs font-bold mb-4">
          <Icon className="w-3.5 h-3.5" />
          {tag}
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-4">{title}</h2>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
              <Check className="w-4 h-4 text-[#FF6C00] flex-shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Advantages */}
      <div className="px-8 py-6 flex flex-col gap-5 flex-1">
        {advantages.map(({ icon: AdvIcon, title: t, desc }) => (
          <div key={t} className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl bg-[#FFF3E8] flex items-center justify-center flex-shrink-0">
              <AdvIcon className="w-4 h-4 text-[#FF6C00]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1A1A]">{t}</div>
              <div className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-8 pb-8">
        <button
          onClick={onCta}
          className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
        >
          <Icon className="w-5 h-5" />
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function BecomeRelayPage({ onNavigate }: BecomeRelayPageProps) {
  const navigate = (page: string) => {
    if (onNavigate) onNavigate(page);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="px-4 sm:px-8 lg:px-10 pt-6 pb-0">
        <div className="bg-[#0f0f0f] rounded-3xl px-8 sm:px-14 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
          <div>
            <div className="text-xs font-bold text-[#FF6C00] uppercase tracking-widest mb-4">
              Devenez partenaire
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-white leading-tight tracking-tight">
              Rejoignez notre réseau de{' '}
              <span className="text-[#FF6C00]">partenaires</span>
            </h1>
            <p className="text-base sm:text-lg text-white/70 mt-5 leading-relaxed max-w-xl">
              Deux façons de rejoindre ColisDirect et générer des revenus supplémentaires avec plus de 500 partenaires en Côte d'Ivoire.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={() => navigate('relay-application')} className="btn-primary text-sm px-6 py-3.5 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Devenir point relais
              </button>
              <button onClick={() => navigate('become-transporter')} className="btn-primary text-sm px-6 py-3.5 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Devenir livreur
              </button>
            </div>
          </div>
          <img
            src="/entrepot.png"
            alt="Partenaires COLISDIRECT"
            className="w-full h-[300px] sm:h-[340px] object-cover rounded-2xl"
          />
        </div>
      </section>

      {/* Deux cartes identiques */}
      <section className="py-16 px-4 sm:px-8 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight text-center mb-3">
            Choisissez votre voie
          </h2>
          <p className="text-[#6B7280] text-center mb-10">
            Deux modèles différents, le même engagement qualité ColisDirect.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PartnerCard
              icon={MapPin}
              tag="Pour les commerçants"
              title="Point relais"
              items={RELAY_ITEMS}
              advantages={RELAY_ADVANTAGES}
              ctaLabel="Postuler — Point relais"
              onCta={() => navigate('relay-application')}
            />
            <PartnerCard
              icon={Truck}
              tag="Pour les indépendants"
              title="Livreur agréé"
              items={TRANSPORTER_ITEMS}
              advantages={TRANSPORTER_ADVANTAGES}
              ctaLabel="Postuler — Livreur agréé"
              onCta={() => navigate('become-transporter')}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-8 lg:px-10 bg-[#F6F7F9]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { n: '+500',    l: 'Points relais' },
            { n: '+1 000',  l: 'Livreurs agréés' },
            { n: '+50 000', l: 'Colis livrés' },
            { n: '24/7',    l: 'Support partenaires' },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="text-3xl font-extrabold text-[#FF6C00] tracking-tight">{n}</div>
              <div className="text-sm text-[#6B7280] mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

export default BecomeRelayPage;
