import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Tag, Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'free' | 'fixed' | 'percentage';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  code: string;
  description: string;
  discount_type: 'free' | 'fixed' | 'percentage';
  discount_value: string;
  max_uses: string;
  expires_at: string;
}

const emptyForm = (): FormState => ({
  code: '',
  description: '',
  discount_type: 'free',
  discount_value: '0',
  max_uses: '',
  expires_at: '',
});

function PromoCodesManagement() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoCodeEnabled, setPromoCodeEnabled] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [codesRes, settingsRes] = await Promise.all([
      api.listPromoCodes(),
      api.getAdminSettings(),
    ]);
    if (codesRes.data) setCodes(codesRes.data as PromoCode[]);
    if (settingsRes.data) {
      const promoFeature = (settingsRes.data as any).promoFeature as { enabled?: boolean } | undefined;
      setPromoCodeEnabled(promoFeature?.enabled !== false);
    }
    setLoading(false);
  }

  async function handleGlobalToggle() {
    setSavingToggle(true);
    const newValue = !promoCodeEnabled;
    const { error } = await api.saveAdminSettings({ promoFeature: { enabled: newValue } });
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      setPromoCodeEnabled(newValue);
      toast.success(newValue ? 'Zone code promo activée' : 'Zone code promo masquée');
    }
    setSavingToggle(false);
  }

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(code: PromoCode) {
    setEditTarget(code);
    setForm({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: String(code.discount_value),
      max_uses: code.max_uses !== null ? String(code.max_uses) : '',
      expires_at: code.expires_at ? code.expires_at.slice(0, 10) : '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim()) { toast.error('Le code est requis'); return; }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };

    const { error } = editTarget
      ? await api.updatePromoCode(editTarget.id, payload)
      : await api.createPromoCode(payload);

    if (error) {
      toast.error(error);
    } else {
      toast.success(editTarget ? 'Code promo modifié' : 'Code promo créé');
      setModalOpen(false);
      load();
    }
    setSaving(false);
  }

  async function handleToggle(code: PromoCode) {
    const { error } = await api.togglePromoCode(code.id);
    if (error) { toast.error(error); return; }
    setCodes(prev => prev.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await api.deletePromoCode(deleteTarget.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Code promo supprimé');
      setDeleteTarget(null);
      setCodes(prev => prev.filter(c => c.id !== deleteTarget.id));
    }
    setDeleting(false);
  }

  function discountLabel(code: PromoCode) {
    if (code.discount_type === 'free') return 'Envoi gratuit';
    if (code.discount_type === 'percentage') return `-${code.discount_value}%`;
    return `-${code.discount_value} FCFA`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Codes promo</h1>
          <p className="text-sm text-gray-600">Gérez les codes de réduction et la visibilité du champ promo</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau code
        </button>
      </div>

      {/* Global feature toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-50 rounded-lg mt-0.5">
            <Tag className="w-5 h-5 text-[#FF6C00]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Afficher le champ code promo</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {promoCodeEnabled
                ? 'Les clients voient l\'option "J\'ai un code promo" lors du paiement'
                : 'Le champ code promo est masqué pour tous les clients'}
            </p>
          </div>
        </div>
        <button
          onClick={handleGlobalToggle}
          disabled={savingToggle}
          className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {savingToggle ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : promoCodeEnabled ? (
            <ToggleRight className="w-10 h-10 text-[#FF6C00]" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-gray-400" />
          )}
          <span className={promoCodeEnabled ? 'text-[#FF6C00]' : 'text-gray-500'}>
            {promoCodeEnabled ? 'Activé' : 'Désactivé'}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6C00]" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Aucun code promo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Réduction</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Utilisations</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Expiration</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {codes.map(code => (
                  <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{code.code}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell max-w-[200px] truncate">{code.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        {discountLabel(code)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {code.uses_count}{code.max_uses !== null ? ` / ${code.max_uses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(code)}
                        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                      >
                        {code.is_active ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                            <span className="text-green-700">Actif</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                            <span className="text-gray-500">Inactif</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(code)}
                          className="p-1.5 text-gray-500 hover:text-[#FF6C00] hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(code)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editTarget ? 'Modifier le code promo' : 'Nouveau code promo'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: BIENVENUE2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Code de bienvenue nouveaux clients"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de réduction *</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as FormState['discount_type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  >
                    <option value="free">Envoi gratuit</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                    <option value="percentage">Pourcentage (%)</option>
                  </select>
                </div>

                {form.discount_type !== 'free' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {form.discount_type === 'percentage' ? 'Réduction (%)' : 'Montant (FCFA)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utilisations max</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Illimité"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#FF6C00] text-white font-semibold rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editTarget ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Supprimer ce code promo ?</h2>
            </div>
            <p className="text-sm text-gray-600">
              Le code <span className="font-mono font-bold">{deleteTarget.code}</span> sera définitivement supprimé.
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PromoCodesManagement;
