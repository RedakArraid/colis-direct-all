import { useEffect, useState } from 'react';
import { CreditCard, Printer, Package, ChevronLeft } from 'lucide-react';
import { calculateShipmentPrice } from '../../utils/priceCalculation';
import type { ShipmentFormData } from '../../pages/CreateShipmentPage';

interface PaymentStepProps {
  formData: ShipmentFormData;
  pickupRelayId: string;
  deliveryRelayId: string;
  onComplete: (options: { printOption: 'self' | 'relay'; needBox: boolean; promoCode: string }) => void;
  onBack: () => void;
  initialOptions?: {
    printOption: 'self' | 'relay';
    needBox: boolean;
    promoCode: string;
  } | null;
}

function PaymentStep({ formData, pickupRelayId: _pickupRelayId, deliveryRelayId: _deliveryRelayId, onComplete, onBack, initialOptions }: PaymentStepProps) {
  const [printOption, setPrintOption] = useState<'self' | 'relay'>(() => initialOptions?.printOption ?? 'self');
  const [needBox, setNeedBox] = useState(() => initialOptions?.needBox ?? false);
  const [processing] = useState(false);

  useEffect(() => {
    if (initialOptions) {
      setPrintOption(initialOptions.printOption);
      setNeedBox(initialOptions.needBox);
    }
  }, [initialOptions]);

  const price = calculateShipmentPrice(
    formData.package_type,
    formData.weight,
    formData.sender_commune,
    formData.recipient_commune,
    formData.is_fragile,
    false, // is_express supprimé
    formData.home_delivery
  );

  const printingFee = printOption === 'relay' ? 100 : 0;
  const boxPrice = needBox ? 200 : 0;
  const totalPrice = price + printingFee + boxPrice;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">Paiement</h2>
        <p className="text-[#6B7280]">Configurez les options de votre envoi et procédez au paiement</p>
      </div>

      <div className="bg-[#F6F7F9] p-6 rounded-lg">
        <h3 className="text-lg font-bold text-black mb-4">Résumé de l'envoi</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Type:</span>
            <span className="font-medium">{formData.package_type === 'petit' ? 'Petit' : formData.package_type === 'moyen' ? 'Moyen' : 'Grand'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Poids:</span>
            <span className="font-medium">{formData.weight} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">De:</span>
            <span className="font-medium">{formData.sender_commune}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Vers:</span>
            <span className="font-medium">{formData.recipient_commune}</span>
          </div>
          {formData.is_fragile && (
            <div className="flex justify-between text-orange-600">
              <span>Option fragile:</span>
              <span className="font-medium">+500 FCFA</span>
            </div>
          )}
          {formData.home_delivery && (
            <div className="flex justify-between text-orange-600">
              <span>Livraison à domicile:</span>
              <span className="font-medium">+1 000 FCFA</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-2 border-[#E6E6E6] rounded-lg p-6">
        <h3 className="text-lg font-bold text-black mb-4 flex items-center">
          <Printer className="w-5 h-5 mr-2 text-[#FF6C00]" />
          Options d'impression du bordereau
        </h3>

        <div className="space-y-3">
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-[#F6F7F9] transition-all">
            <input
              type="radio"
              name="printOption"
              value="self"
              checked={printOption === 'self'}
              onChange={(e) => setPrintOption(e.target.value as 'self' | 'relay')}
              className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00] mt-1"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-black">J'imprime moi-même le bordereau</div>
              <p className="text-sm text-[#6B7280] mt-1">
                Vous recevrez le bordereau par email et pourrez l'imprimer chez vous
              </p>
            </div>
            <span className="text-sm font-medium text-[#3A3A3A]">Gratuit</span>
          </label>

          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-[#F6F7F9] transition-colors">
            <input
              type="radio"
              name="printOption"
              value="relay"
              checked={printOption === 'relay'}
              onChange={(e) => setPrintOption(e.target.value as 'self' | 'relay')}
              className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00] mt-1"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-black">Impression au point relais</div>
              <p className="text-sm text-[#6B7280] mt-1">
                Le bordereau sera imprimé directement au point relais de dépôt
              </p>
            </div>
            <span className="text-sm font-medium text-[#FF6C00]">+100 FCFA</span>
          </label>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E6E6E6] rounded-lg p-6">
        <h3 className="text-lg font-bold text-black mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2 text-[#FF6C00]" />
          Options supplémentaires
        </h3>

        <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-[#F6F7F9] transition-colors">
          <input
            type="checkbox"
            checked={needBox}
            onChange={(e) => setNeedBox(e.target.checked)}
            className="w-5 h-5 text-[#FF6C00] focus:ring-[#FF6C00] rounded mt-1"
          />
          <div className="ml-3">
            <div className="font-medium text-black">Carton d'expédition</div>
            <p className="text-sm text-[#6B7280] mt-1">
              Un carton adapté à votre colis (+200 FCFA)
            </p>
          </div>
        </label>
      </div>

      <div className="bg-[#FF6C00] bg-opacity-10 border-2 border-[#FF6C00] rounded-lg p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-medium text-[#3A3A3A]">Prix de base:</span>
          <span className="text-2xl font-bold text-black">{price} FCFA</span>
        </div>
        {printingFee > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#6B7280]">Impression au relais:</span>
            <span className="font-medium text-black">{printingFee} FCFA</span>
          </div>
        )}
        {needBox && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#6B7280]">Carton d'expédition:</span>
            <span className="font-medium text-black">{boxPrice} FCFA</span>
          </div>
        )}
        <div className="pt-4 border-t-2 border-[#FF6C00] flex justify-between items-center">
          <span className="text-lg sm:text-xl font-bold text-black">Total à payer:</span>
          <span className="text-3xl font-bold text-[#FF6C00]">{totalPrice} FCFA</span>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Le paiement s'effectue via Mobile Money. Vous recevrez une notification pour confirmer la transaction.
        </p>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-[#3A3A3A] hover:text-[#FF6C00] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>

        <button
          onClick={() => {
            onComplete({ printOption, needBox, promoCode: '' });
          }}
          disabled={processing}
          className="flex items-center gap-2 px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CreditCard className="w-5 h-5" />
          Continuer vers le récapitulatif
        </button>
      </div>
    </div>
  );
}

export default PaymentStep;
