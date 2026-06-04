/**
 * AutomatedPaymentStep — Wrapper qui utilise PaystackInlinePayment
 * pour afficher la page de paiement branded ColisDirect avec popup inline Paystack.
 */
import PaystackInlinePayment from './PaystackInlinePayment';

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
  return (
    <PaystackInlinePayment
      trackingNumber={trackingNumber}
      amountFcfa={amountFcfa}
      customerName={customerName}
      customerEmail={customerEmail}
      customerPhone={customerPhone}
      onBack={onBack}
    />
  );
}
