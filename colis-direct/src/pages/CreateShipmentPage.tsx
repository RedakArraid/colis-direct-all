import { useEffect, useMemo, useState } from 'react';
import { MapPin, Package, CheckCircle, ArrowLeft, Layers, Check } from 'lucide-react';
import AuthChoiceStep from '../components/shipment/AuthChoiceStep';
import ShipmentForm from '../components/shipment/ShipmentForm';
import RelaySelection from '../components/shipment/RelaySelection';
import PaymentSummaryStep, { type PromoInfo } from '../components/shipment/PaymentSummaryStep';
import AutomatedPaymentStep from '../components/shipment/AutomatedPaymentStep';
import ConfirmationStep from '../components/shipment/ConfirmationStep';
import DeliveryModeSelector, { type DeliveryModeKey } from '../components/DeliveryModeSelector';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../lib/api';
import { usePricing } from '../hooks/usePricing';
import { toast } from 'react-toastify';

type Step = 'auth-choice' | 'form' | 'delivery-mode' | 'relay' | 'summary' | 'automated-payment' | 'confirmation';

interface CreateShipmentPageProps {
  onNavigate: (page: string) => void;
}

export type ShipmentFormData = {
  sender_first_name: string;
  sender_last_name: string;
  sender_email: string;
  sender_phone: string;
  sender_commune: string;
  sender_quartier: string;
  sender_address: string;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_commune: string;
  recipient_quartier: string;
  recipient_address: string;
  grid_type: 'courier' | 'colis';
  package_type: 'petit' | 'moyen' | 'grand';
  weight: number;
  is_fragile: boolean;
  home_delivery: boolean;
  is_insured: boolean;
  pickup_method?: 'relay_deposit' | 'home_pickup';
  sender_repere?: string;
  recipient_repere?: string;
};

// Note: Le pickup_code est généré côté backend lors de la première réception du colis au relais.
// Il ne doit pas être généré côté frontend.

