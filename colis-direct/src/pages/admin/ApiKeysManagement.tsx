import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Activity,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { toast } from 'react-toastify';

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiKeyScope =
  | 'tracking:read'
  | 'shipments:read'
  | 'shipments:create'
  | 'pricing:read'
  | 'relay_points:read'
  | 'webhooks:manage';

interface ApiKey {
  id: string;
  prefix: string;
  partner_name: string;
  partner_email?: string;
  description?: string;
  scopes: ApiKeyScope[];
  rate_limit_per_min: number;
  status: 'active' | 'revoked';
  last_used_at?: string | null;
  created_at: string;
}

interface ApiKeyStats {
  active_keys: number;
  requests_today: number;
  requests_this_week: number;
  keys_created_this_month: number;
}

interface UsageLog {
  id: string;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  created_at: string;
}

interface CreateApiKeyFormData {
  partner_name: string;
  partner_email: string;
  description: string;
  scopes: ApiKeyScope[];
  rate_limit_per_min: number;
}

interface EditApiKeyFormData {
  scopes: ApiKeyScope[];
  rate_limit_per_min: number;
  status: 'active' | 'revoked';
}

// ─── Scope definitions ────────────────────────────────────────────────────────

const SCOPE_OPTIONS: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: 'tracking:read', label: 'tracking:read', description: 'Suivi de colis' },
  { value: 'shipments:read', label: 'shipments:read', description: 'Lecture des envois' },
  { value: 'shipments:create', label: 'shipments:create', description: "Création d'envois" },
  { value: 'pricing:read', label: 'pricing:read', description: 'Consultation des tarifs' },
  { value: 'relay_points:read', label: 'relay_points:read', description: 'Liste des points relais' },
  { value: 'webhooks:manage', label: 'webhooks:manage', description: 'Gestion des webhooks' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: 'active' | 'revoked'): string {
  return status === 'active'
    ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700'
    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700';
}

function httpMethodBadge(method: string): string {
  const map: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  };
  return `inline-flex px-2 py-0.5 rounded text-xs font-bold ${map[method.toUpperCase()] ?? 'bg-gray-100 text-gray-700'}`;
}

function httpStatusClass(code: number): string {
  if (code >= 500) return 'text-red-600 font-semibold';
  if (code >= 400) return 'text-orange-500 font-semibold';
  if (code >= 300) return 'text-blue-500';
  return 'text-green-600';
}

// ─── Stats cards ──────────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'orange' | 'blue' | 'green' | 'purple';
}

