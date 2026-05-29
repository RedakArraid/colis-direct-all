import { useState, useEffect } from 'react';
import { DollarSign, Edit, Trash2, Plus, Save, X, AlertCircle, CheckCircle, FileText, Package, Zap, Shield, Truck, MapPin, Home } from 'lucide-react';
import { api } from '../../lib/api';

interface PricingGrid {
  id: number;
  grid_type: 'courier' | 'colis';
  package_size?: 'petit' | 'moyen' | 'grand'; // NULL pour courier, obligatoire pour colis
  delivery_mode?: 'relay' | 'home';
  weight_min: number;
  weight_max: number;
  price_intra_commune: number;
  price_inter_commune: number;
  supplement_per_kg_intra: number;
  supplement_per_kg_inter: number;
  is_active: boolean;
  display_order: number;
}

interface AdditionalOption {
  id: number;
  option_key: string;
  option_name: string;
  option_description: string | null;
  price_type: 'fixed' | 'percentage';
  price_value: number;
  is_active: boolean;
  display_order: number;
}

type TabType = 'courier' | 'colis' | 'options';
type ColisSize = 'petit' | 'moyen' | 'grand';
type DeliveryMode = 'relay' | 'home';

export default function PricingManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('courier');
  const [colisSize, setColisSize] = useState<ColisSize>('petit'); // Pour l'onglet colis
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('relay');
  const [courierGrids, setCourierGrids] = useState<PricingGrid[]>([]);
  const [colisGrids, setColisGrids] = useState<PricingGrid[]>([]);
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrid, setEditingGrid] = useState<PricingGrid | null>(null);
  const [editingOption, setEditingOption] = useState<AdditionalOption | null>(null);
  const [gridFormData, setGridFormData] = useState({
    grid_type: 'courier' as 'courier' | 'colis',
    package_size: undefined as 'petit' | 'moyen' | 'grand' | undefined,
    delivery_mode: 'relay' as 'relay' | 'home',
    weight_min: 0,
    weight_max: 0,
    price_intra_commune: 0,
    price_inter_commune: 0,
    supplement_per_kg_intra: 0,
    supplement_per_kg_inter: 0,
    is_active: true,
    display_order: 0,
  });
  const [optionFormData, setOptionFormData] = useState({
    option_name: '',
    option_description: '',
    price_type: 'fixed' as 'fixed' | 'percentage',
    price_value: 0,
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadData();
  }, [deliveryMode, colisSize]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: grids, error: gridsError } = await api.getPricingGrids();
      if (gridsError) throw new Error(gridsError);

      // Filtrer uniquement les grilles actives pour l'affichage par défaut
      const activeGrids = (grids || []).filter((g: PricingGrid) => g.is_active);
      // Filtrer aussi par delivery_mode
      const filteredByMode = activeGrids.filter((g: PricingGrid) => 
        !g.delivery_mode || g.delivery_mode === deliveryMode
      );
      
      // Courrier : pas de package_size
      const courier = filteredByMode.filter((g: PricingGrid) => 
        g.grid_type === 'courier' && !g.package_size
      );
      
      // Colis : filtrer par package_size si on est sur l'onglet colis
      const colis = filteredByMode.filter((g: PricingGrid) => 
        g.grid_type === 'colis' && 
        (activeTab !== 'colis' || !g.package_size || g.package_size === colisSize)
      );
      
      setCourierGrids(courier);
      setColisGrids(colis);

      const { data: options, error: optionsError } = await api.getAdditionalOptions();
      if (optionsError) throw new Error(optionsError);
      // Filtrer uniquement les options actives
      const activeOptions = (options || []).filter((o: AdditionalOption) => o.is_active);
      setAdditionalOptions(activeOptions);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des tarifs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGrid = (grid: PricingGrid) => {
    setEditingGrid(grid);
    setEditingOption(null);
    setGridFormData({
      grid_type: grid.grid_type,
      package_size: grid.package_size,
      delivery_mode: grid.delivery_mode || 'relay',
      weight_min: parseFloat(grid.weight_min.toString()),
      weight_max: parseFloat(grid.weight_max.toString()),
      price_intra_commune: parseFloat(grid.price_intra_commune.toString()),
      price_inter_commune: parseFloat(grid.price_inter_commune.toString()),
      supplement_per_kg_intra: parseFloat(grid.supplement_per_kg_intra.toString()),
      supplement_per_kg_inter: parseFloat(grid.supplement_per_kg_inter.toString()),
      is_active: grid.is_active,
      display_order: grid.display_order,
    });
    setIsModalOpen(true);
  };

  const handleCreateGrid = () => {
    setEditingGrid(null);
    setEditingOption(null);
    
    // Définir les valeurs par défaut selon le type
    let defaultWeightMin = 0;
    let defaultWeightMax = 1;
    let defaultPackageSize: 'petit' | 'moyen' | 'grand' | undefined = undefined;
    
    if (activeTab === 'courier') {
      // Courrier : pas de poids spécifique, pas de package_size
      defaultWeightMin = 0;
      defaultWeightMax = 2; // Courrier généralement jusqu'à 2kg
      defaultPackageSize = undefined;
    } else if (activeTab === 'colis') {
      // Colis : selon la taille sélectionnée
      if (colisSize === 'petit') {
        defaultWeightMin = 0;
        defaultWeightMax = 5;
      } else if (colisSize === 'moyen') {
        defaultWeightMin = 5.5;
        defaultWeightMax = 10;
      } else { // grand
        defaultWeightMin = 10.5;
        defaultWeightMax = 30;
      }
      defaultPackageSize = colisSize;
    }
    
    setGridFormData({
      grid_type: activeTab === 'courier' ? 'courier' : 'colis',
      package_size: defaultPackageSize,
      delivery_mode: deliveryMode,
      weight_min: defaultWeightMin,
      weight_max: defaultWeightMax,
      price_intra_commune: 0,
      price_inter_commune: 0,
      supplement_per_kg_intra: 0,
      supplement_per_kg_inter: 0,
      is_active: true,
      display_order: 0,
    });
    setIsModalOpen(true);
  };

  const handleEditOption = (option: AdditionalOption) => {
    setEditingOption(option);
    setEditingGrid(null);
    setOptionFormData({
      option_name: option.option_name,
      option_description: option.option_description || '',
      price_type: option.price_type,
      price_value: parseFloat(option.price_value.toString()),
      is_active: option.is_active,
      display_order: option.display_order,
    });
    setIsModalOpen(true);
  };

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingGrid) {
        const { error: apiError } = await api.updatePricingGrid(editingGrid.id.toString(), gridFormData);
        if (apiError) {
          setError(apiError);
        } else {
          setSuccess('Grille tarifaire mise à jour avec succès');
          setIsModalOpen(false);
          loadData();
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        const { error: apiError } = await api.createPricingGrid(gridFormData);
        if (apiError) {
          setError(apiError);
        } else {
          setSuccess('Grille tarifaire créée avec succès');
          setIsModalOpen(false);
          loadData();
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingOption) {
        const { error: apiError } = await api.updateAdditionalOption(editingOption.id.toString(), optionFormData);
        if (apiError) {
          setError(apiError);
        } else {
          setSuccess('Option mise à jour avec succès');
          setIsModalOpen(false);
          loadData();
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteGrid = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette grille tarifaire ?')) {
      return;
    }

    try {
      const { error: apiError } = await api.deletePricingGrid(id.toString());
      if (apiError) {
        setError(apiError);
      } else {
        setSuccess('Grille tarifaire supprimée avec succès');
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatWeight = (min: number, max: number) => {
    if (max === 999 || max > 100) {
      return `Tous poids`;
    }
    if (min === 0) {
      return `≤ ${max} kg`;
    }
    return `${min} - ${max} kg`;
  };

  // Clés qui relèvent de la tarification système (pas des add-ons client)
  const SYSTEM_PRICING_KEYS = new Set([
    'discount_relay_to_relay',
    'discount_home_to_relay',
    'discount_relay_to_home',
    'home_delivery_supplement',
    'fallback_courier_intra',
    'fallback_courier_inter',
    'fallback_colis_intra',
    'fallback_colis_inter',
  ]);

  const getOptionIcon = (key: string) => {
    switch (key) {
      case 'express': return <Zap className="w-5 h-5" />;
      case 'insurance': return <Shield className="w-5 h-5" />;
      case 'fragile': return <Package className="w-5 h-5" />;
      case 'home_delivery':
      case 'home_delivery_supplement': return <Home className="w-5 h-5" />;
      case 'discount_relay_to_relay':
      case 'discount_home_to_relay':
      case 'discount_relay_to_home': return <MapPin className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  const formatOptionValue = (option: AdditionalOption): string => {
    if (SYSTEM_PRICING_KEYS.has(option.option_key)) {
      if (option.option_key.startsWith('discount_')) {
        return `-${option.price_value}% sur le prix standard`;
      }
      return `${formatCurrency(option.price_value)} FCFA`;
    }
    return option.price_type === 'fixed'
      ? `${formatCurrency(option.price_value)} FCFA`
      : `${option.price_value}% de la valeur déclarée`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6C00]"></div>
      </div>
    );
  }

  const currentGrids = activeTab === 'courier' ? courierGrids : colisGrids;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des tarifs</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configurez les grilles tarifaires et options supplémentaires</p>
        </div>
        {activeTab !== 'options' && (
          <button
            onClick={handleCreateGrid}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors font-medium"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Nouvelle tranche</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs avec sélection du mode de livraison */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {/* Sélection du mode de livraison */}
            <div className="flex items-center gap-2 pr-6 mr-6 border-r border-gray-300">
              <button
                onClick={() => setDeliveryMode('relay')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap ${
                  deliveryMode === 'relay'
                    ? 'bg-[#FF6C00] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Point Relais
              </button>
              <button
                onClick={() => setDeliveryMode('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap ${
                  deliveryMode === 'home'
                    ? 'bg-[#FF6C00] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Home className="w-4 h-4" />
                Livraison à domicile
              </button>
            </div>

            {/* Onglets de tarification */}
            <button
              onClick={() => setActiveTab('courier')}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'courier'
                  ? 'border-[#FF6C00] text-[#FF6C00]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Courrier</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('colis')}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'colis'
                  ? 'border-[#FF6C00] text-[#FF6C00]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Colis</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'options'
                  ? 'border-[#FF6C00] text-[#FF6C00]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Options supplémentaires</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Sous-onglets pour Colis (Petit/Moyen/Grand) */}
      {activeTab === 'colis' && (
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setColisSize('petit')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  colisSize === 'petit'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Petit (0 - 5 kg)
              </button>
              <button
                onClick={() => setColisSize('moyen')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  colisSize === 'moyen'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Moyen (5.5 - 10 kg)
              </button>
              <button
                onClick={() => setColisSize('grand')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  colisSize === 'grand'
                    ? 'border-[#FF6C00] text-[#FF6C00]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Grand (&gt; 10 kg)
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'options' ? (
        <div className="space-y-6">
          {/* Section 1 — Tarification système */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Tarification marketplace</h2>
              <p className="text-sm text-gray-500 mb-4">Remises par mode de livraison et prix de référence. Ces valeurs sont appliquées automatiquement dans le calculateur de tarifs.</p>
              {additionalOptions.filter(o => SYSTEM_PRICING_KEYS.has(o.option_key)).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Migration non encore appliquée — lancez les migrations depuis Paramètres.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {additionalOptions.filter(o => SYSTEM_PRICING_KEYS.has(o.option_key)).map((option) => (
                    <div key={option.id} className="border border-blue-100 bg-blue-50/40 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            {getOptionIcon(option.option_key)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{option.option_name}</h3>
                            {option.option_description && (
                              <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{option.option_description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditOption(option)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-blue-700">{formatOptionValue(option)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {option.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2 — Frais additionnels client */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Frais additionnels</h2>
              <p className="text-sm text-gray-500 mb-4">Options proposées au client lors de la création d'un envoi (fragile, assurance…).</p>
              {additionalOptions.filter(o => !SYSTEM_PRICING_KEYS.has(o.option_key)).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">Aucune option client configurée</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {additionalOptions.filter(o => !SYSTEM_PRICING_KEYS.has(o.option_key)).map((option) => (
                    <div key={option.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#FF6C00] bg-opacity-10 rounded-lg flex items-center justify-center text-[#FF6C00]">
                            {getOptionIcon(option.option_key)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{option.option_name}</h3>
                            {option.option_description && (
                              <p className="text-xs text-gray-500 mt-1">{option.option_description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditOption(option)}
                          className="p-2 text-[#FF6C00] hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">{formatOptionValue(option)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {option.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    {activeTab === 'colis' ? 'Taille' : 'Type'}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Poids</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Mode de livraison</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Intra-communes</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Inter-communes</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Supplément/kg</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Statut</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentGrids.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                      Aucune grille tarifaire configurée
                    </td>
                  </tr>
                ) : (
                  currentGrids.map((grid) => (
                    <tr key={grid.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        {activeTab === 'courier' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FileText className="w-3 h-3" />
                            Courrier
                          </span>
                        ) : grid.package_size ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            grid.package_size === 'petit' ? 'bg-blue-100 text-blue-800' :
                            grid.package_size === 'moyen' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            <Package className="w-3 h-3" />
                            {grid.package_size === 'petit' ? 'Petit' : grid.package_size === 'moyen' ? 'Moyen' : 'Grand'}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                        {formatWeight(grid.weight_min, grid.weight_max)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          (grid.delivery_mode || 'relay') === 'home'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {(grid.delivery_mode || 'relay') === 'home' ? (
                            <>
                              <Home className="w-3 h-3" />
                              Domicile
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3 h-3" />
                              Relais
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(grid.price_intra_commune)} FCFA
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(grid.price_inter_commune)} FCFA
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                        {grid.supplement_per_kg_intra > 0 || grid.supplement_per_kg_inter > 0 ? (
                          <div>
                            <div>Intra: +{formatCurrency(grid.supplement_per_kg_intra)}</div>
                            <div>Inter: +{formatCurrency(grid.supplement_per_kg_inter)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          grid.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {grid.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditGrid(grid)}
                            className="p-2 text-[#FF6C00] hover:bg-orange-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGrid(grid.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal pour créer/modifier une grille ou option */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-[#FF6C00]" />
                <h2 className="text-xl font-bold text-gray-900">
                  {editingOption ? 'Modifier l\'option' : editingGrid ? 'Modifier la grille tarifaire' : 'Nouvelle grille tarifaire'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {editingOption ? (
              <form onSubmit={handleSaveOption} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'option *
                    </label>
                    <input
                      type="text"
                      value={optionFormData.option_name}
                      onChange={(e) => setOptionFormData({ ...optionFormData, option_name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={optionFormData.option_description}
                      onChange={(e) => setOptionFormData({ ...optionFormData, option_description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type de prix *
                      </label>
                      <select
                        value={optionFormData.price_type}
                        onChange={(e) => setOptionFormData({ ...optionFormData, price_type: e.target.value as 'fixed' | 'percentage' })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      >
                        <option value="fixed">Fixe (FCFA)</option>
                        <option value="percentage">Pourcentage (%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {optionFormData.price_type === 'fixed' ? 'Montant (FCFA) *' : 'Pourcentage (%) *'}
                      </label>
                      <input
                        type="number"
                        value={optionFormData.price_value}
                        onChange={(e) => setOptionFormData({ ...optionFormData, price_value: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                        step={optionFormData.price_type === 'percentage' ? '0.1' : '100'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optionFormData.is_active}
                          onChange={(e) => setOptionFormData({ ...optionFormData, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#FF6C00] border-gray-300 rounded focus:ring-[#FF6C00]"
                        />
                        <span className="text-sm font-medium text-gray-700">Option active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveGrid} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de grille *
                    </label>
                    <select
                      value={gridFormData.grid_type}
                      onChange={(e) => {
                        const newType = e.target.value as 'courier' | 'colis';
                        setGridFormData({ 
                          ...gridFormData, 
                          grid_type: newType,
                          package_size: newType === 'courier' ? undefined : (gridFormData.package_size || 'petit')
                        });
                      }}
                      required
                      disabled={!!editingGrid}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="courier">Courrier (Documents, lettres, dossiers - pas de catégories de poids)</option>
                      <option value="colis">Colis (avec catégories Petit/Moyen/Grand)</option>
                    </select>
                    </div>
                    {gridFormData.grid_type === 'colis' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taille du colis *
                        </label>
                        <select
                          value={gridFormData.package_size || 'petit'}
                          onChange={(e) => setGridFormData({ ...gridFormData, package_size: e.target.value as 'petit' | 'moyen' | 'grand' })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                        >
                          <option value="petit">Petit (0 - 5 kg)</option>
                          <option value="moyen">Moyen (5.5 - 10 kg)</option>
                          <option value="grand">Grand (&gt; 10 kg)</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de livraison *
                      </label>
                      <select
                        value={gridFormData.delivery_mode}
                        onChange={(e) => setGridFormData({ ...gridFormData, delivery_mode: e.target.value as 'relay' | 'home' })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      >
                        <option value="relay">Point Relais</option>
                        <option value="home">Livraison à domicile</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Poids min (kg) *
                      </label>
                      <input
                        type="number"
                        value={gridFormData.weight_min}
                        onChange={(e) => setGridFormData({ ...gridFormData, weight_min: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                        step="0.1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Poids max (kg) *
                      </label>
                      <input
                        type="number"
                        value={gridFormData.weight_max}
                        onChange={(e) => setGridFormData({ ...gridFormData, weight_max: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                        step="0.1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix intra-communes (FCFA) *
                      </label>
                      <input
                        type="number"
                        value={gridFormData.price_intra_commune}
                        onChange={(e) => setGridFormData({ ...gridFormData, price_intra_commune: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                        step="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix inter-communes (FCFA) *
                      </label>
                      <input
                        type="number"
                        value={gridFormData.price_inter_commune}
                        onChange={(e) => setGridFormData({ ...gridFormData, price_inter_commune: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                        step="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplément/kg intra-communes (FCFA)
                      </label>
                      <input
                        type="number"
                        value={gridFormData.supplement_per_kg_intra}
                        onChange={(e) => setGridFormData({ ...gridFormData, supplement_per_kg_intra: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="50"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplément/kg inter-communes (FCFA)
                      </label>
                      <input
                        type="number"
                        value={gridFormData.supplement_per_kg_inter}
                        onChange={(e) => setGridFormData({ ...gridFormData, supplement_per_kg_inter: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="50"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gridFormData.is_active}
                          onChange={(e) => setGridFormData({ ...gridFormData, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#FF6C00] border-gray-300 rounded focus:ring-[#FF6C00]"
                        />
                        <span className="text-sm font-medium text-gray-700">Grille active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingGrid ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
