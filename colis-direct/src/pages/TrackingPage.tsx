import { useState, useEffect, useRef } from 'react';
import {
  Search, Package, Truck, MapPin, CheckCircle, Clock, XCircle,
  AlertTriangle, Home, Store, ArrowLeft, Phone, Navigation,
} from 'lucide-react';
import { api } from '../lib/api';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { normalizePaymentStatus, getPaymentStatusLabel } from '../utils/shipmentStatus';
import DepositRelayFinder from '../components/shipment/DepositRelayFinder';

// ─── Step definitions ─────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  label: string;
  sublabel: string;
  statuses: string[];
}

const RELAY_STEPS: StepDef[] = [
  {
    id: 'created',
    label: 'Commande créée',
    sublabel: 'En attente de dépôt',
    statuses: ['READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY'],
  },
  {
    id: 'origin_relay',
    label: 'Déposé au relais',
    sublabel: 'Pris en charge au départ',
    statuses: ['RELAY_ORIGIN_RECEIVED', 'PAYMENT_RECEIVED_AT_RELAY'],
  },
  {
    id: 'transit',
    label: 'En transit',
    sublabel: 'Acheminement en cours',
    statuses: ['CARRIER_COLLECTED', 'IN_TRANSIT'],
  },
  {
    id: 'dest_relay',
    label: 'Au relais de livraison',
    sublabel: 'Disponible au retrait',
    statuses: ['RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP'],
  },
  {
    id: 'done',
    label: 'Retiré',
    sublabel: 'Livraison terminée',
    statuses: ['PICKED_UP_BY_CUSTOMER'],
  },
];

// Livraison à domicile avec dépôt au relais d'origine
const HOME_STEPS_RELAY: StepDef[] = [
  {
    id: 'created',
    label: 'Commande créée',
    sublabel: 'En attente de dépôt',
    statuses: ['READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY'],
  },
  {
    id: 'origin_relay',
    label: 'Déposé au relais',
    sublabel: 'Pris en charge au départ',
    statuses: ['RELAY_ORIGIN_RECEIVED', 'PAYMENT_RECEIVED_AT_RELAY'],
  },
  {
    id: 'transit',
    label: 'En transit',
    sublabel: 'Acheminement en cours',
    statuses: ['CARRIER_COLLECTED', 'IN_TRANSIT'],
  },
  {
    id: 'done',
    label: 'Livré à domicile',
    sublabel: 'Livraison terminée',
    statuses: ['DELIVERED', 'DELIVERED_TO_CUSTOMER'],
  },
];

// Flux home_pickup → relais de livraison
// Transporteur ramasse chez l'expéditeur, dépose directement au relais de livraison
const HOME_PICKUP_STEPS_RELAY: StepDef[] = [
  {
    id: 'created',
    label: 'Commande créée',
    sublabel: 'En attente de ramassage',
    statuses: ['PICKUP_PENDING', 'READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP'],
  },
  {
    id: 'pickup',
    label: 'Ramassage',
    sublabel: 'Collecté chez l\'expéditeur',
    statuses: ['CARRIER_COLLECTED'],
  },
  {
    id: 'transit',
    label: 'En transit',
    sublabel: 'En route vers le relais de livraison',
    statuses: ['IN_TRANSIT'],
  },
  {
    id: 'dest_relay',
    label: 'Au relais de livraison',
    sublabel: 'Disponible au retrait',
    statuses: ['RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP'],
  },
  {
    id: 'done',
    label: 'Retiré',
    sublabel: 'Livraison terminée',
    statuses: ['PICKED_UP_BY_CUSTOMER'],
  },
];

// Flux home_pickup → domicile
// Transporteur ramasse chez l'expéditeur, livre directement au destinataire
const HOME_STEPS_DIRECT: StepDef[] = [
  {
    id: 'created',
    label: 'Commande créée',
    sublabel: 'En attente de ramassage',
    statuses: ['PICKUP_PENDING', 'READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP'],
  },
  {
    id: 'pickup',
    label: 'Ramassage',
    sublabel: 'Collecté chez l\'expéditeur',
    statuses: ['CARRIER_COLLECTED'],
  },
  {
    id: 'transit',
    label: 'En transit',
    sublabel: 'Acheminement en cours',
    statuses: ['IN_TRANSIT'],
  },
  {
    id: 'done',
    label: 'Livré à domicile',
    sublabel: 'Livraison terminée',
    statuses: ['DELIVERED', 'DELIVERED_TO_CUSTOMER'],
  },
];

