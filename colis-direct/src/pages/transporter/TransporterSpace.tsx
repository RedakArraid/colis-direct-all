import { useState, useEffect, useCallback } from 'react';
import {
  Home, Truck, Wallet, User, Bell, Star, CheckCircle2, MapPin,
  ChevronLeft, ChevronRight, Phone, Camera, Settings, RefreshCw,
  Shield, CreditCard, LifeBuoy, LogOut, Package, Eye, Mail,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';

// ── Design System Tokens ──
const CD = {
  orange: '#FF6C00',
  orangeHover: '#E66100',
  orangeSoft: '#FFF3E8',
  orangeDeep: '#C24F00',
  ink: '#1A1A1A',
  ink2: '#3A3A3A',
  muted: '#6B7280',
  line: '#E6E6E6',
  bg: '#FFFFFF',
  bgSoft: '#F6F7F9',
  green: '#16A34A',
  greenSoft: '#E6F6EC',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  yellow: '#F5B400',
};

type Screen = 'dashboard' | 'available' | 'detail' | 'active' | 'proof' | 'earnings' | 'history' | 'profile' | 'personal_info' | 'documents' | 'payments' | 'notifications_settings' | 'support' | 'account_settings';
type Tab = 'home' | 'courses' | 'gains' | 'profile';

const fmt = (n: number | string | null | undefined) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
  return (Number.isFinite(v) ? v : 0).toLocaleString('fr-FR');
};

