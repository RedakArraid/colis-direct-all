import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import Modal from '../../components/admin/Modal';
import ZoneMapSelector from '../../components/admin/ZoneMapSelector';
import { ChangeEvent } from 'react';

const debugLog = (..._args: unknown[]) => {};

const COMMUNES_ABIDJAN = [
  'Plateau',
  'Cocody',
  'Yopougon',
  'Abobo',
  'Adjamé',
  'Marcory',
  'Koumassi',
  'Treichville',
  'Port-Bouët',
  'Attécoubé',
  'Anyama',
  'Songon',
];

// Les centres des communes ne sont plus utilisés, la détection se base sur les bounding boxes définies ci-dessous.

// Zones approximatives des communes (bounding boxes approximatives)
// Format: { commune: { minLat, maxLat, minLng, maxLng } }
// Coordonnées plus larges pour couvrir toute la superficie de chaque commune
// Ces coordonnées sont basées sur la géographie réelle d'Abidjan
const COMMUNE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'Plateau': { minLat: 5.31, maxLat: 5.33, minLng: -4.035, maxLng: -4.022 },
  'Cocody': { minLat: 5.30, maxLat: 5.42, minLng: -4.060, maxLng: -3.95 },
  'Yopougon': { minLat: 5.28, maxLat: 5.40, minLng: -4.15, maxLng: -4.04 },
  'Abobo': { minLat: 5.38, maxLat: 5.50, minLng: -4.05, maxLng: -3.92 },
  'Adjamé': { minLat: 5.32, maxLat: 5.38, minLng: -4.07, maxLng: -4.00 },
  'Marcory': { minLat: 5.18, maxLat: 5.30, minLng: -4.05, maxLng: -3.98 },
  'Koumassi': { minLat: 5.24, maxLat: 5.34, minLng: -4.07, maxLng: -3.99 },
  'Treichville': { minLat: 5.26, maxLat: 5.34, minLng: -4.05, maxLng: -3.99 },
  'Port-Bouët': { minLat: 5.12, maxLat: 5.28, minLng: -4.05, maxLng: -3.98 },
  'Attécoubé': { minLat: 5.30, maxLat: 5.40, minLng: -4.08, maxLng: -4.01 },
  'Anyama': { minLat: 5.42, maxLat: 5.56, minLng: -4.10, maxLng: -3.98 },
  'Songon': { minLat: 5.18, maxLat: 5.32, minLng: -4.15, maxLng: -4.04 },
};

// Fonction pour vérifier si deux bounding boxes se chevauchent
const boxesOverlap = (
  box1: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  box2: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): boolean => {
  return !(
    box1.maxLat < box2.minLat ||
    box1.minLat > box2.maxLat ||
    box1.maxLng < box2.minLng ||
    box1.minLng > box2.maxLng
  );
};

// Fonction pour déterminer quelles communes sont dans la zone sélectionnée
const detectCommunesInZone = (bounds: BoundingBox): string[] => {
  const communesInZone: string[] = [];

  for (const [commune, communeBounds] of Object.entries(COMMUNE_BOUNDS)) {
    if (boxesOverlap(bounds, communeBounds)) {
      communesInZone.push(commune);
    }
  }

  return communesInZone.sort();
};

type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

interface DeliveryZone {
  id: string;
  name: string;
  description?: string | null;
  communes: string[];
  min_latitude?: number | null;
  max_latitude?: number | null;
  min_longitude?: number | null;
  max_longitude?: number | null;
  is_active?: boolean;
  transporter_count?: number;
}

interface DeliveryZoneForm {
  name: string;
  description: string;
  communes: string[];
  min_latitude: string;
  max_latitude: string;
  min_longitude: string;
  max_longitude: string;
  is_active: boolean;
}

const DEFAULT_FORM: DeliveryZoneForm = {
  name: '',
  description: '',
  communes: [],
  min_latitude: '',
  max_latitude: '',
  min_longitude: '',
  max_longitude: '',
  is_active: true,
};

const MANUAL_COMMUNE_INPUT_ID = 'new-commune';

