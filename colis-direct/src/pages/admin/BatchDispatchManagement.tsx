import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { RefreshCw, Layers, CheckCircle, Clock, XCircle, AlertTriangle, Settings } from 'lucide-react';

interface BatchStats {
  pending: number;
  dispatched: number;
  accepted: number;
  in_progress: number;
  completed: number;
  expired: number;
  cancelled: number;
  total: number;
  total_shipments_batched: number;
  total_earnings_paid: number;
}

interface BatchConfig {
  enabled: boolean;
  minBatchSize: number;
  maxWaitHours: number;
  cronIntervalMinutes: number;
  offerDurationMinutes: number;
}

interface DeliveryBatch {
  id: string;
  status: string;
  batch_type: string;
  shipment_count: number;
  origin_relay_name: string;
  origin_relay_commune: string;
  destination_zone_name: string | null;
  destination_commune: string | null;
  total_weight_kg: number | null;
  net_earnings_fcfa: number | null;
  required_vehicle_types: string[];
  transporter_first_name: string | null;
  transporter_last_name: string | null;
  offered_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  dispatched: { label: 'Proposé', color: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-800' },
  in_progress: { label: 'En cours', color: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Terminé', color: 'bg-gray-100 text-gray-700' },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-500' },
};

export default function BatchDispatchManagement() {
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [config, setConfig] = useState<BatchConfig>({
    enabled: true,
    minBatchSize: 3,
    maxWaitHours: 2,
    cronIntervalMinutes: 30,
    offerDurationMinutes: 5,
  });
  const [configDraft, setConfigDraft] = useState<BatchConfig>({ ...config });
  const [configSaving, setConfigSaving] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStats = async () => {
    const { data } = await api.getAdminBatchStats();
    if (data) setStats(data as BatchStats);
  };

  const loadBatches = async () => {
    setLoading(true);
    const { data } = await api.getAdminBatches({
      status: statusFilter || undefined,
      limit,
      offset,
    });
    if (data) {
      setBatches((data as any).batches || []);
      setTotal((data as any).total || 0);
    }
    setLoading(false);
  };

  const loadConfig = async () => {
    setConfigLoading(true);
    const { data } = await api.getAdminBatches({ limit: 1 });
    // Load config from admin settings
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        const settings = await res.json();
        if (settings.batchDispatch) {
          setConfig(settings.batchDispatch);
          setConfigDraft(settings.batchDispatch);
        }
      }
    } catch { /* non critique */ }
    setConfigLoading(false);
  };

  useEffect(() => {
    loadStats();
    loadConfig();
  }, []);

  useEffect(() => {
    loadBatches();
  }, [statusFilter, offset]);

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ batchDispatch: configDraft }),
      });
      if (res.ok) {
        setConfig({ ...configDraft });
        setConfigFeedback({ type: 'success', message: 'Configuration sauvegardée' });
      } else {
        setConfigFeedback({ type: 'error', message: 'Erreur lors de la sauvegarde' });
      }
    } catch {
      setConfigFeedback({ type: 'error', message: 'Erreur réseau' });
    }
    setConfigSaving(false);
    setTimeout(() => setConfigFeedback(null), 3000);
  };

  const refresh = () => {
    loadStats();
    loadBatches();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Dispatch par lots
          </h1>
          <p className="text-sm text-gray-600">Groupement automatique des colis par zone pour les livreurs</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700 uppercase">En attente</span>
            </div>
            <div className="text-2xl font-bold text-yellow-800">{Number(stats.pending).toLocaleString()}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase">Acceptés</span>
            </div>
            <div className="text-2xl font-bold text-green-800">{Number(stats.accepted).toLocaleString()}</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-700 uppercase">Expirés</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{Number(stats.expired).toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Terminés</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{Number(stats.completed).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Configuration du dispatch par lots</h2>
          {configLoading && <span className="text-xs text-gray-400">Chargement…</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Activé</span>
            <select
              value={configDraft.enabled ? 'true' : 'false'}
              onChange={(e) => setConfigDraft((d) => ({ ...d, enabled: e.target.value === 'true' }))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Taille minimale du lot</span>
            <input
              type="number"
              min={1}
              value={configDraft.minBatchSize}
              onChange={(e) => setConfigDraft((d) => ({ ...d, minBatchSize: parseInt(e.target.value) || 1 }))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Attente max avant lot forcé (heures)</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={configDraft.maxWaitHours}
              onChange={(e) => setConfigDraft((d) => ({ ...d, maxWaitHours: parseFloat(e.target.value) || 1 }))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Intervalle cron (minutes)</span>
            <input
              type="number"
              min={5}
              value={configDraft.cronIntervalMinutes}
              onChange={(e) => setConfigDraft((d) => ({ ...d, cronIntervalMinutes: parseInt(e.target.value) || 30 }))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Durée de l'offre (minutes)</span>
            <input
              type="number"
              min={1}
              value={configDraft.offerDurationMinutes}
              onChange={(e) => setConfigDraft((d) => ({ ...d, offerDurationMinutes: parseInt(e.target.value) || 5 }))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>
        </div>

        {configFeedback && (
          <div className={`mb-3 p-3 rounded-lg text-sm font-medium ${
            configFeedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {configFeedback.message}
          </div>
        )}

        <button
          onClick={saveConfig}
          disabled={configSaving}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {configSaving ? 'Sauvegarde…' : 'Sauvegarder la configuration'}
        </button>
      </div>

      {/* Table des lots */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-900">Lots récents ({total.toLocaleString()})</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">Chargement…</div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-sm">Aucun lot trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Origine → Destination</th>
                  <th className="px-4 py-3 text-left">Colis</th>
                  <th className="px-4 py-3 text-left">Véhicule requis</th>
                  <th className="px-4 py-3 text-left">Gains nets</th>
                  <th className="px-4 py-3 text-left">Livreur</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((batch) => {
                  const s = STATUS_LABELS[batch.status] || { label: batch.status, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{batch.origin_relay_name}</div>
                        <div className="text-xs text-gray-500">
                          → {batch.destination_zone_name || batch.destination_commune || '?'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{batch.shipment_count}</span>
                        {batch.total_weight_kg && (
                          <span className="text-xs text-gray-400 ml-1">({batch.total_weight_kg} kg)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(batch.required_vehicle_types || []).map((vt) => (
                            <span key={vt} className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">{vt}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">
                        {batch.net_earnings_fcfa ? Number(batch.net_earnings_fcfa).toLocaleString() + ' FCFA' : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {batch.transporter_first_name
                          ? `${batch.transporter_first_name} ${batch.transporter_last_name}`
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(batch.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{offset + 1}–{Math.min(offset + limit, total)} sur {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
