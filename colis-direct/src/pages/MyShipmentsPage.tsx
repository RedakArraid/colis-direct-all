import { useState, useEffect } from 'react';
import { Package, Search, Filter, CheckCircle, Clock, XCircle, Eye, Download, MapPin, AlertCircle, CreditCard, Ban, Store, Truck } from 'lucide-react';
import DepositRelayFinder from '../components/shipment/DepositRelayFinder';
import { useAuth } from '../contexts/AuthContext';
import { api, type Shipment } from '../lib/api';
import ShipmentDetailsModal from '../components/shipment/ShipmentDetailsModal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  isShipmentDelivered,
  normalizePaymentStatus,
  normalizeShipmentStatus,
  shipmentStatusForFilter,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
  getEffectiveShipmentStatus,
  getDeliveryStatusLabel,
  getDeliveryStatusBadgeClass,
  getStatusIconComponent,
} from '../utils/shipmentStatus';
import { downloadWaybillWithToast, generateWaybillHtml } from '../utils/waybillUtils';
import { toast } from 'react-toastify';

import { BasePageProps } from '../types/pages';

interface MyShipmentsPageProps extends BasePageProps {
  // onNavigate non utilisé, supprimé pour cohérence
}

function MyShipmentsPage({}: MyShipmentsPageProps = {}) {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'in-progress'>('all');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [showWaybillModal, setShowWaybillModal] = useState(false);
  const [waybillHtml, setWaybillHtml] = useState<string>('');
  const [waybillTrackingNumber, setWaybillTrackingNumber] = useState<string>('');
  const [pendingActionLoading, setPendingActionLoading] = useState<string | null>(null);
  const [retryPaymentMethod, setRetryPaymentMethod] = useState<Record<string, 'online' | 'relay_cash'>>({});

  useEffect(() => {
    loadShipments();
  }, [user]);

  // Mise à jour automatique des statuts de livraison et paiements
  useEffect(() => {
    if (!user || shipments.length === 0) return;

    // Vérifier s'il y a des colis qui ne sont pas dans un statut final
    // OU des paiements en attente (même pour des colis dans un statut final)
    const finalStatuses = ['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'];
    const hasActiveShipments = shipments.some(shipment => {
      const status = shipment.current_status || shipment.status || '';
      return !finalStatuses.includes(status.toUpperCase());
    });
    
    // Vérifier s'il y a des paiements en attente (Mobile Money, etc.)
    const hasPendingPayments = shipments.some(shipment => {
      const paymentStatus = (shipment.payment_status || '').toString().toLowerCase();
      const paymentMethod = (shipment.payment_method || '').toString().toLowerCase();
      // Paiement en ligne encore non confirmé
      if (paymentMethod === 'mobile_money' && paymentStatus !== 'paid') {
        return true;
      }
      // Autres paiements en attente
      if (paymentStatus === 'pending') {
        return true;
      }
      return false;
    });

    if (!hasActiveShipments && !hasPendingPayments) {
      return; // Tous les colis sont dans un statut final ET tous les paiements sont validés, pas besoin de mise à jour
    }

    // Recharger les colis toutes les 10 secondes
    const intervalId = setInterval(async () => {
      try {
        const { data, error } = await api.getShipments();
        if (!error && data) {
          const userShipments = (data || []).filter((shipment: any) => 
            shipment.created_by === user.id || 
            shipment.sender_email === user.email ||
            shipment.sender_phone === user.phone
          );
          
          // Comparaison plus détaillée pour détecter les changements de payment_status
          const currentShipmentsMap = new Map(
            shipments.map(s => [
              s.id,
              {
                status: s.current_status || s.status,
                payment_status: (s.payment_status || '').toString().toLowerCase(),
                payment_method: (s.payment_method || '').toString().toLowerCase(),
                eventsCount: (s as any).events?.length || 0
              }
            ])
          );
          
          let hasChanges = false;
          for (const newShipment of userShipments) {
            const current = currentShipmentsMap.get(newShipment.id);
            if (!current) {
              hasChanges = true;
              break;
            }
            const newPaymentStatus = (newShipment.payment_status || '').toString().toLowerCase();
            const newStatus = newShipment.current_status || newShipment.status;
            const newEventsCount = newShipment.events?.length || 0;
            
            if (
              current.status !== newStatus ||
              current.payment_status !== newPaymentStatus ||
              current.payment_method !== (newShipment.payment_method || '').toString().toLowerCase() ||
              current.eventsCount !== newEventsCount
            ) {
              hasChanges = true;
              break;
            }
          }
          
          // Vérifier aussi si le nombre de colis a changé
          if (!hasChanges && shipments.length !== userShipments.length) {
            hasChanges = true;
          }

          if (hasChanges) {
            setShipments(userShipments);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la mise à jour automatique:', err);
        // Ne pas afficher d'erreur à l'utilisateur pour les mises à jour automatiques
      }
    }, 10000); // 10 secondes

    return () => clearInterval(intervalId);
  }, [user, shipments]);

  const loadShipments = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await api.getShipments();
      if (error) throw new Error(error);
      
      // Normalize phone numbers for comparison
      const normalizePhone = (phone: string | null | undefined): string => {
        if (!phone) return '';
        return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+225/, '').replace(/^225/, '').replace(/^0/, '');
      };

      const userPhoneNormalized = normalizePhone(user.phone);
      const userShipments = (data || []).filter((shipment: any) => {
        if (shipment.created_by === user.id) return true;
        if (shipment.sender_email === user.email) return true;
        const shipmentPhoneNormalized = normalizePhone(shipment.sender_phone);
        if (userPhoneNormalized && shipmentPhoneNormalized && userPhoneNormalized === shipmentPhoneNormalized) return true;
        if (shipment.sender_phone === user.phone) return true;
        return false;
      });

      setShipments(userShipments);
    } catch (err: any) {
      console.error('Error loading shipments:', err);
      setError(err.message || 'Erreur lors du chargement de vos colis. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: string | null) => {
    const iconInfo = getStatusIconComponent(status);
    if (iconInfo.icon === 'error') {
      return <XCircle className={`w-5 h-5 ${iconInfo.color}`} />;
    }
    return <CheckCircle className={`w-5 h-5 ${iconInfo.color}`} />;
  };

  const getPaymentBadge = (status?: string | null) => {
    const normalized = normalizePaymentStatus(status);
    return {
      label: getPaymentStatusLabel(normalized),
      badgeClass: getPaymentStatusBadgeClass(normalized),
    };
  };

  /**
   * Texte lisible pour le mode de paiement, en tenant compte de l'option choisie à la création.
   * Exemple : si payment_method = 'relay_cash' alors on explique clairement que le paiement
   * doit être réglé lors de la prise en charge / au relais.
   */
  const getPaymentMethodLabel = (shipment: Shipment): string => {
    const method = (shipment.payment_method || '').toString().toLowerCase().trim();
    const normalizedPaymentStatus = normalizePaymentStatus(shipment.payment_status);
    const shipmentStatus = normalizeShipmentStatus((shipment as any).current_status ?? shipment.status);

    // Pour les envois terminés sans paiement reçu, on évite les libellés "en attente"
    if (shipmentStatus === 'CANCELLED') {
      return normalizedPaymentStatus === 'paid' ? 'Payé' : 'Transaction non finalisée';
    }
    if (shipmentStatus === 'RETURN_TO_SENDER') {
      return normalizedPaymentStatus === 'paid' ? 'Payé' : 'Paiement non abouti';
    }

    if (method === 'relay_cash') {
      const isHomePickup = (shipment as any).pickup_method === 'home_pickup';
      if (normalizedPaymentStatus === 'paid') {
        return isHomePickup ? 'Payé au transporteur' : 'Payé au point relais';
      }
      return isHomePickup ? 'Paiement avec le transporteur' : 'Paiement au point relais';
    }

    const effectiveStatus = getEffectiveShipmentStatus(shipment as any);

    if (method === 'mobile_money') {
      if (normalizedPaymentStatus === 'paid') return 'Payé (Mobile Money)';
      if (effectiveStatus === 'PAYMENT_REJECTED') return 'Paiement Mobile Money échoué';
      return 'Paiement Mobile Money en attente de confirmation';
    }

    if (method === 'paystack' || method === 'cinetpay') {
      if (normalizedPaymentStatus === 'paid') return 'Payé par carte bancaire';
      if (effectiveStatus === 'PAYMENT_REJECTED') return 'Paiement par carte échoué';
      return 'Paiement par carte en attente de confirmation';
    }

    if (method === 'card') {
      if (normalizedPaymentStatus === 'paid') return 'Payé par carte bancaire';
      return 'Paiement par carte en attente';
    }

    if (!method || method === 'promo_code') {
      return 'Gratuit (code promo)';
    }

    // Fallback : garder le label générique basé sur le statut
    return getPaymentStatusLabel(normalizedPaymentStatus);
  };


  const downloadWaybill = async (shipment: Shipment) => {
    try {
      // Load full shipment details
      const { data: fullShipment, error: shipmentError } = await api.getShipment(shipment.id);
      if (shipmentError || !fullShipment) {
        toast.error('Erreur lors du chargement des détails du colis. Veuillez réessayer.');
        console.error('Error loading shipment:', shipmentError);
        return;
      }

      // Utiliser la fonction utilitaire pour télécharger le bordereau
      downloadWaybillWithToast(fullShipment, toast);
    } catch (error) {
      console.error('Error downloading waybill:', error);
      toast.error('Erreur lors du téléchargement du bordereau. Veuillez réessayer.');
    }
  };

  const viewWaybill = async (shipment: Shipment) => {
    try {
      const { data: fullShipment, error: shipmentError } = await api.getShipment(shipment.id);
      if (shipmentError || !fullShipment) {
        toast.error('Erreur lors du chargement des détails du colis.');
        return;
      }

      // Générer le HTML du bordereau et l'afficher dans le modal
      const html = generateWaybillHtml(fullShipment);
      setWaybillHtml(html);
      setWaybillTrackingNumber(fullShipment.tracking_number || shipment.tracking_number || 'colis');
      setShowWaybillModal(true);
    } catch (e) {
      console.error('Error viewing waybill:', e);
      toast.error('Erreur lors de la prévisualisation du bordereau.');
    }
  };

  const handleCancelShipment = async (trackingNumber: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet envoi ? Cette action est irréversible.')) return;
    setPendingActionLoading(trackingNumber);
    try {
      const { error } = await api.cancelShipment(trackingNumber);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Colis annulé avec succès');
        loadShipments();
      }
    } finally {
      setPendingActionLoading(null);
    }
  };

  const handlePayNow = async (shipment: Shipment) => {
    if (!user) return;
    setPendingActionLoading(shipment.tracking_number);
    try {
      const toNum = (v: unknown) => { const n = parseFloat(String(v ?? '0')); return isFinite(n) && n > 0 ? n : 0; };
      const totalAmount =
        toNum(shipment.price) +
        toNum((shipment as any).printing_fee) +
        toNum((shipment as any).box_price) +
        toNum((shipment as any).assistance_fee);
      const amount_fcfa = totalAmount > 0
        ? totalAmount
        : toNum((shipment as any).relay_cash_payment?.amount_expected) || toNum(shipment.price);
      if (amount_fcfa <= 0) {
        toast.error('Montant invalide pour ce colis. Contactez le support.');
        return;
      }
      const payload = {
        tracking_number: shipment.tracking_number,
        amount_fcfa,
        customer_name: `${user.first_name} ${user.last_name}`.trim() || `${shipment.sender_first_name} ${shipment.sender_last_name}`,
        customer_email: user.email || shipment.sender_email || '',
        customer_phone: user.phone || shipment.sender_phone || '',
      };
      const method = retryPaymentMethod[shipment.tracking_number] || 'online';
      if (method === 'relay_cash') {
        const { error } = await api.switchToRelayPayment(shipment.tracking_number);
        if (error) { toast.error(error); return; }
        toast.success('Mode de paiement mis à jour. Vous réglerez lors de la prise en charge.');
        loadShipments();
        return;
      }
      const { data, error } = await api.initMobileMoneyPayment(payload);
      if (error || !data) { toast.error(error || 'Erreur lors de l\'initialisation du paiement'); return; }
      window.open(data.payment_url, '_blank');
      toast.info('Vous allez être redirigé vers la page de paiement. Revenez ici une fois le paiement effectué.');
    } finally {
      setPendingActionLoading(null);
    }
  };

  const filteredShipments = shipments
    .filter((shipment) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        shipment.tracking_number.toLowerCase().includes(q) ||
        (shipment.shipment_code || '').toLowerCase().includes(q) ||
        `${shipment.recipient_first_name} ${shipment.recipient_last_name}`.toLowerCase().includes(q) ||
        (shipment.recipient_commune || '').toLowerCase().includes(q) ||
        ((shipment as any).sender_commune || '').toLowerCase().includes(q);

      const logisticStatus = getEffectiveShipmentStatus(shipment as any);
      const logisticGroup = shipmentStatusForFilter(logisticStatus);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'pickup_pending' && (shipment as any).pickup_method === 'home_pickup') ||
        (filterStatus === 'pending' && logisticGroup === 'pending') ||
        (filterStatus === 'in_transit' && logisticGroup === 'in_transit') ||
        (filterStatus === 'at_relay' && logisticGroup === 'at_relay') ||
        (filterStatus === 'delivered' && isShipmentDelivered(logisticStatus)) ||
        (filterStatus === 'return_to_sender' && logisticStatus === 'RETURN_TO_SENDER') ||
        (filterStatus === 'cancelled' && logisticStatus === 'CANCELLED');

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sortOrder === 'desc' ? diff : -diff;
    });

  const sentShipments = filteredShipments.filter((shipment) =>
    isShipmentDelivered(getEffectiveShipmentStatus(shipment as any))
  );

  const inProgressShipments = filteredShipments.filter((shipment) => {
    const status = getEffectiveShipmentStatus(shipment as any);
    return !isShipmentDelivered(status) && status !== 'CANCELLED' && status !== 'RETURN_TO_SENDER';
  });

  const TERMINAL_STATUSES = ['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'];
  const ONLINE_PAYMENT_METHODS = ['mobile_money', 'paystack', 'cinetpay'];

  const isUnpaidOnlinePayment = (shipment: Shipment) => {
    const paymentMethod = (shipment.payment_method || '').toLowerCase();
    const paymentStatus = (shipment.payment_status || '').toLowerCase();
    const currentStatus = ((shipment as any).current_status || shipment.status || '').toUpperCase();
    return (
      ONLINE_PAYMENT_METHODS.includes(paymentMethod) &&
      paymentStatus !== 'paid' &&
      !TERMINAL_STATUSES.includes(currentStatus)
    );
  };

  const onlinePaymentPendingBannerShipments = shipments.filter((shipment) => {
    const effective = getEffectiveShipmentStatus(shipment as any);
    if (effective === 'PAYMENT_AWAITING_VALIDATION' || effective === 'PAYMENT_REJECTED') return true;
    return isUnpaidOnlinePayment(shipment);
  });

  // Colis relay_deposit prêts à être déposés au relais (paiement confirmé ou paiement au relais)
  const readyToDepositShipments = shipments.filter((shipment) => {
    const effective = getEffectiveShipmentStatus(shipment as any);
    if (effective === 'PAYMENT_AWAITING_VALIDATION' || effective === 'PAYMENT_REJECTED') return false;
    if (isUnpaidOnlinePayment(shipment)) return false;
    const status = normalizeShipmentStatus((shipment as any).current_status ?? shipment.status);
    const isRelayDeposit = (shipment as any).pickup_method === 'relay_deposit' || !(shipment as any).pickup_method;
    return isRelayDeposit && (status === 'READY_FOR_DROP_OFF' || status === 'PAYMENT_CONFIRMED_AWAITING_DROP');
  });

  // Colis home_pickup en attente de ramassage à domicile
  const pendingPickupShipments = shipments.filter((shipment) => {
    const effective = getEffectiveShipmentStatus(shipment as any);
    if (effective === 'PAYMENT_AWAITING_VALIDATION' || effective === 'PAYMENT_REJECTED') return false;
    if (isUnpaidOnlinePayment(shipment)) return false;
    const status = normalizeShipmentStatus((shipment as any).current_status ?? shipment.status);
    const isHomePickup = (shipment as any).pickup_method === 'home_pickup';
    return isHomePickup && (status === 'PICKUP_PENDING' || status === 'READY_FOR_DROP_OFF' || status === 'PAYMENT_CONFIRMED_AWAITING_DROP');
  });

  const displayShipments = activeTab === 'sent' 
    ? sentShipments 
    : activeTab === 'in-progress' 
    ? inProgressShipments 
    : filteredShipments;

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-6 sm:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight mb-1">Mes colis</h1>
          <p className="text-sm text-[#6B7280]">Gérez et suivez tous vos envois</p>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="card mb-6 rounded-2xl overflow-hidden">
          <div className="border-b border-[#E6E6E6]">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-[#6B7280] hover:text-[#3A3A3A] hover:border-[#E6E6E6]'
                }`}
              >
                Tous ({filteredShipments.length})
              </button>
              <button
                onClick={() => setActiveTab('in-progress')}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'in-progress'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-[#6B7280] hover:text-[#3A3A3A] hover:border-[#E6E6E6]'
                }`}
              >
                En cours ({inProgressShipments.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'sent'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-[#6B7280] hover:text-[#3A3A3A] hover:border-[#E6E6E6]'
                }`}
              >
                Expédiés ({sentShipments.length})
              </button>
              {/* Onglet Bordereaux supprimé */}
            </nav>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Numéro, destinataire, commune…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-[#6B7280] shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">Tous les statuts</option>
              <option value="pickup_pending">Ramassage domicile</option>
              <option value="pending">En attente</option>
              <option value="in_transit">En transit</option>
              <option value="at_relay">Au relais</option>
              <option value="delivered">Livré</option>
              <option value="return_to_sender">Retour expéditeur</option>
              <option value="cancelled">Annulé</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="input-field w-auto"
            >
              <option value="desc">Plus récents</option>
              <option value="asc">Plus anciens</option>
            </select>
          </div>
        </div>

        {/* Colis home_pickup — en attente de ramassage à domicile */}
        {pendingPickupShipments.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Ramassage à domicile prévu ({pendingPickupShipments.length})
            </h2>
            <div className="space-y-4">
              {pendingPickupShipments.map((shipment) => (
                <div key={shipment.id} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <button
                          onClick={() => setSelectedShipmentId(shipment.id)}
                          className="font-bold text-blue-700 hover:underline text-sm font-mono tracking-wide"
                        >
                          {shipment.tracking_number}
                        </button>
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        Destinataire : {shipment.recipient_first_name} {shipment.recipient_last_name} — {shipment.recipient_commune}
                      </p>
                      <p className="text-xs font-bold text-[#3A3A3A]">{(shipment as any).price?.toLocaleString()} FCFA</p>
                      <p className="text-xs text-blue-700 mt-1">
                        📍 Adresse de collecte : {(shipment as any).sender_address}, {(shipment as any).sender_commune}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 border border-blue-300 rounded-full text-xs font-semibold text-blue-800">
                        <Truck className="w-3 h-3" /> Ramassage en attente
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      <span className="font-semibold">ℹ️ Info :</span> Un transporteur passera chez vous pour récupérer votre colis. Vous n'avez rien à déposer en point relais.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Colis relay_deposit — à déposer au point relais */}
        {readyToDepositShipments.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#FF6C00]" />
              Colis à déposer au point relais ({readyToDepositShipments.length})
            </h2>
            <div className="space-y-4">
              {readyToDepositShipments.map((shipment) => (
                <div key={shipment.id} className="bg-white border-2 border-[#FF6C00]/30 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#FF6C00]" />
                        <button
                          onClick={() => setSelectedShipmentId(shipment.id)}
                          className="font-bold text-[#FF6C00] hover:underline text-sm font-mono tracking-wide"
                        >
                          {shipment.tracking_number}
                        </button>
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        Destinataire : {shipment.recipient_first_name} {shipment.recipient_last_name} — {shipment.recipient_commune}
                      </p>
                      <p className="text-xs font-bold text-[#3A3A3A]">{(shipment as any).price?.toLocaleString()} FCFA</p>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-semibold text-orange-700">
                        <Clock className="w-3 h-3" /> En attente de dépôt
                      </span>
                    </div>
                  </div>
                  <DepositRelayFinder
                    destinationRelayId={(shipment as any).destination_relay_id}
                    shipmentTrackingNumber={shipment.tracking_number}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paiements en attente / échoués */}
        {onlinePaymentPendingBannerShipments.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Paiements en attente ({onlinePaymentPendingBannerShipments.length})
            </h2>
            <div className="space-y-3">
              {onlinePaymentPendingBannerShipments.map((shipment) => {
                const effective = getEffectiveShipmentStatus(shipment as any);
                const isRejected = effective === 'PAYMENT_REJECTED';
                const isNeverInitiated = effective !== 'PAYMENT_AWAITING_VALIDATION' && effective !== 'PAYMENT_REJECTED';
                return (
                  <div key={shipment.id} className={`border rounded-lg p-4 ${isRejected ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Package className={`w-4 h-4 ${isRejected ? 'text-red-500' : 'text-orange-500'}`} />
                          <span className={`font-semibold text-sm ${isRejected ? 'text-red-800' : 'text-orange-800'}`}>{shipment.tracking_number}</span>
                          {isRejected && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Paiement échoué</span>}
                          {isNeverInitiated && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Paiement non complété</span>}
                        </div>
                        <p className={`text-xs ${isRejected ? 'text-red-700' : 'text-orange-700'}`}>
                          Destinataire : {shipment.recipient_first_name} {shipment.recipient_last_name} — {shipment.recipient_commune}
                        </p>
                        <p className={`text-xs font-medium ${isRejected ? 'text-red-800' : 'text-orange-800'}`}>{shipment.price} FCFA</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <select
                          value={retryPaymentMethod[shipment.tracking_number] || 'online'}
                          onChange={(e) => setRetryPaymentMethod(prev => ({ ...prev, [shipment.tracking_number]: e.target.value as 'online' | 'relay_cash' }))}
                          disabled={pendingActionLoading === shipment.tracking_number}
                          className="px-3 py-2 border border-[#E6E6E6] rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00] bg-white"
                        >
                          <option value="online">Mobile Money et Cartes prépayées</option>
                          <option value="relay_cash">Payer lors de la prise en charge</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePayNow(shipment)}
                            disabled={pendingActionLoading === shipment.tracking_number}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg text-sm font-medium hover:bg-[#e05e00] transition-colors disabled:opacity-60"
                          >
                            <CreditCard className="w-4 h-4" />
                            {pendingActionLoading === shipment.tracking_number
                              ? 'Chargement...'
                              : (retryPaymentMethod[shipment.tracking_number] || 'online') === 'relay_cash'
                                ? 'Confirmer'
                                : isRejected ? 'Réessayer' : 'Payer maintenant'}
                          </button>
                          <button
                            onClick={() => handleCancelShipment(shipment.tracking_number)}
                            disabled={pendingActionLoading === shipment.tracking_number}
                            className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shipments List */}
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-8">
              <LoadingSpinner message="Chargement de vos colis..." />
            </div>
          ) : displayShipments.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-[#6B7280]">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-[#9CA3AF]" />
              <p className="text-sm sm:text-base">Aucun colis trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F7F9]">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">
                      Destinataire
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                      Mode de livraison
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Statut de livraison
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">
                      Statut de paiement
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                      Date
                    </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">Montant</th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Bordereau</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E6E6E6]">
                  {displayShipments.map((shipment) => {
                    const logisticStatus = getEffectiveShipmentStatus(shipment as any);
                    const deliveryStatusLabel = getDeliveryStatusLabel(shipment);
                    // Utiliser getDeliveryStatusBadgeClass pour avoir la même logique que le label
                    const statusBadgeClass = getDeliveryStatusBadgeClass(shipment as any);
                    const { badgeClass: paymentBadgeClass } = getPaymentBadge(shipment.payment_status);
                    const paymentText = getPaymentMethodLabel(shipment);
                    return (
                      <tr key={shipment.id} className="hover:bg-[#F6F7F9]">
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex flex-row sm:items-center gap-1 sm:gap-2">
                            <Package className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block" />
                            <button
                              onClick={() => setSelectedShipmentId(shipment.id)}
                              className="font-medium text-xs sm:text-sm text-[#FF6C00] hover:text-[#ff8534] hover:underline cursor-pointer break-all"
                            >
                              {shipment.tracking_number}
                            </button>
                          </div>
                          {shipment.shipment_code && (
                            <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                              {shipment.shipment_code}
                            </span>
                          )}
                          <span className="text-xs text-[#6B7280] sm:hidden">{shipment.recipient_first_name} {shipment.recipient_last_name}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hidden sm:table-cell">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-[#1A1A1A]">
                            {shipment.recipient_first_name} {shipment.recipient_last_name}
                          </div>
                          <div className="text-xs text-[#6B7280]">{shipment.recipient_commune}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {/* Collecte */}
                          <div className="flex items-center gap-1.5">
                            {(shipment as any).pickup_method === 'home_pickup' ? (
                              <>
                                <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="text-[#6B7280] text-xs">Ramassage domicile</span>
                              </>
                            ) : (
                              <>
                                <Store className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <span className="text-[#6B7280] text-xs">Dépôt en relais</span>
                              </>
                            )}
                          </div>
                          {/* Livraison */}
                          <div className="flex items-center gap-1.5">
                            {shipment.home_delivery ? (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="text-[#3A3A3A] font-medium text-xs">→ Domicile</span>
                              </>
                            ) : (
                              <>
                                <Package className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span className="text-[#3A3A3A] font-medium text-xs">→ Point relais</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getStatusIcon(logisticStatus)}
                          <span className={`px-2 py-1 rounded-full text-xs sm:text-sm font-medium ${statusBadgeClass}`}>
                            {deliveryStatusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">
                        <span className={`px-2 py-1 rounded-full font-medium ${paymentBadgeClass}`}>
                          {paymentText}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#6B7280] hidden md:table-cell">
                        {new Date(shipment.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-[#1A1A1A] hidden lg:table-cell">{shipment.price} FCFA</td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button 
                            onClick={() => viewWaybill(shipment)} 
                            className="px-3 py-2 border border-[#E6E6E6] rounded-lg text-xs sm:text-sm hover:bg-[#F6F7F9] flex items-center justify-center gap-1.5 transition-colors"
                            title="Voir le bordereau"
                          >
                            <Eye className="w-4 h-4" /> 
                            <span className="hidden sm:inline">Voir</span>
                            <span className="sm:hidden">Voir bordereau</span>
                          </button>
                          <button 
                            onClick={() => downloadWaybill(shipment)} 
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors font-medium"
                            title="Télécharger le bordereau"
                          >
                            <Download className="w-4 h-4" /> 
                            <span className="hidden sm:inline">Télécharger</span>
                            <span className="sm:hidden">Télécharger bordereau</span>
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails du colis */}
      <ShipmentDetailsModal
        shipmentId={selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
      />

      {/* Modal prévisualisation bordereau */}
      {showWaybillModal && waybillHtml && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e)=>{
          if(e.target===e.currentTarget) {
            setShowWaybillModal(false);
            setWaybillHtml('');
            setWaybillTrackingNumber('');
          }
        }}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E6E6]">
              <h3 className="font-bold text-[#1A1A1A]">Prévisualisation du bordereau</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const blob = new Blob([waybillHtml], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `bordereau-${waybillTrackingNumber}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    toast.success('Bordereau téléchargé avec succès');
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
                <button 
                  onClick={() => {
                    setShowWaybillModal(false);
                    setWaybillHtml('');
                    setWaybillTrackingNumber('');
                  }} 
                  className="text-[#6B7280] hover:text-[#3A3A3A] px-3 py-1.5"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe title="waybill" className="w-full h-full min-h-[600px]" srcDoc={waybillHtml}></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyShipmentsPage;

