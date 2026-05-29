import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, API_URL } from '../lib/api';
import {
  Package,
  LogIn,
  Mail,
  Lock,
  AlertTriangle,
  X,
  RefreshCw,
  Phone,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Map as MapIcon,
  User,
  Search,
  Loader
} from 'lucide-react';
import Logo from '../components/Logo';
import DeliveryModal from '../components/DeliveryModal';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import { normalizePhoneForApiSearch } from '../utils/phoneField';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { normalizeShipmentStatus, isShipmentDelivered, ShipmentLifecycleStatus } from '../utils/shipmentStatus';

const debugLog = (..._args: unknown[]) => {};

if (typeof window !== 'undefined') {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

const DEFAULT_CENTER: [number, number] = [5.34, -4.05];
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 13;

const COMMUNE_COORDS: Record<string, [number, number]> = {
  plateau: [5.3192, -4.0281],
  cocody: [5.3386, -4.0267],
  yopougon: [5.3167, -4.0833],
  abobo: [5.4167, -4.0167],
  adjame: [5.35, -4.0333],
  marcory: [5.2333, -4.0167],
  koumassi: [5.2833, -4.0333],
  treichville: [5.3, -4.0167],
  'port-bouet': [5.2167, -4.0167],
  'port-bouët': [5.2167, -4.0167],
  'port bouet': [5.2167, -4.0167],
  'port bouët': [5.2167, -4.0167],
  attecoube: [5.35, -4.05],
  'attécoubé': [5.35, -4.05],
  anyama: [5.4833, -4.05],
  songon: [5.25, -4.0833],
  bingerville: [5.3569, -3.8944],
  'grand-bassam': [5.2117, -3.7383],
  'grand bassam': [5.2117, -3.7383],
};

const normalizeCommune = (raw?: string) => {
  if (!raw) return undefined;
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

type MapMarker = {
  id: string;
  position: [number, number];
  pkg: TransporterPackage;
  type: 'relay' | 'home';
  commune: string;
};


type TourStop = {
  id: string;
  name: string;
  address: string;
  commune: string;
  type: 'home_pickup' | 'relay_pickup' | 'relay_delivery' | 'home_delivery';
  latitude?: number;
  longitude?: number;
  packagesToPickup: number;
  packagesToDeliver: number;
  relayId?: string;
};

const MapAutoCenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// Composant pour afficher l'itinéraire optimisé
const RoutePolyline: React.FC<{ waypoints: [number, number][] }> = ({ waypoints }) => {
  const [route, setRoute] = useState<[number, number][]>([]);
  const map = useMap();

  useEffect(() => {
    if (waypoints.length < 2) return;

    // Utiliser l'API de routage d'OpenRouteService (gratuite avec clé) ou OSRM
    // Pour simplifier, on utilise une approche basique avec OSRM (service public)
    const fetchRoute = async () => {
      try {
        // Construire l'URL pour OSRM (service public, peut avoir des limitations)
        const coordinates = waypoints.map(wp => `${wp[1]},${wp[0]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const geometry = data.routes[0].geometry.coordinates;
          const routeCoords = geometry.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          setRoute(routeCoords);
          
          // Ajuster la vue pour inclure tous les points
          if (routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords);
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (error) {
        console.error('Erreur lors du calcul de l\'itinéraire:', error);
        // En cas d'erreur, afficher une ligne droite simple
        setRoute(waypoints);
      }
    };

    fetchRoute();
  }, [waypoints, map]);

  if (route.length === 0) {
    return null;
  }

  return (
    <Polyline
      positions={route}
      color="#FF6C00"
      weight={4}
      opacity={0.7}
    />
  );
};

const ALLOWED_ASSIGNMENT_STATUSES = new Set(['in_transit', 'delivered']);
const VISIBLE_SHIPMENT_STATUSES = new Set<ShipmentLifecycleStatus>([
  'CARRIER_COLLECTED',
  'IN_TRANSIT',
  'DELIVERED',
  'DELIVERED_TO_CUSTOMER',
  'PICKED_UP_BY_CUSTOMER',
]);
const IN_TRANSIT_STATUS: ShipmentLifecycleStatus = 'IN_TRANSIT';

// Statuts terminaux du point de vue du transporteur : le colis a quitté la tournée active.
// Inclut RELAY_FINAL_RECEIVED et AVAILABLE_FOR_PICKUP (déposé au relais de destination)
// que isShipmentDelivered() n'inclut pas (car côté client ces statuts sont encore "en attente").
function isTerminalForTransporter(status: string): boolean {
  return isShipmentDelivered(status) ||
    status === 'RELAY_FINAL_RECEIVED' ||
    status === 'AVAILABLE_FOR_PICKUP';
}

interface TransporterLoginPageProps {
  onNavigate: (page: string) => void;
}

// Make onNavigate available globally for transporter pages
if (typeof window !== 'undefined') {
  (window as any).onNavigate = (_page: string) => {
    // This will be set by App.tsx
  };
}

interface TransporterPackage {
  id: string;
  tracking_number: string;
  shipment_code?: string;
  sender_first_name: string;
  sender_last_name: string;
  sender_commune: string;
  sender_address: string;
  sender_phone: string;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_commune: string;
  recipient_address: string;
  recipient_phone: string;
  recipient_email?: string;
  current_status?: string | null;
  payment_status?: string;
  payment_method?: string;
  price?: number;
  relay_cash_amount_expected?: number;
  assignment_status: string;
  created_at: string;
  updated_at: string;
  relay_name?: string;
  relay_address?: string;
  origin_relay_id?: string;
  destination_relay_id?: string;
  destination_relay_name?: string;
  destination_relay_address?: string;
  destination_relay_commune?: string;
  relay_commune?: string;
  relay_latitude?: number;
  relay_longitude?: number;
  destination_relay_latitude?: number;
  destination_relay_longitude?: number;
  home_delivery?: boolean;
  pickup_code?: string;
}

interface ScannedPackage {
  pkg: TransporterPackage;
  isPickedUp: boolean;
  isDelivered: boolean;
  isCalled: boolean;
  pickupCodeInput: string;
  incidentReported: boolean;
}

function TransporterLoginPage({ onNavigate }: TransporterLoginPageProps) {
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [packages, setPackages] = useState<TransporterPackage[]>([]);
  const [scannedPackages, setScannedPackages] = useState<Map<string, ScannedPackage>>(new Map());
  const [deliveredShipments, setDeliveredShipments] = useState<TransporterPackage[]>([]);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [incidentPackage, setIncidentPackage] = useState<TransporterPackage | null>(null);
  const [incidentType, setIncidentType] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [carrierShipmentCodes] = useState<Record<string, string>>({});
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
  const [currentPickupCodePackage, setCurrentPickupCodePackage] = useState<TransporterPackage | null>(null);
  const [pickupCodeModalInput, setPickupCodeModalInput] = useState('');
  const [pickupVerificationInput, setPickupVerificationInput] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [deliveryModalShipment, setDeliveryModalShipment] = useState<TransporterPackage | null>(null);
  const [paymentConfirmationShipment, setPaymentConfirmationShipment] = useState<TransporterPackage | null>(null);
  const [unifiedSearchInput, setUnifiedSearchInput] = useState('');
  const [unifiedSearchLoading, setUnifiedSearchLoading] = useState(false);
  const [searchInlineResult, setSearchInlineResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [transporterCode, setTransporterCode] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]);
  // Modal de confirmation de ramassage à domicile
  const [homePickupConfirmModal, setHomePickupConfirmModal] = useState<{ pkg: TransporterPackage; shipmentCode: string } | null>(null);
  const [homePickupConfirmLoading, setHomePickupConfirmLoading] = useState(false);
  const [openTourStops, setOpenTourStops] = useState<Set<string>>(new Set());
  const [nonReceivedPackage, setNonReceivedPackage] = useState<string | null>(null);
  const [nonReceivedComment, setNonReceivedComment] = useState('');

  // ─── Marketplace : offres de course & portefeuille ──────────────────────────
  const [deliveryBatches, setDeliveryBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchCountdowns, setBatchCountdowns] = useState<Record<string, number>>({});
  const [deliveryOffers, setDeliveryOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [wallet, setWallet] = useState<{ balance_fcfa: number; total_earned_fcfa: number } | null>(null);
  const [walletStats, setWalletStats] = useState<{ today: number; week: number; month: number } | null>(null);
  const [offerCountdowns, setOfferCountdowns] = useState<Record<string, number>>({});
  const [activeMarketplaceTab, setActiveMarketplaceTab] = useState<'offers' | 'wallet'>('offers');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');

  const loadDeliveryBatches = async () => {
    if (!user || user.role !== 'transporter') return;
    setBatchesLoading(true);
    try {
      const { data } = await api.getMyBatches();
      const batches = data || [];
      setDeliveryBatches(batches);
      const countdowns: Record<string, number> = {};
      for (const batch of batches) {
        const remaining = Math.max(0, Math.floor((new Date(batch.expires_at).getTime() - Date.now()) / 1000));
        countdowns[batch.id] = remaining;
      }
      setBatchCountdowns(countdowns);
    } catch { /* non critique */ }
    setBatchesLoading(false);
  };

  const handleAcceptBatch = async (batchId: string) => {
    try {
      const { data, error } = await api.acceptBatch(batchId);
      if (error) {
        setFeedback({ type: 'error', message: error });
      } else {
        setFeedback({ type: 'success', message: `Lot de ${data?.shipment_count ?? ''} colis accepté ! Consultez votre tournée.` });
        loadDeliveryBatches();
        loadTransporterData();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erreur réseau' });
    }
  };

  const handleDeclineBatch = async (batchId: string) => {
    try {
      const { error } = await api.declineBatch(batchId);
      if (error) {
        setFeedback({ type: 'error', message: error });
      } else {
        setFeedback({ type: 'info', message: 'Lot décliné.' });
        loadDeliveryBatches();
      }
    } catch { /* non critique */ }
  };

  const loadDeliveryOffers = async () => {
    if (!user || user.role !== 'transporter') return;
    setOffersLoading(true);
    try {
      const res = await fetch(`${API_URL}/delivery-offers/my-offers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveryOffers(data || []);
        // Initialiser les comptes à rebours
        const countdowns: Record<string, number> = {};
        for (const offer of data || []) {
          const remaining = Math.max(0, Math.floor((new Date(offer.expires_at).getTime() - Date.now()) / 1000));
          countdowns[offer.id] = remaining;
        }
        setOfferCountdowns(countdowns);
      }
    } catch (e) { /* non critique */ }
    setOffersLoading(false);
  };

  const loadWallet = async () => {
    if (!user || user.role !== 'transporter') return;
    try {
      const res = await fetch(`${API_URL}/transporter/wallet`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setWalletStats(data.stats);
      }
    } catch (e) { /* non critique */ }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const res = await fetch(`${API_URL}/delivery-offers/${offerId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: '✅ Course acceptée ! Consultez votre tournée.' });
        loadDeliveryOffers();
        loadTransporterData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erreur lors de l\'acceptation' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Erreur réseau' });
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try {
      const res = await fetch(`${API_URL}/delivery-offers/${offerId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        setFeedback({ type: 'info', message: 'Course déclinée.' });
        loadDeliveryOffers();
      }
    } catch (e) { /* non critique */ }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawPhone) return;
    setWithdrawLoading(true);
    try {
      const res = await fetch(`${API_URL}/transporter/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          amount_fcfa: parseInt(withdrawAmount),
          orange_money_number: withdrawPhone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Demande de retrait de ${parseInt(withdrawAmount).toLocaleString()} FCFA soumise !` });
        setWithdrawAmount('');
        setWithdrawPhone('');
        loadWallet();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erreur lors du retrait' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Erreur réseau' });
    }
    setWithdrawLoading(false);
  };

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);



  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setIsMapReady(true);
  }, []);

  useEffect(() => {
    if (user && user.role === 'transporter') {
      loadTransporterData();
      loadScannedPackages();
      loadTransporterProfile();
      loadDeliveredShipments();
      loadDeliveryOffers();
      loadDeliveryBatches();
      loadWallet();
    }
  }, [user]);

  // Compte à rebours des offres de course et des lots (toutes les secondes)
  useEffect(() => {
    if (!user || user.role !== 'transporter') return;
    const tick = setInterval(() => {
      setOfferCountdowns((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (next[id]! > 0) { next[id] = next[id]! - 1; changed = true; }
        }
        return changed ? next : prev;
      });
      setBatchCountdowns((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (next[id]! > 0) { next[id] = next[id]! - 1; changed = true; }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [user]);

  // Recharger les offres et lots toutes les 30 secondes
  useEffect(() => {
    if (!user || user.role !== 'transporter') return;
    const id = setInterval(() => { loadDeliveryOffers(); loadDeliveryBatches(); loadWallet(); }, 30000);
    return () => clearInterval(id);
  }, [user]);



  // Mise à jour automatique de la liste des colis livrés toutes les 10 secondes
  useEffect(() => {
    if (!user || user.role !== 'transporter') return;

    // Charger immédiatement au montage
    loadDeliveredShipments();

    // Recharger les colis livrés toutes les 10 secondes
    const intervalId = setInterval(async () => {
      try {
        await loadDeliveredShipments();
      } catch (err) {
        console.error('Erreur lors de la mise à jour automatique des colis livrés:', err);
        // Ne pas afficher d'erreur à l'utilisateur pour les mises à jour automatiques
      }
    }, 10000); // 10 secondes

    return () => clearInterval(intervalId);
  }, [user]);

  // Mise à jour automatique des colis à ramasser toutes les 10 secondes
  useEffect(() => {
    if (!user || user.role !== 'transporter') return;

    // Recharger les colis assignés toutes les 10 secondes
    const intervalId = setInterval(async () => {
      try {
        await loadTransporterData();
      } catch (err) {
        console.error('Erreur lors de la mise à jour automatique des colis à ramasser:', err);
        // Ne pas afficher d'erreur à l'utilisateur pour les mises à jour automatiques
      }
    }, 10000); // 10 secondes

    return () => clearInterval(intervalId);
  }, [user]);

  // Mise à jour automatique des colis à ramasser toutes les 10 secondes
  useEffect(() => {
    if (!user || user.role !== 'transporter') return;

    // Recharger les colis assignés toutes les 10 secondes
    const intervalId = setInterval(async () => {
      try {
        await loadTransporterData();
        // Mettre à jour l'heure de dernière synchronisation
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        setLastSyncAt(`${hours}:${minutes}`);
      } catch (err) {
        console.error('Erreur lors de la mise à jour automatique des colis à ramasser:', err);
        // Ne pas afficher d'erreur à l'utilisateur pour les mises à jour automatiques
      }
    }, 10000); // 10 secondes

    return () => clearInterval(intervalId);
  }, [user]);

  const loadTransporterProfile = async () => {
    try {
      const { data, error } = await api.getTransporterProfile();
      if (error) {
        console.error('Error loading transporter profile:', error);
        return;
      }
      if (data && data.transporter_code) {
        setTransporterCode(data.transporter_code);
      }
    } catch (error) {
      console.error('Error loading transporter profile:', error);
    }
  };

  // Synchroniser la liste locale des colis scannés avec les données reçues du serveur
  useEffect(() => {

    // Ne pas supprimer les colis scannés même si packages.length === 0
    // Cela permet de garder une trace de tous les colis scannés, même après livraison
    // On continue la synchronisation même si packages.length === 0 pour préserver les colis scannés

    // Créer un map de tous les packages par tracking_number pour accès rapide
    const packageByTracking = new Map(packages.map(p => [p.tracking_number, p]));

    // Préserver les colis déjà scannés qui ne sont pas dans packages (colis ajoutés manuellement)
    // et inclure tous les packages, même ceux qui ne passent pas les filtres normaux
    const nextScanned = new Map<string, ScannedPackage>();

    // D'abord, préserver TOUS les colis déjà scannés (y compris ceux qui sont livrés)
    // pour garder une trace complète de tous les colis scannés
    scannedPackages.forEach((scannedPkg, trackingNumber) => {
      const pkg = packageByTracking.get(trackingNumber);
      if (pkg) {
        // Le colis est dans packages, mettre à jour la référence
        const shipmentStatus = normalizeShipmentStatus(pkg.current_status);
        const isDelivered = isTerminalForTransporter(shipmentStatus);
        const isInTransit = shipmentStatus === 'IN_TRANSIT' || shipmentStatus === 'CARRIER_COLLECTED';

        // Préserver les colis en transit jusqu'à la livraison
        // Si le colis est livré, il sera affiché dans la section "Colis livrés"
        // Si le colis est en transit, il reste dans la liste principale
        nextScanned.set(trackingNumber, {
          ...scannedPkg,
          pkg,
          isPickedUp: scannedPkg.isPickedUp || isInTransit, // Préserver ou mettre à jour isPickedUp si en transit
          isDelivered: isDelivered, // Mettre à jour le statut de livraison
        });
      } else {
        // Le colis n'est plus dans packages mais était scanné, le préserver
        // (même s'il est livré, pour garder une trace de tous les colis scannés)
        debugLog('preserving scanned package not in packages', trackingNumber);
        nextScanned.set(trackingNumber, scannedPkg);
      }
    });

    // Ensuite, ajouter tous les packages qui ne sont pas encore dans scannedPackages
    packages.forEach((pkg) => {
      if (!nextScanned.has(pkg.tracking_number)) {
        const shipmentStatus = normalizeShipmentStatus(pkg.current_status);
        // Exclure les colis terminaux (livrés, déposés au relais de destination)
        if (isTerminalForTransporter(shipmentStatus)) {
          return;
        }

        // Pour les colis avec ramassage à domicile (origin_relay_id NULL),
        // on les ajoute même s'ils ne sont pas encore en transit
        const isReadyForPickup = shipmentStatus === 'READY_FOR_DROP_OFF' ||
                                  shipmentStatus === 'PICKUP_PENDING' ||
                                  shipmentStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP' ||
                                  shipmentStatus === 'PAYMENT_PENDING_AT_RELAY' ||
                                  shipmentStatus === 'PAYMENT_RECEIVED_AT_RELAY';

        // Colis avec ramassage à domicile : origin_relay_id null suffit (indépendant de home_delivery)
        const isHomePickup = !pkg.origin_relay_id && !!pkg.sender_address;
        const isReadyForHomePickup = isHomePickup && isReadyForPickup;

        // Ajouter si en transit (CARRIER_COLLECTED ou IN_TRANSIT) OU si prêt pour ramassage (pour les colis avec ramassage à domicile)
        // Les colis en transit doivent rester dans scannedPackages jusqu'à la livraison
        const isInTransitStatus = shipmentStatus === 'IN_TRANSIT' || shipmentStatus === 'CARRIER_COLLECTED';
        if (isInTransitStatus || isReadyForHomePickup) {
          nextScanned.set(pkg.tracking_number, {
            pkg,
            isPickedUp: isInTransitStatus, // Marquer comme ramassé si en transit (CARRIER_COLLECTED ou IN_TRANSIT)
            isDelivered: isTerminalForTransporter(shipmentStatus),
            isCalled: false,
            pickupCodeInput: '',
            incidentReported: false,
          });
        }
      }
    });

    const hasSameEntries = scannedPackages.size === nextScanned.size && Array.from(nextScanned.keys()).every(key => scannedPackages.has(key));
    if (!hasSameEntries) {
      debugLog('sync scanned packages cache', { before: scannedPackages.size, after: nextScanned.size });
      setScannedPackages(nextScanned);
      saveScannedPackages(nextScanned);
    } else {
      // S'assurer que les références colis sont à jour même si la taille est identique
      let needsUpdate = false;
      nextScanned.forEach((value, key) => {
        const existing = scannedPackages.get(key);
        if (existing && existing.pkg !== value.pkg) {
          needsUpdate = true;
        }
      });
      if (needsUpdate) {
        debugLog('refresh scanned package references');
        setScannedPackages(nextScanned);
        saveScannedPackages(nextScanned);
      }
    }
  }, [packages, scannedPackages]);

  // Structure "Ma tournée" avec tous les points de passage
  const tourStops = useMemo<TourStop[]>(() => {
    const stopsMap = new Map<string, TourStop>();
    
    // Créer un Set des numéros de suivi des colis déjà livrés
    const deliveredTrackingNumbers = new Set<string>();
    
    // Ajouter les colis marqués comme livrés dans scannedPackages
    scannedPackages.forEach((scannedPkg, trackingNumber) => {
      if (scannedPkg.isDelivered) {
        deliveredTrackingNumbers.add(trackingNumber);
      }
    });
    
    // Ajouter les colis de deliveredShipments (API)
    deliveredShipments.forEach((deliveredPkg) => {
      deliveredTrackingNumbers.add(deliveredPkg.tracking_number);
    });

    packages.forEach((pkg) => {
      // Exclure les colis déjà livrés (vérifier dans deliveredTrackingNumbers)
      if (deliveredTrackingNumbers.has(pkg.tracking_number)) {
        return; // Ignorer les colis déjà livrés
      }
      
      // Note: Les colis Mobile Money sans déclaration sont déjà filtrés par le backend
      // (cohérence avec la page client)
      
      const shipmentStatus = normalizeShipmentStatus(pkg.current_status);
      
      // Exclure les colis avec des statuts de livraison finale
      const isDelivered = isShipmentDelivered(shipmentStatus) || 
                         shipmentStatus === 'RELAY_FINAL_RECEIVED' || 
                         shipmentStatus === 'AVAILABLE_FOR_PICKUP' ||
                         shipmentStatus === 'DELIVERED' ||
                         shipmentStatus === 'DELIVERED_TO_CUSTOMER' ||
                         shipmentStatus === 'PICKED_UP_BY_CUSTOMER';
      
      if (isDelivered) {
        return; // Ignorer les colis déjà livrés
      }
      
      // Pour les points de ramassage, inclure uniquement les colis qui sont prêts pour ramassage
      // (pas ceux déjà collectés ou en transit)
      const isReadyForPickup = shipmentStatus === 'READY_FOR_DROP_OFF' ||
                               shipmentStatus === 'PICKUP_PENDING' ||
                               shipmentStatus === 'RELAY_ORIGIN_RECEIVED' ||
                               shipmentStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP' ||
                               shipmentStatus === 'PAYMENT_PENDING_AT_RELAY' ||
                               shipmentStatus === 'PAYMENT_RECEIVED_AT_RELAY';
      
      // Pour les livraisons, inclure uniquement les colis en transit ou collectés
      // (pas ceux qui sont encore au point relais d'origine)
      const isReadyForDelivery = shipmentStatus === 'IN_TRANSIT' || 
                                 shipmentStatus === 'CARRIER_COLLECTED';

      // 0. Ramassage à domicile (où récupérer des colis chez l'expéditeur)
      // Colis avec origin_relay_id = null (ramassage à domicile, peu importe home_delivery)
      // Uniquement si le colis est prêt pour ramassage
      const isHomePickup = !pkg.origin_relay_id && pkg.sender_address;
      if (isHomePickup && isReadyForPickup) {
        // Utiliser l'adresse complète comme clé pour regrouper les colis au même domicile d'expédition
        const addressKey = `${pkg.sender_address}_${pkg.sender_commune}`;
        const key = `home_pickup_${addressKey}`;
        
        if (!stopsMap.has(key)) {
          // Utiliser les coordonnées de la commune comme fallback
          const normalizedCommune = normalizeCommune(pkg.sender_commune);
          const communeCoords = normalizedCommune ? COMMUNE_COORDS[normalizedCommune] : undefined;
          
          stopsMap.set(key, {
            id: key,
            name: `${pkg.sender_first_name} ${pkg.sender_last_name}`,
            address: pkg.sender_address,
            commune: pkg.sender_commune || 'Commune inconnue',
            type: 'home_pickup',
            latitude: communeCoords?.[0],
            longitude: communeCoords?.[1],
            packagesToPickup: 0,
            packagesToDeliver: 0,
          });
        }
        const stop = stopsMap.get(key)!;
        stop.packagesToPickup += 1;
      }

      // 1. Points relais d'origine (où récupérer des colis déposés)
      // UNIQUEMENT si le colis est CONFIRMÉ déposé au relais (RELAY_ORIGIN_RECEIVED ou paiement au relais)
      // On exclut READY_FOR_DROP_OFF et PAYMENT_CONFIRMED_AWAITING_DROP : le client n'a pas encore déposé
      const isConfirmedAtRelay = shipmentStatus === 'RELAY_ORIGIN_RECEIVED' ||
                                 shipmentStatus === 'PAYMENT_PENDING_AT_RELAY' ||
                                 shipmentStatus === 'PAYMENT_RECEIVED_AT_RELAY';

      if (!isHomePickup && (pkg.origin_relay_id || pkg.relay_name) && isConfirmedAtRelay) {
        // Utiliser origin_relay_id comme clé principale si disponible, sinon relay_name
        const relayId = pkg.origin_relay_id;
        const relayName = pkg.relay_name || `Point relais ${relayId?.slice(0, 8) || 'inconnu'}`;
        const key = relayId ? `relay_pickup_${relayId}` : `relay_pickup_${relayName}`;
        
        if (!stopsMap.has(key)) {
          // Utiliser les coordonnées du relais si disponibles, sinon utiliser les coordonnées de la commune
          let lat = pkg.relay_latitude;
          let lng = pkg.relay_longitude;
          
          if (!lat || !lng) {
            const commune = pkg.relay_commune || pkg.sender_commune;
            const normalized = normalizeCommune(commune);
            if (normalized && COMMUNE_COORDS[normalized]) {
              lat = COMMUNE_COORDS[normalized][0];
              lng = COMMUNE_COORDS[normalized][1];
            }
          }
          
          stopsMap.set(key, {
            id: key,
            name: relayName,
            address: pkg.relay_address || 'Adresse non renseignée',
            commune: pkg.relay_commune || pkg.sender_commune || 'Commune inconnue',
            type: 'relay_pickup',
            latitude: lat,
            longitude: lng,
            packagesToPickup: 0,
            packagesToDeliver: 0,
            relayId: relayId || undefined,
          });
        }
        const stop = stopsMap.get(key)!;
        stop.packagesToPickup += 1;
      }

      // 2. Points relais de destination (où livrer des colis)
      // Uniquement si le colis est prêt pour livraison (en transit ou collecté)
      // On n'affiche pas la destination avant que le ramassage ait eu lieu
      if (pkg.destination_relay_name && pkg.destination_relay_id && !pkg.home_delivery && isReadyForDelivery) {
        const key = `relay_delivery_${pkg.destination_relay_id}`;
        if (!stopsMap.has(key)) {
          stopsMap.set(key, {
            id: key,
            name: pkg.destination_relay_name,
            address: pkg.destination_relay_address || 'Adresse non renseignée',
            commune: pkg.destination_relay_commune || pkg.recipient_commune || 'Commune inconnue',
            type: 'relay_delivery',
            latitude: pkg.destination_relay_latitude,
            longitude: pkg.destination_relay_longitude,
            packagesToPickup: 0,
            packagesToDeliver: 0,
            relayId: pkg.destination_relay_id,
          });
        }
        const stop = stopsMap.get(key)!;
        stop.packagesToDeliver += 1;
      }

      // 3. Domiciles (où livrer des colis)
      // Uniquement si le colis est prêt pour livraison (en transit ou collecté)
      if (pkg.home_delivery && pkg.recipient_address && isReadyForDelivery) {
        // Utiliser l'adresse complète comme clé pour regrouper les colis au même domicile
        const addressKey = `${pkg.recipient_address}_${pkg.recipient_commune}`;
        const key = `home_delivery_${addressKey}`;
        if (!stopsMap.has(key)) {
          // Pour les domiciles, utiliser les coordonnées du point relais de destination comme fallback
          const lat = pkg.destination_relay_latitude || pkg.relay_latitude;
          const lng = pkg.destination_relay_longitude || pkg.relay_longitude;
          const normalizedCommune = normalizeCommune(pkg.recipient_commune);
          const communeCoords = normalizedCommune ? COMMUNE_COORDS[normalizedCommune] : undefined;
          
          stopsMap.set(key, {
            id: key,
            name: `${pkg.recipient_first_name} ${pkg.recipient_last_name}`,
            address: pkg.recipient_address,
            commune: pkg.recipient_commune || 'Commune inconnue',
            type: 'home_delivery',
            latitude: lat || communeCoords?.[0],
            longitude: lng || communeCoords?.[1],
            packagesToPickup: 0,
            packagesToDeliver: 0,
          });
        }
        const stop = stopsMap.get(key)!;
        stop.packagesToDeliver += 1;
      }
    });

    const stops = Array.from(stopsMap.values()).sort((a, b) => {
      // Trier par type : d'abord les ramassages (home_pickup, relay_pickup), puis les livraisons (relay_delivery, home_delivery)
      const typeOrder = { home_pickup: 0, relay_pickup: 1, relay_delivery: 2, home_delivery: 3 };
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;
      // Ensuite trier par commune
      return a.commune.localeCompare(b.commune);
    });
    return stops;
  }, [packages, scannedPackages, deliveredShipments]);

  // Fonction pour récupérer les numéros de suivi des colis à ramasser pour un arrêt donné
  const getPickupTrackingNumbers = useMemo(() => {
    const deliveredTrackingNumbersSet = new Set<string>();
    scannedPackages.forEach((scannedPkg, trackingNumber) => {
      if (scannedPkg.isDelivered) {
        deliveredTrackingNumbersSet.add(trackingNumber);
      }
    });
    deliveredShipments.forEach((deliveredPkg) => {
      deliveredTrackingNumbersSet.add(deliveredPkg.tracking_number);
    });

    return (stop: TourStop): string[] => {
      const results: string[] = [];

      packages.forEach((pkg) => {
        // Exclure les colis déjà livrés
        if (deliveredTrackingNumbersSet.has(pkg.tracking_number)) {
        return;
      }

        const shipmentStatus = normalizeShipmentStatus(pkg.current_status);
        const isDelivered = isShipmentDelivered(shipmentStatus) || 
                           shipmentStatus === 'RELAY_FINAL_RECEIVED' || 
                           shipmentStatus === 'AVAILABLE_FOR_PICKUP' ||
                           shipmentStatus === 'DELIVERED' ||
                           shipmentStatus === 'DELIVERED_TO_CUSTOMER' ||
                           shipmentStatus === 'PICKED_UP_BY_CUSTOMER';
        
        if (isDelivered) {
          return;
        }

        // Vérifier si ce colis correspond à cet arrêt
        if (stop.type === 'home_pickup') {
          const isReadyForHomePickup = shipmentStatus === 'PICKUP_PENDING' ||
                                       shipmentStatus === 'READY_FOR_DROP_OFF' ||
                                       shipmentStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP' ||
                                       shipmentStatus === 'PAYMENT_PENDING_AT_RELAY' ||
                                       shipmentStatus === 'PAYMENT_RECEIVED_AT_RELAY';
          const isHomePickup = !pkg.origin_relay_id && pkg.sender_address;
          if (isHomePickup && isReadyForHomePickup &&
              pkg.sender_address === stop.address && pkg.sender_commune === stop.commune) {
            // Pour le domicile : afficher le shipment_code (code court à 6 chiffres)
            // pour que le transporteur identifie rapidement le colis chez l'expéditeur
            results.push(pkg.shipment_code || pkg.tracking_number);
          }
        } else if (stop.type === 'relay_pickup') {
          const isConfirmedAtRelay = shipmentStatus === 'RELAY_ORIGIN_RECEIVED' ||
                                     shipmentStatus === 'PAYMENT_PENDING_AT_RELAY' ||
                                     shipmentStatus === 'PAYMENT_RECEIVED_AT_RELAY';
          if (!isConfirmedAtRelay) return;
          const relayId = pkg.origin_relay_id;
          const relayName = pkg.relay_name || `Point relais ${relayId?.slice(0, 8) || 'inconnu'}`;
          if ((stop.relayId && relayId === stop.relayId) || (!stop.relayId && relayName === stop.name)) {
            results.push(pkg.shipment_code || pkg.tracking_number);
          }
        }
      });

      return results;
    };
  }, [packages, scannedPackages, deliveredShipments]);

  const getStopPackages = useMemo(() => {
    return (stop: TourStop): TransporterPackage[] => {
      return packages.filter((pkg) => {
        const shipmentStatus = normalizeShipmentStatus(pkg.current_status);
        const scannedPkg = scannedPackages.get(pkg.tracking_number);
        if (scannedPkg?.isDelivered || isTerminalForTransporter(shipmentStatus)) return false;
        if (scannedPkg?.incidentReported) return false;

        if (stop.type === 'home_pickup') {
          const isReadyForHomePickup = ['PICKUP_PENDING', 'READY_FOR_DROP_OFF', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY', 'PAYMENT_RECEIVED_AT_RELAY'].includes(shipmentStatus);
          const isHomePickup = !pkg.origin_relay_id && !!pkg.sender_address;
          return isHomePickup && isReadyForHomePickup &&
            pkg.sender_address === stop.address && pkg.sender_commune === stop.commune;
        } else if (stop.type === 'relay_pickup') {
          const isConfirmedAtRelay = ['RELAY_ORIGIN_RECEIVED', 'PAYMENT_PENDING_AT_RELAY', 'PAYMENT_RECEIVED_AT_RELAY'].includes(shipmentStatus);
          if (!isConfirmedAtRelay) return false;
          const relayId = pkg.origin_relay_id;
          const relayName = pkg.relay_name || `Point relais ${relayId?.slice(0, 8) || 'inconnu'}`;
          // Exclude already picked-up packages (they move to delivery columns)
          if (scannedPkg?.isPickedUp) return false;
          return (stop.relayId && relayId === stop.relayId) || (!stop.relayId && relayName === stop.name);
        } else if (stop.type === 'relay_delivery') {
          const isReadyForDelivery = shipmentStatus === 'IN_TRANSIT' || shipmentStatus === 'CARRIER_COLLECTED';
          return pkg.destination_relay_id === stop.relayId && !pkg.home_delivery && isReadyForDelivery;
        } else if (stop.type === 'home_delivery') {
          const isReadyForDelivery = shipmentStatus === 'IN_TRANSIT' || shipmentStatus === 'CARRIER_COLLECTED';
          return pkg.home_delivery === true && pkg.recipient_address === stop.address && pkg.recipient_commune === stop.commune && isReadyForDelivery;
        }
        return false;
      });
    };
  }, [packages, scannedPackages]);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = [];
    const seenPositions = new Map<string, boolean>();

    // Utiliser tourStops pour créer les marqueurs (tous les points de la tournée)
    tourStops.forEach((stop) => {
      if (!stop.latitude || !stop.longitude) {
        return; // Ignorer les stops sans coordonnées
      }

      const key = `${stop.latitude}-${stop.longitude}`;
      if (seenPositions.has(key)) {
        return; // Éviter les doublons
      }
      seenPositions.set(key, true);

      // Trouver un colis représentatif pour ce stop
      const representativePkg = packages.find(pkg => {
        if (stop.type === 'home_pickup') {
          return !pkg.origin_relay_id && pkg.sender_address === stop.address && pkg.sender_commune === stop.commune;
        } else if (stop.type === 'relay_pickup') {
          return pkg.relay_name === stop.name && pkg.relay_latitude === stop.latitude && pkg.relay_longitude === stop.longitude;
        } else if (stop.type === 'relay_delivery') {
          return pkg.destination_relay_id === stop.relayId;
        } else if (stop.type === 'home_delivery') {
          return pkg.home_delivery && pkg.recipient_address === stop.address && pkg.recipient_commune === stop.commune;
          }
        return false;
      }) || packages[0]; // Fallback au premier colis si aucun trouvé

      if (representativePkg) {
        markers.push({
          id: stop.id,
          position: [stop.latitude, stop.longitude],
          pkg: representativePkg,
          type: (stop.type === 'home_delivery' || stop.type === 'home_pickup') ? 'home' : 'relay',
          commune: stop.commune || 'Commune inconnue',
        });
      }
    });

    return markers;
  }, [tourStops, packages]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedCommune) {
      const normalized = normalizeCommune(selectedCommune ?? undefined);
      if (normalized) {
        const coords = COMMUNE_COORDS[normalized];
        if (coords) {
          return coords;
        }
      }
    }

    if (mapMarkers.length > 0) {
      const avgLat = mapMarkers.reduce((sum, marker) => sum + marker.position[0], 0) / mapMarkers.length;
      const avgLng = mapMarkers.reduce((sum, marker) => sum + marker.position[1], 0) / mapMarkers.length;
      return [avgLat, avgLng];
    }

    return DEFAULT_CENTER;
  }, [selectedCommune, mapMarkers]);

  const mapZoom = useMemo(() => {
    const normalized = normalizeCommune(selectedCommune ?? undefined);
    if (normalized && COMMUNE_COORDS[normalized]) {
      return FOCUSED_ZOOM;
    }
    return mapMarkers.length > 0 ? DEFAULT_ZOOM : 11;
  }, [selectedCommune, mapMarkers]);

  const loadScannedPackages = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('scannedPackages');
      debugLog('loadScannedPackages', stored ? 'found' : 'empty');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          debugLog('parsed scanned packages', parsed.length);
          const map = new Map<string, ScannedPackage>();
          parsed.forEach(([key, value]: [string, any]) => {
            // Vérifier que la structure est valide et que le colis a bien été ramassé
            if (value && value.pkg && value.pkg.tracking_number && value.isPickedUp) {
              debugLog('restoring scanned package', key);
              map.set(key, value as ScannedPackage);
            } else {
              debugLog('invalid cached scanned package ignored', { key, value });
            }
          });
          debugLog('scanned packages restored', map.size);
          setScannedPackages(map);
        } catch (e) {
          console.error('[loadScannedPackages] Error loading scanned packages:', e);
          // En cas d'erreur, vider le localStorage
          localStorage.removeItem('scannedPackages');
          setScannedPackages(new Map());
        }
      } else {
        // S'assurer que scannedPackages est vide si rien n'est stocké
        debugLog('no cached scanned packages');
        setScannedPackages(new Map());
      }
    }
  };

  const saveScannedPackages = (data: Map<string, ScannedPackage>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('scannedPackages', JSON.stringify(Array.from(data.entries())));
      } catch (error) {
        console.error('Error saving scanned packages:', error);
      }
    }
  };

  async function loadTransporterData(): Promise<TransporterPackage[]> {
    try {
      debugLog('loading transporter assignments');
      setLastSyncAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      
      const { data: assignments, error: assignmentsError } = await api.getTransporterAssignments();
      debugLog('transporter API response', {
        hasData: !!assignments,
        dataLength: assignments?.length || 0,
        error: assignmentsError,
        isArray: Array.isArray(assignments),
      });
      
      if (assignmentsError) {
        console.error('[loadTransporterData] Error loading assignments:', assignmentsError);
        setFeedback({ type: 'error', message: `Erreur lors du chargement: ${assignmentsError}` });
        setPackages([]);
        return [];
      } else if (assignments && Array.isArray(assignments)) {
        debugLog('assigned packages count', assignments.length);
        if (assignments.length > 0) {
          debugLog('first assignment snapshot', {
            tracking: assignments[0].tracking_number,
            home_delivery: assignments[0].home_delivery,
            destination_relay_name: assignments[0].destination_relay_name,
            relay_name: assignments[0].relay_name
          });
        }
        setPackages(assignments);
        return assignments;
      } else {
        debugLog('no assignments returned or invalid format');
        setPackages([]);
        return [];
      }
    } catch (error: any) {
      console.error('[loadTransporterData] Exception:', error);
      console.error('[loadTransporterData] Stack:', error.stack);
      setFeedback({ type: 'error', message: `Erreur lors du chargement: ${error.message || 'Erreur inconnue'}` });
      setPackages([]);
      return [];
    }
    return [];
  }

  async function loadDeliveredShipments(): Promise<void> {
    try {
      const { data: delivered, error: deliveredError } = await api.getDeliveredShipmentsForTransporter();
      
      if (deliveredError) {
        console.error('[loadDeliveredShipments] ERREUR lors du chargement:', deliveredError);
        setDeliveredShipments([]);
        return;
      }
      
      if (delivered && Array.isArray(delivered)) {
        // Convertir les colis livrés en TransporterPackage
        const deliveredPackages: TransporterPackage[] = delivered.map((shipment: any) => ({
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          shipment_code: shipment.shipment_code,
          sender_first_name: shipment.sender_first_name || '',
          sender_last_name: shipment.sender_last_name || '',
          sender_commune: shipment.sender_commune || '',
          sender_address: shipment.sender_address || '',
          sender_phone: shipment.sender_phone || '',
          recipient_first_name: shipment.recipient_first_name || '',
          recipient_last_name: shipment.recipient_last_name || '',
          recipient_commune: shipment.recipient_commune || '',
          recipient_address: shipment.recipient_address || '',
          recipient_phone: shipment.recipient_phone || '',
          current_status: shipment.current_status || 'DELIVERED',
          payment_status: shipment.payment_status || 'paid',
          assignment_status: shipment.assignment_status || 'delivered',
          created_at: shipment.created_at || new Date().toISOString(),
          updated_at: shipment.updated_at || shipment.delivered_at || new Date().toISOString(),
          home_delivery: shipment.home_delivery || false,
          origin_relay_id: shipment.origin_relay_id || null,
          destination_relay_id: shipment.destination_relay_id,
          destination_relay_name: shipment.destination_relay_name,
          destination_relay_address: shipment.destination_relay_address,
          destination_relay_commune: shipment.destination_relay_commune,
          destination_relay_latitude: shipment.destination_relay_latitude,
          destination_relay_longitude: shipment.destination_relay_longitude,
          relay_name: shipment.relay_name,
          relay_address: shipment.relay_address,
          relay_commune: shipment.relay_commune,
          relay_latitude: shipment.relay_latitude,
          relay_longitude: shipment.relay_longitude,
          pickup_code: shipment.pickup_code,
        }));
        setDeliveredShipments(deliveredPackages);
      } else {
        setDeliveredShipments([]);
      }
    } catch (error: any) {
      console.error('[loadDeliveredShipments] Exception:', error);
      setDeliveredShipments([]);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isEmail = email.includes('@');
      await signIn(email.trim(), password, !isEmail);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const sanitizeTrackingNumber = (value: string | null | undefined) =>
    value ? value.toString().replace(/\s+/g, '').toUpperCase() : '';

  const extractTrackingAndHash = (rawValue: string): { tracking?: string; hash?: string | null } => {
    let tn = rawValue?.trim?.() ?? '';
    let hash: string | null = null;

    if (!tn) {
      return { tracking: '', hash: null };
    }

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
          tn = '';
          hash = String(hashValue);
        } else {
          tn = '';
        }
      }
    } catch {
      // not JSON
    }

    if (/https?:\/\//i.test(tn)) {
      try {
        const url = new URL(tn);
        const trackingParam =
          url.searchParams.get('tracking') ||
          url.searchParams.get('tracking_number') ||
          url.searchParams.get('trackingNumber');
        const hashParam = url.searchParams.get('qr_code_hash') || url.searchParams.get('hash');
        if (trackingParam) {
          tn = trackingParam;
        } else if (hashParam) {
          tn = '';
          hash = hashParam;
        }
      } catch {
        // ignore invalid URLs
      }
    }

    return {
      tracking: sanitizeTrackingNumber(tn),
      hash,
    };
  };

  const resolveTrackingNumberFromInput = async (rawInput: string): Promise<string | null> => {
    const { tracking, hash } = extractTrackingAndHash(rawInput);

    if (tracking) {
      return tracking;
    }

    if (hash) {
      const { data, error } = await api.scanQRCode(hash);
      if (error) {
        throw new Error(error);
      }

      if (data && typeof data === 'object') {
        const payload = data as Record<string, unknown>;
        const direct =
          payload['tracking'] || payload['tracking_number'] || payload['trackingNumber'];
        if (direct) {
          return sanitizeTrackingNumber(String(direct));
        }

        const qrCodeData = payload['qr_code_data'];
        if (qrCodeData) {
          try {
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
                return sanitizeTrackingNumber(String(trackingValue));
              }
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    return null;
  };

  const processTrackingNumber = async (trackingNumber: string) => {
    try {
      const resolvedTracking = await resolveTrackingNumberFromInput(trackingNumber);
      if (!resolvedTracking) {
        setFeedback({
          type: 'error',
          message: 'Code non reconnu. Vérifiez le code et ressaisissez-le.',
        });
        return false;
      }

      const trackingNumberUpper = resolvedTracking.trim().toUpperCase();
      if (!trackingNumberUpper) {
        setFeedback({
          type: 'error',
          message: 'Numéro de suivi introuvable. Saisissez-le manuellement.',
        });
        return false;
      }
      
      // Charger les assignations les plus récentes
      const { data: assignments, error: assignmentsError } = await api.getTransporterAssignments();
      if (assignmentsError) {
        console.error('Error loading assignments:', assignmentsError);
        setFeedback({ type: 'error', message: 'Erreur lors du chargement des colis. Veuillez réessayer.' });
        return false;
      }

      let pkg = (assignments && Array.isArray(assignments))
        ? assignments.find((p: TransporterPackage) => p.tracking_number === trackingNumberUpper)
        : undefined;

      // Si le colis n'est pas trouvé dans les assignations, essayer via l'endpoint dédié pickup/tracking
      if (!pkg) {
        try {
          const { data: pickupShipment, error: pickupError } = await api.getShipmentForPickup(trackingNumberUpper);
          if (pickupError) {
            setFeedback({ type: 'error', message: pickupError });
            return false;
          }

          if (!pickupShipment) {
            setFeedback({
              type: 'error',
              message: 'Colis non trouvé. Vérifiez le numéro de suivi ou le numéro d\'envoi.',
            });
            return false;
          }

          // Convertir le shipment en TransporterPackage minimal pour l'ajouter à la tournée
          pkg = {
            id: pickupShipment.id,
            tracking_number: pickupShipment.tracking_number,
            shipment_code: pickupShipment.shipment_code,
            sender_first_name: pickupShipment.sender_first_name || '',
            sender_last_name: pickupShipment.sender_last_name || '',
            sender_commune: pickupShipment.sender_commune || '',
            sender_address: pickupShipment.sender_address || '',
            sender_phone: pickupShipment.sender_phone || '',
            recipient_first_name: pickupShipment.recipient_first_name || '',
            recipient_last_name: pickupShipment.recipient_last_name || '',
            recipient_commune: pickupShipment.recipient_commune || '',
            recipient_address: pickupShipment.recipient_address || '',
            recipient_phone: pickupShipment.recipient_phone || '',
            current_status: pickupShipment.current_status || pickupShipment.effective_status || 'READY_FOR_DROP_OFF',
            payment_status: pickupShipment.payment_status || 'pending',
            assignment_status: 'in_transit',
            created_at: pickupShipment.created_at || new Date().toISOString(),
            updated_at: pickupShipment.updated_at || new Date().toISOString(),
            relay_name: pickupShipment.destination_relay_name,
            relay_address: pickupShipment.destination_relay_address,
            destination_relay_id: pickupShipment.destination_relay_id,
            destination_relay_name: pickupShipment.destination_relay_name,
            destination_relay_address: pickupShipment.destination_relay_address,
            destination_relay_commune: pickupShipment.destination_relay_commune,
            relay_commune: pickupShipment.relay_commune || pickupShipment.destination_relay_commune,
            relay_latitude: pickupShipment.relay_latitude,
            relay_longitude: pickupShipment.relay_longitude,
            destination_relay_latitude: pickupShipment.destination_relay_latitude,
            destination_relay_longitude: pickupShipment.destination_relay_longitude,
            home_delivery: pickupShipment.home_delivery || false,
            pickup_code: pickupShipment.pickup_code,
          };

          // Ajouter ce colis aux packages existants s'il n'existe pas déjà
          setPackages(prev => {
            const exists = prev.some(p => p.tracking_number === pkg!.tracking_number);
            if (exists) return prev;
            return [...prev, pkg!];
          });
        } catch (pickupLookupError: any) {
          console.error('Error loading shipment by tracking for pickup:', pickupLookupError);
          setFeedback({
            type: 'error',
            message: `Erreur lors de la recherche du colis: ${pickupLookupError.message || 'Erreur inconnue'}`,
          });
          return false;
        }
      }

      const shipmentStatusBefore = normalizeShipmentStatus(pkg.current_status);
      // Bloquer uniquement si le colis est déjà livré ou dans un état final
      const isAlreadyTerminated = isShipmentDelivered(shipmentStatusBefore) ||
        shipmentStatusBefore === 'RELAY_FINAL_RECEIVED' ||
        shipmentStatusBefore === 'AVAILABLE_FOR_PICKUP' ||
        shipmentStatusBefore === 'PICKED_UP_BY_CUSTOMER';
      if (isAlreadyTerminated) {
        setFeedback({
          type: 'error',
          message: 'Ce colis a déjà été livré ou est en attente de retrait au relais de destination.'
        });
        return false;
      }

      // Appel à l'API pour marquer le colis comme ramassé
      const { data: pickupResult, error: pickupError } = await api.carrierPickup(pkg.tracking_number, pkg.origin_relay_id);

      if (pickupError || (pickupResult && (pickupResult.error || pickupResult.success === false))) {
        const message = pickupError || pickupResult?.error || 'Impossible de marquer le colis comme ramassé.';
        setFeedback({ type: 'error', message });
        return false;
      }

      // Recharger pour récupérer les statuts mis à jour
      const refreshedAssignments = await loadTransporterData();
      const updatedPkg = refreshedAssignments.find((p: TransporterPackage) => p.tracking_number === trackingNumberUpper) || pkg;

      const assignmentStatus = (updatedPkg.assignment_status || '').toLowerCase();
      const shipmentStatus = normalizeShipmentStatus(updatedPkg.current_status);

      if (!ALLOWED_ASSIGNMENT_STATUSES.has(assignmentStatus) || !VISIBLE_SHIPMENT_STATUSES.has(shipmentStatus)) {
        setFeedback({ type: 'error', message: 'Le colis a été scanné, mais son statut n’est pas encore passé en transit. Veuillez rafraîchir ou réessayer.' });
        return false;
      }

      const scannedPkg: ScannedPackage = {
        pkg: updatedPkg,
        isPickedUp: true,
        isDelivered: isTerminalForTransporter(shipmentStatus),
        isCalled: false,
        pickupCodeInput: '',
        incidentReported: false,
      };

      const newScanned = new Map(scannedPackages);
      newScanned.set(updatedPkg.tracking_number, scannedPkg);
      setScannedPackages(newScanned);
      saveScannedPackages(newScanned);

      return true;
    } catch (error: any) {
      console.error('Process tracking error:', error);
      setFeedback({ type: 'error', message: `Erreur: ${error.message || 'Erreur inconnue'}` });
      return false;
    }
  };

  const handleUnifiedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = unifiedSearchInput.trim();
    if (!input) {
      setFeedback({ type: 'error', message: 'Saisissez un numéro de colis, de suivi, de téléphone ou de code relais' });
      return;
    }

    // Détection du type de saisie
    const digitsOnly = input.replace(/[\s\-\.\(\)]/g, '');
    const isPhone = /^[\+]?\d{8,15}$/.test(digitsOnly);
    const isTracking = /^CD[A-Z0-9]{4,}$/i.test(digitsOnly);

    if (isPhone) {
      // Recherche par téléphone expéditeur (ramassage à domicile)
      const normalizedPhone = normalizePhoneForApiSearch(input);
      setUnifiedSearchLoading(true);
      try {
        const { data, error } = await api.getShipmentsForPickup(normalizedPhone);
        if (error) { setFeedback({ type: 'error', message: error }); return; }
        if (!Array.isArray(data) || data.length === 0) {
          setSearchInlineResult({ type: 'error', message: `Aucun colis trouvé pour le numéro de téléphone « ${input} ».` });
          return;
        }
        const foundPackages: TransporterPackage[] = data.map((shipment: any) => ({
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          shipment_code: shipment.shipment_code,
          sender_first_name: shipment.sender_first_name || '',
          sender_last_name: shipment.sender_last_name || '',
          sender_commune: shipment.sender_commune || '',
          sender_address: shipment.sender_address || '',
          sender_phone: shipment.sender_phone || '',
          recipient_first_name: shipment.recipient_first_name || '',
          recipient_last_name: shipment.recipient_last_name || '',
          recipient_commune: shipment.recipient_commune || '',
          recipient_address: shipment.recipient_address || '',
          recipient_phone: shipment.recipient_phone || '',
          current_status: shipment.current_status || shipment.effective_status || 'READY_FOR_DROP_OFF',
          payment_status: shipment.payment_status || 'pending',
          assignment_status: 'in_transit',
          created_at: shipment.created_at || new Date().toISOString(),
          updated_at: shipment.updated_at || new Date().toISOString(),
          home_delivery: shipment.home_delivery || false,
          origin_relay_id: shipment.origin_relay_id || null,
          destination_relay_id: shipment.destination_relay_id,
          destination_relay_name: shipment.destination_relay_name || shipment.destination_relay?.name,
          destination_relay_address: shipment.destination_relay_address || shipment.destination_relay?.address,
          destination_relay_commune: shipment.destination_relay_commune || shipment.destination_relay?.commune,
          destination_relay_latitude: shipment.destination_relay_latitude || shipment.destination_relay?.latitude,
          destination_relay_longitude: shipment.destination_relay_longitude || shipment.destination_relay?.longitude,
          relay_name: shipment.origin_relay?.name || shipment.relay_name,
          relay_address: shipment.origin_relay?.address || shipment.relay_address,
          relay_commune: shipment.origin_relay?.commune || shipment.relay_commune,
          relay_latitude: shipment.origin_relay?.latitude || shipment.relay_latitude,
          relay_longitude: shipment.origin_relay?.longitude || shipment.relay_longitude,
          pickup_code: shipment.pickup_code,
        }));
        addFoundPackagesToState(foundPackages);
        setSearchInlineResult({ type: 'success', message: `${foundPackages.length} colis trouvé(s) et ajouté(s) à votre tournée.` });
        setUnifiedSearchInput('');
      } finally {
        setUnifiedSearchLoading(false);
      }

    } else if (isTracking) {
      // Numéro de suivi (CD...)
      setUnifiedSearchLoading(true);
      try {
        const success = await processTrackingNumber(digitsOnly.toUpperCase());
        if (success) {
          setSearchInlineResult({ type: 'success', message: `Colis ${digitsOnly.toUpperCase()} ajouté à votre tournée !` });
          setUnifiedSearchInput('');
        } else {
          // processTrackingNumber a déjà appelé setFeedback en interne — on duplique inline
          setSearchInlineResult({ type: 'error', message: `Aucun colis trouvé pour le numéro « ${digitsOnly.toUpperCase()} ». Vérifiez le numéro et réessayez.` });
        }
      } finally {
        setUnifiedSearchLoading(false);
      }

    } else {
      // Chercher d'abord dans les colis locaux par shipment_code (évite un 404 inutile sur l'API relay)
      const cleanInputEarly = input.toUpperCase().replace(/\s/g, '');
      const earlyLocalMatch = packages.find(p => (p.shipment_code || '').toUpperCase() === cleanInputEarly);
      if (earlyLocalMatch) {
        setUnifiedSearchLoading(true);
        try {
          const localStatus = (earlyLocalMatch.current_status || '').toUpperCase();
          const isPickupPending = localStatus === 'PICKUP_PENDING' || (!earlyLocalMatch.origin_relay_id && localStatus !== 'CARRIER_COLLECTED' && localStatus !== 'IN_TRANSIT');
          if (isPickupPending) {
            setSearchInlineResult({ type: 'info', message: `Colis ${cleanInputEarly} : ramassage à domicile en attente. Confirmez le ramassage via le bouton "Ramassage confirmé" dans la section "Ma tournée".` });
            return;
          }
          if (scannedPackages.has(earlyLocalMatch.tracking_number)) {
            setSearchInlineResult({ type: 'info', message: `Le colis ${cleanInputEarly} est déjà dans votre colonne de livraison.` });
            return;
          }
          const success = await processTrackingNumber(earlyLocalMatch.tracking_number);
          if (success) {
            setSearchInlineResult({ type: 'success', message: `Colis ${cleanInputEarly} ajouté à la colonne de livraison !` });
            setUnifiedSearchInput('');
          } else {
            setSearchInlineResult({ type: 'error', message: `Impossible de scanner le colis ${cleanInputEarly}. Vérifiez son statut et réessayez.` });
          }
        } finally {
          setUnifiedSearchLoading(false);
        }
        return;
      }

      // Sinon : essayer comme code relais
      setUnifiedSearchLoading(true);
      try {
        const { data: relayData, error: findError } = await api.findRelayByIdentifier(input);
        const relayFound = !findError && relayData && !('matches' in relayData && (relayData as any).matches.length === 0);

        if (relayFound && relayData) {
          const relayId = 'relay_id' in relayData ? (relayData as any).relay_id : (relayData as any).matches[0].id;
          const relayName = 'relay_name' in relayData ? (relayData as any).relay_name : (relayData as any).matches[0].name;
          const { data: tProfile } = await api.getTransporterProfile();
          if (!tProfile?.id) { setFeedback({ type: 'error', message: 'Profil transporteur non trouvé' }); return; }
          const { data: shipments, error: sErr } = await api.getTransporterShipmentsAtRelay(tProfile.id, relayId);
          if (sErr) { setFeedback({ type: 'error', message: sErr }); return; }
          if (!Array.isArray(shipments) || shipments.length === 0) {
            setSearchInlineResult({ type: 'info', message: `Aucun colis trouvé pour le point relais « ${relayName} ».` });
            return;
          }
          const foundPackages: TransporterPackage[] = shipments.map((shipment: any) => ({
            id: shipment.id,
            tracking_number: shipment.tracking_number,
            shipment_code: shipment.shipment_code,
            sender_first_name: shipment.sender_first_name || '',
            sender_last_name: shipment.sender_last_name || '',
            sender_commune: shipment.sender_commune || '',
            sender_address: shipment.sender_address || '',
            sender_phone: shipment.sender_phone || '',
            recipient_first_name: shipment.recipient_first_name || '',
            recipient_last_name: shipment.recipient_last_name || '',
            recipient_commune: shipment.recipient_commune || '',
            recipient_address: shipment.recipient_address || '',
            recipient_phone: shipment.recipient_phone || '',
            current_status: shipment.current_status || 'IN_TRANSIT',
            payment_status: shipment.payment_status || 'paid',
            assignment_status: shipment.assignment_status || 'in_transit',
            created_at: shipment.created_at || new Date().toISOString(),
            updated_at: shipment.updated_at || new Date().toISOString(),
            home_delivery: shipment.home_delivery || false,
            origin_relay_id: shipment.origin_relay_id || null,
            destination_relay_id: shipment.destination_relay_id || relayId,
            destination_relay_name: shipment.destination_relay_name || relayName,
            destination_relay_address: shipment.destination_relay_address,
            destination_relay_commune: shipment.destination_relay_commune,
            destination_relay_latitude: shipment.destination_relay_latitude,
            destination_relay_longitude: shipment.destination_relay_longitude,
            relay_name: shipment.origin_relay_name || shipment.relay_name,
            relay_address: shipment.origin_relay_address || shipment.relay_address,
            relay_commune: shipment.origin_relay_commune || shipment.relay_commune,
            relay_latitude: shipment.origin_relay_latitude || shipment.relay_latitude,
            relay_longitude: shipment.origin_relay_longitude || shipment.relay_longitude,
            pickup_code: shipment.pickup_code,
          }));
          addFoundPackagesToState(foundPackages);
          setSearchInlineResult({ type: 'success', message: `${foundPackages.length} colis trouvé(s) au relais « ${relayName} ».` });
          setUnifiedSearchInput('');
        } else {
          // Fallback 1 : chercher dans les colis locaux par shipment_code
          const cleanInput = input.toUpperCase().replace(/\s/g, '');
          const localMatch = packages.find(p => (p.shipment_code || '').toUpperCase() === cleanInput);
          if (localMatch) {
            // 1) Ramassage à domicile pas encore confirmé → guider vers le bouton de la tournée
            //    (DOIT être avant scannedPackages.has() car loadTransporterData ajoute automatiquement
            //     les home-pickup dans scannedPackages avec isPickedUp=false)
            const localStatus = (localMatch.current_status || '').toUpperCase();
            const isPickupPending = localStatus === 'PICKUP_PENDING' || (!localMatch.origin_relay_id && localStatus !== 'CARRIER_COLLECTED' && localStatus !== 'IN_TRANSIT');
            if (isPickupPending) {
              setSearchInlineResult({ type: 'info', message: `Colis ${cleanInput} : ramassage à domicile en attente. Confirmez le ramassage via le bouton "Ramassage confirmé" dans la section "Ma tournée".` });
              return;
            }
            // 2) Déjà dans la colonne de livraison (CARRIER_COLLECTED ou IN_TRANSIT)
            if (scannedPackages.has(localMatch.tracking_number)) {
              setSearchInlineResult({ type: 'info', message: `Le colis ${cleanInput} est déjà dans votre colonne de livraison.` });
              return;
            }
            // 3) Cas normal : traiter via processTrackingNumber
            const success = await processTrackingNumber(localMatch.tracking_number);
            if (success) {
              setSearchInlineResult({ type: 'success', message: `Colis ${cleanInput} ajouté à la colonne de livraison !` });
              setUnifiedSearchInput('');
            } else {
              setSearchInlineResult({ type: 'error', message: `Impossible de scanner le colis ${cleanInput}. Vérifiez son statut et réessayez.` });
            }
          } else {
            // Fallback 2 : essayer via l'API par code d'envoi ou numéro de suivi
            const success = await processTrackingNumber(cleanInput);
            if (success) {
              setSearchInlineResult({ type: 'success', message: `Colis ${cleanInput} ajouté à votre tournée !` });
              setUnifiedSearchInput('');
            } else {
              setSearchInlineResult({ type: 'error', message: `Aucun résultat pour « ${input} ». Vérifiez le code d'envoi, numéro de suivi, téléphone ou code relais.` });
            }
          }
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Erreur lors de la recherche' });
      } finally {
        setUnifiedSearchLoading(false);
      }
    }
  };

  const addFoundPackagesToState = (foundPackages: TransporterPackage[]) => {
    const newScanned = new Map(scannedPackages);
    foundPackages.forEach(pkg => {
      const shipmentStatus = normalizeShipmentStatus(pkg.current_status || '');
      const isInTransit = shipmentStatus === 'IN_TRANSIT' || shipmentStatus === 'CARRIER_COLLECTED';
      if (!newScanned.has(pkg.tracking_number)) {
        newScanned.set(pkg.tracking_number, {
          pkg,
          isPickedUp: isInTransit,
          isDelivered: isShipmentDelivered(shipmentStatus) || shipmentStatus === 'RELAY_FINAL_RECEIVED' || shipmentStatus === 'AVAILABLE_FOR_PICKUP',
          isCalled: false,
          pickupCodeInput: '',
          incidentReported: false,
        });
      }
    });
    setScannedPackages(newScanned);
    saveScannedPackages(newScanned);
    setPackages(prev => {
      const existing = new Set(prev.map(p => p.tracking_number));
      return [...prev, ...foundPackages.filter(p => !existing.has(p.tracking_number))];
    });
  };

  const handleReceiveShipment = async (trackingNumber: string) => {
    const pkg = packages.find(p => p.tracking_number === trackingNumber);
    if (!pkg) {
      setFeedback({ type: 'error', message: 'Colis introuvable.' });
      return;
    }
    
    // Encaissement transporteur UNIQUEMENT pour home pickup (origin_relay_id null = ramassage
    // directement chez l'expéditeur). Dans ce cas, c'est le transporteur qui encaisse.
    // Pour les colis déposés au relais (origin_relay_id défini), le relais a déjà encaissé
    // ou encaissera lors de la remise au client — le transporteur n'a rien à encaisser.
    const isHomePickup = !pkg.origin_relay_id;
    const needsTransporterPayment =
      isHomePickup &&
      (pkg.payment_method === 'relay_cash' || pkg.payment_method === 'cash') &&
      (pkg.payment_status || '').toLowerCase() !== 'paid';

    if (needsTransporterPayment) {
      setPaymentConfirmationShipment(pkg);
      return;
    }
    
    // Sinon procéder directement à la réception
    await proceedWithReceiveShipment(trackingNumber);
  };

  const proceedWithReceiveShipment = async (trackingNumber: string) => {
    try {
      setLoading(true);
      const pkg = packages.find(p => p.tracking_number === trackingNumber);
      if (!pkg) {
        setFeedback({ type: 'error', message: 'Colis introuvable.' });
        setLoading(false);
        return;
      }

      // Utiliser le shipment_code connu du colis (récupéré via l'API assignments)
      // Le transporteur n'a pas à le retaper : il a déjà identifié le relais, le colis est
      // confirmé physiquement présent. Le shipment_code est passé au backend pour tracçabilité.
      const shipmentCode = (pkg.shipment_code || carrierShipmentCodes[trackingNumber] || '').trim().toUpperCase();
      if (!shipmentCode) {
        setFeedback({ type: 'error', message: 'Code colis introuvable. Utilisez la recherche pour retrouver le colis.' });
        setLoading(false);
        return;
      }

      // Utiliser l'API pour réceptionner le colis (met en CARRIER_COLLECTED puis IN_TRANSIT)
      const { error } = await api.receiveShipmentForPickup(
        trackingNumber,
        pkg.origin_relay_id || undefined,
        shipmentCode
      );
      if (error) {
        setFeedback({ type: 'error', message: `Erreur lors de la réception: ${error}` });
        setLoading(false);
        return;
      }
      
      // Mettre à jour le statut localement
      setScannedPackages(prev => {
        const newMap = new Map(prev);
        const scanned = newMap.get(trackingNumber);
        if (scanned) {
          newMap.set(trackingNumber, { ...scanned, isPickedUp: true });
        } else {
          // Si le colis n'est pas encore dans scannedPackages, l'ajouter
          newMap.set(trackingNumber, {
            pkg,
            isPickedUp: true,
            isDelivered: false,
            isCalled: false,
            pickupCodeInput: '',
            incidentReported: false,
          });
        }
        saveScannedPackages(newMap);
        return newMap;
      });
      
      setFeedback({ type: 'success', message: 'Colis réceptionné avec succès ! Statut mis à jour en "En transit".' });
      await loadTransporterData();
      setLoading(false);
    } catch (error: any) {
      console.error('Receive shipment error:', error);
      setFeedback({ type: 'error', message: `Erreur: ${error.message || 'Erreur inconnue'}` });
      setLoading(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    if (paymentConfirmationShipment) {
      const pkg = paymentConfirmationShipment;
      setPaymentConfirmationShipment(null);
      setPackages(prev => prev.map(p =>
        p.tracking_number === pkg.tracking_number ? { ...p, payment_status: 'paid' } : p
      ));
      // Enchaîner directement sur la confirmation de ramassage
      setHomePickupConfirmModal({ pkg: { ...pkg, payment_status: 'paid' }, shipmentCode: pkg.shipment_code || pkg.tracking_number });
      await loadTransporterData();
    }
  };

  const handleRelayDelivery = async (trackingNumber: string) => {
    try {
      const pkg = packages.find(p => p.tracking_number === trackingNumber);
      if (!pkg || !pkg.destination_relay_id) {
        setFeedback({ type: 'error', message: 'ID du point relais de destination manquant.' });
        return;
      }
      
      const { error } = await api.scanHandoff(trackingNumber, pkg.destination_relay_id);
      if (error) {
        setFeedback({ type: 'error', message: `Erreur lors du dépôt: ${error}` });
        return;
      }

      setScannedPackages(prev => {
        const newMap = new Map(prev);
        const scanned = newMap.get(trackingNumber);
        if (scanned) {
          newMap.set(trackingNumber, { ...scanned, isDelivered: true });
        }
        saveScannedPackages(newMap);
        return newMap;
      });
      setFeedback({ type: 'success', message: 'Colis déposé au point relais avec succès !' });
      
      // Recharger les données pour mettre à jour les listes
      await loadTransporterData();
      // Recharger immédiatement la liste des colis livrés pour que le colis apparaisse dans "Colis livrés"
      await loadDeliveredShipments();
    } catch (error: any) {
      console.error('Relay delivery error:', error);
      setFeedback({ type: 'error', message: `Erreur: ${error.message || 'Erreur inconnue'}` });
    }
  };

  const handleCall = (trackingNumber: string) => {
    setScannedPackages(prev => {
      const newMap = new Map(prev);
      const scanned = newMap.get(trackingNumber);
      if (scanned) {
        newMap.set(trackingNumber, { ...scanned, isCalled: true });
      }
      saveScannedPackages(newMap);
      return newMap;
    });
  };

  const handlePickupCodeModalValidation = async () => {
    if (!currentPickupCodePackage) return;
    
    const code = pickupCodeModalInput.trim();
    if (!code || code.length !== 6) {
      setFeedback({ type: 'error', message: 'Le code doit contenir 6 chiffres' });
      return;
    }

    try {
      const identifiers = [
        (pickupVerificationInput || '').trim(),
        (currentPickupCodePackage.recipient_phone || '').trim(),
        (currentPickupCodePackage.recipient_email || '').trim(),
      ].filter((val, index, arr) => val && arr.indexOf(val) === index);

      let lastError: string | null = null;
      let verified = false;

      for (const identifier of identifiers) {
        const { data, error } = await api.verifyPickupCode(
          currentPickupCodePackage.tracking_number,
          code,
          identifier
        );

        if (!error && data?.success) {
          verified = true;
          break;
        }

        lastError = error || data?.message || 'Code incorrect – veuillez vérifier les informations saisies.';
      }

      if (!verified) {
        setFeedback({ type: 'error', message: lastError || 'Code incorrect – veuillez vérifier les informations saisies.' });
        return;
      }

      const { error: handoffError } = await api.scanHandoff(currentPickupCodePackage.tracking_number);
      if (handoffError) {
        setFeedback({ type: 'error', message: `Erreur lors de la livraison: ${handoffError}` });
        return;
      }

      setScannedPackages(prev => {
        const newMap = new Map(prev);
        const scanned = newMap.get(currentPickupCodePackage.tracking_number);
        if (scanned) {
          newMap.set(currentPickupCodePackage.tracking_number, { ...scanned, isDelivered: true });
        }
        saveScannedPackages(newMap);
        return newMap;
      });
      
      setShowPickupCodeModal(false);
      setCurrentPickupCodePackage(null);
      setPickupCodeModalInput('');
      setPickupVerificationInput('');
      setFeedback({ type: 'success', message: 'Colis livré à domicile avec succès !' });
      await loadTransporterData();
      await loadDeliveredShipments();
    } catch (error: any) {
      console.error('Home delivery error:', error);
      setFeedback({ type: 'error', message: `Erreur: ${error.message || 'Erreur inconnue'}` });
    }
  };

  const handleIncident = async () => {
    if (!incidentPackage || !incidentType || !incidentDescription) {
      setFeedback({ type: 'error', message: 'Veuillez remplir tous les champs' });
      return;
    }

    setIncidentLoading(true);
    try {
      let coords: { latitude: number; longitude: number } | undefined;
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }; resolve(); },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }

      const { error } = await api.reportTransporterIncident(
        incidentPackage.tracking_number,
        incidentType,
        incidentDescription,
        coords
      );

      if (error) {
        setFeedback({ type: 'error', message: `Erreur : ${error}` });
        return;
      }

      setFeedback({ type: 'success', message: 'Incident signalé avec succès.' });
      setIncidentPackage(null);
      setIncidentType('');
      setIncidentDescription('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur : ${err.message || 'Erreur inconnue'}` });
    } finally {
      setIncidentLoading(false);
    }
  };

  const handleNonReceived = async (trackingNumber: string, comment: string) => {
    try {
      const { error } = await api.reportTransporterIncident(trackingNumber, 'client_absent', comment);
      if (error) {
        setFeedback({ type: 'error', message: `Erreur : ${error}` });
        return;
      }
      setScannedPackages(prev => {
        const newMap = new Map(prev);
        const scanned = newMap.get(trackingNumber);
        if (scanned) {
          newMap.set(trackingNumber, { ...scanned, incidentReported: true });
        } else {
          // relay_pickup packages may not yet be in scannedPackages — add them so the flag persists
          const pkg = packages.find(p => p.tracking_number === trackingNumber);
          if (pkg) {
            newMap.set(trackingNumber, {
              pkg,
              isPickedUp: false,
              isDelivered: false,
              isCalled: false,
              pickupCodeInput: '',
              incidentReported: true,
            });
          }
        }
        saveScannedPackages(newMap);
        return newMap;
      });
      setNonReceivedPackage(null);
      setNonReceivedComment('');
      setFeedback({ type: 'success', message: 'Non-réception signalée.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erreur inconnue' });
    }
  };

  // Calculer le nombre de colis à ramasser (non scannés et non livrés)
  const getPackagesToPickupCount = () => {
    return packages.filter((pkg) => {
      // Exclure les colis déjà scannés
      if (scannedPackages.has(pkg.tracking_number)) {
        return false;
      }
      
      // Exclure les colis déjà livrés
      const shipmentStatus = normalizeShipmentStatus(pkg.current_status);
      if (isTerminalForTransporter(shipmentStatus)) {
        return false;
      }

      return true;
    }).length;
  };

  // Calculer le nombre total de colis scannés
  // Inclut les colis dans scannedPackages ET les colis livrés (qui sont forcément scannés)
  const getTotalScannedCount = () => {
    // Créer un Set des numéros de suivi des colis livrés pour éviter les doublons
    const deliveredTrackingNumbers = new Set(deliveredShipments.map(s => s.tracking_number));
    
    // Compter les colis scannés qui ne sont pas encore livrés
    const scannedNotDelivered = Array.from(scannedPackages.keys()).filter(tracking => 
      !deliveredTrackingNumbers.has(tracking)
    ).length;
    
    // Le nombre total = colis scannés non livrés + colis livrés
    // (car les colis livrés sont forcément scannés)
    return scannedNotDelivered + deliveredShipments.length;
  };

  const getGroupedPackages = () => {
    const relayPackages = new Map<string, Map<string, TransporterPackage[]>>();
    const homePackages = new Map<string, TransporterPackage[]>();

    debugLog('getGroupedPackages called', {
      scannedPackagesSize: scannedPackages.size,
      packagesSize: packages.length,
    });

    if (scannedPackages.size === 0) {
      debugLog('no cached scanned packages for grouping');
      return { relayPackages, homePackages };
    }

    const packageByTracking = new Map(packages.map(p => [p.tracking_number, p]));
    const scannedEntries: TransporterPackage[] = [];

    scannedPackages.forEach((scannedPkg, trackingNumber) => {
      // Exclure les colis livrés de la liste principale
      if (scannedPkg.isDelivered) {
        debugLog('package delivered, excluding from main list', trackingNumber);
        return;
      }

      // Only show packages still present on the server — avoid stale localStorage cache
      const pkg = packageByTracking.get(trackingNumber);
      if (!pkg) {
        debugLog('package not found on server, skipping from grouped view', trackingNumber);
        return;
      }

      const assignmentStatus = (pkg.assignment_status || '').toLowerCase();
      const shipmentStatus = normalizeShipmentStatus(pkg.current_status);

      // Exclure les colis terminaux : livrés ou déposés au relais de destination
      if (isTerminalForTransporter(shipmentStatus)) {
        debugLog('package has terminal status, excluding from main list', {
          tracking: trackingNumber,
          status: shipmentStatus,
        });
        return;
      }

      // Pour les colis avec ramassage à domicile (home_delivery = true et origin_relay_id = null),
      // on les affiche même s'ils ne sont pas encore "picked up" car le transporteur doit aller les chercher
      const isHomePickup = !pkg.origin_relay_id && !!pkg.sender_address;
      const isReadyForHomePickup = isHomePickup && (
        shipmentStatus === 'READY_FOR_DROP_OFF' ||
        shipmentStatus === 'PICKUP_PENDING' ||
        shipmentStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP' ||
        shipmentStatus === 'PAYMENT_PENDING_AT_RELAY'
      );

      // Pour les autres colis, ils doivent être "picked up" pour être affichés
      if (!scannedPkg.isPickedUp && !isReadyForHomePickup) {
        debugLog('package not picked up and not ready for home pickup, skipping', trackingNumber);
        return;
      }

      // Permettre les colis en transit OU les colis prêts pour ramassage (pour le ramassage à domicile)
      const isInTransit = shipmentStatus === IN_TRANSIT_STATUS || shipmentStatus === 'CARRIER_COLLECTED';
      
      // Si le colis est scanné (dans scannedPackages), on l'affiche même s'il n'est pas encore en transit
      // Cela permet d'afficher les colis chargés par téléphone pour ramassage
      // ET les colis en transit doivent rester affichés jusqu'à la livraison
      if (scannedPkg.isPickedUp || isReadyForHomePickup || isInTransit) {
        // Colis scanné/ramassé OU colis prêt pour ramassage à domicile OU colis en transit - toujours afficher (sauf s'il est livré)
        debugLog('adding package', {
          tracking: trackingNumber,
          home_delivery: pkg.home_delivery,
          origin_relay_id: pkg.origin_relay_id,
          isHomePickup,
          isReadyForHomePickup,
          isPickedUp: scannedPkg.isPickedUp,
          isInTransit,
          shipmentStatus,
          destination_relay_name: pkg.destination_relay_name,
          recipient_commune: pkg.recipient_commune,
        });
        scannedEntries.push(pkg);
        return;
      }
      
      // Pour les autres colis, appliquer les filtres normaux
      if (!ALLOWED_ASSIGNMENT_STATUSES.has(assignmentStatus) || !isInTransit) {
        debugLog('package filtered out', {
          tracking: trackingNumber,
          assignmentStatus,
          shipmentStatus,
        });
        return;
      }

      scannedEntries.push(pkg);
    });

    debugLog('scannedEntries length', scannedEntries.length);

    if (scannedEntries.length === 0) {
      debugLog('no scanned packages eligible for display');
      return { relayPackages, homePackages };
    }

    scannedEntries.forEach((pkg) => {
      debugLog('grouping package', {
        tracking: pkg.tracking_number,
        home_delivery: pkg.home_delivery,
        destination_relay_name: pkg.destination_relay_name,
        destination_relay_id: pkg.destination_relay_id,
        recipient_commune: pkg.recipient_commune,
      });

      // Pour les colis avec ramassage à domicile (origin_relay_id NULL), 
      // ils peuvent être soit en livraison à domicile (home_delivery = true)
      // soit en livraison au point relais (home_delivery = false mais destination_relay_id défini)
      if (pkg.home_delivery) {
        // Livraison à domicile — uniquement si le transporteur a physiquement le colis
        // (IN_TRANSIT ou CARRIER_COLLECTED). Les home_pickup restent dans la tournée
        // mais n'apparaissent pas encore dans la colonne livraison.
        if (pkg.current_status !== 'IN_TRANSIT' && pkg.current_status !== 'CARRIER_COLLECTED') {
          debugLog('home_delivery package not yet in transit, skipping from homePackages', pkg.tracking_number);
          // Ne pas ajouter à homePackages — le colis reste visible dans la section tournée
          // Les colis home_pickup (origin_relay_id null, pas encore collectés) sont gérés par la tournée
          return;
        }
        const commune = pkg.recipient_commune || 'Autre';
        if (!homePackages.has(commune)) {
          homePackages.set(commune, []);
        }
        homePackages.get(commune)!.push(pkg);
        debugLog('added to home packages', { commune, tracking: pkg.tracking_number });
      } else if (pkg.destination_relay_name || pkg.relay_name || pkg.destination_relay_id) {
        // Livraison en point relais — uniquement si le transporteur a physiquement le colis
        if (pkg.current_status !== 'IN_TRANSIT' && pkg.current_status !== 'CARRIER_COLLECTED') {
          debugLog('relay_delivery package not yet in transit, skipping from relayPackages', pkg.tracking_number);
          return;
        }
        const commune = pkg.destination_relay_commune || pkg.relay_commune || pkg.recipient_commune || 'Autre';
        if (!relayPackages.has(commune)) {
          relayPackages.set(commune, new Map());
        }
        const communeMap = relayPackages.get(commune)!;
        const relayName = pkg.destination_relay_name || pkg.relay_name || 'Point Relais';
        if (!communeMap.has(relayName)) {
          communeMap.set(relayName, []);
        }
        communeMap.get(relayName)!.push(pkg);
        debugLog('added to relay packages', { commune, relayName, tracking: pkg.tracking_number });
      } else {
        // Colis sans destination claire — uniquement si le transporteur a physiquement le colis
        if (pkg.current_status !== 'IN_TRANSIT' && pkg.current_status !== 'CARRIER_COLLECTED') {
          debugLog('unrouted package not yet in transit, skipping', pkg.tracking_number);
          return;
        }
        const commune = pkg.recipient_commune || pkg.sender_commune || 'Autre';
        if (!homePackages.has(commune)) {
          homePackages.set(commune, []);
        }
        homePackages.get(commune)!.push(pkg);
        debugLog('added to home packages (default)', { commune, tracking: pkg.tracking_number });
      }
    });

    debugLog('getGroupedPackages result', {
      relayPackagesCount: Array.from(relayPackages.values()).reduce((sum, map) => sum + Array.from(map.values()).reduce((s, arr) => s + arr.length, 0), 0),
      homePackagesCount: Array.from(homePackages.values()).reduce((sum, arr) => sum + arr.length, 0),
    });

    return { relayPackages, homePackages };
  };

  const { relayPackages, homePackages } = getGroupedPackages();

  if (user && user.role === 'transporter') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <header className="bg-white shadow-md border-b border-orange-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <p className="text-xs text-gray-500">Tournée active</p>
                <p className="text-sm font-semibold text-gray-900">
                  #{new Date().toISOString().slice(2,10).replace(/-/g,'')} • {packages.length} colis assignés • {scannedPackages.size} scannés
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
              <button
                onClick={loadTransporterData}
                className="flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg text-[#FF6C00] text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                {lastSyncAt || '--:--'}
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-800 font-bold">
                    {user.first_name?.[0]?.toUpperCase() || 'T'}
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg w-56 z-50">
                    <button onClick={() => setIsUserMenuOpen(false)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">Mon profil</button>
                    <button onClick={async () => { setIsUserMenuOpen(false); await signOut(); onNavigate('home'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600">Déconnexion</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 py-6">
          {feedback && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}
          {/* Panneau d'information */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Nombre total de colis à ramasser</div>
                <div className="text-3xl font-bold text-[#FF6C00]">{getPackagesToPickupCount()}</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Dernière synchronisation : <strong>{lastSyncAt || '--:--'}</strong></div>
                <div className="mt-1">Colis scannés : <strong>{getTotalScannedCount()}</strong></div>
              </div>
            </div>
          </div>

          {/* ─── Panneau Marketplace : Courses disponibles + Portefeuille ─── */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-4">
            {/* Onglets */}
            <div className="flex border-b border-gray-200 mb-5">
              <button
                onClick={() => setActiveMarketplaceTab('offers')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeMarketplaceTab === 'offers'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Courses disponibles
                {(deliveryBatches.length + deliveryOffers.length) > 0 && (
                  <span className="bg-[#FF6C00] text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {deliveryBatches.length + deliveryOffers.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveMarketplaceTab('wallet'); loadWallet(); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeMarketplaceTab === 'wallet'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Mes gains
                {wallet && wallet.balance_fcfa > 0 && (
                  <span className="text-xs text-green-600 font-medium">
                    {Number(wallet.balance_fcfa).toLocaleString()} FCFA
                  </span>
                )}
              </button>
            </div>

            {/* Tab Offres */}
            {activeMarketplaceTab === 'offers' && (
              <div>
                {/* ─── Lots groupés (au-dessus des offres individuelles) ─── */}
                {batchesLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-gray-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Chargement des lots…</span>
                  </div>
                ) : deliveryBatches.length > 0 ? (
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Lots groupés</span>
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{deliveryBatches.length}</span>
                    </div>
                    {deliveryBatches.map((batch: any) => {
                      const countdown = batchCountdowns[batch.id] ?? 0;
                      const isExpiring = countdown < 60;
                      const vehicleEmoji: Record<string, string> = {
                        moto: '🏍️',
                        velo: '🚲',
                        voiture: '🚗',
                        camionnette: '🚐',
                        pied: '🚶',
                      };
                      return (
                        <div
                          key={batch.id}
                          className={`border-2 rounded-xl p-4 transition-all ${
                            isExpiring ? 'border-red-300 bg-red-50' : 'border-indigo-200 bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-bold text-gray-900 text-sm">
                                Lot de {batch.shipment_count} colis — {batch.origin_relay_name} → {batch.destination_zone_name || batch.destination_commune || '?'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {batch.total_weight_kg ? `${batch.total_weight_kg} kg` : ''}
                                {batch.batch_type === 'relay_to_home' ? ' · Livraison domicile' : batch.batch_type === 'mixed' ? ' · Mixte' : ' · Relais → Relais'}
                              </div>
                            </div>
                            <div className={`text-right ${isExpiring ? 'text-red-600' : 'text-indigo-600'}`}>
                              <div className="text-lg font-mono font-bold">
                                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                              </div>
                              <div className="text-xs">restant</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(batch.required_vehicle_types || []).map((vt: string) => (
                              <span key={vt} className="text-xs px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700 font-medium">
                                {vehicleEmoji[vt] || ''} {vt}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-green-700">
                              💰 {Number(batch.net_earnings_fcfa || 0).toLocaleString()} FCFA
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeclineBatch(batch.id)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                Décliner
                              </button>
                              <button
                                onClick={() => handleAcceptBatch(batch.id)}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Accepter le lot
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {deliveryOffers.length > 0 && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Courses individuelles</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {offersLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Chargement des courses…</span>
                  </div>
                ) : deliveryOffers.length === 0 && deliveryBatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-2xl mb-2">📭</p>
                    <p className="text-sm font-medium">Aucune course en attente</p>
                    <p className="text-xs text-gray-400 mt-1">Vous serez notifié(e) dès qu'une course est disponible</p>
                  </div>
                ) : deliveryOffers.length > 0 ? (
                  <div className="space-y-4">
                    {deliveryOffers.map((offer: any) => {
                      const countdown = offerCountdowns[offer.id] ?? 0;
                      const isExpiring = countdown < 60;
                      return (
                        <div
                          key={offer.id}
                          className={`border-2 rounded-xl p-4 transition-all ${
                            isExpiring ? 'border-red-300 bg-red-50' : 'border-orange-200 bg-orange-50'
                          }`}
                        >
                          {/* En-tête offre */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-bold text-gray-900 text-sm">
                                📍 {offer.sender_commune} → {offer.recipient_commune}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {offer.package_type} • {offer.weight} kg
                              </div>
                            </div>
                            {/* Compte à rebours */}
                            <div className={`text-right ${isExpiring ? 'text-red-600' : 'text-orange-600'}`}>
                              <div className="text-lg font-mono font-bold">
                                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                              </div>
                              <div className="text-xs">restant</div>
                            </div>
                          </div>

                          {/* Adresses */}
                          <div className="text-xs text-gray-600 space-y-1 mb-3">
                            <div>
                              <span className="font-medium">Collecte :</span>{' '}
                              {offer.origin_relay_name
                                ? `${offer.origin_relay_name} — ${offer.origin_relay_commune}`
                                : `${offer.sender_address}, ${offer.sender_commune}`}
                            </div>
                            <div>
                              <span className="font-medium">Livraison :</span>{' '}
                              {offer.destination_relay_name
                                ? `${offer.destination_relay_name} — ${offer.destination_relay_commune}`
                                : `${offer.recipient_address}, ${offer.recipient_commune}`}
                            </div>
                          </div>

                          {/* Gains + boutons */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-green-700">
                              💰 {Number(offer.net_earnings_fcfa || 0).toLocaleString()} FCFA
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeclineOffer(offer.id)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                Décliner
                              </button>
                              <button
                                onClick={() => handleAcceptOffer(offer.id)}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                              >
                                ✅ Accepter
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}

            {/* Tab Portefeuille */}
            {activeMarketplaceTab === 'wallet' && (
              <div className="space-y-5">
                {/* Solde principal */}
                <div className="bg-gradient-to-br from-[#FF6C00] to-[#ff8c33] rounded-xl p-5 text-white text-center">
                  <div className="text-xs text-white/70 mb-1">Solde disponible</div>
                  <div className="text-3xl font-extrabold">
                    {wallet ? Number(wallet.balance_fcfa).toLocaleString() : '–'} FCFA
                  </div>
                  {walletStats && (
                    <div className="flex justify-center gap-6 mt-3 text-xs text-white/80">
                      <div>
                        <div className="font-semibold">{Number(walletStats.today).toLocaleString()} FCFA</div>
                        <div>Aujourd'hui</div>
                      </div>
                      <div>
                        <div className="font-semibold">{Number(walletStats.week).toLocaleString()} FCFA</div>
                        <div>Cette semaine</div>
                      </div>
                      <div>
                        <div className="font-semibold">{Number(walletStats.month).toLocaleString()} FCFA</div>
                        <div>Ce mois</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulaire retrait */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">💸 Retirer mes gains</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Montant (min 5 000 FCFA)</label>
                      <input
                        type="number"
                        min={5000}
                        step={500}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Ex: 10000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Numéro Orange Money</label>
                      <input
                        type="tel"
                        value={withdrawPhone}
                        onChange={(e) => setWithdrawPhone(e.target.value)}
                        placeholder="07 00 00 00 00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawLoading || !withdrawAmount || !withdrawPhone}
                      className="w-full py-2.5 bg-[#FF6C00] text-white rounded-lg text-sm font-bold hover:bg-[#e66100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {withdrawLoading ? <Loader className="w-4 h-4 animate-spin" /> : '💸'}
                      Demander le retrait
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      Traitement sous 24-48h ouvrés
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ma tournée */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#FF6C00]" />
              Ma tournée
            </h2>
            {tourStops.length === 0 ? (
              <div className="text-sm text-gray-500">
                Aucun point de passage dans votre tournée pour l'instant.
              </div>
            ) : (
              <div className="space-y-2">
                {tourStops.map((stop) => {
                  const stopPkgs = getStopPackages(stop);
                  if (stopPkgs.length === 0) return null;
                  const isOpen = openTourStops.has(stop.id);
                  const borderColor = stop.type === 'home_pickup' ? 'border-pink-200' :
                    stop.type === 'relay_pickup' ? 'border-purple-200' :
                    stop.type === 'relay_delivery' ? 'border-blue-200' : 'border-orange-200';
                  const headerBg = stop.type === 'home_pickup' ? 'bg-pink-50 hover:bg-pink-100' :
                    stop.type === 'relay_pickup' ? 'bg-purple-50 hover:bg-purple-100' :
                    stop.type === 'relay_delivery' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-orange-50 hover:bg-orange-100';

                  return (
                    <div key={stop.id} className={`border rounded-xl overflow-hidden ${borderColor}`}>
                      <button
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${headerBg}`}
                        onClick={() => {
                          const next = new Set(openTourStops);
                          if (next.has(stop.id)) next.delete(stop.id);
                          else next.add(stop.id);
                          setOpenTourStops(next);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                            stop.type === 'home_pickup' ? 'bg-pink-100 text-pink-700' :
                            stop.type === 'relay_pickup' ? 'bg-purple-100 text-purple-700' :
                            stop.type === 'relay_delivery' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {stop.type === 'home_pickup' && 'Ramassage domicile'}
                            {stop.type === 'relay_pickup' && 'Ramassage relais'}
                            {stop.type === 'relay_delivery' && 'Livraison relais'}
                            {stop.type === 'home_delivery' && 'Livraison domicile'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{stop.name}</div>
                            <div className="text-xs text-gray-500 truncate">{stop.address} • {stop.commune}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs font-medium text-gray-500">{stopPkgs.length} colis</span>
                          {stop.latitude && stop.longitude && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedCommune(stop.commune); }}
                              className="text-[#FF6C00] hover:text-[#ff8534]"
                            >
                              <MapIcon className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-gray-100 bg-white">
                          {stopPkgs.map((pkg) => {
                            const scannedPkg = scannedPackages.get(pkg.tracking_number);
                            const isPickedUp = scannedPkg?.isPickedUp || false;
                            const isDelivered = scannedPkg?.isDelivered || false;
                            const showNonReceived = nonReceivedPackage === pkg.tracking_number;
                            const isHomePickup = !pkg.origin_relay_id;
                            const needsPayment = isHomePickup &&
                              (pkg.payment_method === 'relay_cash' || pkg.payment_method === 'cash') &&
                              (pkg.payment_status || '').toLowerCase() !== 'paid';

                            return (
                              <div key={pkg.tracking_number} className="p-3 space-y-2">
                                <div>
                                  <div className="font-mono text-sm font-semibold text-[#FF6C00]">
                                    {pkg.shipment_code || pkg.tracking_number}
                                  </div>
                                  {pkg.shipment_code && (
                                    <div className="text-xs text-gray-400">{pkg.tracking_number}</div>
                                  )}
                                  {(stop.type === 'home_pickup' || stop.type === 'relay_pickup') && (
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      {pkg.sender_first_name} {pkg.sender_last_name}
                                    </div>
                                  )}
                                  {(stop.type === 'relay_delivery' || stop.type === 'home_delivery') && (
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      {pkg.recipient_first_name} {pkg.recipient_last_name}
                                    </div>
                                  )}
                                  {needsPayment && (
                                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                                      À encaisser : {pkg.relay_cash_amount_expected || pkg.price
                                        ? `${Math.round((pkg.relay_cash_amount_expected || pkg.price || 0)).toLocaleString('fr-FR')} FCFA`
                                        : 'Montant à confirmer'}
                                    </div>
                                  )}
                                </div>

                                {/* Pickup actions */}
                                {(stop.type === 'home_pickup' || stop.type === 'relay_pickup') && !isPickedUp && !showNonReceived && (
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => {
                                        if (stop.type === 'home_pickup') {
                                          if (needsPayment) {
                                            setPaymentConfirmationShipment(pkg);
                                          } else {
                                            setHomePickupConfirmModal({ pkg, shipmentCode: pkg.shipment_code || pkg.tracking_number });
                                          }
                                        } else {
                                          handleReceiveShipment(pkg.tracking_number);
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 transition-colors"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Réceptionner
                                    </button>
                                    <button
                                      onClick={() => { setNonReceivedPackage(pkg.tracking_number); setNonReceivedComment(''); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-1 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                      Non réceptionné
                                    </button>
                                  </div>
                                )}

                                {/* Non-received comment form */}
                                {showNonReceived && (
                                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-medium text-gray-700">Motif de non-réception (obligatoire)</p>
                                    <textarea
                                      value={nonReceivedComment}
                                      onChange={(e) => setNonReceivedComment(e.target.value)}
                                      placeholder="Ex : client absent, colis introuvable…"
                                      rows={2}
                                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent resize-none"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => { setNonReceivedPackage(null); setNonReceivedComment(''); }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        onClick={() => handleNonReceived(pkg.tracking_number, nonReceivedComment)}
                                        disabled={!nonReceivedComment.trim()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        Confirmer
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Relay delivery actions */}
                                {stop.type === 'relay_delivery' && (
                                  <div className="flex gap-2 flex-wrap items-center">
                                    {isDelivered ? (
                                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Réceptionné par le relais
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 flex items-center gap-1">
                                        <Package className="w-3 h-3" />
                                        En attente de réception par le relais
                                      </span>
                                    )}
                                    {!isDelivered && (
                                      <button
                                        onClick={() => { setIncidentPackage(pkg); setIncidentType(''); setIncidentDescription(''); }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-colors"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        Incident
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Home delivery actions */}
                                {stop.type === 'home_delivery' && (
                                  <div className="flex gap-2 flex-wrap">
                                    {pkg.recipient_phone && (
                                      <a
                                        href={`tel:${pkg.recipient_phone}`}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 transition-colors"
                                      >
                                        <Phone className="w-3 h-3" />
                                        {pkg.recipient_phone}
                                      </a>
                                    )}
                                    <button
                                      onClick={() => setDeliveryModalShipment(pkg)}
                                      disabled={isDelivered}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                        isDelivered ? 'bg-green-200 text-green-800 cursor-not-allowed' : 'bg-[#FF6C00] hover:bg-orange-700 text-white'
                                      }`}
                                    >
                                      <Package className="w-3 h-3" />
                                      {isDelivered ? 'Livré' : 'Livrer'}
                                    </button>
                                    <button
                                      onClick={() => { setIncidentPackage(pkg); setIncidentType(''); setIncidentDescription(''); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-colors"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      Incident
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* Colonne gauche - Profil et Scanner */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              {/* Mon profil */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#FF6C00]" />
                  Mon profil
                </h2>
                <div className="space-y-3">
                  {transporterCode && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 mb-3">
                      <div className="text-xs text-gray-600 mb-1">Mon identifiant</div>
                      <div className="text-2xl font-mono font-bold text-[#FF6C00]">{transporterCode}</div>
                      <div className="text-xs text-gray-500 mt-1">À partager avec les points relais</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700"><strong>Nom complet:</strong> {user.first_name} {user.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700"><strong>Email:</strong> {user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700"><strong>Téléphone:</strong> {user.phone || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>

              {/* Saisie code colis */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#FF6C00]" />
                    Rechercher un colis
                  </h2>
                  <button
                    onClick={loadTransporterData}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg text-[#FF6C00] text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualiser
                  </button>
                </div>
                <div className="space-y-3">
                  <form onSubmit={handleUnifiedSearch} className="space-y-2">
                    <input
                      type="text"
                      value={unifiedSearchInput}
                      onChange={(e) => { setUnifiedSearchInput(e.target.value); setSearchInlineResult(null); }}
                      placeholder="N° colis, suivi, téléphone ou code relais"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent text-sm"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      disabled={unifiedSearchLoading || !unifiedSearchInput.trim()}
                      className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {unifiedSearchLoading
                        ? <><Loader className="w-4 h-4 animate-spin" /><span>Recherche...</span></>
                        : <><Search className="w-4 h-4" /><span>Rechercher</span></>
                      }
                    </button>
                  </form>
                  {/* Résultat inline de la recherche — affiché directement sous le champ */}
                  {searchInlineResult && (
                    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm border ${
                      searchInlineResult.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : searchInlineResult.type === 'info'
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <span className="shrink-0 text-base leading-none mt-px">
                        {searchInlineResult.type === 'success' ? '✅' : searchInlineResult.type === 'info' ? 'ℹ️' : '❌'}
                      </span>
                      <span>{searchInlineResult.message}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 text-center mt-2">
                    N° colis · N° suivi · Tél. expéditeur · Code point relais
                  </p>
                </div>
              </div>

              {/* Placeholder to keep structure — replaced by unified search above */}

              {/* Liste des communes */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Commune</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {Array.from(new Set([...Array.from(relayPackages.keys()), ...Array.from(homePackages.keys())])).map((commune) => {
                    const relayCount = Array.from(relayPackages.get(commune)?.values() || []).reduce((sum, arr) => sum + arr.length, 0);
                    const homeCount = homePackages.get(commune)?.length || 0;
                    const total = relayCount + homeCount;
                    return (
                      <div 
                        key={commune} 
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedCommune === commune 
                            ? 'border-[#FF6C00] bg-orange-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedCommune(selectedCommune === commune ? null : commune)}
                      >
                        <div className="font-semibold text-gray-900">{commune}</div>
                        <div className="text-xs text-gray-500 mt-1">{total} colis scannés</div>
                      </div>
                    );
                  })}
                  {relayPackages.size === 0 && homePackages.size === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">Aucune commune avec colis scannés</div>
                  )}
                </div>
              </div>
            </div>

            {/* Colonnes principales */}
            <div className="col-span-12 lg:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Colonne Livraison en Point Relais */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Livraison en Point Relais
                </h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {relayPackages.size === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucun colis en route vers un point relais</p>
                    </div>
                  ) : (
                    Array.from(relayPackages.entries()).map(([commune, relayMap]) => (
                      <div key={commune} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                        <h3 className="font-semibold text-purple-900 mb-3">{commune}</h3>
                        {Array.from(relayMap.entries()).map(([relayName, pkgs]) => {
                          const activePkgs = pkgs.filter(p => !scannedPackages.get(p.tracking_number)?.isDelivered);
                          if (activePkgs.length === 0) return null;
                          return (
                            <div key={relayName} className="mb-4 last:mb-0">
                              <h4 className="text-sm font-medium text-purple-700 mb-2">{relayName}</h4>
                              <div className="space-y-2">
                                {activePkgs.map((pkg) => (
                                  <div key={pkg.id || pkg.tracking_number} className="rounded-lg border border-purple-100 bg-white p-3 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-mono text-sm font-semibold text-[#FF6C00]">
                                        {pkg.shipment_code || pkg.tracking_number}
                                      </div>
                                      {pkg.shipment_code && (
                                        <div className="text-xs text-gray-400">{pkg.tracking_number}</div>
                                      )}
                                      <div className="text-xs text-gray-600 mt-0.5">
                                        {pkg.destination_relay_name || pkg.relay_name}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => { setIncidentPackage(pkg); setIncidentType(''); setIncidentDescription(''); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-colors flex-shrink-0"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      Incident
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Colonne Livraison à Domicile */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Livraison à Domicile
                </h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {homePackages.size === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucun colis à livrer à domicile</p>
                    </div>
                  ) : (
                    Array.from(homePackages.entries()).map(([commune, pkgs]) => {
                      const activePkgs = pkgs.filter(p => !scannedPackages.get(p.tracking_number)?.isDelivered);
                      if (activePkgs.length === 0) return null;
                      return (
                        <div key={commune} className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                          <h3 className="font-semibold text-blue-900 mb-3">{commune}</h3>
                          <div className="space-y-2">
                            {activePkgs.map((pkg) => {
                              const isDelivered = scannedPackages.get(pkg.tracking_number)?.isDelivered || false;
                              return (
                                <div key={pkg.id || pkg.tracking_number} className="bg-white rounded-lg border border-blue-100 p-3">
                                  <div className="mb-2">
                                    <div className="font-mono text-sm font-semibold text-[#FF6C00]">
                                      {pkg.shipment_code || pkg.tracking_number}
                                    </div>
                                    {pkg.shipment_code && (
                                      <div className="text-xs text-gray-400">{pkg.tracking_number}</div>
                                    )}
                                    <div className="text-xs font-medium text-gray-700 mt-0.5">
                                      {pkg.recipient_first_name} {pkg.recipient_last_name}
                                    </div>
                                    <div className="text-xs text-gray-500">{pkg.recipient_address}</div>
                                    {pkg.recipient_phone && (
                                      <a href={`tel:${pkg.recipient_phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" />
                                        {pkg.recipient_phone}
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => setDeliveryModalShipment(pkg)}
                                      disabled={isDelivered}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                        isDelivered
                                          ? 'bg-green-200 text-green-800 cursor-not-allowed opacity-60'
                                          : 'bg-[#FF6C00] hover:bg-orange-700 text-white'
                                      }`}
                                    >
                                      <Package className="w-3 h-3" />
                                      {isDelivered ? 'Livré' : 'Livrer'}
                                    </button>
                                    <button
                                      onClick={() => { setIncidentPackage(pkg); setIncidentType(''); setIncidentDescription(''); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-colors"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      Incident
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Carte interactive */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-[#FF6C00]" />
                Carte interactive - Optimisation de tournée
              </h2>
              {mapMarkers.length > 1 && (
                <button
                  onClick={() => {
                    if (!showRoute) {
                      // Activer l'itinéraire : collecter tous les waypoints depuis tourStops
                      // Trier par type : d'abord les points de ramassage, puis les points de livraison
                      const waypoints = tourStops
                        .filter(stop => stop.latitude && stop.longitude)
                        .sort((a, b) => {
                          // Ordre : ramassages d'abord (home_pickup, relay_pickup), livraisons ensuite
                          const order: Record<string, number> = { home_pickup: 0, relay_pickup: 1, relay_delivery: 2, home_delivery: 3 };
                          return order[a.type] - order[b.type];
                        })
                        .map(stop => [stop.latitude!, stop.longitude!] as [number, number]);
                      setRouteWaypoints(waypoints);
                    }
                    setShowRoute(!showRoute);
                  }}
                  className="px-4 py-2 bg-[#FF6C00] hover:bg-[#ff8534] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <MapIcon className="w-4 h-4" />
                  {showRoute ? 'Masquer l\'itinéraire' : 'Optimiser l\'itinéraire'}
                </button>
              )}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {Array.from(relayPackages.keys()).map((commune) => (
                <button
                  key={`relay-${commune}`}
                  onClick={() => setSelectedCommune(selectedCommune === commune ? null : commune)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCommune === commune
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {commune} (Relais)
                </button>
              ))}
              {Array.from(homePackages.keys()).map((commune) => (
                <button
                  key={`home-${commune}`}
                  onClick={() => setSelectedCommune(selectedCommune === commune ? null : commune)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCommune === commune
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {commune} (Domicile)
                </button>
              ))}
            </div>
            <div className="relative h-72 md:h-[26rem] w-full rounded-xl overflow-hidden border border-gray-200">
              {isMapReady ? (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  className="h-full w-full"
                  scrollWheelZoom
                >
                  <MapAutoCenter center={mapCenter} zoom={mapZoom} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributrices et contributeurs'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapMarkers.map((marker) => {
                    const stop = tourStops.find(s => s.id === marker.id);
                    return (
                    <Marker 
                      position={marker.position} 
                      key={marker.id}
                      icon={L.icon({
                        iconUrl: markerIcon,
                        iconRetinaUrl: markerIcon2x,
                        shadowUrl: markerShadow,
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                      })}
                    >
                      <Popup>
                          <div className="space-y-2 min-w-[200px]">
                            <div className="font-semibold text-sm">{stop?.name || marker.pkg.tracking_number}</div>
                          <div className="text-xs text-gray-600">
                              {stop?.type === 'home_pickup' && '🏠 Ramassage à domicile'}
                              {stop?.type === 'relay_pickup' && '📍 Point relais (ramassage)'}
                              {stop?.type === 'relay_delivery' && '📦 Point relais (livraison)'}
                              {stop?.type === 'home_delivery' && '🏠 Livraison à domicile'}
                              {!stop && (marker.type === 'home' ? '🏠 Livraison à domicile' : '📦 Point relais')}
                          </div>
                            <div className="text-xs text-gray-600">{stop?.address || marker.commune}</div>
                            <div className="text-xs text-gray-500">{stop?.commune || marker.commune}</div>
                            {stop && (
                              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                                {stop.packagesToPickup > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Package className="w-3 h-3 text-purple-600" />
                                    <span className="text-xs font-medium">{stop.packagesToPickup} à ramasser</span>
                          </div>
                                )}
                                {stop.packagesToDeliver > 0 && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    <span className="text-xs font-medium">{stop.packagesToDeliver} à livrer</span>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      </Popup>
                    </Marker>
                    );
                  })}
                  {showRoute && routeWaypoints.length > 1 && (
                    <RoutePolyline waypoints={routeWaypoints} />
                  )}
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                  Initialisation de la carte…
                </div>
              )}
              {isMapReady && mapMarkers.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-white/85 text-gray-500 text-sm text-center px-4">
                  <MapIcon className="w-12 h-12 mb-3 text-gray-300" />
                  <p>Aucun point de passage dans votre tournée. Les points de réception et de livraison apparaîtront ici.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section Colis traités */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mt-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Colis traités
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {(() => {
                const allDelivered = deliveredShipments.filter(pkg => {
                  const status = normalizeShipmentStatus(pkg.current_status);
                  return status === 'RELAY_FINAL_RECEIVED' ||
                    status === 'AVAILABLE_FOR_PICKUP' ||
                    status === 'DELIVERED' ||
                    status === 'DELIVERED_TO_CUSTOMER' ||
                    status === 'PICKED_UP_BY_CUSTOMER';
                });
                const scannedDelivered = Array.from(scannedPackages.values())
                  .filter(sp => sp.isDelivered)
                  .map(sp => sp.pkg);
                const allMap = new Map<string, TransporterPackage>();
                allDelivered.forEach(p => allMap.set(p.tracking_number, p));
                scannedDelivered.forEach(p => { if (!allMap.has(p.tracking_number)) allMap.set(p.tracking_number, p); });
                const pkgs = Array.from(allMap.values()).sort((a, b) =>
                  new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
                );

                if (pkgs.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucun colis traité</p>
                    </div>
                  );
                }

                // Grouper par commune → relais ou "Livraison à domicile"
                const byCommune = new Map<string, Map<string, TransporterPackage[]>>();
                pkgs.forEach(pkg => {
                  const commune = pkg.home_delivery
                    ? (pkg.recipient_commune || 'Commune inconnue')
                    : (pkg.destination_relay_commune || pkg.relay_commune || 'Commune inconnue');
                  const relay = pkg.home_delivery
                    ? 'Livraison à domicile'
                    : (pkg.destination_relay_name || pkg.relay_name || 'Point relais');
                  if (!byCommune.has(commune)) byCommune.set(commune, new Map());
                  const relayMap = byCommune.get(commune)!;
                  if (!relayMap.has(relay)) relayMap.set(relay, []);
                  relayMap.get(relay)!.push(pkg);
                });

                return (
                  <div className="space-y-4">
                    {Array.from(byCommune.entries()).map(([commune, relayMap]) => (
                      <div key={commune} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                        <h3 className="font-semibold text-green-900 mb-3">{commune}</h3>
                        {Array.from(relayMap.entries()).map(([relayName, relayPkgs]) => (
                          <div key={relayName} className="mb-4 last:mb-0">
                            <h4 className="text-sm font-medium text-green-700 mb-2">{relayName}</h4>
                            <div className="space-y-2">
                              {relayPkgs.map(pkg => (
                                <div key={pkg.id || pkg.tracking_number} className="rounded-lg border border-green-100 bg-white p-3 flex items-center gap-3">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-mono text-sm font-semibold text-[#FF6C00]">
                                      {pkg.shipment_code || pkg.tracking_number}
                                    </div>
                                    {pkg.shipment_code && (
                                      <div className="text-xs text-gray-400">{pkg.tracking_number}</div>
                                    )}
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      {pkg.recipient_first_name} {pkg.recipient_last_name}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </main>

        {/* Modal de confirmation ramassage à domicile */}
        {homePickupConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
               onClick={(e) => { if (e.target === e.currentTarget) setHomePickupConfirmModal(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
              {/* Header */}
              <div className="bg-pink-50 border-b border-pink-100 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Confirmer le ramassage</h2>
                  <p className="text-xs text-pink-600 mt-0.5">Ramassage à domicile</p>
                </div>
                <button onClick={() => setHomePickupConfirmModal(null)} className="p-1.5 hover:bg-pink-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              {/* Infos colis */}
              <div className="px-5 py-4 space-y-3">
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Code d'envoi</span>
                    <span className="font-mono font-bold text-[#FF6C00]">{homePickupConfirmModal.shipmentCode}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Expéditeur</span>
                    <span className="font-medium text-gray-800">
                      {homePickupConfirmModal.pkg.sender_first_name} {homePickupConfirmModal.pkg.sender_last_name}
                    </span>
                  </div>
                  {homePickupConfirmModal.pkg.sender_address && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Adresse</span>
                      <span className="font-medium text-gray-800 text-right max-w-[160px]">
                        {homePickupConfirmModal.pkg.sender_address}, {homePickupConfirmModal.pkg.sender_commune}
                      </span>
                    </div>
                  )}
                  {homePickupConfirmModal.pkg.destination_relay_name && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Livraison vers</span>
                      <span className="font-medium text-gray-800">{homePickupConfirmModal.pkg.destination_relay_name}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  En confirmant, vous attestez avoir physiquement récupéré ce colis chez l'expéditeur.
                </p>
              </div>
              {/* Actions */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setHomePickupConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  disabled={homePickupConfirmLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    setHomePickupConfirmLoading(true);
                    try {
                      const { error } = await api.confirmHomePickup(homePickupConfirmModal.pkg.tracking_number);
                      if (error) {
                        setFeedback({ type: 'error', message: error });
                        return;
                      }
                      // Mise à jour locale immédiate
                      setScannedPackages(prev => {
                        const next = new Map(prev);
                        const existing = next.get(homePickupConfirmModal.pkg.tracking_number);
                        next.set(homePickupConfirmModal.pkg.tracking_number, {
                          pkg: { ...homePickupConfirmModal.pkg, current_status: 'IN_TRANSIT' },
                          isPickedUp: true,
                          isDelivered: false,
                          isCalled: existing?.isCalled ?? false,
                          pickupCodeInput: existing?.pickupCodeInput ?? '',
                          incidentReported: existing?.incidentReported ?? false,
                        });
                        saveScannedPackages(next);
                        return next;
                      });
                      setFeedback({ type: 'success', message: 'Ramassage confirmé ! Le colis est maintenant en transit.' });
                      setHomePickupConfirmModal(null);
                      await loadTransporterData();
                    } catch (err: any) {
                      setFeedback({ type: 'error', message: err.message || 'Erreur lors de la confirmation du ramassage' });
                    } finally {
                      setHomePickupConfirmLoading(false);
                    }
                  }}
                  disabled={homePickupConfirmLoading}
                  className="flex-1 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
                >
                  {homePickupConfirmLoading ? 'Confirmation...' : 'Confirmer le ramassage'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Scanner */}
        {/* Delivery Modal */}
        {deliveryModalShipment && (
          <DeliveryModal
            shipment={deliveryModalShipment}
            onClose={() => setDeliveryModalShipment(null)}
            onSuccess={async () => {
              // Marquer le colis comme livré dans scannedPackages
              setScannedPackages(prev => {
                const newMap = new Map(prev);
                const scanned = newMap.get(deliveryModalShipment.tracking_number);
                if (scanned) {
                  newMap.set(deliveryModalShipment.tracking_number, {
                    ...scanned,
                    isDelivered: true,
                  });
                }
                saveScannedPackages(newMap);
                return newMap;
              });
              await loadTransporterData();
              await loadDeliveredShipments();
              setDeliveryModalShipment(null);
            }}
          />
        )}

        {/* Payment Confirmation Modal */}
        {paymentConfirmationShipment && (
          <PaymentConfirmationModal
            shipment={paymentConfirmationShipment}
            onClose={() => setPaymentConfirmationShipment(null)}
            onSuccess={handlePaymentConfirmed}
          />
        )}

        {/* Modal Code de retrait */}
        {showPickupCodeModal && currentPickupCodePackage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPickupCodeModal(false); setCurrentPickupCodePackage(null); setPickupCodeModalInput(''); setPickupVerificationInput(''); } }}
          >
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Code de retrait</h2>
                <button onClick={() => { setShowPickupCodeModal(false); setCurrentPickupCodePackage(null); setPickupCodeModalInput(''); setPickupVerificationInput(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    Colis : <strong className="font-mono">{currentPickupCodePackage.tracking_number}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">{currentPickupCodePackage.recipient_first_name} {currentPickupCodePackage.recipient_last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="pickup-code-input">
                    Entrez le code de retrait (6 chiffres)
                  </label>
                  <input
                    id="pickup-code-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pickupCodeModalInput}
                    onChange={(e) => setPickupCodeModalInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono text-center focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    autoFocus
                  />
                  <label className="block text-sm font-medium text-gray-700 mt-4 mb-2" htmlFor="pickup-verification-input">
                    Confirmer le numéro ou l&#39;email du destinataire
                  </label>
                  <input
                    id="pickup-verification-input"
                    type="text"
                    value={pickupVerificationInput}
                    onChange={(e) => setPickupVerificationInput(e.target.value)}
                    placeholder="Ex: 0700000000 ou client@example.com"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPickupCodeModalInput('');
                      setPickupVerificationInput('');
                      setShowPickupCodeModal(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePickupCodeModalValidation}
                    disabled={pickupCodeModalInput.length !== 6}
                    className="flex-1 px-4 py-2 bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Valider
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Incident */}
        {incidentPackage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
            onClick={(e) => { if (e.target === e.currentTarget) setIncidentPackage(null); }}
          >
            <div className="bg-white rounded-xl max-w-lg w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Incident — {incidentPackage.shipment_code || incidentPackage.tracking_number}
                </h2>
                <button onClick={() => setIncidentPackage(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select 
                    value={incidentType} 
                    onChange={(e) => setIncidentType(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="client_absent">Client absent</option>
                    <option value="adresse_erronee">Adresse erronée</option>
                    <option value="colis_endommage">Colis endommagé</option>
                    <option value="relais_ferme">Relais fermé</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={incidentDescription} 
                    onChange={(e) => setIncidentDescription(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                    rows={3} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">GPS: {navigator.geolocation ? 'capturé auto.' : 'Indisponible'}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIncidentPackage(null)}
                      disabled={incidentLoading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleIncident}
                      disabled={incidentLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {incidentLoading && <Loader className="w-3 h-3 animate-spin" />}
                      {incidentLoading ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
          <div className="text-center mb-8">
            <Logo size="lg" showText={true} className="mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Connexion Transporteur
            </h1>
            <p className="text-sm text-gray-600">
              Connectez-vous pour voir vos colis et vos zones
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email ou Téléphone
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com ou +225 XX XX XX XX XX"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-[#FF6C00] hover:bg-[#ff8534] text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading || authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TransporterLoginPage;

