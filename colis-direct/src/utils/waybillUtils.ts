import {
  getEffectiveShipmentStatus,
  getShipmentStatusLabel,
  getShipmentStatusBadgeClass,
  normalizePaymentStatus,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
} from './shipmentStatus';

export interface ShipmentData {
  id?: string;
  tracking_number?: string;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_phone?: string;
  sender_address?: string;
  sender_commune?: string;
  sender_quartier?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  recipient_commune?: string;
  recipient_quartier?: string;
  package_type?: string;
  weight?: number | string;
  pickup_code?: string;
  shipment_code?: string;
  payment_status?: string;
  payment_method?: string;
  current_status?: string;
  effective_status?: string;
  created_at?: string;
  home_delivery?: boolean;
}

/**
 * Échappe le HTML pour éviter les attaques XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Convertit les classes Tailwind en styles inline pour les badges
 */
function getStatusBadgeStyle(badgeClass: string): string {
  // Convertir les classes Tailwind en styles inline
  if (badgeClass.includes('green')) {
    return 'background-color: #d4edda; color: #155724;';
  }
  if (badgeClass.includes('red')) {
    return 'background-color: #f8d7da; color: #721c24;';
  }
  if (badgeClass.includes('yellow')) {
    return 'background-color: #fff3cd; color: #856404;';
  }
  if (badgeClass.includes('blue')) {
    return 'background-color: #d1ecf1; color: #0c5460;';
  }
  if (badgeClass.includes('purple')) {
    return 'background-color: #e2e3f1; color: #383d41;';
  }
  if (badgeClass.includes('orange')) {
    return 'background-color: #ffeaa7; color: #856404;';
  }
  // Par défaut: gris
  return 'background-color: #e2e3e5; color: #383d41;';
}

/**
 * Génère le HTML complet du bordereau
 */
