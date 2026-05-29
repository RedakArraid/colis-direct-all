import { useState, useEffect, type ReactNode } from 'react';
import { Truck, Plus, Edit, Trash2, MapPin, X } from 'lucide-react';
import { api } from '../../lib/api';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import PhoneInput from '../../components/PhoneInput';
import {
  getShipmentStatusBadgeClass,
  getShipmentStatusLabel,
  normalizeShipmentStatus,
  normalizePaymentStatus,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
} from '../../utils/shipmentStatus';

function generateTempPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const u = new Uint8Array(length);
  crypto.getRandomValues(u);
  return Array.from(u, (x) => chars[x % chars.length]).join('');
}

type TransporterStatus = 'available' | 'busy' | 'inactive' | string;

interface Transporter {
  id: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: TransporterStatus;
  vehicle_type?: string;
  license_plate?: string;
  current_packages?: number;
  total_deliveries?: number;
  address?: string;
  user_address?: string;
  city?: string;
  user_city?: string;
  commune?: string;
  user_commune?: string;
  quarter?: string;
  user_quarter?: string;
  neighborhood?: string;
}

type TransporterDetails = Transporter;

interface TransporterUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  is_active?: boolean;
  priority?: number;
  description?: string;
  communes?: string[];
  transporter_count?: number;
}

type TransporterZone = DeliveryZone;

interface TransporterAssignment {
  id?: string;
  tracking_number: string;
  current_status?: string | null;
  status?: string | null;
  payment_status?: string | null;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_address?: string;
  recipient_commune?: string;
  destination_relay_name?: string;
  destination_relay_commune?: string;
  relay_name?: string;
  relay_commune?: string;
  home_delivery?: boolean;
  created_at?: string;
}

