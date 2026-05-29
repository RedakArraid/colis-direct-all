import { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Clock, ExternalLink } from 'lucide-react';

interface RelayPoint {
  id: string;
  name: string;
  type: string;
  commune: string;
  quartier: string;
  address: string;
  phone?: string;
  whatsapp?: string;
  hours?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

interface RelayPointsMapProps {
  relayPoints: RelayPoint[];
  onRelayPointClick?: (relayPoint: RelayPoint) => void;
}

export default function RelayPointsMap({ relayPoints, onRelayPointClick }: RelayPointsMapProps) {
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.3599, -4.0083]); // Abidjan center
  const [, setMapZoom] = useState(12);

  // Filter relay points with coordinates
  const pointsWithCoords = relayPoints.filter(rp => rp.latitude && rp.longitude);

  // Calculate center if we have points
  useEffect(() => {
    if (pointsWithCoords.length > 0) {
      const avgLat = pointsWithCoords.reduce((sum, rp) => sum + (rp.latitude || 0), 0) / pointsWithCoords.length;
      const avgLon = pointsWithCoords.reduce((sum, rp) => sum + (rp.longitude || 0), 0) / pointsWithCoords.length;
      setMapCenter([avgLat, avgLon]);
      setMapZoom(pointsWithCoords.length === 1 ? 15 : 12);
    }
  }, [pointsWithCoords]);

  const handleMarkerClick = (relay: RelayPoint) => {
    setSelectedRelay(relay);
    if (onRelayPointClick) {
      onRelayPointClick(relay);
    }
  };

  const getGoogleMapsUrl = (relay: RelayPoint) => {
    if (relay.latitude && relay.longitude) {
      return `https://www.google.com/maps?q=${relay.latitude},${relay.longitude}`;
    }
    const address = `${relay.address}, ${relay.quartier}, ${relay.commune}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const getOpenStreetMapUrl = (relay: RelayPoint) => {
    if (relay.latitude && relay.longitude) {
      return `https://www.openstreetmap.org/?mlat=${relay.latitude}&mlon=${relay.longitude}#map=16/${relay.latitude}/${relay.longitude}`;
    }
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${relay.address}, ${relay.commune}`)}`;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">Points relais sur la carte</h3>
            <p className="text-sm text-[#6B7280]">
              {pointsWithCoords.length} point{pointsWithCoords.length > 1 ? 's' : ''} avec coordonnées GPS
              {relayPoints.length > pointsWithCoords.length && (
                <span className="text-orange-600 ml-2">
                  ({relayPoints.length - pointsWithCoords.length} sans coordonnées)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pointsWithCoords.filter(rp => rp.is_active).length > 0 ? 'bg-green-100 text-green-800' : 'bg-[#F6F7F9] text-[#1A1A1A]'}`}>
              {pointsWithCoords.filter(rp => rp.is_active).length} actif{pointsWithCoords.filter(rp => rp.is_active).length > 1 ? 's' : ''}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pointsWithCoords.filter(rp => !rp.is_active).length > 0 ? 'bg-[#F6F7F9] text-[#1A1A1A]' : 'hidden'}`}>
              {pointsWithCoords.filter(rp => !rp.is_active).length} inactif{pointsWithCoords.filter(rp => !rp.is_active).length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="relative" style={{ height: '600px' }}>
          {/* Embed OpenStreetMap with Leaflet */}
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter[1] - 0.1},${mapCenter[0] - 0.1},${mapCenter[1] + 0.1},${mapCenter[0] + 0.1}&layer=mapnik&marker=${mapCenter[0]},${mapCenter[1]}`}
            style={{ border: '1px solid #ccc' }}
          />
          
          {/* Overlay with markers list */}
          <div className="absolute top-4 right-4 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-4 max-w-xs max-h-96 overflow-y-auto">
            <h4 className="font-bold text-[#1A1A1A] mb-3">Points relais</h4>
            <div className="space-y-2">
              {pointsWithCoords.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Aucun point relais avec coordonnées GPS</p>
              ) : (
                pointsWithCoords.map((relay) => (
                  <button
                    key={relay.id}
                    onClick={() => handleMarkerClick(relay)}
                    className={`w-full text-left p-2 rounded-lg border transition-colors ${
                      selectedRelay?.id === relay.id
                        ? 'border-[#FF6C00] bg-orange-50'
                        : 'border-[#E6E6E6] hover:border-[#FF6C00] hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${relay.is_active ? 'text-[#FF6C00]' : 'text-[#9CA3AF]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[#1A1A1A] truncate">{relay.name}</div>
                        <div className="text-xs text-[#6B7280]">{relay.commune}, {relay.quartier}</div>
                        {!relay.is_active && (
                          <span className="text-xs text-red-600">Inactif</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Relay Details */}
      {selectedRelay && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-1">{selectedRelay.name}</h3>
              <p className="text-sm text-[#6B7280] capitalize">{selectedRelay.type}</p>
            </div>
            <button
              onClick={() => setSelectedRelay(null)}
              className="text-[#9CA3AF] hover:text-[#6B7280]"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
                <MapPin className="w-4 h-4" />
                <span>Adresse</span>
              </div>
              <p className="text-[#1A1A1A]">{selectedRelay.address}</p>
              <p className="text-sm text-[#6B7280]">{selectedRelay.quartier}, {selectedRelay.commune}</p>
            </div>

            {selectedRelay.phone && (
              <div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
                  <Phone className="w-4 h-4" />
                  <span>Téléphone</span>
                </div>
                <a href={`tel:${selectedRelay.phone}`} className="text-[#FF6C00] hover:underline">
                  {selectedRelay.phone}
                </a>
              </div>
            )}

            {selectedRelay.hours && (
              <div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Horaires</span>
                </div>
                <p className="text-[#1A1A1A]">{selectedRelay.hours}</p>
              </div>
            )}
          </div>

          {selectedRelay.latitude && selectedRelay.longitude && (
            <div className="flex gap-2 mt-4">
              <a
                href={getGoogleMapsUrl(selectedRelay)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Itinéraire Google Maps
              </a>
              <a
                href={getOpenStreetMapUrl(selectedRelay)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Voir sur OpenStreetMap
              </a>
            </div>
          )}
        </div>
      )}

      {/* List of relay points without coordinates */}
      {relayPoints.length > pointsWithCoords.length && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Points relais sans coordonnées GPS</h4>
          <div className="space-y-2">
            {relayPoints
              .filter(rp => !rp.latitude || !rp.longitude)
              .map(relay => (
                <div key={relay.id} className="text-sm text-yellow-800">
                  <strong>{relay.name}</strong> - {relay.commune}, {relay.quartier}
                  {relay.address && <span className="text-yellow-700"> - {relay.address}</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

