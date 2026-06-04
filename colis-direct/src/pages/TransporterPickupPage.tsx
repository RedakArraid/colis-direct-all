import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Package,
  X,
  CreditCard,
  Loader,
  Download
} from 'lucide-react';
import Logo from '../components/Logo';
import { toast } from 'react-toastify';
import { normalizePaymentStatus } from '../utils/shipmentStatus';
import { QRCodeCanvas } from 'qrcode.react';
import { useRef } from 'react';
import { downloadWaybillWithToast } from '../utils/waybillUtils';
import PhoneInput from '../components/PhoneInput';
import { normalizePhoneForApiSearch } from '../utils/phoneField';

interface PickupShipment {
  id: string;
  tracking_number: string;
  sender_first_name: string;
  sender_last_name: string;
  sender_phone: string;
  sender_address?: string;
  sender_commune?: string;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_phone: string;
  recipient_address?: string;
  recipient_commune?: string;
  payment_status?: string;
  payment_method?: string;
  current_status?: string;
  effective_status?: string;
  home_delivery?: boolean;
  pickup_code?: string;
  shipment_code?: string;
  origin_relay_id?: string | null;
  price?: number;
  pickup_method?: string;
  mobile_money_payment?: any;
  relay_cash_payment?: any;
}

type PaymentStatusIcon = 'paid' | 'cash_on_delivery' | 'pending';

