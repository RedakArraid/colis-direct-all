import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Edit, Trash2, Search, Filter, Scan, Package, Eye, Map } from 'lucide-react';
import { api } from '../../lib/api';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import QRScanner from '../../components/QRScanner';
import RelayPointsMap from '../../components/admin/RelayPointsMap';
import PhoneInput from '../../components/PhoneInput';
import CommuneSelect from '../../components/CommuneSelect';
import { ALL_COMMUNE_NAMES } from '../../utils/ciLocations';
import {
  getShipmentStatusBadgeClass,
  getShipmentStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
  normalizePaymentStatus,
  normalizeShipmentStatus,
} from '../../utils/shipmentStatus';
import type { ChangeEvent, ReactNode } from 'react';

type RelayPointType = 'cybercafe' | 'imprimerie' | 'superette';

interface RelayPoint {
  id: string;
  name: string;
  type?: RelayPointType;
  commune?: string;
  quartier?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  hours?: string;
  latitude?: number | null;
  longitude?: number | null;
  zone_id?: string | null;
  zone_name?: string | null;
  is_active?: boolean;
  email?: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  communes?: string[];
  is_active?: boolean;
}

interface RelayShipment {
  id: string;
  tracking_number: string;
  current_status?: string | null;
  status?: string | null;
  payment_status?: string | null;
  paymentStatus?: string | null;
  origin_relay_id?: string | null;
  destination_relay_id?: string | null;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_commune?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_commune?: string;
  created_at: string;
}

interface RelayPointForm {
  name: string;
  type: RelayPointType;
  commune: string;
  quartier: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  latitude: string;
  longitude: string;
  zone_id: string;
  is_active: boolean;
}

const COMMUNES = ALL_COMMUNE_NAMES;

