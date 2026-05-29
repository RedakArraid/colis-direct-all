import { useState, useEffect } from 'react';
import { User, Mail, Phone, Home, Package as PackageIcon, Save, ArrowLeft, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import { usePricing } from '../../hooks/usePricing';
import PhoneInput from '../PhoneInput';
import CommuneSelect from '../CommuneSelect';

interface AssistClientFormProps {
  relayId: string;
  onSuccess: (shipment: any) => void;
  onCancel: () => void;
}

function AssistClientForm({ relayId, onSuccess, onCancel }: AssistClientFormProps) {
  const { calculatePrice } = usePricing();
  const [formData, setFormData] = useState({
    sender_first_name: '',
    sender_last_name: '',
    sender_email: '',
    sender_phone: '',
    sender_commune: '',
    sender_quartier: '',
    sender_address: '',
    recipient_first_name: '',
    recipient_last_name: '',
    recipient_email: '',
    recipient_phone: '',
    recipient_commune: '',
    recipient_quartier: '',
    recipient_address: '',
    package_type: 'moyen' as 'petit' | 'moyen' | 'grand',
    weight: 1,
    is_fragile: false,
    home_delivery: false,
  });

  const [loading, setLoading] = useState(false);
  const [selectedDeliveryRelay, setSelectedDeliveryRelay] = useState<string>('');
  const [deliveryRelays, setDeliveryRelays] = useState<any[]>([]);
  const [loadingRelays, setLoadingRelays] = useState(false);
  const [assistanceFee, setAssistanceFee] = useState<number>(0);
  const [printingFee, setPrintingFee] = useState<number>(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  useEffect(() => {
    // Charger la grille tarifaire active pour récupérer assistance_fee et printing_fee
    const loadPricing = async () => {
      try {
        const { data } = await api.getActivePricingSettings();
        const setting = (data && data.length > 0) ? data[0] : null;
        if (setting) {
          setAssistanceFee(parseFloat(setting.assistance_fee?.toString?.() || '0'));
          setPrintingFee(parseFloat(setting.printing_fee?.toString?.() || '0'));
        } else {
          setAssistanceFee(500);
          setPrintingFee(100);
        }
      } catch {
        setAssistanceFee(500);
        setPrintingFee(100);
      }
    };
    loadPricing();
  }, []);

  useEffect(() => {
    const loadDeliveryRelays = async () => {
      if (!formData.recipient_commune) {
        setDeliveryRelays([]);
        setSelectedDeliveryRelay('');
        return;
      }
      
      setLoadingRelays(true);
      setSelectedDeliveryRelay('');
      try {
        const { data } = await api.getRelayPoints({
          commune: formData.recipient_commune,
          is_active: true,
        });
        // Exclure le relais courant : dépôt et livraison ne peuvent pas être identiques
        const filtered = (data || []).filter((r: any) => r.id !== relayId);
        setDeliveryRelays(filtered);
        if (filtered.length > 0) {
          setSelectedDeliveryRelay(filtered[0].id);
        }
      } catch (error) {
        console.error('Error loading delivery relays:', error);
        setDeliveryRelays([]);
      } finally {
        setLoadingRelays(false);
      }
    };

    loadDeliveryRelays();
  }, [formData.recipient_commune]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedDeliveryRelay) {
        alert('Veuillez sélectionner un point relais de destination');
        setLoading(false);
        return;
      }

      if (selectedDeliveryRelay === relayId) {
        alert('Le relais de livraison ne peut pas être le même que le relais de dépôt');
        setLoading(false);
        return;
      }

      const deliveryRelayId = selectedDeliveryRelay;

      const trackingNumber = 'CD' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 6).toUpperCase();
      const price = calculatePrice(
        formData.package_type,
        formData.weight,
        formData.sender_commune,
        formData.recipient_commune,
        formData.is_fragile,
        false,
        formData.home_delivery,
      );
      const { data: created, error } = await api.createShipment({
        tracking_number: trackingNumber,
        sender_first_name: formData.sender_first_name,
        sender_last_name: formData.sender_last_name,
        sender_email: formData.sender_email || null,
        sender_phone: formData.sender_phone,
        sender_commune: formData.sender_commune,
        sender_quartier: formData.sender_quartier,
        sender_address: formData.sender_address,
        recipient_first_name: formData.recipient_first_name,
        recipient_last_name: formData.recipient_last_name,
        recipient_email: formData.recipient_email || null,
        recipient_phone: formData.recipient_phone,
        recipient_commune: formData.recipient_commune,
        recipient_quartier: formData.recipient_quartier,
        recipient_address: formData.recipient_address,
        package_type: formData.package_type,
        weight: formData.weight,
        price,
        printing_fee: printingFee,
        assistance_fee: assistanceFee,
        current_status: 'READY_FOR_DROP_OFF',
        print_at_relay: true, // Toujours imprimé au relais pour assistance
        relay_assisted: true, // Marqué comme assisté
        home_delivery: formData.home_delivery || false,
        payment_status: 'pending',
        payment_method: 'relay_cash',
        origin_relay_id: relayId,
        destination_relay_id: deliveryRelayId,
      });

      if (error) throw new Error(error);

      // Marquer l'entrée au relais (réception au relais d'origine)
      const { error: intakeError } = await api.scanRelayIntake(trackingNumber);
      if (intakeError) {
        alert(`⚠️ Colis créé (${trackingNumber}) mais la réception automatique au relais a échoué : ${intakeError}\nVeuillez scanner le colis manuellement depuis votre tableau de bord.`);
        onSuccess(created || null);
        return;
      }

      // Récupérer le colis complet pour la suite (bordereau/facture)
      let fullShipment: any = null;
      try {
        // petite attente pour laisser le backend mettre à jour le statut
        await new Promise(r => setTimeout(r, 300));
        const { data: trackingRes } = await api.getTracking(trackingNumber);
        fullShipment = (trackingRes && (trackingRes.shipment || trackingRes)) || created || null;
      } catch {
        fullShipment = created || null;
      }

      alert(`✅ Envoi créé avec succès!\nNuméro de suivi: ${trackingNumber}\nTotal: ${(price + assistanceFee + printingFee)} FCFA`);
      onSuccess(fullShipment);
    } catch (error: any) {
      console.error('Error creating assisted shipment:', error);
      alert(`Erreur lors de la création: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1A1A1A] flex items-center gap-2">
            <User className="w-6 h-6 text-[#FF6C00]" />
            Assister un client - Créer un envoi
          </h2>
          <p className="text-sm text-[#6B7280] mt-1">
            Aide un client à créer son envoi (frais d'assistance: 500 FCFA)
          </p>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Expéditeur */}
        <div className="bg-[#F6F7F9] p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-bold text-black mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-[#FF6C00]" />
            Informations expéditeur
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Nom *</label>
              <input
                type="text"
                name="sender_last_name"
                value={formData.sender_last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Prénom *</label>
              <input
                type="text"
                name="sender_first_name"
                value={formData.sender_first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="sender_email"
                value={formData.sender_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <PhoneInput
              value={formData.sender_phone}
              onChange={(v) => setFormData((p) => ({ ...p, sender_phone: v }))}
              required
              name="sender_phone"
              label={
                <span className="text-sm font-medium text-[#3A3A3A]">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone *
                </span>
              }
            />
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Commune *</label>
              <CommuneSelect
                name="sender_commune"
                value={formData.sender_commune}
                onChange={(v) => setFormData(p => ({ ...p, sender_commune: v }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Quartier *</label>
              <input
                type="text"
                name="sender_quartier"
                value={formData.sender_quartier}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                <Home className="w-4 h-4 inline mr-1" />
                Adresse complète *
              </label>
              <textarea
                name="sender_address"
                value={formData.sender_address}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Destinataire */}
        <div className="bg-[#F6F7F9] p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-bold text-black mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-[#FF6C00]" />
            Informations destinataire
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Nom *</label>
              <input
                type="text"
                name="recipient_last_name"
                value={formData.recipient_last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Prénom *</label>
              <input
                type="text"
                name="recipient_first_name"
                value={formData.recipient_first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="recipient_email"
                value={formData.recipient_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <PhoneInput
              value={formData.recipient_phone}
              onChange={(v) => setFormData((p) => ({ ...p, recipient_phone: v }))}
              required
              name="recipient_phone"
              label={
                <span className="text-sm font-medium text-[#3A3A3A]">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone *
                </span>
              }
            />
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Commune *</label>
              <CommuneSelect
                name="recipient_commune"
                value={formData.recipient_commune}
                onChange={(v) => setFormData(p => ({ ...p, recipient_commune: v }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Quartier *</label>
              <input
                type="text"
                name="recipient_quartier"
                value={formData.recipient_quartier}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                <Home className="w-4 h-4 inline mr-1" />
                Adresse complète *
              </label>
              <textarea
                name="recipient_address"
                value={formData.recipient_address}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Colis */}
        <div className="bg-[#F6F7F9] p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-bold text-black mb-4 flex items-center">
            <PackageIcon className="w-5 h-5 mr-2 text-[#FF6C00]" />
            Détails du colis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Type de colis *</label>
              <select
                name="package_type"
                value={formData.package_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              >
                <option value="petit">Petit (documents, petits objets)</option>
                <option value="moyen">Moyen (vêtements, chaussures)</option>
                <option value="grand">Grand (marchandises volumineuses)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">Poids (kg) *</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                required
                min="0.1"
                step="0.1"
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_fragile"
                  checked={formData.is_fragile}
                  onChange={handleChange}
                  className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00] rounded"
                />
                <span className="ml-3 text-sm text-[#3A3A3A]">Colis fragile (+500 FCFA)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sélection point relais de destination */}
        {formData.recipient_commune && (
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h3 className="text-base sm:text-lg font-bold text-black mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              Point relais de destination
            </h3>
            {loadingRelays ? (
              <p className="text-[#6B7280]">Chargement des points relais...</p>
            ) : deliveryRelays.length === 0 ? (
              <p className="text-red-600">
                Aucun autre point relais disponible dans {formData.recipient_commune}.
                {' '}Le colis ne peut pas être déposé et livré au même point relais.
              </p>
            ) : (
              <div className="space-y-2">
                {deliveryRelays.map((relay) => (
                  <label
                    key={relay.id}
                    className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDeliveryRelay === relay.id
                        ? 'border-[#FF6C00] bg-orange-50'
                        : 'border-[#E6E6E6] hover:border-[#D1D5DB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryRelay"
                      checked={selectedDeliveryRelay === relay.id}
                      onChange={() => setSelectedDeliveryRelay(relay.id)}
                      className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00] mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-semibold text-black">{relay.name}</div>
                      <p className="text-sm text-[#6B7280]">{relay.quartier}, {relay.commune}</p>
                      <p className="text-xs text-[#6B7280]">{relay.address}</p>
                      <p className="text-xs text-[#6B7280]">📞 {relay.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calcul du prix */}
        <div className="bg-[#FF6C00] bg-opacity-10 border-2 border-[#FF6C00] rounded-lg p-4">
          <h3 className="text-base sm:text-lg font-bold text-black mb-3">Récapitulatif du prix</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#3A3A3A]">Prix de base:</span>
              <span className="font-medium">
                {calculatePrice(formData.package_type, formData.weight, formData.sender_commune, formData.recipient_commune, formData.is_fragile, false, formData.home_delivery)} FCFA
              </span>
            </div>
            {printingFee > 0 && (
              <div className="flex justify-between text-blue-700">
                <span className="font-medium">Impression au relais:</span>
                <span className="font-bold">+{printingFee} FCFA</span>
              </div>
            )}
            <div className="flex justify-between text-[#FF6C00]">
              <span className="font-medium">Frais d'assistance:</span>
              <span className="font-bold">+{assistanceFee} FCFA</span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-[#FF6C00] font-bold text-lg">
              <span>Total:</span>
              <span className="text-[#FF6C00]">
                {calculatePrice(formData.package_type, formData.weight, formData.sender_commune, formData.recipient_commune, formData.is_fragile, false, formData.home_delivery) + assistanceFee + printingFee} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-[#3A3A3A] hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Création...' : 'Créer l\'envoi avec assistance'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AssistClientForm;