// Statuts "checkpoint" : l'action de l'étape est terminée → l'étape SUIVANTE devient active
const STEP_DONE_STATUSES = new Set([
  'READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY',
  'PICKUP_PENDING',
  'RELAY_ORIGIN_RECEIVED',
  'PICKED_UP_BY_CUSTOMER', 'DELIVERED', 'DELIVERED_TO_CUSTOMER',
]);

function getStepIndex(steps: StepDef[], currentStatus: string): number {
  const upper = (currentStatus || '').toUpperCase();
  const idx = steps.findIndex((s) => s.statuses.includes(upper));
  // Statut inconnu/null → l'étape 1 (dépôt/ramassage) est en cours par défaut
  if (idx === -1) return 1;
  // Si ce statut marque la FIN de l'étape, on active l'étape suivante
  return STEP_DONE_STATUSES.has(upper) ? idx + 1 : idx;
}

// ─── Step icons ───────────────────────────────────────────────────────────────

const STEP_ICONS = [Package, Store, Truck, Store, CheckCircle];
const HOME_STEP_ICONS_RELAY = [Package, Store, Truck, Home];
const HOME_STEP_ICONS_DIRECT = [Package, Home, Truck, Home];         // created, ramassage, transit, livré
const HOME_PICKUP_ICONS_RELAY = [Package, Home, Truck, Store, CheckCircle]; // created, ramassage, transit, relais, retiré

// ─── Status label helpers ─────────────────────────────────────────────────────

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    READY_FOR_DROP_OFF: 'En attente de dépôt',
    PICKUP_PENDING: 'Ramassage à domicile planifié',
    INCIDENT: 'Incident signalé par le transporteur',
    PAYMENT_AWAITING_VALIDATION: 'Paiement en cours de validation',
    PAYMENT_VALIDATED: 'Paiement validé',
    PAYMENT_CONFIRMED_AWAITING_DROP: 'Paiement confirmé — en attente de dépôt',
    RELAY_ORIGIN_RECEIVED: 'Déposé au point relais d\'origine',
    CARRIER_COLLECTED: 'Pris en charge par le transporteur',
    IN_TRANSIT: 'En transit',
    RELAY_FINAL_RECEIVED: 'Arrivé au point relais de livraison',
    AVAILABLE_FOR_PICKUP: 'Disponible au retrait',
    PAYMENT_PENDING_AT_RELAY: 'En attente de paiement au relais',
    PAYMENT_RECEIVED_AT_RELAY: 'Paiement reçu au relais',
    PICKED_UP_BY_CUSTOMER: 'Retiré par le destinataire',
    DELIVERED: 'Livré à domicile',
    DELIVERED_TO_CUSTOMER: 'Livré au destinataire',
    CANCELLED: 'Annulé',
    RETURN_TO_SENDER: 'Retour à l\'expéditeur',
  };
  return map[status.toUpperCase()] || status;
}

