import { XCircle } from 'lucide-react';
import { BasePageProps } from '../types/pages';

interface PaymentCancelPageProps extends BasePageProps {
  onNavigate: (page: string) => void;
}

function PaymentCancelPage({ onNavigate }: PaymentCancelPageProps) {
  // Nettoyer l'URL après annulation
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/payment-cancel')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-3 sm:px-4 py-8 sm:py-12">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="bg-red-100 rounded-full p-3 sm:p-4">
            <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">Paiement annulé</h1>
        <p className="text-sm sm:text-base text-[#6B7280] mb-4 sm:mb-6 px-4">
          Votre paiement a été annulé. Vous pouvez réessayer ou choisir un autre mode de paiement.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
          <button
            onClick={() => onNavigate('create-shipment')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={() => onNavigate('my-shipments')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border rounded-lg hover:bg-[#F6F7F9] transition-colors"
          >
            Mes envois
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border rounded-lg hover:bg-[#F6F7F9] transition-colors"
          >
            Accueil
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancelPage;
