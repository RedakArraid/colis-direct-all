import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Shield, Lock, CheckCircle, XCircle, Loader2, RefreshCw, Check, CreditCard, Wallet } from 'lucide-react';
import { api } from '../../lib/api';

interface PaystackInlinePaymentProps {
  trackingNumber: string;
  amountFcfa: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onBack: () => void;
  onSuccess?: (reference: string) => void;
}

// Declare Paystack on window
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: any) => { openIframe: () => void };
    };
  }
}

type PayStatus = 'idle' | 'loading_sdk' | 'ready' | 'processing' | 'verifying' | 'success' | 'failed' | 'error';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

const FALLBACK_EMAIL = 'paiement@colisdirect.com';

const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed);
};

const getSafeEmail = (email: string | undefined | null): string => {
  if (email && isValidEmail(email)) return email.trim();
  return FALLBACK_EMAIL;
};

const MOBILE_PROVIDERS = [
  { id: 'orange', label: 'Orange Money', color: '#FF6C00', bg: '#FFF3EB', emoji: '🟠', abbr: 'OM', code: '#144#' },
  { id: 'mtn', label: 'MTN MoMo', color: '#FFCC00', bg: '#FFFBE6', emoji: '🟡', abbr: 'MTN', code: '*133#' },
  { id: 'wave', label: 'Wave', color: '#1DB0F5', bg: '#E8F8FF', emoji: '💙', abbr: 'WAV', code: 'App' },
  { id: 'moov', label: 'Moov Money', color: '#003580', bg: '#E8EEFF', emoji: '🔵', abbr: 'MOV', code: '*155#' },
];