export default function RelayPointsManagement() {
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [communeFilter, setCommuneFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [editingRelay, setEditingRelay] = useState<RelayPoint | null>(null);
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);
  const [relayShipments, setRelayShipments] = useState<RelayShipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [isShipmentsModalOpen, setIsShipmentsModalOpen] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [formData, setFormData] = useState<RelayPointForm>({
    name: '',
    type: 'cybercafe',
    commune: '',
    quartier: '',
    address: '',
    phone: '',
    whatsapp: '',
    hours: '',
    latitude: '',
    longitude: '',
    zone_id: '',
    is_active: true,
  });
  const handleCommuneFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCommuneFilter(event.target.value);
  };

  const handleZoneFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setZoneFilter(event.target.value);
  };

  const loadDeliveryZones = useCallback(async () => {
    try {
      const { data } = await api.getDeliveryZones();
      if (Array.isArray(data)) {
        const activeZones = (data as DeliveryZone[]).filter((zone) => zone.is_active);
        setDeliveryZones(activeZones);
      } else {
        setDeliveryZones([]);
      }
    } catch (error) {
      console.error('Error loading delivery zones:', error);
    }
  }, []);

  const loadRelayPoints = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getRelayPoints({
        commune: communeFilter || undefined,
        zone_id: zoneFilter || undefined,
        is_active: undefined,
      });

      if (error) {
        console.error('Error loading relay points:', error);
        setRelayPoints([]);
        return;
      }

      if (!Array.isArray(data)) {
        setRelayPoints([]);
        return;
      }

      const typedPoints = data as RelayPoint[];
      const query = searchQuery.trim().toLowerCase();
      const filtered = query
        ? typedPoints.filter((relay) => {
            const name = (relay.name ?? '').toLowerCase();
            const address = (relay.address ?? '').toLowerCase();
            return name.includes(query) || address.includes(query);
          })
        : typedPoints;

      setRelayPoints(filtered);
    } catch (error) {
      console.error('Error loading relay points:', error);
      setRelayPoints([]);
    } finally {
      setLoading(false);
    }
  }, [communeFilter, zoneFilter, searchQuery]);

  useEffect(() => {
    loadDeliveryZones();
  }, [loadDeliveryZones]);

  useEffect(() => {
    loadRelayPoints();
  }, [loadRelayPoints]);

  const handleEdit = (relay: RelayPoint) => {
    setEditingRelay(relay);
    setFormData({
      name: relay.name || '',
      type: relay.type || 'cybercafe',
      commune: relay.commune || '',
      quartier: relay.quartier || '',
      address: relay.address || '',
      phone: relay.phone || '',
      whatsapp: relay.whatsapp || '',
      hours: relay.hours || '',
      latitude: relay.latitude != null ? String(relay.latitude) : '',
      longitude: relay.longitude != null ? String(relay.longitude) : '',
      zone_id: relay.zone_id ?? '',
      is_active: relay.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
     try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        zone_id: formData.zone_id || null,
      };
 
       if (editingRelay) {
        await api.updateRelayPoint(editingRelay.id, payload);
      } else {
        await api.createRelayPoint(payload);
      }
      setIsModalOpen(false);
      setEditingRelay(null);
      await loadRelayPoints();
    } catch (error) {
      console.error('Error saving relay point:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce point relais ?')) return;
    
    try {
      await api.deleteRelayPoint(id);
      loadRelayPoints();
    } catch (error) {
      console.error('Error deleting relay point:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const loadRelayShipments = useCallback(async (relayId: string) => {
    setLoadingShipments(true);
    try {
      const { data, error } = await api.getShipments({ relay_id: relayId });
      if (error) {
        console.error('Error loading relay shipments:', error);
        setRelayShipments([]);
        return;
      }

      const shipments = Array.isArray(data) ? (data as RelayShipment[]) : [];

      const receivedShipments = shipments.filter((shipment) => {
        const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
        const isCancelled = status === 'CANCELLED' || status === 'RETURN_TO_SENDER';
        const isDelivered =
          status === 'DELIVERED' ||
          status === 'DELIVERED_TO_CUSTOMER' ||
          status === 'PICKED_UP_BY_CUSTOMER';

        if (isCancelled || isDelivered) {
          return false;
        }

        if (shipment.origin_relay_id === relayId) {
          return status !== 'READY_FOR_DROP_OFF';
        }

        if (shipment.destination_relay_id === relayId) {
          return status === 'RELAY_FINAL_RECEIVED' || status === 'AVAILABLE_FOR_PICKUP';
        }

        return false;
      });

      setRelayShipments(receivedShipments);
    } catch (error) {
      console.error('Error loading relay shipments:', error);
      setRelayShipments([]);
    } finally {
      setLoadingShipments(false);
    }
  }, []);

  const handleViewShipments = async (relay: RelayPoint) => {
    setSelectedRelay(relay);
    setIsShipmentsModalOpen(true);
    await loadRelayShipments(relay.id);
  };

  const renderPaymentBadge = (shipment: RelayShipment) => {
    const status = normalizePaymentStatus(shipment.payment_status);
    const label = getPaymentStatusLabel(status);
    const color = getPaymentStatusBadgeClass(status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const columns: Array<{
    key: keyof RelayPoint | string;
    label: string;
    render?: (relay: RelayPoint) => ReactNode;
  }> = [
    {
      key: 'name',
      label: 'Nom',
      render: (relay) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{relay.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (relay) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {relay.type === 'cybercafe' ? 'Cybercafé' : relay.type === 'imprimerie' ? 'Imprimerie' : 'Supérette'}
        </span>
      ),
    },
    { key: 'commune', label: 'Commune' },
    { key: 'quartier', label: 'Quartier' },
    {
      key: 'zone_name',
      label: 'Zone',
      render: (relay) => (
        relay.zone_name ? (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            {relay.zone_name}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Aucune</span>
        )
      ),
    },
    { key: 'phone', label: 'Téléphone' },
    {
      key: 'is_active',
      label: 'Statut',
      render: (relay) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          relay.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {relay.is_active ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
  ];

  const [showMapView, setShowMapView] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-[#FF6C00]" />
            Gestion des points relais
          </h2>
          <p className="text-gray-600 mt-2">Gérez le réseau de points relais</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScannerKey(prev => prev + 1);
              setIsScanModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Scan className="w-5 h-5" />
            Scanner
          </button>
          <button
            onClick={() => {
              setEditingRelay(null);
              setFormData({
                name: '',
                type: 'cybercafe',
                commune: '',
                quartier: '',
                address: '',
                phone: '',
                whatsapp: '',
                hours: '',
                latitude: '',
                longitude: '',
                zone_id: '',
                is_active: true,
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau point relais
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowMapView(!showMapView)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showMapView
              ? 'bg-[#FF6C00] text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Map className="w-5 h-5" />
          {showMapView ? 'Vue liste' : 'Vue carte'}
        </button>
      </div>

      {showMapView ? (
        <RelayPointsMap
          relayPoints={relayPoints as any}
          onRelayPointClick={(relay: any) => {
            setSelectedRelay(relay as RelayPoint);
            setIsShipmentsModalOpen(true);
            void loadRelayShipments(relay.id);
          }}
        />
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, adresse, numéro d'identifiant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={communeFilter}
                onChange={handleCommuneFilterChange}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Toutes les communes</option>
                {COMMUNES.map(commune => (
                  <option key={commune} value={commune}>{commune}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={zoneFilter}
                onChange={handleZoneFilterChange}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Toutes les zones</option>
                {deliveryZones.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
        data={relayPoints}
        columns={columns}
        loading={loading}
        actions={(relay: RelayPoint) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleViewShipments(relay)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Voir les colis réceptionnés"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEdit(relay)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(relay.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRelay(null);
        }}
        title={editingRelay ? 'Modifier le point relais' : 'Nouveau point relais'}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as RelayPointType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              >
                <option value="cybercafe">Cybercafé</option>
                <option value="imprimerie">Imprimerie</option>
                <option value="superette">Supérette</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commune *</label>
              <CommuneSelect
                value={formData.commune}
                onChange={(v) => setFormData({ ...formData, commune: v })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quartier *</label>
              <input
                type="text"
                value={formData.quartier}
                onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <PhoneInput
                value={formData.phone}
                onChange={(v) => setFormData({ ...formData, phone: v })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <PhoneInput value={formData.whatsapp} onChange={(v) => setFormData({ ...formData, whatsapp: v })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horaires</label>
            <input
              type="text"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="Ex: Lun-Ven: 8h-20h"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone de livraison</label>
            <select
              value={formData.zone_id}
              onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="">Aucune zone (optionnel)</option>
              {deliveryZones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                  {zone.communes && zone.communes.length > 0 && (
                    ` (${zone.communes.slice(0, 3).join(', ')}${zone.communes.length > 3 ? '...' : ''})`
                  )}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez la zone de livraison à laquelle ce point relais appartient
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-[#FF6C00] focus:ring-[#FF6C00] rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Point relais actif
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
            >
              {editingRelay ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        title="Scanner un QR code"
        size="md"
      >
        <QRScanner
          key={`scanner-${scannerKey}`}
          onDetected={(text) => {
            setIsScanModalOpen(false);
            if (text) {
              setSearchQuery(text);
              alert(`QR détecté: ${text}`);
            }
          }}
          onClose={() => setIsScanModalOpen(false)}
        />
      </Modal>

      {/* Modal pour afficher les colis réceptionnés */}
      <Modal
        isOpen={isShipmentsModalOpen}
        onClose={() => {
          setIsShipmentsModalOpen(false);
          setSelectedRelay(null);
          setRelayShipments([]);
        }}
        title={selectedRelay ? `Colis réceptionnés - ${selectedRelay.name}` : 'Colis réceptionnés'}
        size="lg"
      >
        <div className="space-y-4">
          {loadingShipments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00] mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des colis...</p>
            </div>
          ) : relayShipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">Aucun colis réceptionné pour ce point relais</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-semibold text-gray-900">{relayShipments.length}</span> colis réceptionné(s)
                </p>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">N° Suivi</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Expéditeur</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Destinataire</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Flux</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Paiement</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {relayShipments.map((shipment) => (
                      <tr key={shipment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-[#FF6C00]">
                          {shipment.tracking_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{shipment.sender_first_name} {shipment.sender_last_name}</div>
                            <div className="text-xs text-gray-500">{shipment.sender_commune}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{shipment.recipient_first_name} {shipment.recipient_last_name}</div>
                            <div className="text-xs text-gray-500">{shipment.recipient_commune}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {shipment.origin_relay_id === selectedRelay?.id ? 'Dépôt' : 'Livraison'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {(() => {
                            const status = normalizeShipmentStatus(shipment.current_status ?? shipment.status);
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadgeClass(status)}`}>
                                {getShipmentStatusLabel(status)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {renderPaymentBadge(shipment)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(shipment.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>
        </>
      )}
    </div>
  );
}

