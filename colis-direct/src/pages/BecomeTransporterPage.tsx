import { useState } from 'react';
import {
  Check, Truck, MapPin, Upload, Loader2, AlertCircle,
  Bike, Car, User, Star, Shield, Banknote
} from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import CommuneSelect from '../components/CommuneSelect';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { API_URL } from '../lib/api';

const VEHICLE_TYPES = [
  { value: 'moto', label: '🏍️ Moto', description: 'Idéal pour les livraisons rapides en ville' },
  { value: 'velo', label: '🚲 Vélo / Tricycle', description: 'Écologique, pour courtes distances' },
  { value: 'voiture', label: '🚗 Voiture', description: 'Colis volumineux et livraisons confort' },
  { value: 'camionnette', label: '🚐 Camionnette', description: 'Gros volumes et inter-régions' },
  { value: 'pied', label: '🚶 À pied / Coursier', description: 'Zones piétonnes, marchés, centres-villes' },
];

const ADVANTAGES = [
  {
    icon: Banknote,
    title: '80% du prix de la course',
    desc: 'Vous percevez 80% de chaque livraison. ColisDirect prélève 20% de commission.',
  },
  {
    icon: Star,
    title: 'Liberté totale',
    desc: "Acceptez ou refusez chaque course. Aucun engagement d'exclusivité.",
  },
  {
    icon: Shield,
    title: 'Paiement sécurisé',
    desc: 'Vos gains sont sécurisés par ColisDirect et virés sur votre Orange Money.',
  },
];

interface BecomeTransporterPageProps {
  onNavigate?: (page: string) => void;
}

