import { useState } from 'react';
import { X, CreditCard, CheckCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'react-toastify';

interface PaymentConfirmationModalProps {
  shipment: {
    tracking_number: string;
    shipment_code?: string;
    sender_first_name?: string;
    sender_last_name?: string;
    sender_phone?: string;
    sender_address?: string;
    sender_commune?: string;
    price?: number;
    payment_method?: string;
    payment_status?: string;
    relay_cash_amount_expected?: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentConfirmationModal({ shipment, onClose, onSuccess }: PaymentConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const amount = shipment.relay_cash_amount_expected || shipment.price || 0;

  const handleConfirmPayment = async () => {
    setLoading(true);
    try {
      // Confirmer le paiement
      const { error: paymentError } = await api.confirmShipmentPayment(shipment.tracking_number);
      if (paymentError) {
        toast.error(`Erreur lors de la confirmation du paiement: ${paymentError}`);
        setLoading(false);
        return;
      }

      setConfirmed(true);
      toast.success('Paiement confirmé avec succès !');
      
      // Attendre un court instant pour que l'utilisateur voie le message de succès
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1A1A1A]">Confirmation de paiement</h2>
          <button
            onClick={onClose}
            disabled={loading || confirmed}
            className="p-2 hover:bg-[#F0F0F0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Shipment info */}
          <div className="bg-[#F6F7F9] rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-sm text-[#6B7280] mb-1">Expéditeur</div>
                <div className="font-semibold text-[#1A1A1A]">
                  {shipment.sender_first_name} {shipment.sender_last_name}
                </div>
              </div>
              {shipment.sender_phone && (
                <div>
                  <div className="text-sm text-[#6B7280] mb-1">Téléphone</div>
                  <div className="font-semibold text-[#1A1A1A]">{shipment.sender_phone}</div>
                </div>
              )}
              {shipment.sender_address && (
                <div className="col-span-2">
                  <div className="text-sm text-[#6B7280] mb-1">Adresse</div>
                  <div className="font-semibold text-[#1A1A1A]">
                    {shipment.sender_address}, {shipment.sender_commune}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-[#6B7280] mb-1">Numéro de suivi</div>
                <div className="font-mono font-semibold text-[#FF6C00]">
                  {shipment.shipment_code || shipment.tracking_number}
                </div>
              </div>
              <div>
                <div className="text-sm text-[#6B7280] mb-1">Montant à recevoir</div>
                <div className="font-semibold text-[#1A1A1A] text-lg">{amount.toLocaleString('fr-FR')} FCFA</div>
              </div>
            </div>
          </div>

          {/* Payment confirmation */}
          {!confirmed ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">Paiement avec le transporteur</span>
                </div>
                <p className="text-sm text-blue-700">
                  Ce colis nécessite un paiement de <strong>{amount.toLocaleString('fr-FR')} FCFA</strong> à collecter auprès de l'expéditeur.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Avez-vous reçu ce montant de l'expéditeur ?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#E6E6E6] hover:bg-[#D1D5DB] text-[#3A3A3A] rounded-lg font-medium disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Confirmation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirmer le paiement
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Paiement confirmé</span>
                </div>
                <p className="text-sm text-green-700">
                  Le paiement de <strong>{amount.toLocaleString('fr-FR')} FCFA</strong> a été confirmé avec succès.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Vous pouvez maintenant confirmer le ramassage du colis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

