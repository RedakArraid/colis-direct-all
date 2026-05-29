import { CheckCircle, Download, Eye, Receipt } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import DepositRelayFinder from '../components/shipment/DepositRelayFinder';
import { useCart } from '../contexts/CartContext';
import { normalizePaymentStatus, getPaymentStatusLabel } from '../utils/shipmentStatus';
import { BasePageProps } from '../types/pages';
import LoadingSpinner from '../components/LoadingSpinner';
import { downloadWaybillWithToast, openWaybillInWindow } from '../utils/waybillUtils';
import { toast } from 'react-toastify';

interface PaymentSuccessPageProps extends BasePageProps {
  onNavigate: (page: string) => void; // Obligatoire pour cette page car utilisée
}

function PaymentSuccessPage({ onNavigate }: PaymentSuccessPageProps) {
  const toNumeric = (value: number | string | null | undefined): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/\s/g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatCurrency = (value: number | string | null | undefined) =>
    toNumeric(value).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  useAuth();
  const { clearCart } = useCart();
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);

  useEffect(() => {
    clearCart();

    // Le tracking est dans le hash (#/payment-success?tracking=CD...)
    // Paystack ajoute trxref/reference dans window.location.search
    const hash = window.location.hash || '';
    const hashSearch = hash.includes('?') ? hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashSearch);
    const searchParams = new URLSearchParams(window.location.search);

    const tracking =
      hashParams.get('tracking') ||
      searchParams.get('tracking') ||
      searchParams.get('tracking_number') ||
      sessionStorage.getItem('last_payment_tracking');

    const reference =
      searchParams.get('trxref') ||
      searchParams.get('reference') ||
      hashParams.get('reference');

    if (tracking) {
      setTrackingNumber(tracking);
      sessionStorage.removeItem('last_payment_tracking');

      // Pour les paiements batch (BATCH-xxx), le tracking dans l'URL est le premier
      // colis réel (on a corrigé initPaystack pour passer tracking_numbers[0] comme
      // tracking_number dans l'URL). Donc on l'utilise directement.
      // S'il commence quand même par BATCH- (ancien code), on informe l'utilisateur.
      const isBatchRef = tracking.startsWith('BATCH-');

      if (reference) {
        api.verifyPaystackPayment(reference, tracking)
          .then(({ data }) => {
            setPaymentVerified(data?.paid ?? null);
            if (!isBatchRef) loadShipment(tracking);
            else setLoading(false); // batch_ref: pas de colis unique à charger
          })
          .catch(() => {
            setPaymentVerified(null);
            if (!isBatchRef) loadShipment(tracking);
            else setLoading(false);
          });
      } else {
        setPaymentVerified(null);
        if (!isBatchRef) loadShipment(tracking);
        else setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadShipment = async (tracking: string) => {
    try {
      const { data: trackingData, error: trackingError } = await api.getTracking(tracking);
      if (trackingError || !trackingData) {
        console.error('Error loading shipment:', trackingError);
        setLoading(false);
        return;
      }

      // Get full shipment details
      const { data: shipments, error: shipmentsError } = await api.getShipments();
      if (shipmentsError) {
        console.error('Error loading shipments:', shipmentsError);
        setLoading(false);
        return;
      }

      const fullShipment = shipments?.find((s: any) => s.tracking_number === tracking);
      if (fullShipment) {
        setShipment(fullShipment);
      }
    } catch (error) {
      console.error('Error loading shipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = () => {
    if (!shipment) return;

    const priceAmount = toNumeric(shipment.price);
    const printingAmount = toNumeric(shipment.printing_fee);
    const assistanceAmount = toNumeric(shipment.assistance_fee);
    const boxAmount = toNumeric(shipment.box_price);
    const totalAmount = priceAmount + printingAmount + assistanceAmount + boxAmount;
    const senderName = `${shipment.sender_first_name || ''} ${shipment.sender_last_name || ''}`.trim() || 'N/A';
    const recipientName = `${shipment.recipient_first_name || ''} ${shipment.recipient_last_name || ''}`.trim() || 'N/A';

    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) {
      alert('Veuillez autoriser l\'ouverture des fenêtres popup pour télécharger la facture.');
      return;
    }

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Facture - ${shipment.tracking_number}</title>
          <style>
            @media print {
              @page { size: A4; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; margin: 24px; background: white; }
            .invoice { border: 2px solid #FF6C00; padding: 24px; border-radius: 12px; max-width: 800px; margin: 0 auto; background: white; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 15px; border-bottom: 2px solid #FF6C00; }
            .logo { font-size: 24px; font-weight: bold; color: #FF6C00; }
            .section { margin: 16px 0; }
            .label { color: #666; font-size: 12px; margin-bottom: 4px; }
            .value { font-weight: 600; font-size: 14px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            .total { font-size: 18px; font-weight: bold; color: #FF6C00; margin-top: 16px; padding-top: 16px; border-top: 2px solid #FF6C00; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            table th, table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            table th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="logo">COLISDIRECT</div>
              <div>
                <div class="label">Date</div>
                <div class="value">${new Date(shipment.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <div class="section">
              <div class="label">N° de facture</div>
              <div class="value">FAC-${shipment.tracking_number}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 24px 0;">
              <div>
                <div class="label">Expéditeur</div>
                <div class="value">${senderName}</div>
                <div style="font-size: 12px; color: #666;">${shipment.sender_address || ''}</div>
                <div style="font-size: 12px; color: #666;">${shipment.sender_phone || ''}</div>
              </div>
              <div>
                <div class="label">Destinataire</div>
                <div class="value">${recipientName}</div>
                <div style="font-size: 12px; color: #666;">${shipment.recipient_address || ''}</div>
                <div style="font-size: 12px; color: #666;">${shipment.recipient_phone || ''}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Expédition de colis</td>
                  <td style="text-align: right;">${formatCurrency(priceAmount)}</td>
                </tr>
                ${
                  printingAmount > 0
                    ? `<tr><td>Impression au relais</td><td style="text-align: right;">${formatCurrency(printingAmount)}</td></tr>`
                    : ''
                }
                ${
                  assistanceAmount > 0
                    ? `<tr><td>Assistance</td><td style="text-align: right;">${formatCurrency(assistanceAmount)}</td></tr>`
                    : ''
                }
                ${
                  boxAmount > 0
                    ? `<tr><td>Carton d'expédition</td><td style="text-align: right;">${formatCurrency(boxAmount)}</td></tr>`
                    : ''
                }
              </tbody>
            </table>
            <div class="total">
              <div style="display: flex; justify-content: space-between;">
                <span>Total</span>
                <span>${formatCurrency(totalAmount)} FCFA</span>
              </div>
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              <div>Statut: ${getPaymentStatusLabel(normalizePaymentStatus(shipment.payment_status))}</div>
              <div>Moyen de paiement: ${shipment.payment_method || 'N/A'}</div>
            </div>
          </div>
        </body>
      </html>
    `;
    invoiceWindow.document.write(invoiceContent);
    invoiceWindow.document.close();
  };

  const viewWaybill = async () => {
    if (!shipment) return;

    try {
      const { data: fullShipment, error: shipmentError } = await api.getShipment(shipment.id);
      if (shipmentError || !fullShipment) {
        toast.error('Erreur lors du chargement des détails du colis.');
        return;
      }

      // Utiliser la fonction utilitaire pour ouvrir le bordereau
      openWaybillInWindow(fullShipment, false);
    } catch (error) {
      console.error('Error viewing waybill:', error);
      toast.error('Erreur lors de l\'ouverture du bordereau.');
    }
  };

  const downloadWaybill = async () => {
    if (!shipment) return;

    try {
      const { data: fullShipment, error: shipmentError } = await api.getShipment(shipment.id);
      if (shipmentError || !fullShipment) {
        toast.error('Erreur lors du chargement des détails du colis. Veuillez réessayer.');
        return;
      }

      // Utiliser la fonction utilitaire pour télécharger le bordereau
      downloadWaybillWithToast(fullShipment, toast);
    } catch (error) {
      console.error('Error downloading waybill:', error);
      toast.error('Erreur lors du téléchargement du bordereau. Veuillez réessayer.');
    }
  };

  // Paiement explicitement rejeté/abandonné par Paystack
  if (paymentVerified === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <CheckCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Paiement non abouti</h1>
          <p className="text-[#6B7280] mb-2">
            Votre paiement n'a pas été confirmé par l'opérateur.
          </p>
          {trackingNumber && (
            <p className="text-sm text-[#6B7280] mb-6">
              Numéro de suivi : <span className="font-mono font-semibold">{trackingNumber}</span><br />
              Votre envoi a été créé — vous pouvez payer plus tard depuis "Mes envois".
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => onNavigate('create-shipment')} className="px-6 py-3 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors font-semibold">
              Réessayer le paiement
            </button>
            <button onClick={() => onNavigate('my-shipments')} className="px-6 py-3 border rounded-lg hover:bg-[#F6F7F9] transition-colors">
              Mes envois
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-8 mb-6 text-center">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="bg-green-100 rounded-full p-3 sm:p-4">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">Paiement réussi</h1>
          <p className="text-sm sm:text-base text-[#6B7280] mb-4 sm:mb-6">
            {trackingNumber && !trackingNumber.startsWith('BATCH-')
              ? `Votre paiement a été confirmé. Votre numéro de suivi est : ${trackingNumber}`
              : trackingNumber && trackingNumber.startsWith('BATCH-')
              ? 'Votre paiement groupé a été confirmé. Vos colis sont en cours de traitement — retrouvez-les dans « Mes envois ».'
              : 'Votre paiement a été confirmé.'}
          </p>

          {loading ? (
            <div className="py-8">
              <LoadingSpinner message="Chargement des détails..." />
            </div>
          ) : shipment ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={downloadInvoice}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
                >
                  <Receipt className="w-5 h-5" />
                  <span className="font-semibold">Télécharger la facture</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={viewWaybill}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border-2 border-[#FF6C00] text-[#FF6C00] rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    <span className="font-semibold">Voir le bordereau</span>
                  </button>
                  <button
                    onClick={downloadWaybill}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-semibold">Télécharger le bordereau</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 px-4">
            {trackingNumber && !trackingNumber.startsWith('BATCH-') && (
              <button onClick={() => { if (trackingNumber) localStorage.setItem('trackingNumber', trackingNumber); onNavigate('tracking'); }} className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-[#1A1A1A] text-white rounded-xl hover:bg-black transition-colors active:scale-[0.98]">Suivre mon colis</button>
            )}
            <button onClick={() => onNavigate('my-shipments')} className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors font-semibold">Mes envois</button>
            <button onClick={() => onNavigate('home')} className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border rounded-lg hover:bg-[#F6F7F9] transition-colors">Retour à l'accueil</button>
          </div>
        </div>

        {/* Trouvez un point relais de dépôt — uniquement pour livraison en relais */}
        {shipment && !shipment.home_delivery && (
          <div className="mb-6">
            <DepositRelayFinder
              destinationRelayId={shipment.destination_relay_id ?? null}
              shipmentTrackingNumber={trackingNumber ?? undefined}
            />
          </div>
        )}
      </div>

    </div>
  );
}

export default PaymentSuccessPage;


