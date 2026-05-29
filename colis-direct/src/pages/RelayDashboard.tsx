import { useCallback, useEffect, useMemo, useState, useRef, type ChangeEvent } from 'react';
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Printer,
  X,
  Receipt,
  Menu,
  FileText,
  HelpCircle,
  Settings,
  ChevronDown,
  AlertCircle,
  Wallet,
  Coins,
  CreditCard,
  Banknote,
  Eye,
  Shield,
  MapPin as MapPinIcon,
  User as UserIcon,
  Component as ComponentIcon,
  QrCode,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import QRScanner from '../components/QRScanner';
import AssistClientForm from '../components/relay/AssistClientForm';
import PhoneInput from '../components/PhoneInput';
import { toast } from 'react-toastify';
import {
  getEffectiveShipmentStatus,
  getShipmentStatusBadgeClass,
  getShipmentStatusLabel,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
  normalizePaymentStatus,
  normalizeShipmentStatus,
  shipmentStatusForFilter,
  getDeliveryStatusLabel,
} from '../utils/shipmentStatus';
import type { PaymentStatus, ShipmentLifecycleStatus } from '../utils/shipmentStatus';

interface RelayDashboardProps { onNavigate: (page: string) => void }

type TabId = 'overview' | 'paiements' | 'colis' | 'assistance' | 'settings';
type ColisSubTab = 'en_cours' | 'termine' | 'incidents';

interface ShipmentItem {
  id: string;
  tracking_number: string;
  current_status?: ShipmentLifecycleStatus | null;
  status?: string | null; // TODO: legacy fallback, remove when backend fully migrated
  payment_status?: PaymentStatus | null;
  payment_method?: string | null;
  price?: number;
  printing_fee?: number;
  assistance_fee?: number;
  box_price?: number;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_commune?: string;
  sender_quartier?: string;
  sender_address?: string;
  sender_email?: string;
  sender_phone?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_commune?: string;
  recipient_quartier?: string;
  recipient_address?: string;
  recipient_email?: string;
  recipient_phone?: string;
  origin_relay_id?: string;
  destination_relay_id?: string;
  relay_assisted?: boolean;
  home_delivery?: boolean;
  created_at: string;
  updated_at: string;
  package_type?: string | null;
  weight?: number | null;
  pickup_code?: string | null;
  shipment_code?: string | null; // Numéro d'envoi (4 chiffres + 2 lettres)
  mobile_money_payment?: Record<string, any> | null;
  relay_cash_payment?: {
    status?: string | null;
    amount_expected?: number | null;
    amount_collected?: number | null;
    relay_point_id?: string | null;
    collection_location?: 'relay' | 'transporter' | null;
  } | null;
}

type PaymentBreakdownMap = Record<string, { count: number; amount: number }>;

type FinancialPeriod = {
  revenue: number;
  shipments: number;
  shipmentsPaid: number;
  assistedCount: number;
  assistanceRevenue: number;
  printingRevenue: number;
  commissions: number;
  homeDeliveryCount: number;
  relayDeliveryCount: number;
  paymentBreakdown: PaymentBreakdownMap;
};

type FinancialAggregates = {
  today: FinancialPeriod;
  week: FinancialPeriod;
  month: FinancialPeriod;
};

type RelayStatsState = {
  pendingPickups: number;
  pendingDeliveries: number;
  completedToday: number;
  monthlyRevenue: number;
  updatedAt: string | null;
  financials: FinancialAggregates;
};

type EnrichedShipment = ShipmentItem & {
  computedAmount: number;
  createdDate: Date;
  paymentMethodKey: string;
  paymentMethodLabel: string;
  deliveryModeLabel: string;
  serviceTypeLabel: string;
};

type RevenueMetrics = {
  day: number;
  week: number;
  month: number;
  total: number;
  paymentMap: Map<string, number>;
  assistedCount: number;
  assistanceRevenue: number;
  printingRevenue: number;
  commissionTotal: number;
  relayCount: number;
  homeCount: number;
};

type PaymentBreakdownItem = {
  method: string;
  label: string;
  amount: number;
  count: number;
};

interface InvoiceRow {
  shipment: EnrichedShipment;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  serviceType: string;
  createdDate: Date;
}

interface BordereauRow {
  shipment: EnrichedShipment;
  tracking: string;
  createdDate: Date;
  deliveryMode: string;
  packageType: string;
  amount: number;
  weight?: number | null;
}

interface RelaySettingsForm {
  name: string;
  manager: string;
  phone: string;
  email: string;
  commune: string;
  quartier: string;
  address: string;
  description: string;
  hasPrinter: boolean;
  hasComputer: boolean;
  hasInternet: boolean;
  smartphone: boolean;
  scanner: boolean;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

const DESKTOP_TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: "Vue d'ensemble", icon: Clock },
  { id: 'paiements', label: 'Paiements', icon: Wallet },
  { id: 'colis', label: 'Colis', icon: Package },
  { id: 'assistance', label: 'Assister un client', icon: HelpCircle },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

const MOBILE_TABS: typeof DESKTOP_TABS = DESKTOP_TABS;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  moov_money: 'Moov Money',
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
  relay_cash: 'Paiement lors de la prise en charge',
  stripe: 'Carte bancaire',
  promo_code: 'Code promo',
};

// Fonction pour obtenir le libellé détaillé selon le lieu de collecte
const getPaymentMethodLabelWithLocation = (paymentMethod: string, collectionLocation?: string): string => {
  if (paymentMethod === 'relay_cash') {
    if (collectionLocation === 'relay') {
      return 'Paiement lors de la prise en charge (au point relais)';
    } else if (collectionLocation === 'transporter') {
      return 'Paiement lors de la prise en charge (avec le transporteur)';
    }
    return 'Paiement lors de la prise en charge';
  }
  return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
};

