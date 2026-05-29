/**
 * Utilitaires pour la génération automatique de factures et bordereaux
 * Note: La génération des bordereaux est maintenant centralisée dans waybillUtils.ts
 */
import { generateWaybillHtml as waybillGenerateWaybillHtml } from './waybillUtils';

/**
 * Échappe le HTML pour éviter les attaques XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export interface ShipmentData {
  id?: string;
  tracking_number: string;
  shipment_code?: string;
  pickup_code?: string;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_email?: string;
  sender_phone?: string;
  sender_address?: string;
  sender_commune?: string;
  sender_quartier?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_address?: string;
  recipient_commune?: string;
  recipient_quartier?: string;
  package_type?: string;
  weight?: number | string;
  price?: number | string;
  printing_fee?: number | string;
  assistance_fee?: number | string;
  box_price?: number | string;
  payment_status?: string;
  payment_method?: string;
  current_status?: string;
  home_delivery?: boolean;
  origin_relay_id?: string;
  destination_relay_id?: string;
  created_at?: string;
}

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

const formatAmount = (value: number | string | null | undefined) => {
  return toNumeric(value).toLocaleString('fr-FR');
};

/**
 * Génère le HTML de la facture
 */
export function generateInvoiceHtml(shipment: ShipmentData, options: { autoPrint?: boolean } = {}): string {
  const { autoPrint = false } = options;
  const sender = `${shipment.sender_first_name ?? ''} ${shipment.sender_last_name ?? ''}`.trim();
  const recipient = `${shipment.recipient_first_name ?? ''} ${shipment.recipient_last_name ?? ''}`.trim();
  const invoiceNumber = `FAC-${shipment.tracking_number}`;
  
  const priceValue = toNumeric(shipment.price);
  const printingFeeValue = toNumeric(shipment.printing_fee);
  const assistanceFeeValue = toNumeric(shipment.assistance_fee);
  const boxPriceValue = toNumeric(shipment.box_price);
  const totalAmount = priceValue + printingFeeValue + assistanceFeeValue + boxPriceValue;

  const paymentStatus = (shipment.payment_status || '').toLowerCase();
  const paymentLabel = paymentStatus === 'paid' ? 'Payé' : paymentStatus === 'cancelled' ? 'Annulé' : 'En attente';
  const paymentBadgeClass = paymentStatus === 'paid' ? 'status-paid' : paymentStatus === 'cancelled' ? 'status-cancelled' : 'status-pending';

  const logoUrl = `${window.location.origin}/logo.png`;
  const onloadAttr = autoPrint ? "window.print(); setTimeout(() => window.close(), 300);" : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <base href="${window.location.origin}" />
        <title>Facture - ${escapeHtml(invoiceNumber)}</title>
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
          }
          body { font-family: Arial, sans-serif; margin: 24px; }
          .invoice { border: 2px solid #FF6C00; padding: 24px; border-radius: 12px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 15px; border-bottom: 2px solid #FF6C00; }
          .logo-container { display: flex; flex-direction: column; align-items: flex-start; }
          .logo { height: 60px; width: auto; object-fit: contain; margin-bottom: 8px; }
          .title { font-size: 28px; font-weight: bold; color: #FF6C00; }
          .date { font-size: 12px; color: #666; }
          .section { margin: 16px 0; }
          .label { color: #666; font-size: 12px; margin-bottom: 4px; }
          .value { font-weight: 600; font-size: 14px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total { font-size: 18px; font-weight: bold; color: #FF6C00; margin-top: 16px; padding-top: 16px; border-top: 2px solid #FF6C00; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          table th, table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          table th { background-color: #f5f5f5; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
          .status-paid { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-cancelled { background: #f8d7da; color: #721c24; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body ${onloadAttr ? `onload="${onloadAttr}"` : ''}>
        <div class="invoice">
          <div class="header">
            <div class="logo-container">
              <img src="${logoUrl}" alt="COLISDIRECT Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="title" style="display: none;">COLISDIRECT</div>
              <div class="date">${escapeHtml(new Date(shipment.created_at || Date.now()).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }))}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">N° de facture</div>
              <div class="value" style="font-size: 18px;">${escapeHtml(invoiceNumber)}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin: 24px 0;">
            <div>
              <div class="label">Expéditeur</div>
              <div class="value">${escapeHtml(sender || 'N/A')}</div>
              ${shipment.sender_address ? `<div style="font-size: 12px; color: #666;">${escapeHtml(shipment.sender_address)}</div>` : ''}
              ${shipment.sender_commune ? `<div style="font-size: 12px; color: #666;">${escapeHtml(shipment.sender_commune)}</div>` : ''}
              ${shipment.sender_phone ? `<div style="font-size: 12px; color: #666;">${escapeHtml(shipment.sender_phone)}</div>` : ''}
            </div>
            <div>
              <div class="label">Destinataire</div>
              <div class="value">${escapeHtml(recipient || 'N/A')}</div>
              ${shipment.recipient_address ? `<div style="font-size: 12px; color: #666;">${escapeHtml(shipment.recipient_address)}</div>` : ''}
              ${shipment.recipient_commune ? `<div style="font-size: 12px; color: #666;">${escapeHtml(shipment.recipient_commune)}</div>` : ''}
              ${shipment.recipient_phone ? `<div style="font-size: 12px; color: #666;">${escapeHtml(shipment.recipient_phone)}</div>` : ''}
            </div>
          </div>

          <div style="margin: 16px 0; padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <div class="label">Numéro de suivi</div>
                <div class="value" style="font-family: monospace; color: #FF6C00;">${escapeHtml(shipment.tracking_number || 'N/A')}</div>
              </div>
              ${shipment.shipment_code ? `
              <div>
                <div class="label">Numéro d'envoi</div>
                <div class="value" style="font-family: monospace; font-size: 18px; color: #FF6C00; font-weight: bold;">${escapeHtml(shipment.shipment_code)}</div>
                <div style="font-size: 10px; color: #666; margin-top: 4px;">(À écrire sur le colis)</div>
              </div>
              ` : ''}
              ${shipment.pickup_code ? `
              <div style="grid-column: 1 / -1; margin-top: 8px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <div class="label">Code de retrait (secret)</div>
                <div class="value" style="font-family: monospace; font-size: 18px; color: #dc2626; font-weight: bold;">${escapeHtml(shipment.pickup_code)}</div>
                <div style="font-size: 10px; color: #666; margin-top: 4px;">(Pour le destinataire uniquement - Ne pas écrire sur le colis)</div>
              </div>
              ` : ''}
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
                <td style="text-align: right;">${formatAmount(priceValue)}</td>
              </tr>
              ${printingFeeValue ? `<tr><td>Impression au relais</td><td style="text-align: right;">${formatAmount(printingFeeValue)}</td></tr>` : ''}
              ${assistanceFeeValue ? `<tr><td>Assistance</td><td style="text-align: right;">${formatAmount(assistanceFeeValue)}</td></tr>` : ''}
              ${boxPriceValue ? `<tr><td>Carton d'expédition</td><td style="text-align: right;">${formatAmount(boxPriceValue)}</td></tr>` : ''}
            </tbody>
          </table>

          <div class="total">
            <div style="display: flex; justify-content: space-between;">
              <span>Total</span>
              <span>${formatAmount(totalAmount)} FCFA</span>
            </div>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <div>Statut: <span class="status-badge ${paymentBadgeClass}">${escapeHtml(paymentLabel)}</span></div>
            ${shipment.payment_method ? `<div style="margin-top: 8px;">Moyen de paiement: ${escapeHtml(shipment.payment_method)}</div>` : ''}
          </div>

          <div class="footer">
            <div>Facture générée automatiquement par COLISDIRECT</div>
            <div>Conservez cette facture pour vos archives</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * @deprecated Utilisez generateWaybillHtml de waybillUtils.ts à la place
 * Génère le HTML du bordereau avec QR code (si applicable selon les règles)
 */
export function generateWaybillHtml(shipment: ShipmentData, _options: { autoPrint?: boolean } = {}): string {
  // Déléguer à la fonction centralisée dans waybillUtils
  return waybillGenerateWaybillHtml(shipment);
}

/**
 * Télécharge automatiquement la facture et le bordereau après création d'un envoi
 */
export function autoDownloadInvoiceAndWaybill(shipment: ShipmentData) {
  try {
    // Générer et télécharger la facture
    const invoiceHtml = generateInvoiceHtml(shipment);
    const invoiceBlob = new Blob([invoiceHtml], { type: 'text/html' });
    const invoiceUrl = URL.createObjectURL(invoiceBlob);
    const invoiceLink = document.createElement('a');
    invoiceLink.href = invoiceUrl;
    invoiceLink.download = `facture-${shipment.tracking_number}.html`;
    invoiceLink.style.display = 'none';
    document.body.appendChild(invoiceLink);
    invoiceLink.click();
    document.body.removeChild(invoiceLink);
    URL.revokeObjectURL(invoiceUrl);

    // Attendre un peu avant de télécharger le bordereau
    setTimeout(() => {
      // Générer et télécharger le bordereau
      const waybillHtml = waybillGenerateWaybillHtml(shipment);
      const waybillBlob = new Blob([waybillHtml], { type: 'text/html' });
      const waybillUrl = URL.createObjectURL(waybillBlob);
      const waybillLink = document.createElement('a');
      waybillLink.href = waybillUrl;
      waybillLink.download = `bordereau-${shipment.tracking_number}.html`;
      waybillLink.style.display = 'none';
      document.body.appendChild(waybillLink);
      waybillLink.click();
      document.body.removeChild(waybillLink);
      URL.revokeObjectURL(waybillUrl);
    }, 500);
  } catch (error) {
    console.error('Erreur lors du téléchargement automatique des documents:', error);
  }
}

/**
 * Ouvre la facture et le bordereau dans de nouvelles fenêtres (sans téléchargement automatique)
 */
export function openInvoiceAndWaybill(shipment: ShipmentData) {
  try {
    // Ouvrir la facture
    const invoiceWindow = window.open('', '_blank');
    if (invoiceWindow) {
      invoiceWindow.document.write(generateInvoiceHtml(shipment));
      invoiceWindow.document.close();
    }

    // Attendre un peu avant d'ouvrir le bordereau
    setTimeout(() => {
      const waybillWindow = window.open('', '_blank');
      if (waybillWindow) {
        waybillWindow.document.write(waybillGenerateWaybillHtml(shipment));
        waybillWindow.document.close();
      }
    }, 500);
  } catch (error) {
    console.error('Erreur lors de l\'ouverture des documents:', error);
  }
}

