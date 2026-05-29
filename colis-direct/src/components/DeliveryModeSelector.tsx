import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Tag, Clock, TrendingDown } from 'lucide-react';
import { API_URL } from '../lib/api';

export type DeliveryModeKey = 'home_to_home' | 'home_to_relay' | 'relay_to_home' | 'relay_to_relay';

interface DeliveryMode {
  key: DeliveryModeKey;
  label: string;
  emoji: string;
  pickup_method: 'home_pickup' | 'relay_deposit';
  home_delivery: boolean;
  discount_percent: number;
  delay: string;
  available: boolean;
  standard_price_fcfa: number;
  discount_amount_fcfa: number;
  final_price_fcfa: number;
  is_cheapest: boolean;
}

interface PricingData {
  sender_commune: string;
  recipient_commune: string;
  package_size: string;
  distance_km: number;
  zone_from: string | null;
  zone_to: string | null;
  tier_name: string;
  is_same_zone: boolean;
  standard_price_fcfa: number;
  modes: DeliveryMode[];
}

interface DeliveryModeSelectorProps {
  weight: number;
  senderCommune: string;
  recipientCommune: string;
  selectedMode: DeliveryModeKey | null;
  onSelect: (mode: DeliveryModeKey, price: number, pickupMethod: string, homeDelivery: boolean) => void;
  gridType?: string;
  packageSize?: string; // 'courrier' | 'petit' | 'moyen' | 'grand'
}

function DeliveryModeSelector({
  weight,
  senderCommune,
  recipientCommune,
  selectedMode,
  onSelect,
  gridType = 'courier',
  packageSize,
}: DeliveryModeSelectorProps) {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!senderCommune || !recipientCommune) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Résoudre package_size : prop explicite, ou inférer depuis gridType
    const resolvedSize = packageSize
      ?? (gridType === 'courier' ? 'courrier' : 'petit');

    const params = new URLSearchParams({
      sender_commune: senderCommune,
      recipient_commune: recipientCommune,
      package_size: resolvedSize,
      grid_type: gridType,
      weight: String(weight),
    });

    fetch(`${API_URL}/pricing-grids/calculate?${params}`, { signal: controller.signal })
      .then(async (r) => {
        const contentType = r.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!r.ok) {
          if (isJson) {
            const d = await r.json();
            throw new Error(d.error || `Erreur ${r.status}`);
          }
          throw new Error(`Erreur serveur (${r.status}) — vérifiez que les tarifs distance sont configurés.`);
        }

        if (!isJson) {
          throw new Error('Réponse invalide du serveur de tarification.');
        }

        return r.json();
      })
      .then((data) => {
        setPricing(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [weight, senderCommune, recipientCommune, gridType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-[#6B7280]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Calcul des tarifs en cours…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!pricing) return null;

  const SIZE_LABELS: Record<string, string> = {
    courrier: 'Courrier',
    petit: 'Petit colis',
    moyen: 'Colis moyen',
    grand: 'Grand colis',
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#1A1A1A]">Choisissez votre mode de livraison</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {senderCommune} → {recipientCommune} • {SIZE_LABELS[pricing.package_size] ?? pricing.package_size}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
            {pricing.distance_km === 0 ? 'Même zone' : `~${pricing.distance_km} km`}
          </span>
          <span className="text-xs text-[#9CA3AF] text-right">{pricing.tier_name}</span>
        </div>
      </div>

      {/* Alerte inter-villes (> 50 km) */}
      {pricing.distance_km > 50 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <span>ℹ️</span>
          <span>
            <strong>Inter-villes :</strong> la livraison domicile→domicile n'est pas disponible sur cette distance.
            Les modes relais bénéficient de remises supplémentaires.
          </span>
        </div>
      )}

      {/* Grille des modes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pricing.modes
          .map((mode) => {
            const isSelected = selectedMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onSelect(mode.key, mode.final_price_fcfa, mode.pickup_method, mode.home_delivery)}
                className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#FF6C00] bg-orange-50 shadow-md'
                    : 'border-[#E6E6E6] bg-white hover:border-orange-300 hover:shadow-sm'
                }`}
              >
                {/* Badges */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1A1A1A]">
                    {mode.emoji} {mode.label}
                  </span>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-[#FF6C00] flex-shrink-0" />
                  )}
                </div>

                {/* Prix */}
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-extrabold text-[#1A1A1A]">
                    {mode.final_price_fcfa.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-sm text-[#6B7280] pb-0.5">FCFA</span>
                  {mode.discount_percent > 0 && (
                    <span className="text-xs text-[#9CA3AF] line-through pb-0.5">
                      {mode.standard_price_fcfa.toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>

                {/* Délai + économies */}
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                    <Clock className="w-3 h-3" />
                    {mode.delay}
                  </span>
                  {mode.discount_percent > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <TrendingDown className="w-3 h-3" />
                      -{mode.discount_percent}% (-{mode.discount_amount_fcfa.toLocaleString('fr-FR')} FCFA)
                    </span>
                  )}
                </div>

                {/* Badge "Meilleur prix" */}
                {mode.is_cheapest && (
                  <div className="absolute -top-2.5 left-3">
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full shadow">
                      <Tag className="w-3 h-3" />
                      Meilleur prix
                    </span>
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* Résumé sélection */}
      {selectedMode && (() => {
        const m = pricing.modes.find((x) => x.key === selectedMode);
        if (!m) return null;
        return (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-[#3A3A3A]">
              <strong>Mode sélectionné :</strong> {m.emoji} {m.label}
            </span>
            <span className="text-base font-bold text-[#FF6C00]">
              {m.final_price_fcfa.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        );
      })()}
    </div>
  );
}

export default DeliveryModeSelector;
