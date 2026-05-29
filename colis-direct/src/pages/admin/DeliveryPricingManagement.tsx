import { useState, useEffect } from 'react';
import { Route, Plus, Edit, Trash2, Save, X, Loader2, RefreshCw, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';

interface PriceTier {
  id: string;
  tier_name: string;
  distance_km_min: number;
  distance_km_max: number | null;
  price_courrier: number;
  price_petit: number;
  price_moyen: number;
  price_grand: number;
  is_active: boolean;
  display_order: number;
}

const EMPTY_TIER: Omit<PriceTier, 'id'> = {
  tier_name: '',
  distance_km_min: 0,
  distance_km_max: null,
  price_courrier: 0,
  price_petit: 0,
  price_moyen: 0,
  price_grand: 0,
  is_active: true,
  display_order: 0,
};

const SIZE_COLS = [
  { key: 'price_courrier', label: 'Courrier' },
  { key: 'price_petit',    label: 'Petit'    },
  { key: 'price_moyen',    label: 'Moyen'    },
  { key: 'price_grand',    label: 'Grand'    },
] as const;

function fmt(n: number) {
  return Number(n).toLocaleString('fr-FR');
}

export default function DeliveryPricingManagement() {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceTier | null>(null);
  const [form, setForm] = useState<Omit<PriceTier, 'id'>>(EMPTY_TIER);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getDeliveryPriceTiers();
      if (error) throw new Error(error);
      setTiers(data || []);
    } catch (e: any) {
      toast.error('Erreur chargement tranches : ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_TIER, display_order: tiers.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (tier: PriceTier) => {
    setEditing(tier);
    setForm({
      tier_name:       tier.tier_name,
      distance_km_min: tier.distance_km_min,
      distance_km_max: tier.distance_km_max,
      price_courrier:  tier.price_courrier,
      price_petit:     tier.price_petit,
      price_moyen:     tier.price_moyen,
      price_grand:     tier.price_grand,
      is_active:       tier.is_active,
      display_order:   tier.display_order,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tier_name.trim()) return toast.error('Nom de la tranche requis');
    setSaving(true);
    try {
      const payload = { ...form, distance_km_max: form.distance_km_max ?? null };
      if (editing) {
        const { error } = await api.updateDeliveryPriceTier(editing.id, payload);
        if (error) throw new Error(error);
        toast.success('Tranche mise à jour');
      } else {
        const { error } = await api.createDeliveryPriceTier(payload);
        if (error) throw new Error(error);
        toast.success('Tranche créée');
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette tranche ?')) return;
    setDeletingId(id);
    try {
      const { error } = await api.deleteDeliveryPriceTier(id);
      if (error) throw new Error(error);
      toast.success('Tranche supprimée');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked
              : e.target.type === 'number'   ? (e.target.value === '' ? null : parseFloat(e.target.value))
              : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Route className="w-7 h-7 text-[#FF6C00]" />
            Tarification par distance
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Prix de la course = tranche de distance × taille du colis. Les remises par mode de livraison s'appliquent ensuite.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg text-sm font-medium hover:bg-[#e66100]">
            <Plus className="w-4 h-4" /> Nouvelle tranche
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3 text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
        <span>
          La distance est calculée automatiquement via les coordonnées des <strong>zones de livraison</strong>.
          Si une commune n'appartient à aucune zone, la tranche la plus haute est utilisée.
          Les remises par mode (−5%, −10%) sont configurables dans <strong>Tarifs → Options</strong>.
        </span>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#FF6C00]" /></div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Aucune tranche configurée. Créez-en une pour commencer.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tranche</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance (km)</th>
                  {SIZE_COLS.map(c => (
                    <th key={c.key} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{c.label}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiers.map(tier => (
                  <tr key={tier.id} className={`hover:bg-gray-50 ${!tier.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{tier.tier_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {tier.distance_km_min} – {tier.distance_km_max != null ? tier.distance_km_max : '∞'} km
                    </td>
                    {SIZE_COLS.map(c => (
                      <td key={c.key} className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fmt(tier[c.key as keyof PriceTier] as number)} <span className="text-xs font-normal text-gray-400">FCFA</span>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tier.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(tier)} className="p-1.5 text-[#FF6C00] hover:bg-orange-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tier.id)} disabled={deletingId === tier.id} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">
                          {deletingId === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal création / édition */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Modifier la tranche' : 'Nouvelle tranche'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la tranche *</label>
                <input value={form.tier_name} onChange={field('tier_name')} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  placeholder="Ex : Intra-ville (5–20 km)" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance min (km) *</label>
                  <input type="number" min="0" step="0.5" value={form.distance_km_min} onChange={field('distance_km_min')} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance max (km) — vide = illimité</label>
                  <input type="number" min="0" step="0.5"
                    value={form.distance_km_max ?? ''}
                    onChange={e => setForm(f => ({ ...f, distance_km_max: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    placeholder="∞" />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Prix par taille de colis (FCFA)</p>
                <div className="grid grid-cols-2 gap-3">
                  {SIZE_COLS.map(c => (
                    <div key={c.key}>
                      <label className="block text-xs text-gray-500 mb-1">{c.label}</label>
                      <input type="number" min="0" step="50"
                        value={form[c.key as keyof typeof form] as number}
                        onChange={field(c.key as keyof typeof form)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
                  <input type="number" min="0" value={form.display_order} onChange={field('display_order')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent" />
                </div>
                <div className="mt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={field('is_active')}
                      className="w-4 h-4 text-[#FF6C00] border-gray-300 rounded" />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#FF6C00] text-white rounded-lg text-sm font-medium hover:bg-[#e66100] disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
