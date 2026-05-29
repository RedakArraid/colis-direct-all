import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import { supportApi } from '../../lib/supportApi';
import { API_URL, api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import PhoneInput from '../../components/PhoneInput';
import { AlertCircle, CheckCircle, Loader2, Phone, RefreshCw, XCircle, MapPin as MapPinIcon, User as UserIcon, Receipt, Wallet, LayoutDashboard, MessageSquare, Store } from 'lucide-react';
import {
  getShipmentStatusBadgeClass,
  getShipmentStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
  normalizePaymentStatus,
  normalizeShipmentStatus,
} from '../../utils/shipmentStatus';

type TransferMode = 'transporter' | 'relay' | 'admin' | 'agent';

interface TransferDirectory {
  agents: Array<{ id: string; first_name: string; last_name: string; email: string; role: string }>;
  admins: Array<{ id: string; first_name: string; last_name: string; email: string }>;
  transporters: Array<{ id: string; first_name: string; last_name: string; email: string; vehicle_type?: string; status?: string }>;
  relay_points: Array<{ id: string; name: string; commune: string; phone?: string; email?: string }>;
}

interface AttachmentDraft {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatFcfa = (value?: number | string | null) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return '0 FCFA';
  }
  return `${amount.toLocaleString('fr-FR')} FCFA`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
};



const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

type UnknownRecord = Record<string, unknown>;

interface SupportUser extends UnknownRecord {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  vehicle_type?: string;
  status?: string;
}

interface SupportTransporterProfile extends UnknownRecord {
  vehicle_type?: string;
  status?: string;
}

interface SupportRelay extends UnknownRecord {
  id?: string;
  name?: string;
  address?: string;
  commune?: string;
  phone?: string;
}

interface SupportShipment extends UnknownRecord {
  id?: string;
  shipment_id?: string | null;
  tracking_number?: string;
  current_status?: string | null;
  status?: string | null;
  payment_status?: string | null;
  paymentStatus?: string | null;
  price?: number | string | null;
  printing_fee?: number | string | null;
  assistance_fee?: number | string | null;
  box_price?: number | string | null;
  pickup_code?: string | null;
  weight?: number | string | null;
  home_delivery?: boolean | null;
  package_type?: string | null;
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  sender_phone?: string | null;
  sender_email?: string | null;
  sender_address?: string | null;
  sender_commune?: string | null;
  sender_quartier?: string | null;
  recipient_first_name?: string | null;
  recipient_last_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  recipient_address?: string | null;
  recipient_commune?: string | null;
  recipient_quartier?: string | null;
  created_at?: string | null;
  transporter_profile?: SupportTransporterProfile | null;
  transporter_user?: SupportUser | null;
  origin_relay?: SupportRelay | null;
  destination_relay?: SupportRelay | null;
}

interface SupportMessageAttachment extends UnknownRecord {
  id?: string;
  name?: string;
  url?: string;
  dataUrl?: string;
  base64?: string;
  type?: string;
}

interface SupportTicketMessage extends UnknownRecord {
  id: string;
  body?: string;
  author_type?: string;
  author_name?: string;
  created_at?: string;
  attachments?: SupportMessageAttachment[];
}

interface SupportTicketNote extends UnknownRecord {
  id: string;
  content?: string;
  created_at?: string;
  author_user?: SupportUser | null;
}

interface SupportTicketReminder extends UnknownRecord {
  id: string;
  scheduled_for: string;
  notes?: string;
  created_by_user?: SupportUser | null;
}

interface SupportTicket extends UnknownRecord {
  id: string;
  status?: string;
  priority?: string;
  channel?: string;
  assigned?: string;
  summary?: string;
  subject?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  tracking_number?: string;
  last_message_at?: string;
  shipment?: SupportShipment | null;
}

interface SupportTicketDetail extends UnknownRecord {
  ticket: SupportTicket & {
    shipment?: SupportShipment | null;
    transporter_profile?: SupportTransporterProfile | null;
    transporter_user?: SupportUser | null;
    origin_relay?: SupportRelay | null;
    destination_relay?: SupportRelay | null;
  };
  messages: SupportTicketMessage[];
  notes: SupportTicketNote[];
  reminders: SupportTicketReminder[];
}

type SupportDashboardStats = Record<string, number | string | null | undefined> & {
  open?: number;
  pending?: number;
  resolved?: number;
  urgent?: number;
  escalated?: number;
  avgResponseMinutes?: number;
};

interface SupportFilters {
  status?: string;
  channel?: string;
  priority?: string;
  assigned?: string;
  search?: string;
}


interface RelayCashPaymentEntry {
  id: string;
  shipment_id: string;
  tracking_number: string;
  relay_point_id?: string | null;
  relay_name?: string | null;
  amount_expected?: number | string | null;
  amount_collected?: number | string | null;
  status?: string | null;
  collected_by_first_name?: string | null;
  collected_by_last_name?: string | null;
  collected_by_email?: string | null;
  created_at: string;
  collected_at?: string | null;
  notes?: string | null;
}

interface RelayCashDashboardData {
  pending: RelayCashPaymentEntry[];
  collected: RelayCashPaymentEntry[];
  summary: {
    byRelay: Array<{
      relay_point_id: string | null;
      relay_name: string;
      pending_count: number | string | null;
      collected_count: number | string | null;
      pending_amount: number | string | null;
      collected_amount: number | string | null;
    }>;
  };
}

interface SupportDashboardState {
  tickets: SupportTicket[];
  activeTicketId: string | null;
  activeTicketDetail: SupportTicketDetail | null;
  filters: SupportFilters;
  stats: SupportDashboardStats;
  loading: boolean;
  error: string | null;
  updatingPriorityTicketId?: string;
  priorityMarking?: boolean;
}

type Action =
  | { type: 'SET_TICKETS'; tickets: SupportTicket[] }
  | { type: 'SET_ACTIVE_TICKET'; id: string | null }
  | { type: 'SET_TICKET_DETAIL'; detail: SupportTicketDetail }
  | { type: 'UPDATE_ACTIVE_SHIPMENT'; shipment: SupportShipment | null }
  | { type: 'UPDATE_FILTERS'; filters: Partial<SupportFilters> }
  | { type: 'SET_STATS'; stats: SupportDashboardStats }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_UPDATING_PRIORITY_TICKET_ID'; updatingPriorityTicketId?: string }
  | { type: 'SET_PRIORITY_MARKING'; priorityMarking?: boolean };

const initialState: SupportDashboardState = {
  tickets: [],
  activeTicketId: null,
  activeTicketDetail: null,
  filters: {},
  stats: {} as SupportDashboardStats,
  loading: true,
  error: null,
};

type TransferOption = (SupportUser & { id: string }) | (SupportRelay & { id: string });

function reducer(state: SupportDashboardState, action: Action): SupportDashboardState {
  switch (action.type) {
    case 'SET_TICKETS':
      return { ...state, tickets: action.tickets };
    case 'SET_ACTIVE_TICKET':
      return { ...state, activeTicketId: action.id, activeTicketDetail: null };
    case 'SET_TICKET_DETAIL':
      return { ...state, activeTicketDetail: action.detail };
    case 'UPDATE_ACTIVE_SHIPMENT':
      if (!state.activeTicketDetail) {
        return state;
      }
      return {
        ...state,
        activeTicketDetail: {
          ...state.activeTicketDetail,
          ticket: {
            ...state.activeTicketDetail.ticket,
            shipment: action.shipment,
          },
        },
      };
    case 'UPDATE_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case 'SET_STATS':
      return { ...state, stats: action.stats };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_UPDATING_PRIORITY_TICKET_ID':
      return { ...state, updatingPriorityTicketId: action.updatingPriorityTicketId };
    case 'SET_PRIORITY_MARKING':
      return { ...state, priorityMarking: action.priorityMarking };
    default:
      return state;
  }
}

const SupportDashboardSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="h-12 bg-gray-200 rounded" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="h-32 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="h-96 bg-gray-200 rounded" />
      <div className="lg:col-span-2 h-96 bg-gray-200 rounded" />
      <div className="h-96 bg-gray-200 rounded" />
    </div>
  </div>
);

const SupportDashboardError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="p-6">
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      <div className="font-semibold">Erreur de chargement</div>
      <p className="text-sm mt-1">{error}</p>
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Réessayer
      </button>
    </div>
  </div>
);


