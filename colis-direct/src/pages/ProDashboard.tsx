import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Home,
  Menu,
  Plus,
  Package,
  TrendingUp,
  Calendar,
  FileText,
  BarChart3,
  Upload,
  Download,
  Settings,
  LogOut,
  User,
  Search,
  Eye,
  ArrowLeftRight,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  Printer,
  Bell,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSpace, userHasDualClientProAccess } from '../contexts/UserSpaceContext';
import { useTheme } from '../contexts/ThemeContext';
import { api, type Shipment as ApiShipment } from '../lib/api';
import Logo from '../components/Logo';
import AddressBookManager from '../components/pro/AddressBookManager';
import {
  getShipmentStatusBadgeClass,
  getShipmentStatusLabel,
  normalizeShipmentStatus,
  normalizePaymentStatus,
  shipmentStatusForFilter,
  getStatusIconComponent,
} from '../utils/shipmentStatus';

interface ProStats {
  totalShipments: number;
  pendingShipments: number;
  relayShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  monthlyRevenue: number;
  monthlyVolume: number;
  averageDeliveryTime: string;
  successRate: number;
}

interface AnalyticsData {
  dailyShipments: { date: string; count: number; revenue: number }[];
  statusDistribution: { label: string; count: number; color: string }[];
  topDestinations: { destination: string; shipments: number; revenue: number }[];
}

type ExtendedApiShipment = ApiShipment & {
  current_status?: string | null;
  payment_status?: string | null;
  delivered_at?: string | null;
};

interface ProShipment {
  id: string;
  trackingNumber: string;
  recipientName: string;
  destination: string;
  currentStatus?: string | null;
  paymentStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
  price: number;
  weight: number;
  raw: ExtendedApiShipment;
}

interface BusinessProfile {
  companyName: string;
  companyRegistration: string;
  businessAddress: string;
  billingEmail: string;
  monthlyVolume: number;
  totalShipments: number;
}

interface ProDashboardProps {
  onNavigate: (page: string) => void;
}

