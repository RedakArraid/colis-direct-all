import { useState } from 'react';
import {
  Shield, MapPin, Users, CheckCircle,
  Clipboard, Calendar, Package, Truck, Pin, Home,
  Search, Zap,
  ChevronRight, Box,
} from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

/* ── tiny sub-components ── */
const TrustFeature = ({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) => (
  <div className="flex gap-4 items-start">
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-xl"
      style={{ width: 44, height: 44, background: '#FFF3E8' }}
    >
      <Icon className="w-5 h-5 text-[#FF6C00]" />
    </div>
    <div>
      <div className="font-extrabold text-sm text-[#1A1A1A]">{title}</div>
      <div className="text-xs text-[#6B7280] mt-1 leading-relaxed">{desc}</div>
    </div>
  </div>
);

const StatBadge = ({
  icon: Icon,
  number,
  label,
}: {
  icon: React.ElementType;
  number: string;
  label: string;
}) => (
  <div className="flex items-center gap-3">
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-full"
      style={{ width: 38, height: 38, background: '#FFF3E8' }}
    >
      <Icon className="w-5 h-5 text-[#FF6C00]" />
    </div>
    <div>
      <div className="text-xl font-extrabold text-[#1A1A1A] leading-none">{number}</div>
      <div className="text-xs text-[#6B7280] mt-0.5">{label}</div>
    </div>
  </div>
);

const HowStep = ({
  num,
  icon: Icon,
  label,
  isLast: _isLast,
}: {
  num: number;
  icon: React.ElementType;
  label: string;
  isLast: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    {/* Number badge */}
    <div
      className="flex items-center justify-center font-extrabold text-base text-white z-10"
      style={{
        width: 44, height: 44, borderRadius: '50%',
        background: '#FF6C00', border: '4px solid #fff',
        boxShadow: '0 0 0 1px #FF6C00',
      }}
    >
      {num}
    </div>
    {/* Icon card */}
    <div
      className="flex items-center justify-center border border-[#E6E6E6] bg-white"
      style={{ width: 56, height: 56, borderRadius: 12 }}
    >
      <Icon className="w-6 h-6 text-[#FF6C00]" />
    </div>
    <div className="text-[11px] font-semibold text-center text-[#3A3A3A] leading-snug" style={{ maxWidth: 90 }}>
      {label}
    </div>
  </div>
);

export default function HomePage({ onNavigate }: HomePageProps) {
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      localStorage.setItem('trackingNumber', trackingNumber.trim());
      onNavigate('tracking');
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-10" style={{ position: 'relative' }}>
        <div
          className="my-6 min-h-[420px] sm:min-h-[500px] lg:min-h-[560px]"
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            background: '#fff',
            position: 'relative',
          }}
        >
          {/* Background truck image */}
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: "url('/camion.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              backgroundRepeat: 'no-repeat',
            }}
          />
          {/* White gradient overlay */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.88) 30%, rgba(255,255,255,0.35) 55%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0) 80%)',
            }}
          />

          {/* Content grid: text+buttons | spacer (camion) */}
          <div
            className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8 items-center p-6 sm:p-10 lg:px-14 lg:py-16"
            style={{ position: 'relative', zIndex: 2 }}
          >
            {/* Left — headline + buttons */}
            <div>
              <h1
                style={{
                  fontSize: 'clamp(30px, 6vw, 54px)', fontWeight: 800, lineHeight: 1.05,
                  margin: 0, letterSpacing: -1, color: '#1A1A1A',
                }}
              >
                Envoyez et recevez vos colis{' '}
                <span style={{ color: '#FF6C00' }}>en toute sécurité</span>
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
                <button
                  onClick={() => onNavigate('create-shipment')}
                  className="btn-primary"
                  style={{ padding: '14px 26px', borderRadius: 10, fontWeight: 700, fontSize: 15 }}
                >
                  Envoyer un colis
                </button>
                <button
                  onClick={() => onNavigate('map')}
                  className="btn-outline"
                  style={{ padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <MapPin className="w-4 h-4" />
                  Trouver un point relais
                </button>
              </div>
            </div>

            {/* Spacer — camion visible à droite (desktop) */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-10">
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 p-5 sm:p-6"
          style={{
            background: '#fff',
            border: '1px solid #E6E6E6',
            borderRadius: 18,
            marginTop: -10,
          }}
        >
          <TrustFeature
            icon={Shield}
            title="Livraison sécurisée"
            desc="Vos colis sont protégés à chaque étape."
          />
          <TrustFeature
            icon={MapPin}
            title="Réseau de points relais"
            desc="Déposez et retirez vos colis près de chez vous."
          />
          <TrustFeature
            icon={Users}
            title="Livreurs agréés"
            desc="Des livreurs fiables pour un service rapide."
          />
          <TrustFeature
            icon={CheckCircle}
            title="Suivi en temps réel"
            desc="Suivez votre colis à chaque étape de la livraison."
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          POURQUOI + COMMENT ÇA MARCHE + PARTNER CTA
      ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-10 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7">
        {/* Left — Pourquoi + Comment ça marche */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E6E6E6',
            borderRadius: 22,
            padding: 32,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, textAlign: 'center', color: '#1A1A1A' }}>
            Pourquoi choisir COLISDIRECT ?
          </h2>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-7">
            <StatBadge icon={MapPin}  number="+500"    label="Points relais" />
            <StatBadge icon={Users}   number="+1000"   label="Livreurs agréés" />
            <StatBadge icon={Box}     number="+50 000" label="Colis livrés" />
            <StatBadge icon={Shield}  number="24/7"    label="Support client" />
          </div>

          {/* How it works */}
          <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 36, marginBottom: 18, textAlign: 'center', color: '#1A1A1A' }}>
            Comment ça marche ?
          </h3>
          <div style={{ position: 'relative' }}>
            {/* Dashed orange line (desktop only) */}
            <div
              className="hidden lg:block"
              style={{
                position: 'absolute', top: 22, left: 28, right: 28, height: 2,
                background: 'repeating-linear-gradient(to right, #FF6C00 0 6px, transparent 6px 12px)',
              }}
            />
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-y-5" style={{ position: 'relative' }}>
              {[
                { num: 1, icon: Clipboard,   label: 'Créez votre envoi', isLast: false },
                { num: 2, icon: Calendar,    label: 'Choisissez le type', isLast: false },
                { num: 3, icon: Package,     label: 'Déposez le colis', isLast: false },
                { num: 4, icon: Truck,       label: 'Livreur agréé', isLast: false },
                { num: 5, icon: Pin,         label: 'Suivi en temps réel', isLast: false },
                { num: 6, icon: CheckCircle, label: 'Livré en sécurité', isLast: true },
              ].map((s) => (
                <HowStep key={s.num} {...s} />
              ))}
            </div>
          </div>
        </div>

        {/* Right — Partner CTA dark card */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 items-center p-6 sm:p-8"
          style={{
            background: '#0f0f0f',
            color: '#fff',
            borderRadius: 22,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FF6C00', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Devenez partenaire
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.15 }}>
              Rejoignez notre réseau de partenaires
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 14, lineHeight: 1.55 }}>
              Devenez livreur agréé ou point relais et développez votre activité avec COLISDIRECT.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => onNavigate('become-transporter')}
                style={{
                  background: '#FF6C00', color: '#fff', border: 'none',
                  padding: '14px 18px', borderRadius: 10, fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Devenir livreur agréé
              </button>
              <button
                onClick={() => onNavigate('become-relay')}
                style={{
                  background: 'transparent', color: '#fff',
                  border: '2px solid #fff',
                  padding: '12px 20px', borderRadius: 10, fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Devenir point relais
              </button>
            </div>
          </div>
          {/* Partenaires image */}
          <div style={{ borderRadius: 16, overflow: 'hidden', height: 220 }}>
            <img
              src="/partenaires.png"
              alt="Partenaires COLISDIRECT"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          MODES DE LIVRAISON
      ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-10 pt-5" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          {/* Home delivery */}
          <div
            style={{
              border: '2px solid #F5B400',
              borderRadius: 22, padding: 28, background: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: 18, flexShrink: 0,
                  background: 'linear-gradient(135deg, #FFB020, #FF8A00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 18px rgba(245,180,0,0.35)',
                }}
              >
                <Home className="w-8 h-8 text-white" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4, color: '#1A1A1A' }}>
                  Livraison à domicile
                </div>
                <div style={{ fontSize: 15, color: '#6B7280', marginTop: 2 }}>Service de livraison à domicile</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
              <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#16A34A' }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A' }}>Livré le jour même</span>
            </div>
            <p style={{ fontSize: 15, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
              Votre colis livré directement à votre domicile le jour même
            </p>
            <div
              style={{
                marginTop: 18, background: '#FEF8E7',
                borderLeft: '4px solid #F5B400',
                borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#F5B400' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3A3A3A' }}>
                Service rapide et pratique pour vos envois urgents
              </span>
            </div>
          </div>

          {/* Relay delivery */}
          <div
            style={{
              border: '2px solid #5B9BFF',
              borderRadius: 22, padding: 28, background: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: 18, flexShrink: 0,
                  background: 'linear-gradient(135deg, #4F8DF7, #2F6BE0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 18px rgba(91,155,255,0.35)',
                }}
              >
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4, color: '#1A1A1A' }}>
                  Livraison en point relais
                </div>
                <div style={{ fontSize: 15, color: '#6B7280', marginTop: 2 }}>Service en point relais</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
              <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#2F6BE0' }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A' }}>Livré le lendemain</span>
            </div>
            <p style={{ fontSize: 15, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
              Votre colis disponible dans un point relais proche de chez vous
            </p>
            <div
              style={{
                marginTop: 18, background: '#EEF4FF',
                borderLeft: '4px solid #5B9BFF',
                borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <Box className="w-4 h-4 flex-shrink-0" style={{ color: '#5B9BFF' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3A3A3A' }}>
                Service fiable et économique pour tous vos envois
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TARIFS + SUIVI RAPIDE
      ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-10 pt-12 sm:pt-16 pb-6" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, margin: 0, letterSpacing: -1, color: '#1A1A1A' }}>
          Des tarifs simples et accessibles
        </h2>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 14, color: '#1A1A1A' }}>
          À partir de <span style={{ color: '#FF6C00' }}>600 FCFA</span> seulement !
        </div>

        <div
          style={{
            margin: '36px auto 0', maxWidth: 460,
            background: '#F6F7F9', border: '1px solid #E6E6E6',
            borderRadius: 18, padding: 28, textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14, color: '#1A1A1A' }}>
            Entrez votre numéro de suivi
          </div>
          <form onSubmit={handleTrack} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Ex : CD123456789CI"
              style={{
                background: '#fff', border: '1px solid #E6E6E6',
                borderRadius: 10, padding: '14px 16px', fontSize: 15,
                color: '#1A1A1A', outline: 'none', fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#000', color: '#fff', border: 'none',
                padding: '14px 26px', borderRadius: 10, fontWeight: 700,
                fontSize: 15, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Search className="w-4 h-4" />
              Suivre mon colis
            </button>
          </form>
        </div>

        <div className="mt-8">
          <button
            onClick={() => onNavigate('pricing')}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#FF6C00] hover:text-[#E66100] transition-colors"
          >
            Voir tous les tarifs <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