export default function PaystackInlinePayment({
  trackingNumber,
  amountFcfa,
  customerName,
  customerEmail,
  customerPhone,
  onBack,
  onSuccess,
}: PaystackInlinePaymentProps) {
  const [status, setStatus] = useState<PayStatus>('loading_sdk');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  
  // Custom states matching the new layout
  const [selectedProvider, setSelectedProvider] = useState<string>('orange');
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState<string>(customerPhone || '');
  const [shipmentDetails, setShipmentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(true);
  
  // Aperçu carte (décoratif) — la saisie réelle se fait dans l'iframe sécurisée Paystack.
  // Ces champs ne sont jamais transmis ; on ne pré-remplit donc aucune donnée factice.
  const [cardNo, setCardNo] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>(customerName || '');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [saveCard, setSaveCard] = useState<boolean>(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [mobileStep, setMobileStep] = useState<number>(1);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toNumeric = (value: any): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  // Load Paystack inline SDK
  useEffect(() => {
    if (window.PaystackPop) {
      setSdkLoaded(true);
      setStatus('ready');
      return;
    }

    const existing = document.getElementById('paystack-inline-sdk');
    if (existing) {
      existing.addEventListener('load', () => { setSdkLoaded(true); setStatus('ready'); });
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-sdk';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => { setSdkLoaded(true); setStatus('ready'); };
    script.onerror = () => {
      setStatus('error');
      setErrorMsg('Impossible de charger le module de paiement. Vérifiez votre connexion internet.');
    };
    document.head.appendChild(script);
  }, []);

  // Fetch Shipment Details on Mount
  useEffect(() => {
    async function loadDetails() {
      try {
        const { data } = await api.getShipments();
        if (data) {
          const found = data.find((s: any) => s.tracking_number === trackingNumber || s.shipment_code === trackingNumber);
          if (found) {
            setShipmentDetails(found);
          }
        }
      } catch (err) {
        console.error("Failed to load shipment details", err);
      } finally {
        setLoadingDetails(false);
      }
    }
    loadDetails();
  }, [trackingNumber]);

  // Verify payment status
  const verifyAndFinalize = useCallback(async (reference: string) => {
    setStatus('verifying');
    setPaymentRef(reference);
    try {
      const { data, error } = await api.verifyPaystackPayment(reference, trackingNumber);
      if (error) throw new Error(error);
      if (data?.paid) {
        setStatus('success');
        if (isMobile) {
          setMobileStep(4);
        }
        sessionStorage.removeItem('last_payment_tracking');
        onSuccess?.(reference);
        
        // Mobile step 4 doesn't redirect immediately to let the user see the receipt
        if (!isMobile) {
          setTimeout(() => {
            sessionStorage.setItem('last_payment_tracking', trackingNumber);
            window.location.href = `${window.location.origin}${window.location.pathname}#/payment-success?tracking=${trackingNumber}&reference=${reference}`;
          }, 2000);
        }
      } else {
        setStatus('failed');
        setErrorMsg('Le paiement n\'a pas été confirmé par l\'opérateur. Veuillez réessayer.');
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMsg(err?.message || 'Erreur lors de la vérification du paiement.');
    }
  }, [trackingNumber, onSuccess, isMobile]);

  // Trigger switch to relay payment (cash)
  const handleSwitchToRelayPayment = async () => {
    setStatus('processing');
    try {
      const { error } = await api.switchToRelayPayment(trackingNumber);
      if (error) throw new Error(error);
      setStatus('success');
      if (isMobile) {
        setMobileStep(4);
      }
      setTimeout(() => {
        onSuccess?.('relay_cash');
        window.location.href = `${window.location.origin}${window.location.pathname}#/payment-success?tracking=${trackingNumber}&method=relay_cash`;
      }, 1500);
    } catch (err: any) {
      setStatus('ready');
      setErrorMsg(err?.message || 'Impossible de basculer vers le paiement au relais.');
    }
  };

  // Open Paystack secure popup
  const openPaystackPopup = useCallback(() => {
    if (!sdkLoaded || !window.PaystackPop) {
      setErrorMsg('Module de paiement non chargé. Rechargez la page et réessayez.');
      return;
    }
    if (!PAYSTACK_PUBLIC_KEY) {
      setErrorMsg('Clé publique Paystack non configurée (VITE_PAYSTACK_PUBLIC_KEY manquant).');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setErrorMsg(null);

    const isCard = selectedProvider === 'card';
    const channels = isCard ? ['card'] : ['mobile_money'];

    const safeEmail = getSafeEmail(customerEmail);
    console.debug('[Paystack] email used:', safeEmail, '| original:', customerEmail);

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: safeEmail,
      amount: Math.round(amountFcfa * 100), // en centimes (kobo)
      currency: 'XOF',
      ref: `PS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      metadata: {
        tracking_number: trackingNumber,
        customer_name: customerName,
        customer_phone: paymentPhoneNumber,
        custom_fields: [
          { display_name: 'N° Suivi', variable_name: 'tracking_number', value: trackingNumber },
          { display_name: 'Client', variable_name: 'customer_name', value: customerName },
          { display_name: 'Téléphone', variable_name: 'customer_phone', value: paymentPhoneNumber },
        ],
      },
      channels: channels,
      callback: (response: any) => {
        verifyAndFinalize(response.reference);
      },
      onClose: () => {
        setStatus('ready');
        setErrorMsg('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.');
      },
    });

    handler.openIframe();
  }, [sdkLoaded, amountFcfa, customerEmail, customerName, paymentPhoneNumber, trackingNumber, selectedProvider, verifyAndFinalize]);

  // Derived values for billing recap
  const basePrice = shipmentDetails ? (toNumeric(shipmentDetails.price) || amountFcfa) : (amountFcfa === 4500 ? 5000 : amountFcfa);
  const discountAmount = shipmentDetails ? toNumeric(shipmentDetails.discount_amount) : (amountFcfa === 4500 ? 500 : 0);
  const insurancePrice = shipmentDetails ? toNumeric(shipmentDetails.insurance_price || shipmentDetails.insurance_fee) : 0;
  const promoCode = shipmentDetails?.coupon_code || (amountFcfa === 4500 ? 'WELCOME10' : '');

  const originCity = shipmentDetails?.sender_commune || 'Abidjan';
  const destCity = shipmentDetails?.recipient_commune || 'Bouaké';
  const recipientName = `${shipmentDetails?.recipient_first_name || ''} ${shipmentDetails?.recipient_last_name || ''}`.trim() || 'Eric Touré';
  
  const deliveryType = (shipmentDetails?.pickup_method === 'home_pickup' ? 'Domicile' : 'Relais') + 
                       ' → ' + 
                       (shipmentDetails?.home_delivery ? 'Domicile' : 'Relais');

  const packageSize = (shipmentDetails?.package_type === 'petit' ? 'Petit' : 
                       shipmentDetails?.package_type === 'moyen' ? 'Moyen' : 
                       shipmentDetails?.package_type === 'grand' ? 'Grand' : 'Courrier') +
                      (shipmentDetails?.weight ? ` · ${shipmentDetails.weight} kg` : ' · 1 kg');

  // Handle mobile navigation / actions
  const handleMobileNext = () => {
    if (selectedProvider === 'relay_cash') {
      handleSwitchToRelayPayment();
    } else if (selectedProvider === 'card') {
      setMobileStep(3);
    } else {
      setMobileStep(2);
    }
  };

  const activeMobileProvider = MOBILE_PROVIDERS.find(p => p.id === selectedProvider);

  // ─── Render Success / Failed Page ───────────────────────────────────────────
  if (status === 'success' && !isMobile) {
    return (
      <div className="cd-pay-wrap">
        <div className="cd-pay-status-card">
          <div className="cd-status-icon cd-success-icon">
            <CheckCircle size={56} />
          </div>
          <h2>Paiement confirmé !</h2>
          <p>Votre envoi <strong>{trackingNumber}</strong> a bien été validé.</p>
          {paymentRef && <p className="cd-ref">Réf : {paymentRef}</p>}
          <div className="cd-status-loader">
            <Loader2 className="spin" size={16} />
            <span>Redirection vers votre récapitulatif…</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="cd-pay-wrap">
        <div className="cd-pay-status-card">
          <div className="cd-status-icon cd-failed-icon">
            <XCircle size={56} />
          </div>
          <h2>Paiement non abouti</h2>
          <p>{errorMsg || 'Une erreur est survenue lors de la validation.'}</p>
          <div className="cd-status-actions">
            <button className="cd-btn cd-btn-primary cd-w-full" onClick={() => { setStatus('ready'); setErrorMsg(null); }}>
              <RefreshCw size={14} /> Réessayer
            </button>
            <button className="cd-btn cd-btn-outline cd-w-full" onClick={onBack}>
              Changer de méthode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cd-pay-wrap {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background-color: #F6F7F9;
          color: #1A1A1A;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 24px 16px;
          box-sizing: border-box;
          width: 100%;
        }

        /* En-tête */
        .cd-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .cd-logo-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .cd-logo-img {
          height: 32px;
          width: auto;
        }

        .cd-logo-title {
          font-weight: 900;
          font-size: 20px;
          color: #1A1A1A;
          letter-spacing: -0.5px;
        }

        .cd-secure-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #16A34A;
          background-color: #F0FDF4;
          color: #16A34A;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        /* Layout Desktop */
        .cd-pay-desktop-layout {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 1100px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
        }

        .cd-stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .cd-step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #9CA3AF;
        }

        .cd-step.completed {
          color: #1A1A1A;
          font-weight: 600;
        }

        .cd-step.active {
          color: #FF6C00;
          font-weight: 700;
        }

        .cd-step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E5E7EB;
          color: #6B7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .cd-step.active .cd-step-num {
          background: #FF6C00;
          color: white;
        }

        .cd-step.completed .cd-step-num {
          background: #FF6C00;
          color: white;
        }

        .cd-step-divider {
          flex: 1;
          max-width: 60px;
          height: 2px;
          background: #E5E7EB;
        }

        .cd-step-divider.completed {
          background: #FF6C00;
        }

        .cd-columns {
          display: grid;
          grid-template-columns: 260px 1fr 320px;
          gap: 28px;
          align-items: start;
        }

        /* Colonne 1: Moyens de paiement */
        .cd-methods-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cd-methods-title {
          font-size: 18px;
          font-weight: 700;
          color: #1A1A1A;
          margin-top: 0;
          margin-bottom: 8px;
        }

        .cd-method-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid #E5E7EB;
          background: #FFF;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
          box-sizing: border-box;
        }

        .cd-method-pill:hover {
          border-color: #FF6C00;
          background-color: #FFF8F2;
        }

        .cd-method-pill.active {
          border-color: #FF6C00;
          background-color: #FFF3EB;
          box-shadow: 0 0 0 3px rgba(255, 108, 0, 0.1);
        }

        .cd-method-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          flex-shrink: 0;
          background-color: #F3F4F6;
        }

        .cd-method-name {
          font-weight: 700;
          font-size: 14px;
          color: #1A1A1A;
        }

        .cd-method-desc {
          font-size: 11px;
          color: #6B7280;
          margin-top: 1px;
        }

        .cd-method-radio {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #D1D5DB;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          flex-shrink: 0;
          box-sizing: border-box;
          transition: all 0.2s;
          background: white;
          color: white;
        }

        .cd-method-radio.checked {
          border-color: #FF6C00;
          background: #FF6C00;
        }

        /* Colonne 2: Formulaire & Description */
        .cd-detail-panel {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          min-height: 320px;
        }

        .cd-detail-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }

        .cd-detail-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          color: white;
        }

        .cd-detail-title {
          font-weight: 800;
          font-size: 16px;
          color: #1A1A1A;
        }

        .cd-detail-subtitle {
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }

        /* Inputs */
        .cd-field-group {
          margin-bottom: 16px;
        }

        .cd-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .cd-input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #D1D5DB;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }

        .cd-input:focus {
          border-color: #FF6C00;
        }

        /* Comment ça marche */
        .cd-instructions {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px dashed #E5E7EB;
        }

        .cd-instructions-title {
          font-weight: 700;
          font-size: 13px;
          color: #4B5563;
          margin-bottom: 12px;
        }

        .cd-instruction-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #4B5563;
          line-height: 1.4;
        }

        .cd-instruction-num {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #E5E7EB;
          color: #6B7280;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* Colonne 3: Récapitulatif */
        .cd-recap-card {
          border: 1px solid #E5E7EB;
          background: white;
          border-radius: 16px;
          padding: 20px;
        }

        .cd-recap-title {
          font-size: 16px;
          font-weight: 800;
          color: #1A1A1A;
          margin-top: 0;
          margin-bottom: 16px;
        }

        .cd-route-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFF8F2;
          border: 1px solid #FFE4D0;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }

        .cd-route-point {
          display: flex;
          flex-direction: column;
        }

        .cd-route-label {
          font-size: 11px;
          color: #9CA3AF;
          text-transform: uppercase;
          font-weight: 600;
        }

        .cd-route-val {
          font-size: 15px;
          font-weight: 700;
          color: #FF6C00;
          margin-top: 2px;
        }

        .cd-info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .cd-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .cd-info-key {
          color: #6B7280;
        }

        .cd-info-val {
          font-weight: 600;
          color: #1A1A1A;
        }

        .cd-divider {
          height: 1px;
          background: #E5E7EB;
          margin: 16px 0;
        }

        .cd-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 20px;
        }

        .cd-total-key {
          font-weight: 800;
          font-size: 14px;
        }

        .cd-total-val {
          font-weight: 900;
          font-size: 22px;
          color: #FF6C00;
        }

        /* Buttons */
        .cd-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          border: none;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .cd-btn-primary {
          background: linear-gradient(135deg, #FF6C00 0%, #ff8534 100%);
          color: white;
          box-shadow: 0 4px 14px rgba(255, 108, 0, 0.3);
        }

        .cd-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 108, 0, 0.4);
        }

        .cd-btn-primary:disabled {
          background: #E5E7EB;
          color: #9CA3AF;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        .cd-btn-outline {
          background: white;
          border: 1.5px solid #D1D5DB;
          color: #374151;
        }

        .cd-btn-outline:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }

        .cd-w-full {
          width: 100%;
          box-sizing: border-box;
        }

        /* ─── Mobile Wizard CSS ────────────────────────────────────── */
        .cd-pay-mobile-layout {
          background: white;
          width: 100%;
          max-width: 480px;
          min-height: 100vh;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .cd-mob-header {
          display: flex;
          align-items: center;
          padding: 18px 16px;
          border-bottom: 1px solid #E5E7EB;
        }

        .cd-mob-back {
          background: none;
          border: none;
          color: #1A1A1A;
          cursor: pointer;
          padding: 4px;
          margin-right: 12px;
          display: flex;
          align-items: center;
        }

        .cd-mob-title {
          font-size: 18px;
          font-weight: 800;
          color: #1A1A1A;
        }

        .cd-mob-content {
          padding: 20px 16px;
          flex: 1;
        }

        /* Mini amount card (step 1 mobile) */
        .cd-mob-bill-card {
          background: #F9FAFB;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .cd-mob-bill-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #4B5563;
          margin-bottom: 8px;
        }

        .cd-mob-bill-row.total {
          margin-bottom: 0;
          padding-top: 8px;
          border-top: 1px solid #E5E7EB;
          font-size: 16px;
          font-weight: 800;
          color: #1A1A1A;
        }

        .cd-mob-subtitle {
          font-size: 14px;
          font-weight: 800;
          color: #6B7280;
          text-transform: uppercase;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }

        .cd-mob-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }

        .cd-mob-footer {
          padding: 16px;
          border-top: 1px solid #E5E7EB;
          background: white;
        }

        /* Card form fields mobile */
        .cd-mob-grid-cols-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* Virtual Card component */
        .cd-virtual-card {
          width: 100%;
          aspect-ratio: 1.6 / 1;
          border-radius: 16px;
          background: linear-gradient(135deg, #FF6C00 0%, #E05400 100%);
          padding: 20px;
          box-sizing: border-box;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          margin-bottom: 24px;
          box-shadow: 0 10px 20px rgba(255, 108, 0, 0.25);
        }

        .cd-vcard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cd-vcard-logo {
          font-weight: 900;
          font-size: 16px;
          letter-spacing: -0.5px;
        }

        .cd-vcard-number {
          font-size: 20px;
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-align: center;
          margin: 16px 0;
        }

        .cd-vcard-footer {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }

        .cd-vcard-lbl {
          font-size: 9px;
          opacity: 0.7;
          text-transform: uppercase;
        }

        .cd-vcard-val {
          font-weight: 600;
          margin-top: 2px;
        }

        /* Checkbox styling */
        .cd-checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        /* Step 4 confirmation page mobile */
        .cd-conf-card {
          text-align: center;
          padding: 16px 0;
        }

        .cd-conf-check {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #E6F6EC;
          color: #16A34A;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .cd-conf-amount {
          font-size: 28px;
          font-weight: 900;
          color: #1A1A1A;
          margin: 12px 0 24px;
        }

        .cd-conf-table {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .cd-conf-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          font-size: 13px;
          border-bottom: 1px solid #E5E7EB;
        }

        .cd-conf-row:last-child {
          border-bottom: none;
        }

        .cd-conf-key {
          color: #6B7280;
        }

        .cd-conf-val {
          font-weight: 700;
          color: #1A1A1A;
        }

        .cd-qr-wrap {
          border: 1.5px dashed #FF6C00;
          background: #FFF8F2;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          text-align: left;
        }

        .cd-qr-code {
          background: white;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1A1A;
          flex-shrink: 0;
        }

        .cd-qr-title {
          font-weight: 800;
          font-size: 14px;
          color: #FF6C00;
        }

        .cd-qr-desc {
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }

        /* Standalone states */
        .cd-pay-status-card {
          width: 100%;
          max-width: 440px;
          background: white;
          border-radius: 16px;
          padding: 40px 32px;
          text-align: center;
          border: 1px solid #E5E7EB;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
        }

        .cd-status-icon {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .cd-success-icon {
          background: #E6F6EC;
          color: #16A34A;
        }

        .cd-failed-icon {
          background: #FEE2E2;
          color: #EF4444;
        }

        .cd-pay-status-card h2 {
          font-size: 22px;
          font-weight: 850;
          margin-bottom: 12px;
          color: #1A1A1A;
        }

        .cd-pay-status-card p {
          color: #4B5563;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .cd-ref {
          font-family: monospace;
          font-size: 12px;
          color: #9CA3AF !important;
        }

        .cd-status-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #16A34A;
          font-size: 13px;
          font-weight: 600;
        }

        .cd-status-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .spin {
          animation: cd-spin 1s linear infinite;
        }

        @keyframes cd-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="cd-pay-wrap">
        {/* Loading overlay */}
        {(status === 'verifying') && (
          <div className="cd-pay-status-card">
            <Loader2 size={48} className="spin" style={{ color: '#FF6C00', margin: '0 auto 16px' }} />
            <h2>Vérification du paiement…</h2>
            <p>Confirmation en cours avec Paystack. Veuillez ne pas fermer cette page.</p>
          </div>
        )}

        {(status === 'processing') && (
          <div className="cd-pay-status-card">
            <Loader2 size={48} className="spin" style={{ color: '#FF6C00', margin: '0 auto 16px' }} />
            <h2>Initialisation…</h2>
            <p>Ouverture de la fenêtre de paiement sécurisé. Patientez un instant.</p>
          </div>
        )}

        {(status === 'loading_sdk') && (
          <div className="cd-pay-status-card">
            <Loader2 size={48} className="spin" style={{ color: '#FF6C00', margin: '0 auto 16px' }} />
            <h2>Chargement…</h2>
            <p>Sécurisation du tunnel de paiement en cours.</p>
          </div>
        )}

        {/* Ready status with the dual layouts */}
        {(status === 'ready' || status === 'success') && (
          <>
            {isMobile ? (
              // ─── MOBILE WIZARD RENDERING ────────────────────────────────────
              <div className="cd-pay-mobile-layout">
                {/* Header */}
                <div className="cd-mob-header">
                  {mobileStep > 1 && mobileStep < 4 && (
                    <button className="cd-mob-back" onClick={() => setMobileStep(1)}>
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  {mobileStep === 1 && (
                    <button className="cd-mob-back" onClick={onBack}>
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <span className="cd-mob-title">
                    {mobileStep === 4 ? 'Confirmation' : 'Paiement'}
                  </span>
                </div>

                {/* Content based on active step */}
                <div className="cd-mob-content">
                  {errorMsg && mobileStep < 4 && (
                    <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', color: '#B91C1C', fontSize: '13px', marginBottom: '16px' }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Step 1: Mode de paiement */}
                  {mobileStep === 1 && (
                    <>
                      {/* Bill card */}
                      <div className="cd-mob-bill-card">
                        <div className="cd-mob-bill-row">
                          <span>
                            Envoi {originCity} → {destCity}
                            {loadingDetails && <Loader2 className="spin" size={10} style={{ display: 'inline-block', marginLeft: 4, verticalAlign: 'middle' }} />}
                          </span>
                          <span>{formatCurrency(basePrice)} FCFA</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="cd-mob-bill-row" style={{ color: '#16A34A' }}>
                            <span>Réduction ({promoCode || 'Code Promo'})</span>
                            <span>-{formatCurrency(discountAmount)} FCFA</span>
                          </div>
                        )}
                        <div className="cd-mob-bill-row total">
                          <span>Total à payer</span>
                          <span style={{ color: '#FF6C00' }}>{formatCurrency(amountFcfa)} FCFA</span>
                        </div>
                      </div>

                      <div className="cd-mob-subtitle">Choisissez un moyen de paiement</div>
                      
                      <div className="cd-mob-grid">
                        {MOBILE_PROVIDERS.map(p => (
                          <button
                            key={p.id}
                            className={`cd-method-pill ${selectedProvider === p.id ? 'active' : ''}`}
                            onClick={() => setSelectedProvider(p.id)}
                          >
                            <div className="cd-method-icon-wrap" style={{ color: p.color, background: p.bg }}>
                              {p.abbr}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="cd-method-name">{p.label}</div>
                              <div className="cd-method-desc">Paiement instantané</div>
                            </div>
                            <div className={`cd-method-radio ${selectedProvider === p.id ? 'checked' : ''}`}>
                              {selectedProvider === p.id && <Check size={12} strokeWidth={3} />}
                            </div>
                          </button>
                        ))}

                        <button
                          className={`cd-method-pill ${selectedProvider === 'card' ? 'active' : ''}`}
                          onClick={() => setSelectedProvider('card')}
                        >
                          <div className="cd-method-icon-wrap" style={{ color: '#1A1A1A', background: '#F3F4F6' }}>
                            <CreditCard size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="cd-method-name">Carte bancaire</div>
                            <div className="cd-method-desc">Visa, Mastercard</div>
                          </div>
                          <div className={`cd-method-radio ${selectedProvider === 'card' ? 'checked' : ''}`}>
                            {selectedProvider === 'card' && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>

                        <button
                          className={`cd-method-pill ${selectedProvider === 'relay_cash' ? 'active' : ''}`}
                          onClick={() => setSelectedProvider('relay_cash')}
                        >
                          <div className="cd-method-icon-wrap" style={{ color: '#16A34A', background: '#E6F6EC' }}>
                            <Wallet size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="cd-method-name">Espèces à la livraison</div>
                            <div className="cd-method-desc">Payé par le destinataire</div>
                          </div>
                          <div className={`cd-method-radio ${selectedProvider === 'relay_cash' ? 'checked' : ''}`}>
                            {selectedProvider === 'relay_cash' && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontSize: '13px', justifyContent: 'center', margin: '16px 0' }}>
                        <Shield size={14} />
                        <span>Paiement 100% sécurisé et chiffré</span>
                      </div>
                    </>
                  )}

                  {/* Step 2: Mobile Money Screen */}
                  {mobileStep === 2 && activeMobileProvider && (
                    <>
                      <div className="cd-detail-header" style={{ marginBottom: 24 }}>
                        <div className="cd-detail-icon" style={{ background: activeMobileProvider.color }}>
                          {activeMobileProvider.abbr}
                        </div>
                        <div>
                          <div className="cd-detail-title">Payer avec {activeMobileProvider.label}</div>
                          <div className="cd-detail-subtitle">Une demande de confirmation sera envoyée sur votre téléphone</div>
                        </div>
                      </div>

                      <div className="cd-field-group">
                        <label className="cd-label">Numéro {activeMobileProvider.label}</label>
                        <input
                          type="tel"
                          className="cd-input"
                          value={paymentPhoneNumber}
                          onChange={(e) => setPaymentPhoneNumber(e.target.value)}
                          placeholder="+225 00 00 00 00 00"
                        />
                      </div>

                      <div className="cd-instructions">
                        <div className="cd-instructions-title">Comment ça marche</div>
                        <div className="cd-instruction-step">
                          <div className="cd-instruction-num">1</div>
                          <span>Saisissez votre numéro {activeMobileProvider.label} ci-dessus</span>
                        </div>
                        <div className="cd-instruction-step">
                          <div className="cd-instruction-num">2</div>
                          <span>Validez le montant de {formatCurrency(amountFcfa)} FCFA</span>
                        </div>
                        <div className="cd-instruction-step">
                          <div className="cd-instruction-num">3</div>
                          <span>Confirmez la transaction sur votre téléphone (code {activeMobileProvider.code})</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: '14px', borderTop: '1px solid #E5E7EB', marginTop: '24px' }}>
                        <span style={{ color: '#6B7280' }}>Montant</span>
                        <span style={{ fontWeight: 800, color: '#1A1A1A' }}>{formatCurrency(amountFcfa)} FCFA</span>
                      </div>
                    </>
                  )}

                  {/* Step 3: Card Screen */}
                  {mobileStep === 3 && (
                    <>
                      {/* Virtual card mock */}
                      <div className="cd-virtual-card">
                        <div className="cd-vcard-header">
                          <span className="cd-vcard-logo">COLISDIRECT</span>
                          <span style={{ fontSize: 13, fontWeight: 'bold' }}>VISA</span>
                        </div>
                        <div className="cd-vcard-number">
                          {cardNo || '•••• •••• •••• ••••'}
                        </div>
                        <div className="cd-vcard-footer">
                          <div>
                            <div className="cd-vcard-lbl">Titulaire</div>
                            <div className="cd-vcard-val">{cardHolder || 'NOM DE L\'HOLDER'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="cd-vcard-lbl">Expire</div>
                            <div className="cd-vcard-val">{cardExpiry || 'MM/YY'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="cd-field-group">
                        <label className="cd-label">Numéro de carte</label>
                        <input
                          type="text"
                          className="cd-input"
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value)}
                          placeholder="5282 3456 7890 1289"
                        />
                      </div>

                      <div className="cd-field-group">
                        <label className="cd-label">Titulaire de la carte</label>
                        <input
                          type="text"
                          className="cd-input"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Axel M."
                        />
                      </div>

                      <div className="cd-mob-grid-cols-2">
                        <div className="cd-field-group">
                          <label className="cd-label">Date d'expiration</label>
                          <input
                            type="text"
                            className="cd-input"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="08 / 28"
                          />
                        </div>
                        <div className="cd-field-group">
                          <label className="cd-label">CVV</label>
                          <input
                            type="password"
                            className="cd-input"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                          />
                        </div>
                      </div>

                      <div className="cd-checkbox-row">
                        <input
                          type="checkbox"
                          id="save-card-mob"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          style={{ accentColor: '#FF6C00', width: 16, height: 16 }}
                        />
                        <label htmlFor="save-card-mob" style={{ color: '#4B5563' }}>Enregistrer cette carte pour plus tard</label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontSize: '13px', margin: '8px 0' }}>
                        <Shield size={14} />
                        <span>Vos données de carte sont chiffrées et sécurisées</span>
                      </div>
                    </>
                  )}

                  {/* Step 4: Success confirmation screen */}
                  {mobileStep === 4 && (
                    <div className="cd-conf-card">
                      <div className="cd-conf-check">
                        <Check size={28} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A', margin: '0 0 4px' }}>Paiement réussi !</h2>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>Votre envoi a été validé avec succès</p>
                      
                      <div className="cd-conf-amount">
                        {formatCurrency(amountFcfa)} FCFA
                      </div>

                      <div className="cd-conf-table">
                        <div className="cd-conf-row">
                          <span className="cd-conf-key">N° de transaction</span>
                          <span className="cd-conf-val">{paymentRef || 'TXN-2026-784512'}</span>
                        </div>
                        <div className="cd-conf-row">
                          <span className="cd-conf-key">Mode de paiement</span>
                          <span className="cd-conf-val">
                            {selectedProvider === 'card' ? 'Carte bancaire' : 
                             selectedProvider === 'relay_cash' ? 'Espèces au relais' : 
                             activeMobileProvider?.label || 'Mobile Money'}
                          </span>
                        </div>
                        <div className="cd-conf-row">
                          <span className="cd-conf-key">N° de suivi</span>
                          <span className="cd-conf-val">{trackingNumber}</span>
                        </div>
                        <div className="cd-conf-row">
                          <span className="cd-conf-key">Date</span>
                          <span className="cd-conf-val">
                            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="cd-conf-row">
                          <span className="cd-conf-key">Trajet</span>
                          <span className="cd-conf-val">{originCity} → {destCity}</span>
                        </div>
                      </div>

                      {selectedProvider !== 'relay_cash' && (
                        <div className="cd-qr-wrap">
                          <div className="cd-qr-code">
                            {/* SVG QR Code */}
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="1" y="1" width="6" height="6" rx="1" />
                              <rect x="2" y="2" width="4" height="4" fill="currentColor" />
                              <rect x="17" y="1" width="6" height="6" rx="1" />
                              <rect x="18" y="2" width="4" height="4" fill="currentColor" />
                              <rect x="1" y="17" width="6" height="6" rx="1" />
                              <rect x="2" y="18" width="4" height="4" fill="currentColor" />
                              <rect x="17" y="17" width="6" height="6" rx="1" />
                              <rect x="18" y="18" width="4" height="4" fill="currentColor" />
                              <path d="M9 1h6M9 5h2M11 9v4M9 11h6M1 9h4M5 11h2M17 9h4M17 11h2M11 1v4M13 9h2M9 13h2M13 13h2M9 15v2M13 15v2" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <div className="cd-qr-title">Reçu disponible</div>
                            <div className="cd-qr-desc">Présentez ce QR code au point relais de dépôt lors de la remise.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile bottom bar */}
                <div className="cd-mob-footer">
                  {mobileStep === 1 && (
                    <button className="cd-btn cd-btn-primary cd-w-full" onClick={handleMobileNext}>
                      Continuer
                    </button>
                  )}
                  {mobileStep === 2 && (
                    <button className="cd-btn cd-btn-primary cd-w-full" onClick={openPaystackPopup}>
                      Payer {formatCurrency(amountFcfa)} FCFA
                    </button>
                  )}
                  {mobileStep === 3 && (
                    <button className="cd-btn cd-btn-primary cd-w-full" onClick={openPaystackPopup}>
                      Payer {formatCurrency(amountFcfa)} FCFA
                    </button>
                  )}
                  {mobileStep === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button className="cd-btn cd-btn-primary cd-w-full" onClick={() => {
                        window.location.href = `${window.location.origin}${window.location.pathname}#/payment-success?tracking=${trackingNumber}&reference=${paymentRef || 'ref'}`;
                      }}>
                        Suivre mon colis
                      </button>
                      <button className="cd-btn cd-btn-outline cd-w-full" onClick={() => {
                        window.location.href = `${window.location.origin}${window.location.pathname}#/payment-success?tracking=${trackingNumber}&reference=${paymentRef || 'ref'}`;
                      }}>
                        Télécharger le reçu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // ─── DESKTOP MULTI-COLUMN RENDERING ─────────────────────────────
              <div className="cd-pay-desktop-layout">
                {/* Header */}
                <header className="cd-header">
                  <div className="cd-logo-group">
                    <img src="/logo.png" alt="ColisDirect" className="cd-logo-img" />
                    <span className="cd-logo-title">COLISDIRECT</span>
                  </div>
                  <div className="cd-secure-badge">
                    <Lock size={14} />
                    <span>Paiement sécurisé</span>
                  </div>
                </header>

                {/* Stepper */}
                <div className="cd-stepper">
                  <div className="cd-step completed">
                    <div className="cd-step-num">✓</div>
                    <span>Détails du colis</span>
                  </div>
                  <div className="cd-step-divider completed"></div>
                  <div className="cd-step completed">
                    <div className="cd-step-num">✓</div>
                    <span>Adresses</span>
                  </div>
                  <div className="cd-step-divider completed"></div>
                  <div className="cd-step active">
                    <div className="cd-step-num">3</div>
                    <span>Paiement</span>
                  </div>
                  <div className="cd-step-divider"></div>
                  <div className="cd-step">
                    <div className="cd-step-num">4</div>
                    <span>Confirmation</span>
                  </div>
                </div>

                {/* Main 3 columns grid */}
                <div className="cd-columns">
                  
                  {/* Column 1: Payment Methods Menu */}
                  <div className="cd-methods-list">
                    <h2 className="cd-methods-title">Moyen de paiement</h2>
                    
                    {MOBILE_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        className={`cd-method-pill ${selectedProvider === p.id ? 'active' : ''}`}
                        onClick={() => setSelectedProvider(p.id)}
                      >
                        <div className="cd-method-icon-wrap" style={{ color: p.color, background: p.bg }}>
                          {p.abbr}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="cd-method-name">{p.label}</div>
                          <div className="cd-method-desc">Paiement instantané</div>
                        </div>
                        <div className={`cd-method-radio ${selectedProvider === p.id ? 'checked' : ''}`}>
                          {selectedProvider === p.id && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    ))}

                    <button
                      className={`cd-method-pill ${selectedProvider === 'card' ? 'active' : ''}`}
                      onClick={() => setSelectedProvider('card')}
                    >
                      <div className="cd-method-icon-wrap" style={{ color: '#1A1A1A', background: '#F3F4F6' }}>
                        <CreditCard size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="cd-method-name">Carte bancaire</div>
                        <div className="cd-method-desc">Visa, Mastercard</div>
                      </div>
                      <div className={`cd-method-radio ${selectedProvider === 'card' ? 'checked' : ''}`}>
                        {selectedProvider === 'card' && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>

                    <button
                      className={`cd-method-pill ${selectedProvider === 'relay_cash' ? 'active' : ''}`}
                      onClick={() => setSelectedProvider('relay_cash')}
                    >
                      <div className="cd-method-icon-wrap" style={{ color: '#16A34A', background: '#E6F6EC' }}>
                        <Wallet size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="cd-method-name">Espèces à la livraison</div>
                        <div className="cd-method-desc">Payé par le destinataire</div>
                      </div>
                      <div className={`cd-method-radio ${selectedProvider === 'relay_cash' ? 'checked' : ''}`}>
                        {selectedProvider === 'relay_cash' && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  </div>

                  {/* Column 2: Selected Payment Method Detail Forms */}
                  <div className="cd-detail-panel">
                    
                    {/* A. Mobile Money Form */}
                    {activeMobileProvider && (
                      <div>
                        <div className="cd-detail-header">
                          <div className="cd-detail-icon" style={{ background: activeMobileProvider.color }}>
                            {activeMobileProvider.abbr}
                          </div>
                          <div>
                            <div className="cd-detail-title">Payer avec {activeMobileProvider.label}</div>
                            <div className="cd-detail-subtitle">Une demande de confirmation sera envoyée sur votre téléphone</div>
                          </div>
                        </div>

                        {errorMsg && (
                          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', color: '#B91C1C', fontSize: '13px', marginBottom: '16px' }}>
                            {errorMsg}
                          </div>
                        )}

                        <div className="cd-field-group">
                          <label className="cd-label">Numéro {activeMobileProvider.label}</label>
                          <input
                            type="tel"
                            className="cd-input"
                            value={paymentPhoneNumber}
                            onChange={(e) => setPaymentPhoneNumber(e.target.value)}
                            placeholder="+225 07 58 42 19 03"
                          />
                        </div>

                        <div className="cd-instructions">
                          <div className="cd-instructions-title">Comment ça marche</div>
                          <div className="cd-instruction-step">
                            <div className="cd-instruction-num">1</div>
                            <span>Saisissez votre numéro {activeMobileProvider.label} ci-dessus</span>
                          </div>
                          <div className="cd-instruction-step">
                            <div className="cd-instruction-num">2</div>
                            <span>Validez le montant de {formatCurrency(amountFcfa)} FCFA</span>
                          </div>
                          <div className="cd-instruction-step">
                            <div className="cd-instruction-num">3</div>
                            <span>Confirmez avec votre code secret ({activeMobileProvider.code})</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontSize: '13px', marginTop: '24px' }}>
                          <Shield size={14} />
                          <span>Paiement 100% sécurisé et chiffré — ColisDirect ne stocke jamais vos identifiants</span>
                        </div>
                      </div>
                    )}

                    {/* B. Card Form */}
                    {selectedProvider === 'card' && (
                      <div>
                        <div className="cd-detail-header">
                          <div className="cd-detail-icon" style={{ background: '#1A1A1A' }}>
                            💳
                          </div>
                          <div>
                            <div className="cd-detail-title">Carte bancaire</div>
                            <div className="cd-detail-subtitle">Saisissez les informations de votre carte de crédit ou débit</div>
                          </div>
                        </div>

                        {errorMsg && (
                          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', color: '#B91C1C', fontSize: '13px', marginBottom: '16px' }}>
                            {errorMsg}
                          </div>
                        )}

                        <div className="cd-field-group">
                          <label className="cd-label">Numéro de carte</label>
                          <input
                            type="text"
                            className="cd-input"
                            value={cardNo}
                            onChange={(e) => setCardNo(e.target.value)}
                            placeholder="5282 3456 7890 1289"
                          />
                        </div>

                        <div className="cd-field-group">
                          <label className="cd-label">Titulaire de la carte</label>
                          <input
                            type="text"
                            className="cd-input"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Axel M."
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="cd-field-group">
                            <label className="cd-label">Date d'expiration</label>
                            <input
                              type="text"
                              className="cd-input"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="08 / 28"
                            />
                          </div>
                          <div className="cd-field-group">
                            <label className="cd-label">CVV</label>
                            <input
                              type="password"
                              className="cd-input"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              placeholder="•••"
                            />
                          </div>
                        </div>

                        <div className="cd-checkbox-row">
                          <input
                            type="checkbox"
                            id="save-card-desk"
                            checked={saveCard}
                            onChange={(e) => setSaveCard(e.target.checked)}
                            style={{ accentColor: '#FF6C00', width: 16, height: 16 }}
                          />
                          <label htmlFor="save-card-desk" style={{ color: '#4B5563' }}>Enregistrer cette carte pour de futurs envois</label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontSize: '13px', marginTop: '16px' }}>
                          <Shield size={14} />
                          <span>Paiement 3D Secure activé. Vos données de carte sont hautement protégées.</span>
                        </div>
                      </div>
                    )}

                    {/* C. Cash on Delivery Form */}
                    {selectedProvider === 'relay_cash' && (
                      <div>
                        <div className="cd-detail-header">
                          <div className="cd-detail-icon" style={{ background: '#16A34A' }}>
                            💵
                          </div>
                          <div>
                            <div className="cd-detail-title">Espèces à la livraison</div>
                            <div className="cd-detail-subtitle">Le paiement sera effectué en point relais</div>
                          </div>
                        </div>

                        <div style={{ padding: '16px', background: '#FFFBE6', border: '1px solid #FFE082', borderRadius: '12px', fontSize: '14px', lineHeight: 1.5, color: '#795548', marginBottom: '20px' }}>
                          <strong>Note importante :</strong> Le destinataire de ce colis devra régler la somme de <strong>{formatCurrency(amountFcfa)} FCFA</strong> directement en espèces au point relais de destination avant de pouvoir retirer le colis.
                        </div>

                        <div className="cd-instructions">
                          <div className="cd-instructions-title">Fonctionnement</div>
                          <div className="cd-instruction-step">
                            <div className="cd-instruction-num">1</div>
                            <span>Sélectionnez ce moyen et confirmez l'envoi ci-contre.</span>
                          </div>
                          <div className="cd-instruction-step">
                            <div className="cd-instruction-num">2</div>
                            <span>Déposez gratuitement le colis au relais d'origine.</span>
                          </div>
                          <div className="cd-instruction-step">
                            <div className="cd-instruction-num">3</div>
                            <span>Le destinataire paie et récupère le colis au relais de destination.</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Billing Summary Sidebar */}
                  <div className="cd-recap-card">
                    <h2 className="cd-recap-title">Récapitulatif</h2>
                    
                    {/* Route Details */}
                    <div className="cd-route-group">
                      <div className="cd-route-point">
                        <span className="cd-route-label">De</span>
                        <span className="cd-route-val">{originCity}</span>
                      </div>
                      <div style={{ color: '#FF6C00', fontSize: 18, fontWeight: 'bold' }}>➔</div>
                      <div className="cd-route-point" style={{ textAlign: 'right' }}>
                        <span className="cd-route-label">À</span>
                        <span className="cd-route-val">{destCity}</span>
                      </div>
                    </div>

                    {/* General Specs */}
                    <div className="cd-info-list">
                      <div className="cd-info-row">
                        <span className="cd-info-key">Type de livraison</span>
                        <span className="cd-info-val">{deliveryType}</span>
                      </div>
                      <div className="cd-info-row">
                        <span className="cd-info-key">Taille du colis</span>
                        <span className="cd-info-val">{packageSize}</span>
                      </div>
                      <div className="cd-info-row">
                        <span className="cd-info-key">Destinataire</span>
                        <span className="cd-info-val">{recipientName}</span>
                      </div>
                      {promoCode && (
                        <div className="cd-info-row">
                          <span className="cd-info-key">Code promo</span>
                          <span className="cd-info-val" style={{ color: '#FF6C00' }}>{promoCode}</span>
                        </div>
                      )}
                    </div>

                    <div className="cd-divider"></div>

                    {/* Pricing list */}
                    <div className="cd-info-list">
                      <div className="cd-info-row">
                        <span className="cd-info-key">Prix de base</span>
                        <span className="cd-info-val">{formatCurrency(basePrice)} FCFA</span>
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="cd-info-row" style={{ color: '#16A34A' }}>
                          <span className="cd-info-key" style={{ color: '#16A34A' }}>Réduction</span>
                          <span className="cd-info-val" style={{ color: '#16A34A' }}>-{formatCurrency(discountAmount)} FCFA</span>
                        </div>
                      )}

                      {insurancePrice > 0 && (
                        <div className="cd-info-row">
                          <span className="cd-info-key">Assurance</span>
                          <span className="cd-info-val">+{formatCurrency(insurancePrice)} FCFA</span>
                        </div>
                      )}
                    </div>

                    <div className="cd-divider"></div>

                    {/* Total */}
                    <div className="cd-total-row">
                      <span className="cd-total-key">Total à payer</span>
                      <span className="cd-total-val">{formatCurrency(amountFcfa)} FCFA</span>
                    </div>

                    {/* Actions button */}
                    {selectedProvider === 'relay_cash' ? (
                      <button
                        className="cd-btn cd-btn-primary cd-w-full"
                        onClick={handleSwitchToRelayPayment}
                      >
                        <Check size={16} />
                        Confirmer le paiement au relais
                      </button>
                    ) : (
                      <button
                        className="cd-btn cd-btn-primary cd-w-full"
                        onClick={openPaystackPopup}
                        disabled={!sdkLoaded}
                      >
                        <Lock size={16} />
                        Payer {formatCurrency(amountFcfa)} FCFA
                      </button>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9CA3AF', justifyContent: 'center', marginTop: '14px' }}>
                      <Shield size={12} />
                      <span>Transaction protégée</span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