function paymentMethodLabel(method?: string): string {
  switch ((method || '').toLowerCase()) {
    case 'mobile_money': return 'Mobile Money';
    case 'relay_cash': return 'Paiement au relais';
    case 'card': return 'Carte bancaire';
    case 'paystack': return 'Paystack';
    case 'cinetpay': return 'CinetPay';
    default: return method || 'Non renseigné';
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TrackingPageProps {
  onNavigate?: (page: string) => void;
}

function TrackingPage({ onNavigate }: TrackingPageProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('trackingNumber');
    if (saved) {
      setTrackingNumber(saved);
      handleTrack(saved);
      localStorage.removeItem('trackingNumber');
    }
  }, []);

  // Auto-refresh pour les statuts non finaux
  useEffect(() => {
    if (!shipment) return;
    const final = ['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'];
    if (final.includes((shipment.current_status || '').toUpperCase())) return;

    const id = setInterval(async () => {
      const { data } = await api.getTracking(shipment.tracking_number);
      if (data) {
        const changed =
          (data.current_status || data.status) !== (shipment.current_status || shipment.status) ||
          (data.events?.length || 0) > (shipment.events?.length || 0);
        if (changed) setShipment(data);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [shipment]);

  const handleTrack = async (number?: string) => {
    const q = (number || trackingNumber).trim().toUpperCase();
    if (!q) { setError('Veuillez entrer un numéro de suivi'); return; }

    setLoading(true);
    setError('');
    setShipment(null);

    const { data, error: err } = await api.getTracking(q);
    setLoading(false);

    if (err) {
      const notFound = err.toLowerCase().includes('not found') || err.toLowerCase().includes('introuvable');
      setError(notFound
        ? 'Aucun colis trouvé avec ce numéro de suivi. Vérifiez le numéro et réessayez.'
        : `Erreur lors de la recherche : ${err}`);
      return;
    }
    if (!data) {
      setError('Aucun colis trouvé avec ce numéro de suivi. Vérifiez le numéro et réessayez.');
      return;
    }
    setShipment(data);
    // Scroll vers le résultat après un court délai (le temps que le DOM se mette à jour)
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const currentStatus = (shipment?.current_status || shipment?.status || '').toUpperCase();
  const isHomeDelivery = !!shipment?.home_delivery;
  const isHomePickup = (shipment?.pickup_method || '') === 'home_pickup';
  const hasOriginRelay = !!shipment?.origin_relay_id;

  // Routing des étapes selon le mode de collecte ET le mode de livraison :
  // home_pickup + relay  → HOME_PICKUP_STEPS_RELAY (transporter dépose au relais dest)
  // home_pickup + home   → HOME_STEPS_DIRECT       (transporter livre à domicile)
  // relay_deposit + home → HOME_STEPS_RELAY         (dépôt relais → transit → domicile)
  // relay_deposit + relay→ RELAY_STEPS              (flux complet relais)
  let steps: StepDef[];
  let stepIcons: typeof STEP_ICONS;
  if (isHomePickup) {
    if (isHomeDelivery) {
      steps = HOME_STEPS_DIRECT;
      stepIcons = HOME_STEP_ICONS_DIRECT;
    } else {
      steps = HOME_PICKUP_STEPS_RELAY;
      stepIcons = HOME_PICKUP_ICONS_RELAY;
    }
  } else {
    // relay_deposit
    if (isHomeDelivery) {
      steps = hasOriginRelay ? HOME_STEPS_RELAY : HOME_STEPS_RELAY;
      stepIcons = HOME_STEP_ICONS_RELAY;
    } else {
      steps = RELAY_STEPS;
      stepIcons = STEP_ICONS;
    }
  }
  const activeStep = shipment ? getStepIndex(steps, currentStatus) : -1;

  // Sublabel du banner adapté selon le statut exact (RELAY_FINAL_RECEIVED ≠ disponible)
  const activeBannerSublabel = currentStatus === 'RELAY_FINAL_RECEIVED'
    ? 'Arrivé au relais, mise à disposition en cours'
    : steps[activeStep]?.sublabel ?? '';

  const isCancelled = currentStatus === 'CANCELLED';
  const isReturn = currentStatus === 'RETURN_TO_SENDER';
  const isException = isCancelled || isReturn;

  const events: any[] = shipment?.events
    ? [...shipment.events].sort(
        (a: any, b: any) =>
          new Date(b.timestamp || b.created_at).getTime() -
          new Date(a.timestamp || a.created_at).getTime()
      )
    : [];

  const paymentNorm = normalizePaymentStatus(shipment?.payment_status);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Hero with search ─────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #FF6C00, #FF8C33)', color: '#fff', padding: '60px 40px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: 0 }}>
            Suivez votre colis en temps réel
          </h1>
          <p style={{ fontSize: 16, opacity: 0.95, marginTop: 12, marginBottom: 0 }}>
            Entrez votre numéro de suivi pour connaître l'avancement de votre livraison.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); handleTrack(); }}
            style={{
              background: '#fff', borderRadius: 14, padding: 8, marginTop: 24,
              display: 'flex', gap: 8, maxWidth: 620,
            }}
          >
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              placeholder="Ex: CD12345678ABCD"
              style={{
                flex: 1, border: 'none', outline: 'none',
                padding: '0 16px', fontSize: 15, color: '#1A1A1A',
                fontFamily: 'monospace', letterSpacing: '0.05em',
                background: 'transparent',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#000', color: '#fff', border: 'none',
                padding: '12px 22px', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                opacity: loading ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Search className="w-4 h-4" />
              {loading ? 'Recherche...' : 'Suivre mon colis'}
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-sm text-white" style={{ maxWidth: 620 }}>
              {error}
            </div>
          )}
        </div>
      </section>

      {/* ── Tracking result ──────────────────────────────────────────────── */}
      {!shipment && (
        <div className="flex-1 flex items-center justify-center py-16 text-[#9CA3AF]">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Entrez un numéro de suivi pour commencer</p>
          </div>
        </div>
      )}

      {shipment && (
        <section ref={resultRef} className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full" style={{ background: '#fff' }}>

          {/* Package header card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-5 h-5 text-[#FF6C00]" />
                  <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Numéro de suivi</span>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] font-mono tracking-wider">
                  {shipment.tracking_number}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Créé le {new Date(shipment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2">
                {/* Delivery type badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isHomeDelivery
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  {isHomeDelivery ? <Home className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                  {isHomeDelivery ? 'Livraison à domicile' : 'Retrait en point relais'}
                </span>

                {/* Payment badge */}
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  paymentNorm === 'paid'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : paymentNorm === 'cancelled'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {getPaymentStatusLabel(paymentNorm)} · {paymentMethodLabel(shipment.payment_method)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Exception states ─────────────────────────────────────────── */}
          {isException && (
            <div className={`rounded-2xl border-2 p-6 flex items-start gap-4 ${
              isCancelled
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              {isCancelled
                ? <XCircle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
                : <ArrowLeft className="w-8 h-8 text-yellow-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-lg font-bold mb-1 ${isCancelled ? 'text-red-700' : 'text-yellow-700'}`}>
                  {isCancelled ? 'Envoi annulé' : 'Retour à l\'expéditeur'}
                </p>
                <p className={`text-sm ${isCancelled ? 'text-red-600' : 'text-yellow-600'}`}>
                  {isCancelled
                    ? 'Cet envoi a été annulé. Contactez le service client pour plus d\'informations.'
                    : 'Ce colis est en cours de retour vers l\'expéditeur.'}
                </p>
              </div>
            </div>
          )}

          {/* ── Progress timeline ─────────────────────────────────────────── */}
          {!isException && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5 sm:p-8">
              <h2 className="text-base font-bold text-[#1A1A1A] mb-6">Progression du colis</h2>

              {/* Desktop: horizontal steps */}
              <div className="hidden sm:flex items-start">
                {steps.map((step, idx) => {
                  const StepIcon = stepIcons[idx] || Package;
                  const done = idx < activeStep;
                  const active = idx === activeStep && activeStep < steps.length;
                  const upcoming = idx > activeStep;

                  return (
                    <div key={step.id} className="flex-1 flex flex-col items-center relative">
                      {/* Connector line */}
                      {idx < steps.length - 1 && (
                        <div className="absolute top-5 left-1/2 w-full h-0.5 z-0"
                          style={{ background: done ? '#FF6C00' : '#E5E7EB' }}
                        />
                      )}

                      {/* Circle */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        done
                          ? 'bg-[#FF6C00] border-[#FF6C00]'
                          : active
                          ? 'bg-white border-[#FF6C00] shadow-lg shadow-orange-100'
                          : 'bg-white border-[#E6E6E6]'
                      }`}>
                        {done ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <StepIcon className={`w-5 h-5 ${active ? 'text-[#FF6C00]' : 'text-[#D1D5DB]'}`} />
                        )}
                        {active && (
                          <span className="absolute -inset-1 rounded-full border-2 border-[#FF6C00] animate-ping opacity-30" />
                        )}
                      </div>

                      {/* Labels */}
                      <div className={`mt-3 text-center px-1 ${upcoming ? 'opacity-40' : ''}`}>
                        <p className={`text-xs font-bold leading-tight ${active ? 'text-[#FF6C00]' : done ? 'text-[#3A3A3A]' : 'text-[#9CA3AF]'}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5 leading-tight">{step.sublabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile: vertical steps */}
              <div className="flex flex-col sm:hidden gap-0">
                {steps.map((step, idx) => {
                  const StepIcon = stepIcons[idx] || Package;
                  const done = idx < activeStep;
                  const active = idx === activeStep && activeStep < steps.length;
                  const upcoming = idx > activeStep;
                  const isLast = idx === steps.length - 1;

                  return (
                    <div key={step.id} className="flex gap-4">
                      {/* Icon column */}
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 ${
                          done
                            ? 'bg-[#FF6C00] border-[#FF6C00]'
                            : active
                            ? 'bg-white border-[#FF6C00]'
                            : 'bg-white border-[#E6E6E6]'
                        }`}>
                          {done ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <StepIcon className={`w-4 h-4 ${active ? 'text-[#FF6C00]' : 'text-[#D1D5DB]'}`} />
                          )}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[2rem] mt-1 ${done ? 'bg-[#FF6C00]' : 'bg-[#E6E6E6]'}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-6 pt-1 ${upcoming ? 'opacity-40' : ''} ${isLast ? 'pb-0' : ''}`}>
                        <p className={`text-sm font-bold ${active ? 'text-[#FF6C00]' : done ? 'text-[#3A3A3A]' : 'text-[#9CA3AF]'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{step.sublabel}</p>
                        {active && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#FF6C00] bg-orange-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Étape en cours
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current step banner */}
              <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FF6C00] animate-pulse shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#FF6C00]">
                    Étape actuelle : {steps[activeStep]?.label}
                  </p>
                  <p className="text-xs text-orange-600">{activeBannerSublabel}</p>
                </div>
              </div>

              {/* Deposit relay finder — visible uniquement pour relay_deposit en attente de dépôt */}
              {!isHomePickup && (currentStatus === 'READY_FOR_DROP_OFF' || currentStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP') && (
                <DepositRelayFinder
                  destinationRelayId={shipment.destination_relay?.id || (shipment as any).destination_relay_id}
                  shipmentTrackingNumber={shipment.tracking_number}
                />
              )}
            </div>
          )}

          {/* ── Event log ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#1A1A1A] mb-5">Historique des événements</h2>

            {events.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-6">Aucun événement de suivi pour l'instant.</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-px bg-[#F6F7F9]" />

                <div className="space-y-0">
                  {events.map((ev: any, idx: number) => {
                    const isFirst = idx === 0;
                    const ts = new Date(ev.timestamp || ev.created_at);
                    const dateStr = ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    const timeStr = ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={idx} className="relative flex gap-4 sm:gap-6 pb-6 last:pb-0">
                        {/* Dot */}
                        <div className="relative z-10 shrink-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center ${
                            isFirst
                              ? 'bg-[#FF6C00] border-[#FF6C00]'
                              : 'bg-white border-[#E6E6E6]'
                          }`}>
                            {isFirst
                              ? <CheckCircle className="w-4 h-4 text-white" />
                              : <Clock className="w-4 h-4 text-[#D1D5DB]" />
                            }
                          </div>
                        </div>

                        {/* Event content */}
                        <div className={`flex-1 rounded-xl p-4 border ${
                          isFirst
                            ? 'bg-orange-50 border-orange-100'
                            : 'bg-[#F6F7F9] border-[#F0F0F0]'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <p className={`text-sm font-bold ${isFirst ? 'text-[#FF6C00]' : 'text-[#3A3A3A]'}`}>
                              {statusLabel(ev.status)}
                            </p>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-[#6B7280]">{dateStr}</p>
                              <p className="text-xs font-semibold text-[#6B7280]">{timeStr}</p>
                            </div>
                          </div>
                          {ev.notes && (
                            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">{ev.notes}</p>
                          )}
                          {ev.location_id && (
                            <p className="text-xs text-[#9CA3AF] mt-1 flex items-center gap-1">
                              <Navigation className="w-3 h-3" /> {ev.location_id}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sender / Recipient ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#F6F7F9] flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
                </div>
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Expéditeur</span>
              </div>
              <p className="font-bold text-[#1A1A1A]">{shipment.sender_first_name} {shipment.sender_last_name}</p>
              <p className="text-sm text-[#6B7280] mt-0.5">{shipment.sender_commune}</p>
              {shipment.sender_phone && (
                <p className="text-sm text-[#9CA3AF] mt-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {shipment.sender_phone}
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6C00]" />
                </div>
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Destinataire</span>
              </div>
              <p className="font-bold text-[#1A1A1A]">{shipment.recipient_first_name} {shipment.recipient_last_name}</p>
              <p className="text-sm text-[#6B7280] mt-0.5">{shipment.recipient_commune}</p>
              {shipment.recipient_phone && (
                <p className="text-sm text-[#9CA3AF] mt-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {shipment.recipient_phone}
                </p>
              )}
            </div>
          </div>

          {/* ── Relay points ──────────────────────────────────────────────── */}
          {(shipment.origin_relay || shipment.destination_relay) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shipment.origin_relay && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                      <Store className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Relais de dépôt</span>
                  </div>
                  <p className="font-bold text-[#1A1A1A]">{shipment.origin_relay.name}</p>
                  <p className="text-sm text-[#6B7280] mt-0.5">{shipment.origin_relay.address}</p>
                  <p className="text-sm text-[#6B7280]">{shipment.origin_relay.quartier}, {shipment.origin_relay.commune}</p>
                  {shipment.origin_relay.phone && (
                    <p className="text-sm text-[#FF6C00] mt-2 flex items-center gap-1 font-medium">
                      <Phone className="w-3.5 h-3.5" /> {shipment.origin_relay.phone}
                    </p>
                  )}
                  {shipment.origin_relay.hours && (
                    <p className="text-xs text-[#9CA3AF] mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {shipment.origin_relay.hours}
                    </p>
                  )}
                </div>
              )}

              {shipment.destination_relay && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#FF6C00]/20 p-5 bg-orange-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                      <Store className="w-3.5 h-3.5 text-[#FF6C00]" />
                    </div>
                    <span className="text-xs font-bold text-[#FF6C00] uppercase tracking-wider">Relais de livraison</span>
                  </div>
                  <p className="font-bold text-[#1A1A1A]">{shipment.destination_relay.name}</p>
                  <p className="text-sm text-[#6B7280] mt-0.5">{shipment.destination_relay.address}</p>
                  <p className="text-sm text-[#6B7280]">{shipment.destination_relay.quartier}, {shipment.destination_relay.commune}</p>
                  {shipment.destination_relay.phone && (
                    <p className="text-sm text-[#FF6C00] mt-2 flex items-center gap-1 font-medium">
                      <Phone className="w-3.5 h-3.5" /> {shipment.destination_relay.phone}
                    </p>
                  )}
                  {shipment.destination_relay.hours && (
                    <p className="text-xs text-[#9CA3AF] mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {shipment.destination_relay.hours}
                    </p>
                  )}
                  {currentStatus === 'AVAILABLE_FOR_PICKUP' && (
                    <div className="mt-3 pt-3 border-t border-orange-100">
                      <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Présentez-vous avec une pièce d'identité et le code de retrait
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Package details ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#1A1A1A] mb-4">Détails du colis</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#F6F7F9] rounded-xl p-3.5">
                <p className="text-xs text-[#9CA3AF] mb-1">Format</p>
                <p className="font-bold text-[#1A1A1A] capitalize">
                  {shipment.package_type === 'petit' ? 'Petit' : shipment.package_type === 'moyen' ? 'Moyen' : 'Grand'}
                </p>
              </div>
              <div className="bg-[#F6F7F9] rounded-xl p-3.5">
                <p className="text-xs text-[#9CA3AF] mb-1">Poids</p>
                <p className="font-bold text-[#1A1A1A]">{shipment.weight} kg</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3.5">
                <p className="text-xs text-orange-400 mb-1">Tarif</p>
                <p className="font-bold text-[#FF6C00]">{shipment.price?.toLocaleString()} FCFA</p>
              </div>
              <div className={`rounded-xl p-3.5 ${
                paymentNorm === 'paid' ? 'bg-green-50' : paymentNorm === 'cancelled' ? 'bg-red-50' : 'bg-yellow-50'
              }`}>
                <p className={`text-xs mb-1 ${
                  paymentNorm === 'paid' ? 'text-green-400' : paymentNorm === 'cancelled' ? 'text-red-400' : 'text-yellow-500'
                }`}>Paiement</p>
                <p className={`font-bold ${
                  paymentNorm === 'paid' ? 'text-green-700' : paymentNorm === 'cancelled' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {getPaymentStatusLabel(paymentNorm)}
                </p>
              </div>
            </div>
          </div>

        </section>
      )}

      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

export default TrackingPage;
