import { useState, useEffect } from 'react';
import { Receipt, Download, FileText, CreditCard, Calendar, Filter, Search, Eye, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { normalizePaymentStatus, getPaymentStatusBadgeClass, getPaymentStatusLabel } from '../utils/shipmentStatus';
import LoadingSpinner from '../components/LoadingSpinner';

import { BasePageProps } from '../types/pages';

interface MyPurchasesPageProps extends BasePageProps {
  // onNavigate non utilisé, supprimé pour cohérence
}

interface Invoice {
  id: string;
  invoice_number: string;
  tracking_number: string;
  date: string;
  total: number;
  paymentStatus: 'paid' | 'pending' | 'cancelled';
  payment_method: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
}

interface CreditNote {
  id: string;
  credit_number: string;
  invoice_number: string;
  date: string;
  amount: number;
  reason: string;
  status: 'pending' | 'applied';
}

function MyPurchasesPage({}: MyPurchasesPageProps = {}) {
  const [error, setError] = useState<string | null>(null);

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

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'credits'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // Load user's shipments to create invoices
      const { data: shipmentsData, error } = await api.getShipments();
      if (error) throw new Error(error);
      
      setShipments(shipmentsData || []);
      
      // Filter shipments by current user
      const userShipments = (shipmentsData || []).filter((shipment: any) => 
        shipment.created_by === user.id || 
        shipment.sender_email === user.email ||
        shipment.sender_phone === user.phone
      );
      
      // Convert shipments to invoices
      const invoicesData = userShipments.map((shipment: any) => {
        const paymentStatus = normalizePaymentStatus(shipment.payment_status);
        const priceAmount = toNumeric(shipment.price);
        const printingAmount = toNumeric(shipment.printing_fee);
        const assistanceAmount = toNumeric(shipment.assistance_fee);
        const boxAmount = toNumeric(shipment.box_price);
        const totalAmount = priceAmount + printingAmount + assistanceAmount + boxAmount;
 
        return {
          id: shipment.id,
          invoice_number: `FAC-${shipment.tracking_number}`,
          tracking_number: shipment.tracking_number,
          date: shipment.created_at,
          total: totalAmount,
          paymentStatus,
          payment_method: shipment.payment_method || 'unknown',
          items: [
            {
              description: 'Expédition de colis',
              quantity: 1,
              price: priceAmount,
            },
            ...(printingAmount > 0
              ? [{ description: 'Impression au relais', quantity: 1, price: printingAmount }]
              : []),
            ...(assistanceAmount > 0
              ? [{ description: 'Assistance', quantity: 1, price: assistanceAmount }]
              : []),
            ...(boxAmount > 0
              ? [{ description: 'Carton d\'expédition', quantity: 1, price: boxAmount }]
              : []),
          ],
        };
      });
      
      setInvoices(invoicesData);
      // Credit notes would come from a separate API endpoint
      setCreditNotes([]);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Erreur lors du chargement de vos achats. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceStatusLabel = (status: string) => getPaymentStatusLabel(normalizePaymentStatus(status));

  const getInvoiceStatusBadgeClass = (status: string) => getPaymentStatusBadgeClass(normalizePaymentStatus(status));

  const getCreditStatusLabel = (status: string) => {
    if (status === 'applied') return 'Appliqué';
    if (status === 'pending') return 'En attente';
    return status;
  };

  const getCreditStatusBadgeClass = (status: string) => {
    if (status === 'applied') return 'bg-green-100 text-green-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'refunded') return 'bg-blue-100 text-blue-800';
    return 'bg-[#F6F7F9] text-[#3A3A3A]';
  };

  const downloadInvoice = (invoice: Invoice) => {
    const shipment = shipments.find((s: any) => s.tracking_number === invoice.tracking_number);
    if (!shipment) {
      alert('Impossible de trouver les détails de la facture.');
      return;
    }

    const totalAmount = toNumeric(invoice.total);
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
          <title>Facture - ${invoice.tracking_number}</title>
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
                <div class="value">${new Date(invoice.date).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <div class="section">
              <div class="label">N° de facture</div>
              <div class="value">${invoice.invoice_number}</div>
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
                ${invoice.items.map((item: any) => `
                  <tr>
                    <td>${item.description}</td>
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
              <div>Statut: ${getInvoiceStatusLabel(invoice.paymentStatus)}</div>
              <div>Moyen de paiement: ${getPaymentMethodLabel(invoice.payment_method)}</div>
            </div>
          </div>
        </body>
      </html>
    `;
    invoiceWindow.document.write(invoiceContent);
    invoiceWindow.document.close();
  };

  const getPaymentMethodLabel = (method: string) => {
    if (!method) return 'Gratuit (code promo)';
    const labels: { [key: string]: string } = {
      'stripe': 'Carte bancaire',
      'mobile_money': 'Mobile Money',
      'paystack': 'Mobile Money',
      'cinetpay': 'Mobile Money',
      'wave': 'Wave',
      'relay_cash': 'Paiement lors de la prise en charge',
      'card': 'Carte bancaire',
      'cash': 'Paiement lors de la prise en charge',
    };
    return labels[method] || method;
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tracking_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || invoice.paymentStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredCredits = creditNotes.filter((credit) => {
    const matchesSearch = 
      credit.credit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1A1A] mb-1 sm:mb-2">Mes achats</h1>
          <p className="text-sm sm:text-base text-[#6B7280]">Consultez vos factures et avoirs</p>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] mb-4 sm:mb-6">
          <div className="border-b border-[#E6E6E6]">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'invoices'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-[#6B7280] hover:text-[#3A3A3A] hover:border-[#E6E6E6]'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Factures ({filteredInvoices.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('credits')}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'credits'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-[#6B7280] hover:text-[#3A3A3A] hover:border-[#E6E6E6]'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Avoirs ({filteredCredits.length})</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'invoices' ? 'Rechercher...' : 'Rechercher...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
            />
          </div>
          {activeTab === 'invoices' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
              >
                <option value="all">Tous les statuts</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-8">
              <LoadingSpinner message="Chargement de vos factures..." />
            </div>
          ) : activeTab === 'invoices' ? (
            filteredInvoices.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-[#6B7280]">
                <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-[#9CA3AF]" />
                <p className="text-sm sm:text-base">Aucune facture trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F6F7F9]">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Facture
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">
                        Suivi
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                        Date
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">
                        Paiement
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                        Statut
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E6E6E6]">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-[#F6F7F9]">
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <Receipt className="w-3 h-3 sm:w-4 sm:h-4 text-[#9CA3AF] hidden sm:block" />
                            <span className="font-medium text-xs sm:text-sm text-[#1A1A1A] break-all">{invoice.invoice_number}</span>
                            <span className="text-xs text-[#6B7280] sm:hidden">{invoice.tracking_number}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#1A1A1A] hidden sm:table-cell">
                          {invoice.tracking_number}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#6B7280] hidden md:table-cell">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            {new Date(invoice.date).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-[#1A1A1A]">
                          {formatCurrency(invoice.total)} FCFA
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#6B7280] hidden lg:table-cell">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xl:inline">{getPaymentMethodLabel(invoice.payment_method)}</span>
                            <span className="xl:hidden">{getPaymentMethodLabel(invoice.payment_method).substring(0, 3)}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getInvoiceStatusBadgeClass(invoice.paymentStatus)}`}>
                            {getInvoiceStatusLabel(invoice.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedInvoice(invoice)}
                              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Voir</span>
                            </button>
                            <button
                              onClick={() => downloadInvoice(invoice)}
                              className="text-[#FF6C00] hover:text-[#ff8534] flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Télécharger</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredCredits.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-[#6B7280]">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-[#9CA3AF]" />
                <p className="text-sm sm:text-base">Aucun avoir trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F6F7F9]">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Avoir
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">
                        Facture
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                        Date
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">
                        Raison
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                        Statut
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E6E6E6]">
                    {filteredCredits.map((credit) => (
                      <tr key={credit.id} className="hover:bg-[#F6F7F9]">
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-[#1A1A1A]">
                          {credit.credit_number}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#6B7280] hidden sm:table-cell">
                          {credit.invoice_number}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#6B7280] hidden md:table-cell">
                          {new Date(credit.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-[#1A1A1A]">
                          {formatCurrency(credit.amount)} FCFA
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[#6B7280] hidden lg:table-cell">
                          {credit.reason}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCreditStatusBadgeClass(credit.status)}`}>
                            {getCreditStatusLabel(credit.status)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <button className="text-[#FF6C00] hover:text-[#ff8534] flex items-center gap-1">
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Télécharger</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1A1A1A]">Détails de la facture</h2>
              <button onClick={() => setSelectedInvoice(null)} className="text-[#6B7280] hover:text-[#3A3A3A]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {(() => {
                const shipment = shipments.find((s: any) => s.tracking_number === selectedInvoice.tracking_number);
                if (!shipment) return <p>Impossible de charger les détails.</p>;

                const senderName = `${shipment.sender_first_name || ''} ${shipment.sender_last_name || ''}`.trim() || 'N/A';
                const recipientName = `${shipment.recipient_first_name || ''} ${shipment.recipient_last_name || ''}`.trim() || 'N/A';

                return (
                  <div className="space-y-6">
                    <div className="border-2 border-[#FF6C00] rounded-lg p-6">
                      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#FF6C00]">
                        <div>
                          <h3 className="text-2xl font-bold text-[#FF6C00]">COLISDIRECT</h3>
                          <p className="text-sm text-[#6B7280]">Facture</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#6B7280]">N° de facture</p>
                          <p className="text-lg font-bold">{selectedInvoice.invoice_number}</p>
                          <p className="text-xs text-[#6B7280]">{new Date(selectedInvoice.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <p className="text-sm text-[#6B7280] mb-1">Expéditeur</p>
                          <p className="font-semibold">{senderName}</p>
                          <p className="text-sm text-[#6B7280]">{shipment.sender_address}</p>
                          <p className="text-sm text-[#6B7280]">{shipment.sender_phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7280] mb-1">Destinataire</p>
                          <p className="font-semibold">{recipientName}</p>
                          <p className="text-sm text-[#6B7280]">{shipment.recipient_address}</p>
                          <p className="text-sm text-[#6B7280]">{shipment.recipient_phone}</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Description</th>
                              <th className="text-right py-2">Montant (FCFA)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.items.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2">{item.description}</td>
                                <td className="text-right py-2">{formatCurrency(item.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-[#FF6C00]">
                              <td className="py-3 font-bold">Total</td>
                              <td className="text-right py-3 font-bold text-[#FF6C00]">{formatCurrency(selectedInvoice.total)} FCFA</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="mt-6 pt-4 border-t text-sm text-[#6B7280]">
                        <p><strong>Statut:</strong> {getInvoiceStatusLabel(selectedInvoice.paymentStatus)}</p>
                        <p><strong>Moyen de paiement:</strong> {getPaymentMethodLabel(selectedInvoice.payment_method)}</p>
                        <p><strong>N° de suivi:</strong> {selectedInvoice.tracking_number}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedInvoice(null)}
                        className="px-6 py-2 border rounded-lg hover:bg-[#F6F7F9]"
                      >
                        Fermer
                      </button>
                      <button
                        onClick={() => {
                          downloadInvoice(selectedInvoice);
                        }}
                        className="px-6 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPurchasesPage;