function CreateShipmentPage({ onNavigate }: CreateShipmentPageProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { calculatePrice, loading: pricingLoading, homeDeliverySupplement } = usePricing();
  const [currentStep, setCurrentStep] = useState<Step>(user ? 'form' : 'auth-choice');
  const [formData, setFormData] = useState<ShipmentFormData | null>(null);
  const [selectedPickupRelay, setSelectedPickupRelay] = useState<string | null>(null);
  const [selectedDeliveryRelay, setSelectedDeliveryRelay] = useState<string | null>(null);
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<DeliveryModeKey | null>(null);
  const [marketplacePrice, setMarketplacePrice] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [pickupCode, setPickupCode] = useState<string>('');
  const [shipmentCode, setShipmentCode] = useState<string>('');

  const [paymentOptions, setPaymentOptions] = useState<{
    printOption: 'self' | 'relay';
    needBox: boolean;
    promoCode: string;
  } | null>(null);
  const [automatedPaymentContext, setAutomatedPaymentContext] = useState<{
    trackingNumber: string;
    amountFcfa: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);
  const [relayCashPendingTracking, setRelayCashPendingTracking] = useState<string | null>(null);
  const [promoCodeEnabled, setPromoCodeEnabled] = useState(true);
  const [senderCoords, setSenderCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Position GPS expéditeur (ramassage à domicile) — utilisée pour le suivi livreur
  useEffect(() => {
    if (formData?.pickup_method !== 'home_pickup' || senderCoords) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setSenderCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { /* refus GPS : le dispatch utilise la commune */ },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [formData?.pickup_method, senderCoords]);

  useEffect(() => {
    api.getPublicSettings().then(({ data }) => {
      if (data) setPromoCodeEnabled(data.promoCodeEnabled);
    });
  }, []);

  const baseSteps: { id: Step; label: string; icon: any }[] = [
    { id: 'form', label: 'Informations', icon: Package },
    { id: 'delivery-mode', label: 'Mode', icon: Layers },
    { id: 'relay', label: 'Points relais', icon: MapPin },
    { id: 'summary', label: 'Récapitulatif', icon: CheckCircle },
    { id: 'confirmation', label: 'Confirmation', icon: CheckCircle },
  ];

  const steps = useMemo(() => baseSteps, []);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const computedBasePrice = useMemo(() => {
    if (!formData) return 0;
    if (pricingLoading) {
      const isIntra = formData.sender_commune === formData.recipient_commune &&
        formData.sender_commune !== '' && formData.sender_commune !== 'Autre';
      let base = formData.package_type === 'petit'
        ? (isIntra ? 600 : 1000)
        : (isIntra ? 1000 : 1500);
      if (formData.is_fragile) base += 500;
      if (formData.home_delivery) base += homeDeliverySupplement;
      return base;
    }
    return calculatePrice(
      formData.package_type,
      formData.weight,
      formData.sender_commune,
      formData.recipient_commune,
      formData.is_fragile,
      false,
      formData.home_delivery,
      undefined,
      formData.grid_type,
    );
  }, [formData, pricingLoading, calculatePrice, homeDeliverySupplement]);

  const effectiveBasePrice = useMemo(() => {
    if (marketplacePrice !== null) return marketplacePrice;
    return computedBasePrice;
  }, [marketplacePrice, computedBasePrice]);

  const handleFormSubmit = (data: ShipmentFormData) => {
    setFormData(data);
    setCurrentStep('delivery-mode');
  };

  const handleDeliveryModeSelect = (
    mode: DeliveryModeKey,
    price: number,
    pickupMethod: string,
    homeDelivery: boolean
  ) => {
    if (!formData) return;
    setSelectedDeliveryMode(mode);
    setMarketplacePrice(price);
    const updatedData = {
      ...formData,
      pickup_method: pickupMethod as 'relay_deposit' | 'home_pickup',
      home_delivery: homeDelivery,
    };
    setFormData(updatedData);
    if (homeDelivery) {
      // relay→home and home→home: no destination relay to pick, go straight to summary
      setSelectedPickupRelay(null);
      setSelectedDeliveryRelay(null);
      setPaymentOptions({ printOption: 'self', needBox: false, promoCode: '' });
      setCurrentStep('summary');
    } else {
      setCurrentStep('relay');
    }
  };

  const handleRelaySelection = (deliveryId: string, originId: string | null) => {
    setSelectedPickupRelay(originId);
    setSelectedDeliveryRelay(deliveryId);
    setPaymentOptions({ printOption: 'self', needBox: false, promoCode: '' });
    setCurrentStep('summary');
  };

  const handlePaymentComplete = (tracking: string, options?: { relayCashPending?: boolean }) => {
    setTrackingNumber(tracking);
    if (!options?.relayCashPending) {
      setRelayCashPendingTracking(null);
    }
    setCurrentStep('confirmation');
  };

  const handleSaveRecipient = async (data: Partial<ShipmentFormData>) => {
    if (!user) return;
    try {
      const { error } = await api.createRecipientAddress({
        label: `${data.recipient_first_name} ${data.recipient_last_name}`,
        first_name: data.recipient_first_name || '',
        last_name: data.recipient_last_name || '',
        email: data.recipient_email || '',
        phone: data.recipient_phone || '',
        commune: data.recipient_commune || '',
        quartier: data.recipient_quartier || '',
        address: data.recipient_address || '',
        is_default: false,
      });
      if (error) throw new Error(error);
    } catch (err: any) {
      console.error('Error saving recipient:', err);
      throw err;
    }
  };

  const getBackDestination = () => {
    if (user?.role === 'pro') return 'pro-dashboard';
    if (user?.role === 'relay_partner') return 'relay-dashboard';
    if (user?.role === 'transporter') return 'transporter-login';
    if (user?.role === 'admin') return 'admin-dashboard';
    if (user?.role === 'support') return 'support-dashboard';
    return 'home';
  };

  const stepLabels = ['Type de livraison', 'Détails du colis', 'Adresses', 'Paiement'];

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back + Title */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate(getBackDestination())}
            className="flex items-center gap-2 mb-4 text-[#6B7280] hover:text-[#FF6C00] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">Créer un envoi</h1>
          <p className="text-[#6B7280] mt-1">Quelques étapes pour préparer votre colis.</p>
        </div>

        {/* Stepper — only show for non-auth steps */}
        {currentStep !== 'auth-choice' && currentStep !== 'confirmation' && (
          <div className="flex items-center gap-0 mb-8">
            {stepLabels.map((label, i) => {
              const stepMap = ['form', 'delivery-mode', 'relay', 'summary'];
              const stepId = stepMap[i] as Step;
              const stepIdx = steps.findIndex(s => s.id === stepId);
              const isDone = stepIdx < currentStepIndex;
              const isActive = stepIdx === currentStepIndex;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-all ${
                        isDone
                          ? 'bg-[#FF6C00] border-2 border-[#FF6C00] text-white'
                          : isActive
                          ? 'bg-[#FF6C00] border-2 border-[#FF6C00] text-white'
                          : 'bg-white border-2 border-[#E6E6E6] text-[#6B7280]'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span
                      className={`mt-1.5 text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${
                        isActive ? 'text-[#FF6C00]' : isDone ? 'text-[#3A3A3A]' : 'text-[#6B7280]'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-4 ${isDone ? 'bg-[#FF6C00]' : 'bg-[#E6E6E6]'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step content */}
        <div className="card p-6 sm:p-8">
          {currentStep === 'auth-choice' && (
            <AuthChoiceStep
              onLogin={() => onNavigate('login')}
              onContinueWithoutLogin={() => setCurrentStep('form')}
            />
          )}

          {currentStep === 'form' && (
            <ShipmentForm
              onSubmit={handleFormSubmit}
              onSaveRecipient={handleSaveRecipient}
              onNavigate={onNavigate}
              initialData={formData}
            />
          )}

          {currentStep === 'delivery-mode' && formData && (
            <div className="space-y-6">
              <DeliveryModeSelector
                weight={formData.weight}
                senderCommune={formData.sender_commune}
                recipientCommune={formData.recipient_commune}
                selectedMode={selectedDeliveryMode}
                onSelect={handleDeliveryModeSelect}
                gridType={formData.grid_type}
                packageSize={
                  formData.grid_type === 'courier'
                    ? 'courrier'
                    : formData.package_type
                }
              />
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('form')}
                  className="btn-outline flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
                {selectedDeliveryMode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData || !selectedDeliveryMode) return;
                      handleDeliveryModeSelect(
                        selectedDeliveryMode,
                        effectiveBasePrice,
                        formData.pickup_method || 'relay_deposit',
                        formData.home_delivery,
                      );
                    }}
                    className="btn-primary text-sm"
                  >
                    Continuer
                  </button>
                )}
              </div>
            </div>
          )}

          {currentStep === 'relay' && formData && (
            <RelaySelection
              formData={formData}
              onComplete={handleRelaySelection}
              onBack={() => setCurrentStep('delivery-mode')}
              initialDeliveryId={selectedDeliveryRelay}
              initialPickupId={selectedPickupRelay}
            />
          )}

          {currentStep === 'summary' && formData && paymentOptions && (
            <PaymentSummaryStep
              formData={formData}
              pickupRelayId={selectedPickupRelay || ''}
              deliveryRelayId={selectedDeliveryRelay || ''}
              price={effectiveBasePrice}
              printingFee={paymentOptions.printOption === 'relay' ? 100 : 0}
              assistanceFee={0}
              boxPrice={paymentOptions.needBox ? 200 : 0}
              promoCode=""
              totalPrice={effectiveBasePrice + (paymentOptions.printOption === 'relay' ? 100 : 0) + (paymentOptions.needBox ? 200 : 0)}
              promoCodeEnabled={promoCodeEnabled}
              homeDeliverySupplement={homeDeliverySupplement}
              onAddToCart={(promoInfo: PromoInfo) => {
                const printingFee = paymentOptions?.printOption === 'relay' ? 100 : 0;
                const boxPrice = paymentOptions?.needBox ? 200 : 0;
                const totalBeforePromo = effectiveBasePrice + printingFee + boxPrice;
                const totalPrice = promoInfo.promoFree ? 0 : totalBeforePromo;

                addToCart({
                  id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  formData,
                  paymentOptions: {
                    ...paymentOptions || { printOption: 'self', needBox: false },
                    promoCode: promoInfo.code,
                    promoFree: promoInfo.promoFree,
                  },
                  pickupRelayId: selectedPickupRelay || null,
                  deliveryRelayId: selectedDeliveryRelay || null,
                  price: effectiveBasePrice,
                  printingFee,
                  boxPrice,
                  totalPrice,
                  createdAt: Date.now(),
                });

                alert('Envoi ajouté au panier !');
                onNavigate('cart');
              }}
              onPayment={async (paymentMethod, promoInfo: PromoInfo) => {
                const printingFee = paymentOptions?.printOption === 'relay' ? 100 : 0;
                const boxPrice = paymentOptions?.needBox ? 200 : 0;
                const totalBeforePromo = effectiveBasePrice + printingFee + boxPrice;
                const isPromoFree = promoInfo.promoFree;
                const discountAmount = isPromoFree
                  ? totalBeforePromo
                  : promoInfo.discount_type === 'percentage'
                    ? Math.round(totalBeforePromo * promoInfo.discount_value / 100)
                    : promoInfo.discount_type === 'fixed'
                      ? Math.min(promoInfo.discount_value, totalBeforePromo)
                      : 0;
                const totalPrice = Math.max(0, totalBeforePromo - discountAmount);

                if (totalPrice === 0) {
                  paymentMethod = null;
                } else if (!paymentMethod) {
                  toast.error('Veuillez sélectionner un moyen de paiement');
                  return;
                }

                try {
                  const clientTrackingNumber = 'CD' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 6).toUpperCase();
                  setPickupCode('');
                  setRelayCashPendingTracking(null);

                  const shipmentBase = {
                    sender_first_name: formData.sender_first_name,
                    sender_last_name: formData.sender_last_name,
                    sender_email: formData.sender_email || null,
                    sender_phone: formData.sender_phone,
                    sender_commune: formData.sender_commune,
                    sender_quartier: formData.sender_quartier,
                    sender_address: formData.sender_address,
                    recipient_first_name: formData.recipient_first_name,
                    recipient_last_name: formData.recipient_last_name,
                    recipient_email: formData.recipient_email || null,
                    recipient_phone: formData.recipient_phone,
                    recipient_commune: formData.recipient_commune,
                    recipient_quartier: formData.recipient_quartier,
                    recipient_address: formData.recipient_address,
                    sender_repere: formData.sender_repere || null,
                    recipient_repere: formData.recipient_repere || null,
                    package_type: formData.package_type,
                    grid_type: formData.grid_type,
                    weight: formData.weight,
                    print_at_relay: paymentOptions?.printOption === 'relay',
                    relay_assisted: false,
                    home_delivery: formData.home_delivery || false,
                    pickup_method: formData.pickup_method,
                    origin_relay_id: formData.pickup_method === 'home_pickup' ? null : (selectedPickupRelay || null),
                    destination_relay_id: selectedDeliveryRelay || null,
                    ...(formData.pickup_method === 'home_pickup' && senderCoords
                      ? { sender_latitude: senderCoords.latitude, sender_longitude: senderCoords.longitude }
                      : {}),
                  };

                  if (isPromoFree) {
                    const { data, error } = await api.createShipment({
                      ...shipmentBase,
                      price: 0,
                      printing_fee: 0,
                      assistance_fee: 0,
                      payment_status: 'paid',
                      payment_method: null,
                      promo_code: promoInfo.code || undefined,
                    });
                    if (error) throw new Error(error);
                    const shipment = data as any;
                    const finalTn = shipment?.tracking_number || clientTrackingNumber;
                    if (shipment?.shipment_code) setShipmentCode(shipment.shipment_code);
                    handlePaymentComplete(finalTn);
                  } else if (paymentMethod === 'paystack') {
                    const { data, error } = await api.createShipment({
                      ...shipmentBase,
                      price: Math.max(0, effectiveBasePrice - discountAmount),
                      printing_fee: printingFee,
                      assistance_fee: 0,
                      box_price: boxPrice,
                      payment_status: 'pending',
                      payment_method: paymentMethod,
                      promo_code: promoInfo.code || undefined,
                    });
                    if (error) throw new Error(error);
                    const shipment = data as any;
                    const finalTn = shipment?.tracking_number || clientTrackingNumber;
                    if (shipment?.shipment_code) setShipmentCode(shipment.shipment_code);
                    setTrackingNumber(finalTn);
                    setAutomatedPaymentContext({
                      trackingNumber: finalTn,
                      amountFcfa: totalPrice,
                      customerName: `${formData.sender_first_name} ${formData.sender_last_name}`.trim(),
                      customerEmail: formData.sender_email || user?.email || '',
                      customerPhone: formData.sender_phone,
                    });
                    setCurrentStep('automated-payment');
                    return;
                  } else if (paymentMethod === 'relay_cash') {
                    const { data, error } = await api.createShipment({
                      ...shipmentBase,
                      price: Math.max(0, effectiveBasePrice - discountAmount),
                      printing_fee: printingFee,
                      assistance_fee: 0,
                      box_price: boxPrice,
                      payment_status: 'pending',
                      payment_method: 'relay_cash',
                      promo_code: promoInfo.code || undefined,
                    });
                    if (error) throw new Error(error);
                    const shipment = data as any;
                    const finalTn = shipment?.tracking_number || clientTrackingNumber;
                    if (shipment?.shipment_code) setShipmentCode(shipment.shipment_code);
                    setRelayCashPendingTracking(finalTn);
                    handlePaymentComplete(finalTn, { relayCashPending: true });
                  } else {
                    toast.error('Moyen de paiement non reconnu.');
                  }
                } catch (error: any) {
                  console.error('Erreur lors du paiement:', error);
                  toast.error(`Erreur lors du paiement: ${error.message || 'Erreur inconnue'}`);
                }
              }}
              onBack={() => {
                // home_delivery (relay→home and home→home) skip relay, back to delivery-mode
                // relay→relay and home→relay went through relay
                if (formData.home_delivery) {
                  setCurrentStep('delivery-mode');
                } else {
                  setCurrentStep('relay');
                }
              }}
            />
          )}

          {currentStep === 'confirmation' && formData && (
            <ConfirmationStep
              trackingNumber={trackingNumber}
              relayCashPendingTracking={relayCashPendingTracking}
              onNavigate={onNavigate}
              pickupCode={pickupCode}
              shipmentCode={shipmentCode}
              recipientInfo={{
                firstName: formData.recipient_first_name,
                lastName: formData.recipient_last_name,
                phone: formData.recipient_phone,
              }}
              pickupMethod={formData.pickup_method}
              homeDelivery={formData.home_delivery}
            />
          )}
        </div>
      </div>

      {/* Modal de paiement en ligne (Paystack Inline) pour l'étape automated-payment */}
      {currentStep === 'automated-payment' && automatedPaymentContext && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <AutomatedPaymentStep
            trackingNumber={automatedPaymentContext.trackingNumber}
            amountFcfa={automatedPaymentContext.amountFcfa}
            customerName={automatedPaymentContext.customerName}
            customerEmail={automatedPaymentContext.customerEmail}
            customerPhone={automatedPaymentContext.customerPhone}
            onBack={() => setCurrentStep('summary')}
          />
        </div>
      )}
    </div>
  );
}

export default CreateShipmentPage;
