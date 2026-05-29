import { useState, useEffect } from 'react';
import { MapPin, Store, ChevronLeft, Truck } from 'lucide-react';
import { api, type RelayPoint } from '../../lib/api';
import type { ShipmentFormData } from '../../pages/CreateShipmentPage';

interface RelaySelectionProps {
  formData: ShipmentFormData;
  /** Renvoie (deliveryRelayId, originRelayId = toujours null — sera set à la réception) */
  onComplete: (deliveryId: string, originId: string | null) => void;
  onBack: () => void;
  initialDeliveryId?: string | null;
  initialPickupId?: string | null;
}

function RelaySelection({ formData, onComplete, onBack, initialDeliveryId }: RelaySelectionProps) {
  const [deliveryRelays, setDeliveryRelays] = useState<RelayPoint[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(() => initialDeliveryId ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelayPoints();
  }, []);

  useEffect(() => {
    if (initialDeliveryId) setSelectedDelivery(initialDeliveryId);
  }, [initialDeliveryId]);

  const loadRelayPoints = async () => {
    setLoading(true);
    try {
      const isOtherDestCommune = !formData.recipient_commune || formData.recipient_commune === 'Autre';
      const { data: deliveryData, error: deliveryError } = await api.getRelayPoints({
        commune: isOtherDestCommune ? undefined : formData.recipient_commune,
        is_active: true,
      });
      if (deliveryError) throw new Error(deliveryError);
      setDeliveryRelays(deliveryData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des points relais:', error);
      alert('Erreur lors du chargement des points relais');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedDelivery) {
      alert('Veuillez sélectionner un point relais de livraison pour votre destinataire');
      return;
    }
    // origin_relay_id = null — sera défini quand un relais réceptionne le colis physiquement
    onComplete(selectedDelivery, null);
  };

  const RelayCard = ({ relay, isSelected, onSelect }: { relay: RelayPoint; isSelected: boolean; onSelect: () => void }) => (
    <div
      onClick={onSelect}
      className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${
        isSelected ? 'border-[#FF6C00] bg-orange-50' : 'border-[#E6E6E6]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-bold text-[#1A1A1A] flex items-center">
            <Store className="w-4 h-4 mr-2 text-[#FF6C00]" />
            {relay.name}
          </h4>
          <p className="text-sm text-[#6B7280] mt-1">
            <MapPin className="w-3 h-3 inline mr-1" />
            {relay.quartier}, {relay.commune}
          </p>
          <p className="text-sm text-[#6B7280] mt-1">{relay.address}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-[#6B7280]">
            <span className="bg-[#F6F7F9] px-2 py-1 rounded">
              {relay.type === 'cybercafe' ? 'Cybercafé' : relay.type === 'imprimerie' ? 'Imprimerie' : 'Supérette'}
            </span>
            <span>📞 {relay.phone}</span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">Horaires: {relay.hours}</p>
        </div>
        <input
          type="radio"
          checked={isSelected}
          onChange={onSelect}
          className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00]"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6C00] mx-auto"></div>
        <p className="mt-4 text-[#6B7280]">Chargement des points relais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] mb-2">
          {formData.home_delivery
            ? 'Sélection du point relais de transit'
            : 'Sélection du point relais de livraison'}
        </h2>
        <p className="text-[#6B7280]">
          {formData.home_delivery
            ? 'Choisissez le point relais de transit le plus proche du destinataire. Votre colis sera livré à domicile depuis ce point.'
            : 'Choisissez le point relais le plus proche du destinataire où il viendra retirer son colis. Vous pouvez déposer votre colis dans n\'importe quel point relais ColisDirect (sauf celui-ci).'}
        </p>
      </div>

      {/* Bandeau informatif dépôt libre */}
      {formData.pickup_method === 'relay_deposit' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Store className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Dépôt libre dans tout le réseau</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Déposez votre colis dans un point relais ColisDirect. Votre colis sera pris en charge.
            </p>
          </div>
        </div>
      )}

      {/* Bandeau informatif ramassage à domicile */}
      {formData.pickup_method === 'home_pickup' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <Truck className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Ramassage à domicile</p>
            <p className="text-sm text-orange-700 mt-0.5">
              Un transporteur viendra récupérer votre colis à l'adresse de l'expéditeur. Aucun dépôt en relais requis.
            </p>
          </div>
        </div>
      )}

      {/* Section relais de DESTINATION (livraison) — seule sélection requise */}
      <div>
        <h3 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-[#FF6C00]" />
          {formData.home_delivery ? 'Point relais de transit' : 'Point relais de livraison'}
          <span className="ml-2 text-sm font-normal text-[#6B7280]">(commune destinataire : {formData.recipient_commune || 'non précisée'})</span>
        </h3>
        <p className="text-sm text-[#6B7280] mb-4">
          {deliveryRelays.length} point(s) relais disponible(s)
        </p>
        {deliveryRelays.length === 0 ? (
          <div className="text-center py-12 bg-[#F6F7F9] rounded-xl border-2 border-dashed border-[#E6E6E6]">
            <MapPin className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
            <p className="text-[#6B7280] font-medium">Aucun point relais disponible dans cette commune</p>
            <p className="text-sm text-[#6B7280] mt-2">Veuillez vérifier la commune du destinataire</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {deliveryRelays.map(relay => (
              <RelayCard
                key={relay.id}
                relay={relay}
                isSelected={selectedDelivery === relay.id}
                onSelect={() => setSelectedDelivery(relay.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-[#3A3A3A] hover:text-[#FF6C00] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedDelivery}
          className="px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer vers le paiement
        </button>
      </div>
    </div>
  );
}

export default RelaySelection;
