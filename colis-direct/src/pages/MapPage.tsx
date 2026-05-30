import { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Clock, Search, Navigation, Loader2, X, Package } from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { api } from '../lib/api';

interface RelayPoint {
  id: string;
  name: string;
  type: string;
  commune: string;
  quartier: string;
  address: string;
  phone: string;
  whatsapp?: string;
  hours?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  description?: string;
}

const COMMUNE_CHIPS = ['Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Treichville', 'Adjamé'];

// Camera controller helper for Leaflet Map
function MapCameraController({ selectedRelay, useMap }: { selectedRelay: any; useMap: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedRelay?.latitude && selectedRelay?.longitude) {
      map.flyTo(
        [Number(selectedRelay.latitude), Number(selectedRelay.longitude)],
        15,
        { animate: true, duration: 1.5 }
      );
    }
  }, [selectedRelay, map]);
  return null;
}

function MapPage() {
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [filteredRelays, setFilteredRelays] = useState<RelayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommune, setSelectedCommune] = useState<string>('all');
  const [selectedQuartier, setSelectedQuartier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
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

  useEffect(() => {
    loadRelayPoints();
  }, []);

  const loadRelayPoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getRelayPoints({ is_active: true });
      if (error) throw new Error(error);
      if (data) {
        const processedData = data.map((relay: any) => ({
          ...relay,
          latitude: relay.latitude ? Number(relay.latitude) : null,
          longitude: relay.longitude ? Number(relay.longitude) : null,
        }));
        setRelayPoints(processedData);
        setFilteredRelays(processedData);
      }
    } catch (error: any) {
      console.error('Error loading relay points:', error);
    } finally {
      setLoading(false);
    }
  };

  const communes = Array.from(new Set(relayPoints.map(rp => rp.commune).filter(Boolean))).sort();
  const quartiers = Array.from(
    new Set(
      relayPoints
        .filter(rp => selectedCommune === 'all' || rp.commune === selectedCommune)
        .map(rp => rp.quartier)
        .filter(Boolean)
    )
  ).sort();

  useEffect(() => {
    let filtered = [...relayPoints];
    if (selectedCommune !== 'all') filtered = filtered.filter(rp => rp.commune === selectedCommune);
    if (selectedQuartier !== 'all') filtered = filtered.filter(rp => rp.quartier === selectedQuartier);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        rp =>
          rp.name.toLowerCase().includes(query) ||
          rp.commune.toLowerCase().includes(query) ||
          rp.quartier?.toLowerCase().includes(query) ||
          rp.address.toLowerCase().includes(query)
      );
    }
    if (userLocation && filtered.length > 0) {
      filtered = filtered
        .filter(rp => rp.latitude && rp.longitude)
        .sort((a, b) => {
          const distA = calculateDistance(userLocation.lat, userLocation.lng, Number(a.latitude), Number(a.longitude));
          const distB = calculateDistance(userLocation.lat, userLocation.lng, Number(b.latitude), Number(b.longitude));
          return distA - distB;
        });
    }
    setFilteredRelays(filtered);
  }, [selectedCommune, selectedQuartier, searchQuery, userLocation, relayPoints]);

  useEffect(() => {
    setSelectedQuartier('all');
  }, [selectedCommune]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLng = deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number): number => deg * (Math.PI / 180);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        setLocationError("Impossible d'obtenir votre position.");
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGetDirections = (relay: RelayPoint) => {
    if (relay.latitude && relay.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${relay.latitude},${relay.longitude}`, '_blank');
    } else {
      alert('Les coordonnées GPS ne sont pas disponibles pour ce point relais');
    }
  };

  const getTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      cybercafe: 'Cybercafé',
      imprimerie: 'Imprimerie',
      superette: 'Supérette',
    };
    return typeMap[type] || type;
  };

  const getMapBounds = () => {
    const pointsWithCoords = filteredRelays.filter(rp => rp.latitude && rp.longitude);
    if (pointsWithCoords.length === 0) return null;
    const lats = pointsWithCoords.map(rp => Number(rp.latitude));
    const lngs = pointsWithCoords.map(rp => Number(rp.longitude));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
    return { minLat: minLat - latPadding, maxLat: maxLat + latPadding, minLng: minLng - lngPadding, maxLng: maxLng + lngPadding };
  };

  const bounds = getMapBounds();

  const buildMapUrl = () => {
    if (filteredRelays.length === 0) return `https://www.openstreetmap.org/export/embed.html?bbox=-4.2,5.1,-3.9,5.4&layer=mapnik&marker=5.316667,-4.033333`;
    const pointsWithCoords = filteredRelays.filter(rp => rp.latitude && rp.longitude);
    if (pointsWithCoords.length === 0) return `https://www.openstreetmap.org/export/embed.html?bbox=-4.2,5.1,-3.9,5.4&layer=mapnik`;
    const bbox = bounds ? `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}` : '-4.2,5.1,-3.9,5.4';
    const markers = pointsWithCoords.map(rp => `${Number(rp.latitude)},${Number(rp.longitude)}`).join('&marker=');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markers}`;
  };

  // Sidebar commune chips derived from actual data + design defaults
  const sidebarChips = COMMUNE_CHIPS.filter(c => communes.includes(c)).length > 0 ? COMMUNE_CHIPS : communes.slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      {/* 2-col layout: sidebar | map */}
      <div className="flex" style={{ height: 700 }}>
        {/* Sidebar */}
        <aside
          className="flex-shrink-0 border-r border-[#E6E6E6] flex flex-col overflow-hidden"
          style={{ width: 380 }}
        >
          <div className="p-5 flex-1 overflow-y-auto">
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Points relais</h2>
            <div className="text-sm text-[#6B7280] mt-1">
              {loading ? 'Chargement...' : `${filteredRelays.length} point${filteredRelays.length > 1 ? 's' : ''} relais`}
            </div>

            {/* Search */}
            <div className="mt-4 border border-[#E6E6E6] rounded-xl px-3 py-2.5 flex items-center gap-2 bg-white">
              <Search className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
              <input
                placeholder="Rechercher commune ou quartier"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm border-none outline-none text-[#1A1A1A] placeholder:text-[#6B7280]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#6B7280] hover:text-[#1A1A1A]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Commune chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setSelectedCommune('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedCommune === 'all'
                    ? 'bg-[#FF6C00] text-white'
                    : 'bg-[#F6F7F9] text-[#3A3A3A] hover:bg-[#E6E6E6]'
                }`}
              >
                Tout
              </button>
              {sidebarChips.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCommune(selectedCommune === c ? 'all' : c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedCommune === c
                      ? 'bg-[#FF6C00] text-white'
                      : 'bg-[#F6F7F9] text-[#3A3A3A] hover:bg-[#E6E6E6]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Quartier select if commune selected and has quartiers */}
            {selectedCommune !== 'all' && quartiers.length > 0 && (
              <select
                value={selectedQuartier}
                onChange={(e) => setSelectedQuartier(e.target.value)}
                className="mt-3 w-full text-sm border border-[#E6E6E6] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6C00]"
              >
                <option value="all">Tous les quartiers</option>
                {quartiers.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            )}

            {/* Geolocation button */}
            <button
              onClick={handleGetLocation}
              className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                userLocation
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-[#FFF3E8] text-[#FF6C00] border border-[#FF6C00]/30 hover:bg-[#FFE4CC]'
              }`}
            >
              <Navigation className="w-4 h-4" />
              {userLocation ? 'Position trouvée — tri par distance' : 'Utiliser ma position'}
            </button>

            {locationError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{locationError}</div>
            )}

            {/* Relay list */}
            <div className="flex flex-col gap-2.5 mt-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF6C00]" />
                </div>
              )}

              {!loading && filteredRelays.length === 0 && (
                <div className="text-center py-6 text-sm text-[#6B7280]">
                  Aucun point relais trouvé.
                  <button
                    onClick={() => { setSelectedCommune('all'); setSearchQuery(''); }}
                    className="block mx-auto mt-2 text-[#FF6C00] font-semibold hover:underline"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}

              {!loading && filteredRelays.slice(0, 20).map((r) => {
                const isActive = selectedRelay?.id === r.id;
                const isOpen = !r.hours || r.hours.includes('08') || r.hours.includes('07') || r.hours.toLowerCase().includes('ouvert');
                const dist = userLocation && r.latitude && r.longitude
                  ? `${calculateDistance(userLocation.lat, userLocation.lng, Number(r.latitude), Number(r.longitude)).toFixed(1)} km`
                  : null;

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRelay(r)}
                    className={`rounded-xl p-3.5 cursor-pointer border transition-all ${
                      isActive
                        ? 'border-[#FF6C00] bg-[#FFF3E8]'
                        : 'border-[#E6E6E6] bg-white hover:border-[#FF6C00]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-[#1A1A1A] leading-tight">{r.name}</div>
                      {dist && (
                        <span className="text-xs font-semibold text-[#6B7280] flex-shrink-0">{dist}</span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-0.5">
                      {r.commune}{r.quartier ? `, ${r.quartier}` : ''}
                    </div>
                    <div className={`text-xs font-bold mt-1.5 ${isOpen ? 'text-green-600' : 'text-red-500'}`}>
                      {r.hours ? (isOpen ? `Ouvert · ${r.hours}` : `Fermé · ${r.hours}`) : (isOpen ? 'Ouvert' : 'Fermé')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden h-full bg-[#F6F7F9]">
          {MapComponents && filteredRelays.length > 0 ? (
            <MapComponents.MapContainer
              center={selectedRelay?.latitude && selectedRelay?.longitude ? [Number(selectedRelay.latitude), Number(selectedRelay.longitude)] : [5.316667, -4.033333]}
              zoom={selectedRelay ? 15 : 12}
              zoomControl={false}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
              <MapComponents.TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <MapCameraController selectedRelay={selectedRelay} useMap={MapComponents.useMap} />
              {filteredRelays
                .filter((r) => r.latitude && r.longitude)
                .map((r) => {
                  const isSelected = selectedRelay?.id === r.id;
                  const customIcon = MapComponents.L.divIcon({
                    className: 'custom-leaflet-icon',
                    html: `
                      <div class="custom-marker ${isSelected ? 'active-marker' : ''}" style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: ${isSelected ? '36px' : '28px'};
                        height: ${isSelected ? '36px' : '28px'};
                        background: #FF6C00;
                        border: 2.5px solid #ffffff;
                        border-radius: 50%;
                        box-shadow: 0 4px 10px rgba(255, 108, 0, 0.4);
                        color: #ffffff;
                        position: relative;
                        transition: all 0.2s ease;
                      ">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        </svg>
                      </div>
                    `,
                    iconSize: isSelected ? [36, 36] : [28, 28],
                    iconAnchor: isSelected ? [18, 18] : [14, 14],
                  });

                  return (
                    <MapComponents.Marker
                      key={r.id}
                      position={[Number(r.latitude), Number(r.longitude)]}
                      icon={customIcon}
                      eventHandlers={{
                        click: () => setSelectedRelay(r),
                      }}
                    >
                      <MapComponents.Popup>
                        <div className="p-2 min-w-[200px]">
                          <div className="font-extrabold text-sm text-[#1A1A1A]">{r.name}</div>
                          <div className="text-xs text-[#6B7280] mt-1">{r.address}</div>
                          <div className="text-xs text-[#FF6C00] font-bold mt-1.5">{r.hours}</div>
                          <button
                            onClick={() => handleGetDirections(r)}
                            className="w-full mt-3 bg-[#FF6C00] hover:bg-[#E66100] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-none"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Y aller
                          </button>
                        </div>
                      </MapComponents.Popup>
                    </MapComponents.Marker>
                  );
                })}
            </MapComponents.MapContainer>
          ) : (
            <>
              {/* SVG road lines */}
              <svg width="100%" height="100%" viewBox="0 0 800 700" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <path d="M-20 150 L820 200" stroke="#fff" strokeWidth="20" />
                <path d="M-20 350 L820 380" stroke="#fff" strokeWidth="16" />
                <path d="M-20 530 L820 560" stroke="#fff" strokeWidth="12" />
                <path d="M200 -20 L220 720" stroke="#fff" strokeWidth="18" />
                <path d="M450 -20 L470 720" stroke="#fff" strokeWidth="14" />
                <path d="M650 -20 L670 720" stroke="#fff" strokeWidth="10" />
                <rect x="280" y="240" width="120" height="80" fill="#D0E0E8" opacity="0.7" rx="4" />
                <rect x="500" y="400" width="100" height="60" fill="#D0E0E8" opacity="0.7" rx="4" />
                <path d="M-20 100 Q 400 80, 820 120" stroke="#A8D5E8" strokeWidth="8" fill="none" opacity="0.7" />
              </svg>

              {/* Orange pins (decorative fallback when no iframe) */}
              {filteredRelays.length === 0 && !loading && (
                <>
                  {[
                    { x: 150, y: 200 }, { x: 280, y: 300 }, { x: 380, y: 180 },
                    { x: 500, y: 250 }, { x: 620, y: 320 }, { x: 200, y: 450 },
                    { x: 450, y: 480 }, { x: 580, y: 540 }, { x: 700, y: 200 },
                  ].map((p, i) => (
                    <div
                      key={i}
                      style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-100%)' }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full border-2 border-white shadow-lg"
                        style={{ width: 32, height: 32, background: '#FF6C00' }}
                      >
                        <Package className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* Floating info card on relay select */}
          {selectedRelay && (
            <div
              className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-2xl p-4"
              style={{ width: 280, zIndex: 10 }}
            >
              <button
                onClick={() => setSelectedRelay(null)}
                className="absolute top-3 right-3 text-[#6B7280] hover:text-[#1A1A1A]"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="font-extrabold text-sm text-[#1A1A1A] pr-5">{selectedRelay.name}</div>
              <div className="text-xs text-[#6B7280] mt-1">
                {selectedRelay.commune}{selectedRelay.quartier ? `, ${selectedRelay.quartier}` : ''}
              </div>
              <div className="text-xs font-bold text-green-600 mt-1.5">{selectedRelay.hours || 'Horaires non précisés'}</div>
              {selectedRelay.phone && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6B7280]">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${selectedRelay.phone}`} className="hover:text-[#FF6C00]">{selectedRelay.phone}</a>
                </div>
              )}
              <button
                onClick={() => handleGetDirections(selectedRelay)}
                disabled={!selectedRelay.latitude || !selectedRelay.longitude}
                className="btn-primary w-full mt-3 py-2 text-xs disabled:opacity-50"
              >
                Itinéraire
              </button>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-50">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6C00]" />
            </div>
          )}
        </div>
      </div>

      {/* Relay details modal */}
      {selectedRelay && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRelay(null)}
        >
          <div
            className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Détails du point relais</h2>
              <button onClick={() => setSelectedRelay(null)} className="text-[#6B7280] hover:text-[#1A1A1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">{selectedRelay.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-[#FF6C00] font-semibold">{selectedRelay.commune}</span>
                  {selectedRelay.quartier && (
                    <>
                      <span className="text-[#E6E6E6]">•</span>
                      <span className="text-sm text-[#6B7280]">{selectedRelay.quartier}</span>
                    </>
                  )}
                </div>
                <span className="inline-block mt-2 text-xs px-2 py-1 bg-[#FFF3E8] text-[#FF6C00] font-semibold rounded-full">
                  {getTypeLabel(selectedRelay.type)}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-[#3A3A3A]">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#FF6C00]" />
                  <span>{selectedRelay.address}</span>
                </div>
                <div className="flex items-center gap-2 text-[#3A3A3A]">
                  <Phone className="w-4 h-4 flex-shrink-0 text-[#FF6C00]" />
                  <a href={`tel:${selectedRelay.phone}`} className="hover:text-[#FF6C00] transition-colors">{selectedRelay.phone}</a>
                </div>
                {selectedRelay.hours && (
                  <div className="flex items-center gap-2 text-[#3A3A3A]">
                    <Clock className="w-4 h-4 flex-shrink-0 text-[#FF6C00]" />
                    <span>{selectedRelay.hours}</span>
                  </div>
                )}
                {selectedRelay.description && (
                  <p className="text-[#6B7280] text-xs leading-relaxed">{selectedRelay.description}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#E6E6E6]">
                <button
                  onClick={() => handleGetDirections(selectedRelay)}
                  disabled={!selectedRelay.latitude || !selectedRelay.longitude}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Navigation className="w-4 h-4" />
                  Itinéraire
                </button>
                <a
                  href={`tel:${selectedRelay.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Appeler
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={(page) => {
        if (typeof window !== 'undefined' && (window as any).onNavigate) {
          (window as any).onNavigate(page);
        }
      }} />
      <Chatbot />
    </div>
  );
}

export default MapPage;