export default function TransportersManagement() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [users, setUsers] = useState<TransporterUser[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [transportersWithZones, setTransportersWithZones] = useState<Map<string, TransporterZone[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [transporterZones, setTransporterZones] = useState<TransporterZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState<Transporter | null>(null);
  const [transporterInfo, setTransporterInfo] = useState<TransporterDetails | null>(null);
  const [transporterPackages, setTransporterPackages] = useState<TransporterAssignment[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [formData, setFormData] = useState({
    // User fields (for new user creation)
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    // Transporter fields
    user_id: '', // For existing user selection
    vehicle_type: '',
    license_plate: '',
    status: 'available',
    // Zone selection
    selected_zones: [] as string[],
    // Mode: 'existing' or 'new'
    create_mode: 'new' as 'new' | 'existing',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transportersRes, usersRes, zonesRes] = await Promise.all([
        api.getTransporters(),
        api.getUsers({ role: 'transporter' }),
        api.getDeliveryZones(),
      ]);

      const transportersData = Array.isArray(transportersRes.data)
        ? (transportersRes.data as Transporter[])
        : [];
      setTransporters(transportersData);

      // Charger les zones de chaque transporteur en parallèle, avec fallback individuel
      const zonesMap = new Map<string, TransporterZone[]>();
      if (transportersData.length > 0) {
        const zonesResults = await Promise.allSettled(
          transportersData.map((transporter) =>
            api.getTransporterZones(transporter.id).then(({ data }) => ({
              id: transporter.id,
              zones: Array.isArray(data) ? (data as TransporterZone[]) : [],
            }))
          )
        );
        for (const result of zonesResults) {
          if (result.status === 'fulfilled') {
            zonesMap.set(result.value.id, result.value.zones);
          }
        }
      }
      setTransportersWithZones(zonesMap);

      setUsers(Array.isArray(usersRes.data) ? (usersRes.data as TransporterUser[]) : []);
      setDeliveryZones(Array.isArray(zonesRes.data) ? (zonesRes.data as DeliveryZone[]) : []);
    } catch (error) {
      console.error('Error loading transporters data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transporter: Transporter) => {
    setEditingTransporter(transporter);
    setFormData({
      first_name: transporter.first_name || '',
      last_name: transporter.last_name || '',
      email: transporter.email || '',
      phone: transporter.phone || '',
      address: '',
      user_id: transporter.user_id || '',
      vehicle_type: transporter.vehicle_type || '',
      license_plate: transporter.license_plate || '',
      status: transporter.status || 'available',
      selected_zones: [],
      create_mode: 'existing',
    });
    // Load zones for this transporter
    api.getTransporterZones(transporter.id)
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setFormData((prev) => ({
            ...prev,
            selected_zones: data.map((zone: TransporterZone) => zone.id),
          }));
        }
      })
      .catch((error) => {
        console.error('Error loading transporter zones:', error);
      });
    setIsModalOpen(true);
  };

  const handleManageZones = async (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setLoadingZones(true);
    try {
      const { data } = await api.getTransporterZones(transporter.id);
      if (Array.isArray(data)) {
        setTransporterZones(data as TransporterZone[]);
      } else {
        setTransporterZones([]);
      }
      setIsZonesModalOpen(true);
    } catch (error) {
      console.error('Error loading transporter zones:', error);
      alert('Erreur lors du chargement des zones');
    } finally {
      setLoadingZones(false);
    }
  };

  const handleAssignZone = async (zoneId: string) => {
    if (!selectedTransporter) return;

    try {
      await api.assignZoneToTransporter(zoneId, selectedTransporter.id);
      // Reload zones
      const { data } = await api.getTransporterZones(selectedTransporter.id);
      if (Array.isArray(data)) {
        const typedZones = data as TransporterZone[];
        setTransporterZones(typedZones);
        // Update transportersWithZones map
        setTransportersWithZones((prev) => {
          const newMap = new Map(prev);
          newMap.set(selectedTransporter.id, typedZones);
          return newMap;
        });
      }
      // Reload zones list to update counts
      const zonesRes = await api.getDeliveryZones();
      if (Array.isArray(zonesRes.data)) {
        setDeliveryZones(zonesRes.data as DeliveryZone[]);
      }
      // Reload transporters data to refresh the table
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Error assigning zone:', error);
      alert(`Erreur lors de l'attribution de la zone: ${message}`);
    }
  };

  const handleRemoveZone = async (zoneId: string) => {
    if (!selectedTransporter) return;
    if (!confirm('Êtes-vous sûr de vouloir retirer cette zone de ce transporteur ?')) return;

    try {
      await api.removeZoneFromTransporter(zoneId, selectedTransporter.id);
      // Reload zones
      const { data } = await api.getTransporterZones(selectedTransporter.id);
      if (Array.isArray(data)) {
        const typedZones = data as TransporterZone[];
        setTransporterZones(typedZones);
        // Update transportersWithZones map
        setTransportersWithZones((prev) => {
          const newMap = new Map(prev);
          newMap.set(selectedTransporter.id, typedZones);
          return newMap;
        });
      }
      // Reload zones list to update counts
      const zonesRes = await api.getDeliveryZones();
      if (Array.isArray(zonesRes.data)) {
        setDeliveryZones(zonesRes.data as DeliveryZone[]);
      }
      // Reload transporters data to refresh the table
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Error removing zone:', error);
      alert(`Erreur lors de la suppression de la zone: ${message}`);
    }
  };

  const handleSave = async () => {
    try {
      let transporterId: string;

      if (editingTransporter) {
        // Update existing transporter
        await api.updateTransporter(editingTransporter.id, {
          vehicle_type: formData.vehicle_type,
          license_plate: formData.license_plate,
          status: formData.status,
        });
        transporterId = editingTransporter.id;
      } else {
        // Create new transporter
        let userId: string;

        if (formData.create_mode === 'new') {
          // Create new user first
          const userResponse = await api.createUser({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            role: 'transporter',
            password: generateTempPassword(),
            address: formData.address,
          });

          const newUser = userResponse.data as TransporterUser | undefined;
          if (userResponse.error || !newUser) {
            alert(`Erreur lors de la création de l'utilisateur: ${userResponse.error || 'Erreur inconnue'}`);
            return;
          }

          userId = newUser.id;
        } else {
          userId = formData.user_id;
        }

        // Create transporter
        const transporterResponse = await api.createTransporter({
          user_id: userId,
          vehicle_type: formData.vehicle_type,
          license_plate: formData.license_plate,
          status: formData.status,
        });

        const newTransporter = transporterResponse.data as Transporter | undefined;
        if (transporterResponse.error || !newTransporter) {
          alert(`Erreur lors de la création du transporteur: ${transporterResponse.error || 'Erreur inconnue'}`);
          return;
        }

        transporterId = newTransporter.id;
      }

      // Assign zones (always update zones, even if empty array)
      // Remove existing zones first
      const currentZonesResponse = editingTransporter
        ? await api.getTransporterZones(transporterId)
        : { data: [] };

      if (Array.isArray(currentZonesResponse.data)) {
        for (const zone of currentZonesResponse.data as TransporterZone[]) {
          await api.removeZoneFromTransporter(zone.id, transporterId);
        }
      }

      // Assign new zones
      for (const zoneId of formData.selected_zones) {
        await api.assignZoneToTransporter(zoneId, transporterId);
      }

      setIsModalOpen(false);
      setEditingTransporter(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        user_id: '',
        vehicle_type: '',
        license_plate: '',
        status: 'available',
        selected_zones: [],
        create_mode: 'new',
      });
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Error saving transporter:', error);
      alert(`Erreur lors de la sauvegarde: ${message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce transporteur ?')) return;

    try {
      await api.deleteTransporter(id);
      loadData();
    } catch (error) {
      console.error('Error deleting transporter:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleViewInfo = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setTransporterInfo(transporter as TransporterDetails);
    setIsInfoModalOpen(true);
  };

  const handleViewPackages = async (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setLoadingPackages(true);
    setIsPackagesModalOpen(true);
    try {
      // Récupérer les colis assignés au transporteur
      const { data: assignments } = await api.getTransporterAssignments(transporter.id);
      setTransporterPackages(
        Array.isArray(assignments) ? (assignments as TransporterAssignment[]) : []
      );
    } catch (error) {
      console.error('Error loading packages:', error);
      setTransporterPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  const renderPaymentBadge = (shipment: TransporterAssignment) => {
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
    key: keyof Transporter | string;
    label: string;
    render?: (transporter: Transporter) => ReactNode;
  }> = [
    {
      key: 'name',
      label: 'Transporteur',
      render: (transporter) => (
        <button
          onClick={() => handleViewInfo(transporter)}
          className="text-left text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {`${transporter.first_name || ''} ${transporter.last_name || ''}`.trim() || transporter.email}
        </button>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'vehicle_type', label: 'Véhicule' },
    { key: 'license_plate', label: 'Plaque' },
    {
      key: 'zones',
      label: 'Zones de livraison',
      render: (transporter) => {
        const zones = transportersWithZones.get(transporter.id) || [];
        if (zones.length === 0) {
          return <span className="text-xs text-gray-400">Aucune zone</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {zones.slice(0, 2).map((zone) => (
              <span key={zone.id} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                {zone.name}
              </span>
            ))}
            {zones.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                +{zones.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (transporter) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          transporter.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {transporter.status === 'available' ? 'Disponible' : 'Occupé'}
        </span>
      ),
    },
    {
      key: 'current_packages',
      label: 'Colis actuels',
      render: (transporter) => (
        <button
          onClick={() => handleViewPackages(transporter)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {transporter.current_packages || 0}
        </button>
      ),
    },
    {
      key: 'total_deliveries',
      label: 'Total livraisons',
      render: (transporter) => transporter.total_deliveries || 0,
    },
  ];

  const assignedZoneIds = new Set(transporterZones.map(z => z.id));
  const availableZones = deliveryZones.filter(z => z.is_active && !assignedZoneIds.has(z.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-[#FF6C00]" />
            Gestion des transporteurs
          </h2>
          <p className="text-gray-600 mt-2">Gérez les transporteurs et leurs véhicules</p>
        </div>
        <button
          onClick={() => {
            setEditingTransporter(null);
            setFormData({
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              address: '',
              user_id: '',
              vehicle_type: '',
              license_plate: '',
              status: 'available',
              selected_zones: [],
              create_mode: 'new',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau transporteur
        </button>
      </div>

      <DataTable
        data={transporters}
        columns={columns}
        loading={loading}
        actions={(transporter) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleManageZones(transporter)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
              title="Gérer les zones de livraison"
            >
              <MapPin className="w-4 h-4" />
              Zones
            </button>
            <button
              onClick={() => handleEdit(transporter)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(transporter.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Edit/Create Transporter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransporter(null);
        }}
        title={editingTransporter ? 'Modifier le transporteur' : 'Nouveau transporteur'}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          {!editingTransporter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode de création</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="create_mode"
                    value="new"
                    checked={formData.create_mode === 'new'}
                    onChange={(e) => setFormData({ ...formData, create_mode: e.target.value as 'new' | 'existing', user_id: '', first_name: '', last_name: '', email: '', phone: '', address: '' })}
                    className="mr-2"
                  />
                  Créer un nouvel utilisateur
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="create_mode"
                    value="existing"
                    checked={formData.create_mode === 'existing'}
                    onChange={(e) => setFormData({ ...formData, create_mode: e.target.value as 'new' | 'existing', first_name: '', last_name: '', email: '', phone: '', address: '' })}
                    className="mr-2"
                  />
                  Utiliser un utilisateur existant
                </label>
              </div>
            </div>
          )}

          {!editingTransporter && formData.create_mode === 'new' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  placeholder="Adresse complète"
                />
              </div>
            </>
          )}

          {!editingTransporter && formData.create_mode === 'existing' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur existant *</label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              >
                <option value="">Sélectionner un utilisateur</option>
                {users.filter(u => u.role === 'transporter' || !u.role).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule *</label>
            <select
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              required
            >
              <option value="">Sélectionner</option>
              <option value="motorcycle">Moto</option>
              <option value="car">Voiture</option>
              <option value="van">Camionnette</option>
              <option value="truck">Camion</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plaque d'immatriculation *</label>
            <input
              type="text"
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              required
              placeholder="CI-123-AB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="available">Disponible</option>
              <option value="busy">Occupé</option>
            </select>
          </div>

          {/* Zones de livraison */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zones de livraison {!editingTransporter && '*'}
            </label>
            <p className="text-xs text-gray-500 mb-2">Sélectionnez les zones de livraison assignées à ce transporteur</p>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {deliveryZones.filter(z => z.is_active).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucune zone de livraison disponible. Créez d'abord une zone.</p>
              ) : (
                deliveryZones.filter(z => z.is_active).map((zone) => {
                  const isSelected = formData.selected_zones.includes(zone.id);
                  return (
                    <div
                      key={zone.id}
                      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setFormData(prev => ({
                            ...prev,
                            selected_zones: prev.selected_zones.filter(id => id !== zone.id),
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            selected_zones: [...prev.selected_zones, zone.id],
                          }));
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setFormData(prev => ({
                              ...prev,
                              selected_zones: prev.selected_zones.filter(id => id !== zone.id),
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              selected_zones: [...prev.selected_zones, zone.id],
                            }));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-[#FF6C00] focus:ring-[#FF6C00] rounded cursor-pointer mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{zone.name}</div>
                        {zone.description && (
                          <div className="text-sm text-gray-600 mt-1">{zone.description}</div>
                        )}
                        {zone.communes && zone.communes.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Communes: {zone.communes.slice(0, 3).join(', ')}
                            {zone.communes.length > 3 && ` +${zone.communes.length - 3}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {formData.selected_zones.length > 0 && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                <p className="text-xs text-purple-800 font-medium">
                  {formData.selected_zones.length} zone(s) sélectionnée(s)
                </p>
              </div>
            )}
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
              {editingTransporter ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage Zones Modal */}
      <Modal
        isOpen={isZonesModalOpen}
        onClose={() => {
          setIsZonesModalOpen(false);
          setSelectedTransporter(null);
          setTransporterZones([]);
        }}
        title={`Zones de livraison - ${selectedTransporter ? `${selectedTransporter.first_name} ${selectedTransporter.last_name}` : ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Assigned Zones */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Zones assignées</h3>
            {loadingZones ? (
              <p className="text-gray-500">Chargement...</p>
            ) : transporterZones.length === 0 ? (
              <p className="text-gray-500">Aucune zone assignée</p>
            ) : (
              <div className="space-y-2">
                {transporterZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{zone.name}</div>
                      {zone.communes && zone.communes.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          Communes: {zone.communes.join(', ')}
                        </div>
                      )}
                      {zone.description && (
                        <div className="text-sm text-gray-500 mt-1">{zone.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveZone(zone.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Retirer cette zone"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Zones */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Zones disponibles</h3>
            {availableZones.length === 0 ? (
              <p className="text-gray-500">Toutes les zones sont déjà assignées ou aucune zone n'est disponible</p>
            ) : (
              <div className="space-y-2">
                {availableZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{zone.name}</div>
                      {zone.communes && zone.communes.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          Communes: {zone.communes.join(', ')}
                        </div>
                      )}
                      {zone.description && (
                        <div className="text-sm text-gray-500 mt-1">{zone.description}</div>
                      )}
                      {(zone.transporter_count ?? 0) > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Déjà assignée à {zone.transporter_count} transporteur(s)
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssignZone(zone.id)}
                      className="ml-4 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors text-sm"
                    >
                      Assigner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Transporter Info Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setSelectedTransporter(null);
          setTransporterInfo(null);
        }}
        title="Informations du transporteur"
        size="lg"
      >
        {transporterInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {transporterInfo.first_name || 'Non renseigné'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {transporterInfo.last_name || 'Non renseigné'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {transporterInfo.email || 'Non renseigné'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {transporterInfo.phone || 'Non renseigné'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {transporterInfo.address || transporterInfo.user_address || 'Non renseigné'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {transporterInfo.city || transporterInfo.user_city || 'Non renseigné'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commune</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {transporterInfo.commune || transporterInfo.user_commune || 'Non renseigné'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quartier</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {transporterInfo.quarter || transporterInfo.user_quarter || transporterInfo.neighborhood || 'Non renseigné'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {transporterInfo.vehicle_type === 'motorcycle' ? 'Moto' :
                   transporterInfo.vehicle_type === 'car' ? 'Voiture' :
                   transporterInfo.vehicle_type === 'van' ? 'Camionnette' :
                   transporterInfo.vehicle_type === 'truck' ? 'Camion' :
                   transporterInfo.vehicle_type || 'Non renseigné'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plaque d'immatriculation</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {transporterInfo.license_plate || 'Non renseigné'}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => {
                  setIsInfoModalOpen(false);
                  setSelectedTransporter(null);
                  setTransporterInfo(null);
                }}
                className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Packages Modal */}
      <Modal
        isOpen={isPackagesModalOpen}
        onClose={() => {
          setIsPackagesModalOpen(false);
          setSelectedTransporter(null);
          setTransporterPackages([]);
        }}
        title={`Colis actuels - ${selectedTransporter ? `${selectedTransporter.first_name} ${selectedTransporter.last_name}` : ''}`}
        size="xl"
      >
        <div className="space-y-4">
          {loadingPackages ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00] mx-auto"></div>
              <p className="text-gray-500 mt-2">Chargement des colis...</p>
            </div>
          ) : transporterPackages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun colis assigné à ce transporteur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro de suivi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinataire</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de création</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transporterPackages.map((pkg) => {
                    const status = normalizeShipmentStatus(pkg.current_status ?? pkg.status);
                    const statusLabel = getShipmentStatusLabel(status);
                    const statusClass = getShipmentStatusBadgeClass(status);
                    return (
                      <tr key={pkg.id || pkg.tracking_number} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-[#FF6C00]">
                          {pkg.tracking_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pkg.recipient_first_name} {pkg.recipient_last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {pkg.home_delivery ? (
                          <div>
                            <div className="font-medium">{pkg.recipient_address}</div>
                            <div className="text-xs text-gray-500">{pkg.recipient_commune}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{pkg.destination_relay_name || pkg.relay_name || 'Point Relais'}</div>
                            <div className="text-xs text-gray-500">{pkg.destination_relay_commune || pkg.relay_commune || ''}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pkg.home_delivery
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {pkg.home_delivery ? 'Domicile' : 'Point Relais'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderPaymentBadge(pkg)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={() => {
                setIsPackagesModalOpen(false);
                setSelectedTransporter(null);
                setTransporterPackages([]);
              }}
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
