import { useState, useEffect } from 'react';
import { MapPin, Check, X, Clock, Eye, Search, Filter, Loader2, Mail, Phone, Building, Calendar, FileText, Map } from 'lucide-react';
import { api } from '../../lib/api';

interface RelayApplication {
  id: string;
  applicant_first_name: string;
  applicant_last_name: string;
  business_name: string;
  business_type: string;
  phone: string;
  email: string;
  commune: string;
  quartier: string;
  address: string;
  address_complement?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  hours?: string;
  has_storage_space: boolean;
  photo_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  approved_relay_point_id?: string;
}

// Camera controller helper for Leaflet Map
function MapCameraController({ selectedApplication, useMap }: { selectedApplication: any; useMap: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedApplication?.latitude && selectedApplication?.longitude) {
      map.flyTo(
        [Number(selectedApplication.latitude), Number(selectedApplication.longitude)],
        15,
        { animate: true, duration: 1.5 }
      );
    }
  }, [selectedApplication, map]);
  return null;
}

function RelayApplicationsManagement() {
  const [applications, setApplications] = useState<RelayApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<RelayApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<RelayApplication | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(async ([L, RL]) => {
      if (!mounted) return;
      const mk2x = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
      const mk = (await import('leaflet/dist/images/marker-icon.png')).default;
      const sh = (await import('leaflet/dist/images/marker-shadow.png')).default;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: mk2x, iconUrl: mk, shadowUrl: sh });
      setMapComponents({ L, ...RL });
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter, searchQuery]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getRelayApplications();
      if (error) {
        console.error('API error:', error);
        throw new Error(error);
      }
      if (data) {
        // Convert latitude and longitude to numbers
        const processedData = Array.isArray(data) ? data.map((app: any) => ({
          ...app,
          latitude: app.latitude ? Number(app.latitude) : null,
          longitude: app.longitude ? Number(app.longitude) : null,
        })) : [];
        setApplications(processedData);
      } else {
        setApplications([]);
      }
    } catch (error: any) {
      console.error('Error loading applications:', error);
      alert('Erreur lors du chargement des candidatures: ' + error.message);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.business_name.toLowerCase().includes(query) ||
        app.applicant_first_name.toLowerCase().includes(query) ||
        app.applicant_last_name.toLowerCase().includes(query) ||
        app.commune.toLowerCase().includes(query) ||
        app.quartier.toLowerCase().includes(query) ||
        app.phone.includes(query) ||
        app.email.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleViewDetails = (application: RelayApplication) => {
    setSelectedApplication(application);
    setReviewNotes(application.notes || '');
    setRejectionReason(application.rejection_reason || '');
    setShowDetailsModal(true);
  };

  const handleStatusUpdate = async (status: 'approved' | 'rejected' | 'on_hold' | 'pending') => {
    if (!selectedApplication) return;

    setActionLoading(true);
    try {
      const { error } = await api.updateRelayApplicationStatus(
        selectedApplication.id,
        status,
        status === 'rejected' ? rejectionReason : undefined,
        reviewNotes
      );

      if (error) throw new Error(error);

      await loadApplications();
      setShowDetailsModal(false);
      setSelectedApplication(null);
      const statusMessages = {
        approved: 'approuvée',
        rejected: 'rejetée',
        on_hold: 'mise en attente',
        pending: 'reprise en traitement'
      };
      alert(`Candidature ${statusMessages[status]} avec succès.`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Approuvée', color: 'bg-green-100 text-green-800', icon: Check },
      rejected: { label: 'Rejetée', color: 'bg-red-100 text-red-800', icon: X },
      on_hold: { label: 'En attente', color: 'bg-blue-100 text-blue-800', icon: Clock },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getStatusCounts = () => {
    return {
      all: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      on_hold: applications.filter(a => a.status === 'on_hold').length,
    };
  };

  const counts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Candidatures Points Relais</h1>
          <p className="text-gray-600">Gérez les candidatures de nouveaux points relais</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{counts.all}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">En attente</div>
          <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Approuvées</div>
          <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Rejetées</div>
          <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">En attente</div>
          <div className="text-2xl font-bold text-blue-600">{counts.on_hold}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, commerce, commune, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
              <option value="on_hold">En attente (on hold)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6C00]" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune candidature trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Demandeur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Commerce</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Localisation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(app.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{app.applicant_first_name} {app.applicant_last_name}</div>
                      <div className="text-gray-500 text-xs">{app.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{app.business_name}</div>
                      <div className="text-gray-500 text-xs">{app.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{app.business_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{app.commune}</div>
                      <div className="text-xs text-gray-500">{app.quartier}</div>
                      {app.latitude && app.longitude && (
                        <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          GPS
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewDetails(app)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Détails de la candidature</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedApplication(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedApplication.status)}
                {selectedApplication.approved_relay_point_id && (
                  <span className="text-sm text-green-600">
                    Point relais créé: {selectedApplication.approved_relay_point_id}
                  </span>
                )}
              </div>

              {/* Applicant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Demandeur</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {selectedApplication.applicant_first_name} {selectedApplication.applicant_last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${selectedApplication.phone}`} className="text-sm text-blue-600 hover:underline">
                        {selectedApplication.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${selectedApplication.email}`} className="text-sm text-blue-600 hover:underline">
                        {selectedApplication.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Commerce</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 font-medium">{selectedApplication.business_name}</span>
                    </div>
                    <div className="text-sm text-gray-600 capitalize">Type: {selectedApplication.business_type}</div>
                    {selectedApplication.hours && (
                      <div className="text-sm text-gray-600">Horaires: {selectedApplication.hours}</div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 ${selectedApplication.has_storage_space ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={selectedApplication.has_storage_space ? 'text-green-600' : 'text-gray-600'}>
                        Espace de stockage disponible
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Localisation</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-gray-900">
                    <strong>Commune:</strong> {selectedApplication.commune}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Quartier:</strong> {selectedApplication.quartier}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Adresse:</strong> {selectedApplication.address}
                  </div>
                  {selectedApplication.address_complement && (
                    <div className="text-sm text-gray-900">
                      <strong>Complément:</strong> {selectedApplication.address_complement}
                    </div>
                  )}
                  {selectedApplication.description && (
                    <div className="text-sm text-gray-700 mt-2">
                      <strong>Description:</strong> {selectedApplication.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              {selectedApplication.photo_urls && selectedApplication.photo_urls.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Photos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedApplication.photo_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {selectedApplication.latitude && selectedApplication.longitude && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Position GPS</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 mb-2 bg-[#F6F7F9] relative">
                      {MapComponents ? (
                        <MapComponents.MapContainer
                          center={[Number(selectedApplication.latitude), Number(selectedApplication.longitude)]}
                          zoom={15}
                          zoomControl={true}
                          style={{ height: '100%', width: '100%', zIndex: 1 }}
                        >
                          <MapComponents.TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                          />
                          <MapCameraController
                            selectedApplication={selectedApplication}
                            useMap={MapComponents.useMap}
                          />
                          {(() => {
                            const customIcon = MapComponents.L.divIcon({
                              className: 'custom-leaflet-icon',
                              html: `
                                <div class="custom-marker active-marker" style="
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  width: 36px;
                                  height: 36px;
                                  background: #FF6C00;
                                  border: 2.5px solid #ffffff;
                                  border-radius: 50%;
                                  box-shadow: 0 4px 10px rgba(255, 108, 0, 0.4);
                                  color: #ffffff;
                                  position: relative;
                                  transition: all 0.2s ease;
                                ">
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                                  </svg>
                                </div>
                              `,
                              iconSize: [36, 36],
                              iconAnchor: [18, 18],
                            });
                            return (
                              <MapComponents.Marker
                                position={[Number(selectedApplication.latitude), Number(selectedApplication.longitude)]}
                                icon={customIcon}
                              />
                            );
                          })()}
                        </MapComponents.MapContainer>
                      ) : (
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedApplication.longitude) - 0.01},${Number(selectedApplication.latitude) - 0.01},${Number(selectedApplication.longitude) + 0.01},${Number(selectedApplication.latitude) + 0.01}&layer=mapnik&marker=${selectedApplication.latitude},${selectedApplication.longitude}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        GPS: {Number(selectedApplication.latitude).toFixed(6)}, {Number(selectedApplication.longitude).toFixed(6)}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://www.google.com/maps?q=${Number(selectedApplication.latitude)},${Number(selectedApplication.longitude)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Map className="w-4 h-4" />
                          Google Maps
                        </a>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${Number(selectedApplication.latitude)}&mlon=${Number(selectedApplication.longitude)}#map=16/${Number(selectedApplication.latitude)}/${Number(selectedApplication.longitude)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          OpenStreetMap
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {selectedApplication.status !== 'approved' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes internes</h3>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    placeholder="Ajoutez des notes pour l'équipe..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </div>
              )}

              {/* Rejection Reason */}
              {selectedApplication.status !== 'approved' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Raison de rejet (si rejetée)</h3>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    placeholder="Expliquez pourquoi la candidature est rejetée..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </div>
              )}

              {/* Review Info */}
              {selectedApplication.reviewed_at && (
                <div className="text-sm text-gray-500">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Révisé le: {new Date(selectedApplication.reviewed_at).toLocaleString('fr-FR')}
                </div>
              )}

              {/* Actions */}
              {selectedApplication.status !== 'approved' && (
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approuver
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    Rejeter
                  </button>
                  {selectedApplication.status !== 'on_hold' && (
                    <button
                      onClick={() => handleStatusUpdate('on_hold')}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      Mettre en attente
                    </button>
                  )}
                  {selectedApplication.status === 'on_hold' && (
                    <button
                      onClick={() => handleStatusUpdate('pending')}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      Reprendre le traitement
                    </button>
                  )}
                </div>
              )}
              {selectedApplication.status === 'approved' && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <Check className="w-5 h-5" />
                      <span className="font-semibold">Candidature approuvée</span>
                    </div>
                    {selectedApplication.approved_relay_point_id ? (
                      <p className="text-sm text-green-700">
                        Point relais créé avec l'ID: <strong>{selectedApplication.approved_relay_point_id}</strong>
                      </p>
                    ) : (
                      <p className="text-sm text-green-700">Cette candidature a été approuvée et un point relais a été créé.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RelayApplicationsManagement;