function BecomeTransporterPage({ onNavigate }: BecomeTransporterPageProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    vehicle_type: '',
    license_plate: '',
    commune: '',
    quartier: '',
    address: '',
    description: '',
    preferred_zones: [] as string[],
    cgu_accepted: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.cgu_accepted) {
      setError("Vous devez accepter les conditions générales d'utilisation");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transporter-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          vehicle_type: formData.vehicle_type,
          license_plate: formData.license_plate || undefined,
          commune: formData.commune,
          quartier: formData.quartier || undefined,
          address: formData.address || undefined,
          description: formData.description || undefined,
          preferred_zones: formData.preferred_zones,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la soumission');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="card max-w-lg w-full p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-3">Candidature soumise !</h2>
          <p className="text-[#6B7280] mb-2">
            Votre dossier a été transmis à notre équipe. Nous le traiterons sous <strong>48 heures ouvrées</strong>.
          </p>
          <p className="text-sm text-[#6B7280] mb-8">
            Vous recevrez un email avec vos identifiants de connexion dès validation de votre candidature.
          </p>
          <button
            onClick={() => onNavigate ? onNavigate('home') : (window.location.href = '/#/home')}
            className="btn-primary"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Dark hero — same style as BecomeRelayPage */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-0">
        <div
          className="rounded-3xl px-8 sm:px-14 py-12 sm:py-16 text-white"
          style={{ background: '#0f0f0f' }}
        >
          <div className="max-w-2xl">
            <div className="text-sm font-bold text-[#FF6C00] uppercase tracking-widest mb-4">
              Livreur Indépendant
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
              Boostez vos revenus avec{' '}
              <span style={{ color: '#FF6C00' }}>COLISDIRECT</span>
            </h1>
            <p className="text-base text-white/70 leading-relaxed max-w-xl">
              Acceptez des courses quand vous voulez, où vous voulez. Vos gains sont crédités automatiquement après chaque livraison.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a href="#form" className="btn-primary flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Postuler maintenant
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center text-[#1A1A1A] tracking-tight mb-10">
            Pourquoi devenir livreur ColisDirect ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ADVANTAGES.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="card p-6 flex gap-4 items-start">
                  <div className="trust-icon flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#FF6C00]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] mb-1 text-sm">{item.title}</h3>
                    <p className="text-xs text-[#6B7280] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section id="form" className="py-12 px-4 sm:px-6 lg:px-8 bg-[#F6F7F9]">
        <div className="max-w-2xl mx-auto">
          <div className="card p-7 sm:p-10">
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] text-center mb-1">Formulaire de candidature</h2>
            <p className="text-center text-[#6B7280] text-sm mb-8">
              Remplissez vos informations et notre équipe vous contacte sous 48h.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identité */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#FF6C00]" />
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="input-field"
                      placeholder="Votre prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="input-field"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhoneInput
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  required
                  label={<span className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Téléphone *</span>}
                />
                <div>
                  <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>

              {/* Véhicule */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6] flex items-center gap-2">
                  <Bike className="w-4 h-4 text-[#FF6C00]" />
                  Type de véhicule *
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VEHICLE_TYPES.map((v) => (
                    <label
                      key={v.value}
                      className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.vehicle_type === v.value
                          ? 'border-[#FF6C00] bg-[#FFF3E8]'
                          : 'border-[#E6E6E6] hover:border-[#FF6C00]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vehicle_type"
                        value={v.value}
                        checked={formData.vehicle_type === v.value}
                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                        className="mt-1 text-[#FF6C00] focus:ring-[#FF6C00]"
                        required
                      />
                      <div>
                        <div className="font-semibold text-[#1A1A1A] text-sm">{v.label}</div>
                        <div className="text-xs text-[#6B7280] mt-0.5">{v.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {(formData.vehicle_type === 'moto' || formData.vehicle_type === 'voiture' || formData.vehicle_type === 'camionnette') && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Plaque d'immatriculation</label>
                    <input
                      type="text"
                      value={formData.license_plate}
                      onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                      className="input-field"
                      placeholder="Ex: 4500 AG 01"
                    />
                  </div>
                )}
              </div>

              {/* Zone d'activité */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#FF6C00]" />
                  Zone d'activité principale *
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Commune principale *</label>
                    <CommuneSelect
                      value={formData.commune}
                      onChange={(v) => setFormData({ ...formData, commune: v })}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Quartier</label>
                    <input
                      type="text"
                      value={formData.quartier}
                      onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                      className="input-field"
                      placeholder="Ex: Angré, Koumassi marché..."
                    />
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
                  Décrivez votre expérience en livraison (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Ex: J'ai 2 ans d'expérience en livraison pour une pharmacie..."
                />
              </div>

              {/* Documents info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Documents requis après validation</p>
                    <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Pièce d'identité (CNI, passeport ou permis)</li>
                      <li>Photo récente de face</li>
                      {(formData.vehicle_type === 'moto' || formData.vehicle_type === 'voiture') && (
                        <li>Photo du véhicule avec plaque visible</li>
                      )}
                    </ul>
                    <p className="text-xs text-blue-600 mt-2">
                      Notre équipe vous contactera pour les collecter après examen de votre candidature.
                    </p>
                  </div>
                </div>
              </div>

              {/* CGU */}
              <div className="p-4 bg-[#F6F7F9] rounded-xl border border-[#E6E6E6]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.cgu_accepted}
                    onChange={(e) => setFormData({ ...formData, cgu_accepted: e.target.checked })}
                    className="mt-1 w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
                    required
                  />
                  <span className="text-sm text-[#3A3A3A]">
                    J'accepte les{' '}
                    <button
                      type="button"
                      className="text-[#FF6C00] underline font-semibold"
                      onClick={() => onNavigate ? onNavigate('cgu') : window.open('/#/cgu', '_blank')}
                    >
                      Conditions générales d'utilisation
                    </button>{' '}
                    et la{' '}
                    <button
                      type="button"
                      className="text-[#FF6C00] underline font-semibold"
                      onClick={() => onNavigate ? onNavigate('privacy-policy') : window.open('/#/privacy-policy', '_blank')}
                    >
                      politique de confidentialité
                    </button>{' '}
                    de ColisDirect. Je confirme que les informations fournies sont exactes. *
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.vehicle_type || !formData.commune}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Soumission en cours...
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5" />
                    Soumettre ma candidature
                  </>
                )}
              </button>

              <p className="text-center text-xs text-[#6B7280]">
                Notre équipe examine chaque candidature sous 48h ouvrées.
              </p>
            </form>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate || ((page) => { if (typeof window !== 'undefined' && (window as any).onNavigate) { (window as any).onNavigate(page); } })} />
      <Chatbot />
    </div>
  );
}

export default BecomeTransporterPage;
