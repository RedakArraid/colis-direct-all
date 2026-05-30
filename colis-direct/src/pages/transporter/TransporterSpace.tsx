import { useState, useEffect, useCallback } from 'react';
import {
  Home, Truck, Wallet, User, Bell, Star, CheckCircle2, MapPin,
  ChevronLeft, ChevronRight, Phone, Camera, Settings, RefreshCw,
  Shield, CreditCard, LifeBuoy, LogOut, Package, ArrowRight, Eye,
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

type Screen = 'dashboard' | 'available' | 'detail' | 'active' | 'proof' | 'earnings' | 'history' | 'profile' | 'personal_info' | 'documents';
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
function DynamicVectorMap({ fromCommune, toCommune, MapComponents }: { fromCommune: string; toCommune: string; MapComponents: any }) {
  const p1 = getCoords(fromCommune);
  const p2 = getCoords(toCommune);
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
      <div style={{ fontSize: 22, fontWeight: 900, color: CD.ink, tracking: '-0.5px', marginTop: 4 }}>{n}</div>
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

  const Shell = ({ children, tab, fullBleed }: { children: React.ReactNode; tab?: Tab; fullBleed?: boolean }) => (
    <div style={{ minHeight: '100vh', background: CD.bgSoft, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,0,0,0.05)', fontFamily: 'Inter, sans-serif', color: CD.ink }}>
        <div style={{ flex: 1, overflow: fullBleed ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>{children}</div>
        {tab && <TabBar active={tab} onNav={goTab} />}
      </div>
    </div>
  );

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
        {/* Sleek Dark Header */}
        <div style={{ background: '#0F0F0F', color: '#fff', padding: '24px 20px 28px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
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
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Stat Icon={Truck} n={String(activeRides.length + delivered.length || activeRides.length)} l="Courses en cours" />
            <Stat Icon={Wallet} n={fmt(stats.today)} l="Gains aujourd'hui" />
            <Stat Icon={Star} n={profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'} l="Note générale" />
            <Stat Icon={CheckCircle2} n={profile?.success_rate ? `${profile.success_rate}%` : '100%'} l="Taux de réussite" />
          </div>

          {/* Quick available offers view */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26 }}>
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
                      <div style={{ fontWeight: 800, fontSize: 15, color: CD.ink }}>{fromOf(r)}</div>
                      <div style={{ fontSize: 11, color: CD.muted, margin: '6px 0', fontWeight: 600 }}>{r.package_type || 'Colis'} · {r.weight || '?'} kg</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: CD.ink }}>{toOf(r)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: CD.orange }}>{fmt(r.net_earnings_fcfa || r.price)}</div>
                    <div style={{ fontSize: 11, color: CD.muted, fontWeight: 700 }}>FCFA net</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, paddingTop: 14, borderTop: `1px solid ${CD.line}` }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: CD.muted, fontWeight: 600 }}>
                    <MapPin size={14} color={CD.orange} /> {toOf(r)}
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
          <DynamicVectorMap fromCommune={fromOf(r)} toCommune={toOf(r)} MapComponents={MapComponents} />
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
                <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ENLÈVEMENT</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: CD.ink, marginTop: 2 }}>{r.origin_relay_name || r.sender_commune || '—'}</div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 500, marginTop: 2 }}>{`${r.sender_first_name || ''} ${r.sender_last_name || ''}`.trim()} · {r.sender_phone || ''}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: CD.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESTINATION</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: CD.ink, marginTop: 2 }}>{r.destination_relay_name || r.recipient_commune || '—'}</div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 500, marginTop: 2 }}>{`${r.recipient_first_name || ''} ${r.recipient_last_name || ''}`.trim()} · {r.recipient_phone || ''}</div>
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
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '55vh', width: '100%', position: 'relative' }}>
            <DynamicVectorMap fromCommune={fromOf(ride)} toCommune={toOf(ride)} MapComponents={MapComponents} />
            {/* HUD Status Bar overlay */}
            <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
              <div style={{ background: '#0F0F0F', color: '#fff', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,108,0,0.15)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                  <Truck size={18} color={CD.orange} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Livraison en cours...</div>
                  <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 500, marginTop: 1 }}>N° {ride.tracking_number}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery destination card */}
          <div style={{ flex: 1, background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -10px 30px rgba(0,0,0,0.08)', padding: '20px', zIndex: 5, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: CD.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: CD.orange }}>{initials(ride.recipient_first_name, ride.recipient_last_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: CD.ink }}>{`${ride.recipient_first_name || ''} ${ride.recipient_last_name || ''}`.trim() || 'Destinataire'}</div>
                <div style={{ fontSize: 12, color: CD.muted, fontWeight: 600 }}>Destinataire · {toOf(ride)}</div>
              </div>
              <a href={`tel:${ride.recipient_phone || ''}`} style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${CD.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <Phone size={20} color={CD.ink} />
              </a>
            </div>

            <div className="glass-card" style={{ borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <MapPin size={20} color={CD.orange} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: CD.ink2 }}>{ride.recipient_address || toOf(ride)}</div>
            </div>

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
              Terminer la livraison <ChevronRight size={20} />
            </button>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cancelled ? CD.redSoft : CD.greenSoft, display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0 }}>
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
      <Shell>
        <TopBar title="Informations personnelles" onBack={() => setScreen('profile')} action={<span />} />
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
      </Shell>
    );
  }

  // ─────────────── 7.2 DOCUMENTS & VÉRIFICATIONS ───────────────
  if (screen === 'documents') {
    return (
      <Shell>
        <TopBar title="Documents & Vérifications" onBack={() => setScreen('profile')} action={<span />} />
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={CD.green} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Pièce d'identité (CNI)</span>
              </div>
              <Pill bg={CD.greenSoft} color={CD.green}>Validé</Pill>
            </div>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={CD.green} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Permis de conduire</span>
              </div>
              <Pill bg={CD.greenSoft} color={CD.green}>Validé</Pill>
            </div>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={CD.green} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Carte grise du véhicule</span>
              </div>
              <Pill bg={CD.greenSoft} color={CD.green}>Validé</Pill>
            </div>
            <div className="glass-card" style={{ borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Camera size={20} color={CD.orange} />
                <span style={{ fontSize: 14, fontWeight: 700, color: CD.ink }}>Photo de profil</span>
              </div>
              <button style={{ border: 'none', background: CD.orangeSoft, color: CD.orange, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Téléverser</button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────────── 8. PROFIL ET PREFERENCES ───────────────
  return (
    <Shell tab="profile">
      <div style={{ background: '#0F0F0F', color: '#fff', padding: '24px 20px 28px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
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
        <div className="glass-card" style={{ borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: CD.orangeSoft, display: 'flex', alignItems: 'center', justify: 'center' }}>
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
            { Icon: User, l: 'Informations personnelles', go: () => setScreen('personal_info') },
            { Icon: Shield, l: 'Documents & Vérifications', go: () => setScreen('documents') },
            { Icon: CreditCard, l: 'Moyens de paiement' },
            { Icon: Wallet, l: 'Détails des transactions', go: () => setScreen('earnings') },
            { Icon: Eye, l: 'Historique des livraisons', go: () => setScreen('history') },
            { Icon: Bell, l: 'Préférences notifications' },
            { Icon: LifeBuoy, l: 'Aide & Centre de support' },
            { Icon: Settings, l: 'Paramètres du compte' },
            { Icon: LogOut, l: 'Se déconnecter', danger: true, go: () => signOut() },
          ].map((r) => (
            <button
              key={r.l}
              onClick={r.go}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                cursor: r.go ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 4px',
                borderBottom: `1px solid ${CD.line}`,
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                outline: 'none',
              }}
            >
              <r.Icon size={18} color={r.danger ? CD.red : CD.ink2} strokeWidth={2} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.danger ? CD.red : CD.ink }}>{r.l}</span>
              {!r.danger && <ChevronRight size={18} color={CD.muted} />}
            </button>
          ))}
        </div>
      </div>
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
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justify: 'center', border: `1px solid ${photoCaptured ? CD.green : CD.line}` }}>
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
          <div style={{ width: 56, height: 56, borderRadius: 16, background: CD.orange, display: 'flex', alignItems: 'center', justify: 'center', boxShadow: '0 8px 24px rgba(255,108,0,0.3)' }}>
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