const RelayCashDashboardSection = ({
  data,
  loading,
  error,
  onRetry,
}: {
  data: RelayCashDashboardData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) => {
  const pending = data?.pending ?? [];
  const collected = data?.collected ?? [];
  const summaryRows = data?.summary?.byRelay ?? [];

  return (
    <section className="px-6 mt-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Paiements Point Relais</h2>
            <p className="text-xs text-gray-500">Encaissements réalisés directement dans les points relais partenaires.</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="w-4 h-4 text-[#FF6C00] animate-spin" aria-hidden />}
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#FF6C00] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>
        {error ? (
          <div className="p-6">
            <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Impossible de charger les paiements point relais</p>
                <p className="mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Synthèse par point relais</h3>
              {summaryRows.length === 0 ? (
                <p className="text-xs text-gray-500">Aucun encaissement enregistré pour le moment.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summaryRows.map((row) => {
                    const pendingCount = Number(row.pending_count ?? 0);
                    const collectedCount = Number(row.collected_count ?? 0);
                    const pendingAmount = Number(row.pending_amount ?? 0);
                    const collectedAmount = Number(row.collected_amount ?? 0);
                    return (
                      <div key={row.relay_point_id ?? row.relay_name} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-white border border-gray-200 rounded-full p-2">
                            <Wallet className="w-4 h-4 text-[#FF6C00]" />
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Point relais</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {row.relay_name || 'Relais non défini'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Encaissements en attente</span>
                            <span className="font-semibold text-gray-900">{pendingCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Montant à encaisser</span>
                            <span className="font-semibold text-orange-600">{formatFcfa(pendingAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Encaissements confirmés</span>
                            <span className="font-semibold text-green-600">{formatFcfa(collectedAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transactions</span>
                            <span className="font-semibold text-gray-900">{collectedCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#FF6C00]" />
                    <h3 className="text-sm font-semibold text-gray-900">Encaissements en attente</h3>
                  </div>
                  <span className="text-xs text-gray-500">{pending.length} dossier(s)</span>
                </div>
                {pending.length === 0 ? (
                  <div className="p-4 text-xs text-gray-500">Aucun encaissement en attente.</div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {pending.map((payment) => (
                      <li key={payment.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase text-gray-500">N° de suivi</p>
                            <p className="text-sm font-semibold text-gray-900">{payment.tracking_number}</p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 font-semibold">En attente</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          <span>{payment.relay_name || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                          <div>
                            <p className="text-gray-500">Montant à encaisser</p>
                            <p className="font-semibold text-gray-900">{formatFcfa(payment.amount_expected ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Déclaré le</p>
                            <p className="font-medium">{formatDateTime(payment.created_at)}</p>
                          </div>
                        </div>
                        {payment.notes && (
                          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
                            {payment.notes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Paiements confirmés</h3>
                  </div>
                  <span className="text-xs text-gray-500">{collected.length} dossier(s)</span>
                </div>
                {collected.length === 0 ? (
                  <div className="p-4 text-xs text-gray-500">Aucun encaissement confirmé récemment.</div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {collected.map((payment) => (
                      <li key={payment.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase text-gray-500">N° de suivi</p>
                            <p className="text-sm font-semibold text-gray-900">{payment.tracking_number}</p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">Confirmé</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          <span>{payment.relay_name || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                          <div>
                            <p className="text-gray-500">Montant encaissé</p>
                            <p className="font-semibold text-gray-900">{formatFcfa(payment.amount_collected ?? payment.amount_expected ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Confirmé le</p>
                            <p className="font-medium">{formatDateTime(payment.collected_at || payment.created_at)}</p>
                          </div>
                        </div>
                        {(payment.collected_by_first_name || payment.collected_by_last_name || payment.collected_by_email) && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span>
                              {(payment.collected_by_first_name || '') + ' ' + (payment.collected_by_last_name || '')}
                              {payment.collected_by_email ? ` • ${payment.collected_by_email}` : ''}
                            </span>
                          </div>
                        )}
                        {payment.notes && (
                          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
                            {payment.notes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const DashboardHeader = ({
  filters,
  onSearch,
  user,
  onToggleProfileMenu,
  isProfileMenuOpen,
  onShowProfile,
  onSignOut,
  profileMenuRef,
  notifications,
  notificationsLoading,
  isNotificationsOpen,
  onToggleNotifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  notificationsRef,
}: {
  filters: SupportDashboardState['filters'];
  onSearch: (value: string) => void;
  user: SupportUser | null | { first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  onToggleProfileMenu: () => void;
  isProfileMenuOpen: boolean;
  onShowProfile: () => void;
  onSignOut: () => void;
  profileMenuRef: RefObject<HTMLDivElement>;
  notifications: any[];
  notificationsLoading: boolean;
  isNotificationsOpen: boolean;
  onToggleNotifications: () => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  notificationsRef: RefObject<HTMLDivElement>;
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="COLISDIRECT"
            className="w-40 cursor-pointer object-contain"
            onClick={() => (window.location.hash = '/dashboard')}
          />
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch(searchInput);
                }
              }}
              placeholder="Rechercher client, numéro de suivi ou ticket"
              className="w-72 lg:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
            <button
              onClick={() => onSearch(searchInput)}
              className="absolute inset-y-1 right-1 px-3 bg-[#FF6C00] text-white rounded-md text-sm"
            >
              Rechercher
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div ref={notificationsRef} className="relative">
            <button
              onClick={onToggleNotifications}
              className="relative text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="sr-only">Notifications</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.25 18.75a1.5 1.5 0 01-3 0m8.25-2.25v-2.1A6.75 6.75 0 0012 7.119V6a1.5 1.5 0 10-3 0v1.119a6.75 6.75 0 00-5.25 6.331v2.1l-.9 1.8A.75.75 0 003.75 19.5h16.5a.75.75 0 00.675-1.068l-.9-1.932z"
                />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-xs text-[#FF6C00] hover:underline"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notificationsLoading ? (
                    <div className="p-4 text-sm text-gray-500 text-center">Chargement...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">Aucune notification</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => onMarkNotificationRead(notification.id)}
                        >
                          <div className="text-sm font-medium text-gray-900">{notification.title || 'Notification'}</div>
                          <div className="text-xs text-gray-600 mt-1">{notification.message || notification.body}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {notification.created_at ? new Date(notification.created_at).toLocaleString('fr-FR') : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={onToggleProfileMenu}
              className="flex items-center gap-3 border border-gray-200 rounded-full pl-2 pr-4 py-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6C00]"
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6C00] text-white font-semibold text-sm">
                {user?.first_name?.[0]?.toUpperCase() || 'A'}
                <span className="absolute -bottom-1 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              </span>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">{user?.first_name} {user?.last_name}</div>
                <div className="text-xs text-gray-500">Support client</div>
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-30">
                <button
                  type="button"
                  onClick={onShowProfile}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Voir mon profil
                </button>
                <div className="my-1 h-px bg-gray-100" />
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const ConversationHeader = ({ ticket }: { ticket: SupportTicket }) => (
  <div className="px-6 py-4 border-b border-gray-200 bg-white">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="font-semibold text-sm text-gray-900">{ticket.customer_name || 'Client inconnu'}</div>
        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {ticket.channel === 'chatbot' && '💬 Chatbot'}
            {ticket.channel === 'email' && '✉️ Email'}
            {ticket.channel === 'contact_form' && '🧾 Formulaire'}
            {ticket.channel === 'manual' && '🛠️ Manuel'}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full ${
              ticket.status === 'open'
                ? 'bg-red-100 text-red-700'
                : ticket.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : ticket.status === 'resolved'
                ? 'bg-green-100 text-green-700'
                : ticket.status === 'escalated'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ticket.status === 'open' && 'Ouvert'}
            {ticket.status === 'pending' && 'En cours de résolution'}
            {ticket.status === 'resolved' && 'Résolu'}
            {ticket.status === 'closed' && 'Fermé'}
            {ticket.status === 'escalated' && 'Escaladé'}
          </span>
          {ticket.priority === 'urgent' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-semibold">
              ⚡ Urgent
            </span>
          )}
        </div>
        {ticket.tracking_number && (
          <div className="text-xs font-mono text-[#FF6C00] mt-2">#{ticket.tracking_number}</div>
        )}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {ticket.last_message_at ? new Date(ticket.last_message_at).toLocaleString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          }) : '—'}
        </span>
      </div>
    </div>
  </div>
);

const ConversationMessages = ({
  messages,
  currentUserName,
  scrollRef,
}: {
  messages: SupportTicketMessage[];
  currentUserName?: string | null;
  scrollRef?: RefObject<HTMLDivElement>;
}) => (
  <div
    ref={scrollRef}
    className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-gradient-to-b from-white via-[#fff7f1] to-white"
  >
    {messages.length === 0 ? (
      <div className="text-sm text-gray-500 text-center py-12">
        Aucun message pour le moment. Envoyez une réponse pour débuter la conversation.
      </div>
    ) : (
      messages.map((msg, index) => {
        const isAgent = msg.author_type === 'agent';
        const isSystem = msg.author_type === 'system';
        const bubbleClasses = isSystem
          ? 'mx-auto bg-white border border-dashed border-gray-300 text-gray-500'
          : isAgent
          ? 'ml-auto bg-gradient-to-r from-[#FF6C00] to-[#ff914d] text-white'
          : 'mr-auto bg-white border border-gray-200 text-gray-900';

        const senderLabel = isSystem
          ? 'Système'
          : isAgent
          ? msg.author_name
            ? `${msg.author_name} ${msg.author_name || ''}`.trim()
            : 'Support COLISDIRECT'
          : currentUserName || 'Client';

        const timestamp = msg.created_at
          ? new Date(msg.created_at).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—';

        return (
          <div key={msg.id} className="flex flex-col gap-1">
            <div
              className={`flex ${
                isSystem ? 'justify-center' : isAgent ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-full sm:max-w-[70%] px-4 py-3 rounded-3xl shadow-sm ${bubbleClasses}`}>
                <div
                  className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                    isAgent ? 'text-white/80' : 'text-gray-500'
                  }`}
                >
                  {senderLabel}
                </div>
                <div className="text-sm leading-6 whitespace-pre-wrap">{msg.body}</div>
                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                  <div className="mt-3 space-y-2 text-xs">
                    {msg.attachments.map((attachment: SupportMessageAttachment, idx: number) => {
                      const href =
                        attachment.url ||
                        attachment.dataUrl ||
                        (attachment.base64
                          ? `data:${attachment.type || 'application/octet-stream'};base64,${attachment.base64}`
                          : null);
                      if (!href) {
                        return null;
                      }
                      const linkClass = isAgent ? 'text-white underline' : 'text-[#FF6C00] underline';
                      const label = attachment.name || `Pièce jointe ${idx + 1}`;
                      return (
                        <a
                          key={attachment.id || `${href}-${idx}`}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          download={attachment.name || undefined}
                          className={linkClass}
                        >
                          📎 {label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-gray-400 text-center">{timestamp}</div>
            {index !== messages.length - 1 && (
              <div className="relative flex items-center justify-center py-1">
                <div className="w-12 border-t border-dashed border-gray-200" />
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
);

const ConversationComposer = ({
  onSend,
  onUpdateStatus,
  onOpenTransfer,
  ticket,
  statusUpdating,
}: {
  onSend: (payload: { body: string; status?: string; attachments?: AttachmentDraft[] }) => Promise<void>;
  onUpdateStatus: (status: string) => Promise<void>;
  onOpenTransfer: (mode: TransferMode) => void;
  ticket: SupportTicket;
  statusUpdating: boolean;
}) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStatus(ticket.status);
  }, [ticket.status]);

  const handleAddFiles = async (files: FileList | null) => {
    if (!files) return;
    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setAttachmentError(`Vous pouvez joindre au maximum ${MAX_ATTACHMENTS} fichiers.`);
      return;
    }
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const processed: AttachmentDraft[] = [];
    for (const file of selectedFiles) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setAttachmentError(`"${file.name}" dépasse la taille maximale de 5 Mo.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        processed.push({
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        });
      } catch (error) {
        console.error('Erreur lecture fichier', error);
        setAttachmentError(`Impossible de lire le fichier "${file.name}".`);
      }
    }
    if (processed.length > 0) {
      setAttachments((prev) => [...prev, ...processed]);
      setAttachmentError(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const handleQuickInsert = (text: string) => {
    setMessage((prev) => {
      if (!prev) return text;
      if (prev.endsWith('\n')) {
        return `${prev}${text}`;
      }
      return `${prev}\n\n${text}`;
    });
  };

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await onSend({
        body: message,
        status: status === ticket.status ? undefined : status,
        attachments,
      });
      setMessage('');
      setAttachments([]);
      setAttachmentError(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 px-6 py-4 bg-white space-y-3 sticky bottom-0 z-30 shadow-[0_-4px_12px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 flex-col lg:flex-row">
          <select
            value={status}
            onChange={async (e) => {
              const next = e.target.value;
              setStatus(next);
              await onUpdateStatus(next);
            }}
            disabled={statusUpdating}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="open">Ouvert</option>
            <option value="pending">En cours de résolution</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Fermé</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleQuickInsert(
                  "Bonjour,\n\nNous vous prions de nous excuser pour le retard. Notre équipe suit votre colis de près et reviendra vers vous dès que possible.\n\nBien cordialement,"
                )
              }
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              Réponse : retard livraison
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickInsert(
                  "Bonjour,\n\nVotre colis est en transit et sera bientôt disponible. Merci de votre patience.\n\nCordialement,"
                )
              }
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              Réponse : colis en transit
            </button>
            <button
              type="button"
              onClick={() => onOpenTransfer('transporter')}
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              Envoyer au transporteur
            </button>
            <button
              type="button"
              onClick={() => onOpenTransfer('admin')}
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              Transférer à l'administrateur
            </button>
          </div>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Répondre au client..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent text-sm"
        />
        {attachmentError && <div className="text-xs text-red-600">{attachmentError}</div>}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-gray-100 rounded-lg text-xs text-gray-700"
              >
                <span>📎 {file.name} ({formatBytes(file.size)})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  className="text-gray-500 hover:text-red-500"
                  aria-label={`Supprimer ${file.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Signature automatique : Service Client COLISDIRECT</span>
          {attachments.length > 0 && <span className="text-gray-400">• {attachments.length} fichier(s) joint(s)</span>}
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleAddFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Joindre un fichier
          </button>
          <button
            onClick={send}
            disabled={sending || statusUpdating || !message.trim()}
            className="px-4 py-2 bg-[#FF6C00] text-white text-sm font-semibold rounded-lg hover:bg-[#ff8534] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TicketSidebar = ({
  detail,
  onMarkUrgent,
  onStatusChange,
  statusLoading,
  priorityLoading,
  onShipmentOverride,
  onAddNote,
  onAddReminder,
}: {
  detail: SupportTicketDetail | null;
  onMarkUrgent: (urgent: boolean) => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
  statusLoading: boolean;
  priorityLoading: boolean;
  onShipmentOverride: (shipment: SupportShipment | null) => void;
  onAddNote: () => void;
  onAddReminder: () => void;
}) => {
  const [trackingInput, setTrackingInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SupportShipment | null>(null);

  const ticket = detail?.ticket ?? null;
  const notes: SupportTicketNote[] = detail?.notes ?? [];
  const reminders: SupportTicketReminder[] = detail?.reminders ?? [];

  const shipmentFromTicket = ticket?.shipment ?? null;
  const displayedShipment = searchResult || shipmentFromTicket;
  const transporterProfile = displayedShipment?.transporter_profile ?? null;
  const transporterUser = displayedShipment?.transporter_user ?? null;
  const originRelay = displayedShipment?.origin_relay ?? null;
  const destinationRelay = displayedShipment?.destination_relay ?? null;
  const isUrgent = ticket?.priority === 'urgent';

  const escapeHtml = (value?: string | number | null) => {
    if (value === undefined || value === null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handleShipmentSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const query = trackingInput.trim();
    if (query.length < 3) {
      setSearchError('Saisissez au moins 3 caractères.');
      setSearchResult(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await supportApi.searchShipment(query);
      if (!result) {
        setSearchResult(null);
        setSearchError('Aucun colis trouvé pour ce numéro.');
        onShipmentOverride(null);
      } else {
        const typedResult = result as SupportShipment;
        setSearchResult(typedResult);
        if (typedResult.tracking_number) {
          setTrackingInput(typedResult.tracking_number);
        }
        onShipmentOverride(typedResult);
      }
    } catch (error) {
      setSearchResult(null);
      const message = error instanceof Error ? error.message : null;
      setSearchError(message || 'Erreur lors de la recherche.');
      onShipmentOverride(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const openInvoice = (targetShipment?: SupportShipment) => {
    const shipmentData = targetShipment || displayedShipment;
    if (!shipmentData) {
      toast.error('Aucun colis associé');
      return;
    }
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) return;

    const invoiceNumber = `FAC-${shipmentData.tracking_number || 'N/A'}`;
    const senderName = `${shipmentData.sender_first_name || ''} ${shipmentData.sender_last_name || ''}`.trim() || 'Client';
    const recipientName = `${shipmentData.recipient_first_name || ''} ${shipmentData.recipient_last_name || ''}`.trim() || 'Destinataire';
    const today = new Date().toLocaleDateString('fr-FR');
    const amount = shipmentData.price != null ? Number(shipmentData.price).toFixed(2) : '0.00';

    const html = `<!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Facture ${escapeHtml(invoiceNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f7f7f7; padding: 24px; color: #333; }
            .invoice { background: white; border-radius: 16px; padding: 32px; max-width: 720px; margin: 0 auto; border: 2px solid #FF6C00; }
            h1 { color: #FF6C00; margin-bottom: 8px; }
            .section { margin-top: 24px; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 8px; }
            .flex { display: flex; justify-content: space-between; gap: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
            th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
            th { background: #FFF1E6; color: #FF6C00; }
            .total { font-size: 18px; font-weight: bold; color: #FF6C00; text-align: right; margin-top: 16px; }
            .muted { color: #777; font-size: 12px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="flex">
              <div>
                <h1>Facture</h1>
                <div>${escapeHtml(invoiceNumber)}</div>
              </div>
              <div style="text-align:right">
                <div>${escapeHtml(today)}</div>
                <div>COLISDIRECT</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Expéditeur</div>
              <div>${escapeHtml(senderName)}</div>
              <div>${escapeHtml(shipmentData.sender_address)}</div>
              <div>${escapeHtml(shipmentData.sender_commune)} ${escapeHtml(shipmentData.sender_quartier)}</div>
              <div>${escapeHtml(shipmentData.sender_phone)}</div>
            </div>

            <div class="section">
              <div class="section-title">Destinataire</div>
              <div>${escapeHtml(recipientName)}</div>
              <div>${escapeHtml(shipmentData.recipient_address)}</div>
              <div>${escapeHtml(shipmentData.recipient_commune)} ${escapeHtml(shipmentData.recipient_quartier)}</div>
              <div>${escapeHtml(shipmentData.recipient_phone)}</div>
            </div>

            <div class="section">
              <div class="section-title">Détails du colis</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Poids</th>
                    <th>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Envoi ${escapeHtml(shipmentData.package_type === 'petit' ? 'petit' : shipmentData.package_type === 'moyen' ? 'moyen' : 'grand')} - ${escapeHtml(shipmentData.tracking_number)}</td>
                    <td>${escapeHtml(shipmentData.weight ?? '—')} kg</td>
                    <td>${escapeHtml(amount)} €</td>
                  </tr>
                </tbody>
              </table>
              <div class="total">Total TTC : ${escapeHtml(amount)} €</div>
            </div>

            <div class="muted">Cette facture est générée automatiquement par COLISDIRECT et vaut justificatif de dépôt.</div>
          </div>
        </body>
      </html>`;

    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
  };

  const openWaybill = (targetShipment?: SupportShipment) => {
    const shipmentData = targetShipment || displayedShipment;
    if (!shipmentData) {
      toast.error('Aucun colis associé');
      return;
    }

    const waybillWindow = window.open('', '_blank');
    if (!waybillWindow) {
      toast.error('Veuillez autoriser les fenêtres popup pour ouvrir le bordereau.');
      return;
    }

    const senderName = `${shipmentData.sender_first_name || ''} ${shipmentData.sender_last_name || ''}`.trim();
    const recipientName = `${shipmentData.recipient_first_name || ''} ${shipmentData.recipient_last_name || ''}`.trim();
    const transporterName = shipmentData.transporter_user
      ? `${shipmentData.transporter_user.first_name || ''} ${shipmentData.transporter_user.last_name || ''}`.trim() || shipmentData.transporter_user.email
      : transporterUser
      ? `${transporterUser.first_name || ''} ${transporterUser.last_name || ''}`.trim() || transporterUser.email
      : 'Non assigné';

    const qrPayload = JSON.stringify({
      tracking: shipmentData.tracking_number,
      shipment_id: shipmentData.id || shipmentData.shipment_id || null,
    });
    const unifiedQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;
    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
    const normalizedStatus = normalizeShipmentStatus(shipmentData.current_status ?? shipmentData.status);
    const statusLabel = getShipmentStatusLabel(normalizedStatus);
    const statusBadgeClass = getShipmentStatusBadgeClass(normalizedStatus);
    const paymentStatus = normalizePaymentStatus(shipmentData.payment_status ?? shipmentData.paymentStatus);

    const html = `<!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
          <meta http-equiv="Pragma" content="no-cache" />
          <meta http-equiv="Expires" content="0" />
          <title>Bordereau - ${escapeHtml(shipmentData.tracking_number || '')}</title>
          <style>
            @media print {
              @page { size: A4; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; margin: 24px; background: white; color: #333; }
            .card { border: 2px solid #FF6C00; padding: 20px; border-radius: 12px; max-width: 800px; margin: 0 auto; background: white; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #FF6C00; }
            .logo-container { display: flex; flex-direction: column; align-items: flex-start; }
            .logo { height: 60px; width: auto; object-fit: contain; margin-bottom: 8px; }
            .title { font-size: 28px; font-weight: bold; color: #FF6C00; }
            .tracking { font-size: 18px; font-weight: bold; color: #333; }
            .date { font-size: 12px; color: #666; }
            .row { display: flex; justify-content: space-between; margin: 12px 0; gap: 20px; }
            .col { flex: 1; }
            .label { color: #666; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; }
            .value { font-weight: 600; font-size: 14px; color: #333; }
            .qr-section { display: flex; justify-content: center; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .qr-item { text-align: center; }
            .qr { width: 150px; height: 150px; border: 2px solid #FF6C00; display: inline-block; margin-bottom: 8px; background: white; padding: 5px; }
            .qr img { width: 100%; height: 100%; object-fit: contain; }
            .qr-label { font-size: 12px; color: #666; font-weight: bold; margin-top: 8px; }
            .info-section { margin: 15px 0; padding: 15px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-paid { background: #d4edda; color: #155724; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo-container">
                <img src="${logoUrl}" alt="COLISDIRECT Logo" class="logo" />
                <div class="title" style="display:none;">COLISDIRECT</div>
                <div class="date">${escapeHtml(new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }))}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">N° de suivi</div>
                <div class="tracking">${escapeHtml(shipmentData.tracking_number || '')}</div>
              </div>
            </div>

            <div class="qr-section">
              <div class="qr-item">
                <div class="qr">
                  <img src="${unifiedQRUrl}" alt="QR Code Unifié" />
                </div>
                <div class="qr-label">QR CODE UNIFIÉ</div>
                <div style="font-size: 10px; color: #999; margin-top: 4px;">Utilisable pour toutes les étapes</div>
              </div>
            </div>

            <div class="row">
              <div class="col info-section">
                <div class="label">Expéditeur</div>
                <div class="value">${escapeHtml(senderName || '-')}</div>
                ${(shipmentData.sender_address || shipmentData.sender_commune || shipmentData.sender_quartier || shipmentData.sender_phone) ? `
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                  ${shipmentData.sender_address ? escapeHtml(shipmentData.sender_address) + '<br/>' : ''}
                  ${(shipmentData.sender_commune || shipmentData.sender_quartier) ? `${escapeHtml((shipmentData.sender_commune || '') + (shipmentData.sender_quartier ? ', ' + shipmentData.sender_quartier : ''))}<br/>` : ''}
                  ${shipmentData.sender_phone ? escapeHtml(shipmentData.sender_phone) : ''}
                </div>
                ` : ''}
              </div>
              <div class="col info-section">
                <div class="label">Destinataire</div>
                <div class="value">${escapeHtml(recipientName || '-')}</div>
                ${(shipmentData.recipient_address || shipmentData.recipient_commune || shipmentData.recipient_quartier || shipmentData.recipient_phone) ? `
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                  ${shipmentData.recipient_address ? escapeHtml(shipmentData.recipient_address) + '<br/>' : ''}
                  ${(shipmentData.recipient_commune || shipmentData.recipient_quartier) ? `${escapeHtml((shipmentData.recipient_commune || '') + (shipmentData.recipient_quartier ? ', ' + shipmentData.recipient_quartier : ''))}<br/>` : ''}
                  ${shipmentData.recipient_phone ? escapeHtml(shipmentData.recipient_phone) : ''}
                </div>
                ` : ''}
              </div>
            </div>

            <div class="row">
              <div class="col info-section">
                <div class="label">Statut</div>
                <div class="value">
                  <span class="status-badge ${statusBadgeClass}">${escapeHtml(statusLabel)}</span>
                </div>
              </div>
              <div class="col info-section">
                <div class="label">Paiement</div>
                <div>
                  <span class="status-badge ${getPaymentStatusBadgeClass(paymentStatus)}">${getPaymentStatusLabel(paymentStatus)}</span>
                </div>
              </div>
              <div class="col info-section">
                <div class="label">Transporteur</div>
                <div class="value">${escapeHtml(transporterName)}</div>
              </div>
            </div>

            <div class="footer">
              <div>Bordereau généré automatiquement par COLISDIRECT</div>
              <div>Conservez ce bordereau pour le suivi de votre colis</div>
              <div style="margin-top: 8px; font-weight: bold;">Le QR code unique peut être scanné à toutes les étapes du parcours</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
          </script>
        </body>
      </html>`;

    waybillWindow.document.write(html);
    waybillWindow.document.close();
  };

  const displayedSearchResult = searchResult && (!shipmentFromTicket || searchResult.id !== shipmentFromTicket.id)
    ? searchResult
    : null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-gray-50">
      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Recherche colis</h3>
        <form className="flex gap-2" onSubmit={handleShipmentSearch}>
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="Numéro de suivi..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="px-3 py-2 text-sm font-semibold rounded-lg bg-[#FF6C00] text-white hover:bg-[#ff8534] disabled:opacity-60"
          >
            {searchLoading ? 'Recherche…' : 'Rechercher'}
          </button>
        </form>
        {searchError && <div className="text-xs text-red-600">{searchError}</div>}
        {displayedSearchResult && (
          <div className="rounded-xl border border-dashed border-[#FF6C00]/50 bg-[#FFF5EC] p-3 space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">#{displayedSearchResult.tracking_number}</div>
              <span className="text-xs text-gray-500">{displayedSearchResult.created_at ? new Date(displayedSearchResult.created_at).toLocaleDateString('fr-FR') : '—'}</span>
            </div>
            <div>
              Statut :
              <span className="inline-flex items-center gap-2 ml-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadgeClass(normalizeShipmentStatus(displayedSearchResult.current_status ?? displayedSearchResult.status))}`}>
                  {getShipmentStatusLabel(normalizeShipmentStatus(displayedSearchResult.current_status ?? displayedSearchResult.status))}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(normalizePaymentStatus(displayedSearchResult.payment_status ?? displayedSearchResult.paymentStatus))}`}>
                  {getPaymentStatusLabel(normalizePaymentStatus(displayedSearchResult.payment_status ?? displayedSearchResult.paymentStatus))}
                </span>
              </span>
            </div>
            <div>Expéditeur : {displayedSearchResult.sender_first_name} {displayedSearchResult.sender_last_name}</div>
            <div>Destinataire : {displayedSearchResult.recipient_first_name} {displayedSearchResult.recipient_last_name}</div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => openInvoice(displayedSearchResult)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#FF6C00] text-[#FF6C00] hover:bg-[#FFF1E6]"
              >
                Facture
              </button>
              <button
                type="button"
                onClick={() => openWaybill(displayedSearchResult)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-blue-400 text-blue-500 hover:bg-blue-50"
              >
                Bordereau
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
        <button
          onClick={() => onMarkUrgent(!isUrgent)}
          disabled={priorityLoading}
          className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isUrgent
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${priorityLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {priorityLoading ? 'Mise à jour…' : isUrgent ? 'Retirer le statut urgent' : 'Marquer comme urgent'}
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => onStatusChange('pending')}
            disabled={statusLoading}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-60"
          >
            En cours de résolution
          </button>
          <button
            onClick={() => onStatusChange('resolved')}
            disabled={statusLoading}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60"
          >
            Résoudre
          </button>
          <button
            onClick={() => onStatusChange('closed')}
            disabled={statusLoading}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
          >
            Clôturer
          </button>
          <button
            onClick={() => onStatusChange('open')}
            disabled={statusLoading}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            Réouvrir
          </button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Client</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div className="font-semibold text-gray-900">{ticket?.customer_name || 'Client inconnu'}</div>
          <div>{ticket?.customer_email || '—'}</div>
          <div>{ticket?.customer_phone || '—'}</div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Détails du colis</h3>
        {shipmentFromTicket ? (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="font-mono text-[#FF6C00] text-base">#{shipmentFromTicket.tracking_number}</div>
            <div>
              Statut actuel :
              <span className="inline-flex items-center gap-2 ml-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadgeClass(normalizeShipmentStatus(shipmentFromTicket.current_status ?? shipmentFromTicket.status))}`}>
                  {getShipmentStatusLabel(normalizeShipmentStatus(shipmentFromTicket.current_status ?? shipmentFromTicket.status))}
                </span>
              </span>
            </div>
            <div>Poids : {shipmentFromTicket.weight ?? '—'} kg</div>
            <div>Prix : {shipmentFromTicket.price != null ? `${Number(shipmentFromTicket.price).toFixed(2)} €` : '—'}</div>
            <div>Mode : {shipmentFromTicket.home_delivery ? 'Livraison à domicile' : 'Point relais'}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => openInvoice(shipmentFromTicket)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FF6C00] text-white hover:bg-[#ff8534]"
              >
                Ouvrir la facture
              </button>
              <button
                type="button"
                onClick={() => openWaybill(shipmentFromTicket)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                Ouvrir le bordereau
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">Aucun colis détecté.</div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Expéditeur</h3>
        {shipmentFromTicket ? (
          <div className="text-sm text-gray-700 space-y-1">
            <div className="font-semibold text-gray-900">
              {displayedShipment?.sender_first_name} {displayedShipment?.sender_last_name}
            </div>
            <div>{displayedShipment?.sender_phone}</div>
            <div>{displayedShipment?.sender_email || '—'}</div>
            <div>{displayedShipment?.sender_address}</div>
            <div>{displayedShipment?.sender_commune} {displayedShipment?.sender_quartier}</div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">Informations indisponibles.</div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Destinataire</h3>
        {shipmentFromTicket ? (
          <div className="text-sm text-gray-700 space-y-1">
            <div className="font-semibold text-gray-900">
              {displayedShipment?.recipient_first_name} {displayedShipment?.recipient_last_name}
            </div>
            <div>{displayedShipment?.recipient_phone}</div>
            <div>{displayedShipment?.recipient_email || '—'}</div>
            <div>{displayedShipment?.recipient_address}</div>
            <div>{displayedShipment?.recipient_commune} {displayedShipment?.recipient_quartier}</div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">Informations indisponibles.</div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Transporteur</h3>
        {transporterUser ? (
          <div className="text-sm text-gray-700 space-y-1">
            <div className="font-semibold text-gray-900">
              {transporterUser.first_name} {transporterUser.last_name}
            </div>
            <div>{transporterUser.email}</div>
            <div>{transporterProfile?.vehicle_type ? `Véhicule : ${transporterProfile.vehicle_type}` : null}</div>
            <div>{transporterProfile?.status ? `Statut : ${transporterProfile.status}` : null}</div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">Aucun transporteur assigné pour le moment.</div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Relais</h3>
        <div className="space-y-2">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Origine</div>
            {originRelay ? (
              <div className="text-sm text-gray-700">
                <div className="font-semibold text-gray-900">{originRelay.name}</div>
                <div>{originRelay.address}</div>
                <div>{originRelay.commune}</div>
                <div>{originRelay.phone || '—'}</div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Non renseigné.</div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Destination</div>
            {destinationRelay ? (
              <div className="text-sm text-gray-700">
                <div className="font-semibold text-gray-900">{destinationRelay.name}</div>
                <div>{destinationRelay.address}</div>
                <div>{destinationRelay.commune}</div>
                <div>{destinationRelay.phone || '—'}</div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Non renseigné.</div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Notes internes</h3>
          <button
            onClick={onAddNote}
            className="text-xs text-[#FF6C00] hover:underline"
            type="button"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <div className="text-xs text-gray-500">Aucune note.</div>
          ) : (
            notes.map((note: SupportTicketNote) => (
              <div key={note.id} className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-700">
                <div className="font-semibold text-gray-900">
                  {note.author_user?.first_name || 'Agent'} {note.author_user?.last_name || ''}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{note.content}</div>
                <div className="text-[10px] text-gray-500 mt-1">{note.created_at ? new Date(note.created_at).toLocaleString('fr-FR') : '—'}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Rappels</h3>
          <button
            onClick={onAddReminder}
            className="text-xs text-[#FF6C00] hover:underline"
            type="button"
          >
            Planifier
          </button>
        </div>
        <div className="space-y-2">
          {reminders.length === 0 ? (
            <div className="text-xs text-gray-500">Aucun rappel planifié.</div>
          ) : (
            reminders.map((reminder: SupportTicketReminder) => (
              <div key={reminder.id} className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-700">
                <div className="font-medium">{new Date(reminder.scheduled_for).toLocaleString('fr-FR')}</div>
                <div>{reminder.notes || '—'}</div>
                <div className="text-[10px] text-gray-500 mt-1">Par {reminder.created_by_user?.first_name || 'Agent'}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const SupportOverview = ({ stats }: { stats: SupportDashboardStats }) => {
  const formatMinutes = (value?: number | string | null) => {
    const minutes = Number(value ?? 0);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return '—';
    }
    if (minutes < 1) {
      return '< 1 min';
    }
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const remaining = rounded % 60;
    if (hours > 0) {
      return `${hours} h${remaining > 0 ? ` ${remaining} min` : ''}`;
    }
    return `${rounded} min`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vue d'ensemble du support</h1>
        <p className="text-sm text-gray-600">Statistiques et indicateurs de performance du support client</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-orange-700 font-semibold uppercase tracking-wide">Tickets ouverts</div>
            <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.open ?? 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">En cours</div>
            <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.pending ?? 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-green-700 font-semibold uppercase tracking-wide">Résolus</div>
            <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.resolved ?? 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-red-700 font-semibold uppercase tracking-wide">Urgents</div>
            <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.urgent ?? 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Escaladés</div>
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.escalated ?? 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Temps moyen</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Phone className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatMinutes(stats.avgResponseMinutes)}</div>
        </div>
      </div>
    </div>
  );
};

const ProfileQuickView = ({ 
  user, 
  onClose, 
  onEditProfile, 
  onManageNotifications 
}: { 
  user: SupportUser | null | { first_name?: string; last_name?: string; email?: string; phone?: string; [key: string]: unknown }; 
  onClose: () => void;
  onEditProfile: () => void;
  onManageNotifications: () => void;
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] bg-white shadow-2xl sm:rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <div className="text-lg font-semibold text-gray-900">Profil agent</div>
            <div className="text-xs text-gray-500">Informations personnelles de connexion</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-full">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6C00] text-white text-xl font-semibold">
              {user.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'}
              <span className="absolute -bottom-0.5 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
              <div className="text-sm text-gray-500">{user.role === 'support_supervisor' ? 'Superviseur support' : 'Agent support'}</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3">Coordonnées</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs uppercase tracking-wide text-gray-400">Email</span>
                <span className="font-medium">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <span className="w-24 text-xs uppercase tracking-wide text-gray-400">Téléphone</span>
                  <span className="font-medium">{user.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3">Permissions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                Répondre et clôturer des tickets
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                Transférer vers transporteurs / relais / administrateur
              </div>
              {user.role !== 'support' && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                  Modifier le statut d'un colis lié
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold uppercase text-gray-500">Actions rapides</div>
            <button
              onClick={() => {
                onEditProfile();
                onClose();
              }}
              className="w-full px-4 py-2 text-sm font-medium text-[#FF6C00] border border-[#FF6C00]/30 rounded-xl hover:bg-[#FFF1E6] transition-colors"
            >
              Modifier mes informations
            </button>
            <button
              onClick={() => {
                onManageNotifications();
                onClose();
              }}
              className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Gérer mes notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedbackToast = ({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) => (
  <div className="fixed top-4 right-4 z-50">
    <div
      className={`flex items-start gap-3 px-4 py-3 border rounded-xl shadow-lg text-sm ${
        feedback.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-semibold opacity-80 hover:opacity-100"
        aria-label="Fermer l'alerte"
      >
        ✕
      </button>
    </div>
  </div>
);

const TransferModal = ({
  open,
  mode,
  directory,
  loading,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: TransferMode | null;
  directory: TransferDirectory | null;
  loading: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (targetId: string, note?: string) => Promise<void>;
}) => {
  const [selectedId, setSelectedId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedId('');
      setNote('');
    }
  }, [open, mode]);

  const options: TransferOption[] = (() => {
    if (!mode || !directory) return [];
    if (mode === 'transporter') return directory.transporters as TransferOption[];
    if (mode === 'relay') return directory.relay_points as TransferOption[];
    if (mode === 'admin') return directory.admins as TransferOption[];
    return directory.agents as TransferOption[];
  })();

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="fixed inset-0 bg-black opacity-50" />
      <div className="fixed inset-0 overflow-auto">
        <div className="flex items-center justify-center min-h-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Transférer le ticket</h3>
              <p className="text-xs text-gray-500">Sélectionnez {mode === 'transporter' ? 'un transporteur' : mode === 'relay' ? 'un point relais' : mode === 'admin' ? "l'administrateur" : 'un autre agent'} et ajoutez un commentaire si besoin.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-gray-500">Chargement...</div>
                ) : options.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    Aucun destinataire disponible pour ce transfert.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {options.map((option) => {
                      const label: string =
                        mode === 'transporter'
                          ? `${option.first_name || ''} ${option.last_name || ''}`.trim() || (option.email as string) || 'Transporteur'
                          : mode === 'relay'
                          ? `${(option.name as string) ?? ''}${option.commune ? ` - ${option.commune as string}` : ''}`
                          : `${option.first_name || ''} ${option.last_name || ''}`.trim() || (option.email as string) || 'Utilisateur';
                      const description: string | undefined =
                        mode === 'transporter'
                          ? (option.vehicle_type as string | undefined) || (option.email as string | undefined)
                          : mode === 'relay'
                          ? (option.phone as string | undefined) || (option.email as string | undefined)
                          : (option.email as string | undefined);
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(option.id)}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                              selectedId === option.id ? 'bg-[#FFF1E6] text-[#FF6C00]' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-semibold">{label}</div>
                            {description && <div className="text-xs text-gray-500">{description}</div>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label className="text-xs uppercase font-semibold text-gray-500">Ajouter une note (optionnel)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Informations utiles pour le destinataire"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!selectedId || submitting}
                onClick={() => onSubmit(selectedId, note || undefined)}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6C00] rounded-lg hover:bg-[#ff8534] disabled:opacity-60"
              >
                {submitting ? 'Transfert...' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NoteModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setContent('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ajouter une note</h3>
          <p className="text-xs text-gray-500 mt-1">Ajoutez une note interne pour ce ticket</p>
        </div>
        <div className="px-6 py-5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Saisissez votre note..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!content.trim() || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6C00] rounded-lg hover:bg-[#ff8534] disabled:opacity-60"
          >
            {submitting ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditProfileModal = ({
  open,
  user,
  onClose,
  onSubmit,
}: {
  open: boolean;
  user: SupportUser | { first_name?: string; last_name?: string; email?: string; phone?: string; [key: string]: unknown };
  onClose: () => void;
  onSubmit: (data: { first_name?: string; last_name?: string; phone?: string; email?: string; current_password: string }) => Promise<void>;
}) => {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCurrentPassword('');
      setPasswordError(null);
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !currentPassword.trim()) {
      if (!currentPassword.trim()) {
        setPasswordError('Le mot de passe est requis');
      }
      return;
    }
    setPasswordError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        current_password: currentPassword,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
      if (message.includes('mot de passe') || message.includes('password') || message.includes('incorrect')) {
        setPasswordError('Mot de passe incorrect');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Modifier mes informations</h3>
          <p className="text-xs text-gray-500 mt-1">Mettez à jour vos informations personnelles</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Mot de passe actuel <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPasswordError(null);
              }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent ${
                passwordError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Entrez votre mot de passe actuel"
              required
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-600 mt-1">{passwordError}</p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              placeholder="Prénom"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              placeholder="Nom"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Téléphone (optionnel)</label>
            <PhoneInput value={phone} onChange={setPhone} label={null} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!firstName.trim() || !lastName.trim() || !email.trim() || !currentPassword.trim() || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6C00] rounded-lg hover:bg-[#ff8534] disabled:opacity-60"
          >
            {submitting ? 'Mise à jour...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationSettingsModal = ({
  open,
  user,
  onClose,
  onSubmit,
}: {
  open: boolean;
  user: SupportUser | { [key: string]: unknown };
  onClose: () => void;
  onSubmit: (settings: { email_notifications?: boolean; push_notifications?: boolean; ticket_assignments?: boolean; payment_validations?: boolean }) => Promise<void>;
}) => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [ticketAssignments, setTicketAssignments] = useState(true);
  const [paymentValidations, setPaymentValidations] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user && 'notification_preferences' in user && user.notification_preferences) {
      const prefs = user.notification_preferences as any;
      setEmailNotifications(prefs.email_notifications !== false);
      setPushNotifications(prefs.push_notifications !== false);
      setTicketAssignments(prefs.ticket_assignments !== false);
      setPaymentValidations(prefs.payment_validations !== false);
    }
  }, [open, user]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        ticket_assignments: ticketAssignments,
        payment_validations: paymentValidations,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Gérer mes notifications</h3>
          <p className="text-xs text-gray-500 mt-1">Configurez vos préférences de notifications</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Notifications par email</div>
              <div className="text-xs text-gray-500">Recevoir des notifications par email</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6C00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6C00]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Notifications push</div>
              <div className="text-xs text-gray-500">Recevoir des notifications dans l'application</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6C00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6C00]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Assignations de tickets</div>
              <div className="text-xs text-gray-500">Être notifié lors d'une assignation de ticket</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ticketAssignments}
                onChange={(e) => setTicketAssignments(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6C00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6C00]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Validations de paiements</div>
              <div className="text-xs text-gray-500">Être notifié des paiements à valider</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentValidations}
                onChange={(e) => setPaymentValidations(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6C00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6C00]"></div>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6C00] rounded-lg hover:bg-[#ff8534] disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReminderModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (scheduled_for: string, notes?: string) => Promise<void>;
}) => {
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      setScheduledFor(now.toISOString().slice(0, 16));
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!scheduledFor) return;
    setSubmitting(true);
    try {
      await onSubmit(scheduledFor, notes.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Planifier un rappel</h3>
          <p className="text-xs text-gray-500 mt-1">Définissez une date et heure pour un rappel sur ce ticket</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Date et heure</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ajoutez des notes pour ce rappel..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!scheduledFor || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6C00] rounded-lg hover:bg-[#ff8534] disabled:opacity-60"
          >
            {submitting ? 'Planification...' : 'Planifier'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TicketList = ({
  tickets,
  activeTicketId,
  onSelect,
}: {
  tickets: SupportTicket[];
  activeTicketId: string | null;
  onSelect: (id: string) => void;
}) => (
  <div className="h-full overflow-y-auto">
    {tickets.length === 0 ? (
      <div className="text-sm text-gray-500 text-center mt-6">Aucun ticket pour le moment.</div>
    ) : (
      <ul className="divide-y divide-gray-200">
        {tickets.map((ticket) => {
          const isUrgent = ticket.priority === 'urgent';
          return (
            <li
              key={ticket.id}
              onClick={() => onSelect(ticket.id)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                ticket.id === activeTicketId ? 'bg-[#FFF1E6]' : 'hover:bg-gray-50'
              } ${isUrgent ? 'border-l-4 border-red-400' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-gray-900">{ticket.customer_name || 'Client inconnu'}</div>
                <div className="text-xs text-gray-500">
                  {ticket.last_message_at ? new Date(ticket.last_message_at).toLocaleString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  }) : '—'}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {ticket.channel === 'chatbot' && '💬 Chatbot'}
                  {ticket.channel === 'email' && '✉️ Email'}
                  {ticket.channel === 'contact_form' && '🧾 Formulaire'}
                  {ticket.channel === 'manual' && '🛠️ Manuel'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    ticket.status === 'open'
                      ? 'bg-red-100 text-red-700'
                      : ticket.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : ticket.status === 'resolved'
                      ? 'bg-green-100 text-green-700'
                      : ticket.status === 'escalated'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ticket.status === 'open' && 'Ouvert'}
                  {ticket.status === 'pending' && 'En cours de résolution'}
                  {ticket.status === 'resolved' && 'Résolu'}
                  {ticket.status === 'closed' && 'Fermé'}
                  {ticket.status === 'escalated' && 'Escaladé'}
                </span>
                {ticket.priority === 'urgent' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-semibold">
                    ⚡ Urgent
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                {ticket.summary || ticket.subject || '—'}
              </div>
              {ticket.tracking_number && (
                <div className="text-xs font-mono text-[#FF6C00] mt-2">#{ticket.tracking_number}</div>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

type SupportTab = 'overview' | 'tickets' | 'relay-cash';

const CustomerSupportDashboard = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { user, signOut } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeTab, setActiveTab] = useState<SupportTab>('overview');
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isProfilePanelOpen, setProfilePanelOpen] = useState(false);
  const [transferState, setTransferState] = useState<{ open: boolean; mode: TransferMode | null; ticketId: string | null }>({
    open: false,
    mode: null,
    ticketId: null,
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const conversationScrollRef = useRef<HTMLDivElement | null>(null);
  const [directory, setDirectory] = useState<TransferDirectory | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [priorityUpdating, setPriorityUpdating] = useState(false);
  const [relayCashDashboard, setRelayCashDashboard] = useState<RelayCashDashboardData | null>(null);
  const [relayCashLoading, setRelayCashLoading] = useState(false);
  const [relayCashError, setRelayCashError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [notificationSettingsModalOpen, setNotificationSettingsModalOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const currentCustomerName = state.activeTicketDetail?.ticket?.customer_name || null;

  const { status: filterStatus, priority: filterPriority, channel: filterChannel, assigned: filterAssigned } = state.filters;
  const activeTicketId = state.activeTicketId;

  const loadRelayCash = useCallback(async () => {
    setRelayCashLoading(true);
    setRelayCashError(null);
    try {
      const result = await supportApi.getRelayCashDashboard();
      const parsed: RelayCashDashboardData = {
        pending: Array.isArray(result?.pending) ? (result.pending as RelayCashPaymentEntry[]) : [],
        collected: Array.isArray(result?.collected) ? (result.collected as RelayCashPaymentEntry[]) : [],
        summary: {
          byRelay: Array.isArray(result?.summary?.byRelay) ? (result.summary.byRelay as RelayCashDashboardData['summary']['byRelay']) : [],
        },
      };
      setRelayCashDashboard(parsed);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Impossible de charger les paiements point relais.';
      setRelayCashError(message);
    } finally {
      setRelayCashLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const result = await api.getNotifications(true);
      setNotifications(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notifications.length <= 1) {
        setIsNotificationsOpen(false);
      }
    } catch (error) {
      console.error('Erreur marquer notification lue:', error);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!state.activeTicketId || !content.trim()) return;
    try {
      await supportApi.addNote(state.activeTicketId, content.trim());
      setFeedback({ type: 'success', message: 'Note ajoutée avec succès.' });
      setNoteModalOpen(false);
      if (state.activeTicketId) {
        const detail = await supportApi.getTicket(state.activeTicketId);
        dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d\'ajouter la note.';
      setFeedback({ type: 'error', message });
    }
  };

  const handleAddReminder = async (scheduled_for: string, notes?: string) => {
    if (!state.activeTicketId || !scheduled_for) return;
    try {
      await supportApi.addReminder(state.activeTicketId, scheduled_for, notes);
      setFeedback({ type: 'success', message: 'Rappel planifié avec succès.' });
      setReminderModalOpen(false);
      if (state.activeTicketId) {
        const detail = await supportApi.getTicket(state.activeTicketId);
        dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de planifier le rappel.';
      setFeedback({ type: 'error', message });
    }
  };

  const handleUpdateProfile = async (profileData: { first_name?: string; last_name?: string; phone?: string; email?: string; current_password: string }) => {
    if (!user || !('id' in user)) return;
    try {
      // Update profile with password verification (backend will verify)
      const { error } = await api.updateUser(user.id as string, profileData);
      if (error) {
        if (error.includes('mot de passe') || error.includes('password') || error.includes('incorrect') || error.includes('requis')) {
          throw new Error(error);
        }
        throw new Error(error);
      }
      setFeedback({ type: 'success', message: 'Profil mis à jour avec succès.' });
      setEditProfileModalOpen(false);
      // Reload user data
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour le profil.';
      setFeedback({ type: 'error', message });
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleUpdateNotificationSettings = async (settings: { email_notifications?: boolean; push_notifications?: boolean; ticket_assignments?: boolean; payment_validations?: boolean }) => {
    if (!user || !('id' in user)) return;
    try {
      // Store notification preferences in user metadata or a separate endpoint
      const { error } = await api.updateUser(user.id as string, { notification_preferences: settings });
      if (error) throw new Error(error);
      setFeedback({ type: 'success', message: 'Préférences de notifications mises à jour.' });
      setNotificationSettingsModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour les préférences.';
      setFeedback({ type: 'error', message });
    }
  };

  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const [statsResponse, ticketsResponse] = await Promise.all([
        supportApi.getDashboard(),
        supportApi.getTickets({
          status: filterStatus,
          priority: filterPriority,
          channel: filterChannel,
          assigned: filterAssigned,
        }),
      ]);
      const statsData =
        (statsResponse && typeof statsResponse === 'object' && !Array.isArray(statsResponse) && 'stats' in (statsResponse as Record<string, unknown>))
          ? ((statsResponse as { stats: unknown }).stats as SupportDashboardStats)
          : ((statsResponse ?? {}) as SupportDashboardStats);
      const ticketsDataRaw =
        (ticketsResponse && typeof ticketsResponse === 'object' && !Array.isArray(ticketsResponse) && 'tickets' in (ticketsResponse as Record<string, unknown>))
          ? (ticketsResponse as unknown as { tickets: unknown }).tickets
          : ticketsResponse;
      const ticketsData = Array.isArray(ticketsDataRaw)
        ? (ticketsDataRaw as SupportTicket[])
        : [];

      dispatch({ type: 'SET_STATS', stats: statsData });
      dispatch({ type: 'SET_TICKETS', tickets: ticketsData });
      if (!activeTicketId && ticketsData.length > 0) {
        dispatch({ type: 'SET_ACTIVE_TICKET', id: ticketsData[0].id });
      }
      dispatch({ type: 'SET_LOADING', loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de chargement';
      dispatch({ type: 'SET_ERROR', error: message });
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [activeTicketId, filterAssigned, filterChannel, filterPriority, filterStatus]);

  // Load payment data on mount and when switching to payment tabs
  useEffect(() => {
    loadRelayCash();
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadRelayCash, loadNotifications]);

  // Reload payment data when switching to payment tabs
  useEffect(() => {
    if (activeTab === 'relay-cash' && !relayCashLoading && !relayCashDashboard) {
      loadRelayCash();
    }
  }, [activeTab, relayCashLoading, relayCashDashboard, loadRelayCash]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (conversationScrollRef.current) {
      conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
    }
  }, [state.activeTicketDetail?.messages?.length, state.activeTicketDetail?.ticket?.id]);

  useEffect(() => {
    const fetchActiveTicket = async () => {
      if (!state.activeTicketId) return;
      try {
        const detail = await supportApi.getTicket(state.activeTicketId);
        dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
      } catch (error) {
        console.error('Erreur chargement ticket', error);
      }
    };
    fetchActiveTicket();
  }, [state.activeTicketId]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      return;
    }
    
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 secondes
    
    const connectSSE = () => {
      try {
        const url = new URL(`${API_URL}/support/events`);
        url.searchParams.set('token', token!);
        es = new EventSource(url.toString(), { withCredentials: true });
        
        es.onopen = () => {
          console.log('[SSE] Connexion établie');
          reconnectAttempts = 0; // Reset on successful connection
        };
        
        es.onmessage = (event) => {
          try {
            // Ignore keep-alive messages
            if (event.data.trim() === ':keep-alive' || event.data.trim().startsWith(':')) {
              return;
            }
            const data = JSON.parse(event.data);
            if (data.type === 'ticket_created' || data.type === 'ticket_message' || data.type === 'ticket_status') {
              loadData();
            }
          } catch (err) {
            console.error('Erreur parsing event', err);
          }
        };
        
        es.onerror = (error) => {
          console.warn('[SSE] Erreur de connexion', error);
          if (es) {
            es.close();
            es = null;
          }
          
          // Attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`[SSE] Tentative de reconnexion ${reconnectAttempts}/${maxReconnectAttempts} dans ${reconnectDelay}ms`);
            reconnectTimeout = setTimeout(() => {
              connectSSE();
            }, reconnectDelay);
          } else {
            console.error('[SSE] Nombre maximum de tentatives de reconnexion atteint');
          }
        };
      } catch (error) {
        console.error('[SSE] Erreur lors de la création de la connexion', error);
      }
    };
    
    connectSSE();
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (es) {
        es.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchDirectory = async () => {
      setDirectoryLoading(true);
      try {
        const data = await supportApi.getTransferDirectory();
        setDirectory(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de charger l'annuaire de transfert.";
        setFeedback({
          type: 'error',
          message,
        });
      } finally {
        setDirectoryLoading(false);
      }
    };
    fetchDirectory();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuRef]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const onSearch = (value: string) => {
    dispatch({ type: 'UPDATE_FILTERS', filters: { search: value || undefined } });
  };

  const onFilterChange = (filters: Partial<SupportDashboardState['filters']>) => {
    dispatch({ type: 'UPDATE_FILTERS', filters });
  };

  const handleSend = async (payload: { body: string; status?: string; attachments?: AttachmentDraft[] }) => {
    if (!state.activeTicketId) return;
    try {
      await supportApi.reply(state.activeTicketId, {
        body: payload.body,
        status: payload.status,
        attachments: payload.attachments?.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
          dataUrl: attachment.dataUrl,
        })),
      });
      setFeedback({ type: 'success', message: 'Réponse envoyée avec succès.' });
      await loadData();
      const detail = await supportApi.getTicket(state.activeTicketId);
      dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer la réponse.";
      setFeedback({ type: 'error', message });
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!state.activeTicketId) return;
    try {
      setStatusUpdating(true);
      await supportApi.updateStatus(state.activeTicketId, status);
      setFeedback({ type: 'success', message: 'Statut du ticket mis à jour.' });
      await loadData();
      if (state.activeTicketId) {
        const detail = await supportApi.getTicket(state.activeTicketId);
        dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour le statut.';
      setFeedback({ type: 'error', message });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleMarkUrgent = async (urgent: boolean) => {
    if (!state.activeTicketId) return;
    try {
      setPriorityUpdating(true);
      await supportApi.markPriority(state.activeTicketId, urgent);
      setFeedback({ type: 'success', message: urgent ? 'Ticket marqué comme urgent.' : 'Ticket retiré des urgences.' });
      await loadData();
      if (state.activeTicketId) {
        const detail = await supportApi.getTicket(state.activeTicketId);
        dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de modifier la priorité.';
      setFeedback({ type: 'error', message });
    } finally {
      setPriorityUpdating(false);
    }
  };

  const openTransferModal = (mode: TransferMode) => {
    if (!state.activeTicketDetail?.ticket) {
      setFeedback({ type: 'error', message: 'Sélectionnez un ticket avant de transférer.' });
      return;
    }
    setTransferState({ open: true, mode, ticketId: state.activeTicketDetail.ticket.id });
  };

  const closeTransferModal = () => {
    setTransferState((prev) => ({ ...prev, open: false, ticketId: null, mode: null }));
  };

  const handleTransferSubmit = async (targetId: string, note?: string) => {
    if (!transferState.ticketId || !transferState.mode) return;
    setTransferSubmitting(true);
    try {
      await supportApi.assign(transferState.ticketId, {
        target_type: transferState.mode,
        target_id: targetId,
        note,
      });
      setFeedback({ type: 'success', message: 'Ticket transféré avec succès.' });
      closeTransferModal();
      await loadData();
      const detail = await supportApi.getTicket(transferState.ticketId);
      dispatch({ type: 'SET_TICKET_DETAIL', detail: detail as SupportTicketDetail });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de transférer le ticket.';
      setFeedback({ type: 'error', message });
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleShowProfilePanel = () => {
    setProfileMenuOpen(false);
    setProfilePanelOpen(true);
  };

  const handleSignOutClick = async () => {
    setProfileMenuOpen(false);
    await signOut();
    onNavigate('login');
  };

  const handleOverrideShipment = (shipment: SupportShipment | null) => {
    dispatch({ type: 'UPDATE_ACTIVE_SHIPMENT', shipment });
  };

  const filteredTickets = useMemo(() => {
    let list = state.tickets;
    const { status, channel, priority, assigned, search } = state.filters;
    if (status) list = list.filter(ticket => ticket.status === status);
    if (channel) list = list.filter(ticket => ticket.channel === channel);
    if (priority) list = list.filter(ticket => ticket.priority === priority);
    if (assigned) list = list.filter(ticket => ticket.assigned === assigned);
    if (search) {
      const searchLower = search.toLowerCase();
      list = list.filter(ticket => 
        (ticket.summary?.toLowerCase() ?? '').includes(searchLower) || 
        (ticket.subject?.toLowerCase() ?? '').includes(searchLower)
      );
    }
    return list;
  }, [state.tickets, state.filters]);

  const handleSelectTicket = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_TICKET', id });
  };

  const relayCashPendingCount = relayCashDashboard?.pending?.length ?? 0;
  
  const tabs: Array<{ id: SupportTab; label: string; icon: typeof LayoutDashboard; badge?: number }> = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'tickets', label: 'Tickets', icon: MessageSquare, badge: filteredTickets.length > 0 ? filteredTickets.length : undefined },
    { id: 'relay-cash', label: 'Paiements Point Relais', icon: Store, badge: relayCashPendingCount > 0 ? relayCashPendingCount : undefined },
  ];

  if (state.loading && activeTab === 'overview') {
    return (
      <div className="min-h-screen bg-gray-50">
        <SupportDashboardSkeleton />
      </div>
    );
  }

  if (state.error && activeTab === 'overview') {
    return (
      <div className="min-h-screen bg-gray-50">
        <SupportDashboardError error={state.error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {feedback && <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />}
      <DashboardHeader
        filters={state.filters}
        onSearch={onSearch}
        user={user as SupportUser | null}
        onToggleProfileMenu={() => setProfileMenuOpen((prev) => !prev)}
        isProfileMenuOpen={isProfileMenuOpen}
        onShowProfile={handleShowProfilePanel}
        onSignOut={handleSignOutClick}
        profileMenuRef={profileMenuRef}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={() => setIsNotificationsOpen((prev) => !prev)}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={async () => {
          try {
            await api.markAllNotificationsRead();
            setNotifications([]);
          } catch (error) {
            console.error('Erreur marquer toutes notifications lues:', error);
          }
        }}
        notificationsRef={notificationsRef}
      />
      
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6">
          <nav className="flex space-x-1 overflow-x-auto scrollbar-hide" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-[#FF6C00] text-[#FF6C00] bg-orange-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`
                      ml-1 px-2 py-0.5 text-xs font-semibold rounded-full
                      ${isActive ? 'bg-[#FF6C00] text-white' : 'bg-gray-200 text-gray-700'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className={`flex-1 ${activeTab === 'tickets' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <SupportOverview stats={state.stats} />
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Filtres de tickets */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onFilterChange({ status: undefined, priority: undefined })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !state.filters.status && !state.filters.priority
                      ? 'bg-[#FF6C00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous les tickets
                </button>
                {['open', 'pending', 'resolved', 'urgent', 'escalated'].map((status) => (
                  <button
                    key={status}
                    onClick={() =>
                      onFilterChange({
                        status:
                          status === 'urgent'
                            ? undefined
                            : status === 'escalated'
                            ? 'escalated'
                            : status,
                        priority: status === 'urgent' ? 'urgent' : undefined,
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      (status === 'urgent' && state.filters.priority === 'urgent') ||
                      (status === 'escalated' && state.filters.status === 'escalated') ||
                      (status !== 'urgent' && status !== 'escalated' && state.filters.status === status)
                        ? 'bg-[#FF6C00] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'open' && 'Ouverts'}
                    {status === 'pending' && 'En cours de résolution'}
                    {status === 'resolved' && 'Résolus'}
                    {status === 'urgent' && 'Urgents'}
                    {status === 'escalated' && 'Escaladés'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Grille principale */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px,1fr,360px] overflow-hidden min-h-0">
              <section className={`h-full overflow-hidden border-r border-gray-200 bg-white ${state.activeTicketId ? 'hidden lg:block' : 'block'}`}>
                <TicketList
                  tickets={filteredTickets}
                  activeTicketId={state.activeTicketId}
                  onSelect={handleSelectTicket}
                />
              </section>
            <section className={`h-full overflow-hidden flex flex-col bg-white border-r border-gray-200 ${state.activeTicketId ? 'flex' : 'hidden lg:flex'}`}>
              {state.activeTicketDetail?.ticket ? (
                <>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => dispatch({ type: 'SET_ACTIVE_TICKET', id: null })}
                      className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border-b border-gray-200 w-full hover:bg-gray-50"
                    >
                      ← Retour aux tickets
                    </button>
                    <ConversationHeader ticket={state.activeTicketDetail.ticket} />
                  </div>
                  <ConversationMessages
                    messages={state.activeTicketDetail.messages || []}
                    currentUserName={currentCustomerName}
                    scrollRef={conversationScrollRef}
                  />
                  <div className="flex-shrink-0">
                    <ConversationComposer
                      onSend={handleSend}
                      onUpdateStatus={handleStatusUpdate}
                      onOpenTransfer={openTransferModal}
                      ticket={state.activeTicketDetail.ticket}
                      statusUpdating={statusUpdating}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                  Sélectionnez un ticket pour afficher la conversation.
                </div>
              )}
            </section>
            <aside className="hidden lg:block h-full overflow-hidden bg-white">
              {state.activeTicketDetail ? (
                <TicketSidebar
                  detail={state.activeTicketDetail}
                  onMarkUrgent={handleMarkUrgent}
                  onStatusChange={handleStatusUpdate}
                  statusLoading={statusUpdating}
                  priorityLoading={priorityUpdating}
                  onShipmentOverride={handleOverrideShipment}
                  onAddNote={() => setNoteModalOpen(true)}
                  onAddReminder={() => setReminderModalOpen(true)}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-6 text-sm text-gray-500 text-center">
                  Sélectionnez un ticket pour voir les détails.
                </div>
              )}
            </aside>
            </div>
          </div>
        )}

        {activeTab === 'relay-cash' && (
          <div className="max-w-7xl mx-auto px-6 py-6">
            <RelayCashDashboardSection
              data={relayCashDashboard}
              loading={relayCashLoading}
              error={relayCashError}
              onRetry={loadRelayCash}
            />
          </div>
        )}
      </main>
      {isProfilePanelOpen && (
        <ProfileQuickView 
          user={user as SupportUser | null} 
          onClose={() => setProfilePanelOpen(false)}
          onEditProfile={() => setEditProfileModalOpen(true)}
          onManageNotifications={() => setNotificationSettingsModalOpen(true)}
        />
      )}
      <TransferModal
        open={transferState.open}
        mode={transferState.mode}
        directory={directory}
        loading={directoryLoading}
        submitting={transferSubmitting}
        onClose={closeTransferModal}
        onSubmit={handleTransferSubmit}
      />
      {noteModalOpen && (
        <NoteModal
          open={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          onSubmit={handleAddNote}
        />
      )}
      {reminderModalOpen && (
        <ReminderModal
          open={reminderModalOpen}
          onClose={() => setReminderModalOpen(false)}
          onSubmit={handleAddReminder}
        />
      )}
      {editProfileModalOpen && user && (
        <EditProfileModal
          open={editProfileModalOpen}
          user={user as SupportUser}
          onClose={() => setEditProfileModalOpen(false)}
          onSubmit={handleUpdateProfile}
        />
      )}
      {notificationSettingsModalOpen && user && (
        <NotificationSettingsModal
          open={notificationSettingsModalOpen}
          user={user as SupportUser}
          onClose={() => setNotificationSettingsModalOpen(false)}
          onSubmit={handleUpdateNotificationSettings}
        />
      )}
    </div>
  );
};

export default CustomerSupportDashboard;