const COLOR_MAP = {
  orange: { bg: 'bg-orange-50', icon: 'text-[#FF6C00]', border: 'border-orange-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
};

function MiniStatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`bg-white rounded-xl border ${c.border} shadow-sm p-5 flex items-center gap-4`}>
      <div className={`${c.bg} rounded-lg p-3`}>
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApiKeysManagement() {
  // List state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [errorKeys, setErrorKeys] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<ApiKeyStats | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateApiKeyFormData>({
    partner_name: '',
    partner_email: '',
    description: '',
    scopes: [],
    rate_limit_per_min: 60,
  });
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateApiKeyFormData, string>>>({});

  // Token reveal modal (after creation)
  const [newTokenModal, setNewTokenModal] = useState<{ open: boolean; token: string }>({
    open: false,
    token: '',
  });
  const [tokenCopied, setTokenCopied] = useState(false);

  // Edit modal
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [editForm, setEditForm] = useState<EditApiKeyFormData>({
    scopes: [],
    rate_limit_per_min: 60,
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  // Revoke confirm
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Usage logs
  const [logsKey, setLogsKey] = useState<ApiKey | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadApiKeys = useCallback(async () => {
    setLoadingKeys(true);
    setErrorKeys(null);
    try {
      const { data, error } = await api.getApiKeys();
      if (error) {
        setErrorKeys(error);
      } else {
        setApiKeys(Array.isArray(data) ? (data as ApiKey[]) : []);
      }
    } catch {
      setErrorKeys('Impossible de charger les clés API.');
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.getApiKeysStats();
      if (data) setStats(data as ApiKeyStats);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
    loadStats();
  }, [loadApiKeys, loadStats]);

  // ── Create ──────────────────────────────────────────────────────────────────

  function resetCreateForm() {
    setCreateForm({
      partner_name: '',
      partner_email: '',
      description: '',
      scopes: [],
      rate_limit_per_min: 60,
    });
    setCreateErrors({});
  }

  function validateCreateForm(): boolean {
    const errs: Partial<Record<keyof CreateApiKeyFormData, string>> = {};
    if (!createForm.partner_name.trim()) errs.partner_name = 'Le nom du partenaire est requis.';
    if (createForm.scopes.length === 0) errs.scopes = 'Sélectionnez au moins un scope.';
    if (createForm.rate_limit_per_min < 1) errs.rate_limit_per_min = 'La limite doit être ≥ 1.';
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validateCreateForm()) return;
    setCreating(true);
    try {
      const { data, error } = await api.createApiKey({
        partner_name: createForm.partner_name.trim(),
        partner_email: createForm.partner_email.trim() || undefined,
        description: createForm.description.trim() || undefined,
        scopes: createForm.scopes,
        rate_limit_per_min: createForm.rate_limit_per_min,
      });
      if (error) {
        toast.error(error);
        return;
      }
      const responseData = data as { key?: ApiKey; token?: string; full_key?: string } | null;
      const plainToken: string =
        responseData?.token ?? responseData?.full_key ?? '';
      setShowCreateModal(false);
      resetCreateForm();
      setNewTokenModal({ open: true, token: plainToken });
      toast.success('Clé API créée avec succès.');
      await loadApiKeys();
      await loadStats();
    } catch {
      toast.error('Erreur lors de la création de la clé API.');
    } finally {
      setCreating(false);
    }
  }

  function toggleScope(scope: ApiKeyScope, form: CreateApiKeyFormData, setter: (v: CreateApiKeyFormData) => void) {
    setter({
      ...form,
      scopes: form.scopes.includes(scope)
        ? form.scopes.filter((s) => s !== scope)
        : [...form.scopes, scope],
    });
  }

  function toggleEditScope(scope: ApiKeyScope) {
    setEditForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  }

  // ── Copy token ──────────────────────────────────────────────────────────────

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier dans le presse-papier.');
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function openEdit(key: ApiKey) {
    setEditingKey(key);
    setEditForm({
      scopes: [...key.scopes],
      rate_limit_per_min: key.rate_limit_per_min,
      status: key.status,
    });
  }

  async function handleSaveEdit() {
    if (!editingKey) return;
    setSaving(true);
    try {
      const { error } = await api.updateApiKey(editingKey.id, {
        scopes: editForm.scopes,
        rate_limit_per_min: editForm.rate_limit_per_min,
        status: editForm.status,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Clé API mise à jour.');
      setEditingKey(null);
      await loadApiKeys();
      await loadStats();
    } catch {
      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  // ── Revoke ──────────────────────────────────────────────────────────────────

  async function handleRevoke() {
    if (!revokingKey) return;
    setRevoking(true);
    try {
      const { error } = await api.deleteApiKey(revokingKey.id);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Clé "${revokingKey.prefix}…" révoquée.`);
      setRevokingKey(null);
      await loadApiKeys();
      await loadStats();
    } catch {
      toast.error('Erreur lors de la révocation.');
    } finally {
      setRevoking(false);
    }
  }

  // ── Usage logs ──────────────────────────────────────────────────────────────

  async function openLogs(key: ApiKey) {
    setLogsKey(key);
    setUsageLogs([]);
    setErrorLogs(null);
    setLoadingLogs(true);
    try {
      const { data, error } = await api.getApiKeyUsage(key.id);
      if (error) {
        setErrorLogs(error);
      } else {
        setUsageLogs(Array.isArray(data) ? (data as UsageLog[]) : []);
      }
    } catch {
      setErrorLogs('Impossible de charger les logs.');
    } finally {
      setLoadingLogs(false);
    }
  }

  // ── Table columns ───────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'prefix',
      label: 'Préfixe',
      render: (key: ApiKey) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
          {key.prefix}…
        </span>
      ),
    },
    {
      key: 'partner_name',
      label: 'Partenaire',
      render: (key: ApiKey) => (
        <div>
          <p className="font-medium text-gray-900">{key.partner_name}</p>
          {key.partner_email && (
            <p className="text-xs text-gray-500">{key.partner_email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'scopes',
      label: 'Scopes',
      render: (key: ApiKey) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {key.scopes.map((s) => (
            <span
              key={s}
              className="inline-block px-1.5 py-0.5 rounded bg-orange-50 text-[#FF6C00] text-[10px] font-mono font-semibold"
            >
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'rate_limit_per_min',
      label: 'Limite/min',
      render: (key: ApiKey) => (
        <span className="text-sm text-gray-700">{key.rate_limit_per_min}</span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (key: ApiKey) => (
        <span className={statusBadgeClass(key.status)}>
          {key.status === 'active' ? 'Actif' : 'Révoqué'}
        </span>
      ),
    },
    {
      key: 'last_used_at',
      label: 'Dernière utilisation',
      render: (key: ApiKey) => (
        <span className="text-xs text-gray-500">{formatDate(key.last_used_at)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date création',
      render: (key: ApiKey) => (
        <span className="text-xs text-gray-500">{formatDate(key.created_at)}</span>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">API & Intégrations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les clés API pour les partenaires et intégrations tierces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { loadApiKeys(); loadStats(); }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white text-sm font-semibold rounded-lg hover:bg-[#e06000] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle clé API
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatsCard
          title="Clés actives"
          value={stats?.active_keys ?? 0}
          icon={Key}
          color="orange"
        />
        <MiniStatsCard
          title="Requêtes aujourd'hui"
          value={stats?.requests_today ?? 0}
          icon={Activity}
          color="blue"
        />
        <MiniStatsCard
          title="Requêtes cette semaine"
          value={stats?.requests_this_week ?? 0}
          icon={Activity}
          color="green"
        />
        <MiniStatsCard
          title="Clés créées ce mois"
          value={stats?.keys_created_this_month ?? 0}
          icon={Plus}
          color="purple"
        />
      </div>

      {/* Error banner */}
      {errorKeys && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {errorKeys}
        </div>
      )}

      {/* Table */}
      <DataTable<ApiKey>
        data={apiKeys}
        columns={columns}
        loading={loadingKeys}
        actions={(key) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openLogs(key)}
              title="Voir les logs"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logs</span>
            </button>
            <button
              type="button"
              onClick={() => openEdit(key)}
              title="Modifier"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modifier</span>
            </button>
            {key.status === 'active' && (
              <button
                type="button"
                onClick={() => setRevokingKey(key)}
                title="Révoquer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Révoquer</span>
              </button>
            )}
          </div>
        )}
      />

      {/* ── Modal : Créer une clé API ─────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); }}
        title="Nouvelle clé API partenaire"
        size="lg"
      >
        <div className="space-y-5">
          {/* Partner name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du partenaire <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createForm.partner_name}
              onChange={(e) => setCreateForm({ ...createForm, partner_name: e.target.value })}
              placeholder="Ex: MonEntreprise SAS"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
            {createErrors.partner_name && (
              <p className="mt-1 text-xs text-red-600">{createErrors.partner_name}</p>
            )}
          </div>

          {/* Partner email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email du partenaire
            </label>
            <input
              type="email"
              value={createForm.partner_email}
              onChange={(e) => setCreateForm({ ...createForm, partner_email: e.target.value })}
              placeholder="contact@partenaire.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Usage prévu de cette clé..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent resize-none"
            />
          </div>

          {/* Scopes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scopes (permissions) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={createForm.scopes.includes(opt.value)}
                    onChange={() => toggleScope(opt.value, createForm, setCreateForm)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#FF6C00] focus:ring-[#FF6C00]"
                  />
                  <div>
                    <p className="text-xs font-mono font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {createErrors.scopes && (
              <p className="mt-1 text-xs text-red-600">{createErrors.scopes}</p>
            )}
          </div>

          {/* Rate limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de requêtes par minute
            </label>
            <input
              type="number"
              min={1}
              value={createForm.rate_limit_per_min}
              onChange={(e) =>
                setCreateForm({ ...createForm, rate_limit_per_min: parseInt(e.target.value) || 60 })
              }
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
            {createErrors.rate_limit_per_min && (
              <p className="mt-1 text-xs text-red-600">{createErrors.rate_limit_per_min}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#FF6C00] text-white text-sm font-semibold rounded-lg hover:bg-[#e06000] disabled:opacity-60 transition-colors"
            >
              {creating ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              Générer la clé
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal : Affichage du token (après création) ───────────────────── */}
      {newTokenModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-gray-900/75" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clé API générée</h3>
                <p className="text-sm text-gray-500 mt-0.5">Copiez-la maintenant — elle ne sera plus jamais affichée.</p>
              </div>
              <button
                onClick={() => { setNewTokenModal({ open: false, token: '' }); setTokenCopied(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alert */}
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">
                Cette clé ne sera plus jamais affichée. Notez-la maintenant.
              </p>
            </div>

            {/* Token */}
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <p className="font-mono text-sm sm:text-base text-green-400 break-all select-all">
                {newTokenModal.token || '(token non disponible)'}
              </p>
            </div>

            {/* Copy button */}
            <button
              type="button"
              onClick={() => copyToken(newTokenModal.token)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              {tokenCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" /> Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copier la clé
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setNewTokenModal({ open: false, token: '' }); setTokenCopied(false); }}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              J'ai bien noté ma clé, fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Modal : Modifier une clé ──────────────────────────────────────── */}
      <Modal
        isOpen={!!editingKey}
        onClose={() => setEditingKey(null)}
        title={`Modifier : ${editingKey?.prefix ?? ''}…`}
        size="md"
      >
        {editingKey && (
          <div className="space-y-5">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'revoked' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              >
                <option value="active">Actif</option>
                <option value="revoked">Révoqué</option>
              </select>
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.scopes.includes(opt.value)}
                      onChange={() => toggleEditScope(opt.value)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#FF6C00] focus:ring-[#FF6C00]"
                    />
                    <div>
                      <p className="text-xs font-mono font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rate limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limite de requêtes par minute
              </label>
              <input
                type="number"
                min={1}
                value={editForm.rate_limit_per_min}
                onChange={(e) =>
                  setEditForm({ ...editForm, rate_limit_per_min: parseInt(e.target.value) || 60 })
                }
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#FF6C00] text-white text-sm font-semibold rounded-lg hover:bg-[#e06000] disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal : Confirmer révocation ──────────────────────────────────── */}
      <Modal
        isOpen={!!revokingKey}
        onClose={() => setRevokingKey(null)}
        title="Révoquer la clé API"
        size="sm"
      >
        {revokingKey && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold">Cette action est irréversible.</p>
                <p className="mt-1">
                  La clé <span className="font-mono font-bold">{revokingKey.prefix}…</span> de{' '}
                  <strong>{revokingKey.partner_name}</strong> sera révoquée immédiatement. Toutes les requêtes utilisant cette clé échoueront.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokingKey(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {revoking ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Révoquer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Panel : Logs d'usage ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!logsKey}
        onClose={() => { setLogsKey(null); setUsageLogs([]); setErrorLogs(null); }}
        title={`Logs d'usage — ${logsKey?.prefix ?? ''}… (${logsKey?.partner_name ?? ''})`}
        size="xl"
      >
        {logsKey && (
          <div className="space-y-4">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <span className="inline-block w-8 h-8 border-2 border-[#FF6C00] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : errorLogs ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {errorLogs}
              </div>
            ) : usageLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Aucun appel enregistré pour cette clé.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Méthode', 'Chemin', 'Statut', 'Temps (ms)', 'IP', 'Date'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {usageLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={httpMethodBadge(log.method)}>{log.method.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-[240px] truncate">
                          {log.path}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${httpStatusClass(log.status_code)}`}>
                          {log.status_code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {log.response_time_ms} ms
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">
                          {log.ip_address}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