export function generateWaybillHtml(shipment: ShipmentData): string {
  const sender = `${shipment.sender_first_name ?? ''} ${shipment.sender_last_name ?? ''}`.trim();
  const recipient = `${shipment.recipient_first_name ?? ''} ${shipment.recipient_last_name ?? ''}`.trim();
  
  const effectiveStatus = getEffectiveShipmentStatus(shipment);
  const statusLabel = getShipmentStatusLabel(effectiveStatus);
  const statusBadgeClass = getShipmentStatusBadgeClass(effectiveStatus);
  const paymentStatus = normalizePaymentStatus(shipment.payment_status);
  const paymentLabel = getPaymentStatusLabel(paymentStatus);
  const paymentBadgeClass = getPaymentStatusBadgeClass(paymentStatus);

  const logoUrl = window.location.origin + '/logo.png';
  const dateFormatted = shipment.created_at
    ? new Date(shipment.created_at).toLocaleDateString('fr-FR', { dateStyle: 'full' })
    : new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' });

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <base href="${window.location.origin}" />
    <title>Bordereau - ${escapeHtml(shipment.tracking_number || '')}</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>
      @media print {
        @page { size: A4; margin: 10mm; }
      }
      body { 
        font-family: Arial, sans-serif; 
        margin: 24px; 
        background: white; 
        cursor: default !important; 
      }
      * { cursor: default !important; }
      a, button, input, select, textarea { cursor: pointer !important; }
      .card { 
        border: 2px solid #FF6C00; 
        padding: 20px; 
        border-radius: 12px; 
        max-width: 800px; 
        margin: 0 auto; 
        background: white; 
      }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 20px; 
        padding-bottom: 15px; 
        border-bottom: 2px solid #FF6C00; 
      }
      .logo-container { 
        display: flex; 
        flex-direction: column; 
        align-items: flex-start; 
      }
      .logo { 
        height: 60px; 
        width: auto; 
        object-fit: contain; 
        margin-bottom: 8px; 
      }
      .title { 
        font-size: 28px; 
        font-weight: bold; 
        color: #FF6C00; 
      }
      .tracking { 
        font-size: 18px; 
        font-weight: bold; 
        color: #333; 
      }
      .date { 
        font-size: 12px; 
        color: #666; 
      }
      .row { 
        display: flex; 
        justify-content: space-between; 
        margin: 12px 0; 
        gap: 20px; 
      }
      .col { 
        flex: 1; 
      }
      .label { 
        color: #666; 
        font-size: 11px; 
        margin-bottom: 4px; 
        text-transform: uppercase; 
      }
      .value { 
        font-weight: 600; 
        font-size: 16px; 
        color: #333; 
      }
      .info-section { 
        margin: 15px 0; 
        padding: 15px; 
        background: #fff; 
        border: 1px solid #e0e0e0; 
        border-radius: 8px; 
      }
      .status-badge { 
        display: inline-block; 
        padding: 4px 12px; 
        border-radius: 12px; 
        font-size: 11px; 
        font-weight: bold; 
      }
      .status-pending { 
        background: #fff3cd; 
        color: #856404; 
      }
      .status-paid { 
        background: #d4edda; 
        color: #155724; 
      }
      .code-box { 
        margin-top: 20px; 
        padding: 15px; 
        border-radius: 8px; 
        text-align: center; 
      }
      .code-box-warning { 
        background: #fff3cd; 
        border: 2px solid #ffc107; 
      }
      .code-box-danger { 
        background: #fef2f2; 
        border: 2px solid #dc2626; 
      }
      .code-value { 
        font-size: 32px; 
        font-weight: bold; 
        letter-spacing: 4px; 
        font-family: 'Courier New', monospace; 
        margin: 10px 0; 
      }
      .code-warning { 
        color: #FF6C00; 
      }
      .code-danger { 
        color: #dc2626; 
      }
      .qr-section { display: flex; justify-content: center; align-items: center; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; min-height: 250px; border: 2px dashed #FF6C00; }
      .qr-item { text-align: center; width: 100%; }
      .qr { width: 200px; height: 200px; border: 3px solid #FF6C00; display: inline-block; margin-bottom: 12px; background: white; padding: 8px; box-sizing: border-box; border-radius: 4px; }
      .qr img, .qr canvas { width: 100% !important; height: 100% !important; object-fit: contain !important; display: block !important; min-width: 180px !important; min-height: 180px !important; }
      .qr-error { width: 200px; height: 200px; border: 3px solid #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; background: #fee2e2; padding: 8px; box-sizing: border-box; border-radius: 4px; color: #dc2626; font-weight: bold; text-align: center; }
      .qr-label { font-size: 16px; color: #333; font-weight: bold; margin-top: 10px; }
      .qr-code-value { font-size: 28px; color: #FF6C00; font-weight: bold; margin-top: 5px; font-family: monospace; }
      .footer { 
        margin-top: 20px; 
        padding-top: 15px; 
        border-top: 1px solid #ddd; 
        font-size: 10px; 
        color: #666; 
        text-align: center; 
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="logo-container">
          <img src="${logoUrl}" alt="COLISDIRECT Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div class="title" style="display: none;">COLISDIRECT</div>
          <div class="date">${escapeHtml(dateFormatted)}</div>
        </div>
        <div style="text-align: right;">
          <div class="label">N° de Suivi</div>
          <div class="tracking">${escapeHtml(shipment.tracking_number || '')}</div>
        </div>
      </div>

      <div class="row">
        <div class="col info-section">
          <div class="label">Expéditeur</div>
          <div class="value">${escapeHtml(sender || '-')}</div>
          ${shipment.sender_address || shipment.sender_commune || shipment.sender_phone ? `
          <div style="font-size: 13px; color: #666; margin-top: 4px;">
            ${shipment.sender_address ? escapeHtml(shipment.sender_address) + '<br/>' : ''}
            ${shipment.sender_commune || shipment.sender_quartier ? `${escapeHtml((shipment.sender_commune || '') + (shipment.sender_quartier ? ', ' + shipment.sender_quartier : ''))}<br/>` : ''}
            ${shipment.sender_phone ? escapeHtml(shipment.sender_phone) : ''}
          </div>
          ` : ''}
        </div>
        <div class="col info-section">
          <div class="label">Destinataire</div>
          <div class="value">${escapeHtml(recipient || '-')}</div>
          ${shipment.recipient_address || shipment.recipient_commune || shipment.recipient_phone ? `
          <div style="font-size: 13px; color: #666; margin-top: 4px;">
            ${shipment.recipient_address ? escapeHtml(shipment.recipient_address) + '<br/>' : ''}
            ${shipment.recipient_commune || shipment.recipient_quartier ? `${escapeHtml((shipment.recipient_commune || '') + (shipment.recipient_quartier ? ', ' + shipment.recipient_quartier : ''))}<br/>` : ''}
            ${shipment.recipient_phone ? escapeHtml(shipment.recipient_phone) : ''}
          </div>
          ` : ''}
        </div>
      </div>

      <div class="row" style="margin-top: 16px;">
        <div class="col">
          <div class="label">Code colis — à recopier sur l&apos;emballage</div>
          <div class="value" style="font-family: monospace; font-size: 22px; color: #FF6C00; font-weight: bold;">${escapeHtml(shipment.shipment_code || '—')}</div>
        </div>
        <div class="col">
          <div class="label">Code de retrait (destinataire)</div>
          <div class="value" style="font-family: monospace; font-size: 18px;">${
            shipment.pickup_code
              ? escapeHtml(shipment.pickup_code)
              : 'Attribué après prise en charge par nos services'
          }</div>
        </div>
      </div>

      <div class="qr-section">
        <div class="qr-item">
          <div class="qr">
            <canvas id="qr-code-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
          </div>
          <div class="qr-label">QR (optionnel)</div>
          <div class="qr-code-value">${escapeHtml(shipment.shipment_code || shipment.tracking_number || 'N/A')}</div>
          <div style="font-size: 12px; color: #666; margin-top: 8px; font-weight: normal;">En Côte d&apos;ivoire, privilégiez la saisie du code colis inscrit sur le colis</div>
        </div>
      </div>
      
      <script>
        (function() {
          try {
            var canvas = document.getElementById('qr-code-canvas');
            if (!canvas) return;
            
            var qrValue = '${escapeHtml(shipment.tracking_number || 'N/A')}';
            if (!qrValue || qrValue === 'N/A') {
              canvas.parentElement.innerHTML = '<div class="qr-error">Numéro d\\'envoi invalide<br/><span style="font-size: 18px; font-family: monospace;">' + qrValue + '</span></div>';
              return;
            }
            
            // Utiliser QRCode.js depuis CDN
            if (typeof QRCode !== 'undefined') {
              QRCode.toCanvas(canvas, qrValue, {
                width: 180,
                height: 180,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
              }, function (error) {
                if (error) {
                  console.error('Erreur génération QR code:', error);
                  canvas.style.display = 'none';
                  var errorDiv = document.createElement('div');
                  errorDiv.className = 'qr-error';
                  errorDiv.innerHTML = 'Erreur de génération<br/>QR Code<br/><span style="font-size: 20px; font-family: monospace; margin-top: 10px; display: block;">' + qrValue + '</span>';
                  canvas.parentElement.appendChild(errorDiv);
                } else {
                  canvas.style.display = 'block';
                  canvas.style.visibility = 'visible';
                }
              });
            } else {
              // Fallback: utiliser un service externe si la bibliothèque n'est pas chargée
              var encodedData = encodeURIComponent(qrValue);
              var img = document.createElement('img');
              img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodedData + '&ecc=M&margin=2&format=png';
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'contain';
              img.style.display = 'block';
              img.alt = 'QR Code - ' + qrValue;
              var fallbackUrl1 = 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=' + encodedData + '&choe=UTF-8';
              var fallbackUrl2 = 'https://quickchart.io/qr?text=' + encodedData + '&size=200&margin=2';
              img.onerror = function() {
                this.src = fallbackUrl1;
                this.onerror = function() {
                  this.src = fallbackUrl2;
                  this.onerror = function() {
                    canvas.style.display = 'none';
                    var errorDiv = document.createElement('div');
                    errorDiv.className = 'qr-error';
                    errorDiv.innerHTML = 'Erreur de chargement<br/>QR Code<br/><span style="font-size: 20px; font-family: monospace; margin-top: 10px; display: block;">' + qrValue + '</span>';
                    canvas.parentElement.appendChild(errorDiv);
                  };
                };
              };
              canvas.parentElement.replaceChild(img, canvas);
            }
          } catch (error) {
            console.error('Erreur lors de la génération du QR code:', error);
            var canvas = document.getElementById('qr-code-canvas');
            if (canvas) {
              canvas.style.display = 'none';
              var errorDiv = document.createElement('div');
              errorDiv.className = 'qr-error';
              errorDiv.innerHTML = 'Erreur de génération<br/>QR Code<br/><span style="font-size: 20px; font-family: monospace; margin-top: 10px; display: block;">${escapeHtml(shipment.tracking_number || 'N/A')}</span>';
              canvas.parentElement.appendChild(errorDiv);
            }
          }
        })();
      </script>

      <div class="row">
        <div class="col">
          <div class="label">Type de colis</div>
          <div class="value">${escapeHtml(shipment.package_type || 'N/A')}</div>
        </div>
        <div class="col">
          <div class="label">Poids</div>
          <div class="value">${escapeHtml(String(shipment.weight || 0))} kg</div>
        </div>
      </div>

      <div class="row">
        <div class="col">
          <div class="label">Statut</div>
          <div class="value">
            <span class="status-badge" style="${getStatusBadgeStyle(statusBadgeClass)}">${escapeHtml(statusLabel)}</span>
          </div>
        </div>
        <div class="col">
          <div class="label">Paiement</div>
          <div>
            <span class="status-badge" style="${getStatusBadgeStyle(paymentBadgeClass)}">${escapeHtml(paymentLabel)}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <div>Bordereau généré automatiquement par COLISDIRECT</div>
        <div>Conservez ce bordereau pour le suivi de votre colis</div>
        ${shipment.shipment_code || shipment.tracking_number ? `
        <div style="margin-top: 8px; font-weight: bold;">Le code colis et le suivi permettent chaque étape sans matériel d&apos;étiquetage</div>
        ` : ''}
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Ouvre le bordereau dans une nouvelle fenêtre pour prévisualisation/impression
 */
export function openWaybillInWindow(shipment: ShipmentData, autoPrint: boolean = false): void {
  const html = generateWaybillHtml(shipment);
  const win = window.open('', '_blank');
  
  if (!win) {
    alert('Veuillez autoriser l\'ouverture des fenêtres popup pour voir le bordereau.');
    return;
  }

  win.document.write(html);
  win.document.close();

  if (autoPrint) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
        setTimeout(() => {
          win.close();
        }, 1000);
      }, 500);
    };
  }
}

/**
 * Télécharge le bordereau au format HTML
 */
export function downloadWaybill(shipment: ShipmentData): void {
  const html = generateWaybillHtml(shipment);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `bordereau-${shipment.tracking_number || shipment.id || 'colis'}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Télécharge le bordereau et ouvre une notification de succès
 */
export function downloadWaybillWithToast(shipment: ShipmentData, toast?: any): void {
  try {
    downloadWaybill(shipment);
    if (toast && toast.success) {
      toast.success('Bordereau téléchargé avec succès');
    } else if (toast && toast.info) {
      toast.info('Bordereau téléchargé. Vous pouvez l\'ouvrir et l\'imprimer à tout moment.');
    }
  } catch (error) {
    console.error('Erreur lors du téléchargement du bordereau:', error);
    if (toast && toast.error) {
      toast.error('Erreur lors du téléchargement du bordereau');
    } else {
      alert('Erreur lors du téléchargement du bordereau');
    }
  }
}