const formatCurrency = (value: number) => (Number.isFinite(value) ? value : 0).toLocaleString('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatDateTime = (date: Date) => date.toLocaleString('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const escapeHtml = (input: unknown): string => {
  if (input === null || input === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(input);
  return div.innerHTML;
};

const dedupeShipments = (items: ShipmentItem[]): ShipmentItem[] => {
  return items.reduce<ShipmentItem[]>((acc, current) => {
    const existingIndex = acc.findIndex((item) => item.id === current.id);
    if (existingIndex === -1) {
      acc.push(current);
      return acc;
    }

    const existing = acc[existingIndex];
    acc[existingIndex] = {
      ...existing,
      ...current,
      current_status: normalizeShipmentStatus(current.current_status ?? existing.current_status ?? current.status),
      payment_status: normalizePaymentStatus(current.payment_status ?? existing.payment_status),
    };

    return acc;
  }, []);
};

const toNumeric = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return 0;
};

const enrichShipment = (shipment: ShipmentItem): EnrichedShipment => {
  const createdDate = new Date(shipment.created_at);
  const paymentKey = (shipment.payment_method || 'non renseigné').toString().trim().toLowerCase();
  
  // Récupérer collection_location depuis relay_cash_payment si disponible
  const collectionLocation = (shipment as any)?.relay_cash_payment?.collection_location;
  
  // Utiliser getPaymentMethodLabelWithLocation pour les paiements relay_cash
  const paymentMethodLabel = paymentKey === 'relay_cash' 
    ? getPaymentMethodLabelWithLocation(shipment.payment_method || '', collectionLocation)
    : (PAYMENT_METHOD_LABELS[paymentKey] || getPaymentMethodLabel(shipment.payment_method || ''));
  
  const deliveryModeLabel = shipment.home_delivery ? 'Livraison domicile' : 'Point relais';
  const serviceTypeLabel = shipment.relay_assisted
    ? 'Dépôt assisté'
    : shipment.home_delivery
    ? 'Livraison domicile'
    : 'Point relais';
  const computedAmount = toNumeric(shipment.price) + toNumeric(shipment.printing_fee) + toNumeric(shipment.assistance_fee) + toNumeric(shipment.box_price);

  return {
    ...shipment,
    computedAmount,
    createdDate,
    paymentMethodKey: paymentKey,
    paymentMethodLabel,
    deliveryModeLabel,
    serviceTypeLabel,
  };
};

const createEmptyFinancialPeriod = (): FinancialPeriod => ({
  revenue: 0,
  shipments: 0,
  shipmentsPaid: 0,
  assistedCount: 0,
  assistanceRevenue: 0,
  printingRevenue: 0,
  commissions: 0,
  homeDeliveryCount: 0,
  relayDeliveryCount: 0,
  paymentBreakdown: {},
});

const createEmptyFinancials = (): FinancialAggregates => ({
  today: createEmptyFinancialPeriod(),
  week: createEmptyFinancialPeriod(),
  month: createEmptyFinancialPeriod(),
});

const cloneFinancialPeriod = (period: FinancialPeriod): FinancialPeriod => ({
  revenue: period.revenue,
  shipments: period.shipments,
  shipmentsPaid: period.shipmentsPaid,
  assistedCount: period.assistedCount,
  assistanceRevenue: period.assistanceRevenue,
  printingRevenue: period.printingRevenue,
  commissions: period.commissions,
  homeDeliveryCount: period.homeDeliveryCount,
  relayDeliveryCount: period.relayDeliveryCount,
  paymentBreakdown: { ...period.paymentBreakdown },
});

const cloneFinancials = (aggregates: FinancialAggregates): FinancialAggregates => ({
  today: cloneFinancialPeriod(aggregates.today),
  week: cloneFinancialPeriod(aggregates.week),
  month: cloneFinancialPeriod(aggregates.month),
});

const COLIS_STEP_LABEL: Record<string, { label: string; sub: string }> = {
  READY_FOR_DROP_OFF:              { label: 'Commande créée',        sub: 'En attente de dépôt' },
  PAYMENT_AWAITING_VALIDATION:     { label: 'Commande créée',        sub: 'En attente de dépôt' },
  PAYMENT_CONFIRMED_AWAITING_DROP: { label: 'Commande créée',        sub: 'En attente de dépôt' },
  PAYMENT_PENDING_AT_RELAY:        { label: 'Commande créée',        sub: 'En attente de dépôt' },
  PICKUP_PENDING:                  { label: 'Commande créée',        sub: 'En attente de ramassage' },
  RELAY_ORIGIN_RECEIVED:           { label: 'Déposé au relais',      sub: 'Pris en charge au départ' },
  PAYMENT_RECEIVED_AT_RELAY:       { label: 'Déposé au relais',      sub: 'Pris en charge au départ' },
  PAYMENT_VALIDATED:               { label: 'Déposé au relais',      sub: 'Pris en charge au départ' },
  CARRIER_COLLECTED:               { label: 'En transit',            sub: 'Acheminement en cours' },
  IN_TRANSIT:                      { label: 'En transit',            sub: 'Acheminement en cours' },
  RELAY_FINAL_RECEIVED:            { label: 'Au relais de livraison', sub: 'Disponible au retrait' },
  AVAILABLE_FOR_PICKUP:            { label: 'Au relais de livraison', sub: 'Disponible au retrait' },
  PICKED_UP_BY_CUSTOMER:           { label: 'Retiré',                sub: 'Livraison terminée' },
  DELIVERED:                       { label: 'Livré à domicile',      sub: 'Livraison terminée' },
  DELIVERED_TO_CUSTOMER:           { label: 'Livré à domicile',      sub: 'Livraison terminée' },
  CANCELLED:                       { label: 'Annulé',                sub: '' },
  RETURN_TO_SENDER:                { label: 'Retour expéditeur',     sub: '' },
  PAYMENT_REJECTED:                { label: 'Paiement refusé',       sub: '' },
};

const getPaymentMethodLabel = (method: string) => {
  if (!method) return 'Non renseigné';
  const key = method.toString().trim().toLowerCase();
  if (PAYMENT_METHOD_LABELS[key]) return PAYMENT_METHOD_LABELS[key];
  // Si la méthode contient des underscores, essayer de les remplacer par des espaces et capitaliser
  const formatted = key.replace(/_/g, ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  return formatted;
};

const buildFinancialsFromShipments = (shipments: ShipmentItem[], relayId: string): FinancialAggregates => {
  if (shipments.length === 0) {
    return createEmptyFinancials();
  }

  const enriched = shipments
    .filter((shipment) => shipment.origin_relay_id === relayId)
    .map((shipment) => enrichShipment(shipment));

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86399999); // end of current day
  const startOfWeek = new Date(startOfDay);
  const diffToMonday = (startOfDay.getDay() + 6) % 7; // Monday as first day
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const aggregateForRange = (start: Date) => {
    const period = createEmptyFinancialPeriod();
    enriched.forEach((shipment) => {
      if (shipment.createdDate < start || shipment.createdDate > endOfDay) {
        return;
      }

      period.shipments += 1;
      const isPaid = normalizePaymentStatus(shipment.payment_status) === 'paid';
      if (isPaid) {
        period.shipmentsPaid += 1;
        period.revenue += shipment.computedAmount;
        const key = shipment.paymentMethodKey || 'unknown';
        if (!period.paymentBreakdown[key]) {
          period.paymentBreakdown[key] = { count: 0, amount: 0 };
        }
        period.paymentBreakdown[key].count += 1;
        period.paymentBreakdown[key].amount += shipment.computedAmount;
      }

      const assistanceFeeValue = toNumeric(shipment.assistance_fee);
      const printingFeeValue = toNumeric(shipment.printing_fee);
      if (shipment.relay_assisted) {
        period.assistedCount += 1;
        period.assistanceRevenue += assistanceFeeValue;
      }
      period.printingRevenue += printingFeeValue;
      period.commissions += assistanceFeeValue + printingFeeValue;
      if (shipment.home_delivery) period.homeDeliveryCount += 1;
      else period.relayDeliveryCount += 1;
    });
    return period;
  };

  return {
    today: aggregateForRange(startOfDay),
    week: aggregateForRange(startOfWeek),
    month: aggregateForRange(startOfMonth),
  };
};

function RelayDashboard({ onNavigate }: RelayDashboardProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<RelayStatsState>({
    pendingPickups: 0,
    pendingDeliveries: 0,
    completedToday: 0,
    monthlyRevenue: 0,
    updatedAt: null,
    financials: createEmptyFinancials(),
  });
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [activeShipments, setActiveShipments] = useState<ShipmentItem[]>([]);
  const [relayPointData, setRelayPointData] = useState<any>(null);
  const [zoneDetails, setZoneDetails] = useState<any>(null);
  const [relayCode, setRelayCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanActionModal, setScanActionModal] = useState(false);
  const [scannedShipment, setScannedShipment] = useState<ShipmentItem | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [transporterShipments, setTransporterShipments] = useState<ShipmentItem[]>([]);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [isShipmentActionModalOpen, setIsShipmentActionModalOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [transporterShipmentsLoading, setTransporterShipmentsLoading] = useState(false);
  const [phoneShipments, setPhoneShipments] = useState<ShipmentItem[]>([]);
  const [isPhoneShipmentsModalOpen, setIsPhoneShipmentsModalOpen] = useState(false);
  const [phoneShipmentsLoading, setPhoneShipmentsLoading] = useState(false);
  const [lastSearchedPhone, setLastSearchedPhone] = useState<string>('');
  const [receivingShipment, setReceivingShipment] = useState<string | null>(null);
  const [pickupCodeForDelivery, setPickupCodeForDelivery] = useState('');
  const [rejectingTrackingNumber, setRejectingTrackingNumber] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [phoneModalPickupCodes, setPhoneModalPickupCodes] = useState<Record<string, string>>({});
  const [searchMessage, setSearchMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [relayPointName, setRelayPointName] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stats: true,
    scanner: true,
    colisActifs: true,
    paiements: false,
    factures: false,
    impression: false,
    assistance: false,
    settings: false,
  });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePeriod, setInvoicePeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<'all' | string>('all');
  const [slipSearch, setSlipSearch] = useState('');
  const [slipPeriod, setSlipPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [slipDeliveryFilter, setSlipDeliveryFilter] = useState<'all' | 'relay' | 'home'>('all');
  const [colisSubTab, setColisSubTab] = useState<ColisSubTab>('en_cours');
  const [colisSearch, setColisSearch] = useState('');
  const [showAssistForm, setShowAssistForm] = useState(false);
  const [settingsForm, setSettingsForm] = useState<RelaySettingsForm>({
    name: '',
    manager: '',
    phone: '',
    email: '',
    commune: '',
    quartier: '',
    address: '',
    description: '',
    hasPrinter: false,
    hasComputer: false,
    hasInternet: true,
    smartphone: false,
    scanner: false,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [cashPaymentConfirmed, setCashPaymentConfirmed] = useState(false);
  const [cashConfirmationLoading, setCashConfirmationLoading] = useState(false);
  const [scanReturnLoading, setScanReturnLoading] = useState(false);
  const [scanIncidentFormOpen, setScanIncidentFormOpen] = useState(false);
  const [scanIncidentType, setScanIncidentType] = useState('colis_endommage');
  const [scanIncidentDesc, setScanIncidentDesc] = useState('');
  const [scanIncidentLoading, setScanIncidentLoading] = useState(false);

  const handleStatusFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
  };
  
  // Fonction pour détecter si c'est un UUID (ID transporteur) ou un numéro de colis
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fonction pour charger les colis d'un transporteur
  const loadTransporterShipments = async (transporterId: string) => {
    
    if (!user?.relay_point_id) {
      console.error('[RelayDashboard] No relay_point_id for user');
      toast.error('Erreur : Votre compte point relais n\'est pas associé à un point relais.');
      return;
    }


    setTransporterShipmentsLoading(true);
    try {
      const { data, error } = await api.getTransporterShipmentsAtRelay(transporterId, user.relay_point_id);

      if (error) {
        console.error('[RelayDashboard] API error:', error);
        toast.error(error || 'Erreur lors du chargement des colis du transporteur.');
        setTransporterShipments([]);
        setSelectedTransporterId(null);
        setTransporterShipmentsLoading(false);
        return;
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        toast.warning('Aucun colis trouvé pour ce transporteur à ce point relais (ni à ramasser, ni à livrer).');
        setTransporterShipments([]);
        setSelectedTransporterId(null);
        setTransporterShipmentsLoading(false);
        return;
      }
      // Filtrer les colis : on ne garde que ceux actionnables par le transporteur
      // - Exclure les colis livrés / déjà réceptionnés destination
      // - Exclure les colis en attente de dépôt client (READY_FOR_DROP_OFF, PAYMENT_CONFIRMED_AWAITING_DROP)
      //   → ceux-ci ne doivent apparaître QUE sur recherche par N° de colis ou téléphone client
      const AWAITING_DEPOSIT = new Set([
        'READY_FOR_DROP_OFF',
        'PAYMENT_AWAITING_VALIDATION',
        'PAYMENT_VALIDATED',
        'PAYMENT_CONFIRMED_AWAITING_DROP',
      ]);
      const filteredShipments = (data as ShipmentItem[]).filter((shipment) => {
        const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
        if (AWAITING_DEPOSIT.has(status)) return false;
        if (status === 'DELIVERED' || status === 'DELIVERED_TO_CUSTOMER' || status === 'PICKED_UP_BY_CUSTOMER') return false;
        if (status === 'RELAY_FINAL_RECEIVED' || status === 'AVAILABLE_FOR_PICKUP') return false;
        return true;
      });
      
      if (filteredShipments.length === 0) {
        toast.warning('Aucun colis trouvé pour ce transporteur à ce point relais (ni à ramasser, ni à livrer).');
        setTransporterShipments([]);
        setSelectedTransporterId(null);
        setTransporterShipmentsLoading(false);
        return;
      }
      
      // Enrichir les colis trouvés
      const enrichedShipments = filteredShipments.map((s: any) => enrichShipment(s));
      
      // Stocker les colis dans transporterShipments et ouvrir le modal pour que le point relais puisse choisir
      setTransporterShipments(enrichedShipments);
      setSelectedTransporterId(transporterId);
      setIsTransporterModalOpen(true);
      setTrackingInput('');
    } catch (error) {
      console.error('[RelayDashboard] Error loading transporter shipments:', error);
      const message = error instanceof Error ? error.message : null;
      toast.error(message || 'Erreur lors du chargement des colis du transporteur.');
    } finally {
      setTransporterShipmentsLoading(false);
    }
  };

  // Fonction pour rechercher un transporteur par identifiant et charger ses colis
  const findAndLoadTransporterShipments = async (identifier: string) => {
    
    if (!user?.relay_point_id) {
      toast.error('Erreur : Votre compte point relais n\'est pas associé à un point relais.');
      return;
    }

    setTransporterShipmentsLoading(true);
    try {
      // D'abord, trouver le transporteur par son identifiant
      const { data: transporterData, error: findError } = await api.findTransporterByIdentifier(identifier);
      
      if (findError) {
        console.error('[RelayDashboard] Error finding transporter:', findError);
        toast.error(findError || 'Transporteur non trouvé avec cet identifiant.');
        setTransporterShipmentsLoading(false);
        return;
      }

      if (!transporterData || !transporterData.transporter_id) {
        toast.error('Transporteur non trouvé avec cet identifiant.');
        setTransporterShipmentsLoading(false);
        return;
      }
      // Ensuite, charger les colis du transporteur trouvé
      await loadTransporterShipments(transporterData.transporter_id);
    } catch (error) {
      console.error('[RelayDashboard] Error in findAndLoadTransporterShipments:', error);
      const message = error instanceof Error ? error.message : null;
      toast.error(message || 'Erreur lors de la recherche du transporteur.');
      setTransporterShipmentsLoading(false);
    }
  };

  // Fonction pour charger les colis par numéro de téléphone
  const loadShipmentsByPhone = async (phone: string) => {
    
    // Effacer le message précédent
    setSearchMessage(null);
    
    // Vérifier que le numéro de téléphone n'est pas vide
    if (!phone || phone.trim() === '') {
      console.error('Phone number is empty');
      toast.error('Numéro de téléphone invalide');
      setPhoneShipmentsLoading(false);
      return;
    }
    
    setPhoneShipmentsLoading(true);
    try {
      const { data, error } = await api.searchShipmentsByPhone(phone);
      
      if (error) {
        console.error('API error:', error);
        throw new Error(error);
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        setPhoneShipments([]);
        setIsPhoneShipmentsModalOpen(false);
        setSearchMessage({
          type: 'info',
          text: 'Il n\'y a plus de colis à déposer associé à ce numéro de téléphone.'
        });
        setPhoneShipmentsLoading(false);
        setTrackingInput('');
        // Effacer le message après 5 secondes
        setTimeout(() => setSearchMessage(null), 5000);
        return;
      }
      // Enrichir les shipments
      const enriched = data.map((s: any) => enrichShipment(s));
      
      // Filtrer uniquement les colis déjà réceptionnés à l'origine (ils sont visibles dans "Colis actifs")
      // On garde RELAY_FINAL_RECEIVED et AVAILABLE_FOR_PICKUP car le destinataire vient retirer ici
      const shipmentsNeedingAction = enriched.filter((s: ShipmentItem) => {
        const shipmentStatus = normalizeShipmentStatus(s.current_status ?? s.status);
        return shipmentStatus !== 'RELAY_ORIGIN_RECEIVED';
      });

      // Si tous les colis sont déjà traités (uniquement déposés), afficher un message
      if (shipmentsNeedingAction.length === 0 && enriched.length > 0) {
        setPhoneShipments([]);
        setSearchMessage({
          type: 'info',
          text: 'Tous les colis associés à ce numéro de téléphone ont déjà été traités.'
        });
        setPhoneShipmentsLoading(false);
        setTrackingInput('');
        setTimeout(() => setSearchMessage(null), 5000);
        return;
      }

      setSearchMessage(null);
      setPhoneShipments(shipmentsNeedingAction.length > 0 ? shipmentsNeedingAction : enriched);
      setIsPhoneShipmentsModalOpen(true);
      setLastSearchedPhone(phone);
      setTrackingInput('');
      toast.success(`${shipmentsNeedingAction.length > 0 ? shipmentsNeedingAction.length : enriched.length} colis trouvé(s).`);
    } catch (error) {
      console.error('Error in loadShipmentsByPhone:', error);
      const message = error instanceof Error ? error.message : null;
      toast.error(message || 'Erreur lors de la recherche par numéro de téléphone.');
    } finally {
      setPhoneShipmentsLoading(false);
    }
  };

  // Fonction pour valider et afficher les infos du colis ou du transporteur
  const handleValidate = async (value?: string) => {
    // Effacer le message précédent au début d'une nouvelle recherche
    setSearchMessage(null);
    const input = (value ?? trackingInput).trim();
    if (!input) {
      toast.error('Veuillez saisir un numéro');
      return;
    }

    // Vérifier si c'est un UUID (ID transporteur ou ID utilisateur)
    if (isUUID(input)) {
      await loadTransporterShipments(input);
      return;
    }
    
    // Vérifier si c'est un numéro de téléphone EN PREMIER (avant les identifiants numériques)
    // Nettoyer les espaces et caractères spéciaux
    const cleanPhone = input.replace(/[\s\-\(\)\.]/g, '');
    // Vérifier si c'est un numéro de téléphone (9 chiffres minimum, peut commencer par +225, 225, 0, ou directement 9 chiffres)
    const phoneRegex = /^(\+225|225|0)?[0-9]{9,}$/;
    const isPhone = phoneRegex.test(cleanPhone);
    
    if (isPhone) {
      // Extraire le numéro (les 9 derniers chiffres après le préfixe)
      const phoneNumber = cleanPhone.replace(/^(\+225|225)/, '').replace(/^0/, '');
      if (phoneNumber.length >= 9 && phoneNumber.length <= 10) {
        await loadShipmentsByPhone(phoneNumber);
        return;
      } else {
        toast.error('Numéro de téléphone invalide (9 ou 10 chiffres requis)');
        return;
      }
    }
    
    // Vérifier si c'est un identifiant numérique court (peut être un ID utilisateur ou autre)
    // Si ce n'est ni un téléphone ni un numéro de colis, essayer comme identifiant transporteur
    // Exclure les numéros qui ressemblent à des téléphones (9-10 chiffres après nettoyage)
    const isNumericId = /^[0-9]+$/.test(input);
    if (isNumericId && input.length >= 6 && input.length <= 20) {
      // Si c'est exactement 9 ou 10 chiffres, ne pas le traiter comme identifiant (c'est probablement un téléphone mal formaté)
      if (input.length === 9 || input.length === 10) {
        await loadShipmentsByPhone(input.replace(/^0/, ''));
        return;
      }
      await findAndLoadTransporterShipments(input);
      return;
    }

    // Sinon, c'est un numéro de colis (tracking_number ou pickup_code)
    try {
      // L'endpoint /tracking/:trackingNumber gère maintenant les deux cas
      // Si c'est un code à 6 chiffres, il cherche par pickup_code
      // Sinon, il cherche par tracking_number
      let { data, error } = await api.getTracking(input);

      if (error || !data) {
        toast.error('Colis introuvable avec ce numéro. Vérifiez le numéro de suivi ou le code à 6 chiffres.');
        return;
      }

      let shipment: ShipmentItem | null = null;
      if (data && typeof data === 'object') {
        if ('shipment' in data && data.shipment && typeof data.shipment === 'object') {
          shipment = data.shipment as ShipmentItem;
        } else if ('tracking_number' in data || 'id' in data) {
          // C'est directement un shipment
          shipment = data as ShipmentItem;
        } else {
          // Essayer de trouver shipment dans les propriétés
          const keys = Object.keys(data);
          if (keys.length > 0) {
            shipment = data as ShipmentItem;
          }
        }
      }

      if (!shipment || !shipment.id) {
        toast.error('Colis introuvable avec ce numéro. Vérifiez le numéro de suivi ou le code à 6 chiffres.');
        return;
      }

      // Vérifier que le colis est bien lié à ce point relais
      const relayId = user?.relay_point_id;
      if (relayId) {
        const shipmentStatus = normalizeShipmentStatus((shipment as any).current_status ?? (shipment as any).status);
        const isDepositStatus = shipmentStatus === 'READY_FOR_DROP_OFF' ||
          shipmentStatus === 'PAYMENT_AWAITING_VALIDATION' ||
          shipmentStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP';
        const originRelayId = (shipment as any).origin_relay_id;
        const destRelayId = (shipment as any).destination_relay_id;
        // Utiliser String() pour éviter les faux négatifs dus au type number (DB) vs string (user context)
        const isAtOrigin = originRelayId != null && String(originRelayId) === String(relayId);
        const isAtDest   = destRelayId   != null && String(destRelayId)   === String(relayId);
        // Flux client normal : origin_relay_id null = colis pas encore déposé, tout relais peut l'accueillir
        // Y compris livraison à domicile avec dépôt en relais (home_delivery=true mais pas d'origine assignée)
        const canReceiveUnassigned = !originRelayId && isDepositStatus;
        if (!isAtOrigin && !isAtDest && !canReceiveUnassigned) {
          if (isDepositStatus) {
            toast.error('Ce colis doit être déposé dans un autre point relais.');
          } else {
            toast.error('Ce colis ne concerne pas votre point relais.');
          }
          return;
        }
      }

      // S'assurer que le shipment a toutes les propriétés nécessaires
      const normalizedPayment = normalizePaymentStatus(shipment.payment_status);
      const preparedShipment = enrichShipment({
        ...shipment,
        payment_status: normalizedPayment,
      });
      setTrackingInput(input);
      // Réinitialiser l'état de confirmation du paiement avant d'ouvrir le modal
      setCashPaymentConfirmed(false);
      setCashConfirmationLoading(false);
      setScannedShipment(preparedShipment);
      setIsShipmentActionModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message || 'Erreur lors du chargement du colis. Vérifiez le numéro de suivi.');
    }
  };

  // Ouverture du modal d'action après scan/saisie (conservé pour compatibilité)
  async function openScanAction(value?: string) {
    await handleValidate(value);
  }

  const processScanPayload = async (rawValue: string) => {
    let tn = rawValue.trim();
    let hash: string | null = null;

    if (!tn) return;

    try {
      const parsed = JSON.parse(tn);
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        const trackingValue =
          record['tracking'] || record['tracking_number'] || record['trackingNumber'];
        const hashValue = record['qr_code_hash'] || record['hash'];

        if (trackingValue) {
          tn = String(trackingValue);
        } else if (hashValue) {
          hash = String(hashValue);
        }
      }
    } catch {
      // not JSON
    }

    if (/https?:\/\//i.test(tn)) {
      try {
        const url = new URL(tn);
        const q = url.searchParams.get('tracking')
          || url.searchParams.get('tracking_number')
          || url.searchParams.get('trackingNumber');
        const hashParam = url.searchParams.get('qr_code_hash') || url.searchParams.get('hash');
        if (q) {
          tn = q;
        } else if (hashParam) {
          hash = hashParam;
        }
      } catch {
        // ignore invalid URLs
      }
    }

    tn = tn.replace(/\s+/g, '').toUpperCase();

    if (!tn && hash) {
      tn = '';
    }

    if (tn) {
      await openScanAction(tn);
        return;
      }
      
    if (hash) {
      const { data, error } = await api.scanQRCode(hash, user?.relay_point_id || undefined);
      if (error || !data) {
        toast.error(error || 'QR code invalide ou non reconnu');
        return;
      }

      try {
        const payload = data as Record<string, unknown>;
        const qrCodeData = payload['qr_code_data'];
        if (qrCodeData) {
          const parsed =
            typeof qrCodeData === 'string'
              ? JSON.parse(qrCodeData)
              : (qrCodeData as Record<string, unknown>);
          if (parsed && typeof parsed === 'object') {
            const parsedRecord = parsed as Record<string, unknown>;
            const trackingValue =
              parsedRecord['tracking'] ||
              parsedRecord['tracking_number'] ||
              parsedRecord['trackingNumber'];
            if (trackingValue) {
              await openScanAction(String(trackingValue));
              return;
            }
          }
        }
      } catch {
        // ignore parse error
      }

      const shipmentId = (data as Record<string, unknown>)['shipment_id'];
      if (shipmentId) {
        toast.error('QR code reconnu mais le numéro de suivi est manquant. Veuillez saisir le numéro manuellement.');
        return;
      }
    }

    toast.error('Impossible de lire le QR code. Veuillez saisir le numéro de suivi manuellement.');
  };

  const loadDashboardData = useCallback(async () => {
    if (!user?.relay_point_id) {
      console.error('User relay_partner does not have a relay_point_id assigned');
      toast.error('Votre compte n\'est pas associé à un point relais. Veuillez contacter l\'administrateur.');
      return;
    }
      
    const relayId = user.relay_point_id;

    try {
      setLoading(true);

        try {
          // Load relay point profile with code
          try {
            const { data: relayProfile, error: profileError } = await api.getMyRelayPoint();
            if (!profileError && relayProfile) {
              setRelayCode(relayProfile.relay_code || null);
            } else if (profileError) {
              console.warn('Could not load relay profile:', profileError);
            }
          } catch (profileErr) {
            console.warn('Error loading relay profile (non-critical):', profileErr);
            // Non-critical error, continue loading other data
          }
          
          const { data: relayPoint, error: relayError } = await api.getRelayPoint(relayId);
          if (!relayError && relayPoint) {
            setRelayPointData(relayPoint);
          setRelayPointName((relayPoint as { name?: string } | null)?.name || '');

          const zoneId = (relayPoint as Record<string, unknown>)?.['zone_id'];
          if (zoneId && typeof zoneId === 'string') {
            try {
              const { data: zoneData } = await api.getDeliveryZone(zoneId);
              setZoneDetails(zoneData || null);
            } catch (zoneError) {
              console.warn('Error loading zone details:', zoneError);
              setZoneDetails(null);
            }
        } else {
            setZoneDetails(null);
          }
        }
      } catch (relayError) {
        console.error('Error loading relay point:', relayError);
      }
 
      const toSafeNumber = (value: unknown) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        if (typeof value === 'bigint') {
          return Number(value);
        }
        return 0;
      };

      const toSafeInteger = (value: unknown) => Math.max(0, Math.round(toSafeNumber(value)));

      const parseFinancialPeriod = (input: unknown): FinancialPeriod => {
        const period = createEmptyFinancialPeriod();
        if (!input || typeof input !== 'object') {
          return period;
        }
        const payload = input as Record<string, unknown>;
        period.revenue = toSafeNumber(payload['revenue'] ?? payload['revenue_total']);
        period.shipments = toSafeInteger(payload['shipments'] ?? payload['shipments_total']);
        period.shipmentsPaid = toSafeInteger(payload['shipmentsPaid'] ?? payload['shipments_paid']);
        period.assistedCount = toSafeInteger(payload['assistedCount'] ?? payload['assisted_count']);
        period.assistanceRevenue = toSafeNumber(payload['assistanceRevenue'] ?? payload['assistance_revenue']);
        period.printingRevenue = toSafeNumber(payload['printingRevenue'] ?? payload['printing_revenue']);
        period.commissions = toSafeNumber(payload['commissions'] ?? payload['commissions_total']);
        period.homeDeliveryCount = toSafeInteger(payload['homeDeliveryCount'] ?? payload['home_delivery_count']);
        period.relayDeliveryCount = toSafeInteger(payload['relayDeliveryCount'] ?? payload['relay_delivery_count']);
        const paymentRaw = payload['paymentBreakdown'] ?? payload['payment_breakdown'];
        if (paymentRaw && typeof paymentRaw === 'object') {
          Object.entries(paymentRaw as Record<string, unknown>).forEach(([method, info]) => {
            const infoObj = (info ?? {}) as Record<string, unknown>;
            period.paymentBreakdown[method] = {
              count: toSafeInteger(infoObj['count']),
              amount: toSafeNumber(infoObj['amount']),
            };
          });
        }
        return period;
      };

      let serverStats: RelayStatsState | null = null;

      try {
        const { data: statsData, error: statsError } = await api.getRelayPointStats(relayId);
        if (statsError) {
          console.error('Error loading relay stats:', statsError);
        } else if (statsData && typeof statsData === 'object') {
          const statsPayload = statsData as Record<string, unknown>;
          const updatedAtRaw = statsPayload['updated_at'] ?? statsPayload['updatedAt'];
          const financialsPayload = statsPayload['financials'];
          let parsedFinancials = createEmptyFinancials();
          if (financialsPayload && typeof financialsPayload === 'object') {
            const financialsObject = financialsPayload as Record<string, unknown>;
            parsedFinancials = {
              today: parseFinancialPeriod(financialsObject['today']),
              week: parseFinancialPeriod(financialsObject['week']),
              month: parseFinancialPeriod(financialsObject['month']),
            };
          }

          serverStats = {
            pendingPickups: toSafeInteger(statsPayload['pending_pickups'] ?? statsPayload['pendingPickups']),
            pendingDeliveries: toSafeInteger(statsPayload['pending_deliveries'] ?? statsPayload['pendingDeliveries']),
            completedToday: toSafeInteger(statsPayload['completed_today'] ?? statsPayload['completedToday']),
            monthlyRevenue: parsedFinancials.month.revenue,
            updatedAt: typeof updatedAtRaw === 'string' ? updatedAtRaw : null,
            financials: parsedFinancials,
          };
        }
      } catch (statsError) {
        console.error('Unexpected error loading relay stats:', statsError);
      }

      const [shipmentsResult, activeShipmentsResult] = await Promise.all([
        api.getShipments({ relay_id: relayId }),
        api.getRelayActiveShipments(relayId),
      ]);

      if (shipmentsResult.error) {
        console.error('Error loading shipments:', shipmentsResult.error);
      }
      if (activeShipmentsResult.error) {
        console.error('Error loading active shipments:', activeShipmentsResult.error);
      }

      const typedShipments = Array.isArray(shipmentsResult.data)
        ? (shipmentsResult.data as ShipmentItem[])
        : [];

      const normalizedShipments = typedShipments.map((shipment) => ({
        ...shipment,
        current_status: normalizeShipmentStatus(shipment.current_status ?? shipment.status),
        payment_status: normalizePaymentStatus(shipment.payment_status),
      }));

      const relayShipments = normalizedShipments.filter((shipment) => {
        const matchesOrigin = shipment.origin_relay_id === relayId;
        const matchesDestination = shipment.destination_relay_id === relayId;
        return matchesOrigin || matchesDestination;
      });

      const typedActiveShipments = Array.isArray(activeShipmentsResult.data)
        ? (activeShipmentsResult.data as ShipmentItem[])
        : [];

      const normalizedActiveShipments = typedActiveShipments.map((shipment) => ({
        ...shipment,
        current_status: normalizeShipmentStatus(shipment.current_status ?? shipment.status),
        payment_status: normalizePaymentStatus(shipment.payment_status),
      }));

      const uniqueActiveShipments = dedupeShipments(normalizedActiveShipments);
      const uniqueAllShipments = dedupeShipments(relayShipments);


      // Colis "à réceptionner" = READY_FOR_DROP_OFF sans origin_relay_id
      // (dépôt libre dans le réseau — tout relais peut les accueillir via scan)
      const pendingPickups = relayShipments.filter((shipment) => {
        const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
        const hasNoOriginRelay = !shipment.origin_relay_id;
        return status === 'READY_FOR_DROP_OFF' && hasNoOriginRelay;
      }).length;

      const pendingDeliveries = relayShipments.filter((shipment) => {
        if (shipment.destination_relay_id !== relayId) return false;
        const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
        return status === 'IN_TRANSIT' || status === 'CARRIER_COLLECTED';
      }).length;

      const today = new Date().toDateString();
      const completedToday = relayShipments.filter((shipment) => {
        const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
        const isCompleted =
          status === 'DELIVERED' ||
          status === 'DELIVERED_TO_CUSTOMER' ||
          status === 'PICKED_UP_BY_CUSTOMER';
        const timestamp = shipment.updated_at || shipment.created_at;
        const isToday = new Date(timestamp).toDateString() === today;
        return isCompleted && isToday;
      }).length;

      const fallbackFinancials = buildFinancialsFromShipments(uniqueAllShipments, relayId);

      setActiveShipments(uniqueActiveShipments);
      setShipments(uniqueAllShipments);

      const fallbackStats: RelayStatsState = {
        pendingPickups,
        pendingDeliveries,
        completedToday,
        monthlyRevenue: fallbackFinancials.month.revenue,
        updatedAt: serverStats?.updatedAt ?? null,
        financials: fallbackFinancials,
      };

      const finalStats = serverStats
        ? {
            ...serverStats,
            financials: cloneFinancials(serverStats.financials),
            monthlyRevenue: serverStats.financials.month.revenue,
          }
        : {
            ...fallbackStats,
            financials: cloneFinancials(fallbackStats.financials),
          };

      setStats(finalStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'relay_partner') {
      onNavigate('login');
        return;
      }

    if (!user?.relay_point_id) {
      console.error('User relay_partner does not have a relay_point_id assigned');
      toast.error('Votre compte n\'est pas associé à un point relais. Veuillez contacter l\'administrateur.');
      return;
    }
          
    loadDashboardData();
  }, [user, onNavigate, loadDashboardData]);

  useEffect(() => {
    if (!relayPointData) return;
    setSettingsForm(prev => ({
      ...prev,
      name: relayPointData.name || '',
      manager: relayPointData.manager_name || relayPointData.contact_name || '',
      phone: relayPointData.phone || '',
      email: relayPointData.email || '',
      commune: relayPointData.commune || '',
      quartier: relayPointData.quartier || '',
      address: relayPointData.address || '',
      description: relayPointData.description || '',
      hasPrinter: Boolean(relayPointData.has_printer),
      hasComputer: Boolean(relayPointData.has_computer),
      hasInternet: relayPointData.has_internet !== false,
      smartphone: Boolean(relayPointData.has_smartphone),
      scanner: Boolean(relayPointData.has_scanner),
    }));
  }, [relayPointData]);

  // Close mobile nav when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    
    if (mobileNavOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [mobileNavOpen]);

  const loadShipmentDetails = async (shipment: ShipmentItem): Promise<ShipmentItem | null> => {
    try {
      const { data: fullShipmentData, error: shipmentError } = await api.getShipment(shipment.id);
      if (shipmentError || !fullShipmentData || typeof fullShipmentData !== 'object') {
        toast.error("Impossible de charger les détails du colis.");
        console.error('Error loading shipment:', shipmentError);
        return null;
      }
      return fullShipmentData as ShipmentItem;
    } catch (error) {
      console.error('Unexpected error loading shipment:', error);
      toast.error("Erreur inattendue lors du chargement du colis.");
      return null;
    }
  };

  // Ouvrir le modal de détails/action pour un colis déjà chargé dans la liste du relais.
  // Utilise directement le shipment de la liste (qui inclut origin_relay_id, destination_relay_id,
  // relay_cash_payment, effective_status…) sans appel API supplémentaire.
  const openColisDetails = (shipment: ShipmentItem) => {
    const prepared = enrichShipment({
      ...shipment,
      payment_status: normalizePaymentStatus(shipment.payment_status),
    });
    setTrackingInput(shipment.tracking_number);
    setCashPaymentConfirmed(false);
    setCashConfirmationLoading(false);
    setScannedShipment(prepared);
    setIsShipmentActionModalOpen(true);
  };

  const buildInvoiceHtml = (fullShipment: ShipmentItem, options: { autoPrint?: boolean } = {}) => {
    const { autoPrint = false } = options;
      const sender = `${fullShipment.sender_first_name ?? ''} ${fullShipment.sender_last_name ?? ''}`.trim();
      const recipient = `${fullShipment.recipient_first_name ?? ''} ${fullShipment.recipient_last_name ?? ''}`.trim();
      const invoiceNumber = `FAC-${fullShipment.tracking_number}`;
    const priceValue = toNumeric(fullShipment.price);
    const printingFeeValue = toNumeric(fullShipment.printing_fee);
    const assistanceFeeValue = toNumeric(fullShipment.assistance_fee);
    const boxPriceValue = toNumeric(fullShipment.box_price);
    const totalAmount = priceValue + printingFeeValue + assistanceFeeValue + boxPriceValue;

    const formatAmount = (value: unknown) => toNumeric(value).toLocaleString('fr-FR');

    const paymentStatus = normalizePaymentStatus(fullShipment.payment_status);
    const paymentLabel = getPaymentStatusLabel(paymentStatus);
    const paymentBadgeClass = (() => {
      switch (paymentStatus) {
        case 'paid':
          return 'status-paid';
        case 'cancelled':
          return 'status-cancelled';
        default:
          return 'status-pending';
      }
    })();

    const logoUrl = `${window.location.origin}/logo.png`;
    const onloadAttr = autoPrint ? "window.print(); setTimeout(() => window.close(), 300);" : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
          <meta http-equiv="Pragma" content="no-cache">
          <meta http-equiv="Expires" content="0">
          <base href="${window.location.origin}" />
          <title>Facture - ${escapeHtml(invoiceNumber)}</title>
          <style>
            @media print {
              @page { size: A4; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; margin: 24px; }
            .invoice { border: 2px solid #FF6C00; padding: 24px; border-radius: 12px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 15px; border-bottom: 2px solid #FF6C00; }
            .logo-container { display: flex; flex-direction: column; align-items: flex-start; }
            .logo { height: 60px; width: auto; object-fit: contain; margin-bottom: 8px; }
            .title { font-size: 28px; font-weight: bold; color: #FF6C00; }
            .date { font-size: 12px; color: #666; }
            .section { margin: 16px 0; }
            .label { color: #666; font-size: 12px; margin-bottom: 4px; }
            .value { font-weight: 600; font-size: 14px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            .total { font-size: 18px; font-weight: bold; color: #FF6C00; margin-top: 16px; padding-top: 16px; border-top: 2px solid #FF6C00; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            table th, table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            table th { background-color: #f5f5f5; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
          </style>
        </head>
        <body ${onloadAttr ? `onload="${onloadAttr}"` : ''}>
          <div class="invoice">
            <div class="header">
              <div class="logo-container">
                <img src="${logoUrl}" alt="COLISDIRECT Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div class="title" style="display: none;">COLISDIRECT</div>
                <div class="date">${escapeHtml(new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }))}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">N° de facture</div>
                <div class="value" style="font-size: 18px;">${escapeHtml(invoiceNumber)}</div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin: 24px 0;">
              <div>
                <div class="label">Expéditeur</div>
                <div class="value">${escapeHtml(sender || 'N/A')}</div>
                ${fullShipment.sender_address ? `<div style="font-size: 12px; color: #666;">${escapeHtml(fullShipment.sender_address)}</div>` : ''}
                ${fullShipment.sender_commune ? `<div style="font-size: 12px; color: #666;">${escapeHtml(fullShipment.sender_commune)}</div>` : ''}
                ${fullShipment.sender_phone ? `<div style="font-size: 12px; color: #666;">${escapeHtml(fullShipment.sender_phone)}</div>` : ''}
              </div>
              <div>
                <div class="label">Destinataire</div>
                <div class="value">${escapeHtml(recipient || 'N/A')}</div>
                ${fullShipment.recipient_address ? `<div style="font-size: 12px; color: #666;">${escapeHtml(fullShipment.recipient_address)}</div>` : ''}
                ${fullShipment.recipient_commune ? `<div style="font-size: 12px; color: #666;">${escapeHtml(fullShipment.recipient_commune)}</div>` : ''}
                ${fullShipment.recipient_phone ? `<div style="font-size: 12px; color: #666;">${escapeHtml(fullShipment.recipient_phone)}</div>` : ''}
              </div>
            </div>

            <div style="margin: 16px 0; padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div class="label">Numéro de suivi</div>
                  <div class="value" style="font-family: monospace; color: #FF6C00;">${escapeHtml(fullShipment.tracking_number || 'N/A')}</div>
                </div>
                ${fullShipment.shipment_code ? `
                <div>
                  <div class="label">Numéro d'envoi</div>
                  <div class="value" style="font-family: monospace; font-size: 18px; color: #FF6C00; font-weight: bold;">${escapeHtml(fullShipment.shipment_code)}</div>
                  <div style="font-size: 10px; color: #666; margin-top: 4px;">(À écrire sur le colis)</div>
                </div>
                ` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Expédition de colis</td>
                  <td style="text-align: right;">${formatAmount(priceValue)}</td>
                </tr>
                ${printingFeeValue ? `<tr><td>Impression au relais</td><td style="text-align: right;">${formatAmount(printingFeeValue)}</td></tr>` : ''}
                ${assistanceFeeValue ? `<tr><td>Assistance</td><td style="text-align: right;">${formatAmount(assistanceFeeValue)}</td></tr>` : ''}
                ${boxPriceValue ? `<tr><td>Carton d'expédition</td><td style="text-align: right;">${formatAmount(boxPriceValue)}</td></tr>` : ''}
              </tbody>
            </table>

            <div class="total">
              <div style="display: flex; justify-content: space-between;">
                <span>Total</span>
                <span>${formatAmount(totalAmount)} FCFA</span>
              </div>
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              <div>Statut: <span class="status-badge ${paymentBadgeClass}">${paymentLabel}</span></div>
              ${fullShipment.payment_method ? `<div style="margin-top: 8px;">Moyen de paiement: ${escapeHtml(fullShipment.payment_method)}</div>` : ''}
            </div>

            <div class="footer">
              <div>Facture générée automatiquement par COLISDIRECT</div>
              <div>Conservez cette facture pour vos archives</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const buildLabelHtml = (fullShipment: ShipmentItem, options: { autoPrint?: boolean } = {}) => {
    const { autoPrint = false } = options;
      const sender = `${fullShipment.sender_first_name ?? ''} ${fullShipment.sender_last_name ?? ''}`.trim();
      const recipient = `${fullShipment.recipient_first_name ?? ''} ${fullShipment.recipient_last_name ?? ''}`.trim();
      // QR code contient le shipment_code (numéro d'envoi de 6 chiffres) pour faciliter le scan
      // Selon les règles : QR code uniquement pour colis passant par un relais
      // Le QR code doit contenir le shipment_code, pas le tracking_number
      const qrCodeValue = fullShipment.shipment_code || fullShipment.tracking_number;
      const unifiedQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeValue)}`;
    const logoUrl = `${window.location.origin}/logo.png`;
    const onloadAttr = autoPrint ? "window.print(); setTimeout(() => window.close(), 300);" : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
          <meta http-equiv="Pragma" content="no-cache">
          <meta http-equiv="Expires" content="0">
          <base href="${window.location.origin}" />
          <title>Bordereau - ${escapeHtml(fullShipment.tracking_number || '')}</title>
          <style>
            @media print {
              @page { size: A4; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; margin: 24px; }
            .card { border: 2px solid #FF6C00; padding: 20px; border-radius: 12px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #FF6C00; }
            .logo-container { display: flex; flex-direction: column; align-items: flex-start; }
            .logo { height: 60px; width: auto; object-fit: contain; margin-bottom: 8px; }
            .title { font-size: 28px; font-weight: bold; color: #FF6C00; }
            .tracking { font-size: 18px; font-weight: bold; color: #333; }
            .date { font-size: 12px; color: #666; }
            .row { display: flex; justify-content: space-between; margin: 12px 0; }
            .col { flex: 1; margin: 0 10px; }
            .label { color: #666; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; }
            .value { font-weight: 600; font-size: 14px; color: #333; }
            .qr-section { display: flex; justify-content: center; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .qr-item { text-align: center; }
            .qr { width: 200px; height: 200px; border: 2px solid #FF6C00; display: inline-block; margin-bottom: 8px; background: white; padding: 5px; }
            .qr img { width: 100%; height: 100%; object-fit: contain; }
            .qr-label { font-size: 12px; color: #666; font-weight: bold; margin-top: 8px; }
            .info-section { margin: 15px 0; padding: 15px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-paid { background: #d4edda; color: #155724; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
          </style>
        </head>
        <body ${onloadAttr ? `onload="${onloadAttr}"` : ''}>
          <div class="card">
            <div class="header">
              <div class="logo-container">
                <img src="${logoUrl}" alt="COLISDIRECT Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div class="title" style="display: none;">COLISDIRECT</div>
                <div class="date">${escapeHtml(new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }))}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">N° de suivi</div>
                <div class="tracking">${escapeHtml(fullShipment.tracking_number || '')}</div>
                ${fullShipment.shipment_code ? `
                <div style="margin-top: 8px;">
                  <div class="label">N° d'envoi</div>
                  <div style="font-size: 20px; font-weight: bold; color: #FF6C00; font-family: monospace;">${escapeHtml(fullShipment.shipment_code)}</div>
                  <div style="font-size: 10px; color: #666; margin-top: 4px;">(À écrire sur le colis)</div>
                </div>
                ` : ''}
              </div>
            </div>
            

            <div class="qr-section">
              <div class="qr-item">
                <div class="qr">
                  <img src="${unifiedQRUrl}" alt="QR Code Unifié" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'150\' height=\'150\'%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3E${escapeHtml(fullShipment.tracking_number || '')}%3C/text%3E%3C/svg%3E';" />
                </div>
                <div class="qr-label">QR CODE UNIFIÉ</div>
                <div style="font-size: 10px; color: #999; margin-top: 4px;">Utilisable pour toutes les étapes</div>
              </div>
            </div>

            <div class="row">
              <div class="col info-section">
                <div class="label">Expéditeur</div>
                <div class="value">${escapeHtml(sender || '-')}</div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                  ${fullShipment.sender_address ? escapeHtml(fullShipment.sender_address) + '<br/>' : ''}
                  ${fullShipment.sender_commune || fullShipment.sender_quartier ? `${escapeHtml((fullShipment.sender_commune || '') + (fullShipment.sender_quartier ? ', ' + fullShipment.sender_quartier : ''))}<br/>` : ''}
                  ${fullShipment.sender_phone ? escapeHtml(fullShipment.sender_phone) : ''}
                </div>
              </div>
              <div class="col info-section">
                <div class="label">Destinataire</div>
                <div class="value">${escapeHtml(recipient || '-')}</div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                  ${fullShipment.recipient_address ? escapeHtml(fullShipment.recipient_address) + '<br/>' : ''}
                  ${fullShipment.recipient_commune || fullShipment.recipient_quartier ? `${escapeHtml((fullShipment.recipient_commune || '') + (fullShipment.recipient_quartier ? ', ' + fullShipment.recipient_quartier : ''))}<br/>` : ''}
                  ${fullShipment.recipient_phone ? escapeHtml(fullShipment.recipient_phone) : ''}
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col">
                <div class="label">Statut</div>
                <div class="value">${escapeHtml(getShipmentStatusLabel(normalizeShipmentStatus(fullShipment.current_status || fullShipment.status)))}</div>
              </div>
              <div class="col">
                <div class="label">Paiement</div>
                <div>
                  <span class="status-badge ${
                    normalizePaymentStatus(fullShipment.payment_status) === 'paid' ? 'status-paid' : 'status-pending'
                  }">
                    ${
                      normalizePaymentStatus(fullShipment.payment_status) === 'paid' ? 'Payé' :
                      normalizePaymentStatus(fullShipment.payment_status) === 'cancelled' ? 'Annulé' :
                      'En attente'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div class="footer">
              <div>Bordereau généré automatiquement par COLISDIRECT</div>
              <div>Conservez ce bordereau pour le suivi de votre colis</div>
              <div style="margin-top: 8px; font-weight: bold;">Le QR code unique peut être scanné à toutes les étapes du parcours</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const openHtmlInWindow = (html: string) => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Impossible d\'ouvrir une nouvelle fenêtre. Vérifiez le bloqueur de fenêtres.');
      return null;
    }
    win.document.write(html);
    win.document.close();
    return win;
  };

  const previewInvoice = async (shipment: ShipmentItem) => {
    const fullShipment = await loadShipmentDetails(shipment);
    if (!fullShipment) return;
    const html = buildInvoiceHtml(fullShipment, { autoPrint: false });
    openHtmlInWindow(html);
  };

  const openInvoice = async (shipment: ShipmentItem, mode: 'preview' | 'print') => {
    const fullShipment = await loadShipmentDetails(shipment);
    if (!fullShipment) return;
    const html = buildInvoiceHtml(fullShipment, { autoPrint: mode === 'print' });
    openHtmlInWindow(html);
  };

  const downloadInvoice = async (shipment: ShipmentItem) => {
    const fullShipment = await loadShipmentDetails(shipment);
    if (!fullShipment) return;
    const html = buildInvoiceHtml(fullShipment, { autoPrint: false });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture-${fullShipment.tracking_number}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info('Fichier HTML téléchargé. La version PDF sera disponible prochainement.');
  };

  const previewLabel = async (shipment: ShipmentItem) => {
    const fullShipment = await loadShipmentDetails(shipment);
    if (!fullShipment) return;
    const html = buildLabelHtml(fullShipment, { autoPrint: false });
    openHtmlInWindow(html);
  };

  const openLabel = async (shipment: ShipmentItem, mode: 'preview' | 'print') => {
    const fullShipment = await loadShipmentDetails(shipment);
    if (!fullShipment) return;
    const html = buildLabelHtml(fullShipment, { autoPrint: mode === 'print' });
    openHtmlInWindow(html);
  };

  const downloadLabel = async (shipment: ShipmentItem) => {
    const fullShipment = await loadShipmentDetails(shipment);
    if (!fullShipment) return;
    const html = buildLabelHtml(fullShipment, { autoPrint: false });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bordereau-${fullShipment.tracking_number}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info('Fichier HTML téléchargé. La version PDF sera disponible prochainement.');
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate('home');
  };

  const enrichedShipments = useMemo<EnrichedShipment[]>(() => {
    return shipments.map((shipment) => enrichShipment(shipment));
  }, [shipments]);

  const activeEnrichedShipments = useMemo<EnrichedShipment[]>(() => {
    return activeShipments.map((shipment) => enrichShipment(shipment));
  }, [activeShipments]);

  const revenueMetrics = useMemo<RevenueMetrics>(() => {
    const financials = stats.financials || createEmptyFinancials();
    const paymentMap = new Map<string, number>();
    Object.entries(financials.month.paymentBreakdown).forEach(([method, info]) => {
      const amount = Number(info?.amount ?? 0);
      if (Number.isFinite(amount)) {
        paymentMap.set(method, amount);
      }
    });

    const hasAggregatedData =
      paymentMap.size > 0 ||
      financials.month.revenue > 0 ||
      financials.week.revenue > 0 ||
      financials.today.revenue > 0;

    if (hasAggregatedData) {
      return {
        day: financials.today.revenue,
        week: financials.week.revenue,
        month: financials.month.revenue,
        total: financials.month.revenue,
        paymentMap,
        assistedCount: financials.month.assistedCount,
        assistanceRevenue: financials.month.assistanceRevenue,
        printingRevenue: financials.month.printingRevenue,
        commissionTotal: financials.month.commissions,
        relayCount: financials.month.relayDeliveryCount,
        homeCount: financials.month.homeDeliveryCount,
      };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    const dayOfWeek = startOfDay.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7; // Monday as first day
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const fallback: RevenueMetrics = {
      day: 0,
      week: 0,
      month: 0,
      total: 0,
      paymentMap: new Map<string, number>(),
      assistedCount: 0,
      assistanceRevenue: 0,
      printingRevenue: 0,
      commissionTotal: 0,
      relayCount: 0,
      homeCount: 0,
    };

    enrichedShipments.forEach((shipment) => {
      const amount = shipment.computedAmount;
      fallback.total += amount;
      if (shipment.createdDate >= startOfDay) fallback.day += amount;
      if (shipment.createdDate >= startOfWeek) fallback.week += amount;
      if (shipment.createdDate >= startOfMonth) fallback.month += amount;
      fallback.paymentMap.set(
        shipment.paymentMethodLabel,
        (fallback.paymentMap.get(shipment.paymentMethodLabel) || 0) + amount
      );
      const assistanceFeeValue = toNumeric(shipment.assistance_fee);
      const printingFeeValue = toNumeric(shipment.printing_fee);
      if (shipment.relay_assisted) {
        fallback.assistedCount += 1;
        fallback.assistanceRevenue += assistanceFeeValue;
      }
      fallback.printingRevenue += printingFeeValue;
      fallback.commissionTotal += assistanceFeeValue + printingFeeValue;
      if (shipment.home_delivery) fallback.homeCount += 1;
      else fallback.relayCount += 1;
    });

    return fallback;
  }, [stats.financials, enrichedShipments]);

  const paymentBreakdown = useMemo<PaymentBreakdownItem[]>(() => {
    const breakdownSource = stats.financials?.month.paymentBreakdown ?? {};
    const entries = Object.entries(breakdownSource);

    if (entries.length > 0) {
      return entries
        .map(([method, info]) => {
          const amount = Number(info?.amount ?? 0);
          const count = Number(info?.count ?? 0);
          const label = getPaymentMethodLabel(method);
          return {
            method,
            label,
            amount: Number.isFinite(amount) ? amount : 0,
            count: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
          };
        })
        .sort((a, b) => b.amount - a.amount);
    }

    return Array.from(revenueMetrics.paymentMap.entries())
      .map(([method, value]) => ({
        method,
        label: getPaymentMethodLabel(method),
        amount: value,
        count: 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [stats.financials, revenueMetrics]);

  const assistedShipments = useMemo(() => enrichedShipments.filter((shipment) => shipment.relay_assisted), [enrichedShipments]);

  const invoiceRows = useMemo<InvoiceRow[]>(() => {
    const unique = new Map<string, InvoiceRow>();

    enrichedShipments.forEach((shipment) => {
      const key = `FAC-${shipment.tracking_number}`;
      const customerName =
        `${shipment.sender_first_name ?? ''} ${shipment.sender_last_name ?? ''}`.trim() ||
        `${shipment.recipient_first_name ?? ''} ${shipment.recipient_last_name ?? ''}`.trim() ||
        'Client';

      const amount = shipment.computedAmount;

      if (unique.has(key)) {
        const existing = unique.get(key)!;
        unique.set(key, {
          ...existing,
          amount: existing.amount + amount,
        });
      } else {
        unique.set(key, {
          shipment,
          invoiceNumber: key,
          customerName,
          amount,
          paymentMethod: shipment.paymentMethodLabel,
          serviceType: shipment.serviceTypeLabel,
          createdDate: shipment.createdDate,
        });
      }
    });

    return Array.from(unique.values()).sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
  }, [enrichedShipments]);

  const bordereauRows = useMemo<BordereauRow[]>(() => {
    return enrichedShipments
      .map((shipment) => ({
        shipment,
        tracking: shipment.tracking_number,
        createdDate: shipment.createdDate,
        deliveryMode: shipment.deliveryModeLabel,
        packageType: shipment.package_type === 'petit' ? 'Petit' : shipment.package_type === 'moyen' ? 'Moyen' : 'Grand',
        amount: shipment.computedAmount,
        weight: shipment.weight,
      }))
      .sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
  }, [enrichedShipments]);

  const startOfDay = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [enrichedShipments]);

  const startOfWeek = useMemo(() => {
    const dayRef = new Date();
    dayRef.setHours(0, 0, 0, 0);
    const day = dayRef.getDay();
    const diffToMonday = (day + 6) % 7;
    dayRef.setDate(dayRef.getDate() - diffToMonday);
    return dayRef;
  }, [enrichedShipments]);

  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [enrichedShipments]);

  const matchesPeriod = useCallback((date: Date, period: 'all' | 'today' | 'week' | 'month') => {
    if (period === 'all') return true;
    if (period === 'today') return date >= startOfDay;
    if (period === 'week') return date >= startOfWeek;
    if (period === 'month') return date >= startOfMonth;
    return true;
  }, [startOfDay, startOfWeek, startOfMonth]);

  const filteredInvoices = useMemo(() => {
    return invoiceRows.filter((row) => {
      const searchValue = invoiceSearch.trim().toLowerCase();
      const matchesSearch =
        searchValue === '' ||
        row.invoiceNumber.toLowerCase().includes(searchValue) ||
        row.shipment.tracking_number.toLowerCase().includes(searchValue) ||
        row.customerName.toLowerCase().includes(searchValue);
      const matchesPayment = invoicePaymentFilter === 'all' || row.paymentMethod === invoicePaymentFilter;
      const matchesDate = matchesPeriod(row.createdDate, invoicePeriod);
      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [invoiceRows, invoiceSearch, invoicePaymentFilter, invoicePeriod, matchesPeriod]);

  const invoiceTotalAmount = useMemo(() => {
    return filteredInvoices.reduce((sum, row) => sum + toNumeric(row.amount), 0);
  }, [filteredInvoices]);

  const invoicePaymentOptions = useMemo(() => {
    const unique = new Set<string>();
    invoiceRows.forEach((row) => {
      if (row.paymentMethod) unique.add(row.paymentMethod);
    });
    return Array.from(unique);
  }, [invoiceRows]);

  const filteredBordereaux = useMemo(() => {
    return bordereauRows.filter((row) => {
      const searchValue = slipSearch.trim().toLowerCase();
      const matchesSearch =
        searchValue === '' ||
        row.tracking.toLowerCase().includes(searchValue) ||
        row.shipment.recipient_first_name?.toLowerCase().includes(searchValue) ||
        row.shipment.recipient_last_name?.toLowerCase().includes(searchValue) ||
        row.shipment.sender_first_name?.toLowerCase().includes(searchValue) ||
        row.shipment.sender_last_name?.toLowerCase().includes(searchValue);
      const matchesDelivery =
        slipDeliveryFilter === 'all' ||
        (slipDeliveryFilter === 'home' && row.shipment.home_delivery) ||
        (slipDeliveryFilter === 'relay' && !row.shipment.home_delivery);
      const matchesDate = matchesPeriod(row.createdDate, slipPeriod);
      return matchesSearch && matchesDelivery && matchesDate;
    });
  }, [bordereauRows, slipSearch, slipDeliveryFilter, slipPeriod, matchesPeriod]);

  const colisEnCours = useMemo(() =>
    shipments.filter(s => {
      const status = normalizeShipmentStatus(s.current_status ?? s.status);
      return !['DELIVERED', 'PICKED_UP_BY_CUSTOMER', 'DELIVERED_TO_CUSTOMER',
               'CANCELLED', 'RETURN_TO_SENDER', 'PAYMENT_REJECTED'].includes(status);
    }), [shipments]);

  const colisTermine = useMemo(() =>
    shipments.filter(s => {
      const status = normalizeShipmentStatus(s.current_status ?? s.status);
      return ['DELIVERED', 'PICKED_UP_BY_CUSTOMER', 'DELIVERED_TO_CUSTOMER'].includes(status);
    }), [shipments]);

  const colisIncidents = useMemo(() =>
    shipments.filter(s => {
      const status = normalizeShipmentStatus(s.current_status ?? s.status);
      return ['CANCELLED', 'RETURN_TO_SENDER', 'PAYMENT_REJECTED'].includes(status);
    }), [shipments]);

  const colisFiltered = useMemo(() => {
    const list = colisSubTab === 'en_cours' ? colisEnCours
               : colisSubTab === 'termine' ? colisTermine
               : colisIncidents;
    if (!colisSearch.trim()) return list;
    const q = colisSearch.toLowerCase();
    return list.filter(s =>
      (s.tracking_number?.toLowerCase().includes(q)) ||
      (s.shipment_code?.toLowerCase().includes(q)) ||
      (`${s.sender_first_name ?? ''} ${s.sender_last_name ?? ''}`).toLowerCase().includes(q) ||
      (`${s.recipient_first_name ?? ''} ${s.recipient_last_name ?? ''}`).toLowerCase().includes(q) ||
      (s.sender_phone?.includes(q)) ||
      (s.recipient_phone?.includes(q)) ||
      (s.sender_commune?.toLowerCase().includes(q)) ||
      (s.recipient_commune?.toLowerCase().includes(q))
    );
  }, [colisSubTab, colisSearch, colisEnCours, colisTermine, colisIncidents]);

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return activeEnrichedShipments.filter((shipment) => {
      const matchesSearch =
        searchValue === '' ||
        shipment.tracking_number?.toLowerCase().includes(searchValue) ||
        `${shipment.sender_first_name ?? ''} ${shipment.sender_last_name ?? ''}`.toLowerCase().includes(searchValue) ||
        `${shipment.recipient_first_name ?? ''} ${shipment.recipient_last_name ?? ''}`.toLowerCase().includes(searchValue);
      const currentStatus = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
      const statusGroup = shipmentStatusForFilter(currentStatus);
      const matchesStatus = statusFilter === 'all' || statusGroup === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeEnrichedShipments, search, statusFilter]);

  const normalizedScannedStatus = scannedShipment
    ? normalizeShipmentStatus(scannedShipment.current_status ?? scannedShipment.status)
    : null;
  const effectiveScannedStatus = scannedShipment ? getEffectiveShipmentStatus(scannedShipment as any) : null;
  
  // Logique simple : si payment_method = 'relay_cash' et payment_status != 'paid', on doit confirmer le paiement
  // MAIS uniquement pour les dépôts en point relais, pas pour les livraisons à domicile avec ramassage
  const isRelayCashMethod = (scannedShipment?.payment_method || '').toString().trim().toLowerCase() === 'relay_cash';
  const paymentStatus = scannedShipment?.payment_status || '';
  const isPaymentPaid = paymentStatus.toLowerCase() === 'paid' || (scannedShipment as any)?.relay_cash_payment?.status === 'collected';
  /** Paiement en ligne (hors espèces relais) non encore marqué payé côté plateforme */
  const onlinePaymentPendingScan =
    !!scannedShipment &&
    !isRelayCashMethod &&
    !isPaymentPaid &&
    effectiveScannedStatus === 'PAYMENT_AWAITING_VALIDATION';
  // Dans le contexte du dashboard relais, relay_cash s'applique toujours au dépôt client
  // y compris les colis home_delivery déposés au relais (flux validé depuis Issue 3)
  const isRelayDeposit = true;
  // Ce relais peut encaisser le paiement seulement s'il est le relais d'origine assigné
  // (ou si aucun relais n'est assigné — colis en réseau ouvert, cas rare)
  const canConfirmPaymentHere = !scannedShipment?.origin_relay_id || isAtOriginRelay;
  // Pour les dépôts en point relais avec paiement au relais, on doit confirmer le paiement avant réception
  const paymentRequired = isRelayCashMethod && !isPaymentPaid && isRelayDeposit && canConfirmPaymentHere;
  const paymentAlreadyConfirmed = cashPaymentConfirmed || isPaymentPaid;
  
  const scanActionLabel =
    onlinePaymentPendingScan
      ? 'Paiement en attente'
      : paymentRequired && !paymentAlreadyConfirmed
      ? 'Confirmer le paiement'
      : effectiveScannedStatus === 'AVAILABLE_FOR_PICKUP'
      ? 'Livrer au client'
      : normalizedScannedStatus === 'RELAY_FINAL_RECEIVED'
      ? 'Mettre à disposition'
      : 'Réceptionner';
  const scanIsDeliverAction = effectiveScannedStatus === 'AVAILABLE_FOR_PICKUP';

  // Rôle du relais connecté vis-à-vis du colis scanné
  const isAtDestinationRelay = !!(
    scannedShipment?.destination_relay_id &&
    user?.relay_point_id &&
    String(scannedShipment.destination_relay_id) === String(user.relay_point_id)
  );
  const isAtOriginRelay = !!(
    scannedShipment?.origin_relay_id &&
    user?.relay_point_id &&
    String(scannedShipment.origin_relay_id) === String(user.relay_point_id)
  );

  // Statuts terminaux — indépendants du rôle
  const SCAN_TERMINAL_STATUSES: Record<string, string> = {
    CANCELLED: 'Cet envoi a été annulé.',
    RETURN_TO_SENDER: "Cet envoi est en cours de retour vers l'expéditeur.",
    DELIVERED: 'Cet envoi a été livré au destinataire.',
    DELIVERED_TO_CUSTOMER: 'Cet envoi a été livré au destinataire.',
    PICKED_UP_BY_CUSTOMER: 'Cet envoi a été retiré par le destinataire.',
  };

  // Message bloquant pour un relais de destination qui scanne un colis pas encore arrivé
  const destinationRelayBlockedMessage: string | null = (() => {
    if (!isAtDestinationRelay) return null;
    const s = normalizedScannedStatus ?? '';
    if (s === 'READY_FOR_DROP_OFF' || s === 'PAYMENT_CONFIRMED_AWAITING_DROP' || s === 'PAYMENT_AWAITING_VALIDATION' || s === 'PAYMENT_PENDING_AT_RELAY' || s === 'PAYMENT_RECEIVED_AT_RELAY') {
      return "Ce colis n'a pas encore été déposé. Vous ne pouvez pas le réceptionner ici.";
    }
    if (s === 'RELAY_ORIGIN_RECEIVED') {
      return "Ce colis est au relais de départ, en attente d'être pris en charge par un transporteur.";
    }
    if (s === 'CARRIER_COLLECTED') {
      return 'Ce colis a été collecté par le transporteur. Il est en route vers votre point relais.';
    }
    return null;
  })();

  // Message bloquant si ce relais n'est pas le relais d'origine et que le paiement est à encaisser
  const wrongRelayPaymentMessage: string | null = (() => {
    if (!isRelayCashMethod || isPaymentPaid || canConfirmPaymentHere) return null;
    return "Ce colis est assigné à un autre point relais. Votre relais ne peut pas encaisser le paiement pour ce colis.";
  })();

  const scanNoActionMessage: string | null =
    destinationRelayBlockedMessage ??
    wrongRelayPaymentMessage ??
    (normalizedScannedStatus === 'RELAY_ORIGIN_RECEIVED' && isAtOriginRelay
      ? 'Ce colis est déjà réceptionné à votre point relais.'
      : null) ??
    (normalizedScannedStatus ? (SCAN_TERMINAL_STATUSES[normalizedScannedStatus] ?? null) : null);

  const expectedCashAmount = scannedShipment
    ? (() => {
        const maybeComputed = (scannedShipment as any).computedAmount;
        if (typeof maybeComputed === 'number' && Number.isFinite(maybeComputed)) {
          return maybeComputed;
        }
        return (
          toNumeric(scannedShipment.price) +
          toNumeric(scannedShipment.printing_fee) +
          toNumeric(scannedShipment.assistance_fee) +
          toNumeric(scannedShipment.box_price)
        );
      })()
    : 0;
  const formattedExpectedCashAmount = formatCurrency(expectedCashAmount);

  useEffect(() => {
    if (!isShipmentActionModalOpen) {
      setCashPaymentConfirmed(false);
      setCashConfirmationLoading(false);
      setScanReturnLoading(false);
      setScanIncidentFormOpen(false);
      setScanIncidentType('colis_endommage');
      setScanIncidentDesc('');
      setScanIncidentLoading(false);
      return;
    }

    setCashConfirmationLoading(false);

    if (paymentRequired && !paymentAlreadyConfirmed) {
      setCashPaymentConfirmed(false);
    }
  }, [isShipmentActionModalOpen, paymentRequired, paymentAlreadyConfirmed]);

  // Fonction pour réceptionner un colis (depuis transporteur ou dépôt manuel)
  const handleReceiveShipment = async (shipment: ShipmentItem) => {
    
    if (!shipment) {
      console.error('No shipment provided');
      toast.error('Aucun colis fourni');
      return;
    }

    if (!shipment.tracking_number) {
      console.error('No tracking_number in shipment');
      toast.error('Numéro de suivi manquant');
      return;
    }

    // Afficher un indicateur de chargement
    setReceivingShipment(shipment.tracking_number);
    toast.info('Réception du colis en cours...');

    let shouldReload = false;

    try {

      const currentStatus = shipment.current_status ?? shipment.status;
      const normalized = normalizeShipmentStatus(currentStatus);
      const effectiveStatus = getEffectiveShipmentStatus(shipment);
      const userRelayId = user?.relay_point_id;

      if (!userRelayId) {
        setReceivingShipment(null);
        toast.error('Erreur : Votre compte point relais n\'est pas associé à un point relais.');
        return;
      }

      // Vérifier D'ABORD si le colis est déjà réceptionné (avant toute autre vérification)
      if (normalized === 'RELAY_ORIGIN_RECEIVED' || effectiveStatus === 'RELAY_ORIGIN_RECEIVED') {
        setReceivingShipment(null);
        toast.info('Ce colis est déjà réceptionné au point relais d\'origine');
        return;
      }

      if (normalized === 'AVAILABLE_FOR_PICKUP') {
        setReceivingShipment(null);
        toast.info('Ce colis est déjà disponible pour retrait au point relais.');
        return;
      }

      // Vérifier que le colis est lié à ce point relais
      const isAtOrigin = shipment.origin_relay_id && String(shipment.origin_relay_id) === String(userRelayId);
      const isAtDestination = shipment.destination_relay_id && String(shipment.destination_relay_id) === String(userRelayId);
      
      // Permettre la réception si origin_relay_id est null et que le statut est READY_FOR_DROP_OFF
      // (le backend associera automatiquement le colis au point relais)
      const canReceiveUnassigned = !shipment.origin_relay_id && 
                                   (normalized === 'READY_FOR_DROP_OFF' || 
                                    normalized === 'PAYMENT_CONFIRMED_AWAITING_DROP' || 
                                    normalized === 'PAYMENT_PENDING_AT_RELAY');

      if (!isAtOrigin && !isAtDestination && !canReceiveUnassigned) {
        setReceivingShipment(null);
        // Message détaillé selon le contexte
        if (!shipment.origin_relay_id && (normalized === 'READY_FOR_DROP_OFF' || normalized === 'PAYMENT_CONFIRMED_AWAITING_DROP')) {
          toast.error('Ce colis est en attente de ramassage à domicile. Le transporteur doit d’abord le récupérer chez l’expéditeur.');
        } else {
          toast.error('Ce colis n’est pas destiné à votre point relais.');
        }
        return;
      }

      if (normalized === 'IN_TRANSIT' || normalized === 'CARRIER_COLLECTED') {
        // Colis en transit - réception finale (arrivée au point relais de destination)
        if (!isAtDestination) {
          setReceivingShipment(null);
          toast.error('Ce colis ne peut être réceptionné qu\'au point relais de destination.');
          return;
        }
        const { error: intakeError } = await api.scanRelayFinalIntake(shipment.tracking_number);
        if (intakeError) {
          console.error('Intake error:', intakeError);
          setReceivingShipment(null);
          toast.error(intakeError || 'Erreur lors de la réception finale du colis');
          return;
        }
        const { error: availError } = await api.opsMakeAvailable(shipment.tracking_number);
        if (availError) {
          console.error('Make available error:', availError);
          setReceivingShipment(null);
          toast.error(availError || 'Erreur lors de la mise à disposition du colis');
          return;
        }
        shouldReload = true;
        toast.success('Colis réceptionné au point relais');
      } else if (normalized === 'RELAY_FINAL_RECEIVED') {
        // Colis arrivé mais pas encore mis à disposition — récupération d'état bloqué
        if (!isAtDestination) {
          setReceivingShipment(null);
          toast.error('Ce colis ne peut être mis à disposition qu\'au point relais de destination.');
          return;
        }
        const { error: availError } = await api.opsMakeAvailable(shipment.tracking_number);
        if (availError) {
          console.error('Make available error:', availError);
          setReceivingShipment(null);
          toast.error(availError || 'Erreur lors de la mise à disposition du colis');
          return;
        }
        shouldReload = true;
        toast.success('Colis mis à disposition au point relais');
      } else if (normalized === 'READY_FOR_DROP_OFF' || normalized === 'PAYMENT_CONFIRMED_AWAITING_DROP' || normalized === 'PAYMENT_PENDING_AT_RELAY') {
        // Dépôt manuel - réception initiale (au point relais d'origine)
        // Si origin_relay_id est null, on permet la réception (le backend l'associera automatiquement)
        if (!isAtOrigin && shipment.origin_relay_id !== null) {
          setReceivingShipment(null);
          toast.error('Ce colis ne peut être réceptionné qu\'au point relais d\'origine.');
          return;
        }
        
        // Vérifier que le paiement est confirmé pour les dépôts en point relais avec paiement au relais
        const isRelayCash = (shipment.payment_method || '').toString().trim().toLowerCase() === 'relay_cash';
        // Dans ce bloc, on est toujours dans un contexte de dépôt client (READY_FOR_DROP_OFF)
        const isDeposit = true;
        const isPaid = (shipment.payment_status || '').toLowerCase() === 'paid' || (shipment as any)?.relay_cash_payment?.status === 'collected';
        
        if (isRelayCash && isDeposit && !isPaid) {
          setReceivingShipment(null);
          toast.error('Veuillez d\'abord confirmer le paiement avant de réceptionner le colis.');
          return;
        }
        const { error: intakeError } = await api.scanRelayIntake(shipment.tracking_number);
        if (intakeError) {
          console.error('Intake error:', intakeError);
          setReceivingShipment(null);
          toast.error(intakeError || 'Erreur lors de la réception du colis');
          return;
        }
        shouldReload = true;
        toast.success('Colis réceptionné au point relais');
      } else if (normalized === 'PAYMENT_RECEIVED_AT_RELAY') {
        // Paiement reçu au relais - on peut réceptionner même si ce n'est pas strictement l'origine
        if (!isAtOrigin && !isAtDestination) {
          setReceivingShipment(null);
          toast.error('Ce colis n\'est pas lié à votre point relais.');
          return;
        }
        const { error: intakeError } = await api.scanRelayIntake(shipment.tracking_number);
        if (intakeError) {
          console.error('Intake error:', intakeError);
          setReceivingShipment(null);
          toast.error(intakeError || 'Erreur lors de la réception du colis');
          return;
        }
        shouldReload = true;
        toast.success('Colis réceptionné au point relais');
      } else {
        setReceivingShipment(null);
        toast.error(`Le statut actuel (${getShipmentStatusLabel(normalized)}) ne permet pas la réception.`);
        return;
      }

      // Recharger les données si nécessaire
      if (shouldReload) {
        
        // Recharger le colis depuis l'API pour avoir les statuts à jour
        let updatedShipment: ShipmentItem | null = null;
        try {
          const { data: updatedShipmentData, error: trackingError } = await api.getTracking(shipment.tracking_number);
          if (!trackingError && updatedShipmentData) {
            if (updatedShipmentData && typeof updatedShipmentData === 'object') {
              if ('shipment' in updatedShipmentData && updatedShipmentData.shipment && typeof updatedShipmentData.shipment === 'object') {
                updatedShipment = updatedShipmentData.shipment as ShipmentItem;
              } else {
                updatedShipment = updatedShipmentData as ShipmentItem;
              }
            }
          }
        } catch (error) {
          console.error('Error reloading shipment after reception:', error);
        }
        
        // Recharger toutes les données du dashboard
        await loadDashboardData();
        
        // Après le rechargement, s'assurer que le colis réceptionné est toujours dans activeShipments
        // car loadDashboardData() peut avoir recalculé la liste et le filtre peut l'exclure
        if (updatedShipment) {
          const normalizedPayment = normalizePaymentStatus(updatedShipment.payment_status);
          const enrichedShipment = enrichShipment({
            ...updatedShipment,
            payment_status: normalizedPayment,
          });
          
          // S'assurer que le colis a bien origin_relay_id défini (nécessaire pour le filtre)
          if (!enrichedShipment.origin_relay_id && user?.relay_point_id) {
            enrichedShipment.origin_relay_id = user.relay_point_id;
          }
          
          // Vérifier que le colis est bien dans la liste après le rechargement
          setActiveShipments(prev => {
            const existingIndex = prev.findIndex(s => s.id === enrichedShipment.id || s.tracking_number === enrichedShipment.tracking_number);
            if (existingIndex >= 0) {
              // Mettre à jour le colis existant avec les données les plus récentes
              const updated = [...prev];
              updated[existingIndex] = enrichedShipment;
              return updated;
            } else {
              // Si le colis n'est pas dans la liste après rechargement, l'ajouter
              // Cela peut arriver si le filtre de loadDashboardData() ne l'a pas inclus
              return [...prev, enrichedShipment];
            }
          });
        }
        
        // Recharger les colis du transporteur si on est dans ce modal
        if (isTransporterModalOpen && selectedTransporterId) {
          await loadTransporterShipments(selectedTransporterId);
        }
        
        // Recharger les colis par téléphone si on est dans ce modal
        // Le colis réceptionné ne devrait plus apparaître dans cette liste
        if (isPhoneShipmentsModalOpen && lastSearchedPhone) {
          await loadShipmentsByPhone(lastSearchedPhone);
          
          // Si le modal des colis par téléphone est vide après rechargement, le fermer
          setTimeout(() => {
            setPhoneShipments(prev => {
              if (prev.length === 0) {
                setIsPhoneShipmentsModalOpen(false);
              }
              return prev;
            });
          }, 500);
        }
        
        // Fermer le modal d'action si on n'est pas dans un modal de liste
        if (!isTransporterModalOpen && !isPhoneShipmentsModalOpen) {
          setIsShipmentActionModalOpen(false);
          setScannedShipment(null);
          setTrackingInput('');
        }
      }
      
      setReceivingShipment(null);
    } catch (error: any) {
      console.error('Error receiving shipment:', error);
      setReceivingShipment(null);
      toast.error(error.message || 'Erreur lors de la réception du colis');
    }
  };

  // Fonction pour marquer un colis comme retiré par le destinataire
  const handleDeliverToRecipient = async (shipment: ShipmentItem, pickupCode: string) => {
    try {
      const currentStatus = shipment.current_status ?? shipment.status;
      const normalized = normalizeShipmentStatus(currentStatus);

      if (normalized !== 'AVAILABLE_FOR_PICKUP') {
        throw new Error(`Le colis doit être disponible pour retrait (statut actuel: ${getShipmentStatusLabel(normalized)})`);
      }

      const code = pickupCode.trim();
      if (!/^[0-9]{6}$/.test(code)) {
        toast.error('Le code de retrait doit comporter 6 chiffres.');
        return;
      }

      const defaultIdentifier =
        shipment.recipient_phone?.toString().trim() ||
        shipment.recipient_email?.toString().trim() ||
        '';

      const { error: deliverError } = await api.relayCompleteDelivery(
        shipment.tracking_number,
        code,
        defaultIdentifier || undefined
      );
      if (deliverError) throw new Error(deliverError);

      toast.success('Colis livré au destinataire');
      setPickupCodeForDelivery('');
      await loadDashboardData();
      setIsShipmentActionModalOpen(false);
      setScannedShipment(null);
      setTrackingInput('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la livraison du colis');
    }
  };

  const handleSettingsFieldChange = <K extends keyof RelaySettingsForm>(key: K, value: RelaySettingsForm[K]) => {
    setSettingsForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasswordFieldChange = <K extends keyof PasswordForm>(key: K, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSettingsSave = async () => {
    if (!relayPointData?.id) {
      toast.error('Profil relais introuvable.');
      return;
    }

    try {
      await api.updateRelayPoint(relayPointData.id, {
        name: settingsForm.name,
        phone: settingsForm.phone,
        email: settingsForm.email || null,
        commune: settingsForm.commune,
        quartier: settingsForm.quartier,
        address: settingsForm.address,
        description: settingsForm.description,
        has_printer: settingsForm.hasPrinter,
        has_computer: settingsForm.hasComputer,
        has_internet: settingsForm.hasInternet,
      });
      toast.success('Informations du relais mises à jour.');
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error updating relay point:', error);
      toast.error(error?.message || 'Impossible de mettre à jour le profil.');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      toast.error('Veuillez renseigner tous les champs de mot de passe.');
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non identifié.');
      return;
    }

    try {
      const { error } = await api.changePassword(user.id, passwordForm.current, passwordForm.next);
      if (error) throw new Error(error);
      toast.success('Mot de passe mis à jour.');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error?.message || 'Impossible de mettre à jour le mot de passe.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6C00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <header ref={headerRef} className="bg-white shadow-md border-b border-orange-100 relative z-10" style={{ overflow: 'visible' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6" style={{ overflow: 'visible', position: 'relative' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Logo size="md" showText={false} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {relayPointName || 'Point Relais'}
                </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Bienvenue, {user?.first_name} {user?.last_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Icône imprimante supprimée */}
              {/* Bouton menu déroulant sur mobile */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMobileNavOpen(true);
                }}
                className="md:hidden p-2 sm:p-3 hover:bg-orange-50 rounded-xl transition-colors"
                aria-label="Ouvrir le menu"
                title="Menu"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF6C00]" />
              </button>
              {/* Bouton connexion/déconnexion */}
              <button 
                onClick={handleLogout} 
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:flex space-x-2 border-b border-gray-200 overflow-x-auto">
            {DESKTOP_TABS.map(({ id, label, icon: Icon }) => (
                <button
                key={id}
                onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 px-4 lg:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === id ? 'border-[#FF6C00] text-[#FF6C00]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-sm lg:text-base">{label}</span>
                </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer - comme dans AdminDashboard */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Logo size="sm" showText={false} />
                <span className="text-sm font-semibold">Menu</span>
              </div>
              <button 
                className="p-2 rounded-lg hover:bg-gray-100" 
                onClick={() => setMobileNavOpen(false)} 
                aria-label="Fermer le menu"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => { 
                      setActiveTab(id);
                      setMobileNavOpen(false); 
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive ? 'bg-[#FF6C00] text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {activeTab === 'overview' && (
          <>
            {/* Bannière CTA Scan — visible si des colis sont en attente de dépôt */}
            {stats.pendingPickups > 0 && (
              <div className="mb-4 sm:mb-6 bg-orange-50 border-2 border-[#FF6C00] rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF6C00] rounded-full p-2 shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm sm:text-base">
                      {stats.pendingPickups} colis en attente de dépôt dans le réseau
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                      Un client peut se présenter avec un colis. Scannez-le dès son arrivée pour le prendre en charge.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('scan')}
                  className="shrink-0 px-4 py-2 bg-[#FF6C00] text-white text-sm font-semibold rounded-lg hover:bg-[#ff8534] transition-colors whitespace-nowrap"
                >
                  Scanner un colis
                </button>
              </div>
            )}

            {/* Stats Cards - Déroulant sur mobile */}
            <div className="bg-white rounded-xl shadow-md mb-4 sm:mb-6 md:mb-8">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, stats: !prev.stats }))}
                className="md:hidden w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-900 border-b border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#FF6C00]" />
                  Statistiques
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedSections.stats ? 'rotate-180' : ''}`} />
              </button>
              <div className={`${expandedSections.stats ? 'block' : 'hidden'} md:block p-4 sm:p-6`}>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-2 sm:p-3 md:p-6">
                <div className="flex items-center justify-between mb-1 sm:mb-2 md:mb-4">
                  <div className="bg-orange-100 rounded-full p-1.5 sm:p-2 md:p-3">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-[#FF6C00]" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-3xl font-bold text-black mb-0.5 sm:mb-1">{stats.pendingPickups}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 leading-tight">Colis à réceptionner</p>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-2 sm:p-3 md:p-6">
                <div className="flex items-center justify-between mb-1 sm:mb-2 md:mb-4">
                  <div className="bg-blue-100 rounded-full p-1.5 sm:p-2 md:p-3">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-3xl font-bold text-black mb-0.5 sm:mb-1">{stats.pendingDeliveries}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 leading-tight">À livrer</p>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-2 sm:p-3 md:p-6">
                <div className="flex items-center justify-between mb-1 sm:mb-2 md:mb-4">
                  <div className="bg-green-100 rounded-full p-1.5 sm:p-2 md:p-3">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-3xl font-bold text-black mb-0.5 sm:mb-1">{stats.completedToday}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 leading-tight">Livrés aujourd'hui</p>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-2 sm:p-3 md:p-6">
                <div className="flex items-center justify-between mb-1 sm:mb-2 md:mb-4">
                  <div className="bg-purple-100 rounded-full p-1.5 sm:p-2 md:p-3">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-3xl font-bold text-black mb-0.5 sm:mb-1">{formatCurrency(stats.monthlyRevenue)} FCFA</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 leading-tight">Revenus du mois (estimation)</p>
              </div>
                </div>
              </div>
            </div>


            {/* Scanner QR / Saisir un numéro */}
            <div className="bg-white rounded-xl shadow-md mb-4 sm:mb-6 md:mb-8">
                <button
                onClick={() => setExpandedSections(prev => ({ ...prev, scanner: !prev.scanner }))}
                className="md:hidden w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-900 border-b border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#FF6C00]" />
                  Scanner / Saisir un numéro
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedSections.scanner ? 'rotate-180' : ''}`} />
                </button>
              <div className={`${expandedSections.scanner ? 'block' : 'hidden'} md:block p-4 sm:p-6`}>
                {/* Scanner QR Code Section */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">Scanner un QR code</h3>
                      <p className="text-xs text-gray-600">
                        Utilisez la caméra pour scanner le QR code d'un colis
                      </p>
                    </div>
                    <button
                      onClick={() => setIsScanModalOpen(true)}
                      className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg font-semibold hover:bg-[#ff8534] transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <QrCode className="w-4 h-4" />
                      Scanner
                    </button>
                  </div>
                </div>

                {/* Saisie manuelle */}
                <div className="mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Saisir un numéro</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Saisissez l'ID d'un transporteur pour voir ses colis, un numéro de téléphone pour voir les colis associés ou un numéro d'envoi pour gérer un colis.
                  </p>
              </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={trackingInput}
                        onChange={(e) => {
                          setTrackingInput(e.target.value);
                          // Effacer le message quand l'utilisateur tape
                          if (searchMessage) {
                            setSearchMessage(null);
                          }
                        }}
                      placeholder="ID transporteur, numéro de téléphone ou numéro d'envoi"
                      className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleValidate(); }}
                      />
                    </div>
                    <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (!trackingInput.trim()) {
                        toast.error('Veuillez saisir un numéro');
                        return;
                      }
                      if (phoneShipmentsLoading || transporterShipmentsLoading) {
                        return;
                      }
                      try {
                        await handleValidate();
                      } catch (error) {
                        console.error('[RelayDashboard] Error in handleValidate:', error);
                        toast.error('Erreur lors de la validation');
                      }
                    }}
                    disabled={!trackingInput.trim() || phoneShipmentsLoading || transporterShipmentsLoading}
                    className="px-6 py-2 bg-[#FF6C00] text-white rounded-lg font-semibold hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {phoneShipmentsLoading || transporterShipmentsLoading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Recherche...
                      </>
                    ) : (
                      'Valider'
                    )}
                    </button>
                </div>
                  
                  {/* Message d'information pour la recherche */}
                  {searchMessage && (
                    <div className={`mt-3 p-3 rounded-lg border ${
                      searchMessage.type === 'info' 
                        ? 'bg-blue-50 border-blue-200 text-blue-800' 
                        : searchMessage.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-green-50 border-green-200 text-green-800'
                    }`}>
                      <div className="flex items-start gap-2">
                        {searchMessage.type === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        {searchMessage.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        {searchMessage.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <p className="text-sm font-medium flex-1">{searchMessage.text}</p>
                        <button
                          onClick={() => setSearchMessage(null)}
                          className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Astuce :</strong> Saisissez l'ID d'un transporteur (UUID) pour voir tous ses colis, un numéro de téléphone pour voir les colis associés ou un numéro d'envoi pour gérer un colis.
                    </p>
                  </div>
                  </div>
            </div>

            {/* Colis actifs - Déroulant sur mobile */}
            <div className="bg-white rounded-xl shadow-md">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, colisActifs: !prev.colisActifs }))}
                className="md:hidden w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-900 border-b border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#FF6C00]" />
                  Colis actifs
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedSections.colisActifs ? 'rotate-180' : ''}`} />
              </button>
              <div className={`${expandedSections.colisActifs ? 'block' : 'hidden'} md:block p-4 sm:p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-black">Colis actifs</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="relative flex-1 sm:flex-initial">
                    <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select value={statusFilter} onChange={handleStatusFilterChange} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm">
                      <option value="all">Tous</option>
                      <option value="READY_FOR_DROP_OFF">Prêt pour dépôt</option>
                      <option value="RELAY_ORIGIN_RECEIVED">Reçu au relais</option>
                      <option value="CARRIER_COLLECTED">Pris en charge</option>
                      <option value="IN_TRANSIT">En transit</option>
                      <option value="RELAY_FINAL_RECEIVED">Arrivé au relais</option>
                      <option value="AVAILABLE_FOR_PICKUP">Disponible</option>
                      <option value="pending">En attente (legacy)</option>
                      <option value="at_relay">Au relais (legacy)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-2 sm:-mx-4 md:mx-0">
                <div className="min-w-full px-2 sm:px-4 md:px-0">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">N° colis</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">N° suivi</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Type</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Mode</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Créé le</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Statut actuel</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Paiement</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Montant</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-gray-500">Aucun colis</td>
                      </tr>
                    ) : (
                      filtered.map((pkg) => {
                        const paymentStatus = normalizePaymentStatus(pkg.payment_status);
                        return (
                        <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                              <span className="font-mono font-semibold text-[#FF6C00]">
                                {pkg.shipment_code || 'N/A'}
                              </span>
                            </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                            <button
                                onClick={() => handleValidate(pkg.tracking_number)}
                              className="font-medium text-[#FF6C00] hover:text-[#ff8534] hover:underline cursor-pointer"
                            >
                              {pkg.tracking_number}
                            </button>
                          </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                              {pkg.package_type === 'petit' ? 'Petit' : pkg.package_type === 'moyen' ? 'Moyen' : 'Grand'}
                          </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                              {pkg.deliveryModeLabel}
                          </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                              {formatDateTime(pkg.createdDate)}
                            </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {(() => {
                                const status = normalizeShipmentStatus(pkg.current_status ?? pkg.status);
                                const label = getShipmentStatusLabel(status);
                                const badgeClass = getShipmentStatusBadgeClass(status);
                              return (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                                    {label}
                                </span>
                              );
                            })()}
                          </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(paymentStatus)}`}>
                                {getPaymentStatusLabel(paymentStatus)}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap font-semibold">
                              {formatCurrency(pkg.computedAmount)} FCFA
                            </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1 sm:gap-2">
                                <button 
                                  onClick={() => previewInvoice(pkg)} 
                                  className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap flex items-center gap-1"
                                  title="Voir la facture"
                                >
                                  <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden sm:inline">Facture</span>
                                </button>
                                <button 
                                  onClick={() => previewLabel(pkg)} 
                                  className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap flex items-center gap-1"
                                  title="Voir le bordereau"
                                >
                                  <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden sm:inline">Bordereau</span>
                                </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'paiements' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#FF6C00]" />
                    Recettes encaissées
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="border border-gray-100 rounded-lg p-3 bg-orange-50">
                    <p className="text-xs text-gray-500">Aujourd'hui</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(revenueMetrics.day)} FCFA</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3 bg-orange-50">
                    <p className="text-xs text-gray-500">Cette semaine</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(revenueMetrics.week)} FCFA</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3 bg-orange-50">
                    <p className="text-xs text-gray-500">Ce mois-ci</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(revenueMetrics.month)} FCFA</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#FF6C00]" />
                    Détails des paiements
                  </h3>
                </div>
                <div className="space-y-2">
                  {paymentBreakdown.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun paiement enregistré pour le moment.</p>
                  ) : (
                    paymentBreakdown.map(({ method, label, amount, count }) => (
                      <div key={method} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                        <span className="text-gray-600">
                          {label}
                          {count > 0 ? ` (${count})` : ''}
                        </span>
                        <span className="font-semibold text-gray-900">{formatCurrency(amount)} FCFA</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-[#FF6C00]" />
                  Commissions & assistance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Colis assistés</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{revenueMetrics.assistedCount}</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Commissions générées</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(revenueMetrics.commissionTotal)} FCFA</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Livraisons point relais</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{revenueMetrics.relayCount}</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Livraisons domicile</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{revenueMetrics.homeCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Banknote className="w-4 h-4 text-[#FF6C00]" />
                  Synthèse globale
                </h3>
                <p className="text-sm text-gray-600">
                  Montant total encaissé depuis le début de l'activité :
                  <span className="font-semibold text-gray-900 ml-1">{formatCurrency(revenueMetrics.total)} FCFA</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Suivez vos performances quotidiennement pour optimiser votre activité et vos revenus.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'colis' && (
          <section className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#FF6C00]" /> Colis
                </h2>
                <p className="text-sm text-gray-600">Historique complet des colis de votre point relais.</p>
              </div>
              <span className="text-xs text-gray-500">{shipments.length} colis au total</span>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {([
                { id: 'en_cours' as ColisSubTab, label: 'En cours', count: colisEnCours.length, color: 'blue' },
                { id: 'termine' as ColisSubTab, label: 'Terminé', count: colisTermine.length, color: 'green' },
                { id: 'incidents' as ColisSubTab, label: 'Incidents', count: colisIncidents.length, color: 'red' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setColisSubTab(tab.id); setColisSearch(''); }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    colisSubTab === tab.id
                      ? 'border-[#FF6C00] text-[#FF6C00]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    colisSubTab === tab.id
                      ? 'bg-orange-100 text-orange-700'
                      : tab.count > 0
                        ? tab.id === 'incidents' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        : 'bg-gray-50 text-gray-400'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={colisSearch}
                onChange={(e) => setColisSearch(e.target.value)}
                placeholder="Rechercher par N° envoi, N° suivi, nom, téléphone, commune..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-600 uppercase tracking-wide">
                    <th className="py-2 px-3">N° envoi</th>
                    <th className="py-2 px-3">Expéditeur</th>
                    <th className="py-2 px-3">Destinataire</th>
                    <th className="py-2 px-3">Statut</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {colisFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">
                        {colisSearch ? 'Aucun résultat pour cette recherche' : 'Aucun colis dans cette catégorie'}
                      </td>
                    </tr>
                  ) : (
                    colisFiltered.map((s) => {
                      const status = normalizeShipmentStatus(s.current_status ?? s.status);
                      const createdDate = new Date(s.created_at);
                      const senderName = `${s.sender_first_name ?? ''} ${s.sender_last_name ?? ''}`.trim();
                      const recipientName = `${s.recipient_first_name ?? ''} ${s.recipient_last_name ?? ''}`.trim();
                      return (
                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <td className="py-3 px-3">
                            <div className="font-bold font-mono text-[#FF6C00] text-sm">{s.shipment_code || '—'}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{s.tracking_number}</div>
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            <div className="font-medium">{senderName || '—'}</div>
                            <div className="text-xs text-gray-400">{s.sender_commune || s.sender_phone || ''}</div>
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            <div className="font-medium">{recipientName || '—'}</div>
                            <div className="text-xs text-gray-400">{s.recipient_commune || s.recipient_phone || ''}</div>
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const step = COLIS_STEP_LABEL[status] ?? { label: getShipmentStatusLabel(status), sub: '' };
                              return (
                                <div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getShipmentStatusBadgeClass(status)}`}>
                                    {step.label}
                                  </span>
                                  {step.sub && <div className="text-xs text-gray-400 mt-0.5 pl-0.5">{step.sub}</div>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500">{formatDateTime(createdDate)}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openColisDetails(s)}
                                title="Voir les détails"
                                className="px-2.5 py-1 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] text-xs font-medium flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> Détails
                              </button>
                              <button
                                onClick={() => previewLabel(s)}
                                title="Bordereau"
                                className="px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs text-gray-600 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" /> Bordereau
                              </button>
                              <button
                                onClick={() => previewInvoice(s)}
                                title="Facture"
                                className="px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs text-gray-600 flex items-center gap-1"
                              >
                                <Receipt className="w-3 h-3" /> Facture
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'assistance' && (
          <section className="space-y-6">
            {showAssistForm ? (
          <AssistClientForm
                relayId={user?.relay_point_id || ''}
                onSuccess={() => {
                  setShowAssistForm(false);
                  toast.success('Envoi assisté créé avec succès.');
                  loadDashboardData();
              setActiveTab('overview');
                }}
                onCancel={() => setShowAssistForm(false)}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[#FF6C00]" /> Assistance client
                    </h2>
                    <p className="text-sm text-gray-600">
                      Créez un envoi complet pour le compte d'un client sans quitter l'interface relais.
                    </p>
              </div>
                        <button
                    onClick={() => setShowAssistForm(true)}
                    className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg font-semibold hover:bg-[#ff8534] transition-colors"
                        >
                    Assister un client
                        </button>
                      </div>
                <ul className="mt-4 text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Saisie guidée des informations expéditeur / destinataire.</li>
                  <li>Choix du mode de livraison (point relais ou domicile).</li>
                  <li>Génération automatique de la facture, du bordereau et de l'entrée comptable.</li>
                </ul>
                    </div>
      )}

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#FF6C00]" /> Historique des envois assistés
                </h3>
                <span className="text-xs text-gray-500">{assistedShipments.length} envois</span>
                    </div>
              {assistedShipments.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun envoi assisté pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-left text-gray-700">
                        <th className="py-2 px-3">N° suivi</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Montant</th>
                        <th className="py-2 px-3">Paiement</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assistedShipments.map((shipment) => (
                        <tr key={shipment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-semibold text-gray-900">{shipment.tracking_number}</td>
                          <td className="py-2 px-3 text-gray-600">{formatDateTime(shipment.createdDate)}</td>
                          <td className="py-2 px-3 text-gray-900 font-semibold">{formatCurrency(shipment.computedAmount)} FCFA</td>
                          <td className="py-2 px-3 text-gray-600">{shipment.paymentMethodLabel}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => previewInvoice(shipment)} className="px-2 py-1 border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Eye className="w-3 h-3" /> Facture</button>
                              <button onClick={() => previewLabel(shipment)} className="px-2 py-1 border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Printer className="w-3 h-3" /> Bordereau</button>
                  </div>
                          </td>
                        </tr>
                ))}
                    </tbody>
                  </table>
              </div>
            )}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-[#FF6C00]" /> Profil du relais
              </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Nom du commerce</span>
            <input
                    value={settingsForm.name}
                    onChange={(e) => handleSettingsFieldChange('name', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Responsable</span>
            <input
                    value={settingsForm.manager}
                    onChange={(e) => handleSettingsFieldChange('manager', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Téléphone</span>
                  <PhoneInput
                    value={settingsForm.phone}
                    onChange={(v) => handleSettingsFieldChange('phone', v)}
                    label={null}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Email</span>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) => handleSettingsFieldChange('email', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
              </div>
      </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <MapPinIcon className="w-5 h-5 text-[#FF6C00]" /> Adresse & géolocalisation
              </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Commune</span>
                <input
                    value={settingsForm.commune}
                    onChange={(e) => handleSettingsFieldChange('commune', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Quartier</span>
                  <input
                    value={settingsForm.quartier}
                    onChange={(e) => handleSettingsFieldChange('quartier', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Adresse détaillée</span>
                  <textarea
                    value={settingsForm.address}
                    onChange={(e) => handleSettingsFieldChange('address', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    rows={2}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Description / repères</span>
                  <textarea
                    value={settingsForm.description}
                    onChange={(e) => handleSettingsFieldChange('description', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    rows={2}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                La géolocalisation précise peut être mise à jour depuis l'application mobile (fonctionnalité à venir).
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <MapPinIcon className="w-5 h-5 text-[#FF6C00]" /> Zone de rattachement
              </h2>
              {relayCode && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-600 mb-1">Identifiant du point relais</div>
                  <div className="text-2xl font-mono font-bold text-[#FF6C00]">{relayCode}</div>
                  <div className="text-xs text-gray-500 mt-1">À partager avec les transporteurs</div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                                            <div>
                  <p className="font-semibold text-gray-900">Zone</p>
                  <p>{zoneDetails?.name || relayPointData?.zone_name || 'Non définie'}</p>
                                            </div>
                <div>
                  <p className="font-semibold text-gray-900">Communes couvertes</p>
                  <p>{zoneDetails?.communes?.length ? zoneDetails.communes.join(', ') : '—'}</p>
                                          </div>
                                            <div>
                  <p className="font-semibold text-gray-900">Transporteur assigné</p>
                  <p>{relayPointData?.assigned_transporter_name || 'À définir'}</p>
                                            </div>
                                            <div>
                  <p className="font-semibold text-gray-900">Dernière mise à jour</p>
                  <p>{relayPointData?.updated_at ? formatDateTime(new Date(relayPointData.updated_at)) : '—'}</p>
                                            </div>
                                          </div>
                                            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <ComponentIcon className="w-5 h-5 text-[#FF6C00]" /> Matériel disponible
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3 text-sm">
                  <span>Imprimante thermique</span>
                  <input type="checkbox" className="w-4 h-4 text-[#FF6C00]" checked={settingsForm.hasPrinter} onChange={(e) => handleSettingsFieldChange('hasPrinter', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3 text-sm">
                  <span>Terminal gestion (ordinateur)</span>
                  <input type="checkbox" className="w-4 h-4 text-[#FF6C00]" checked={settingsForm.hasComputer} onChange={(e) => handleSettingsFieldChange('hasComputer', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3 text-sm">
                  <span>Connexion internet</span>
                  <input type="checkbox" className="w-4 h-4 text-[#FF6C00]" checked={settingsForm.hasInternet} onChange={(e) => handleSettingsFieldChange('hasInternet', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3 text-sm">
                  <span>Smartphone fourni</span>
                  <input type="checkbox" className="w-4 h-4 text-[#FF6C00]" checked={settingsForm.smartphone} onChange={(e) => handleSettingsFieldChange('smartphone', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3 text-sm">
                  <span>Scanner disponible</span>
                  <input type="checkbox" className="w-4 h-4 text-[#FF6C00]" checked={settingsForm.scanner} onChange={(e) => handleSettingsFieldChange('scanner', e.target.checked)} />
                </label>
                                          </div>
                                          </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#FF6C00]" /> Sécurité du compte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Mot de passe actuel</span>
            <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => handlePasswordFieldChange('current', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Nouveau mot de passe</span>
            <input
                    type="password"
                    value={passwordForm.next}
                    onChange={(e) => handlePasswordFieldChange('next', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">Confirmer</span>
            <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => handlePasswordFieldChange('confirm', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </label>
                                        </div>
              <p className="text-xs text-gray-500 mt-3">Pour des raisons de sécurité, choisissez un mot de passe d'au moins 8 caractères incluant chiffres et lettres.</p>
                            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
                onClick={handlePasswordUpdate}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Mettre à jour le mot de passe
            </button>
                                  <button 
                onClick={handleSettingsSave}
                className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
              >
                Enregistrer les informations
                                  </button>
            </div>
          </section>
        )}

        {isScanModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsScanModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Scanner un QR code</h2>
                <button onClick={() => setIsScanModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <QRScanner
                  key="scanner"
                  onDetected={async (text) => {
                    if (!text) {
                      setIsScanModalOpen(false);
                      return;
                    }
                    setIsScanModalOpen(false);
                    try {
                      await processScanPayload(text);
                    } catch (scanError) {
                      const message = scanError instanceof Error ? scanError.message : null;
                      toast.error(message || 'Erreur lors du traitement du QR code.');
                    }
                  }}
                  onClose={() => setIsScanModalOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal action après scan (réception relais) */}
        {scanActionModal && scannedShipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e)=>{ if(e.target===e.currentTarget) setScanActionModal(false); }}>
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Détails du colis</h2>
              
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">N° de suivi</div>
                      <div className="font-semibold text-gray-900">{scannedShipment.tracking_number}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Statut actuel</div>
                      <div className="font-semibold text-gray-900">
                        {getShipmentStatusLabel(normalizedScannedStatus ?? normalizeShipmentStatus(scannedShipment.current_status ?? scannedShipment.status))}
              </div>
                    </div>
                  </div>
                </div>

        {onlinePaymentPendingScan && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm px-4 py-3 rounded-lg flex gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
              Paiement Mobile Money en attente de confirmation. Le colis ne peut pas être réceptionné tant que le règlement n'apparaît pas comme payé.
            </div>
          </div>
        )}

        {paymentRequired && !paymentAlreadyConfirmed && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">
                  Ce colis doit être réglé ici au point relais avant sa réception.
                </p>
                <p className="text-sm text-yellow-800">
                  Montant attendu : <span className="font-semibold">{formattedExpectedCashAmount} FCFA</span>. Confirme simplement que le règlement a été effectué pour continuer.
                </p>
              </div>
              </div>
            </div>
        )}

        {paymentRequired && paymentAlreadyConfirmed && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              Paiement confirmé. Vous pouvez maintenant réceptionner le colis et le mettre à disposition du client.
          </div>
        </div>
      )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-xs text-gray-500 mb-2 font-semibold">Expéditeur</div>
                    <div className="font-semibold text-gray-900">{scannedShipment.sender_first_name || ''} {scannedShipment.sender_last_name || ''}</div>
                    {scannedShipment.sender_commune && (
                      <div className="text-sm text-gray-600 mt-1">{scannedShipment.sender_commune}</div>
                    )}
                    {scannedShipment.sender_phone && (
                      <div className="text-sm text-gray-600 mt-1">📞 {scannedShipment.sender_phone}</div>
                    )}
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-xs text-gray-500 mb-2 font-semibold">Destinataire</div>
                    <div className="font-semibold text-gray-900">{scannedShipment.recipient_first_name || ''} {scannedShipment.recipient_last_name || ''}</div>
                    {scannedShipment.recipient_commune && (
                      <div className="text-sm text-gray-600 mt-1">{scannedShipment.recipient_commune}</div>
                    )}
                    {scannedShipment.recipient_phone && (
                      <div className="text-sm text-gray-600 mt-1">📞 {scannedShipment.recipient_phone}</div>
                    )}
                  </div>
                </div>

                {(scannedShipment.package_type || scannedShipment.weight) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      {scannedShipment.package_type && (
                        <div>
                          <div className="text-gray-500 mb-1">Type</div>
                          <div className="font-semibold">{scannedShipment.package_type === 'petit' ? 'Petit' : scannedShipment.package_type === 'moyen' ? 'Moyen' : 'Grand'}</div>
                        </div>
                      )}
                      {scannedShipment.weight && (
                        <div>
                          <div className="text-gray-500 mb-1">Poids</div>
                          <div className="font-semibold">{scannedShipment.weight} kg</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {scanIsDeliverAction && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code de retrait (6 chiffres inscrit sur le colis)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pickupCodeForDelivery}
                    onChange={(e) => setPickupCodeForDelivery(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6C00]"
                    autoFocus
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                {scanNoActionMessage ? (
                  <>
                    <div className="flex-1 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                      <Info className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      {scanNoActionMessage}
                    </div>
                    <button
                      onClick={() => { setScanActionModal(false); setTrackingInput(''); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Fermer
                    </button>
                  </>
                ) : (
                <>
                <button
                  onClick={()=>{
                    setScanActionModal(false);
                    setTrackingInput('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (onlinePaymentPendingScan) {
                      toast.error("Paiement en ligne non encore confirmé. Attendez que la transaction soit bien enregistrée ou demandez à l'expéditeur de vérifier son paiement.");
                      return;
                    }
                    try {
                      // Utiliser TOUJOURS current_status réel pour la réception, pas effective_status
                      // effective_status est juste pour l'affichage
                      const currentStatus = scannedShipment.current_status ?? scannedShipment.status;
                      const normalized = normalizeShipmentStatus(currentStatus);
                      const legacyStatus = (scannedShipment.status || '').toUpperCase();
                      const userRelayId = user?.relay_point_id || '';
                      const isAtOrigin =
                        userRelayId &&
                        scannedShipment.origin_relay_id &&
                        String(userRelayId) === String(scannedShipment.origin_relay_id);
                      const isAtDestination =
                        userRelayId &&
                        scannedShipment.destination_relay_id &&
                        String(userRelayId) === String(scannedShipment.destination_relay_id);

                      // Logique simple : si payment_method = 'relay_cash' et payment_status != 'paid', confirmer le paiement d'abord
                      if (isRelayCashMethod && !isPaymentPaid) {
                        // Vérifier que ce relais est bien le relais d'origine avant d'encaisser
                        if (scannedShipment.origin_relay_id && !isAtOrigin) {
                          throw new Error("Ce colis est assigné à un autre point relais. Votre relais ne peut pas encaisser le paiement ici.");
                        }
                        // Étape 1 : Confirmer le paiement
                        setCashConfirmationLoading(true);
                        const payload: { tracking_number: string; amount?: number } = {
                          tracking_number: scannedShipment.tracking_number,
                        };
                        if (Number.isFinite(expectedCashAmount) && expectedCashAmount > 0) {
                          payload.amount = expectedCashAmount;
                        }
                        const { error: relayCashError } = await api.relayConfirmCashPayment(payload);
                        if (relayCashError) throw new Error(relayCashError);

                        toast.success('Paiement confirmé. Réception du colis en cours...');
                        setCashPaymentConfirmed(true);
                        setCashConfirmationLoading(false);

                        // Recharger le colis pour avoir payment_status = 'paid'
                        let reloadedShipment: ShipmentItem | null = null;
                        const { data: reloadedData, error: reloadError } = await api.getTracking(scannedShipment.tracking_number);
                        if (reloadError) {
                          console.warn('Failed to reload shipment after payment confirmation:', reloadError);
                        } else {
                          if (reloadedData && typeof reloadedData === 'object') {
                            if ('shipment' in reloadedData && reloadedData.shipment && typeof reloadedData.shipment === 'object') {
                              reloadedShipment = reloadedData.shipment as ShipmentItem;
                            } else {
                              reloadedShipment = reloadedData as ShipmentItem;
                            }
                          }
                          if (reloadedShipment) {
                            const normalizedPayment = normalizePaymentStatus(reloadedShipment.payment_status);
                            setScannedShipment(enrichShipment({
                              ...reloadedShipment,
                              payment_status: normalizedPayment,
                            }));
                          }
                        }

                        await loadDashboardData();
                        
                        // Maintenant que le paiement est confirmé, réceptionner normalement basé sur current_status
                        // Utiliser le colis rechargé si disponible, sinon l'original
                        const shipmentForReception = reloadedShipment || scannedShipment;
                        const currentStatus = shipmentForReception.current_status ?? shipmentForReception.status;
                        const normalizedCurrentStatus = normalizeShipmentStatus(currentStatus);
                        
                        // Réception normale selon le statut (comme avant, pas de changement)
                        if (normalizedCurrentStatus === 'READY_FOR_DROP_OFF' || normalizedCurrentStatus === 'IN_TRANSIT') {
                          if (isAtOrigin || (normalizedCurrentStatus === 'READY_FOR_DROP_OFF' && userRelayId && shipmentForReception.origin_relay_id && String(userRelayId) === String(shipmentForReception.origin_relay_id))) {
                            const { error: intakeError } = await api.scanRelayIntake(scannedShipment.tracking_number);
                        if (intakeError) throw new Error(intakeError);
                          } else if (isAtDestination || (normalizedCurrentStatus === 'IN_TRANSIT' && userRelayId && shipmentForReception.destination_relay_id && String(userRelayId) === String(shipmentForReception.destination_relay_id))) {
                            const { error: intakeError } = await api.scanRelayFinalIntake(scannedShipment.tracking_number);
                        if (intakeError) throw new Error(intakeError);
                            const { error: availError } = await api.opsMakeAvailable(scannedShipment.tracking_number);
                        if (availError) throw new Error(availError);
                      } else {
                            // Ramassage à domicile (origin_relay_id=null) ou colis assigné à un autre relais
                             if (!shipmentForReception.origin_relay_id) {
                               throw new Error("Ce colis est un ramassage à domicile. Le transporteur doit le récupérer chez l'expéditeur et l'apporter au relais de destination. Votre relais n'intervient pas dans ce circuit.");
                             }
                             throw new Error("Ce colis est assigné à un autre point relais et ne peut pas être réceptionné ici.");
                          }
                        } else {
                          throw new Error(`Le statut du colis (${getShipmentStatusLabel(normalizedCurrentStatus)}) ne permet pas la réception pour le moment.`);
                        }
                        
                        toast.success('Colis réceptionné avec succès.');
                        setScannedShipment(null);
                        setTrackingInput('');
                        setScanActionModal(false);
                        await loadDashboardData();
                        return;
                      }

                      if (!isRelayCashMethod) {
                        if (normalizePaymentStatus(scannedShipment.payment_status) !== 'paid') {
                          throw new Error('Le paiement n\'est pas encore confirmé. Veuillez attendre la confirmation du paiement.');
                        }
                      }

                      // Réception normale basée uniquement sur current_status réel
                      if (normalized === 'READY_FOR_DROP_OFF' || legacyStatus === 'PICKUP_READY') {
                        const { error: intakeError } = await api.scanRelayIntake(scannedShipment.tracking_number);
                        if (intakeError) throw new Error(intakeError);
                      } else if (normalized === 'IN_TRANSIT') {
                        const { error: intakeError } = await api.scanRelayFinalIntake(scannedShipment.tracking_number);
                        if (intakeError) throw new Error(intakeError);
                        const { error: availError } = await api.opsMakeAvailable(scannedShipment.tracking_number);
                        if (availError) throw new Error(availError);
                      } else if (normalized === 'RELAY_FINAL_RECEIVED') {
                        const { error: availError } = await api.opsMakeAvailable(scannedShipment.tracking_number);
                        if (availError) throw new Error(availError);
                      } else if (normalized === 'AVAILABLE_FOR_PICKUP') {
                        const defaultIdentifier =
                          scannedShipment.recipient_phone?.toString().trim() ||
                          scannedShipment.recipient_email?.toString().trim() ||
                          '';
                        const pickupCode = pickupCodeForDelivery.trim();
                        if (!/^[0-9]{6}$/.test(pickupCode)) {
                          toast.error('Le code de retrait doit comporter 6 chiffres.');
                          return;
                        }
                        const { error: deliverError } = await api.relayCompleteDelivery(
                          scannedShipment.tracking_number,
                          pickupCode,
                          defaultIdentifier || undefined
                        );
                        if (deliverError) throw new Error(deliverError);
                        setPickupCodeForDelivery('');
                      } else if (normalized === 'PICKED_UP_BY_CUSTOMER' || normalized === 'DELIVERED_TO_CUSTOMER' || normalized === 'DELIVERED') {
                        toast.info('Le colis est déjà livré.');
                        return;
                      } else {
                        toast.error(`Le statut actuel (${getShipmentStatusLabel(normalized)}) ne permet pas cette action pour le moment.`);
                        return;
      }

                      let successMessage = 'Action enregistrée avec succès.';
                      if (scanIsDeliverAction) {
                        successMessage = 'Colis remis au destinataire.';
                      }
                      setScanActionModal(false);
                      setScannedShipment(null);
                      setTrackingInput('');
                      await loadDashboardData();
                      toast.success(successMessage);
                    } catch (actionError) {
                      console.error('Erreur lors du traitement du colis après scan:', actionError);
                      setCashConfirmationLoading(false);
                      const message = actionError instanceof Error ? actionError.message : null;
                      toast.error(message || 'Impossible de traiter ce colis.');
                    }
                  }}
                  disabled={onlinePaymentPendingScan || cashConfirmationLoading}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    onlinePaymentPendingScan || cashConfirmationLoading
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-[#FF6C00] text-white hover:bg-[#ff8534]'
                  }`}
                >
                  {scanActionLabel}
                </button>
                </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal pour afficher les colis d'un transporteur */}
        {isTransporterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Colis du transporteur</h2>
                  <button
                    onClick={() => {
                    setIsTransporterModalOpen(false);
                    setTransporterShipments([]);
                    setSelectedTransporterId(null);
                    setTrackingInput('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                  </button>
                </div>
              <div className="flex-1 overflow-y-auto p-6">
                {transporterShipmentsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00]"></div>
                    <p className="mt-2 text-gray-500">Chargement des colis...</p>
                  </div>
                ) : transporterShipments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Aucun colis trouvé</p>
                ) : (
                  <div className="space-y-4">
                    {transporterShipments.map((shipment) => {
                      const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
                      const paymentStatus = normalizePaymentStatus(shipment.payment_status);
                      return (
                        <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-sm text-gray-500">Numéro d'envoi</div>
                              <div className="font-semibold text-gray-900">{shipment.shipment_code || 'N/A'}</div>
                </div>
                            <div>
                              <div className="text-sm text-gray-500">Numéro de suivi</div>
                              <div className="font-semibold text-gray-900">{shipment.tracking_number}</div>
            </div>
                      <div>
                              <div className="text-sm text-gray-500">Expéditeur</div>
                              <div className="font-medium text-gray-900">
                                {shipment.sender_first_name} {shipment.sender_last_name}
                      </div>
                    </div>
                            <div>
                              <div className="text-sm text-gray-500">Destinataire</div>
                              <div className="font-medium text-gray-900">
                                {shipment.recipient_first_name} {shipment.recipient_last_name}
                    </div>
                  </div>
                            <div>
                              <div className="text-sm text-gray-500">Téléphone destinataire</div>
                              <div className="font-medium text-gray-900">{shipment.recipient_phone || 'N/A'}</div>
              </div>
                            <div>
                              <div className="text-sm text-gray-500">Mode de livraison</div>
                              <div className="font-medium text-gray-900">
                                {shipment.home_delivery ? 'Livraison à domicile' : 'Point relais'}
            </div>
                            </div>
                            {shipment.home_delivery && shipment.recipient_address && (
                              <div className="md:col-span-2">
                                <div className="text-sm text-gray-500">Adresse de livraison</div>
                                <div className="font-medium text-gray-900">{shipment.recipient_address}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-sm text-gray-500">Statut de livraison</div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadgeClass(status)}`}>
                                {getDeliveryStatusLabel(shipment)}
              </span>
              </div>
                            <div>
                              <div className="text-sm text-gray-500">Statut de paiement</div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(paymentStatus)}`}>
                                {getPaymentStatusLabel(paymentStatus)}
                              </span>
                            </div>
                          </div>
                          {rejectingTrackingNumber === shipment.tracking_number && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Raison du rejet (optionnel)
                              </label>
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ex : colis endommagé, mauvaise adresse..."
                                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2 justify-end">
                                <button
                                  onClick={() => { setRejectingTrackingNumber(null); setRejectReason(''); }}
                                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      setReceivingShipment(shipment.tracking_number);
                                      const { error } = await api.rejectShipment(shipment.tracking_number, rejectReason || undefined);
                                      if (error) { toast.error(error); setReceivingShipment(null); return; }
                                      toast.success('Colis rejeté');
                                      setRejectingTrackingNumber(null);
                                      setRejectReason('');
                                      setTransporterShipments(prev => prev.filter(s => s.tracking_number !== shipment.tracking_number));
                                      setTimeout(() => {
                                        setTransporterShipments(prev => {
                                          if (prev.length === 0) { setIsTransporterModalOpen(false); setSelectedTransporterId(null); }
                                          return prev;
                                        });
                                      }, 100);
                                      setReceivingShipment(null);
                                    } catch {
                                      toast.error('Erreur lors du rejet du colis');
                                      setReceivingShipment(null);
                                    }
                                  }}
                                  disabled={receivingShipment === shipment.tracking_number}
                                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  Confirmer le rejet
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end gap-3 mt-4">
                            {normalizeShipmentStatus(shipment.current_status ?? shipment.status) !== 'RELAY_ORIGIN_RECEIVED' && (
                              <button
                                onClick={() => { setRejectingTrackingNumber(shipment.tracking_number); setRejectReason(''); }}
                                disabled={receivingShipment === shipment.tracking_number || rejectingTrackingNumber === shipment.tracking_number}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Rejeter
                              </button>
                            )}
                            {normalizeShipmentStatus(shipment.current_status ?? shipment.status) === 'RELAY_ORIGIN_RECEIVED' ? (
                              <button
                                onClick={async () => {
                                  if (receivingShipment === shipment.tracking_number) return;
                                  setReceivingShipment(shipment.tracking_number);
                                  try {
                                    const { error } = await api.scanHandoff(shipment.tracking_number, undefined, selectedTransporterId!);
                                    if (error) { toast.error(error); setReceivingShipment(null); return; }
                                    toast.success('Colis remis au transporteur.');
                                    setTransporterShipments(prev => prev.filter(s => s.tracking_number !== shipment.tracking_number));
                                    await loadDashboardData();
                                    setTimeout(() => {
                                      setTransporterShipments(prev => {
                                        if (prev.length === 0) { setIsTransporterModalOpen(false); setSelectedTransporterId(null); }
                                        return prev;
                                      });
                                    }, 100);
                                  } catch {
                                    toast.error('Erreur lors de la remise au transporteur');
                                  }
                                  setReceivingShipment(null);
                                }}
                                disabled={receivingShipment === shipment.tracking_number}
                                className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {receivingShipment === shipment.tracking_number ? 'En cours...' : 'Remettre au transporteur'}
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  if (receivingShipment === shipment.tracking_number) {
                                    return;
                                  }

                                  await handleReceiveShipment(shipment);

                                  setTransporterShipments(prev => prev.filter(s => s.tracking_number !== shipment.tracking_number));

                                  setTimeout(() => {
                                    setTransporterShipments(prev => {
                                      if (prev.length === 0) {
                                        setIsTransporterModalOpen(false);
                                        setSelectedTransporterId(null);
                                      }
                                      return prev;
                                    });
                                  }, 100);
                                }}
                                disabled={receivingShipment === shipment.tracking_number}
                                className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {receivingShipment === shipment.tracking_number ? 'Réception en cours...' : 'Réceptionner'}
                              </button>
                            )}
                          </div>
                  </div>
                      );
                    })}
                </div>
                )}
                    </div>
                  </div>
              </div>
        )}

        {/* Modal pour afficher les colis par numéro de téléphone */}
        {isPhoneShipmentsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Colis du client</h2>
                <button
                  onClick={() => {
                    setIsPhoneShipmentsModalOpen(false);
                    setPhoneShipments([]);
                    setTrackingInput('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {phoneShipmentsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00]"></div>
                    <p className="mt-2 text-gray-500">Recherche des colis...</p>
                  </div>
                ) : phoneShipments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Aucun colis trouvé</p>
                ) : (() => {
                  // Séparer dépôts (expéditeur qui dépose) et retraits (destinataire qui vient chercher)
                  const depositStatuses = new Set(['READY_FOR_DROP_OFF', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY', 'PAYMENT_RECEIVED_AT_RELAY']);
                  const pickupStatuses = new Set(['RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP']);
                  const depositShipments = phoneShipments.filter(s => depositStatuses.has(normalizeShipmentStatus(s.current_status ?? s.status) ?? ''));
                  const pickupShipments = phoneShipments.filter(s => pickupStatuses.has(normalizeShipmentStatus(s.current_status ?? s.status) ?? ''));

                  const renderShipmentCard = (shipment: ShipmentItem, section: 'deposit' | 'pickup') => {
                    const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
                    const paymentStatus = normalizePaymentStatus(shipment.payment_status);
                    const isRelayCash = (shipment.payment_method || '').toString().trim().toLowerCase() === 'relay_cash';
                    const isPaid = paymentStatus === 'paid' || (shipment as any)?.relay_cash_payment?.status === 'collected';
                    const expectedAmount = toNumeric(shipment.price) + toNumeric(shipment.printing_fee) + toNumeric(shipment.assistance_fee) + toNumeric(shipment.box_price);

                    return (
                      <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-500">Numéro du colis</div>
                            <div className="font-semibold text-gray-900">{shipment.shipment_code || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Numéro de suivi</div>
                            <div className="font-semibold text-gray-900">{shipment.tracking_number}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Expéditeur</div>
                            <div className="font-medium text-gray-900">{shipment.sender_first_name} {shipment.sender_last_name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Destinataire</div>
                            <div className="font-medium text-gray-900">{shipment.recipient_first_name} {shipment.recipient_last_name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Statut de livraison</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadgeClass(status)}`}>
                              {getDeliveryStatusLabel(shipment)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Statut de paiement</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(paymentStatus)}`}>
                              {getPaymentStatusLabel(paymentStatus)}
                            </span>
                          </div>
                          {isRelayCash && section === 'deposit' && !isPaid && (
                            <div>
                              <div className="text-sm text-gray-500 mb-2">Montant attendu</div>
                              <div className="font-semibold text-lg text-[#FF6C00]">{formatCurrency(expectedAmount)}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                          {section === 'pickup' ? (
                            // Section retrait : le destinataire vient chercher son colis
                            <div className="w-full space-y-2">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Code de retrait (6 chiffres sur le colis)
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  value={phoneModalPickupCodes[shipment.tracking_number] || ''}
                                  onChange={(e) => setPhoneModalPickupCodes(prev => ({
                                    ...prev,
                                    [shipment.tracking_number]: e.target.value.replace(/\D/g, '').slice(0, 6),
                                  }))}
                                  placeholder="000000"
                                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6C00]"
                                />
                              </div>
                              <div className="flex justify-end">
                                <button
                                  onClick={async () => {
                                    const code = (phoneModalPickupCodes[shipment.tracking_number] || '').trim();
                                    if (!/^[0-9]{6}$/.test(code)) { toast.error('Le code de retrait doit comporter 6 chiffres.'); return; }
                                    try {
                                      const { error } = await api.relayCompleteDelivery(shipment.tracking_number, code);
                                      if (error) { toast.error(error); return; }
                                      toast.success('Colis remis au destinataire');
                                      setPhoneModalPickupCodes(prev => { const n = {...prev}; delete n[shipment.tracking_number]; return n; });
                                      if (lastSearchedPhone) await loadShipmentsByPhone(lastSearchedPhone);
                                    } catch (e: any) {
                                      toast.error(e.message || 'Erreur lors de la remise du colis');
                                    }
                                  }}
                                  disabled={!/^[0-9]{6}$/.test(phoneModalPickupCodes[shipment.tracking_number] || '')}
                                  className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Remettre au destinataire
                                </button>
                              </div>
                            </div>
                          ) : isRelayCash && !isPaid ? (
                            // Section dépôt avec paiement relay_cash non encore encaissé
                            <>
                              <button
                                onClick={async () => {
                                  if (!shipment.tracking_number) { toast.error('Numéro de suivi manquant'); return; }
                                  try {
                                    const { error } = await api.relayConfirmCashPayment({ tracking_number: shipment.tracking_number, amount: expectedAmount });
                                    if (error) { toast.error(error); return; }
                                    toast.success('Paiement confirmé avec succès');
                                    if (lastSearchedPhone) await loadShipmentsByPhone(lastSearchedPhone);
                                  } catch (e: any) {
                                    toast.error('Erreur lors de la confirmation du paiement');
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Confirmer le paiement
                              </button>
                              {rejectingTrackingNumber === shipment.tracking_number ? (
                                <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                                  <input
                                    type="text"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Raison du refus (optionnel)"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => { setRejectingTrackingNumber(null); setRejectReason(''); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Annuler</button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const { error } = await api.rejectShipment(shipment.tracking_number, rejectReason || 'Paiement non réglé au point relais');
                                          if (error) { toast.error(error); return; }
                                          toast.success('Colis refusé - Le client sera notifié');
                                          setRejectingTrackingNumber(null); setRejectReason('');
                                          if (lastSearchedPhone) await loadShipmentsByPhone(lastSearchedPhone);
                                        } catch { toast.error('Erreur lors du refus du colis'); }
                                      }}
                                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                    >Confirmer le refus</button>
                                  </div>
                                </div>
                              ) : (
                              <button
                                onClick={() => { setRejectingTrackingNumber(shipment.tracking_number); setRejectReason(''); }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Refuser
                              </button>
                              )}
                            </>
                          ) : (
                            // Section dépôt : paiement OK ou autre méthode
                            <button
                              onClick={async () => {
                                if (receivingShipment === shipment.tracking_number) return;
                                await handleReceiveShipment(shipment);
                              }}
                              disabled={receivingShipment === shipment.tracking_number}
                              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {receivingShipment === shipment.tracking_number ? 'Réception en cours...' : 'Réceptionner'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6">
                      {depositShipments.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                            Colis à déposer ({depositShipments.length})
                          </h3>
                          <div className="space-y-4">
                            {depositShipments.map(s => renderShipmentCard(s, 'deposit'))}
                          </div>
                        </div>
                      )}
                      {pickupShipments.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            Colis à retirer ({pickupShipments.length})
                          </h3>
                          <div className="space-y-4">
                            {pickupShipments.map(s => renderShipmentCard(s, 'pickup'))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal pour afficher les actions possibles sur un colis */}
        {isShipmentActionModalOpen && scannedShipment && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={(e) => {
              // Fermer la modal si on clique sur le fond
              if (e.target === e.currentTarget) {
                setPickupCodeForDelivery('');
                setIsShipmentActionModalOpen(false);
                setScannedShipment(null);
                setTrackingInput('');
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Actions sur le colis</h2>
                                  <button
                  onClick={() => {
                    setPickupCodeForDelivery('');
                    setIsShipmentActionModalOpen(false);
                    setScannedShipment(null);
                    setTrackingInput('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                                  </button>
                  </div>
              <div className="p-6">
                <div className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500">Numéro de suivi</div>
                      <div className="font-semibold text-gray-900">{scannedShipment.tracking_number}</div>
                </div>
                    <div>
                      <div className="text-sm text-gray-500">Numéro d'envoi</div>
                      <div className="font-semibold text-gray-900">{scannedShipment.shipment_code || 'N/A'}</div>
              </div>
                    <div>
                      <div className="text-sm text-gray-500">Expéditeur</div>
                      <div className="font-medium text-gray-900">
                        {scannedShipment.sender_first_name} {scannedShipment.sender_last_name}
            </div>
            </div>
                    <div>
                      <div className="text-sm text-gray-500">Destinataire</div>
                      <div className="font-medium text-gray-900">
                        {scannedShipment.recipient_first_name} {scannedShipment.recipient_last_name}
            </div>
            </div>
              <div>
                      <div className="text-sm text-gray-500">Téléphone destinataire</div>
                      <div className="font-medium text-gray-900">{scannedShipment.recipient_phone || 'N/A'}</div>
              </div>
              <div>
                      <div className="text-sm text-gray-500">Mode de livraison</div>
                      <div className="font-medium text-gray-900">
                        {scannedShipment.home_delivery ? 'Livraison à domicile' : 'Point relais'}
              </div>
              </div>
                    {scannedShipment.home_delivery && scannedShipment.recipient_address && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-500">Adresse de livraison</div>
                        <div className="font-medium text-gray-900">{scannedShipment.recipient_address}</div>
            </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-500">Mode de paiement</div>
                      <div className="font-medium text-gray-900">
                        {(() => {
                          const enriched = scannedShipment as any;
                          if (enriched.paymentMethodLabel) {
                            return enriched.paymentMethodLabel;
                          }
                          if (scannedShipment.payment_method) {
                            return getPaymentMethodLabel(scannedShipment.payment_method);
                          }
                          return 'Non renseigné';
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Statut de livraison</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadgeClass(normalizeShipmentStatus(scannedShipment.current_status ?? scannedShipment.status))}`}>
                        {getDeliveryStatusLabel(scannedShipment)}
                      </span>
          </div>
                    <div>
                      <div className="text-sm text-gray-500">Statut de paiement</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(normalizePaymentStatus(scannedShipment.payment_status))}`}>
                        {getPaymentStatusLabel(normalizePaymentStatus(scannedShipment.payment_status))}
                      </span>
                    </div>
                    {(scannedShipment.payment_method === 'relay_cash' ||
                      (!scannedShipment.payment_method && normalizePaymentStatus(scannedShipment.payment_status) !== 'paid')) &&
                      normalizePaymentStatus(scannedShipment.payment_status) !== 'paid' && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Montant à encaisser</div>
                        <div className="text-lg sm:text-xl font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
                          {(() => {
                            const expected = toNumeric((scannedShipment as any)?.relay_cash_payment?.amount_expected);
                            const computed = toNumeric(scannedShipment.price) + toNumeric(scannedShipment.printing_fee) + toNumeric(scannedShipment.assistance_fee) + toNumeric(scannedShipment.box_price);
                            const amount = expected > 0 ? expected : computed;
                            return amount > 0 ? `${formatCurrency(amount)} FCFA` : 'Montant à confirmer';
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {normalizeShipmentStatus(scannedShipment.current_status ?? scannedShipment.status) === 'AVAILABLE_FOR_PICKUP' && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Code de retrait (6 chiffres inscrit sur le colis)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pickupCodeForDelivery}
                      onChange={(e) => setPickupCodeForDelivery(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6C00]"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-4">
                <button
                    onClick={() => {
                      setPickupCodeForDelivery('');
                      setIsShipmentActionModalOpen(false);
                      setScannedShipment(null);
                      setTrackingInput('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                </button>
                  {normalizeShipmentStatus(scannedShipment.current_status ?? scannedShipment.status) === 'AVAILABLE_FOR_PICKUP' && (
                <button
                      onClick={() => handleDeliverToRecipient(scannedShipment, pickupCodeForDelivery)}
                      disabled={!/^[0-9]{6}$/.test(pickupCodeForDelivery)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                      Retiré par le destinataire
                </button>
                  )}
                  {normalizedScannedStatus === 'RELAY_ORIGIN_RECEIVED' && isAtOriginRelay ? (
                    // Colis déjà réceptionné : seules actions disponibles = retour ou incident
                    <div className="flex flex-col gap-3 w-full">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800 flex items-center gap-2">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        Ce colis est déjà réceptionné. En attente de collecte par le transporteur.
                      </div>
                      {scanIncidentFormOpen ? (
                        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-semibold text-gray-700">Signaler un incident</p>
                          <select
                            value={scanIncidentType}
                            onChange={e => setScanIncidentType(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6C00]"
                          >
                            <option value="colis_endommage">Colis endommagé</option>
                            <option value="client_absent">Client absent</option>
                            <option value="adresse_erronee">Adresse erronée</option>
                            <option value="relais_ferme">Relais fermé</option>
                            <option value="autre">Autre</option>
                          </select>
                          <textarea
                            value={scanIncidentDesc}
                            onChange={e => setScanIncidentDesc(e.target.value)}
                            placeholder="Décrivez l'incident..."
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6C00] resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setScanIncidentFormOpen(false); setScanIncidentDesc(''); }}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={async () => {
                                if (!scanIncidentDesc.trim()) { toast.error('Veuillez décrire l\'incident.'); return; }
                                setScanIncidentLoading(true);
                                const { error } = await api.relayReportIncident(scannedShipment.tracking_number, scanIncidentType, scanIncidentDesc.trim());
                                setScanIncidentLoading(false);
                                if (error) { toast.error(error); return; }
                                toast.success('Incident signalé avec succès.');
                                setScanIncidentFormOpen(false);
                                setScanIncidentDesc('');
                                setIsShipmentActionModalOpen(false);
                                setScannedShipment(null);
                                setTrackingInput('');
                              }}
                              disabled={scanIncidentLoading || !scanIncidentDesc.trim()}
                              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {scanIncidentLoading ? 'Envoi...' : 'Confirmer'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setScanIncidentFormOpen(true)}
                            className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Signaler un incident
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Confirmer le retour de ce colis à l\'expéditeur ?')) return;
                              setScanReturnLoading(true);
                              const { error } = await api.relayInitiateReturn(scannedShipment.tracking_number);
                              setScanReturnLoading(false);
                              if (error) { toast.error(error); return; }
                              toast.success('Retour expéditeur initié avec succès.');
                              await loadDashboardData();
                              setIsShipmentActionModalOpen(false);
                              setScannedShipment(null);
                              setTrackingInput('');
                            }}
                            disabled={scanReturnLoading}
                            className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            {scanReturnLoading ? 'En cours...' : 'Retirer le colis'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : paymentRequired && !paymentAlreadyConfirmed ? (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!scannedShipment || !scannedShipment.tracking_number) {
                          toast.error('Aucun colis sélectionné');
                          return;
                        }

                        if (cashConfirmationLoading) {
                          return;
                        }

                        try {
                          setCashConfirmationLoading(true);
                          const payload: { tracking_number: string; amount?: number } = {
                            tracking_number: scannedShipment.tracking_number,
                          };
                          if (Number.isFinite(expectedCashAmount) && expectedCashAmount > 0) {
                            payload.amount = expectedCashAmount;
                          }

                          const { error: relayCashError } = await api.relayConfirmCashPayment(payload);
                          if (relayCashError) {
                            toast.error(relayCashError);
                            setCashConfirmationLoading(false);
                            return;
                          }

                          toast.success('Paiement confirmé avec succès');

                          // Recharger le colis pour avoir payment_status = 'paid'
                          const { data: reloadedData, error: reloadError } = await api.getTracking(scannedShipment.tracking_number);
                          if (!reloadError && reloadedData) {
                            let reloadedShipment: ShipmentItem | null = null;
                            if (reloadedData && typeof reloadedData === 'object') {
                              if ('shipment' in reloadedData && reloadedData.shipment && typeof reloadedData.shipment === 'object') {
                                reloadedShipment = reloadedData.shipment as ShipmentItem;
                              } else {
                                reloadedShipment = reloadedData as ShipmentItem;
                              }
                            }
                            if (reloadedShipment) {
                              const normalizedPayment = normalizePaymentStatus(reloadedShipment.payment_status);
                              const updatedShipment = enrichShipment({
                                ...reloadedShipment,
                                payment_status: normalizedPayment,
                              });
                              setScannedShipment(updatedShipment);
                              setCashPaymentConfirmed(true);
                            }
                          } else {
                            setCashPaymentConfirmed(true);
                          }

                          await loadDashboardData();
                          setCashConfirmationLoading(false);
                        } catch (error) {
                          console.error('Error confirming payment:', error);
                          toast.error('Erreur lors de la confirmation du paiement');
                          setCashConfirmationLoading(false);
                        }
                      }}
                      disabled={cashConfirmationLoading}
                      className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {cashConfirmationLoading ? 'Confirmation en cours...' : 'Confirmer le paiement'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!scannedShipment) {
                          console.error('No scannedShipment');
                          toast.error('Aucun colis sélectionné');
                          return;
                        }

                        if (!scannedShipment.tracking_number) {
                          console.error('No tracking_number in scannedShipment');
                          toast.error('Numéro de suivi manquant');
                          return;
                        }

                        if (paymentRequired && !paymentAlreadyConfirmed) {
                          toast.error('Veuillez d\'abord confirmer le paiement avant de réceptionner le colis');
                          return;
                        }

                        if (receivingShipment === scannedShipment.tracking_number) {
                          return;
                        }

                        try {
                          await handleReceiveShipment(scannedShipment);
                        } catch (error) {
                          console.error('Error in onClick handler:', error);
                          toast.error('Erreur lors de la réception du colis');
                        }
                      }}
                      disabled={receivingShipment === scannedShipment.tracking_number || (paymentRequired && !paymentAlreadyConfirmed)}
                      className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {receivingShipment === scannedShipment.tracking_number ? 'Réception en cours...' : 'Réceptionner'}
                    </button>
                  )}
          </div>
        </div>
      </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default RelayDashboard;