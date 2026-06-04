import { useEffect, useState } from 'react';
import { X, Package, MapPin, User, Phone, Mail, CheckCircle, Download, Home, Store, Truck } from 'lucide-react';
import { api, Shipment } from '../../lib/api';
import {
  getDeliveryStatusBadgeClass,
  normalizePaymentStatus,
  normalizeShipmentStatus,
  getDeliveryStatusLabel,
} from '../../utils/shipmentStatus';
import { downloadWaybillWithToast } from '../../utils/waybillUtils';
import { toast } from 'react-toastify';

interface ShipmentDetailsModalProps {
  shipmentId: string | null;
  onClose: () => void;
}

export default function ShipmentDetailsModal({ shipmentId, onClose }: ShipmentDetailsModalProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toNumeric = (value: number | string | null | undefined): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/\s/g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatCurrency = (value: number | string | null | undefined) =>
    toNumeric(value).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  useEffect(() => {
    if (!shipmentId) return;

    let isMounted = true;

    const loadShipmentDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: apiError } = await api.getShipment(shipmentId);
        if (!isMounted) return;

        if (apiError) {
          setError(apiError);
        } else {
          setShipment(data);
        }
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement des détails';
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadShipmentDetails();

    // Mise à jour automatique des statuts de livraison
    const finalStatuses = ['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'];
    
    const updateInterval = setInterval(async () => {
      if (!isMounted || !shipmentId) return;

      try {
        const { data, error: apiError } = await api.getShipment(shipmentId);
        if (!isMounted) return;

        if (!apiError && data) {
          const currentStatus = data.current_status || data.status || '';
          const isFinalStatus = finalStatuses.includes(currentStatus.toUpperCase());

          // Mettre à jour seulement si le statut a changé
          setShipment((prevShipment) => {
            if (!prevShipment) return data;
            const oldStatus = prevShipment.current_status || prevShipment.status || '';
            if (oldStatus !== currentStatus) {
              return data;
            }
            return prevShipment;
          });

          // Arrêter la mise à jour automatique si le colis est dans un statut final
          if (isFinalStatus) {
            clearInterval(updateInterval);
          }
        }
      } catch (err) {
        // Ignorer les erreurs de mise à jour automatique
        console.error('Erreur lors de la mise à jour automatique du modal:', err);
      }
    }, 10000); // 10 secondes

    return () => {
      isMounted = false;
      clearInterval(updateInterval);
    };
  }, [shipmentId]);

  if (!shipmentId) return null;

  const logisticLabel = shipment ? getDeliveryStatusLabel(shipment) : '—';
  const logisticBadgeClass = shipment ? getDeliveryStatusBadgeClass(shipment as any) : 'bg-[#F6F7F9] text-[#1A1A1A]';

  const paymentStatus = shipment ? normalizePaymentStatus(shipment.payment_status) : 'pending';
  const paymentLabel =
    paymentStatus === 'paid' ? 'Payé' :
    paymentStatus === 'cancelled' ? 'Annulé' :
    'En attente';
  const paymentBadgeClass =
    paymentStatus === 'paid'
      ? 'bg-green-100 text-green-800'
      : paymentStatus === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';

  const totalAmount =
    toNumeric(shipment?.price) +
    toNumeric(shipment?.printing_fee) +
    toNumeric(shipment?.assistance_fee) +
    toNumeric(shipment?.box_price);

  const s = shipment as any;
  const pickupMethod: string = s?.pickup_method ?? 'relay_deposit';
  const isHomePickup = pickupMethod === 'home_pickup';
  const isHomeDelivery = s?.home_delivery === true;

  const formatPaymentMethod = (method: string | null | undefined): string => {
    switch (method) {
      case 'mobile_money': return 'Mobile Money';
      case 'relay_cash':   return isHomePickup ? 'Paiement avec le transporteur' : 'Paiement au point relais';
      case 'card':         return 'Carte bancaire';
      case 'paystack':     return 'Carte bancaire';
      case 'cinetpay':     return 'Carte bancaire';
      default:             return method ?? '—';
    }
  };

  const handleDownloadWaybill = async () => {
    if (!shipment) return;
    
    try {
      // Le shipment est déjà chargé avec tous les détails, on peut l'utiliser directement
      downloadWaybillWithToast(shipment as any, toast);
    } catch (error) {
      console.error('Error downloading waybill:', error);
      toast.error('Erreur lors du téléchargement du bordereau');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-[#FF6C00]" />
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A]">Détails du colis</h2>
              {shipment && (
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-sm text-[#6B7280] font-mono">{shipment.tracking_number}</p>
                  {shipment.shipment_code && (
                    <>
                      <span className="text-[#D1D5DB]">·</span>
                      <span className="text-xs bg-orange-100 text-orange-700 font-bold font-mono px-2 py-0.5 rounded-full tracking-widest">
                        {shipment.shipment_code}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shipment && (
              <button
                onClick={handleDownloadWaybill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Télécharger le bordereau"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger le bordereau</span>
                <span className="sm:hidden">Bordereau</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F0F0F0] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#FF6C00]"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {shipment && !loading && (
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280] mb-1">Statut</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${logisticBadgeClass}`}>
                      {logisticLabel}
                    </span>
                  </div>
                  {shipment.pickup_code && (normalizeShipmentStatus(shipment.current_status) === 'AVAILABLE_FOR_PICKUP' || (shipment as any).effective_status === 'AVAILABLE_FOR_PICKUP') && (
                    <div className="text-right">
                      <p className="text-sm text-[#6B7280] mb-1">Code de retrait</p>
                      <p className="text-2xl font-bold text-[#FF6C00]">{shipment.pickup_code}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Two columns layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expéditeur */}
                <div className="bg-[#F6F7F9] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-[#FF6C00]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Expéditeur</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-[#1A1A1A]">
                      {shipment.sender_first_name} {shipment.sender_last_name}
                    </p>
                    {shipment.sender_email && (
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Mail className="w-4 h-4" />
                        <span>{shipment.sender_email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <Phone className="w-4 h-4" />
                      <span>{shipment.sender_phone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[#6B7280]">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        <p>{shipment.sender_address}</p>
                        <p>{shipment.sender_commune}, {shipment.sender_quartier}</p>
                      </div>
                    </div>
                    <div className="pt-2 mt-1 border-t border-[#E6E6E6]">
                      {isHomePickup ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                          <Truck className="w-3 h-3" /> Collecte à domicile
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                          <Store className="w-3 h-3" /> Dépôt en point relais
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Destinataire */}
                <div className="bg-[#F6F7F9] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-[#FF6C00]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Destinataire</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-[#1A1A1A]">
                      {shipment.recipient_first_name} {shipment.recipient_last_name}
                    </p>
                    {shipment.recipient_email && (
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Mail className="w-4 h-4" />
                        <span>{shipment.recipient_email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <Phone className="w-4 h-4" />
                      <span>{shipment.recipient_phone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[#6B7280]">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        <p>{shipment.recipient_address}</p>
                        <p>{shipment.recipient_commune}, {shipment.recipient_quartier}</p>
                      </div>
                    </div>
                    <div className="pt-2 mt-1 border-t border-[#E6E6E6]">
                      {isHomeDelivery ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                          <Home className="w-3 h-3" /> Livraison à domicile
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                          <Store className="w-3 h-3" /> Retrait en point relais
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations du colis */}
              <div className="bg-[#F6F7F9] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-[#FF6C00]" />
                  <h3 className="font-semibold text-[#1A1A1A]">Informations du colis</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280] mb-1">Type</p>
                    <p className="font-medium text-[#1A1A1A]">
                      {shipment.package_type === 'petit' ? 'Petit' : shipment.package_type === 'moyen' ? 'Moyen' : 'Grand'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] mb-1">Poids</p>
                    <p className="font-medium text-[#1A1A1A]">{shipment.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] mb-1">Date de création</p>
                    <p className="font-medium text-[#1A1A1A]">
                      {new Date(shipment.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] mb-1">Dernière mise à jour</p>
                    <p className="font-medium text-[#1A1A1A]">
                      {new Date(shipment.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Points relais */}
              {(shipment.origin_relay || shipment.destination_relay) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shipment.origin_relay && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-[#1A1A1A]">Point relais d'origine</h3>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-[#1A1A1A]">{shipment.origin_relay.name}</p>
                        <p className="text-[#6B7280]">{shipment.origin_relay.address}</p>
                        <p className="text-[#6B7280]">{shipment.origin_relay.commune}</p>
                        <p className="text-[#6B7280]">{shipment.origin_relay.phone}</p>
                      </div>
                    </div>
                  )}

                  {shipment.destination_relay && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-[#1A1A1A]">Point relais de destination</h3>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-[#1A1A1A]">{shipment.destination_relay.name}</p>
                        <p className="text-[#6B7280]">{shipment.destination_relay.address}</p>
                        <p className="text-[#6B7280]">{shipment.destination_relay.commune}</p>
                        <p className="text-[#6B7280]">{shipment.destination_relay.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paiement */}
              <div className="bg-[#F6F7F9] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#FF6C00]" />
                  <h3 className="font-semibold text-[#1A1A1A]">Informations de paiement</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Expédition</span>
                    <span className="font-medium text-[#1A1A1A]">{formatCurrency(shipment.price)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Impression</span>
                    <span className="font-medium text-[#1A1A1A]">{formatCurrency(shipment.printing_fee)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Assistance</span>
                    <span className="font-medium text-[#1A1A1A]">{formatCurrency(shipment.assistance_fee)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Carton</span>
                    <span className="font-medium text-[#1A1A1A]">{formatCurrency(shipment.box_price)} FCFA</span>
                  </div>
                  <div className="border-t border-[#D1D5DB] pt-2 mt-2 flex justify-between">
                    <span className="font-semibold text-[#1A1A1A]">Total</span>
                    <span className="font-bold text-[#FF6C00] text-lg">{formatCurrency(totalAmount)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-[#6B7280]">Statut du paiement</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${paymentBadgeClass}`}>
                      {paymentLabel}
                    </span>
                  </div>
                  {shipment.payment_method && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Moyen de paiement</span>
                      <span className="font-medium text-[#1A1A1A]">{formatPaymentMethod(shipment.payment_method)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

