import { useState } from 'react';
import { CreditCard, Smartphone, ChevronLeft, Receipt, Package, Wallet, Tag, Loader2, ChevronDown } from 'lucide-react';
import type { ShipmentFormData } from '../../pages/CreateShipmentPage';
import { api } from '../../lib/api';

type PaymentMethod = 'paystack' | 'relay_cash' | null;

export interface PromoInfo {
  code: string;
  promoFree: boolean;
  discount_type: 'free' | 'fixed' | 'percentage';
  discount_value: number;
}

interface PaymentSummaryStepProps {
  formData: ShipmentFormData;
  pickupRelayId: string;
  deliveryRelayId: string;
  price: number;
  printingFee: number;
  assistanceFee: number;
  boxPrice: number;
  promoCode: string;
  totalPrice: number;
  homeDeliverySupplement?: number;
  promoCodeEnabled?: boolean;
  onPayment: (paymentMethod: PaymentMethod, promoInfo: PromoInfo) => void;
  onAddToCart?: (promoInfo: PromoInfo) => void;
  onBack: () => void;
}

function PaymentSummaryStep({
  formData,
  pickupRelayId: _pickupRelayId,
  deliveryRelayId: _deliveryRelayId,
  price,
  printingFee,
  assistanceFee: _assistanceFee,
  boxPrice,
  promoCode: _promoCode,
  totalPrice,
  homeDeliverySupplement = 1000,
  promoCodeEnabled = true,
  onPayment,
  onAddToCart,
  onBack,
}: PaymentSummaryStepProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<PromoInfo | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleValidatePromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoResult(null);
    try {
      const { data, error } = await api.validatePromoCode(code);
      if (error || !data) {
        setPromoError(error || 'Code invalide');
      } else {
        setPromoResult({
          code: data.code,
          promoFree: data.discount_type === 'free',
          discount_type: data.discount_type,
          discount_value: data.discount_value,
        });
      }
    } finally {
      setPromoLoading(false);
    }
  };

  const numericTotal = typeof totalPrice === 'string' ? parseFloat(totalPrice) : totalPrice;

  const discountAmount = promoResult
    ? promoResult.promoFree
      ? numericTotal
      : promoResult.discount_type === 'percentage'
        ? Math.round(numericTotal * promoResult.discount_value / 100)
        : Math.min(promoResult.discount_value, numericTotal)
    : 0;
  const effectiveTotalPrice = Math.max(0, numericTotal - discountAmount);

  const emptyPromoInfo: PromoInfo = { code: '', promoFree: false, discount_type: 'free', discount_value: 0 };
  const currentPromoInfo: PromoInfo = promoResult ?? emptyPromoInfo;

  const isDisabled = effectiveTotalPrice === 0 ? false : selectedPaymentMethod === null;

  const isHomePickup = formData.pickup_method === 'home_pickup';

  const paymentMethods: { id: NonNullable<PaymentMethod>; name: string; icon: typeof Smartphone; description: string }[] = [
    {
      id: 'paystack',
      name: 'Payer en ligne maintenant',
      icon: Smartphone,
      description: 'Mobile Money (Orange Money, Wave, MTN, Moov) ou Carte Visa — confirmation automatique',
    },
    {
      id: 'relay_cash',
      name: isHomePickup ? 'Payer lors du ramassage à domicile' : 'Payer lors de la prise en charge',
      icon: Wallet,
      description: isHomePickup
        ? 'Le livreur collecte le paiement en espèces ou par transfert quand il vient récupérer votre colis'
        : 'Espèces ou transfert au point relais lors du dépôt',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] mb-2">Récapitulatif de la commande</h2>
        <p className="text-[#6B7280]">Vérifiez les détails avant de procéder au paiement</p>
      </div>

      <div className="bg-white border-2 border-[#E6E6E6] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-[#FF6C00]" />
          <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A]">Détails de la commande</h3>
        </div>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h4 className="font-bold text-[#3A3A3A] mb-2">Expéditeur</h4>
            <p className="text-sm text-[#6B7280]">
              {formData.sender_first_name} {formData.sender_last_name}
            </p>
            <p className="text-sm text-[#6B7280]">{formData.sender_commune}, {formData.sender_quartier}</p>
            <p className="text-sm text-[#6B7280]">{formData.sender_address}</p>
          </div>

          <div className="border-b pb-4">
            <h4 className="font-bold text-[#3A3A3A] mb-2">Destinataire</h4>
            <p className="text-sm text-[#6B7280]">
              {formData.recipient_first_name} {formData.recipient_last_name}
            </p>
            <p className="text-sm text-[#6B7280]">{formData.recipient_commune}, {formData.recipient_quartier}</p>
            <p className="text-sm text-[#6B7280]">{formData.recipient_address}</p>
          </div>

          <div className="border-b pb-4">
            <h4 className="font-bold text-[#3A3A3A] mb-2">Détails du colis</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#6B7280]">Type:</span>
              <span className="font-medium">{formData.package_type === 'petit' ? 'Petit' : formData.package_type === 'moyen' ? 'Moyen' : 'Grand'}</span>
              <span className="text-[#6B7280]">Poids:</span>
              <span className="font-medium">{formData.weight} kg</span>
              {formData.pickup_method && (
                <>
                  <span className="text-[#6B7280]">Mode de dépôt:</span>
                  <span className="font-medium">
                    {formData.pickup_method === 'home_pickup'
                      ? 'Ramassage à domicile'
                      : formData.pickup_method === 'relay_deposit'
                        ? (formData.home_delivery ? 'Dépôt de colis en relais' : 'Dépôt au point relais')
                        : '-'}
                  </span>
                </>
              )}
              {formData.is_fragile && (
                <>
                  <span className="text-[#6B7280]">Fragile:</span>
                  <span className="font-medium text-orange-600">+500 FCFA</span>
                </>
              )}
              {formData.home_delivery && (
                <>
                  <span className="text-[#6B7280]">Livraison à domicile:</span>
                  <span className="font-medium text-orange-600">+{homeDeliverySupplement.toLocaleString('fr-FR')} FCFA</span>
                </>
              )}
              {formData.is_insured && (
                <>
                  <span className="text-[#6B7280]">Assurance:</span>
                  <span className="font-medium text-orange-600">Incluse</span>
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[#3A3A3A] mb-2">Frais additionnels</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Prix de base:</span>
                <span className="font-medium">{price} FCFA</span>
              </div>
              {printingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Impression au relais:</span>
                  <span className="font-medium">{printingFee} FCFA</span>
                </div>
              )}
              {boxPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Carton d'expédition:</span>
                  <span className="font-medium">{boxPrice} FCFA</span>
                </div>
              )}
              {promoResult && discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Code promo {promoResult.code}{promoResult.discount_type === 'percentage' ? ` (-${promoResult.discount_value}%)` : ''}:</span>
                  <span className="font-medium">-{discountAmount} FCFA</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>Total:</span>
                <span className="text-[#FF6C00]">{effectiveTotalPrice} FCFA</span>
              </div>
            </div>
          </div>

          {/* Promo code — shown only when admin has enabled the feature */}
          {promoCodeEnabled && (
            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setPromoOpen(v => !v);
                  if (promoOpen) { setPromoInput(''); setPromoResult(null); setPromoError(null); }
                }}
                className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#FF6C00] transition-colors"
              >
                <Tag className="w-4 h-4" />
                <span>J'ai un code promo</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${promoOpen ? 'rotate-180' : ''}`} />
              </button>

              {promoOpen && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        if (promoResult) { setPromoResult(null); setPromoError(null); }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleValidatePromo(); }}
                      placeholder="Entrez votre code promo"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleValidatePromo}
                      disabled={promoLoading || !promoInput.trim()}
                      className="px-4 py-2 bg-[#F6F7F9] text-[#3A3A3A] text-sm font-medium rounded-lg hover:bg-[#E6E6E6] disabled:opacity-50 flex items-center gap-1"
                    >
                      {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                    </button>
                  </div>
                  {promoResult && (
                    <p className="mt-1 text-sm text-green-600">
                      ✓ Code appliqué —{' '}
                      {promoResult.promoFree
                        ? 'Envoi gratuit'
                        : promoResult.discount_type === 'percentage'
                          ? `${promoResult.discount_value}% de réduction (−${discountAmount} FCFA)`
                          : `Réduction de ${discountAmount} FCFA`}
                    </p>
                  )}
                  {promoError && <p className="mt-1 text-sm text-red-600">{promoError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-2 border-[#E6E6E6] rounded-xl p-6">
        <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-4">Choisissez votre moyen de paiement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPaymentMethod === method.id;
            return (
              <label
                key={method.id}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#FF6C00] bg-orange-50'
                    : 'border-[#E6E6E6] hover:border-[#E6E6E6] hover:bg-[#F6F7F9]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={isSelected}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00] mt-1"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5 text-[#FF6C00]" />
                    <span className="font-medium text-black text-sm">{method.name}</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">{method.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-[#3A3A3A] hover:text-[#FF6C00] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="flex gap-3">
          {onAddToCart && (
            <button
              type="button"
              onClick={() => onAddToCart(currentPromoInfo)}
              className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border-2 border-[#FF6C00] text-[#FF6C00] font-semibold rounded-lg hover:bg-orange-50 transition-colors"
            >
              <Package className="w-5 h-5" />
              Ajouter au panier
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (effectiveTotalPrice === 0) {
                onPayment(null, currentPromoInfo);
                return;
              }
              if (!selectedPaymentMethod) {
                alert('Veuillez sélectionner un moyen de paiement');
                return;
              }
              onPayment(selectedPaymentMethod, currentPromoInfo);
            }}
            disabled={isDisabled}
            className={`flex items-center gap-2 px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
          >
            <CreditCard className="w-5 h-5" />
            {effectiveTotalPrice === 0 ? 'Valider gratuitement' : `Payer ${effectiveTotalPrice} FCFA`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSummaryStep;
