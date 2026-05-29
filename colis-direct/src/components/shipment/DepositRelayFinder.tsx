import { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Clock, Loader, ChevronDown, ChevronUp, Store, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelayPoint {
  id: string;
  name: string;
  address: string;
  quartier: string;
  commune: string;
  phone: string;
  hours: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
}

interface RelayWithDistance extends RelayPoint {
  distance: number | null; // km
}

interface DepositRelayFinderProps {
  destinationRelayId?: string | null;
  shipmentTrackingNumber?: string;
}

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Map lazy-loaded ──────────────────────────────────────────────────────────

// Separate wrapper to avoid async issues
function MapContainerWrapper({
  center,
  relays,
  userPos,
}: {
  center: [number, number];
  relays: RelayWithDistance[];
  userPos: [number, number] | null;
}) {
  const [MapComponents, setMapComponents] = useState<any>(null);

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

  if (!MapComponents) {
    return (
      <div className="h-64 bg-[#F6F7F9] rounded-xl flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = MapComponents;

  const orangeIcon = L ? new L.Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#FF6C00"/><circle cx="12.5" cy="12.5" r="5" fill="white"/></svg>`),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  }) : undefined;

  const userIcon = L ? new L.Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="white"/></svg>`),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }) : undefined;

  return (
    <MapContainer
      center={center}
      zoom={userPos ? 13 : 12}
      className="h-72 rounded-xl z-0 w-full"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPos && userIcon && (
        <Marker position={userPos} icon={userIcon}>
          <Popup>Votre position</Popup>
        </Marker>
      )}
      {relays.map(relay => (
        relay.latitude != null && relay.longitude != null && orangeIcon ? (
          <Marker
            key={relay.id}
            position={[relay.latitude, relay.longitude]}
            icon={orangeIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{relay.name}</p>
                <p className="text-[#6B7280]">{relay.address}</p>
                <p className="text-[#6B7280]">{relay.quartier}, {relay.commune}</p>
                {relay.phone && <p className="text-orange-600 font-medium mt-1">📞 {relay.phone}</p>}
                {relay.distance != null && (
                  <p className="text-blue-600 font-medium mt-1">📍 {relay.distance.toFixed(1)} km</p>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DepositRelayFinder({ destinationRelayId }: DepositRelayFinderProps) {
  const [expanded, setExpanded] = useState(false);
  const [relays, setRelays] = useState<RelayWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRelays = async (lat?: number, lon?: number) => {
    if (fetched && !lat) return;
    setLoading(true);
    try {
      const { data, error } = await api.getRelayPoints({ is_active: true });
      if (error || !Array.isArray(data)) return;

      const filtered = (data as RelayPoint[])
        .filter(r => r.id !== destinationRelayId && r.is_active);

      const withDist: RelayWithDistance[] = filtered.map(r => ({
        ...r,
        distance:
          lat != null && lon != null && r.latitude != null && r.longitude != null
            ? haversineKm(lat, lon, r.latitude, r.longitude)
            : null,
      }));

      // Sort: relays with distance first (by distance), then others alphabetically
      withDist.sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return a.name.localeCompare(b.name);
      });

      setRelays(withDist);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async () => {
    setExpanded(true);
    if (!fetched) await fetchRelays();
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserPos([lat, lon]);
        setGeoLoading(false);
        await fetchRelays(lat, lon);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Vous avez refusé la géolocalisation. Les relais sont affichés sans tri par distance.');
        } else {
          setGeoError('Impossible d\'obtenir votre position. Les relais sont affichés sans tri par distance.');
        }
        fetchRelays(); // still show relays without distance
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  if (!expanded) {
    return (
      <button
        onClick={handleExpand}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FF6C00] text-white rounded-xl font-semibold text-sm hover:bg-[#e05500] transition-colors"
      >
        <Store className="w-4 h-4" />
        Voir les points relais pour déposer ce colis
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="mt-3 border border-orange-200 rounded-xl bg-orange-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-[#FF6C00]" />
          <span className="text-sm font-bold text-[#FF6C00]">Points relais de dépôt disponibles</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-[#9CA3AF] hover:text-[#6B7280]"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Geolocation CTA */}
        {!userPos && (
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-700">Trouver les relais les plus proches</p>
              <p className="text-xs text-blue-600 mt-0.5">Activez la géolocalisation pour voir les distances depuis votre position actuelle</p>
            </div>
            <button
              onClick={requestGeolocation}
              disabled={geoLoading}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {geoLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {geoLoading ? 'Localisation...' : 'Me localiser'}
            </button>
          </div>
        )}

        {geoError && (
          <div className="mb-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">{geoError}</p>
          </div>
        )}

        {userPos && (
          <div className="mb-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <Navigation className="w-3.5 h-3.5" />
            <span>Position détectée — relais triés par distance</span>
          </div>
        )}

        {/* Map toggle */}
        {relays.length > 0 && (
          <button
            onClick={() => setShowMap(v => !v)}
            className="mb-3 text-xs font-semibold text-[#FF6C00] underline hover:text-[#e05500]"
          >
            {showMap ? 'Masquer la carte' : 'Afficher la carte'}
          </button>
        )}

        {/* Map */}
        {showMap && relays.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden border border-[#E6E6E6]" style={{ zIndex: 0 }}>
            <MapContainerWrapper
              center={userPos || [5.345, -4.024]}
              relays={relays}
              userPos={userPos}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-[#6B7280]">
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-sm">Chargement des points relais...</span>
          </div>
        )}

        {/* Relay list */}
        {!loading && relays.length === 0 && fetched && (
          <p className="text-sm text-[#6B7280] text-center py-4">Aucun point relais disponible actuellement.</p>
        )}

        {!loading && relays.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {relays.map((relay, idx) => (
              <div
                key={relay.id}
                className={`bg-white border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 ${
                  idx === 0 && relay.distance != null ? 'border-[#FF6C00]/40 bg-orange-50/40' : 'border-[#F0F0F0]'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    idx === 0 && relay.distance != null ? 'bg-orange-100' : 'bg-[#F6F7F9]'
                  }`}>
                    <Store className={`w-4 h-4 ${idx === 0 && relay.distance != null ? 'text-[#FF6C00]' : 'text-[#6B7280]'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#1A1A1A]">{relay.name}</p>
                      {idx === 0 && relay.distance != null && (
                        <span className="text-[10px] font-bold text-white bg-[#FF6C00] px-2 py-0.5 rounded-full">
                          Le plus proche
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">{relay.address}{relay.quartier ? `, ${relay.quartier}` : ''}</p>
                    <p className="text-xs text-[#6B7280]">{relay.commune}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {relay.phone && (
                        <a
                          href={`tel:${relay.phone}`}
                          className="text-xs text-[#FF6C00] font-medium flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {relay.phone}
                        </a>
                      )}
                      {relay.hours && (
                        <span className="text-xs text-[#9CA3AF] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {relay.hours}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {relay.distance != null && (
                  <div className="shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      relay.distance < 2
                        ? 'bg-green-100 text-green-700'
                        : relay.distance < 5
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-[#F6F7F9] text-[#6B7280]'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      {relay.distance < 1
                        ? `${Math.round(relay.distance * 1000)} m`
                        : `${relay.distance.toFixed(1)} km`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-[#9CA3AF] text-center">
          Vous pouvez déposer votre colis dans n'importe lequel de ces points relais.
          Présentez votre numéro de suivi ou votre numéro de téléphone à l'agent.
        </p>
      </div>
    </div>
  );
}
