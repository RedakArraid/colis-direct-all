import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

interface AutomatedPaymentStepProps {
  trackingNumber: string;
  amountFcfa: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onBack: () => void;
}

export default function AutomatedPaymentStep({
  trackingNumber,
  amountFcfa,
  customerName,
  customerEmail,
  customerPhone,
  onBack,
}: AutomatedPaymentStepProps) {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data, error } = await api.initMobileMoneyPayment({
          tracking_number: trackingNumber,
          amount_fcfa: amountFcfa,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        });

        if (cancelled) return;

        if (error) {
          if (error.includes('NOT_CONFIGURED') || error.includes('non configuré')) {
            setErrorMessage('Le paiement Mobile Money n\'est pas encore activé. Choisissez "Paiement lors de la prise en charge".');
          } else {
            setErrorMessage(error);
          }
          setStatus('error');
          return;
        }

        if (!data?.payment_url) {
          setErrorMessage('Impossible d\'obtenir le lien de paiement. Réessayez ou choisissez un autre moyen.');
          setStatus('error');
          return;
        }

        setPaymentUrl(data.payment_url);
        setStatus('redirecting');
        // Sauvegarder le tracking avant le redirect Paystack
        // (utilisé en fallback si l'URL de retour ne contient pas le tracking)
        sessionStorage.setItem('last_payment_tracking', trackingNumber);
        window.location.href = data.payment_url;
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message || 'Erreur lors de l\'initialisation du paiement.');
          setStatus('error');
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [trackingNumber, amountFcfa, customerName, customerEmail, customerPhone]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#3A3A3A] hover:text-[#FF6C00] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au récapitulatif
      </button>

      <div className="text-right">
        <p className="text-sm text-[#6B7280]">Montant à régler</p>
        <p className="text-2xl font-bold text-[#FF6C00]">{formatCurrency(amountFcfa)}</p>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-[#FF6C00] animate-spin" />
          <p className="text-[#6B7280] font-medium">Initialisation du paiement {'Mobile Money'}…</p>
          <p className="text-sm text-[#9CA3AF]">Vous allez être redirigé vers la page de paiement sécurisée.</p>
        </div>
      )}

      {status === 'redirecting' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
          <p className="text-[#3A3A3A] font-medium">Redirection vers {'Mobile Money'}…</p>
          {paymentUrl && (
            <a
              href={paymentUrl}
              className="flex items-center gap-2 text-sm text-[#FF6C00] underline hover:no-underline"
            >
              <ExternalLink className="w-4 h-4" />
              Cliquez ici si la redirection ne démarre pas
            </a>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="p-4 border border-red-200 rounded-xl bg-red-50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Échec de l'initialisation</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="w-full py-3 bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors"
          >
            Choisir un autre moyen de paiement
          </button>
        </div>
      )}
    </div>
  );
}