function ProDashboard({ onNavigate }: ProDashboardProps) {
  const { user, signOut } = useAuth();
  const { setActiveSpace } = useUserSpace();
  const { setTheme } = useTheme();
  const dualClientProAccess = user != null && userHasDualClientProAccess(user);

  const goToClientSpace = () => {
    setActiveSpace('client');
    setTheme('standard');
    onNavigate('home');
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'analytics' | 'import' | 'billing' | 'settings'>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ProShipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // CSV Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const initialStats: ProStats = {
    totalShipments: 0,
    pendingShipments: 0,
    relayShipments: 0,
    inTransitShipments: 0,
    deliveredShipments: 0,
    monthlyRevenue: 0,
    monthlyVolume: 0,
    averageDeliveryTime: '--',
    successRate: 0,
  };

  const initialAnalytics: AnalyticsData = {
    dailyShipments: [],
    statusDistribution: [],
    topDestinations: [],
  };

  const [stats, setStats] = useState<ProStats>(initialStats);

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => ({
    companyName: user ? `${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || user.email : 'Compte professionnel',
    companyRegistration: 'Non renseigné',
    businessAddress: [user?.address, user?.commune].filter(Boolean).join(', ') || 'Adresse non renseignée',
    billingEmail: user?.email || '',
    monthlyVolume: 0,
    totalShipments: 0,
  }));

  const [shipments, setShipments] = useState<ProShipment[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(initialAnalytics);
  const [loading, setLoading] = useState(true);

  const deliveredStatuses = useMemo(() => new Set(['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER']), []);
  const inTransitStatuses = useMemo(() => new Set(['CARRIER_COLLECTED', 'IN_TRANSIT']), []);
  const relayStatuses = useMemo(() => new Set(['RELAY_ORIGIN_RECEIVED', 'RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP']), []);
  const pendingStatuses = useMemo(() => new Set(['READY_FOR_DROP_OFF', 'PAID']), []);
  const monthLabel = useMemo(() => new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), []);
  const maxDailyCount = useMemo(
    () => Math.max(1, ...analyticsData.dailyShipments.map((day) => day.count)),
    [analyticsData.dailyShipments]
  );
  const maxStatusCount = useMemo(
    () => Math.max(1, ...analyticsData.statusDistribution.map((item) => item.count)),
    [analyticsData.statusDistribution]
  );

  useEffect(() => {
    if (!user) {
      setShipments([]);
      setStats(initialStats);
      setAnalyticsData(initialAnalytics);
      return;
    }

    loadShipments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setBusinessProfile(prev => ({
        ...prev,
        companyName: 'Compte professionnel',
        businessAddress: 'Adresse non renseignée',
        billingEmail: '',
      }));
      return;
    }

    const displayName = `${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || user.email;
    const address = [user.address, user.commune].filter(Boolean).join(', ') || 'Adresse non renseignée';

    setBusinessProfile(prev => ({
      ...prev,
      companyName: displayName,
      businessAddress: address,
      billingEmail: user.email || prev.billingEmail,
    }));
  }, [user]);

  const isSameMonth = (dateString: string, reference: Date) => {
    const date = new Date(dateString);
    return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
  };

  const mapToProShipment = (shipment: ExtendedApiShipment): ProShipment => {
    const recipientName = `${shipment.recipient_first_name || ''} ${shipment.recipient_last_name || ''}`.trim();
    const destinationParts = [shipment.recipient_commune, shipment.recipient_address].filter(Boolean);
    return {
      id: shipment.id,
      trackingNumber: shipment.tracking_number,
      recipientName: recipientName || shipment.recipient_phone || 'Destinataire',
      destination: destinationParts.join(' • ') || 'Destination non renseignée',
      currentStatus: shipment.current_status ?? shipment.status ?? null,
      paymentStatus: shipment.payment_status ?? null,
      createdAt: shipment.created_at,
      updatedAt: shipment.updated_at,
      deliveredAt: shipment.delivered_at ?? null,
      price: shipment.price ?? 0,
      weight: shipment.weight ?? 0,
      raw: shipment,
    };
  };

  const refreshStats = (list: ProShipment[]) => {
    if (list.length === 0) {
      setStats(initialStats);
      setBusinessProfile(prev => ({
        ...prev,
        monthlyVolume: 0,
        totalShipments: 0,
      }));
      return;
    }

    const now = new Date();
    let pending = 0;
    let relay = 0;
    let inTransit = 0;
    let delivered = 0;
    let monthlyRevenue = 0;
    let monthlyVolume = 0;
    let totalDeliveryDays = 0;
    let deliveredCount = 0;

    list.forEach(shipment => {
      const normalized = normalizeShipmentStatus(shipment.currentStatus ?? shipment.raw.status);

      if (pendingStatuses.has(normalized)) pending += 1;
      if (relayStatuses.has(normalized)) relay += 1;
      if (inTransitStatuses.has(normalized)) inTransit += 1;
      if (deliveredStatuses.has(normalized)) {
        delivered += 1;
        const createdAt = new Date(shipment.createdAt);
        const deliveredAt = shipment.deliveredAt ? new Date(shipment.deliveredAt) : new Date(shipment.updatedAt);
        const diffDays = Math.max((deliveredAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24), 0);
        totalDeliveryDays += diffDays;
        deliveredCount += 1;
      }

      if (isSameMonth(shipment.createdAt, now)) {
        monthlyVolume += 1;
        if (normalizePaymentStatus(shipment.paymentStatus) === 'paid') {
          monthlyRevenue += shipment.price ?? 0;
        }
      }
    });

    const averageDeliveryTime = deliveredCount > 0 ? `${(totalDeliveryDays / deliveredCount).toFixed(1)} jours` : '--';
    const successRate = list.length > 0 ? parseFloat(((delivered / list.length) * 100).toFixed(1)) : 0;

    setStats({
      totalShipments: list.length,
      pendingShipments: pending,
      relayShipments: relay,
      inTransitShipments: inTransit,
      deliveredShipments: delivered,
      monthlyRevenue,
      monthlyVolume,
      averageDeliveryTime,
      successRate,
    });

    setBusinessProfile(prev => ({
      ...prev,
      monthlyVolume,
      totalShipments: list.length,
    }));
  };

  const refreshAnalytics = (list: ProShipment[]) => {
    if (list.length === 0) {
      setAnalyticsData(initialAnalytics);
      return;
    }

    const dailyMap = new Map<string, { count: number; revenue: number }>();
    list.forEach(shipment => {
      const dayKey = new Date(shipment.createdAt).toISOString().slice(0, 10);
      const current = dailyMap.get(dayKey) || { count: 0, revenue: 0 };
      current.count += 1;
      if (normalizePaymentStatus(shipment.paymentStatus) === 'paid') {
        current.revenue += shipment.price ?? 0;
      }
      dailyMap.set(dayKey, current);
    });

    const dailyShipments = Array.from(dailyMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7)
      .map(([key, value]) => ({
        date: new Date(key).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        count: value.count,
        revenue: value.revenue,
      }));

    const statusDistribution = [
      {
        label: 'Livrés',
        count: list.filter(s => deliveredStatuses.has(normalizeShipmentStatus(s.currentStatus ?? s.raw.status))).length,
        color: '#10b981',
      },
      {
        label: 'En transit',
        count: list.filter(s => inTransitStatuses.has(normalizeShipmentStatus(s.currentStatus ?? s.raw.status))).length,
        color: '#3b82f6',
      },
      {
        label: 'Au relais',
        count: list.filter(s => relayStatuses.has(normalizeShipmentStatus(s.currentStatus ?? s.raw.status))).length,
        color: '#f59e0b',
      },
      {
        label: 'En attente',
        count: list.filter(s => pendingStatuses.has(normalizeShipmentStatus(s.currentStatus ?? s.raw.status))).length,
        color: '#ef4444',
      },
    ];

    const destinationMap = new Map<string, { shipments: number; revenue: number }>();
    list.forEach(shipment => {
      const key = shipment.raw.recipient_commune || 'Autres';
      const entry = destinationMap.get(key) || { shipments: 0, revenue: 0 };
      entry.shipments += 1;
      if (normalizePaymentStatus(shipment.paymentStatus) === 'paid') {
        entry.revenue += shipment.price ?? 0;
      }
      destinationMap.set(key, entry);
    });

    const topDestinations = Array.from(destinationMap.entries())
      .sort((a, b) => b[1].shipments - a[1].shipments)
      .slice(0, 5)
      .map(([destination, value]) => ({
        destination,
        shipments: value.shipments,
        revenue: value.revenue,
      }));

    setAnalyticsData({
      dailyShipments,
      statusDistribution,
      topDestinations,
    });
  };

  const loadShipments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await api.getShipments();
      if (error) throw new Error(error);

      const rawShipments: ExtendedApiShipment[] = Array.isArray(data) ? data : [];

      const userShipments = rawShipments.filter(shipment =>
        shipment.created_by === user.id ||
        shipment.sender_email === user.email ||
        shipment.sender_phone === user.phone
      );

      const mapped = userShipments
        .map(mapToProShipment)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setShipments(mapped);
      refreshStats(mapped);
      refreshAnalytics(mapped);
      setSelectedShipment((prev) => (prev ? mapped.find((item) => item.id === prev.id) || null : null));
    } catch (error) {
      console.error('Error loading pro shipments:', error);
      setShipments([]);
      setStats(initialStats);
      setAnalyticsData(initialAnalytics);
      setSelectedShipment(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch =
      shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());

    const normalizedStatus = normalizeShipmentStatus(shipment.currentStatus ?? shipment.raw.status);
    const statusGroup = shipmentStatusForFilter(normalizedStatus);
    const matchesStatus =
      statusFilter === 'all' ||
      statusFilter === statusGroup ||
      (statusFilter === 'delivered' && ['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'].includes(normalizedStatus)) ||
      (statusFilter === 'cancelled' && ['CANCELLED', 'RETURN_TO_SENDER'].includes(normalizedStatus));

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string | null) => {
    const normalized = normalizeShipmentStatus(status);
    const label = getShipmentStatusLabel(normalized);
    const color = getShipmentStatusBadgeClass(normalized);
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const getStatusIcon = (status?: string | null) => {
    const iconInfo = getStatusIconComponent(status);
    if (iconInfo.icon === 'error') {
      return <AlertCircle className={`w-4 h-4 ${iconInfo.color}`} />;
    }
    return <CheckCircle className={`w-4 h-4 ${iconInfo.color}`} />;
  };

  const getStatusIndicatorClasses = (status?: string | null) => {
    const normalized = normalizeShipmentStatus(status);
    if (deliveredStatuses.has(normalized)) {
      return { container: 'bg-green-100', icon: 'text-green-600' };
    }
    if (inTransitStatuses.has(normalized)) {
      return { container: 'bg-purple-100', icon: 'text-purple-600' };
    }
    if (relayStatuses.has(normalized)) {
      return { container: 'bg-blue-100', icon: 'text-blue-600' };
    }
    if (pendingStatuses.has(normalized)) {
      return { container: 'bg-yellow-100', icon: 'text-yellow-600' };
    }
    if (normalized === 'CANCELLED' || normalized === 'RETURN_TO_SENDER') {
      return { container: 'bg-red-100', icon: 'text-red-600' };
    }
    return { container: 'bg-gray-100', icon: 'text-gray-500' };
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate('home');
  };

  // CSV Import functions
  const downloadCsvTemplate = () => {
    const headers = [
      'Prénom destinataire',
      'Nom destinataire',
      'Email destinataire',
      'Téléphone destinataire',
      'Commune destination',
      'Quartier destination',
      'Adresse destination',
      'Poids (kg)',
      'Type de colis (courrier/colis)',
      'Fragile (oui/non)',
      'Express (oui/non)',
      'Livraison domicile (oui/non)'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele_import_envois.csv';
    link.click();
  };

  const parseCsvFile = async (file: File) => {
    setIsProcessingCsv(true);
    setCsvErrors([]);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setCsvErrors(['Le fichier CSV doit contenir au moins un en-tête et une ligne de données']);
        setIsProcessingCsv(false);
        return;
      }

      const expectedHeaders = [
        'prénom destinataire', 'nom destinataire', 'email destinataire',
        'téléphone destinataire', 'commune destination', 'quartier destination',
        'adresse destination', 'poids (kg)', 'type de colis (courrier/colis)',
        'fragile (oui/non)', 'express (oui/non)', 'livraison domicile (oui/non)'
      ];

      const parsedData = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};
        
        expectedHeaders.forEach((_, index) => {
          rowData[expectedHeaders[index]] = values[index] || '';
        });

        // Validation
        if (!rowData['prénom destinataire']) {
          errors.push(`Ligne ${i + 1}: Prénom destinataire manquant`);
        }
        if (!rowData['nom destinataire']) {
          errors.push(`Ligne ${i + 1}: Nom destinataire manquant`);
        }
        if (!rowData['téléphone destinataire']) {
          errors.push(`Ligne ${i + 1}: Téléphone destinataire manquant`);
        }
        if (!rowData['commune destination']) {
          errors.push(`Ligne ${i + 1}: Commune destination manquante`);
        }
        if (!rowData['quartier destination']) {
          errors.push(`Ligne ${i + 1}: Quartier destination manquant`);
        }
        if (!rowData['adresse destination']) {
          errors.push(`Ligne ${i + 1}: Adresse destination manquante`);
        }
        if (!rowData['poids (kg)'] || isNaN(parseFloat(rowData['poids (kg)']))) {
          errors.push(`Ligne ${i + 1}: Poids invalide`);
        }

        parsedData.push(rowData);
      }

      setCsvData(parsedData);
      setCsvPreview(parsedData.slice(0, 5));
      setCsvErrors(errors);
    } catch (error) {
      setCsvErrors(['Erreur lors de la lecture du fichier CSV']);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseCsvFile(file);
    }
  };

  // Mappe les valeurs CSV vers les valeurs package_type acceptées par la DB ('petit'/'moyen'/'grand')
  const csvToPackageType = (raw: string): 'petit' | 'moyen' | 'grand' => {
    const v = raw.toLowerCase().trim();
    if (v === 'courrier' || v === 'courier' || v === 'petit') return 'petit';
    if (v === 'grand') return 'grand';
    return 'moyen'; // 'colis', 'moyen' ou valeur inconnue → moyen par défaut
  };

  // Calculate price for CSV shipments
  const calculatePrice = (csvRow: any) => {
    const packageType = (csvRow['type de colis (courrier/colis)'] || 'moyen').toLowerCase();
    const weight = parseFloat(csvRow['poids (kg)'] || '0');
    const isFragile = (csvRow['fragile (oui/non)'] || 'non').toLowerCase() === 'oui';

    // Simple price calculation (intra-commune as default)
    let basePrice = 0;

    if (packageType === 'courrier' || packageType === 'courier' || packageType === 'petit') {
      if (weight <= 0.5) basePrice = 600;
      else if (weight <= 1) basePrice = 800;
      else if (weight <= 2) basePrice = 1000;
      else {
        const extraKg = Math.ceil(weight - 2);
        basePrice = 1000 + (extraKg * 300);
      }
    } else {
      if (weight <= 1) basePrice = 800;
      else if (weight <= 3) basePrice = 1000;
      else if (weight <= 5) basePrice = 1300;
      else if (weight <= 10) basePrice = 1700;
      else if (weight <= 15) basePrice = 2200;
      else if (weight <= 20) basePrice = 2800;
      else if (weight <= 30) basePrice = 3500;
    }

    if (isFragile) basePrice += 500;

    return basePrice;
  };

  const generateTrackingNumber = () => {
    const prefix = 'CD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleCsvUpload = async () => {
    if (csvData.length === 0 || csvErrors.length > 0) {
      alert('Veuillez corriger les erreurs avant de continuer');
      return;
    }

    setIsProcessingCsv(true);
    
    try {
      let successCount = 0;
      let failCount = 0;

      for (const row of csvData) {
        try {
          const trackingNumber = generateTrackingNumber();
          const packageType = csvToPackageType(row['type de colis (courrier/colis)'] || 'moyen');
          const price = calculatePrice(row);
          
          const shipmentData = {
            tracking_number: trackingNumber,
            sender_first_name: user?.first_name || '',
            sender_last_name: user?.last_name || '',
            sender_email: user?.email || null,
            sender_phone: user?.phone || '',
            sender_commune: '', // Will be set by default or could be added to CSV
            sender_quartier: '',
            sender_address: '',
            recipient_first_name: row['prénom destinataire'],
            recipient_last_name: row['nom destinataire'],
            recipient_email: row['email destinataire'] || null,
            recipient_phone: row['téléphone destinataire'],
            recipient_commune: row['commune destination'],
            recipient_quartier: row['quartier destination'],
            recipient_address: row['adresse destination'],
            package_type: packageType, // 'petit' | 'moyen' | 'grand'
            weight: parseFloat(row['poids (kg)']),
            price,
            current_status: 'READY_FOR_DROP_OFF',
            print_at_relay: true,
            payment_status: 'paid',
            payment_method: null, // Business account payment - handled via account billing
            origin_relay_id: null, // Could be added to CSV or set by default
            destination_relay_id: null, // Will need to be selected or added to CSV
          };

          const { error } = await api.createShipment(shipmentData);
          if (!error) {
            successCount++;
          } else {
            failCount++;
            console.error('Error creating shipment:', error);
          }
        } catch (error) {
          failCount++;
          console.error('Error creating shipment:', error);
        }
      }

      if (successCount > 0) {
        alert(`${successCount} envois créés avec succès${failCount > 0 ? ` (${failCount} échecs)` : ''} !`);
      } else {
        alert('Aucun envoi n\'a pu être créé. Vérifiez les données et réessayez.');
      }

      setCsvData([]);
      setCsvPreview([]);
      setCsvErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error in CSV upload:', error);
      alert('Erreur lors de la création des envois');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <Logo size="md" showText={true} />
            <div className="hidden sm:block h-6 lg:h-8 w-px bg-gray-200" />
            <span className="text-xs sm:text-sm font-medium text-gray-600">Compte Professionnel</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {dualClientProAccess && (
              <button
                type="button"
                onClick={goToClientSpace}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#FF6C00] border border-[#FF6C00] rounded-lg hover:bg-orange-50 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Espace client
              </button>
            )}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={() => onNavigate('messageries')} className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Messagerie">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {stats.pendingShipments > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-100 rounded-lg">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#FF6C00] rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">{businessProfile.companyName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Logo size="sm" showText={false} />
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileNavOpen(false)} aria-label="Fermer">
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {[
                { id: 'overview', label: "Vue d'ensemble", icon: Home },
                { id: 'shipments', label: 'Mes envois', icon: Package },
                { id: 'analytics', label: 'Statistiques', icon: BarChart3 },
                { id: 'import', label: 'Import CSV', icon: Upload },
                { id: 'billing', label: 'Facturation', icon: FileText },
                { id: 'settings', label: 'Paramètres', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id as any); setMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === id ? 'bg-[#FF6C00] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </nav>
            {dualClientProAccess && (
              <div className="px-3 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    goToClientSpace();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border-2 border-[#FF6C00] text-[#FF6C00]"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  Espace client
                </button>
              </div>
            )}
            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#FF6C00] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-5 h-5" />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'shipments'
                  ? 'bg-[#FF6C00] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              Mes envois
              {stats.pendingShipments + stats.inTransitShipments + stats.relayShipments > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.pendingShipments + stats.inTransitShipments + stats.relayShipments}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-[#FF6C00] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Statistiques
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'import'
                  ? 'bg-[#FF6C00] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Upload className="w-5 h-5" />
              Import CSV
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'billing'
                  ? 'bg-[#FF6C00] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-5 h-5" />
              Facturation
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-[#FF6C00] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              Paramètres
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="mt-8 p-4 bg-gradient-to-br from-[#FF6C00] to-[#ff8c33] rounded-xl text-white">
            <h3 className="text-sm font-semibold mb-3">Actions rapides</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('create-shipment')}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white text-[#FF6C00] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvel envoi
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors border border-white/30">
                <Download className="w-4 h-4" />
                Exporter données
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[320px]">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <p className="text-sm">Chargement des envois...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Vue d'ensemble */}
              {activeTab === 'overview' && (
                <>
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h2>
                    <p className="text-sm sm:text-base text-gray-600">Bienvenue, {businessProfile.companyName}</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Total envois</span>
                        <Package className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalShipments.toLocaleString('fr-FR')}</p>
                      <p className="text-xs text-gray-500 mt-1">Données mises à jour en temps réel</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Volume mensuel</span>
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{stats.monthlyVolume}</p>
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Taux de réussite</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
                      <p className="text-xs text-gray-500 mt-1">Livraisons réussies</p>
                    </div>
                  </div>

                  {/* Status Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-xs md:text-sm font-medium text-yellow-800">En attente</span>
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-600" />
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-900">{stats.pendingShipments}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-xs md:text-sm font-medium text-blue-800">Au relais</span>
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600" />
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900">{stats.relayShipments}</p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-xs md:text-sm font-medium text-purple-800">En transit</span>
                        <Truck className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-600" />
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900">{stats.inTransitShipments}</p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-xs md:text-sm font-medium text-green-800">Livrés</span>
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600" />
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900">{stats.deliveredShipments.toLocaleString('fr-FR')}</p>
                    </div>
                  </div>

                  {/* Recent Shipments & Quick Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Envois récents</h3>
                      <div className="space-y-3">
                        {shipments.slice(0, 5).map((shipment) => {
                          const indicator = getStatusIndicatorClasses(shipment.currentStatus ?? shipment.raw.status);
                          return (
                            <div key={shipment.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${indicator.container}`}>
                                <div className={indicator.icon}>
                                  {getStatusIcon(shipment.currentStatus ?? shipment.raw.status)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{shipment.trackingNumber}</p>
                                <p className="text-sm text-gray-500 truncate">{shipment.recipientName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(shipment.price)}</p>
                                {getStatusBadge(shipment.currentStatus ?? shipment.raw.status)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setActiveTab('shipments')}
                        className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Voir tous les envois
                      </button>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Performance</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Temps moyen</span>
                            <span className="font-semibold text-gray-900">{stats.averageDeliveryTime}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Taux de succès</span>
                            <span className="font-semibold text-gray-900">{stats.successRate}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-green-500 rounded-full" style={{ width: `${stats.successRate}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Volume mensuel</span>
                            <span className="font-semibold text-gray-900">{stats.monthlyVolume}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-purple-500 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('analytics')}
                        className="w-full mt-6 px-4 py-2 bg-[#FF6C00] text-white rounded-lg font-medium hover:bg-[#e66100] transition-colors"
                      >
                        Voir statistiques
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Onglet Envois */}
              {activeTab === 'shipments' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mes envois</h2>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par numéro, destinataire..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="in_transit">En transit</option>
                    <option value="at_relay">Au relais</option>
                    <option value="delivered">Livré</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                  <button
                    onClick={() => onNavigate('create-shipment')}
                    className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg font-medium hover:bg-[#e66100] transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Nouveau
                  </button>
                </div>

                <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700">
                  <div className="col-span-2">Numéro de suivi</div>
                  <div>Destinataire</div>
                  <div>Statut</div>
                  <div className="text-right">Montant</div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 items-center">
                      <div className="col-span-2">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const indicator = getStatusIndicatorClasses(shipment.currentStatus ?? shipment.raw.status);
                            return (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${indicator.container}`}>
                                <div className={indicator.icon}>
                                  {getStatusIcon(shipment.currentStatus ?? shipment.raw.status)}
                                </div>
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-mono font-semibold text-gray-900">{shipment.trackingNumber}</p>
                            <p className="text-xs text-gray-500">{formatDate(shipment.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{shipment.recipientName}</p>
                        <p className="text-xs text-gray-500 truncate">{shipment.destination}</p>
                      </div>
                      <div>{getStatusBadge(shipment.currentStatus ?? shipment.raw.status)}</div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(shipment.price)}</p>
                        <p className="text-xs text-gray-500">{shipment.weight} kg</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedShipment && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Détails de l'envoi</h3>
                    <button
                      onClick={() => setSelectedShipment(null)}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Numéro de suivi</p>
                      <p className="font-mono font-semibold text-gray-900">{selectedShipment.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Statut</p>
                      {getStatusBadge(selectedShipment.currentStatus ?? selectedShipment.raw.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Destinataire</p>
                      <p className="font-medium text-gray-900">{selectedShipment.recipientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Poids</p>
                      <p className="font-medium text-gray-900">{selectedShipment.weight} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Destination</p>
                      <p className="font-medium text-gray-900">{selectedShipment.destination}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Montant</p>
                      <p className="font-bold text-[#FF6C00]">{formatCurrency(selectedShipment.price)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onNavigate('my-shipments')} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      Suivi détaillé
                    </button>
                    <button onClick={() => window.print()} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <Printer className="w-4 h-4" />
                      Imprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet Statistiques */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Statistiques</h2>
                <button onClick={() => alert('Export disponible prochainement.')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Exporter rapport
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Envois sur 7 jours</h3>
                  <div className="space-y-2">
                    {analyticsData.dailyShipments.map((day, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-gray-600">{day.date}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FF6C00] to-[#ff8c33] rounded-full flex items-center justify-end pr-2"
                            style={{
                              width: `${day.count === 0 ? 0 : Math.max((day.count / maxDailyCount) * 100, 4)}%`,
                            }}
                          >
                            <span className="text-xs font-semibold text-white">{day.count}</span>
                          </div>
                        </div>
                        <div className="w-24 text-xs font-semibold text-gray-900 text-right">
                          {formatCurrency(day.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Répartition par statut</h3>
                  <div className="space-y-3">
                    {analyticsData.statusDistribution.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{item.label}</span>
                          <span className="font-semibold text-gray-900">{item.count}</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full">
                          <div
                            className="h-3 rounded-full"
                            style={{ 
                              width: `${item.count === 0 ? 0 : Math.max((item.count / maxStatusCount) * 100, 6)}%`,
                              backgroundColor: item.color
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Top destinations</h3>
                  <div className="space-y-3">
                    {analyticsData.topDestinations.map((dest, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 bg-[#FF6C00] rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{dest.destination}</p>
                          <p className="text-sm text-gray-500">{dest.shipments} envois</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(dest.revenue)}</p>
                          <p className="text-xs text-gray-500">Chiffre d'affaires</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Import */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Importer des envois en masse</h2>
                <p className="text-gray-600 mb-6">
                  Créez plusieurs envois en une seule fois en important un fichier CSV
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-[#FF6C00] transition-colors cursor-pointer"
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    Glissez votre fichier CSV ici
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ou cliquez pour sélectionner un fichier
                  </p>
                  <button 
                    type="button"
                    className="px-6 py-3 bg-[#FF6C00] text-white rounded-lg font-medium hover:bg-[#e66100] transition-colors"
                  >
                    Sélectionner un fichier
                  </button>
                </div>

                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Format CSV attendu
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Votre fichier CSV doit contenir les colonnes suivantes :
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                    <div>• Prénom destinataire</div>
                    <div>• Nom destinataire</div>
                    <div>• Email destinataire</div>
                    <div>• Téléphone destinataire</div>
                    <div>• Commune destination</div>
                    <div>• Quartier destination</div>
                    <div>• Adresse destination</div>
                    <div>• Poids (kg)</div>
                    <div>• Type de colis</div>
                    <div>• Fragile (oui/non)</div>
                    <div>• Express (oui/non)</div>
                    <div>• Livraison domicile (oui/non)</div>
                  </div>
                </div>

                <button 
                  onClick={downloadCsvTemplate}
                  className="mt-6 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger un modèle CSV
                </button>
              </div>

              {/* CSV Preview */}
              {csvPreview.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                    Aperçu des données ({csvData.length} envois)
                  </h3>
                  
                  {csvErrors.length > 0 && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Erreurs détectées ({csvErrors.length})
                      </h4>
                      <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                        {csvErrors.slice(0, 10).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {csvErrors.length > 10 && (
                          <li>• ... et {csvErrors.length - 10} autres erreurs</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Prénom</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Nom</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Téléphone</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Commune</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Poids</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {csvPreview.map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-gray-900">{row['prénom destinataire']}</td>
                            <td className="px-3 py-2 text-gray-900">{row['nom destinataire']}</td>
                            <td className="px-3 py-2 text-gray-900">{row['téléphone destinataire']}</td>
                            <td className="px-3 py-2 text-gray-900">{row['commune destination']}</td>
                            <td className="px-3 py-2 text-gray-900">{row['poids (kg)']} kg</td>
                            <td className="px-3 py-2 text-gray-900">{row['type de colis (courrier/colis)']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {csvData.length > 5 && (
                    <p className="mt-4 text-sm text-gray-500 text-center">
                      ... et {csvData.length - 5} autres lignes
                    </p>
                  )}

                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={handleCsvUpload}
                      disabled={csvErrors.length > 0 || isProcessingCsv}
                      className="flex-1 px-4 py-3 bg-[#FF6C00] text-white rounded-lg font-medium hover:bg-[#e66100] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessingCsv ? 'Traitement...' : `Créer ${csvData.length} envois`}
                    </button>
                    <button
                      onClick={() => {
                        setCsvData([]);
                        setCsvPreview([]);
                        setCsvErrors([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet Facturation */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Facturation</h2>
              
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Résumé du mois</h3>
                  <div>
                    <p className="text-xs text-gray-500">Période</p>
                    <span className="text-sm text-gray-500">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Envois totalisés</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.monthlyVolume}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Montant total</p>
                    <p className="text-3xl font-bold text-[#FF6C00]">{formatCurrency(stats.monthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">À payer</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Historique des factures</h3>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Télécharger tout
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {[
                    { id: 1, month: 'Octobre 2024', amount: 7850000, status: 'paid' },
                    { id: 2, month: 'Septembre 2024', amount: 9200000, status: 'paid' },
                    { id: 3, month: 'Août 2024', amount: 6800000, status: 'paid' },
                  ].map((invoice) => (
                    <div key={invoice.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div>
                        <p className="font-semibold text-gray-900">{invoice.month}</p>
                        <p className="text-sm text-gray-500">Facture #{invoice.id.toString().padStart(4, '0')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium mt-1">
                          Payée
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Onglet Paramètres */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-3xl font-bold text-gray-900">Paramètres</h2>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Profil entreprise</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={businessProfile.companyName}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro d'enregistrement
                    </label>
                    <input
                      type="text"
                      value={businessProfile.companyRegistration}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={businessProfile.businessAddress}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de facturation
                    </label>
                    <input
                      type="email"
                      value={businessProfile.billingEmail}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      disabled
                    />
                  </div>
                  <button onClick={() => onNavigate('my-profile')} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    Modifier le profil
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Préférences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Notifications par email</p>
                      <p className="text-sm text-gray-500">Recevoir des mises à jour par email</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-[#FF6C00] rounded" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Notifications SMS</p>
                      <p className="text-sm text-gray-500">Recevoir des alertes par SMS</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-[#FF6C00] rounded" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Factures automatiques</p>
                      <p className="text-sm text-gray-500">Générer des factures automatiquement</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-[#FF6C00] rounded" />
                  </div>
                </div>
              </div>

              {/* Carnet d'adresses */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <AddressBookManager />
              </div>
            </div>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProDashboard;
