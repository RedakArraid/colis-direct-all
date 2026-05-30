import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Clock,
  Code2,
  DollarSign,
  FileCheck,
  Home,
  Layers,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  Send,
  Settings,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Activity,
  Calendar,
  X,
  Briefcase,
  Route,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import StatsCard from '../components/admin/StatsCard';
import Logo from '../components/Logo';
import LineChart from '../components/admin/LineChart';
import BarChart from '../components/admin/BarChart';
import PieChart from '../components/admin/PieChart';
import ActivityFeed from '../components/admin/ActivityFeed';
import UsersManagement from './admin/UsersManagement';
import RelayPointsManagement from './admin/RelayPointsManagement';
import ShipmentsManagement from './admin/ShipmentsManagement';
import TransportersManagement from './admin/TransportersManagement';
import DeliveryPricingManagement from './admin/DeliveryPricingManagement';
import RelayApplicationsManagement from './admin/RelayApplicationsManagement';
import DeliveryZonesManagement from './admin/DeliveryZonesManagement';
import AdminSettings from './admin/AdminSettings';
import JobPostingsManagement from './admin/JobPostingsManagement';
import ApiKeysManagement from './admin/ApiKeysManagement';
import PromoCodesManagement from './admin/PromoCodesManagement';
import TransporterApplicationsManagement from './admin/TransporterApplicationsManagement';
import MarketplaceFinanceManagement from './admin/MarketplaceFinanceManagement';
import BatchDispatchManagement from './admin/BatchDispatchManagement';
import { supportApi } from '../lib/supportApi';
import { toast } from 'react-toastify';

type Section =
  | 'dashboard'
  | 'users'
  | 'relay-points'
  | 'relay-applications'
  | 'transporter-applications'
  | 'shipments'
  | 'transporters'
  | 'delivery-zones'
  | 'delivery-pricing'
  | 'promo-codes'
  | 'support-messages'
  | 'marketplace-finance'
  | 'batch-dispatch'
  | 'job-postings'
  | 'api-keys'
  | 'settings';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

interface DeliveryModesSummary {
  relay: number;
  home: number;
}

interface PerformanceMetrics {
  avgDeliveryHours: number | null;
  successRate: number | null;
  incidentCount: number;
  stuckShipments: number;
}

interface SupportSummary {
  open?: number;
  pending?: number;
  resolved?: number;
  closed?: number;
  escalated?: number;
}

interface PendingRelayApplication {
  id: string;
  business_name: string;
  commune: string;
  quartier: string;
  created_at: string;
}

interface StuckShipment {
  id: string;
  tracking_number: string;
  current_status: string;
  updated_at: string;
  age_hours: number;
}

interface TopZone {
  id: string;
  name: string;
  count: number;
}

interface ZoneSummary {
  total: number;
  active: number;
  inactive: number;
}

interface DashboardStats {
  dailyShipments: number;
  inTransit: number;
  deliveredToday: number;
  totalDelivered: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeRelays: number;
  byCommune: Array<{ sender_commune: string | null; count: string | number }>;
  byStatus: Array<{ current_status?: string | null; status?: string | null; count: string | number }>;
  dailyData: Array<{ date: string; shipments: string | number; revenue: string | number }>;
  recentActivity: any[];
  weekGrowth: number;
  deliveryModes: DeliveryModesSummary;
  topRelayPoints: Array<{ id: string; name: string; commune: string | null; count: string | number }>;
  performance: PerformanceMetrics;
  supportSummary: SupportSummary;
  pendingRelayApplications: PendingRelayApplication[];
  pendingRelayApplicationsCount: number;
  stuckShipmentsDetails: StuckShipment[];
  topZones: TopZone[];
  zoneSummary: ZoneSummary;
}