function TransporterPickupPage() {
  const { user } = useAuth();
  const [senderPhone, setSenderPhone] = useState('');
  const [shipments, setShipments] = useState<PickupShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
  const [waybillShipment, setWaybillShipment] = useState<PickupShipment | null>(null);
  const [carrierCodes, setCarrierCodes] = useState<Record<string, string>>({});
  const [trackingInput, setTrackingInput] = useState('');
  const [rejectingPickupTracking, setRejectingPickupTracking] = useState<string | null>(null);
  const [rejectPickupReason, setRejectPickupReason] = useState('');
  const [paymentConfirmShipment, setPaymentConfirmShipment] = useState<PickupShipment | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Récupérer le numéro de téléphone depuis sessionStorage au chargement et charger automatiquement
  useEffect(() => {
    const storedPhone = sessionStorage.getItem('pickup_phone_search');
    if (storedPhone) {
      setSenderPhone(storedPhone);
      sessionStorage.removeItem('pickup_phone_search');
      // Effectuer la recherche automatiquement sans délai
      handleSearchWithPhone(storedPhone);
    }
  }, []);

  // Get payment status icon
  const getPaymentStatusIcon = (shipment: PickupShipment): PaymentStatusIcon => {
    const paymentStatus = normalizePaymentStatus(shipment.payment_status);
    const paymentMethod = (shipment.payment_method || '').toLowerCase();
    const isHomePickup = !shipment.origin_relay_id;

    if (paymentStatus === 'paid') {
      return 'paid';
    }

    if (paymentMethod === 'relay_cash') {
      // home_pickup: transporter collects cash from sender → must confirm before pickup
      if (isHomePickup) return 'pending';
      // relay_deposit: relay collects payment, not the transporter's action
      return 'cash_on_delivery';
    }

    return 'pending';
  };

  // Search shipments by sender phone (with phone parameter for auto-search)
  const handleSearchWithPhone = async (phone?: string) => {
    const phoneToUse = phone || senderPhone;
    if (!phoneToUse.trim()) {
      if (!phone) {
        toast.error('Veuillez entrer un numéro de téléphone');
      }
      return;
    }

    setLoading(true);
    try {
      // Normalize phone number
      const normalizedPhone = normalizePhoneForApiSearch(phoneToUse);
      
      const { data, error } = await api.getShipmentsForPickup(normalizedPhone);
      
      if (error) {
        toast.error(error);
        setShipments([]);
        return;
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        toast.info('Aucun envoi en cours trouvé pour ce numéro de téléphone');
        setShipments([]);
        return;
      }
      
      setShipments(data);
      setCarrierCodes(Object.fromEntries(data.map((s: PickupShipment) => [s.tracking_number, s.shipment_code || ''])));
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Erreur lors de la recherche');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Search shipments by sender phone (wrapper for button click)
  const handleSearch = async () => {
    await handleSearchWithPhone();
  };

  // Search by tracking number
  const handleSearchByTracking = async () => {
    if (!trackingInput.trim()) {
      toast.error('Veuillez entrer un numéro de suivi');
      return;
    }

    setLoading(true);
    try {
      const trackingNum = trackingInput.trim();
      
      // Utiliser l'endpoint dédié pour la recherche par tracking number (inclut les colis avec home_pickup)
      const { data: shipment, error: shipmentError } = await api.getShipmentForPickup(trackingNum);
      
      if (shipmentError) {
        toast.error(shipmentError);
        setShipments([]);
        return;
      }
      
      if (shipment) {
        const formattedShipment: PickupShipment = {
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          sender_first_name: shipment.sender_first_name || '',
          sender_last_name: shipment.sender_last_name || '',
          sender_phone: shipment.sender_phone || '',
          recipient_first_name: shipment.recipient_first_name || '',
          recipient_last_name: shipment.recipient_last_name || '',
          recipient_phone: shipment.recipient_phone || '',
          recipient_address: shipment.recipient_address,
          recipient_commune: shipment.recipient_commune,
          payment_status: shipment.payment_status,
          payment_method: shipment.payment_method,
          current_status: shipment.current_status,
          effective_status: shipment.effective_status,
          home_delivery: shipment.home_delivery,
          pickup_code: shipment.pickup_code,
          shipment_code: shipment.shipment_code,
          origin_relay_id: shipment.origin_relay_id,
          price: shipment.price,
          pickup_method: shipment.pickup_method,
          mobile_money_payment: shipment.mobile_money_payment,
          relay_cash_payment: shipment.relay_cash_payment,
        };
        setShipments([formattedShipment]);
        setCarrierCodes({ [formattedShipment.tracking_number]: formattedShipment.shipment_code || '' });
        toast.success('Colis trouvé !');
      } else {
        toast.error('Colis introuvable avec ce numéro de suivi ou code d\'envoi');
        setShipments([]);
      }
    } catch (error: any) {
      console.error('Search by tracking error:', error);
      toast.error('Erreur lors de la recherche');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expanded shipment details
  const toggleExpanded = (trackingNumber: string) => {
    setExpandedShipments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackingNumber)) {
        newSet.delete(trackingNumber);
      } else {
        newSet.add(trackingNumber);
      }
      return newSet;
    });
  };

  // Confirm payment — appelé depuis la modale de confirmation
  const handleConfirmPayment = async (shipment: PickupShipment) => {
    setConfirmingPayment(true);
    try {
      const { error } = await api.confirmShipmentPayment(shipment.tracking_number);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Encaissement de ${(shipment.price || 0).toLocaleString('fr-FR')} FCFA confirmé`);
      setPaymentConfirmShipment(null);
      setShipments(prev =>
        prev.map(s =>
          s.tracking_number === shipment.tracking_number
            ? { ...s, payment_status: 'paid' }
            : s
        )
      );
    } catch (error: any) {
      console.error('Confirm payment error:', error);
      toast.error('Erreur lors de la confirmation du paiement');
    } finally {
      setConfirmingPayment(false);
    }
  };

  // Reject shipment
  const handleReject = async (shipment: PickupShipment, reason: string) => {
    try {
      const { error } = await api.rejectShipment(shipment.tracking_number, reason || undefined);
      if (error) { toast.error(error); return; }
      toast.success('Colis rejeté');
      setRejectingPickupTracking(null);
      setRejectPickupReason('');
      await handleSearch();
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error('Erreur lors du rejet');
    }
  };

  // Receive shipment (validate pickup — requires logistics code on parcel)
  const handleReceive = async (shipment: PickupShipment) => {
    const code = (carrierCodes[shipment.tracking_number] || '').trim().toUpperCase();
    if (!code) {
      toast.error('Saisissez le code colis inscrit sur l’étiquette (ex. 1234AB)');
      return;
    }
    try {
      const { data, error } = await api.receiveShipmentForPickup(shipment.tracking_number, undefined, code);
      
      if (error) {
        toast.error(error);
        return;
      }
      
      // S'assurer que le pickup_code et shipment_code sont présents
      const updatedShipment = {
        ...(data.shipment || shipment),
        pickup_code: data.shipment?.pickup_code || shipment.pickup_code || '',
        shipment_code: data.shipment?.shipment_code || shipment.shipment_code || ''
      };
      
      setWaybillShipment(updatedShipment);
      setCarrierCodes((prev) => {
        const next = { ...prev };
        delete next[shipment.tracking_number];
        return next;
      });

      // Reload list
      await handleSearchWithPhone();
    } catch (error: any) {
      console.error('Receive error:', error);
      toast.error('Erreur lors de la réception');
    }
  };

  // Print waybill
  const handlePrintWaybill = async () => {
    if (!waybillShipment) return;
    
    // Utiliser une approche simple : imprimer directement la page
    // Le QR code SVG devrait s'imprimer correctement
    window.print();
  };

  // Download waybill
  const handleDownloadWaybill = async () => {
    if (!waybillShipment) return;

    try {
      // Utiliser la fonction utilitaire pour télécharger le bordereau
      downloadWaybillWithToast(waybillShipment, toast);
    } catch (error) {
      console.error('Error downloading waybill:', error);
      toast.error('Erreur lors du téléchargement du bordereau.');
    }
  };

  // Get payment status label
  const getPaymentStatusLabel = (shipment: PickupShipment): string => {
    const icon = getPaymentStatusIcon(shipment);
    if (icon === 'paid') return 'Payé';
    if (icon === 'cash_on_delivery') return 'Paiement au point relais';
    // pending + relay_cash home_pickup: transporter collects from sender
    if ((shipment.payment_method || '').toLowerCase() === 'relay_cash') {
      return `À collecter${shipment.price ? ` — ${shipment.price.toLocaleString('fr-FR')} FCFA` : ''}`;
    }
    return 'En attente de paiement';
  };

  if (!user || user.role !== 'transporter') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Accès réservé aux transporteurs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <header className="bg-white shadow-md border-b border-orange-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Enlèvement — colis prêts</h1>
              <p className="text-xs text-gray-500">Téléphone expéditeur ou code / n° de suivi</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            <div className="rounded-lg p-4 bg-gray-50 border border-gray-200 text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Prêt à être enlevé par nos services</p>
              <p>
                Soit <strong>ramassage chez l&apos;expéditeur</strong>, soit <strong>colis déjà déposé au point relais d&apos;origine</strong>.
                Pour valider l&apos;enlèvement, saisissez le <strong>code colis</strong> écrit sur l&apos;étiquette (ex. 4 chiffres + 2 lettres).
              </p>
            </div>
            {/* Recherche par téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recherche par numéro de téléphone de l'expéditeur
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <PhoneInput
                    value={senderPhone}
                    onChange={setSenderPhone}
                    onNationalKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Rechercher
                </button>
              </div>
            </div>

            {/* Saisie manuelle du numéro de suivi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ou saisir le numéro de suivi directement
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchByTracking()}
                    placeholder="N° de suivi ou code colis (ex. 1234AB, CD…)"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSearchByTracking}
                  disabled={!trackingInput.trim()}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste : colonne par mode d'origine (domicile vs relais) */}
        {shipments.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ramassage chez l'expéditeur — groupé par commune (tournée) */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Ramassage chez l&apos;expéditeur
              </h2>
              {(() => {
                const homePickups = shipments.filter((s) => !s.origin_relay_id);
                const communes = [...new Set(homePickups.map((s) => s.sender_commune || 'Commune inconnue'))];
                return (
                  <p className="text-xs text-gray-500 mb-4">
                    {homePickups.length} colis · {communes.length} commune{communes.length > 1 ? 's' : ''} — le client attend votre passage
                  </p>
                );
              })()}
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                {shipments.filter((s) => !s.origin_relay_id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucun colis à ramasser à domicile pour ce numéro</p>
                  </div>
                ) : (
                  (() => {
                    const homePickups = shipments.filter((s) => !s.origin_relay_id);
                    // Group by sender_commune, sort alphabetically
                    const byCommune = homePickups.reduce<Record<string, typeof homePickups>>((acc, s) => {
                      const key = s.sender_commune || 'Commune inconnue';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(s);
                      return acc;
                    }, {});
                    const sortedCommunes = Object.keys(byCommune).sort();
                    let stopIndex = 0;
                    return sortedCommunes.map((commune) => (
                      <div key={commune}>
                        {/* Commune header */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {sortedCommunes.indexOf(commune) + 1}
                          </span>
                          <span className="font-semibold text-blue-800 text-sm">{commune}</span>
                          <span className="text-xs text-gray-400">— {byCommune[commune].length} colis</span>
                        </div>
                        <div className="space-y-3 pl-2 border-l-2 border-blue-100 ml-3">
                        {byCommune[commune].map((shipment) => {
                          stopIndex++;
                    const icon = getPaymentStatusIcon(shipment);
                    const isExpanded = expandedShipments.has(shipment.tracking_number);
                    const needsPayment = icon === 'pending';

                    return (
                      <div
                        key={shipment.id}
                        className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 hover:shadow-md transition-shadow"
                      >
                        {/* Adresse de collecte */}
                        {shipment.sender_address && (
                          <p className="text-xs text-blue-700 font-medium mb-2">
                            📍 {shipment.sender_address}{shipment.sender_commune ? `, ${shipment.sender_commune}` : ''}
                          </p>
                        )}
                        {/* Main row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Payment status icon */}
                            <div className="flex-shrink-0">
                              {icon === 'paid' && (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              )}
                              {icon === 'cash_on_delivery' && (
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                              )}
                              {icon === 'pending' && (
                                <XCircle className="w-6 h-6 text-red-600" />
                              )}
                            </div>

                            {/* Tracking number */}
                            <div className="font-mono font-semibold text-[#FF6C00]">
                              {shipment.tracking_number}
                            </div>

                            {/* Expand button */}
                            <button
                              onClick={() => toggleExpanded(shipment.tracking_number)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </button>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            {rejectingPickupTracking === shipment.tracking_number ? (
                              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                                <input
                                  type="text"
                                  value={rejectPickupReason}
                                  onChange={(e) => setRejectPickupReason(e.target.value)}
                                  placeholder="Raison du rejet (optionnel)"
                                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                  autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => { setRejectingPickupTracking(null); setRejectPickupReason(''); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Annuler</button>
                                  <button onClick={() => handleReject(shipment, rejectPickupReason)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700">Confirmer</button>
                                </div>
                              </div>
                            ) : needsPayment ? (
                              <>
                                <button
                                  onClick={() => setPaymentConfirmShipment(shipment)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Encaisser{shipment.price ? ` ${shipment.price.toLocaleString('fr-FR')} FCFA` : ''}
                                </button>
                                <button
                                  onClick={() => { setRejectingPickupTracking(shipment.tracking_number); setRejectPickupReason(''); }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReceive(shipment)}
                                  className="px-4 py-2 bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <Package className="w-4 h-4" />
                                  Valider l&apos;enlèvement
                                </button>
                                <button
                                  onClick={() => { setRejectingPickupTracking(shipment.tracking_number); setRejectPickupReason(''); }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Rejeter
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <label className="text-xs font-medium text-gray-600">Code colis sur l&apos;étiquette</label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={carrierCodes[shipment.tracking_number] || ''}
                            onChange={(e) =>
                              setCarrierCodes((prev) => ({
                                ...prev,
                                [shipment.tracking_number]: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="Ex : 1234AB"
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                          />
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                <div className="text-gray-500">Expéditeur</div>
                                <div className="font-medium">
                                  {shipment.sender_first_name} {shipment.sender_last_name}
                                </div>
                                <div className="text-gray-600">{shipment.sender_phone}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Destinataire</div>
                                <div className="font-medium">
                                  {shipment.recipient_first_name} {shipment.recipient_last_name}
                                </div>
                                <div className="text-gray-600">{shipment.recipient_phone}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Mode de livraison</div>
                                <div className="font-medium">
                                  {shipment.home_delivery ? 'Livraison à domicile' : 'Point relais'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Type de paiement</div>
                                <div className="font-medium">
                                  {shipment.payment_method === 'mobile_money' ? 'Mobile Money' :
                                   shipment.payment_method === 'relay_cash' ? (!shipment.origin_relay_id ? 'Paiement avec le transporteur' : 'Paiement au point relais') :
                                   shipment.payment_method === 'card' ? 'Carte bancaire' :
                                   'Non renseigné'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Statut de paiement</div>
                                <div className="font-medium">{getPaymentStatusLabel(shipment)}</div>
                              </div>
                              {shipment.home_delivery && shipment.recipient_address && (
                                <div>
                                  <div className="text-gray-500">Adresse de destination</div>
                                  <div className="font-medium">
                                    {shipment.recipient_address}, {shipment.recipient_commune}
                                  </div>
                                </div>
                              )}
                              {!shipment.home_delivery && (
                                <div>
                                  <div className="text-gray-500">Point relais de destination</div>
                                  <div className="font-medium">À définir</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                        );
                      })}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>

            {/* Enlèvement au relais d'origine (colis déjà pris en charge au relais) */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Enlèvement au point relais d&apos;origine
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                {shipments.filter((s) => !!s.origin_relay_id).length} colis — déjà déposés par l&apos;expéditeur
              </p>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {shipments.filter((s) => !!s.origin_relay_id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucun colis prêt au relais pour ce numéro</p>
                  </div>
                ) : (
                  shipments.filter((s) => !!s.origin_relay_id).map((shipment) => {
                    const icon = getPaymentStatusIcon(shipment);
                    const isExpanded = expandedShipments.has(shipment.tracking_number);
                    const needsPayment = icon === 'pending';

                    return (
                      <div
                        key={shipment.id}
                        className="border border-purple-200 rounded-lg p-4 bg-purple-50/30 hover:shadow-md transition-shadow"
                      >
                        {/* Main row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Payment status icon */}
                            <div className="flex-shrink-0">
                              {icon === 'paid' && (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              )}
                              {icon === 'cash_on_delivery' && (
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                              )}
                              {icon === 'pending' && (
                                <XCircle className="w-6 h-6 text-red-600" />
                              )}
                            </div>

                            {/* Tracking number */}
                            <div className="font-mono font-semibold text-[#FF6C00]">
                              {shipment.tracking_number}
                            </div>

                            {/* Expand button */}
                            <button
                              onClick={() => toggleExpanded(shipment.tracking_number)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </button>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            {rejectingPickupTracking === shipment.tracking_number ? (
                              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                                <input
                                  type="text"
                                  value={rejectPickupReason}
                                  onChange={(e) => setRejectPickupReason(e.target.value)}
                                  placeholder="Raison du rejet (optionnel)"
                                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                  autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => { setRejectingPickupTracking(null); setRejectPickupReason(''); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Annuler</button>
                                  <button onClick={() => handleReject(shipment, rejectPickupReason)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700">Confirmer</button>
                                </div>
                              </div>
                            ) : needsPayment ? (
                              <>
                                <button
                                  onClick={() => setPaymentConfirmShipment(shipment)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Encaisser{shipment.price ? ` ${shipment.price.toLocaleString('fr-FR')} FCFA` : ''}
                                </button>
                                <button
                                  onClick={() => { setRejectingPickupTracking(shipment.tracking_number); setRejectPickupReason(''); }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReceive(shipment)}
                                  className="px-4 py-2 bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <Package className="w-4 h-4" />
                                  Valider l&apos;enlèvement
                                </button>
                                <button
                                  onClick={() => { setRejectingPickupTracking(shipment.tracking_number); setRejectPickupReason(''); }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Rejeter
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <label className="text-xs font-medium text-gray-600">Code colis sur l&apos;étiquette</label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={carrierCodes[shipment.tracking_number] || ''}
                            onChange={(e) =>
                              setCarrierCodes((prev) => ({
                                ...prev,
                                [shipment.tracking_number]: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="Ex : 1234AB"
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                          />
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                <div className="text-gray-500">Expéditeur</div>
                                <div className="font-medium">
                                  {shipment.sender_first_name} {shipment.sender_last_name}
                                </div>
                                <div className="text-gray-600">{shipment.sender_phone}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Destinataire</div>
                                <div className="font-medium">
                                  {shipment.recipient_first_name} {shipment.recipient_last_name}
                                </div>
                                <div className="text-gray-600">{shipment.recipient_phone}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Mode de livraison</div>
                                <div className="font-medium">
                                  {shipment.home_delivery ? 'Livraison à domicile' : 'Point relais'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Type de paiement</div>
                                <div className="font-medium">
                                  {shipment.payment_method === 'mobile_money' ? 'Mobile Money' :
                                   shipment.payment_method === 'relay_cash' ? (!shipment.origin_relay_id ? 'Paiement avec le transporteur' : 'Paiement au point relais') :
                                   shipment.payment_method === 'card' ? 'Carte bancaire' :
                                   'Non renseigné'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Statut de paiement</div>
                                <div className="font-medium">{getPaymentStatusLabel(shipment)}</div>
                              </div>
                              {shipment.home_delivery && shipment.recipient_address && (
                                <div>
                                  <div className="text-gray-500">Adresse de destination</div>
                                  <div className="font-medium">
                                    {shipment.recipient_address}, {shipment.recipient_commune}
                                  </div>
                                </div>
                              )}
                              {!shipment.home_delivery && (
                                <div>
                                  <div className="text-gray-500">Point relais de destination</div>
                                  <div className="font-medium">À définir</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modale de confirmation d'encaissement */}
        {paymentConfirmShipment && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
              {/* En-tête */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Confirmer l'encaissement</h2>
                <button
                  onClick={() => setPaymentConfirmShipment(null)}
                  disabled={confirmingPayment}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-40"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Détails du colis */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Colis</span>
                  <span className="font-mono font-semibold text-[#FF6C00]">{paymentConfirmShipment.tracking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expéditeur</span>
                  <span className="font-medium">{paymentConfirmShipment.sender_first_name} {paymentConfirmShipment.sender_last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="font-medium">{paymentConfirmShipment.sender_phone}</span>
                </div>
              </div>

              {/* Montant à encaisser */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm text-green-700 mb-1">Montant à encaisser auprès de l'expéditeur</p>
                <p className="text-3xl font-bold text-green-800">
                  {(paymentConfirmShipment.price || 0).toLocaleString('fr-FR')} <span className="text-xl">FCFA</span>
                </p>
              </div>

              <p className="text-xs text-gray-500 text-center">
                En confirmant, vous attestez avoir collecté ce montant auprès de l'expéditeur.
              </p>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentConfirmShipment(null)}
                  disabled={confirmingPayment}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleConfirmPayment(paymentConfirmShipment)}
                  disabled={confirmingPayment}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {confirmingPayment ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {confirmingPayment ? 'Confirmation…' : 'Encaissement confirmé'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waybill modal */}
        {waybillShipment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:rounded-none print:shadow-none">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Bordereau d'envoi</h2>
                <button
                  onClick={() => {
                    setWaybillShipment(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 print:p-4">
                <div className="border-2 border-gray-300 rounded-lg p-6 bg-white print:border-2 print:border-gray-800 print:rounded-none print:p-4">
                  <div className="text-center mb-6">
                    <Logo size="lg" />
                    <h3 className="text-lg sm:text-xl font-bold mt-4">Bordereau d'envoi</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Destinataire</div>
                      <div className="font-semibold text-lg">
                        {waybillShipment.recipient_first_name} {waybillShipment.recipient_last_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Téléphone</div>
                      <div className="font-semibold text-lg">{waybillShipment.recipient_phone}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Numéro de suivi</div>
                      <div className="font-mono font-semibold text-lg text-[#FF6C00]">
                        {waybillShipment.tracking_number}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Numéro d'envoi</div>
                      <div className="font-mono font-semibold text-xl text-[#FF6C00] print:text-2xl">
                        {waybillShipment.shipment_code || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 print:text-gray-600">
                        (À écrire sur le colis)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Statut de paiement</div>
                      <div className="font-semibold text-lg">{getPaymentStatusLabel(waybillShipment)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Type de livraison</div>
                      <div className="font-semibold text-lg">
                        {waybillShipment.home_delivery ? 'Livraison à domicile' : 'Point relais'}
                      </div>
                    </div>
                    {waybillShipment.pickup_code && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Code de retrait (secret)</div>
                        <div className="font-mono font-semibold text-lg text-red-600 print:text-xl">
                          {waybillShipment.pickup_code}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 print:text-gray-600">
                          (Pour le destinataire uniquement - Ne pas écrire sur le colis)
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center border-t border-gray-200 pt-6 print:border-t-2 print:border-gray-800 print:pt-4">
                    <div className="text-sm text-gray-500 mb-2 font-semibold print:text-gray-900 print:text-base">QR Code unique</div>
                    <div className="flex justify-center print:justify-center" ref={qrCodeRef}>
                      <div className="p-2 bg-white print:bg-white print:p-4 print:border-2 print:border-gray-300">
                        <QRCodeCanvas
                          value={waybillShipment.shipment_code || waybillShipment.tracking_number || ''}
                          size={200}
                          level="H"
                          includeMargin={true}
                          style={{ display: 'block', width: '200px', height: '200px' }}
                          className="print:block"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 print:text-gray-900 print:text-sm print:mt-3">
                      Scanner ce code lors de la livraison pour saisir le code de retrait
                    </p>
                    {waybillShipment.shipment_code && (
                      <p className="text-xs text-gray-400 mt-1 print:text-gray-700 print:text-xs print:mt-2">
                        Numéro d'envoi : <span className="font-mono font-semibold">{waybillShipment.shipment_code}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 print:text-gray-700 print:text-xs print:mt-1">
                      Numéro de suivi : <span className="font-mono font-semibold">{waybillShipment.tracking_number}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handlePrintWaybill}
                    className="px-4 py-3 bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Imprimer
                  </button>
                  <button
                    onClick={handleDownloadWaybill}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Télécharger
                  </button>
                  <button
                    onClick={() => {
                      setWaybillShipment(null);
                    }}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TransporterPickupPage;