export default function DeliveryZonesManagement() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState<DeliveryZoneForm>({ ...DEFAULT_FORM });

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM });
  }, []);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getDeliveryZones();
      if (Array.isArray(data)) {
        setZones(data as DeliveryZone[]);
      } else {
        setZones([]);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
      alert('Erreur lors du chargement des zones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name || '',
      description: zone.description || '',
      communes: zone.communes ?? [],
      min_latitude: zone.min_latitude != null ? String(zone.min_latitude) : '',
      max_latitude: zone.max_latitude != null ? String(zone.max_latitude) : '',
      min_longitude: zone.min_longitude != null ? String(zone.min_longitude) : '',
      max_longitude: zone.max_longitude != null ? String(zone.max_longitude) : '',
      is_active: zone.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const zoneData = {
        ...formData,
        min_latitude: formData.min_latitude ? Number(formData.min_latitude) : null,
        max_latitude: formData.max_latitude ? Number(formData.max_latitude) : null,
        min_longitude: formData.min_longitude ? Number(formData.min_longitude) : null,
        max_longitude: formData.max_longitude ? Number(formData.max_longitude) : null,
      };

      if (editingZone) {
        await api.updateDeliveryZone(editingZone.id, zoneData);
      } else {
        await api.createDeliveryZone(zoneData);
      }
      setIsModalOpen(false);
      setEditingZone(null);
      resetForm();
      await loadZones();
    } catch (error) {
      console.error('Error saving zone:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde: ${message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) return;
    
    try {
      await api.deleteDeliveryZone(id);
      await loadZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const toggleCommune = (commune: string) => {
    setFormData((prev) => {
      const isSelected = prev.communes.includes(commune);
      const communes = isSelected
        ? prev.communes.filter((c) => c !== commune)
        : [...prev.communes, commune];
      debugLog('toggle commune', commune, { isSelected, communes });
      return { ...prev, communes };
    });
  };

  const handleZoneSelected = (bounds: BoundingBox) => {
    const detectedCommunes = detectCommunesInZone(bounds);
    debugLog('zone selection', bounds, { detectedCommunes, available: COMMUNES_ABIDJAN });

    setFormData((prev) => {
      const mergedCommunes = [...new Set([...detectedCommunes, ...prev.communes])];
      debugLog('merged communes after selection', mergedCommunes);
      return {
        ...prev,
        min_latitude: bounds.minLat.toFixed(6),
        max_latitude: bounds.maxLat.toFixed(6),
        min_longitude: bounds.minLng.toFixed(6),
        max_longitude: bounds.maxLng.toFixed(6),
        communes: mergedCommunes,
      };
    });
  };

  const handleSelectAllCommunes = () => {
    setFormData(prev => ({
      ...prev,
      communes: COMMUNES_ABIDJAN,
    }));
  };

  const getInitialBounds = (): BoundingBox | null => {
    if (
      editingZone &&
      editingZone.min_latitude != null &&
      editingZone.max_latitude != null &&
      editingZone.min_longitude != null &&
      editingZone.max_longitude != null
    ) {
      return {
        minLat: Number(editingZone.min_latitude),
        maxLat: Number(editingZone.max_latitude),
        minLng: Number(editingZone.min_longitude),
        maxLng: Number(editingZone.max_longitude),
      };
    }
    return null;
  };

  const handleManualCommuneAdd = (communeName: string) => {
    if (communeName && !formData.communes.includes(communeName)) {
      setFormData(prev => ({
        ...prev,
        communes: [...prev.communes, communeName],
      }));
    }
  };

  const handleManualInputButton = () => {
    const input = document.getElementById(MANUAL_COMMUNE_INPUT_ID) as HTMLInputElement;
    const communeName = input?.value.trim();
    if (communeName && !formData.communes.includes(communeName)) {
      setFormData(prev => ({
        ...prev,
        communes: [...prev.communes, communeName],
      }));
      if (input) input.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-[#FF6C00]" />
            Gestion des zones de livraison
          </h2>
          <p className="text-gray-600 mt-2">Créez et gérez les zones géographiques de livraison</p>
        </div>
        <button
          onClick={() => {
            setEditingZone(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle zone
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune zone de livraison créée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`bg-white border-2 rounded-lg p-4 hover:shadow-lg transition-all ${
                zone.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{zone.name}</h3>
                  {zone.is_active === false && (
                    <span className="inline-block mt-1 text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(zone)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {zone.description && (
                <p className="text-sm text-gray-600 mb-3">{zone.description}</p>
              )}

              {zone.communes && zone.communes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Communes:</div>
                  <div className="flex flex-wrap gap-1">
                    {zone.communes.map((commune: string) => (
                      <span
                        key={commune}
                        className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {commune}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                {zone.transporter_count || 0} transporteur(s) assigné(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Zone Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingZone(null);
          resetForm();
        }}
        title={editingZone ? 'Modifier la zone' : 'Nouvelle zone de livraison'}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la zone *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              placeholder="Ex: Zone Nord Abidjan"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, description: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              rows={3}
              placeholder="Description de la zone..."
            />
          </div>

          {/* Map Selector */}
          <ZoneMapSelector
            onZoneSelected={handleZoneSelected}
            initialBounds={getInitialBounds()}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Communes couvertes *</label>
              <button
                type="button"
                onClick={handleSelectAllCommunes}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Tout sélectionner
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Les communes sont automatiquement détectées quand vous sélectionnez une zone sur la carte. 
              <strong className="text-gray-700"> Vous pouvez ajouter manuellement des communes en les écrivant ci-dessous ou en cochant les cases.</strong>
            </p>
            
            {/* Champ pour ajouter une commune manuellement */}
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  id={MANUAL_COMMUNE_INPUT_ID}
                  placeholder="Ajouter une commune (ex: Cocody, Yopougon...)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent text-sm"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleManualCommuneAdd(event.currentTarget.value);
                      event.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleManualInputButton}
                  className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors text-sm font-medium"
                >
                  Ajouter
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Appuyez sur Entrée ou cliquez sur "Ajouter" pour ajouter la commune</p>
            </div>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {COMMUNES_ABIDJAN.map((commune) => {
                const isSelected = formData.communes.includes(commune);
                return (
                  <div
                    key={commune}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      toggleCommune(commune);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        toggleCommune(commune);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="w-4 h-4 text-[#FF6C00] focus:ring-[#FF6C00] rounded cursor-pointer pointer-events-auto"
                      style={{ pointerEvents: 'auto' }}
                    />
                    <span className={`text-sm flex-1 ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {commune}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-[#FF6C00] font-medium">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            {formData.communes.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Veuillez sélectionner au moins une commune (ou sélectionnez une zone sur la carte)</p>
            )}
            {formData.communes.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-800 font-medium mb-1">
                  {formData.communes.length} commune(s) sélectionnée(s)
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.communes.map((commune) => {
                    const isFromList = COMMUNES_ABIDJAN.includes(commune);
                    return (
                      <span
                        key={commune}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                          isFromList 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {commune}
                        {!isFromList && (
                          <button
                            type="button"
                            onClick={() => toggleCommune(commune)}
                            className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                            title="Retirer cette commune"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></span>
                  Communes de la liste
                  <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-1 ml-3"></span>
                  Communes ajoutées manuellement
                </p>
              </div>
            )}
          </div>

          {/* Display coordinates (read-only, filled by map) */}
          {(formData.min_latitude && formData.max_latitude && formData.min_longitude && formData.max_longitude) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">Coordonnées GPS de la zone sélectionnée :</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Latitude:</span>
                  <span className="ml-2 font-mono text-gray-900">
                    {formData.min_latitude} - {formData.max_latitude}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Longitude:</span>
                  <span className="ml-2 font-mono text-gray-900">
                    {formData.min_longitude} - {formData.max_longitude}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-[#FF6C00] focus:ring-[#FF6C00] rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Zone active
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
              disabled={formData.communes.length === 0}
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingZone ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