interface NavigationItem {
  id: Section;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, signOut } = useAuth();
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportDetailLoading, setSupportDetailLoading] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<string | null>(null);
  const [selectedSupportTicketDetail, setSelectedSupportTicketDetail] = useState<any | null>(null);
  const [supportReply, setSupportReply] = useState('');
  const [supportReplySending, setSupportReplySending] = useState(false);
  const [supportStatusUpdating, setSupportStatusUpdating] = useState(false);

  useEffect(() => {
    if (currentSection === 'dashboard') {
      loadStats();
      // Refresh stats every 30 seconds
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [currentSection]);

  useEffect(() => {
    if (currentSection === 'support-messages') {
      loadSupportTickets({ keepSelection: true });
      const interval = setInterval(() => loadSupportTickets({ keepSelection: true }), 60000);
      return () => clearInterval(interval);
    }
  }, [currentSection]);

  useEffect(() => {
    if (currentSection === 'support-messages' && selectedSupportTicketId) {
      loadSupportTicketDetail(selectedSupportTicketId);
    }
  }, [currentSection, selectedSupportTicketId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.getStats();
      if (data) {
        setStats(data as DashboardStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupportTickets = async ({ keepSelection = false }: { keepSelection?: boolean } = {}) => {
    setSupportLoading(true);
    try {
      const tickets = await supportApi.getTickets({ status: 'escalated', limit: 50 });
      setSupportTickets(tickets);
      setSupportError(null);
      if (tickets.length === 0) {
        setSelectedSupportTicketId(null);
        setSelectedSupportTicketDetail(null);
      } else if (!keepSelection || !selectedSupportTicketId || !tickets.some((t: any) => t.id === selectedSupportTicketId)) {
        setSelectedSupportTicketId(tickets[0].id);
      }
    } catch (error: any) {
      setSupportError(error?.message || "Impossible de charger les tickets escaladés");
    } finally {
      setSupportLoading(false);
    }
  };

  const loadSupportTicketDetail = async (ticketId: string) => {
    setSupportDetailLoading(true);
    try {
      const detail = await supportApi.getTicket(ticketId);
      setSelectedSupportTicketDetail(detail);
      setSupportReply('');
      setSupportError(null);
    } catch (error: any) {
      setSupportError(error?.message || 'Impossible de charger le ticket');
    } finally {
      setSupportDetailLoading(false);
    }
  };

  const handleSupportStatusChange = async (status: string) => {
    if (!selectedSupportTicketId) return;
    setSupportStatusUpdating(true);
    try {
      await supportApi.updateStatus(selectedSupportTicketId, status);
      toast.success('Statut mis à jour');
      await loadSupportTicketDetail(selectedSupportTicketId);
      await loadSupportTickets({ keepSelection: true });
    } catch (error: any) {
      toast.error(error?.message || 'Impossible de mettre à jour le statut');
    } finally {
      setSupportStatusUpdating(false);
    }
  };

  const handleSupportReply = async () => {
    if (!selectedSupportTicketId || !supportReply.trim()) return;
    setSupportReplySending(true);
    try {
      await supportApi.reply(selectedSupportTicketId, { body: supportReply.trim() });
      toast.success('Réponse envoyée');
      setSupportReply('');
      await loadSupportTicketDetail(selectedSupportTicketId);
      await loadSupportTickets({ keepSelection: true });
    } catch (error: any) {
      toast.error(error?.message || 'Impossible d\'envoyer la réponse');
    } finally {
      setSupportReplySending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate('home');
  };

  const navigationItems = useMemo<NavigationItem[]>(() => {
    const escalatedTickets = stats?.supportSummary?.escalated ?? 0;
    const pendingApplications = stats?.pendingRelayApplicationsCount ?? 0;
    return [
      { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
      { id: 'users', label: 'Utilisateurs', icon: Users },
      { id: 'relay-points', label: 'Points relais', icon: MapPin },
      { id: 'relay-applications', label: 'Candidatures PR', icon: FileCheck, badge: pendingApplications > 0 ? pendingApplications : undefined },
      { id: 'transporter-applications', label: 'Candidatures livreurs', icon: Truck },
      { id: 'shipments', label: 'Envois', icon: Package },
      { id: 'transporters', label: 'Transporteurs', icon: Truck },
      { id: 'delivery-zones', label: 'Zones de livraison', icon: MapPin },
      { id: 'delivery-pricing', label: 'Tarifs', icon: Route },
      { id: 'promo-codes', label: 'Codes promo', icon: Tag },
      { id: 'support-messages', label: 'Messagerie support', icon: MessageSquare, badge: escalatedTickets > 0 ? escalatedTickets : undefined },
      { id: 'marketplace-finance', label: 'Finance Marketplace', icon: TrendingUp },
      { id: 'batch-dispatch', label: 'Dispatch par lots', icon: Layers },
      { id: 'job-postings', label: 'Offres d\'emploi', icon: Briefcase },
      { id: 'api-keys', label: 'API & Intégrations', icon: Code2 },
      { id: 'settings', label: 'Param\u00e8tres', icon: Settings },
    ];
  }, [stats]);

  const formatDailyData = (dailyData: any[]) => {
    if (!dailyData || dailyData.length === 0) return [];
    return dailyData.map(item => ({
      date: item.date,
      shipments: parseInt(item.shipments || 0),
      revenue: parseFloat(item.revenue || 0),
    }));
  };

  const getStatusLabel = (rawStatus?: string | null) => {
    if (!rawStatus) return 'inconnu';
    return rawStatus.replace(/_/g, ' ').toLowerCase();
  };

  const formatStatusData = (byStatus: any[]) => {
    if (!byStatus || byStatus.length === 0) return [];
    return byStatus.map(item => ({
      name: getStatusLabel(item.current_status ?? item.status),
      count: parseInt(item.count || 0),
    }));
  };

  const formatCommuneData = (byCommune: any[]) => {
    if (!byCommune || byCommune.length === 0) return [];
    return byCommune
      .slice(0, 5)
      .map(item => ({
        name: item.sender_commune || 'Autre',
      count: parseInt(item.count || 0),
    }));
  };

  const formatZoneData = (zones: TopZone[] = []) => {
    return zones.slice(0, 8).map((zone) => ({
      name: zone.name,
      count: Number(zone.count) || 0,
    }));
  };

  const formatTopRelayPoints = (relayPoints: DashboardStats['topRelayPoints'] = []) => {
    return relayPoints.map((relay) => ({
      id: relay.id,
      name: relay.name,
      commune: relay.commune,
      count: Number(relay.count) || 0,
    }));
  };

  const formatHoursToHuman = (hours: number | null | undefined) => {
    if (!hours || hours <= 0) return 'N/A';
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days} j ${remainingHours} h`;
    }
    return `${Math.round(hours)} h`;
  };

  const formatRelativeHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days} j ${remainingHours} h`;
    }
    return `${Math.round(hours)} h`;
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
                <p className="text-sm sm:text-base text-gray-600">Vue d'ensemble de la plateforme COLISDIRECT</p>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Mis à jour il y a quelques instants</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6C00]"></div>
              </div>
            ) : stats ? (
              <>
                {/* Top Stats Cards */}
                <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 md:gap-4 lg:gap-6">
                  <StatsCard
                    title="Colis du jour"
                    value={stats.dailyShipments || 0}
                    icon={Package}
                    color="orange"
                    trend={stats.weekGrowth ? { value: stats.weekGrowth, isPositive: stats.weekGrowth >= 0 } : undefined}
                  />
                  <StatsCard
                    title="En transit"
                    value={stats.inTransit || 0}
                    icon={Truck}
                    color="blue"
                  />
                  <StatsCard
                    title="Livrés aujourd'hui"
                    value={stats.deliveredToday || 0}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatsCard
                    title="Utilisateurs"
                    value={stats.totalUsers || 0}
                    icon={Users}
                    color="purple"
                  />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatsCard
                    title="Revenus mensuels"
                    value={`${(stats.monthlyRevenue || 0).toLocaleString()} FCFA`}
                    icon={DollarSign}
                    color="green"
                  />
                  <StatsCard
                    title="Points relais actifs"
                    value={stats.activeRelays || 0}
                    icon={MapPin}
                    color="blue"
                  />
                  <StatsCard
                    title="Total livrés"
                    value={stats.totalDelivered || 0}
                    icon={Activity}
                    color="orange"
                  />
                </div>

                {/* Delivery mode & performance */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Répartition des livraisons (30 jours)</h3>
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      {(() => {
                        const relayCount = stats.deliveryModes?.relay ?? 0;
                        const homeCount = stats.deliveryModes?.home ?? 0;
                        const totalDeliveries = relayCount + homeCount;
                        const relayPercentage = totalDeliveries > 0 ? Math.round((relayCount / totalDeliveries) * 100) : 0;
                        const homePercentage = totalDeliveries > 0 ? Math.round((homeCount / totalDeliveries) * 100) : 0;
                        return (
                          <>
                            <div className="border border-gray-100 rounded-lg p-4 bg-orange-50">
                              <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
                                <Building2 className="w-4 h-4" /> Points relais
                              </div>
                              <p className="text-2xl font-bold text-gray-900 mt-2">{relayCount.toLocaleString()}</p>
                              <p className="text-sm text-gray-500">{relayPercentage}% des livraisons</p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Home className="w-4 h-4" /> Domicile
                              </div>
                              <p className="text-2xl font-bold text-gray-900 mt-2">{homeCount.toLocaleString()}</p>
                              <p className="text-sm text-gray-500">{homePercentage}% des livraisons</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Performance opérationnelle</h3>
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-3 mt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Délai moyen dépôt → livraison</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatHoursToHuman(stats.performance?.avgDeliveryHours ?? null)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Taux de réussite</span>
                        <span className="text-sm font-semibold text-green-600">
                          {stats.performance?.successRate != null
                            ? `${Math.round(stats.performance.successRate * 10) / 10}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Incidents / retours</span>
                        <span className="text-sm font-semibold text-red-600">
                          {stats.performance?.incidentCount?.toLocaleString() ?? '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Colis bloqués &gt; 48h</span>
                        <span className="text-sm font-semibold text-orange-600">
                          {stats.performance?.stuckShipments?.toLocaleString() ?? '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support summary & alerts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Tickets support</h3>
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {['open', 'pending', 'escalated', 'resolved', 'closed'].map((statusKey) => {
                        const count = stats.supportSummary?.[statusKey as keyof SupportSummary] ?? 0;
                        const labelMap: Record<string, string> = {
                          open: 'Ouverts',
                          pending: 'En cours',
                          escalated: 'Escaladés',
                          resolved: 'Résolus',
                          closed: 'Fermés',
                        };
                        const badgeClass =
                          statusKey === 'escalated'
                            ? 'bg-orange-100 text-orange-700'
                            : statusKey === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : statusKey === 'closed'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-700';
                        return (
                          <span
                            key={statusKey}
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                          >
                            {labelMap[statusKey] || statusKey}
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-white text-gray-900 border border-transparent">
                              {count}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Alertes rapides</h3>
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                    <ul className="space-y-3 mt-6 text-sm text-gray-700">
                      <li className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">Candidatures relais à valider</p>
                          <p className="text-gray-500 text-xs">Applications reçues en statut « en attente »</p>
                        </div>
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
                          {stats.pendingRelayApplicationsCount.toLocaleString()}
                        </span>
                      </li>
                      <li className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">Tickets escaladés</p>
                          <p className="text-gray-500 text-xs">Suivi prioritaire requis côté support</p>
                        </div>
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                          {(stats.supportSummary?.escalated ?? 0).toLocaleString()}
                        </span>
                      </li>
                      <li className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">Colis sans mise à jour &gt; 48h</p>
                          <p className="text-gray-500 text-xs">À relancer auprès des transporteurs / relais</p>
                        </div>
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                          {stats.performance?.stuckShipments?.toLocaleString() ?? '0'}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Charts Row 1: Daily Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Évolution des colis (30 jours)</h3>
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </div>
                    {stats.dailyData && stats.dailyData.length > 0 ? (
                      <LineChart
                        data={formatDailyData(stats.dailyData)}
                        dataKey="shipments"
                        name="Colis"
                        color="#FF6C00"
                        height={250}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-gray-500">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Revenus quotidiens</h3>
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </div>
                    {stats.dailyData && stats.dailyData.length > 0 ? (
                      <LineChart
                        data={formatDailyData(stats.dailyData)}
                        dataKey="revenue"
                        name="Revenus (FCFA)"
                        color="#10b981"
                        height={250}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-gray-500">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row 2: Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-4 text-gray-900">Colis par statut</h3>
                    {stats.byStatus && stats.byStatus.length > 0 ? (
                      <PieChart
                        data={formatStatusData(stats.byStatus)}
                        dataKey="count"
                        nameKey="name"
                        height={300}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-500">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-4 text-gray-900">Top communes</h3>
                    {stats.byCommune && stats.byCommune.length > 0 ? (
                      <BarChart
                        data={formatCommuneData(stats.byCommune)}
                        dataKey="count"
                        name="Colis"
                        color="#3b82f6"
                        height={300}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-500">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                </div>

                {/* Top relay points & stuck shipments */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Top points relais (30 jours)</h3>
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {formatTopRelayPoints(stats.topRelayPoints).length > 0 ? (
                        formatTopRelayPoints(stats.topRelayPoints).map((relay, index) => (
                          <div
                            key={relay.id}
                            className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {index + 1}. {relay.name}
                              </p>
                              <p className="text-xs text-gray-500">{relay.commune || 'Commune non renseignée'}</p>
                            </div>
                            <span className="text-sm font-semibold text-[#FF6C00]">{relay.count.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Aucune donnée pour le moment.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Colis bloqués (&gt; 48h sans scan)</h3>
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {stats.stuckShipmentsDetails.length > 0 ? (
                        stats.stuckShipmentsDetails.map((shipment) => (
                          <div
                            key={shipment.id}
                            className="p-3 border border-gray-100 rounded-lg hover:bg-red-50/40 transition-colors"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-gray-900">#{shipment.tracking_number}</span>
                              <span className="text-xs font-medium text-red-600">
                                {formatRelativeHours(Number(shipment.age_hours))}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Statut : {getStatusLabel(shipment.current_status)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Aucun colis en retard critique.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pending relay applications & delivery zones */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Candidatures relais en attente</h3>
                      <FileCheck className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {stats.pendingRelayApplications.length > 0 ? (
                        stats.pendingRelayApplications.map((application) => (
                          <div key={application.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">{application.business_name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(application.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {application.commune} · {application.quartier}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Aucune candidature à traiter.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Zones de livraison</h3>
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          Actives : {stats.zoneSummary.active.toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                          Inactives : {stats.zoneSummary.inactive.toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">
                          Total : {stats.zoneSummary.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-6">
                        {stats.topZones && stats.topZones.length > 0 ? (
                          <BarChart
                            data={formatZoneData(stats.topZones)}
                            dataKey="count"
                            name="Colis"
                            color="#FF6C00"
                            height={280}
                          />
                        ) : (
                          <p className="text-sm text-gray-500">Aucune donnée disponible pour les zones.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                      <ActivityFeed activities={stats.recentActivity} />
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">Activité récente</h3>
                        <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats Summary */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">Résumé par statut</h3>
                      <div className="space-y-3">
                        {stats.byStatus && stats.byStatus.length > 0 ? (
                          stats.byStatus.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm text-gray-700 capitalize">{getStatusLabel(item.current_status ?? item.status)}</span>
                              <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">Aucune donnée</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500 text-center py-8">Impossible de charger les statistiques</p>
              </div>
            )}
          </div>
        );
      case 'users':
        return <UsersManagement />;
      case 'relay-points':
        return <RelayPointsManagement />;
      case 'relay-applications':
        return <RelayApplicationsManagement />;
      case 'shipments':
        return <ShipmentsManagement />;
      case 'transporters':
        return <TransportersManagement />;
      case 'delivery-zones':
        return <DeliveryZonesManagement />;
      case 'delivery-pricing':
        return <DeliveryPricingManagement />;
      case 'promo-codes':
        return <PromoCodesManagement />;
      case 'transporter-applications':
        return <TransporterApplicationsManagement />;
      case 'marketplace-finance':
        return <MarketplaceFinanceManagement />;
      case 'batch-dispatch':
        return <BatchDispatchManagement />;
      case 'support-messages':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Messagerie support</h1>
                <p className="text-sm text-gray-600">Tickets transmis par l'équipe support</p>
              </div>
              <button
                type="button"
                onClick={() => loadSupportTickets({ keepSelection: true })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" /> Actualiser
              </button>
            </div>

            {supportError && (
              <div className="p-4 border border-red-200 bg-red-50 text-sm text-red-700 rounded-lg">
                {supportError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Tickets escaladés</h2>
                    <p className="text-xs text-gray-500">Assignés à l'administrateur</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                    {supportTickets.length}
                  </span>
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {supportLoading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                      Chargement...
                    </div>
                  ) : supportTickets.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500 text-center px-4">
                      Aucun ticket en attente de validation.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {supportTickets.map((ticket) => (
                        <li key={ticket.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedSupportTicketId(ticket.id)}
                            className={`w-full text-left px-5 py-4 transition-colors ${
                              selectedSupportTicketId === ticket.id ? 'bg-[#FFF4EB] border-l-4 border-[#FF6C00]' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-900 line-clamp-1">{ticket.subject || 'Ticket sans sujet'}</div>
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.summary || ticket.last_message_preview || 'Aucun message'}</div>
                              </div>
                              <div className="text-[10px] font-medium uppercase tracking-wide text-orange-600 bg-orange-50 rounded-full px-2 py-1">
                                Escaladé
                              </div>
                            </div>
                            <div className="mt-3 flex items-center text-[11px] text-gray-500 gap-3">
                              <span>{ticket.customer_name || 'Client inconnu'}</span>
                              {ticket.tracking_number && (
                                <span className="text-[#FF6C00] font-medium">#{ticket.tracking_number}</span>
                              )}
                              <span>{new Date(ticket.updated_at || ticket.created_at).toLocaleString('fr-FR')}</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm min-h-[520px] flex flex-col">
                {supportDetailLoading ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                    Chargement du ticket...
                  </div>
                ) : !selectedSupportTicketDetail ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500 px-6 text-center">
                    Sélectionnez un ticket pour voir la conversation et y répondre.
                  </div>
                ) : (
                  <>
                    <div className="border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{selectedSupportTicketDetail.ticket.subject || 'Ticket support'}</h2>
                        <div className="text-xs text-gray-500 mt-1 space-x-2">
                          <span>{selectedSupportTicketDetail.ticket.customer_name || 'Client'}</span>
                          {selectedSupportTicketDetail.ticket.tracking_number && (
                            <span className="text-[#FF6C00] font-medium">#{selectedSupportTicketDetail.ticket.tracking_number}</span>
                          )}
                          <span>{new Date(selectedSupportTicketDetail.ticket.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] uppercase text-gray-400 block mb-1">Statut</label>
                        <select
                          value={selectedSupportTicketDetail.ticket.status}
                          onChange={(e) => handleSupportStatusChange(e.target.value)}
                          disabled={supportStatusUpdating}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="escalated">Escaladé</option>
                          <option value="pending">En cours</option>
                          <option value="resolved">Résolu</option>
                          <option value="closed">Fermé</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-gradient-to-b from-white via-[#FFF7F1] to-white">
                      {selectedSupportTicketDetail.messages.map((msg: any) => {
                        const isAgent = msg.sender_type === 'agent' || msg.sender_type === 'admin';
                        const isSystem = msg.sender_type === 'system';
                        const alignment = isSystem ? 'mx-auto' : isAgent ? 'ml-auto' : 'mr-auto';
                        const bubbleClasses = isSystem
                          ? 'bg-white border border-dashed border-gray-300 text-gray-600'
                          : isAgent
                          ? 'bg-gradient-to-r from-[#FF6C00] to-[#ff914d] text-white'
                          : 'bg-white border border-gray-200 text-gray-900';
                        return (
                          <div key={msg.id} className={`max-w-lg ${alignment} rounded-2xl px-4 py-3 shadow-sm ${bubbleClasses}`}>
                            <div className="text-xs font-semibold mb-1">
                              {msg.sender_type === 'admin'
                                ? 'Administrateur'
                                : msg.sender_type === 'agent'
                                ? msg.sender_user?.first_name
                                  ? `${msg.sender_user.first_name} ${msg.sender_user.last_name || ''}`.trim()
                                  : 'Support'
                                : msg.sender_type === 'system'
                                ? 'Système'
                                : selectedSupportTicketDetail.ticket.customer_name || 'Client'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</div>
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((file: any) => (
                                  <a
                                    key={file.id || file.url}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                                  >
                                    📎 {file.name || 'Pièce jointe'}
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 text-[11px] text-gray-500">
                              {new Date(msg.created_at).toLocaleString('fr-FR')}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-white">
                      <textarea
                        value={supportReply}
                        onChange={(e) => setSupportReply(e.target.value)}
                        placeholder="Répondre au support..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">La réponse sera envoyée au client et visible par le support.</span>
                        <button
                          type="button"
                          onClick={handleSupportReply}
                          disabled={supportReplySending || !supportReply.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white text-sm font-semibold rounded-lg hover:bg-[#ff8534] disabled:opacity-60"
                        >
                          {supportReplySending ? 'Envoi...' : (<><Send className="w-4 h-4" /> Envoyer</>)}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      case 'job-postings':
        return <JobPostingsManagement />;
      case 'api-keys':
        return <ApiKeysManagement />;
      case 'settings':
        return <AdminSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Logo size="sm" showText={false} />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-xl font-bold text-gray-900">COLISDIRECT Admin</h1>
              <p className="text-xs sm:text-sm text-gray-600">Panneau d'administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu">
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div className="hidden sm:block text-right">
              <p className="text-xs sm:text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#FF6C00] text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && item.badge > 0 ? (
                    <span className={`${isActive ? 'bg-white text-[#FF6C00]' : 'bg-[#FF6C00] text-white'} ml-auto inline-flex min-w-[1.75rem] h-6 items-center justify-center rounded-full text-xs font-semibold px-2`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>
        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Logo size="sm" showText={false} />
                  <span className="text-sm font-semibold">Menu</span>
                </div>
                <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileNavOpen(false)} aria-label="Fermer le menu">
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>
              <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setCurrentSection(item.id); setMobileNavOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive ? 'bg-[#FF6C00] text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge !== undefined && item.badge !== null && item.badge > 0 ? (
                        <span className={`${isActive ? 'bg-white text-[#FF6C00]' : 'bg-[#FF6C00] text-white'} ml-auto inline-flex min-w-[1.75rem] h-6 items-center justify-center rounded-full text-xs font-semibold px-2`}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
