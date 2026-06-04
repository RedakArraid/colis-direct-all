import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Phone, Bike, Car, Truck, User, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { api } from '../../lib/api';

interface DriverSearchProps {
  trackingNumber: string;
}

type DispatchState = 'not_applicable' | 'searching' | 'assigned' | 'no_driver';

interface Driver {
  first_name: string;
  last_name: string;
  phone: string;
  vehicle_type: string;
  license_plate: string | null;
  transporter_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
}

const POLL_MS = 5000;

const makeIcon = (color: string, emoji: string) =>
  new L.DivIcon({
    html: `<div style="background:${color};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff">
             <span style="transform:rotate(45deg);font-size:16px">${emoji}</span>
           </div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });

const driverIcon = makeIcon('#FF6C00', '🛵');
const pickupIcon = makeIcon('#1A1A1A', '📦');

const vehicleLabel = (type: string): string => {
  const map: Record<string, string> = {
    moto: 'Moto', velo: 'Vélo', voiture: 'Voiture', camionnette: 'Camionnette', pied: 'À pied',
  };
  return map[type] || type || 'Véhicule';
};

const VehicleIcon = ({ type, className }: { type: string; className?: string }) => {
  if (type === 'velo' || type === 'moto') return <Bike className={className} />;
  if (type === 'camionnette') return <Truck className={className} />;
  return <Car className={className} />;
};

// Distance haversine (km) pour une estimation grossière du temps d'arrivée
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function DriverSearch({ trackingNumber }: DriverSearchProps) {
  const [state, setState] = useState<DispatchState>('searching');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [pickup, setPickup] = useState<{ latitude: number | null; longitude: number | null } | null>(null);
  const [offersSent, setOffersSent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let poll: number;

    const tick = async () => {
      const { data } = await api.getDispatchStatus(trackingNumber);
      if (cancelled || !data) return;
      setState(data.state);
      setPickup(data.pickup ?? null);
      setOffersSent(data.offers_sent ?? 0);
      if (data.driver) setDriver(data.driver);
      // On arrête le polling dès qu'un livreur est assigné… sauf qu'on veut suivre sa
      // position : on continue alors, mais moins fréquemment géré par l'intervalle constant.
    };

    tick();
    poll = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [trackingNumber]);

  // Chronomètre d'attente pendant la recherche
  useEffect(() => {
    if (state === 'searching') {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }
  }, [state]);

  if (state === 'not_applicable') return null;

  // ─── Recherche en cours ──────────────────────────────────────────────────
  if (state === 'searching') {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    return (
      <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-orange-200 animate-ping" />
            <div className="relative bg-orange-100 rounded-full p-5">
              <Bike className="w-9 h-9 text-[#FF6C00]" />
            </div>
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-[#1A1A1A] mb-2">
          Recherche d'un livreur…
        </h3>
        <p className="text-sm text-[#6B7280] mb-4">
          Nous contactons les livreurs disponibles près de votre adresse de ramassage.
          Cela prend généralement quelques minutes.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-[#6B7280]">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF6C00]" /> {mm}:{ss}
          </span>
          {offersSent > 0 && (
            <span className="text-[#6B7280]">
              {offersSent} livreur{offersSent > 1 ? 's' : ''} contacté{offersSent > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── Aucun livreur trouvé ────────────────────────────────────────────────
  if (state === 'no_driver') {
    return (
      <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-yellow-100 rounded-full p-4">
            <AlertCircle className="w-9 h-9 text-yellow-600" />
          </div>
        </div>
        <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-2">Aucun livreur disponible pour l'instant</h3>
        <p className="text-sm text-[#6B7280]">
          Pas d'inquiétude : notre équipe a été alertée et va assigner un livreur manuellement.
          Vous serez notifié dès qu'un livreur prend en charge votre colis.
        </p>
      </div>
    );
  }

  // ─── Livreur assigné ─────────────────────────────────────────────────────
  const driverPos =
    driver && driver.latitude !== null && driver.longitude !== null
      ? ([driver.latitude, driver.longitude] as [number, number])
      : null;
  const pickupPos =
    pickup && pickup.latitude !== null && pickup.longitude !== null
      ? ([pickup.latitude, pickup.longitude] as [number, number])
      : null;

  let etaText: string | null = null;
  if (driverPos && pickupPos) {
    const km = haversineKm(driverPos[0], driverPos[1], pickupPos[0], pickupPos[1]);
    const minutes = Math.max(1, Math.round((km / 18) * 60)); // ~18 km/h en ville
    etaText = km < 0.2 ? 'Le livreur est arrivé' : `~${minutes} min · ${km.toFixed(1)} km`;
  }

  const mapCenter = driverPos || pickupPos;

  return (
    <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <span className="font-bold text-green-800 text-sm">Un livreur a accepté votre course</span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-orange-100 rounded-full w-14 h-14 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-[#FF6C00]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[#1A1A1A] text-lg truncate">
              {driver?.first_name} {driver?.last_name}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
              <VehicleIcon type={driver?.vehicle_type || ''} className="w-4 h-4" />
              {vehicleLabel(driver?.vehicle_type || '')}
              {driver?.license_plate && <span className="font-mono">· {driver.license_plate}</span>}
            </div>
          </div>
          {driver?.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors font-semibold flex-shrink-0"
            >
              <Phone className="w-4 h-4" /> Appeler
            </a>
          )}
        </div>

        {etaText && (
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] bg-[#FFF8F2] border border-[#FFE4D0] rounded-lg px-4 py-2.5 mb-4">
            <MapPin className="w-4 h-4 text-[#FF6C00]" />
            {etaText}
          </div>
        )}

        {mapCenter ? (
          <div className="rounded-lg overflow-hidden border border-[#E5E7EB]" style={{ height: 260 }}>
            <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {driverPos && (
                <Marker position={driverPos} icon={driverIcon}>
                  <Popup>Votre livreur</Popup>
                </Marker>
              )}
              {pickupPos && (
                <Marker position={pickupPos} icon={pickupIcon}>
                  <Popup>Point de ramassage</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-4">
            Le livreur est en route. Sa position s'affichera dès qu'il active son GPS.
          </p>
        )}
      </div>
    </div>
  );
}
