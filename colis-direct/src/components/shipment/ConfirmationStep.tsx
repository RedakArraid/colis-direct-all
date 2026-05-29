import { CheckCircle, FileText, Eye, AlertCircle, DollarSign, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import DepositRelayFinder from './DepositRelayFinder';
import { useState, useEffect } from 'react';
import {
  normalizePaymentStatus,
  getPaymentStatusLabel,
} from '../../utils/shipmentStatus';
import { downloadWaybillWithToast } from '../../utils/waybillUtils';
import { toast } from 'react-toastify';

interface ConfirmationStepProps {
  trackingNumber: string;
  shipmentId?: string;
  relayCashPendingTracking?: string | null;
  onNavigate: (page: string) => void;
  pickupCode?: string;
  shipmentCode?: string; // Numéro d'envoi (4 chiffres + 2 lettres)
  recipientInfo?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  pickupMethod?: 'relay_deposit' | 'home_pickup';
  homeDelivery?: boolean;
}

function ConfirmationStep({ 
  trackingNumber, 
  shipmentId, 
  relayCashPendingTracking, 
  onNavigate,
  pickupCode,
  shipmentCode,
  recipientInfo,
  homeDelivery,
  pickupMethod,
}: ConfirmationStepProps) {
  const toNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'bigint') return Number(value);
    return 0;
  };

  const formatCurrency = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const { user } = useAuth();
  const [loadingWaybill, setLoadingWaybill] = useState(false);
  const [showWaybillModal, setShowWaybillModal] = useState(false);
  const [shipmentData, setShipmentData] = useState<any>(null);

  // Try to find shipment by tracking number if shipmentId not provided
  const [actualShipmentId, setActualShipmentId] = useState<string | null>(shipmentId || null);

  useEffect(() => {
    const findShipment = async () => {
      if (actualShipmentId) {
        try {
          const { data: shipment } = await api.getShipment(actualShipmentId);
          if (shipment) {
            setShipmentData(shipment);
          }
        } catch (error) {
          console.error('Error loading shipment:', error);
        }
        return;
      }
      try {
        const { data: shipments } = await api.getShipments();
        const shipment = shipments?.find((s: any) => s.tracking_number === trackingNumber);
        if (shipment) {
          setActualShipmentId(shipment.id);
          setShipmentData(shipment);
        }
      } catch (error) {
        console.error('Error finding shipment:', error);
      }
    };
    findShipment();
  }, [trackingNumber, actualShipmentId]);
  
  // Utiliser shipmentCode depuis les props si disponible, sinon depuis shipmentData
  const displayShipmentCode = shipmentCode || shipmentData?.shipment_code;

  const downloadWaybill = async () => {
    if (!actualShipmentId) {
      toast.error('Impossible de trouver le colis. Veuillez réessayer plus tard.');
      return;
    }

    setLoadingWaybill(true);
    try {
      // Load full shipment details
      const { data: fullShipment, error: shipmentError } = await api.getShipment(actualShipmentId);
      if (shipmentError || !fullShipment) {
        toast.error('Erreur lors du chargement des détails du colis. Veuillez réessayer.');
        console.error('Error loading shipment:', shipmentError);
        return;
      }

      // Utiliser la fonction utilitaire pour télécharger le bordereau
      downloadWaybillWithToast(fullShipment, toast);
    } catch (error) {
      console.error('Error downloading waybill:', error);
      toast.error('Erreur lors du téléchargement du bordereau. Veuillez réessayer.');
    } finally {
      setLoadingWaybill(false);
    }
  };

  const downloadInvoice = async () => {
    if (!actualShipmentId || !shipmentData) {
      alert('Impossible de trouver les détails de la facture. Veuillez réessayer plus tard.');
      return;
    }

    try {
      const totalAmount = (toNumber(shipmentData.price) || 0) + 
                          (toNumber(shipmentData.printing_fee) || 0) + 
                          (toNumber(shipmentData.assistance_fee) || 0) + 
                          (toNumber(shipmentData.box_price) || 0);
      
      const senderName = `${shipmentData.sender_first_name || ''} ${shipmentData.sender_last_name || ''}`.trim() || 'N/A';
      const recipientName = `${shipmentData.recipient_first_name || ''} ${shipmentData.recipient_last_name || ''}`.trim() || 'N/A';
      const invoiceNumber = `FAC-${trackingNumber}`;

      const invoiceWindow = window.open('', '_blank');
      if (!invoiceWindow) {
        alert('Veuillez autoriser l\'ouverture des fenêtres popup pour télécharger la facture.');
        return;
      }

      const escapeHtml = (text: string) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      };

      const formatCurrency = (value: number) =>
        (Number.isFinite(value) ? value : 0).toLocaleString('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

      const paymentStatus = normalizePaymentStatus(shipmentData.payment_status);
      const paymentLabel = getPaymentStatusLabel(paymentStatus);
      
      const getPaymentMethodLabel = (method: string | null) => {
        if (!method) return 'Gratuit (code promo)';
        const labels: { [key: string]: string } = {
          'stripe': 'Carte bancaire',
          'mobile_money': 'Mobile Money',
          'paystack': 'Mobile Money',
          'cinetpay': 'Mobile Money',
          'wave': 'Wave',
          'relay_cash': 'Paiement lors de la prise en charge',
          'card': 'Carte bancaire',
          'cash': 'Espèces',
        };
        return labels[method] || method;
      };

      const items = [
        { description: 'Expédition de colis', price: toNumber(shipmentData.price) || 0 },
        ...(toNumber(shipmentData.printing_fee) > 0 ? [{ description: 'Impression au relais', price: toNumber(shipmentData.printing_fee) }] : []),
        ...(toNumber(shipmentData.assistance_fee) > 0 ? [{ description: 'Assistance', price: toNumber(shipmentData.assistance_fee) }] : []),
        ...(toNumber(shipmentData.box_price) > 0 ? [{ description: 'Carton d\'expédition', price: toNumber(shipmentData.box_price) }] : []),
      ];

      const invoiceContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Facture - ${escapeHtml(trackingNumber)}</title>
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
                  <div class="value">${escapeHtml(new Date(shipmentData.created_at || Date.now()).toLocaleDateString('fr-FR'))}</div>
                </div>
              </div>
              <div class="section">
                <div class="label">N° de facture</div>
                <div class="value">${escapeHtml(invoiceNumber)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 24px 0;">
                <div>
                  <div class="label">Expéditeur</div>
                  <div class="value">${escapeHtml(senderName)}</div>
                  <div style="font-size: 12px; color: #666;">${escapeHtml(shipmentData.sender_address || '')}</div>
                  <div style="font-size: 12px; color: #666;">${escapeHtml(shipmentData.sender_phone || '')}</div>
                </div>
                <div>
                  <div class="label">Destinataire</div>
                  <div class="value">${escapeHtml(recipientName)}</div>
                  <div style="font-size: 12px; color: #666;">${escapeHtml(shipmentData.recipient_address || '')}</div>
                  <div style="font-size: 12px; color: #666;">${escapeHtml(shipmentData.recipient_phone || '')}</div>
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
                  ${items.map((item: any) => `
                    <tr>
                      <td>${escapeHtml(item.description)}</td>
                      <td style="text-align: right;">${formatCurrency(item.price)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">
                <div style="display: flex; justify-content: space-between;">
                  <span>Total</span>
                  <span>${formatCurrency(totalAmount)} FCFA</span>
                </div>
              </div>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <div>Statut: ${escapeHtml(paymentLabel)}</div>
                <div>Moyen de paiement: ${escapeHtml(getPaymentMethodLabel(shipmentData.payment_method || 'unknown'))}</div>
                <div style="margin-top: 8px;">N° de suivi: ${escapeHtml(trackingNumber)}</div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 500);
              };
            </script>
          </body>
        </html>
      `;
      invoiceWindow.document.write(invoiceContent);
      invoiceWindow.document.close();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Erreur lors de la génération de la facture. Veuillez réessayer.');
    }
  };
  
  const getReturnPath = () => {
    if (!user) return 'home';
    if (user.role === 'pro') return 'pro-dashboard';
    if (user.role === 'relay_partner') return 'relay-dashboard';
    if (user.role === 'transporter') return 'transporter-login';
    if (user.role === 'admin') return 'admin-dashboard';
    if (user.role === 'support') return 'support-dashboard';
    return 'home';
  };

  const paymentMethod = shipmentData?.payment_method || null;
  const mobilePayment = shipmentData?.mobile_money_payment || null;
  const relayCashPayment = shipmentData?.relay_cash_payment || null;
  const mobilePaymentStatus = mobilePayment?.status || null;
  const isMobileMoneyRejected = paymentMethod === 'mobile_money' && mobilePaymentStatus === 'rejected';
  const isMobileMoneyPending =
    paymentMethod === 'mobile_money' &&
    !isMobileMoneyRejected &&
    (shipmentData?.payment_status ?? 'pending').toString().toLowerCase() !== 'paid';
  const isMobileMoneyApproved =
    paymentMethod === 'mobile_money' &&
    !isMobileMoneyRejected &&
    (shipmentData?.payment_status ?? '').toString().toLowerCase() === 'paid';
  const isRelayCashPayment = paymentMethod === 'relay_cash';
  const relayCashStatus = (relayCashPayment?.status || '').toString().toLowerCase();
  const isRelayCashPending =
    isRelayCashPayment &&
    (relayCashStatus === '' || relayCashStatus === 'pending') &&
    (shipmentData?.payment_status ?? 'pending') !== 'paid';
  const showRelayCashBanner =
    isRelayCashPending || (!!relayCashPendingTracking && relayCashPendingTracking === trackingNumber);

  return (
    <div className="text-center space-y-8 py-8">
      <div className="flex justify-center">
        <div className="bg-green-100 rounded-full p-6">
          <CheckCircle className="w-20 h-20 text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">Envoi créé avec succès !</h2>
        <p className="text-[#6B7280] text-lg">
          Votre colis est prêt pour l'expédition
        </p>
      </div>

      <div className="bg-[#F6F7F9] p-8 rounded-xl max-w-2xl mx-auto">
        <div className="mb-4">
          <span className="text-sm text-[#6B7280] block mb-2">Votre numéro de suivi</span>
          <div className="bg-white border-2 border-[#FF6C00] rounded-lg p-4 flex items-center justify-between">
            <span className="text-2xl font-bold text-black tracking-wider">{trackingNumber}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(trackingNumber);
                alert('Numéro de suivi copié !');
              }}
              className="ml-4 px-4 py-2 bg-[#FF6C00] text-white text-sm rounded-lg hover:bg-[#ff8534] transition-colors"
            >
              Copier
            </button>
          </div>
        </div>

        <p className="text-sm text-[#6B7280] mt-4">
          Conservez précieusement ce numéro pour suivre votre colis
        </p>
      </div>

      {/* Instructions pour inscrire les informations sur le colis */}
      {(displayShipmentCode || pickupCode) && recipientInfo && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg text-black mb-2">⚠️ Important : Inscrivez ces informations sur votre colis</h3>
              <p className="text-sm text-[#3A3A3A] mb-4">
                Avant de déposer ou de faire ramasser votre colis, veuillez inscrire clairement les informations suivantes sur chaque colis :
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#3A3A3A] min-w-[140px]">Nom du destinataire :</span>
              <span className="text-[#1A1A1A] font-medium">{recipientInfo.firstName} {recipientInfo.lastName}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#3A3A3A] min-w-[140px]">Téléphone du destinataire :</span>
              <span className="text-[#1A1A1A] font-medium">{recipientInfo.phone}</span>
            </div>
            {displayShipmentCode && (
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#3A3A3A] min-w-[140px]">Numéro d'envoi :</span>
                <span className="text-2xl font-bold text-[#FF6C00] tracking-wider font-mono">{displayShipmentCode}</span>
              </div>
            )}
          </div>

          {/* Le pickup_code est généré par le backend lors de la 1ère réception au relais.
               On ne l'affiche pas à la création car il n'est pas encore disponible.
               Le destinataire le recevra par notification lors de l'arrivée au relais. */}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-[#3A3A3A]">
              <strong>Rappel :</strong> Le numéro d'envoi doit être écrit de manière lisible sur chaque colis pour faciliter le traitement et la livraison.
            </p>
          </div>
        </div>
      )}

      {paymentMethod === 'mobile_money' && shipmentData && (
        <div className="max-w-2xl mx-auto w-full space-y-3">
          {isMobileMoneyPending && (
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 text-sm text-yellow-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Paiement en attente de confirmation</p>
                <p className="mt-1">
                  La transaction doit encore être confirmée automatiquement. Cela prend en général quelques instants après votre paiement.
                </p>
              </div>
            </div>
          )}

          {isMobileMoneyApproved && (
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 text-sm text-green-800 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Paiement confirmé</p>
                <p className="mt-1">
                  Votre paiement est bien enregistré. Vous pouvez déposer votre colis au relais sélectionné avec le bordereau imprimé.
                </p>
              </div>
            </div>
          )}

          {isMobileMoneyRejected && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-sm text-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Paiement non reçu</p>
                <p className="mt-1">
                  Nous n’avons pas pu confirmer votre paiement. Merci de vérifier la transaction et de contacter notre support si besoin.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {showRelayCashBanner && (
        <div className="max-w-2xl mx-auto w-full space-y-3">
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50 text-sm text-orange-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Paiement lors de la prise en charge</p>
              <p className="mt-1">
                Le paiement sera effectué en espèces lors de la prise en charge de votre colis, soit au point relais de dépôt, soit avec le transporteur lors du ramassage à domicile.
              </p>
            </div>
          </div>
          <div className="p-4 border border-[#E6E6E6] rounded-lg bg-white text-sm text-[#3A3A3A]">
            <p className="font-bold mb-1">Montant à régler :</p>
            <p className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              {formatCurrency(
                (relayCashPayment?.amount_expected !== undefined && relayCashPayment?.amount_expected !== null)
                  ? toNumber(relayCashPayment.amount_expected)
                  : (toNumber(shipmentData?.price) +
                      toNumber(shipmentData?.printing_fee) +
                      toNumber(shipmentData?.assistance_fee) +
                      toNumber(shipmentData?.box_price))
              )}{' '}
              FCFA
            </p>
            <p className="mt-3 text-xs text-[#6B7280]">
              Une fois le paiement confirmé par le relais, le statut de votre envoi passera automatiquement à « Paiement encaissé au relais ».
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-white border-2 border-[#E6E6E6] rounded-xl p-6">
          <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-bold text-[#1A1A1A] mb-2">Facture</h3>
          <p className="text-sm text-[#6B7280] mb-4">
            Téléchargez votre facture d'expédition
          </p>
          <button 
            onClick={downloadInvoice}
            disabled={!shipmentData}
            className="w-full px-4 py-3 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
          >
            <Download className="w-5 h-5" />
            Télécharger la facture
          </button>
        </div>

        <div className="bg-white border-2 border-[#E6E6E6] rounded-xl p-6">
          <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-[#1A1A1A] mb-2">Bordereau</h3>
          <p className="text-sm text-[#6B7280] mb-4">
            Votre bordereau d'expédition avec le code à inscrire
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowWaybillModal(true)}
              disabled={!shipmentData}
              className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Voir
            </button>
            <button 
              onClick={downloadWaybill}
              disabled={loadingWaybill || !actualShipmentId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {loadingWaybill ? 'Génération...' : 'Télécharger'}
            </button>
          </div>
        </div>

      </div>

      {/* Partage WhatsApp */}
      <div className="max-w-2xl mx-auto">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Voici le suivi de votre colis Colis Direct 📦\nN° de suivi: ${trackingNumber}\nSuivre: ${window.location.origin}/#/tracking?tracking=${trackingNumber}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Partager le suivi sur WhatsApp
        </a>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 max-w-2xl mx-auto text-left">
        <h4 className="font-bold text-yellow-800 mb-2">Instructions importantes :</h4>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li className="flex items-start">
            <span className="mr-2">1.</span>
            <span>{pickupMethod === 'home_pickup'
              ? 'Un transporteur viendra ramasser votre colis à votre adresse'
              : "Déposez votre colis dans n'importe quel point relais ColisDirect (sauf le relais de livraison ci-dessous)"}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">2.</span>
            <span>{pickupMethod === 'home_pickup'
              ? (homeDelivery
                  ? 'Le destinataire sera livré directement à son adresse'
                  : 'Le colis sera déposé directement au point relais de livraison par le transporteur')
              : (homeDelivery
                  ? 'Le destinataire sera livré directement à son adresse'
                  : 'Le destinataire sera notifié dès que le colis arrive au point relais de livraison')}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">3.</span>
            <span>Utilisez votre numéro de suivi pour suivre l'avancement de votre envoi</span>
          </li>
        </ul>
      </div>

      {/* Trouvez un point relais de dépôt — uniquement pour dépôt relais (relay_deposit), pas pour ramassage à domicile */}
      {pickupMethod !== 'home_pickup' && !homeDelivery && (
        <div className="max-w-3xl mx-auto w-full">
          <DepositRelayFinder
            destinationRelayId={shipmentData?.destination_relay_id ?? null}
            shipmentTrackingNumber={trackingNumber}
          />
        </div>
      )}

      <div className="flex justify-center gap-4 pt-6">
        <button
          onClick={() => { localStorage.setItem('trackingNumber', trackingNumber); onNavigate('tracking'); }}
          className="px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base bg-[#1A1A1A] text-white font-semibold rounded-lg hover:bg-[#1A1A1A]/90 active:scale-[0.98] transition-all"
        >
          Suivre mon colis
        </button>
        <button
          onClick={() => onNavigate(getReturnPath())}
          className="px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors"
        >
          {user?.role === 'pro' ? 'Retour au dashboard' : 'Retour à l\'accueil'}
        </button>
      </div>

      {/* Waybill Modal */}
      {showWaybillModal && shipmentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A]">Bordereau d'expédition</h2>
              <button onClick={() => setShowWaybillModal(false)} className="text-[#6B7280] hover:text-[#3A3A3A]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-[#FF6C00] rounded-lg p-6">
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#FF6C00]">
                  <div>
                    <h3 className="text-2xl font-bold text-[#FF6C00]">COLISDIRECT</h3>
                    <p className="text-sm text-[#6B7280]">Bordereau d'expédition</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#6B7280]">N° de suivi</p>
                    <p className="text-base sm:text-lg font-bold">{shipmentData.tracking_number}</p>
                    <p className="text-xs text-[#6B7280]">{new Date(shipmentData.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-[#6B7280] mb-1">Expéditeur</p>
                    <p className="font-semibold">{shipmentData.sender_first_name} {shipmentData.sender_last_name}</p>
                    <p className="text-sm text-[#6B7280]">{shipmentData.sender_address}</p>
                    <p className="text-sm text-[#6B7280]">{shipmentData.sender_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280] mb-1">Destinataire</p>
                    <p className="font-semibold">{shipmentData.recipient_first_name} {shipmentData.recipient_last_name}</p>
                    <p className="text-sm text-[#6B7280]">{shipmentData.recipient_address}</p>
                    <p className="text-sm text-[#6B7280]">{shipmentData.recipient_phone}</p>
                  </div>
                </div>
                {displayShipmentCode && (
                  <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">NUMÉRO D'ENVOI À INSCRIRE SUR LE COLIS</p>
                    <p className="text-3xl font-bold text-[#FF6C00] tracking-wider font-mono">{displayShipmentCode}</p>
                    <p className="text-xs text-yellow-700 mt-2">Inscrivez ce numéro d'envoi (4 chiffres + 2 lettres) clairement sur votre colis</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-[#6B7280] mb-1">Type de colis</p>
                    <p className="font-semibold">{shipmentData.package_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280] mb-1">Poids</p>
                    <p className="font-semibold">{shipmentData.weight} kg</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowWaybillModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-[#F6F7F9]"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setShowWaybillModal(false);
                    downloadWaybill();
                  }}
                  className="px-6 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534]"
                >
                  Télécharger le bordereau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfirmationStep;
