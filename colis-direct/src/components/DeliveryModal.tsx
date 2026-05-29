import { useState } from 'react';
import { X, Package, Banknote, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'react-toastify';

interface DeliveryModalProps {
  shipment: {
    id: string;
    tracking_number: string;
    recipient_first_name: string;
    recipient_last_name: string;
    recipient_phone?: string;
    recipient_email?: string;
    recipient_address?: string;
    recipient_commune?: string;
    payment_status?: string;
    payment_method?: string;
    price?: number;
    home_delivery?: boolean;
    pickup_code?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

/** Collecte à la livraison : espèces uniquement (Mobile Money géré en amont via paiement en ligne). */
const COLLECT_PAYMENT_METHOD = 'cash' as const;

export default function DeliveryModal({ shipment, onClose, onSuccess }: DeliveryModalProps) {
  const [pickupCode, setPickupCode] = useState('');
  const [recipientIdentifier, setRecipientIdentifier] = useState(shipment.recipient_phone || shipment.recipient_email || '');
  const [needsPayment, setNeedsPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(shipment.price || 0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'scan' | 'payment' | 'verify'>('scan');

  const paymentMethodLower = (shipment.payment_method || '').toLowerCase();
  const paymentStatus = (shipment.payment_status || '').toLowerCase();
  const isOnlineAutomated = paymentMethodLower === 'paystack' || paymentMethodLower === 'cinetpay';
  // Un paiement est requis à la livraison UNIQUEMENT si :
  // - le paiement n'est pas encore effectué (pending) ET ce n'est pas un paiement en ligne confirmé
  // - relay_cash avec payment_status = 'paid' signifie que le relais ou le transporteur a déjà encaissé
  const requiresPayment =
    paymentStatus === 'pending' &&
    !isOnlineAutomated &&
    paymentMethodLower !== 'mobile_money'; // mobile_money = payé en ligne avant dépôt
  const handleVerifyCode = async () => {
    if (!pickupCode || pickupCode.length !== 6) {
      toast.error('Le code de retrait doit contenir 6 chiffres');
      return;
    }

    if (requiresPayment && !needsPayment) {
      setNeedsPayment(true);
      setStep('payment');
      return;
    }

    setLoading(true);
    try {
      const { error } = await api.deliverShipment(
        shipment.tracking_number,
        pickupCode,
        recipientIdentifier || undefined,
        needsPayment,
        needsPayment ? COLLECT_PAYMENT_METHOD : undefined,
        needsPayment ? paymentAmount : undefined,
        undefined
      );

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      toast.success('Colis livré avec succès !');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`Erreur lors de la livraison: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Indiquez un montant valide');
      return;
    }

    setLoading(true);
    try {
      const { error: paymentError } = await api.collectPaymentOnDelivery(
        shipment.tracking_number,
        COLLECT_PAYMENT_METHOD,
        paymentAmount,
        undefined
      );

      if (paymentError) {
        toast.error(paymentError);
        setLoading(false);
        return;
      }

      toast.success('Paiement en espèces enregistré');
      setNeedsPayment(true);

      const finalPickupCode = pickupCode;

      const { error: deliveryError } = await api.deliverShipment(
        shipment.tracking_number,
        finalPickupCode,
        recipientIdentifier || undefined,
        true,
        COLLECT_PAYMENT_METHOD,
        paymentAmount,
        undefined
      );

      if (deliveryError) {
        toast.error(deliveryError);
        setStep('verify');
        setLoading(false);
        return;
      }

      toast.success('Colis livré avec succès !');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`Erreur lors de l'enregistrement du paiement: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1A1A1A]">Livraison du colis</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F0F0F0] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-[#F6F7F9] rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-sm text-[#6B7280] mb-1">Destinataire</div>
                <div className="font-semibold text-[#1A1A1A]">
                  {shipment.recipient_first_name} {shipment.recipient_last_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-[#6B7280] mb-1">Téléphone</div>
                <div className="font-semibold text-[#1A1A1A]">{shipment.recipient_phone || 'Non renseigné'}</div>
              </div>
              {shipment.recipient_address && (
                <div className="col-span-2">
                  <div className="text-sm text-[#6B7280] mb-1">Adresse</div>
                  <div className="font-semibold text-[#1A1A1A]">
                    {shipment.recipient_address}, {shipment.recipient_commune}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-[#6B7280] mb-1">Numéro de suivi</div>
                <div className="font-mono font-semibold text-[#FF6C00]">{shipment.tracking_number}</div>
              </div>
              {shipment.price && (
                <div>
                  <div className="text-sm text-[#6B7280] mb-1">Montant</div>
                  <div className="font-semibold text-[#1A1A1A]">{shipment.price} FCFA</div>
                </div>
              )}
            </div>
          </div>

          {step === 'scan' && (
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                    Saisir le code de retrait (6 chiffres)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border-2 border-[#D1D5DB] rounded-lg text-lg font-mono text-center focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    autoFocus
                  />
                </div>
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  Confirmer le numéro ou l'email du destinataire
                </label>
                <input
                  type="text"
                  value={recipientIdentifier}
                  onChange={(e) => setRecipientIdentifier(e.target.value)}
                  placeholder="Ex: 0700000000 ou client@example.com"
                  className="w-full px-4 py-2 border-2 border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setStep('verify')}
                disabled={pickupCode.length !== 6}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 'payment' && requiresPayment && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Banknote className="w-5 h-5" />
                  <span className="font-semibold">Encaissement en espèces à la livraison</span>
                </div>
                <p className="text-sm text-blue-700">
                  Montant attendu : <strong>{shipment.price} FCFA</strong>. Saisissez le montant réellement reçu.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  Montant reçu (FCFA)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('verify')}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#E6E6E6] hover:bg-[#D1D5DB] text-[#3A3A3A] rounded-lg font-medium disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) void handleCollectPayment();
                  }}
                  disabled={loading || !paymentAmount || paymentAmount <= 0}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Banknote className="w-4 h-4" />
                      Enregistrer le paiement
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="bg-[#F6F7F9] rounded-lg p-4">
                <div className="flex items-center gap-2 text-[#3A3A3A] mb-2">
                  <Package className="w-5 h-5" />
                  <span className="font-semibold">Informations de livraison</span>
                </div>
                <div className="text-sm space-y-1 text-[#1A1A1A]">
                  <div>
                    Code de retrait : <span className="font-mono font-semibold">{pickupCode}</span>
                  </div>
                  <div>
                    Destinataire : {shipment.recipient_first_name} {shipment.recipient_last_name}
                  </div>
                  {requiresPayment && needsPayment && (
                    <div className="text-green-600 flex items-center gap-2 mt-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Paiement enregistré : {paymentAmount} FCFA (espèces)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {requiresPayment && !needsPayment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Encaissement requis</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Encaissez le montant en espèces avant de finaliser la livraison.
                  </p>
                  <button
                    onClick={() => setStep('payment')}
                    className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
                  >
                    Enregistrer l&apos;encaissement
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('scan')}
                  className="flex-1 px-4 py-2 bg-[#E6E6E6] hover:bg-[#D1D5DB] text-[#3A3A3A] rounded-lg font-medium"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) void handleVerifyCode();
                  }}
                  disabled={loading || (requiresPayment && !needsPayment) || (!pickupCode || pickupCode.length !== 6)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Livraison en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Valider la livraison
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