const initials = (first?: string, last?: string) =>
  `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || 'LV';

// ── Coordinates for Abidjan Communes ──
const COMMUNE_COORDS: Record<string, [number, number]> = {
  'cocody': [5.3780, -3.9822],
  'marcory': [5.3149, -3.9852],
  'koumassi': [5.3021, -3.9458],
  'yopougon': [5.3399, -4.0833],
  'treichville': [5.3089, -4.0135],
  'port-bouët': [5.2538, -3.9535],
  'port-bouet': [5.2538, -3.9535],
  'adjamé': [5.3571, -4.0204],
  'adjame': [5.3571, -4.0204],
  'abobo': [5.4190, -4.0180],
  'plateau': [5.3245, -4.0202],
  'bingerville': [5.3579, -3.8967],
  'anyama': [5.4939, -4.0518],
  'bouaké': [7.6897, -5.0264],
  'bouake': [7.6897, -5.0264],
};

const getCoords = (communeName?: string): [number, number] => {
  if (!communeName) return [5.3599, -4.0083];
  const clean = communeName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(COMMUNE_COORDS)) {
    if (clean.includes(key)) return coords;
  }
  return [5.3599, -4.0083];
};

const fromOf = (r: any) => r?.sender_commune || r?.origin_relay_commune || r?.relay_commune || '—';
const toOf = (r: any) => r?.recipient_commune || r?.destination_relay_commune || '—';

const isHomePickup = (r: any) => r?.pickup_method === 'home_pickup';

const pickupLabelOf = (r: any) => {
  if (isHomePickup(r)) {
    const parts = [r?.sender_address, r?.sender_quartier, r?.sender_commune].filter(Boolean);
    return parts.length ? parts.join(', ') : (r?.sender_commune || '—');
  }
  return r?.origin_relay_name || r?.origin_relay_address || fromOf(r);
};

const destLabelOf = (r: any) => {
  if (r?.home_delivery) {
    const parts = [r?.recipient_address, r?.recipient_quartier, r?.recipient_commune].filter(Boolean);
    return parts.length ? parts.join(', ') : (r?.recipient_commune || '—');
  }
  return r?.destination_relay_name || r?.destination_relay_address || toOf(r);
};

const pickupCoordsOf = (r: any): [number, number] => {
  if (r?.sender_latitude != null && r?.sender_longitude != null) {
    return [Number(r.sender_latitude), Number(r.sender_longitude)];
  }
  return getCoords(fromOf(r));
};

const destCoordsOf = (r: any): [number, number] => getCoords(toOf(r));

// ── Inject Custom Global Styles ──
const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const id = 'transporter-custom-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.innerHTML = `
    @keyframes pulse-orange {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 108, 0, 0.6); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 108, 0, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 108, 0, 0); }
    }
    @keyframes pulse-green {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
    }
    .pulse-marker-orange {
      animation: pulse-orange 2s infinite;
    }
    .pulse-marker-green {
      animation: pulse-green 2s infinite;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(230, 230, 230, 0.5);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }
    .glow-button {
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(255, 108, 0, 0.2);
    }
    .glow-button:hover {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 16px rgba(255, 108, 0, 0.35);
    }
    .glow-button:active {
      transform: translateY(0);
    }
    .tab-item {
      transition: all 0.2s ease;
    }
    .tab-item:hover {
      color: #FF6C00 !important;
    }

    /* ── RESPONSIVE DESKTOP LAYOUTS ── */
    @media (min-width: 769px) {
      .transporter-app-container {
        display: flex;
        min-height: 100vh;
        background: #F6F7F9;
        width: 100%;
      }
      .desktop-sidebar {
        display: flex !important;
        width: 260px;
        background: #0F0F0F;
        color: #fff;
        padding: 24px 20px;
        flex-direction: column;
        gap: 24px;
        flex-shrink: 0;
        border-right: 1px solid rgba(255,255,255,0.05);
        height: 100vh;
        position: sticky;
        top: 0;
      }
      .mobile-frame-container {
        width: 100% !important;
        max-width: 100% !important;
        box-shadow: none !important;
        background: transparent !important;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .main-content-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 32px 40px !important;
        background: #F6F7F9;
      }
      .mobile-tab-bar {
        display: none !important;
      }
      .mobile-top-bar {
        display: none !important;
      }
      .mobile-only-header {
        display: none !important;
      }
      .desktop-header {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 28px;
        border-bottom: 1px solid #E6E6E6;
        padding-bottom: 20px;
        color: #1A1A1A;
      }
      .desktop-dashboard-grid {
        display: grid !important;
        grid-template-columns: 1.6fr 1fr !important;
        gap: 24px;
        align-items: start;
      }
      .desktop-dashboard-right {
        display: flex !important;
        flex-direction: column;
        gap: 20px;
      }
      .desktop-stats-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 16px;
        margin-bottom: 28px;
      }
      .desktop-stats-grid-2 {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 16px;
        margin-bottom: 28px;
      }
      .desktop-settings-split {
        display: grid !important;
        grid-template-columns: 280px 1fr !important;
        gap: 32px;
        align-items: start;
      }
      .desktop-settings-sidebar {
        display: block !important;
        background: #fff;
        border-radius: 20px;
        border: 1px solid #E6E6E6;
        overflow: hidden;
      }
      .desktop-split-active {
        display: grid !important;
        grid-template-columns: 1.2fr 1fr !important;
        gap: 24px;
        align-items: start;
      }
      .desktop-active-left {
        order: 1;
        border-radius: 20px !important;
        border: 1px solid #E6E6E6 !important;
      }
      .desktop-active-right {
        order: 2;
        height: 450px !important;
        border-radius: 20px !important;
      }
    }
  `;
  document.head.appendChild(style);
};

// ───────────────────────── Atoms ─────────────────────────
function Pill({ children, bg = CD.orangeSoft, color = CD.orange }: any) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

function TabBar({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; Icon: any }[] = [
    { id: 'home', label: 'Accueil', Icon: Home },
    { id: 'courses', label: 'Courses', Icon: Truck },
    { id: 'gains', label: 'Gains', Icon: Wallet },
    { id: 'profile', label: 'Profil', Icon: User },
  ];
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        borderTop: `1px solid ${CD.line}`,
        padding: '8px 8px 14px',
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 100,
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <button
            key={id}
            onClick={() => onNav(id)}
            className="tab-item"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: on ? CD.orange : '#9CA3AF',
              flex: 1,
              outline: 'none',
            }}
          >
            <Icon size={21} strokeWidth={on ? 2.5 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ title, onBack, light, action }: any) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: light ? 'none' : `1px solid ${CD.line}`,
        background: light ? 'transparent' : '#fff',
        color: light ? '#fff' : CD.ink,
        zIndex: 50,
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: 0,
          display: 'flex',
          outline: 'none',
        }}
      >
        <ChevronLeft size={24} />
      </button>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>{title}</div>
      <div style={{ width: 24, display: 'flex', justifyContent: 'flex-end' }}>{action}</div>
    </div>
  );
}

// ── Interactive Premium Vector Map ──
function DynamicVectorMap({
  fromCommune,
  toCommune,
  MapComponents,
  fromPosition,
  toPosition,
}: {
  fromCommune: string;
  toCommune: string;
  MapComponents: any;
  fromPosition?: [number, number] | null;
  toPosition?: [number, number] | null;
}) {
  const p1 = fromPosition ?? getCoords(fromCommune);
  const p2 = toPosition ?? getCoords(toCommune);
  const center: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

  if (!MapComponents) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F7F9' }}>
        <RefreshCw size={24} className="animate-spin text-orange-600" />
      </div>
    );
  }

  const greenIcon = MapComponents.L.divIcon({
    className: 'custom-leaflet-icon-green',
    html: `
      <div class="pulse-marker-green" style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background: #16A34A;
        border: 2px solid #ffffff;
        border-radius: 50%;
        color: #ffffff;
      ">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  const orangeIcon = MapComponents.L.divIcon({
    className: 'custom-leaflet-icon-orange',
    html: `
      <div class="pulse-marker-orange" style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background: #FF6C00;
        border: 2px solid #ffffff;
        border-radius: 50%;
        color: #ffffff;
      ">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  return (
    <div style={{ height: '100%', width: '100%', zIndex: 1 }}>
      <MapComponents.MapContainer
        center={center}
        zoom={12}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <MapComponents.TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapComponents.Marker position={p1} icon={greenIcon} />
        <MapComponents.Marker position={p2} icon={orangeIcon} />
        <MapComponents.Polyline
          positions={[p1, p2]}
          color={CD.orange}
          weight={3.5}
          dashArray="6, 8"
        />
      </MapComponents.MapContainer>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  background: CD.orange,
  color: '#fff',
  border: 'none',
  padding: '14px',
  borderRadius: '14px',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  outline: 'none',
};

const btnOutline: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  color: CD.ink,
  border: `1.5px solid ${CD.line}`,
  padding: '14px',
  borderRadius: '14px',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  outline: 'none',
};

function Stat({ Icon, n, l }: { Icon: any; n: string; l: string }) {
  return (
    <div className="glass-card" style={{ borderRadius: 18, padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: CD.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={CD.orange} strokeWidth={2.2} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: CD.ink, letterSpacing: '-0.5px', marginTop: 4 }}>{n}</div>
      <div style={{ fontSize: 11, color: CD.muted, fontWeight: 600, lineHeight: 1.3 }}>{l}</div>
    </div>
  );
}

function RouteDots({ tall = false }: { tall?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6, flexShrink: 0 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: CD.green, border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)' }} />
      <span style={{ width: 2, height: tall ? 32 : 24, background: CD.line, margin: '2px 0' }} />
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: CD.orange, border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(255, 108, 0, 0.2)' }} />
    </div>
  );
}

// ───────────────────────── App ─────────────────────────
export default function TransporterSpace() {
  const { user, signIn, signOut, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [stats, setStats] = useState<{ today: number; week: number; month: number }>({ today: 0, week: 0, month: 0 });
  const [offers, setOffers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [delivered, setDelivered] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [MapComponents, setMapComponents] = useState<any>(null);

  // ── Local states for settings sub-screens ──
  const [orangeNumber, setOrangeNumber] = useState(() => {
    try {
      const saved = localStorage.getItem('cd_transporter_payouts');
      return saved ? JSON.parse(saved).orange || '' : '';
    } catch { return ''; }
  });
  const [waveNumber, setWaveNumber] = useState(() => {
    try {
      const saved = localStorage.getItem('cd_transporter_payouts');
      return saved ? JSON.parse(saved).wave || '' : '';
    } catch { return ''; }
  });
  const [defaultPayment, setDefaultPayment] = useState<'orange' | 'wave'>(() => {
    try {
      const saved = localStorage.getItem('cd_transporter_payouts');
      return saved ? JSON.parse(saved).default || 'orange' : 'orange';
    } catch { return 'orange'; }
  });

  const [smsNotifications, setSmsNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('cd_transporter_notifications');
      return saved ? JSON.parse(saved).sms !== false : true;
    } catch { return true; }
  });
  const [pushNotifications, setPushNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('cd_transporter_notifications');
      return saved ? JSON.parse(saved).push !== false : true;
    } catch { return true; }
  });
  const [emailNotifications, setEmailNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('cd_transporter_notifications');
      return saved ? JSON.parse(saved).email !== false : true;
    } catch { return true; }
  });

  // Support
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Account Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const savePayments = (orange: string, wave: string, def: 'orange' | 'wave') => {
    localStorage.setItem('cd_transporter_payouts', JSON.stringify({ orange, wave, default: def }));
    toast.success('Moyens de paiement mis à jour !');
  };

  const updateNotifications = (sms: boolean, push: boolean, email: boolean) => {
    localStorage.setItem('cd_transporter_notifications', JSON.stringify({ sms, push, email }));
  };

  const handleToggleSms = () => {
    setSmsNotifications(prev => {
      const next = !prev;
      updateNotifications(next, pushNotifications, emailNotifications);
      toast.success(`Alertes SMS ${next ? 'activées' : 'désactivées'}`);
      return next;
    });
  };

  const handleTogglePush = () => {
    setPushNotifications(prev => {
      const next = !prev;
      updateNotifications(smsNotifications, next, emailNotifications);
      toast.success(`Notifications push ${next ? 'activées' : 'désactivées'}`);
      return next;
    });
  };

  const handleToggleEmail = () => {
    setEmailNotifications(prev => {
      const next = !prev;
      updateNotifications(smsNotifications, pushNotifications, next);
      toast.success(`E-mails récapitulatifs ${next ? 'activés' : 'désactivés'}`);
      return next;
    });
  };

  const isTransporter = user?.role === 'transporter';

  const loadCore = useCallback(async () => {
    try {
      const [p, w, o, a] = await Promise.all([
        api.getTransporterProfile().catch(() => ({ data: null })),
        api.getTransporterWallet().catch(() => ({ data: null })),
        api.getMyOffers().catch(() => ({ data: [] })),
        api.getTransporterAssignments().catch(() => ({ data: [] })),
      ]);
      if (p?.data) setProfile(p.data);
      if (w?.data) {
        setWallet((w.data as any).wallet);
        setStats((w.data as any).stats || { today: 0, week: 0, month: 0 });
      }
      setOffers(Array.isArray(o?.data) ? o.data : []);
      setAssignments(Array.isArray(a?.data) ? a.data : []);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    injectStyles();
    if (isTransporter) loadCore();
  }, [isTransporter, loadCore]);

  // Rafraîchissement des offres (style push in-app) + position GPS pour le scoring dispatch
  useEffect(() => {
    if (!isTransporter || !isOnline) return;

    const pollOffers = window.setInterval(() => {
      api.getMyOffers().then(({ data }) => {
        if (!Array.isArray(data)) return;
        setOffers((prev) => {
          const prevIds = new Set(prev.map((o) => o.id));
          const added = data.filter((o: { id: string }) => !prevIds.has(o.id));
          if (added.length > 0 && pushNotifications) {
            toast.info(`🚀 ${added.length} nouvelle(s) course(s) disponible(s)`);
          }
          return data;
        });
      }).catch(() => {});
    }, 20_000);

    let geoWatch: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      geoWatch = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          api.updateMyLocation(latitude, longitude).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 }
      );
    }

    return () => {
      window.clearInterval(pollOffers);
      if (geoWatch != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatch);
      }
    };
  }, [isTransporter, isOnline, pushNotifications]);

  // Lazy load Leaflet dynamically
  useEffect(() => {
    let mounted = true;
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(async ([L, RL]) => {
      if (!mounted) return;
      const mk2x = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
      const mk = (await import('leaflet/dist/images/marker-icon.png')).default;
      const sh = (await import('leaflet/dist/images/marker-shadow.png')).default;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: mk2x, iconUrl: mk, shadowUrl: sh });
      setMapComponents({ L, ...RL });
    });
    return () => { mounted = false; };
  }, []);

  const activeRides = assignments.filter((a) => {
    const s = (a.current_status || '').toUpperCase();
    return !['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'].includes(s);
  });

  const goTab = (t: Tab) =>
    setScreen(t === 'home' ? 'dashboard' : t === 'courses' ? 'available' : t === 'gains' ? 'earnings' : 'profile');

  const acceptOffer = async (offer: any) => {
    setBusy(true);
    const { error } = await api.acceptOffer(offer.id);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success('Course acceptée avec succès !');
    await loadCore();
    setScreen('active');
  };

  const declineOffer = async (offer: any) => {
    setBusy(true);
    const { error } = await api.declineOffer(offer.id);
    setBusy(false);
    if (error) return toast.error(error);
    setOffers((o) => o.filter((x) => x.id !== offer.id));
    setScreen('available');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: CD.bgSoft, fontFamily: 'Inter, sans-serif' }}>
        <RefreshCw size={32} className="animate-spin" color={CD.orange} />
        <div style={{ fontSize: 14, fontWeight: 700, color: CD.muted }}>Chargement de l'espace...</div>
      </div>
    );
  }

  const ProfileMenu = ({ screen, setScreen, signOut, CD, profile, delivered, ini, name }: any) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Mobile only avatar badge header */}
        <div className="mobile-only-header" style={{ background: '#0F0F0F', color: '#fff', padding: '24px 20px 28px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6C00 0%, #FF8C33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, border: '3.5px solid rgba(255,255,255,0.15)' }}>{ini}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px' }}>{name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Star size={14} color="#FFC93C" fill="#FFC93C" />
                <span style={{ fontSize: 13, fontWeight: 800 }}>{profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>· {profile?.total_deliveries ?? delivered.length} livraisons</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <Pill bg="rgba(22,163,74,0.15)" color="#34D058">Livreur Certifié ✓</Pill>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Vehicle Badge */}
          <div className="glass-card" style={{ borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: `1.5px solid ${CD.line}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: CD.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={22} color={CD.orange} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink }}>{profile?.vehicle_type ? `Véhicule : ${profile.vehicle_type}` : 'Véhicule de livraison'}</div>
              <div style={{ fontSize: 12, color: CD.muted, marginTop: 2, fontWeight: 500 }}>{profile?.license_plate ? `Immatriculation : ${profile.license_plate}` : 'Agréé ColisDirect'}</div>
            </div>
            <Pill bg={CD.greenSoft} color={CD.green}>Actif</Pill>
          </div>

          {/* Menu list */}
          <div style={{ marginTop: 14 }}>
            {[
              { id: 'personal_info', Icon: User, l: 'Informations personnelles', go: () => setScreen('personal_info') },
              { id: 'documents', Icon: Shield, l: 'Documents & Vérifications', go: () => setScreen('documents') },
              { id: 'payments', Icon: CreditCard, l: 'Moyens de paiement', go: () => setScreen('payments') },
              { id: 'earnings', Icon: Wallet, l: 'Détails des transactions', go: () => setScreen('earnings') },
              { id: 'history', Icon: Eye, l: 'Historique des livraisons', go: () => setScreen('history') },
              { id: 'notifications_settings', Icon: Bell, l: 'Préférences notifications', go: () => setScreen('notifications_settings') },
              { id: 'support', Icon: LifeBuoy, l: 'Aide & Centre de support', go: () => setScreen('support') },
              { id: 'account_settings', Icon: Settings, l: 'Paramètres du compte', go: () => setScreen('account_settings') },
              { id: 'logout', Icon: LogOut, l: 'Se déconnecter', danger: true, go: () => signOut() },
            ].map((r) => {
              const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
              if (r.id === 'logout' && isDesktop) return null;
              const isSel = screen === r.id;
              return (
                <button
                  key={r.l}
                  onClick={r.go}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: isSel ? CD.orangeSoft : 'none',
                    borderRadius: isSel ? 10 : 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 10px',
                    borderBottom: `1px solid ${CD.line}`,
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <r.Icon size={18} color={r.danger ? CD.red : isSel ? CD.orange : CD.ink2} strokeWidth={2} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.danger ? CD.red : isSel ? CD.orange : CD.ink }}>{r.l}</span>
                  {!r.danger && <ChevronRight size={18} color={isSel ? CD.orange : CD.muted} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (screen === 'profile' && typeof window !== 'undefined' && window.innerWidth > 768) {
      setScreen('personal_info');
    }
  }, [screen]);

  const Shell = ({ children, tab, fullBleed }: { children: React.ReactNode; tab?: Tab; fullBleed?: boolean }) => {
    return (
      <div className="transporter-app-container">
        {/* Sidebar visible on desktop only */}
        <aside className="desktop-sidebar" style={{ display: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: CD.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 13 }}>CD</div>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: '0.5px' }}>COLISDIRECT</span>
          </div>
          <div style={{ fontSize: 12, color: CD.muted, textTransform: 'uppercase', letterSpacing: '1px', marginTop: -12, marginBottom: 12 }}>Espace livreur</div>
          
          {/* Status Toggle in Sidebar (Now at the top) */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                <span className={isOnline ? "pulse-marker-green" : ""} style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? CD.green : '#9CA3AF' }} />
                <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>
              <button
                onClick={() => setIsOnline(!isOnline)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: isOnline ? CD.orange : '#3A3A3A',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  justifyContent: isOnline ? 'flex-end' : 'flex-start',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div style={{ fontSize: 11, color: CD.muted, fontWeight: 600 }}>{isOnline ? 'Vous recevez les nouvelles courses' : 'Passez en ligne pour recevoir des offres'}</div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { id: 'dashboard', label: 'Tableau de bord', Icon: Home },
              { id: 'available', label: 'Courses disponibles', Icon: Truck },
              { id: 'active', label: 'Course en cours', Icon: MapPin },
              { id: 'history', label: 'Historique', Icon: Eye },
              { id: 'earnings', label: 'Mes gains', Icon: Wallet },
              { id: 'profile', label: 'Profil / Paramètres', Icon: User },
            ].map(({ id, label, Icon }) => {
              const active = screen === id || (id === 'profile' && ['personal_info', 'documents', 'payments', 'notifications_settings', 'support', 'account_settings'].includes(screen));
              return (
                <button
                  key={id}
                  onClick={() => setScreen(id as Screen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: active ? CD.orange : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? '0 4px 12px rgba(255,108,0,0.25)' : 'none',
                    outline: 'none',
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout Button in Sidebar (Now at the bottom) */}
          <button
            onClick={() => signOut()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'transparent',
              color: '#DC2626',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              transition: 'all 0.2s ease',
              outline: 'none',
              marginTop: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={18} strokeWidth={2} />
            <span>Se déconnecter</span>
          </button>
        </aside>

        {/* Mobile-first centered frame (transparent & full-width on desktop) */}
        <div className="mobile-frame-container" style={{ width: '100%', maxWidth: 480, background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,0,0,0.05)', fontFamily: 'Inter, sans-serif', color: CD.ink }}>
          
          {/* Main Content Area */}
          <div className="main-content-scroll" style={{ flex: 1, overflow: fullBleed ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Desktop Header (visible on desktop only) */}
            <div className="desktop-header" style={{ display: 'none' }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: CD.ink }}>
                  {screen === 'dashboard' ? `Bonjour, ${name} 👋` :
                   screen === 'available' ? 'Courses disponibles' :
                   screen === 'active' ? 'Course en cours' :
                   screen === 'history' ? 'Historique des livraisons' :
                   screen === 'earnings' ? 'Mes gains' : 'Profil & Paramètres'}
                </h1>
                <div style={{ fontSize: 13, color: CD.muted, fontWeight: 600, marginTop: 4 }}>
                  {screen === 'dashboard' ? 'Voici votre activité du jour' :
                   screen === 'available' ? 'Trouvez et acceptez de nouvelles livraisons' :
                   screen === 'active' ? 'Suivez l\'itinéraire et validez la livraison' :
                   screen === 'history' ? 'Consultez vos courses complétées' :
                   screen === 'earnings' ? 'Gérez vos revenus et vos demandes de retrait' : 'Gérez vos informations et préférences'}
                </div>
              </div>

              {/* Notification bell and Profil summary in header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setScreen('available')}>
                  <Bell size={20} color={CD.ink} />
                  {offers.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: CD.orange }} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6C00 0%, #FF8C33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>{ini}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink }}>{name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Star size={11} color="#FFC93C" fill="#FFC93C" />
                      <span style={{ fontSize: 11, fontWeight: 800, color: CD.ink2 }}>{profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {children}
          </div>
          {tab && <div className="mobile-tab-bar"><TabBar active={tab} onNav={goTab} /></div>}
        </div>
      </div>
    );
  };

  const SettingsLayout = ({ title, children, activeScreen }: { title: string; children: React.ReactNode; activeScreen: Screen }) => {
    return (
      <Shell>
        <div className="desktop-settings-split" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Left sidebar menu - visible only on desktop */}
          <div className="desktop-settings-sidebar" style={{ display: 'none' }}>
            <ProfileMenu screen={activeScreen} setScreen={setScreen} signOut={signOut} CD={CD} profile={profile} delivered={delivered} ini={ini} name={name} />
          </div>
          
          {/* Right panel (actual setting form) */}
          <div style={{ flex: 1 }}>
            <div className="mobile-top-bar">
              <TopBar title={title} onBack={() => setScreen('profile')} action={<span />} />
            </div>
            {children}
          </div>
        </div>
      </Shell>
    );
  };

  if (!isTransporter) {
    return <CourierLogin signIn={signIn} />;
  }

  const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.first_name || 'Livreur' : (user?.first_name || 'Livreur');
  const ini = initials(profile?.first_name || user?.first_name, profile?.last_name || user?.last_name);
  const balance = wallet ? Number(wallet.balance_fcfa || 0) : 0;

  // ─────────────── 1. DASHBOARD ───────────────
  if (screen === 'dashboard') {
    return (
      <Shell tab="home">
        {/* Sleek Dark Header (Mobile only) */}
        <div className="mobile-only-header" style={{ background: '#0F0F0F', color: '#fff', padding: '24px 20px 28px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6C00 0%, #FF8C33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, border: '2px solid rgba(255,255,255,0.2)' }}>{ini}</div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Bonjour 👋</div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.3px' }}>{name}</div>
              </div>
            </div>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setScreen('available')}>
              <Bell size={24} color="#fff" />
              {offers.length > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: CD.orange, border: '2px solid #0F0F0F' }} />}
            </div>
          </div>

          {/* Elegant Status Switch */}
          <div style={{ marginTop: 22, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={isOnline ? "pulse-marker-green" : ""} style={{ width: 10, height: 10, borderRadius: '50%', background: isOnline ? '#16A34A' : '#9CA3AF' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{isOnline ? 'En ligne' : 'Hors ligne'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{isOnline ? 'Vous êtes prêt à recevoir des courses' : 'Passez en ligne pour recevoir des offres'}</div>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              style={{
                width: 46,
                height: 26,
                borderRadius: 13,
                background: isOnline ? CD.orange : '#3A3A3A',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                justifyContent: isOnline ? 'flex-end' : 'flex-start',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        </div>

        {/* Deliverer Statistics */}
        <div style={{ padding: '20px 0' }}>
          <div className="desktop-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Stat Icon={Truck} n={String(activeRides.length + delivered.length || activeRides.length)} l="Courses en cours" />
            <Stat Icon={Wallet} n={fmt(stats.today)} l="Gains aujourd'hui" />
            <Stat Icon={Star} n={profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'} l="Note générale" />
            <Stat Icon={CheckCircle2} n={profile?.success_rate ? `${profile.success_rate}%` : '100%'} l="Taux de réussite" />
          </div>

          {/* Main content split (single column on mobile, grid on desktop) */}
          <div className="desktop-dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Left/Main Column: Available Gigs */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: CD.ink, letterSpacing: '-0.3px' }}>Nouvelles offres ({offers.length})</div>
                <button onClick={() => setScreen('available')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: CD.orange, fontWeight: 700, outline: 'none' }}>Voir tout</button>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {offers.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', gap: 10 }}>
                    <Package size={36} color="#D1D5DB" />
                    <div style={{ color: CD.muted, fontSize: 13, fontWeight: 500 }}>Recherche de courses disponibles...</div>
                  </div>
                ) : (
                  offers.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { setSelected(o); setScreen('detail'); }}
                      className="glass-card"
                      style={{
                        textAlign: 'left',
                        borderRadius: 18,
                        padding: 16,
                        cursor: 'pointer',
                        outline: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        width: '100%',
                        border: `1.5px solid ${CD.line}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                          <RouteDots />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{fromOf(o)}</div>
                            <div style={{ fontSize: 11, color: CD.muted, margin: '4px 0', fontWeight: 600 }}>{o.package_type || 'Colis'} · {o.weight || '?'} kg</div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{toOf(o)}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: CD.orange }}>{fmt(o.net_earnings_fcfa || o.price)}</div>
                          <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700 }}>FCFA</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Column (only shown on desktop) */}
            <div className="desktop-dashboard-right" style={{ display: 'none', flexDirection: 'column', gap: 20 }}>
              
              {/* Weekly Earnings Card */}
              <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: `1.5px solid ${CD.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600 }}>Revenus de la semaine</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: CD.ink, marginTop: 2 }}>{fmt(stats.week)} FCFA</div>
                  </div>
                  <button className="glow-button" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, border: 'none', background: CD.orange, color: '#fff', fontWeight: 700, cursor: 'pointer', outline: 'none' }} onClick={() => withdraw(balance, loadCore, setBusy)}>
                    Retirer
                  </button>
                </div>
                {/* CSS Bar Chart */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingTop: 10 }}>
                  {[
                    { d: 'Lun', val: 0.4 },
                    { d: 'Mar', val: 0.6 },
                    { d: 'Mer', val: 0.8 },
                    { d: 'Jeu', val: 0.5 },
                    { d: 'Ven', val: 0.9 },
                    { d: 'Sam', val: 0.7 },
                    { d: 'Dim', val: 0.3 }
                  ].map((x, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 6 }}>
                      <div style={{ width: 14, height: 60 * x.val, background: CD.orange, borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 10, color: CD.muted, fontWeight: 700 }}>{x.d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Ride Tour Card */}
              {activeRides[0] && (
                <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: `1.5px solid ${CD.line}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink }}>Course active</div>
                    <span className="badge badge-orange" style={{ background: CD.orangeSoft, color: CD.orange, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>En route</span>
                  </div>
                  <div style={{ height: 120, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                    <DynamicVectorMap fromCommune={fromOf(activeRides[0])} toCommune={toOf(activeRides[0])} MapComponents={MapComponents} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{activeRides[0].recipient_first_name} {activeRides[0].recipient_last_name}</div>
                      <div style={{ fontSize: 11, color: CD.muted, fontWeight: 600 }}>{toOf(activeRides[0])}</div>
                    </div>
                    <button className="glow-button" style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: 'none', background: CD.orange, color: '#fff', fontWeight: 700, cursor: 'pointer', outline: 'none' }} onClick={() => setScreen('active')}>
                      Suivre
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Deliveries */}
              <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: `1.5px solid ${CD.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink }}>Courses récentes</div>
                  <button onClick={() => setScreen('history')} style={{ background: 'none', border: 'none', fontSize: 11, color: CD.orange, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>Voir tout</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {delivered.slice(0, 3).map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: CD.ink, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{fromOf(it)} → {toOf(it)}</div>
                        <div style={{ fontSize: 10, color: CD.muted, marginTop: 2 }}>{it.tracking_number}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: CD.green, marginLeft: 10 }}>+{fmt(it.price)} F</div>
                    </div>
                  ))}
                  {delivered.length === 0 && (
                    <div style={{ fontSize: 11, color: CD.muted, textAlign: 'center', padding: '10px 0' }}>Aucune course complétée</div>
                  )}
                </div>
              </div>

            </div>
            
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────────── 2. COURSES DISPONIBLES ───────────────
  if (screen === 'available') {
    return (
      <Shell tab="courses">
        <TopBar title="Offres disponibles" onBack={() => setScreen('dashboard')} action={<RefreshCw size={18} color={CD.ink} onClick={loadCore} style={{ cursor: 'pointer' }} />} />
        <div style={{ display: 'flex', gap: 8, padding: '14px 16px', overflowX: 'auto' }}>
          {['Toutes', 'Proches de moi', 'Express', 'Mieux payées'].map((c, i) => (
            <span
              key={c}
              style={{
                background: i === 0 ? CD.orange : CD.bgSoft,
                color: i === 0 ? '#fff' : CD.ink2,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: i === 0 ? '0 4px 10px rgba(255,108,0,0.2)' : 'none',
              }}
            >
              {c}
            </span>
          ))}
        </div>
        <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {offers.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 12 }}>
              <Truck size={42} color="#D1D5DB" />
              <div style={{ color: CD.muted, fontSize: 14, fontWeight: 600 }}>Aucune course disponible en ce moment</div>
            </div>
          ) : (
            offers.map((r) => (
              <div key={r.id} className="glass-card" style={{ borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <RouteDots tall />
                    <div>
                      {isHomePickup(r) && (
                        <span style={{ display: 'inline-block', marginBottom: 6, fontSize: 10, fontWeight: 800, color: CD.orange, background: CD.orangeSoft, padding: '3px 8px', borderRadius: 999 }}>
                          Ramassage à domicile
                        </span>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 15, color: CD.ink }}>{pickupLabelOf(r)}</div>
                      <div style={{ fontSize: 11, color: CD.muted, margin: '6px 0', fontWeight: 600 }}>
                        {r.package_type || 'Colis'} · {r.weight || '?'} kg
                        {r.distance_km != null ? ` · ~${r.distance_km} km` : ''}
                        {r.parallel_offers_count > 1 ? ` · ${r.parallel_offers_count} livreurs contactés` : ''}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: CD.ink }}>{destLabelOf(r)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: CD.orange }}>{fmt(r.net_earnings_fcfa || r.price)}</div>
                    <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700 }}>FCFA net</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, paddingTop: 14, borderTop: `1px solid ${CD.line}` }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: CD.muted, fontWeight: 600 }}>
                    <MapPin size={14} color={CD.orange} /> {isHomePickup(r) ? pickupLabelOf(r) : toOf(r)}
                  </span>
                  <button
                    onClick={() => { setSelected(r); setScreen('detail'); }}
                    className="glow-button"
                    style={{
                      marginLeft: 'auto',
                      background: CD.orange,
                      color: '#fff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    Détails
                  </button>
                </div>
              </div>
            )))}
        </div>
      </Shell>
    );
  }

  // ─────────────── 3. DÉTAIL COURSE (WITH LIVE MAP) ───────────────
  if (screen === 'detail' && selected) {
    const r = selected;
    return (
      <Shell>
        <div style={{ position: 'relative', height: 260 }}>
          <DynamicVectorMap
            fromCommune={fromOf(r)}
            toCommune={toOf(r)}
            fromPosition={isHomePickup(r) ? pickupCoordsOf(r) : null}
            toPosition={r.home_delivery ? destCoordsOf(r) : null}
            MapComponents={MapComponents}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <TopBar title="" light onBack={() => setScreen('available')} action={<span />} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', marginTop: -24, background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', padding: '20px 20px 28px', zIndex: 5, boxShadow: '0 -8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: CD.line, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill bg="rgba(255,108,0,0.1)" color={CD.orange}>Détails de l'offre</Pill>
            <div style={{ fontSize: 24, fontWeight: 900, color: CD.orange }}>{fmt(r.net_earnings_fcfa || r.price)} <span style={{ fontSize: 13, color: CD.muted, fontWeight: 700 }}>FCFA</span></div>
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: CD.green, border: '2.5px solid #fff', boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)' }} />
              <span style={{ width: 2, flex: 1, background: CD.line, minHeight: 48 }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: CD.orange, border: '2.5px solid #fff', boxShadow: '0 0 0 2px rgba(255, 108, 0, 0.2)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ paddingBottom: 20 }}>
                <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isHomePickup(r) ? 'RAMASSAGE DOMICILE' : 'ENLÈVEMENT'}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: CD.ink, marginTop: 2 }}>{pickupLabelOf(r)}</div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 500, marginTop: 2 }}>
                  {`${r.sender_first_name || ''} ${r.sender_last_name || ''}`.trim()}
                  {r.sender_phone ? ` · ${r.sender_phone}` : ''}
                </div>
                {isHomePickup(r) && r.sender_latitude != null && (
                  <div style={{ fontSize: 11, color: CD.green, fontWeight: 600, marginTop: 4 }}>📍 Position GPS client disponible</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESTINATION</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: CD.ink, marginTop: 2 }}>{destLabelOf(r)}</div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 500, marginTop: 2 }}>
                  {`${r.recipient_first_name || ''} ${r.recipient_last_name || ''}`.trim()}
                  {r.recipient_phone ? ` · ${r.recipient_phone}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, background: CD.bgSoft, borderRadius: 16, padding: '16px', display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: CD.muted, fontWeight: 600 }}>Poids</div><div style={{ fontSize: 14, fontWeight: 800, color: CD.ink, marginTop: 3 }}>{r.weight || '?'} kg</div></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: CD.muted, fontWeight: 600 }}>Taille</div><div style={{ fontSize: 14, fontWeight: 800, color: CD.ink, marginTop: 3 }}>{r.package_type || 'Colis'}</div></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: CD.muted, fontWeight: 600 }}>N° Suivi</div><div style={{ fontSize: 13, fontWeight: 800, color: CD.ink, marginTop: 3 }}>{r.tracking_number || '—'}</div></div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
            <button disabled={busy} style={btnOutline} onClick={() => declineOffer(r)}>Refuser</button>
            <button disabled={busy} className="glow-button" style={btnPrimary} onClick={() => acceptOffer(r)}>{busy ? <RefreshCw size={18} className="animate-spin margin-auto" /> : 'Accepter la course'}</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────────── 4. COURSE EN COURS (WITH MAP) ───────────────
  if (screen === 'active') {
    const ride = activeRides[0];
    if (!ride) {
      return (
        <Shell tab="courses">
          <TopBar title="Course active" onBack={() => setScreen('available')} action={<span />} />
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: CD.muted }}>
            <Truck size={42} />
            <div style={{ fontWeight: 600, textAlign: 'center' }}>Aucune course active pour le moment.</div>
          </div>
        </Shell>
      );
    }
    return (
      <Shell fullBleed>
        <div className="desktop-split-active" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Active Ride map (Right column on desktop, Top section on mobile) */}
          <div className="desktop-active-right" style={{ height: '45vh', width: '100%', position: 'relative' }}>
            <DynamicVectorMap fromCommune={fromOf(ride)} toCommune={toOf(ride)} MapComponents={MapComponents} />
            
            {/* HUD Status Bar overlay (visible on mobile only) */}
            <div className="mobile-only-header" style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
              <div style={{ background: '#0F0F0F', color: '#fff', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,108,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} color={CD.orange} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>En route vers la livraison</div>
                  <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 500, marginTop: 1 }}>N° {ride.tracking_number}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery destination card (Left column on desktop, Bottom card on mobile) */}
          <div className="desktop-active-left" style={{ background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Trip status header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: CD.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} color={CD.orange} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: CD.ink }}>En route vers la livraison</div>
                  <div style={{ fontSize: 11, color: CD.muted, fontWeight: 600, marginTop: 2 }}>Arrivée estimée · 11 min · 3.4 km restants</div>
                </div>
              </div>
              <span className="badge badge-orange" style={{ background: CD.orangeSoft, color: CD.orange, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>En cours</span>
            </div>

            {/* Recipient profile information */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6C00 0%, #FF8C33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 15 }}>{initials(ride.recipient_first_name, ride.recipient_last_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: CD.ink }}>{`${ride.recipient_first_name || ''} ${ride.recipient_last_name || ''}`.trim() || 'Destinataire'}</div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600 }}>Destinataire · {ride.recipient_phone || '—'}</div>
              </div>
              <a href={`tel:${ride.recipient_phone || ''}`} style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${CD.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <Phone size={20} color={CD.ink} />
              </a>
            </div>

            {/* Itinerary Timeline */}
            <div className="glass-card" style={{ borderRadius: 18, padding: 16, border: `1.5px solid ${CD.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: CD.ink, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Itinéraire</div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: CD.green, border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)' }} />
                  <span style={{ width: 2, height: 40, background: CD.line, margin: '2px 0' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: CD.orange, border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(255, 108, 0, 0.2)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, color: CD.muted, fontWeight: 700, textTransform: 'uppercase' }}>RÉCUPÉRATION</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink, marginTop: 2 }}>{fromOf(ride)}</div>
                    <div style={{ fontSize: 11, color: CD.green, fontWeight: 600, marginTop: 2 }}>✓ Colis récupéré</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: CD.muted, fontWeight: 700, textTransform: 'uppercase' }}>LIVRAISON</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink, marginTop: 2 }}>{ride.recipient_address || toOf(ride)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Package details & payment summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="glass-card" style={{ borderRadius: 14, padding: '12px 16px', border: `1.5px solid ${CD.line}` }}>
                <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700 }}>MONTANT</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: CD.orange, marginTop: 4 }}>{fmt(ride.price)} FCFA</div>
              </div>
              <div className="glass-card" style={{ borderRadius: 14, padding: '12px 16px', border: `1.5px solid ${CD.line}` }}>
                <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700 }}>TYPE</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: CD.ink, marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{ride.package_type || 'Colis'} · {ride.weight || '?'} kg</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <button
                onClick={() => {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.recipient_address || toOf(ride))}`, '_blank');
                  toast.info("Ouverture du GPS...");
                }}
                className="glow-button"
                style={{
                  ...btnOutline,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px',
                  fontSize: 15,
                }}
              >
                Ouvrir le GPS
              </button>

              <button
                onClick={() => { setSelected(ride); setScreen('proof'); }}
                className="glow-button"
                style={{
                  ...btnPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '16px',
                  fontSize: 16,
                }}
              >
                Confirmer la livraison <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────────── 5. PREUVE DE LIVRAISON ───────────────
  if (screen === 'proof' && selected) {
    return (
      <ProofScreen
        ride={selected}
        onBack={() => setScreen('active')}
        onDone={async () => {
          await loadCore();
          setScreen('history');
          api.getDeliveredShipmentsForTransporter().then((r) => setDelivered(r.data || []));
        }}
      />
    );
  }

  // ─────────────── 6. GAINS & PORTEFEUILLE ───────────────
  if (screen === 'earnings') {
    return (
      <Shell tab="gains">
        {/* Wallet balance header */}
        <div style={{ background: 'linear-gradient(135deg, #111 0%, #222 100%)', color: '#fff', padding: '24px 20px 32px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Gains cette semaine</div>
          <div style={{ fontSize: 38, fontWeight: 900, marginTop: 4, letterSpacing: '-0.5px' }}>{fmt(stats.week)} <span style={{ fontSize: 18, color: CD.orange, fontWeight: 800 }}>FCFA</span></div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, fontSize: 12, alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            <RefreshCw size={14} className="animate-spin" color={CD.orange} />
            <span>Aujourd'hui : {fmt(stats.today)} FCFA</span>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="desktop-stats-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Stat Icon={Truck} n={String(delivered.length || activeRides.length)} l="Courses accomplies" />
            <Stat Icon={Wallet} n={fmt(stats.month)} l="Gains du mois (FCFA)" />
          </div>

          {/* Cashout box */}
          <div className="glass-card" style={{ marginTop: 16, borderRadius: 20, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600 }}>Solde retirable</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: CD.ink, marginTop: 2 }}>{fmt(balance)} FCFA</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: CD.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={20} color={CD.orange} />
              </div>
            </div>
            <button
              className="glow-button"
              style={{ ...btnPrimary, marginTop: 16 }}
              onClick={() => withdraw(balance, loadCore, setBusy)}
            >
              Demander un retrait
            </button>
            <div style={{ fontSize: 11, color: CD.muted, textAlign: 'center', marginTop: 10, fontWeight: 600 }}>Virement Orange/Wave sous 24h · Minimum 5 000 FCFA</div>
          </div>

          {/* Transactions list */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: CD.ink }}>Historique des transactions</div>
            <button
              onClick={() => api.getWalletTransactions().then((r) => setTxns(r.data?.data || []))}
              style={{ background: 'none', border: 'none', color: CD.orange, fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}
            >
              Charger
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {txns.length === 0 ? (
              <div style={{ color: CD.muted, fontSize: 12, textAlign: 'center', padding: '24px 0', fontWeight: 600 }}>Cliquez sur "Charger" pour afficher l'historique</div>
            ) : (
              txns.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${CD.line}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink }}>{t.type === 'commission_earned' ? 'Course effectuée' : t.type === 'withdrawal' ? 'Demande de retrait' : t.type}</div>
                    {t.tracking_number && <div style={{ fontSize: 11, color: CD.muted, marginTop: 2, fontWeight: 500 }}>Suivi : {t.tracking_number}</div>}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: t.type === 'withdrawal' ? CD.red : CD.green }}>
                    {t.type === 'withdrawal' ? '-' : '+'}{fmt(t.amount_fcfa)} F
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────────── 7. HISTORIQUE DES COURSES ───────────────
  if (screen === 'history') {
    return (
      <Shell tab="courses">
        <TopBar title="Historique des livraisons" onBack={() => setScreen('available')} action={<RefreshCw size={18} color={CD.ink} style={{ cursor: 'pointer' }} onClick={() => api.getDeliveredShipmentsForTransporter().then((r) => setDelivered(r.data || []))} />} />
        <div style={{ padding: 16 }}>
          {delivered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 12 }}>
              <Package size={40} color="#D1D5DB" />
              <div style={{ color: CD.muted, fontSize: 13, fontWeight: 600 }}>Aucune livraison archivée.</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {delivered.map((it, i) => {
              const cancelled = (it.current_status || '').toUpperCase() === 'CANCELLED';
              return (
                <div key={i} className="glass-card" style={{ borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cancelled ? CD.redSoft : CD.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {cancelled ? <Package size={18} color={CD.red} /> : <CheckCircle2 size={18} color={CD.green} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{fromOf(it)} → {toOf(it)}</div>
                    <div style={{ fontSize: 12, color: CD.muted, marginTop: 3, fontWeight: 600 }}>{it.tracking_number} · <span style={{ color: cancelled ? CD.red : CD.green }}>{cancelled ? 'Annulé' : 'Livré'}</span></div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14, color: CD.ink }}>{fmt(it.price)}</div>
                    <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700 }}>FCFA</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────────── 7.1 INFORMATIONS PERSONNELLES ───────────────
  if (screen === 'personal_info') {
    return (
      <SettingsLayout title="Informations personnelles" activeScreen="personal_info">
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRÉNOM</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CD.ink, marginTop: 4 }}>{profile?.first_name || user?.first_name || 'Aboubacar'}</div>
            </div>
            <div style={{ borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NOM</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CD.ink, marginTop: 4 }}>{profile?.last_name || user?.last_name || 'Koné'}</div>
            </div>
            <div style={{ borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TÉLÉPHONE</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CD.ink, marginTop: 4 }}>{profile?.phone || user?.phone || '+225 07 00 00 00 00'}</div>
            </div>
            <div style={{ borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EMAIL</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CD.ink, marginTop: 4 }}>{profile?.email || user?.email || 'a.kone@email.com'}</div>
            </div>
            <div style={{ borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VILLE</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CD.ink, marginTop: 4 }}>{profile?.city || 'Abidjan'}</div>
            </div>
            <div style={{ borderBottom: `1px solid ${CD.line}`, paddingBottom: 14 }}>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ZONE D'ACTIVITÉ</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CD.ink, marginTop: 4 }}>{profile?.service_zone || 'Cocody · Plateau · Marcory'}</div>
            </div>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // ─────────────── 7.2 DOCUMENTS & VÉRIFICATIONS ───────────────
  if (screen === 'documents') {
    return (
      <SettingsLayout title="Documents & Vérifications" activeScreen="documents">
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1.5px solid ${CD.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={CD.green} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Pièce d'identité (CNI)</span>
              </div>
              <Pill bg={CD.greenSoft} color={CD.green}>Validé</Pill>
            </div>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1.5px solid ${CD.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={CD.green} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Permis de conduire</span>
              </div>
              <Pill bg={CD.greenSoft} color={CD.green}>Validé</Pill>
            </div>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1.5px solid ${CD.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={CD.green} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Carte grise du véhicule</span>
              </div>
              <Pill bg={CD.greenSoft} color={CD.green}>Validé</Pill>
            </div>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1.5px solid ${CD.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Camera size={20} color={CD.orange} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Photo de profil</span>
              </div>
              <button style={{ border: 'none', background: CD.orangeSoft, color: CD.orange, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Téléverser</button>
            </div>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // Helper Switch UI Component
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => {
    return (
      <button
        onClick={onChange}
        style={{
          width: 48,
          height: 26,
          borderRadius: 13,
          background: checked ? CD.orange : '#D1D5DB',
          border: 'none',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 0.25s ease',
          padding: 0,
          outline: 'none',
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 25 : 3,
            transition: 'left 0.25s cubic-bezier(0.2, 0.85, 0.32, 1.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        />
      </button>
    );
  };

  // ─────────────── 7.3 MOYENS DE PAIEMENT ───────────────
  if (screen === 'payments') {
    return (
      <SettingsLayout title="Moyens de paiement" activeScreen="payments">
        <div style={{ padding: '20px' }}>
          <div className="glass-card" style={{ borderRadius: 20, padding: 20, marginBottom: 20, border: `1.5px solid ${CD.line}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: CD.ink, marginBottom: 6 }}>Modes de retrait mobile</div>
            <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600, marginBottom: 16 }}>Configurez vos numéros pour recevoir vos gains instantanément.</div>
            
            {/* Orange Money */}
            <div style={{ border: `1.5px solid ${defaultPayment === 'orange' ? CD.orange : CD.line}`, borderRadius: 14, padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10, background: defaultPayment === 'orange' ? CD.orangeSoft : 'transparent', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FF6600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 13 }}>OM</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink }}>Orange Money Côte d'Ivoire</div>
                </div>
                <input
                  type="radio"
                  name="default_payment"
                  checked={defaultPayment === 'orange'}
                  onChange={() => setDefaultPayment('orange')}
                  style={{ accentColor: CD.orange, width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
              <input
                value={orangeNumber}
                onChange={(e) => setOrangeNumber(e.target.value.replace(/\s/g, ''))}
                placeholder="Ex: 0707070707"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${CD.line}`, borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none' }}
              />
            </div>

            {/* Wave */}
            <div style={{ border: `1.5px solid ${defaultPayment === 'wave' ? '#1D4ED8' : CD.line}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: defaultPayment === 'wave' ? 'rgba(29, 78, 216, 0.05)' : 'transparent', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 13 }}>W</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink }}>Wave Côte d'Ivoire</div>
                </div>
                <input
                  type="radio"
                  name="default_payment"
                  checked={defaultPayment === 'wave'}
                  onChange={() => setDefaultPayment('wave')}
                  style={{ accentColor: '#1D4ED8', width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
              <input
                value={waveNumber}
                onChange={(e) => setWaveNumber(e.target.value.replace(/\s/g, ''))}
                placeholder="Ex: 0505050505"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${CD.line}`, borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none' }}
              />
            </div>
          </div>

          <button
            className="glow-button"
            style={btnPrimary}
            onClick={() => savePayments(orangeNumber, waveNumber, defaultPayment)}
          >
            Enregistrer les modifications
          </button>
        </div>
      </SettingsLayout>
    );
  }

  // ─────────────── 7.4 PREFERENCES NOTIFICATIONS ───────────────
  if (screen === 'notifications_settings') {
    return (
      <SettingsLayout title="Préférences notifications" activeScreen="notifications_settings">
        <div style={{ padding: '20px' }}>
          <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: `1.5px solid ${CD.line}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: CD.ink, marginBottom: 4 }}>Canaux de notification</div>
            <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600, marginBottom: 20 }}>Sélectionnez comment vous souhaitez être notifié.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* SMS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink }}>Alertes SMS</div>
                  <div style={{ fontSize: 11, color: CD.muted, marginTop: 2, fontWeight: 500 }}>Nouvelles courses disponibles dans ma zone</div>
                </div>
                <ToggleSwitch checked={smsNotifications} onChange={handleToggleSms} />
              </div>

              <div style={{ height: 1, background: CD.line }} />

              {/* Push */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink }}>Notifications Push</div>
                  <div style={{ fontSize: 11, color: CD.muted, marginTop: 2, fontWeight: 500 }}>Changements de statut et alertes directes</div>
                </div>
                <ToggleSwitch checked={pushNotifications} onChange={handleTogglePush} />
              </div>

              <div style={{ height: 1, background: CD.line }} />

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: CD.ink }}>Rapports par e-mail</div>
                  <div style={{ fontSize: 11, color: CD.muted, marginTop: 2, fontWeight: 500 }}>Récapitulatif hebdomadaire des gains</div>
                </div>
                <ToggleSwitch checked={emailNotifications} onChange={handleToggleEmail} />
              </div>
            </div>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // ─────────────── 7.5 AIDE & CENTRE DE SUPPORT ───────────────
  if (screen === 'support') {
    const faqs = [
      {
        q: 'Comment fonctionne le retrait des gains ?',
        a: 'Les gains cumulés sur votre portefeuille sont retirables à tout moment dès que le solde atteint un minimum de 5 000 FCFA. Les demandes sont traitées sous 24h ouvrées par Orange Money ou Wave Côte d\'Ivoire.',
      },
      {
        q: 'Que faire en cas d\'absence du destinataire ?',
        a: 'Essayez d\'appeler le destinataire au moins 3 fois via le bouton d\'appel de la course active. Si le destinataire reste injoignable, déclarez un incident de type "Destinataire absent" ou déposez le colis au point relais d\'origine comme consigne.',
      },
      {
        q: 'Comment augmenter ma note générale ?',
        a: 'La clé réside dans la ponctualité, la courtoisie envers les clients et le soin apporté aux colis. Pensez également à toujours valider le code PIN de livraison dès la remise du colis.',
      },
    ];

    return (
      <SettingsLayout title="Aide & Support" activeScreen="support">
        <div style={{ padding: '20px' }}>
          
          {/* Quick contact buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <a
              href="tel:+2250700000000"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px',
                borderRadius: 16,
                background: CD.orangeSoft,
                border: `1.5px solid ${CD.orangeSoft}`,
                cursor: 'pointer',
              }}
            >
              <Phone size={20} color={CD.orange} />
              <span style={{ fontSize: 13, fontWeight: 800, color: CD.orange }}>Appeler le support</span>
            </a>
            
            <a
              href="https://wa.me/2250700000000"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px',
                borderRadius: 16,
                background: '#E6F6EC',
                border: `1.5px solid #E6F6EC`,
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#16A34A" style={{ display: 'block' }}>
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.248 8.477 3.514 2.266 2.265 3.51 5.276 3.51 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.73 0-2.597-1.012-5.04-2.85-6.88A9.74 9.74 0 0 0 12.008 1.24c-5.44 0-9.866 4.372-9.87 9.732 0 1.689.452 3.335 1.307 4.788l-.99 3.616 3.74-.984zm11.758-6.17c-.302-.15-1.786-.88-2.062-.98-.276-.1-.476-.15-.676.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.79-1.492-1.77-1.667-2.07-.175-.3-.02-.46.13-.61.137-.135.303-.35.454-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.63-.926-2.235-.244-.588-.49-.5-.676-.51-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.11 3.22 5.11 4.52.714.31 1.27.496 1.703.633.717.227 1.37.195 1.887.118.577-.087 1.786-.73 2.037-1.435.25-.705.25-1.31.175-1.435-.075-.125-.275-.2-.575-.35z"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>WhatsApp Direct</span>
            </a>
          </div>

          {/* FAQ list */}
          <div style={{ fontSize: 16, fontWeight: 900, color: CD.ink, marginBottom: 14 }}>Foire aux questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {faqs.map((f, i) => {
              const isOpen = expandedFaq === i;
              return (
                <div
                  key={i}
                  className="glass-card"
                  style={{ borderRadius: 16, padding: '14px 16px', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s', border: `1.5px solid ${CD.line}` }}
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: CD.ink, paddingRight: 10 }}>{f.q}</span>
                    <ChevronRight
                      size={18}
                      color={CD.muted}
                      style={{
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                  {isOpen && (
                    <div style={{ fontSize: 12.5, color: CD.ink2, marginTop: 10, lineHeight: 1.5, fontWeight: 500, borderTop: `1px solid ${CD.line}`, paddingTop: 10 }}>
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <a
            href="mailto:support@colisdirect.com"
            className="glass-card"
            style={{
              textDecoration: 'none',
              borderRadius: 16,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: CD.bgSoft,
              border: `1px solid ${CD.line}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Mail size={20} color={CD.ink2} />
              <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Nous écrire par email</span>
            </div>
            <ChevronRight size={18} color={CD.muted} />
          </a>

        </div>
      </SettingsLayout>
    );
  }

  // ─────────────── 7.6 PARAMETRES DU COMPTE ───────────────
  if (screen === 'account_settings') {
    const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error('Veuillez remplir tous les champs du mot de passe');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Le nouveau mot de passe et sa confirmation ne correspondent pas');
        return;
      }
      setBusy(true);
      const { error } = await api.changePassword(user.id, currentPassword, newPassword);
      setBusy(false);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Votre mot de passe a été modifié avec succès !');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    };

    const handleDeleteAccount = async () => {
      if (deleteConfirmText !== 'SUPPRIMER') {
        toast.error('Veuillez saisir "SUPPRIMER" pour confirmer la suppression');
        return;
      }
      setBusy(true);
      const { error } = await api.deleteUser(user.id);
      setBusy(false);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Votre compte a été supprimé.');
        signOut();
      }
    };

    return (
      <SettingsLayout title="Paramètres du compte" activeScreen="account_settings">
        <div style={{ padding: '20px' }}>
          
          {/* Change Password Form */}
          <form className="glass-card" style={{ borderRadius: 20, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14, border: `1.5px solid ${CD.line}` }} onSubmit={handlePasswordChange}>
            <div style={{ fontSize: 15, fontWeight: 900, color: CD.ink }}>Changer de mot de passe</div>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: CD.ink2 }}>Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: `1.5px solid ${CD.line}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: CD.ink2 }}>Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: `1.5px solid ${CD.line}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: CD.ink2 }}>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer"
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: `1.5px solid ${CD.line}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" disabled={busy} className="glow-button" style={{ ...btnPrimary, marginTop: 4, padding: 12, borderRadius: 10 }}>
              {busy ? <RefreshCw size={16} className="animate-spin margin-auto" /> : 'Mettre à jour le mot de passe'}
            </button>
          </form>

          {/* Zone d'Activité / Commune config */}
          <div className="glass-card" style={{ borderRadius: 20, padding: 20, marginBottom: 20, border: `1.5px solid ${CD.line}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: CD.ink, marginBottom: 4 }}>Zone de service</div>
            <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600, marginBottom: 12 }}>Votre zone d'activité principale. Contactez le support pour modifier de façon permanente.</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: CD.bgSoft, borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700 }}>VILLE ACTUELLE</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: CD.ink, marginTop: 2 }}>{profile?.city || 'Abidjan'}</div>
              </div>
              <MapPin size={20} color={CD.orange} />
            </div>
          </div>

          {/* Delete Account safety area */}
          <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: `1.5px solid ${CD.redSoft}`, background: 'rgba(220, 38, 38, 0.02)' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: CD.red, marginBottom: 4 }}>Zone dangereuse</div>
            <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600, marginBottom: 14 }}>La suppression de votre compte livreur est irréversible. Vos gains restants seront perdus.</div>
            
            {showDeleteConfirm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: CD.ink2 }}>Saisissez "SUPPRIMER" pour valider :</div>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${CD.red}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: CD.red, fontWeight: 800 }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    style={{ ...btnOutline, padding: '10px', flex: 1, borderRadius: 10 }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={busy || deleteConfirmText !== 'SUPPRIMER'}
                    style={{ ...btnPrimary, background: CD.red, padding: '10px', flex: 1, borderRadius: 10 }}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="glow-button"
                style={{ ...btnOutline, color: CD.red, borderColor: CD.red, padding: 12, borderRadius: 10 }}
              >
                Supprimer le compte
              </button>
            )}
          </div>

        </div>
      </SettingsLayout>
    );
  }

  // ─────────────── 8. PROFIL ET PREFERENCES ───────────────
  return (
    <Shell tab="profile">
      <ProfileMenu screen="profile" setScreen={setScreen} signOut={signOut} CD={CD} profile={profile} delivered={delivered} ini={ini} name={name} />
    </Shell>
  );
}

// ── Withdrawal transaction logic ──
async function withdraw(balance: number, reload: () => void, setBusy: (b: boolean) => void) {
  if (balance < 5000) {
    toast.error('Solde insuffisant pour le virement (min. 5 000 FCFA)');
    return;
  }
  const num = window.prompt('Entrez votre numéro Mobile Money (Orange Money / Wave) :');
  if (!num) return;
  setBusy(true);
  const { error } = await api.requestWithdrawal({ amount_fcfa: balance, orange_money_number: num });
  setBusy(false);
  if (error) return toast.error(error);
  toast.success('Demande de retrait reçue ! Votre compte sera crédité sous 24h.');
  reload();
}

// ── Optimized Delivery Confirmation Proof Screen ──
function ProofScreen({ ride, onBack, onDone }: { ride: any; onBack: () => void; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);

  const submit = async () => {
    if (!photoCaptured) {
      toast.error('Veuillez prendre une photo du colis sur place pour valider la livraison');
      return;
    }
    if (code.trim().length < 4) {
      toast.error('Veuillez saisir le code à 4 chiffres fourni par le destinataire');
      return;
    }
    setBusy(true);
    const { error } = await api.deliverShipment(ride.tracking_number, code.trim());
    setBusy(false);
    if (error) return toast.error(error);
    toast.success('Livraison validée ! Vos gains ont été crédités sur votre portefeuille.');
    onDone();
  };

  return (
    <div style={{ minHeight: '100vh', background: CD.bgSoft, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#fff', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: CD.ink }}>
        <TopBar title="Confirmation de livraison" onBack={onBack} action={<span />} />
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: CD.greenSoft, borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <CheckCircle2 size={26} color={CD.green} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f5a2b' }}>Vous êtes à destination !</div>
              <div style={{ fontSize: 12, color: '#0f5a2b', opacity: 0.85, fontWeight: 500, marginTop: 1 }}>Finalisez la remise du colis : {ride.tracking_number}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink }}>1. Photo de preuve de dépôt *</div>
            <label style={{ marginTop: 8, border: `2px dashed ${photoCaptured ? CD.green : CD.line}`, borderRadius: 14, padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: photoCaptured ? CD.greenSoft : CD.bgSoft, cursor: 'pointer' }}>
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={() => setPhotoCaptured(true)} />
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${photoCaptured ? CD.green : CD.line}` }}>
                <Camera size={22} color={photoCaptured ? CD.green : CD.orange} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: photoCaptured ? CD.green : CD.ink }}>{photoCaptured ? '✓ Photo enregistrée !' : 'Prendre une photo'}</div>
              <div style={{ fontSize: 11, color: CD.muted, fontWeight: 500 }}>Ouvrir l'appareil photo du smartphone</div>
            </label>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: CD.ink }}>2. Saisir le code du destinataire *</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="••••"
              style={{
                marginTop: 8,
                width: '100%',
                height: 56,
                border: `2px solid ${code.length === 4 ? CD.green : CD.orange}`,
                borderRadius: 14,
                textAlign: 'center',
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 10,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            disabled={busy}
            className="glow-button"
            style={{ ...btnPrimary, marginTop: 10, padding: 16 }}
            onClick={submit}
          >
            {busy ? <RefreshCw size={18} className="animate-spin margin-auto" /> : 'Valider la remise du colis'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Premium Credentials Entrance (Login) ──
function CourierLogin({ signIn }: { signIn: (e: string, p: string, usePhone?: boolean) => Promise<void> }) {
  const [id, setId] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const usePhone = !id.includes('@');
      await signIn(id.trim(), pwd, usePhone);
    } catch (e: any) {
      setErr(e?.message || 'Identifiants ou mot de passe incorrect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF3E8 0%, #FFFFFF 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 24, padding: '32px 28px', boxShadow: '0 20px 48px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: CD.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,108,0,0.3)' }}>
            <Truck size={26} color="#fff" />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: CD.ink, letterSpacing: '-0.3px', margin: '4px 0 2px' }}>Espace Livreur</h1>
          <p style={{ fontSize: 13, color: CD.muted, fontWeight: 500 }}>Connectez-vous pour commencer votre tournée</p>
        </div>

        {err && <div style={{ background: CD.redSoft, color: CD.red, fontSize: 13, fontWeight: 600, padding: 12, borderRadius: 10, textAlign: 'center' }}>{err}</div>}

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: CD.ink2 }}>Identifiant (Email ou Téléphone)</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            placeholder="Ex: livreur@colisdirect.com"
            style={{ width: '100%', marginTop: 6, padding: '12px 14px', border: `1.5px solid ${CD.line}`, borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: CD.ink2 }}>Mot de passe</label>
          <input
            type="password"
            value={pwd}
            required
            onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', marginTop: 6, padding: '12px 14px', border: `1.5px solid ${CD.line}`, borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" disabled={busy} className="glow-button" style={{ ...btnPrimary, marginTop: 10, padding: 16 }}>
          {busy ? <RefreshCw size={18} className="animate-spin margin-auto" /> : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
