import { useState, useEffect } from 'react';
import { Package, Search, Filter, Eye, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ShipmentDetailsModal from '../../components/shipment/ShipmentDetailsModal';
import {
  getShipmentStatusBadgeClass,
  getShipmentStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
  normalizePaymentStatus,
  normalizeShipmentStatus,
  shipmentStatusForFilter,
} from '../../utils/shipmentStatus';

export default function ShipmentsManagement() {
  const [allShipments, setAllShipments] = useState<any[]>([]); // Store all shipments from API
  const [shipments, setShipments] = useState<any[]>([]); // Filtered shipments for display
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  useEffect(() => {
    loadShipments();
  }, []);

  // Apply search filter whenever searchQuery or allShipments change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, allShipments]);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getShipments();
      if (error) {
        console.error('Error loading shipments:', error);
        setAllShipments([]);
        setShipments([]);
        return;
      }
      if (data && Array.isArray(data)) {
        setAllShipments(data);
        // Filters will be applied by useEffect
      } else {
        setAllShipments([]);
        setShipments([]);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
      setAllShipments([]);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allShipments];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.tracking_number?.toLowerCase().includes(query) ||
        s.sender_first_name?.toLowerCase().includes(query) ||
        s.sender_last_name?.toLowerCase().includes(query) ||
        s.recipient_first_name?.toLowerCase().includes(query) ||
        s.recipient_last_name?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter((s) => {
        const logisticStatus = normalizeShipmentStatus(s.current_status ?? s.status);
        const logisticGroup = shipmentStatusForFilter(logisticStatus);
        const paymentStatus = normalizePaymentStatus(s.payment_status);

        switch (statusFilter) {
          case 'pending':
            return logisticGroup === 'pending';
          case 'in_transit':
            return logisticGroup === 'in_transit';
          case 'at_relay':
            return logisticGroup === 'at_relay';
          case 'delivered':
            return logisticStatus === 'DELIVERED' || logisticStatus === 'DELIVERED_TO_CUSTOMER' || logisticStatus === 'PICKED_UP_BY_CUSTOMER';
          case 'cancelled':
            return logisticStatus === 'CANCELLED' || logisticStatus === 'RETURN_TO_SENDER';
          case 'paid':
            return paymentStatus === 'paid';
          default:
            return logisticGroup === statusFilter;
        }
      });
    }

    setShipments(filtered);
  };

  const handleViewDetails = async (shipment: any) => {
    try {
      const { data } = await api.getShipment(shipment.id);
      setSelectedShipment(data);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error loading shipment details:', error);
    }
  };

  const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
    try {
      await api.updateShipmentStatus(shipmentId, newStatus, '', 'Mise à jour par admin');
      loadShipments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const renderStatusBadge = (shipment: any) => {
    const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
    const label = getShipmentStatusLabel(status);
    const color = getShipmentStatusBadgeClass(status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const renderPaymentBadge = (shipment: any) => {
    const paymentStatus = normalizePaymentStatus(shipment.payment_status);
    const label = getPaymentStatusLabel(paymentStatus);
    const color = getPaymentStatusBadgeClass(paymentStatus);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const columns = [
    {
      key: 'tracking_number',
      label: 'N° de suivi',
      render: (shipment: any) => (
        <button
          onClick={() => setSelectedShipmentId(shipment.id)}
          className="font-mono font-semibold text-[#FF6C00] hover:text-[#ff8534] hover:underline cursor-pointer"
        >
          {shipment.tracking_number}
        </button>
      ),
    },
    {
      key: 'sender',
      label: 'Expéditeur',
      render: (shipment: any) => `${shipment.sender_first_name} ${shipment.sender_last_name}`,
    },
    {
      key: 'recipient',
      label: 'Destinataire',
      render: (shipment: any) => `${shipment.recipient_first_name} ${shipment.recipient_last_name}`,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (shipment: any) => new Date(shipment.created_at).toLocaleDateString('fr-FR'),
    },
    {
      key: 'price',
      label: 'Prix',
      render: (shipment: any) => `${shipment.price.toLocaleString()} FCFA`,
    },
    {
      key: 'payment_status',
      label: 'Paiement',
      render: (shipment: any) => renderPaymentBadge(shipment),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (shipment: any) => renderStatusBadge(shipment),
    },
    {
      key: 'delivery_zone',
      label: 'Zone de livraison',
      render: (shipment: any) => {
        if (shipment.delivery_zone_name) {
          return (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              {shipment.delivery_zone_name}
            </span>
          );
        }
        if (shipment.home_delivery && shipment.recipient_commune) {
          return (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {shipment.recipient_commune}
            </span>
          );
        }
        return <span className="text-xs text-gray-400">Non définie</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF6C00]" />
            Gestion des envois
          </h2>
          <p className="text-sm text-gray-600 mt-1 sm:mt-2">Suivez et gérez tous les colis ({shipments.length} colis affichés)</p>
        </div>
        <button
          onClick={loadShipments}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto"
          title="Actualiser la liste des colis"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par numéro de suivi, nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent appearance-none bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_transit">En transit</option>
            <option value="at_relay">Au relais</option>
            <option value="delivered">Livré</option>
            <option value="cancelled">Annulé</option>
            <option value="paid">Payé</option>
          </select>
        </div>
      </div>

      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        actions={(shipment) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleViewDetails(shipment)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            {(() => {
              const currentStatus = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
              const isFinalStatus = ['DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'].includes(currentStatus);
              if (isFinalStatus) return null;
              return (
              <select
                value={currentStatus}
                onChange={(e) => handleStatusUpdate(shipment.id, e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#FF6C00]"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="READY_FOR_DROP_OFF">Prêt pour dépôt</option>
                <option value="RELAY_ORIGIN_RECEIVED">Reçu au relais d'origine</option>
                <option value="CARRIER_COLLECTED">Pris en charge</option>
                <option value="IN_TRANSIT">En transit</option>
                <option value="RELAY_FINAL_RECEIVED">Arrivé au relais final</option>
                <option value="AVAILABLE_FOR_PICKUP">Disponible pour retrait</option>
                <option value="PICKED_UP_BY_CUSTOMER">Retiré par le client</option>
                <option value="DELIVERED">Livré (relais)</option>
                <option value="DELIVERED_TO_CUSTOMER">Livré (domicile)</option>
                <option value="CANCELLED">Annulé</option>
                <option value="RETURN_TO_SENDER">Retour à l'expéditeur</option>
              </select>
              );
            })()}
          </div>
        )}
      />

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedShipment(null);
        }}
        title="Détails de l'envoi"
        size="xl"
      >
        {selectedShipment && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Expéditeur</h3>
                <p>{selectedShipment.sender_first_name} {selectedShipment.sender_last_name}</p>
                <p className="text-sm text-gray-600">{selectedShipment.sender_email}</p>
                <p className="text-sm text-gray-600">{selectedShipment.sender_phone}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedShipment.sender_address}, {selectedShipment.sender_quartier}, {selectedShipment.sender_commune}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Destinataire</h3>
                <p>{selectedShipment.recipient_first_name} {selectedShipment.recipient_last_name}</p>
                <p className="text-sm text-gray-600">{selectedShipment.recipient_email}</p>
                <p className="text-sm text-gray-600">{selectedShipment.recipient_phone}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedShipment.recipient_address}, {selectedShipment.recipient_quartier}, {selectedShipment.recipient_commune}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-gray-600">N° de suivi</p>
                <button
                  onClick={() => setSelectedShipmentId(selectedShipment.id)}
                  className="font-mono font-semibold text-[#FF6C00] hover:text-[#ff8534] hover:underline cursor-pointer"
                >
                  {selectedShipment.tracking_number}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p>{selectedShipment.package_type === 'petit' ? 'Petit' : selectedShipment.package_type === 'moyen' ? 'Moyen' : 'Grand'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Poids</p>
                <p>{selectedShipment.weight} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Prix</p>
                <p className="font-semibold text-[#FF6C00]">{selectedShipment.price.toLocaleString()} FCFA</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Statut</p>
              <div className="flex flex-wrap items-center gap-2">
                {renderStatusBadge(selectedShipment)}
                {renderPaymentBadge(selectedShipment)}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Date de création</p>
              <p>{new Date(selectedShipment.created_at).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de détails du colis */}
      <ShipmentDetailsModal
        shipmentId={selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
      />
    </div>
  );
}

