import { useState, useEffect } from 'react';
import { Truck, Check, X, Clock, Eye, Search, Loader2, Mail, Phone, MapPin, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';

interface TransporterApplication {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  vehicle_type: string;
  license_plate?: string;
  preferred_zones: string[];
  commune: string;
  quartier?: string;
  address?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  notes?: string;
  approved_transporter_id?: string;
  created_at: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  velo: 'Vélo',
  voiture: 'Voiture',
  camionnette: 'Camionnette',
  pied: 'À pied',
};

const STATUS_CONFIG = {
  pending:  { label: 'En attente',   className: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approuvé',     className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté',       className: 'bg-red-100 text-red-700' },
  on_hold:  { label: 'En suspens',   className: 'bg-gray-100 text-gray-700' },
};

function TransporterApplicationsManagement() {
  const [applications, setApplications] = useState<TransporterApplication[]>([]);
  const [filtered, setFiltered] = useState<TransporterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TransporterApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let list = [...applications];
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.commune.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [applications, statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getTransporterApplications();
      if (error) throw new Error(error);
      setApplications(data || []);
    } catch (e: any) {
      toast.error('Erreur chargement candidatures: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: 'approved' | 'rejected' | 'on_hold') => {
    if (!selected) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Veuillez indiquer un motif de rejet');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await api.updateTransporterApplicationStatus(
        selected.id, status,
        status === 'rejected' ? rejectionReason : undefined,
        notes || undefined
      );
      if (error) throw new Error(error);
      toast.success(status === 'approved' ? 'Candidature approuvée — compte livreur créé' : 'Statut mis à jour');
      setSelected(null);
      setRejectionReason('');
      setNotes('');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-7 h-7 text-[#FF6C00]" />
            Candidatures livreurs
          </h2>
          <p className="text-sm text-gray-500 mt-1">{applications.length} dossier(s) au total</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-4">
        {([['pending','En attente','orange'],['approved','Approuvés','green'],['rejected','Rejetés','red']] as const).map(([s,l,c]) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`rounded-xl p-4 border-2 text-left transition-all ${statusFilter === s ? `border-${c}-400 bg-${c}-50` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className={`text-2xl font-bold text-${c}-600`}>{counts[s]}</div>
            <div className="text-sm text-gray-600 mt-1">{l}</div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, commune, téléphone..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
          <option value="on_hold">En suspens</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#FF6C00]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Aucune candidature trouvée</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Candidat','Véhicule','Commune','Statut','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(app => {
                  const sc = STATUS_CONFIG[app.status];
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{app.first_name} {app.last_name}</div>
                        <div className="text-xs text-gray-500">{app.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{VEHICLE_LABELS[app.vehicle_type] || app.vehicle_type}</td>
                      <td className="px-4 py-3 text-gray-700">{app.commune}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.className}`}>
                          {app.status === 'pending' && <Clock className="w-3 h-3" />}
                          {app.status === 'approved' && <Check className="w-3 h-3" />}
                          {app.status === 'rejected' && <X className="w-3 h-3" />}
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(app.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(app); setRejectionReason(''); setNotes(''); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#FF6C00] text-white rounded-lg hover:bg-[#e05e00]">
                          <Eye className="w-3.5 h-3.5" /> Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Dossier — {selected.first_name} {selected.last_name}</h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-700"><Phone className="w-4 h-4 text-gray-400" />{selected.phone}</div>
                <div className="flex items-center gap-2 text-gray-700"><Mail className="w-4 h-4 text-gray-400" />{selected.email}</div>
                <div className="flex items-center gap-2 text-gray-700"><Truck className="w-4 h-4 text-gray-400" />{VEHICLE_LABELS[selected.vehicle_type]}</div>
                <div className="flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4 text-gray-400" />{selected.commune}{selected.quartier ? ` — ${selected.quartier}` : ''}</div>
                {selected.license_plate && <div className="flex items-center gap-2 text-gray-700 col-span-2">Plaque : <span className="font-medium">{selected.license_plate}</span></div>}
                <div className="flex items-center gap-2 text-gray-700 col-span-2"><Calendar className="w-4 h-4 text-gray-400" />Candidature du {new Date(selected.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              {selected.preferred_zones.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Zones souhaitées</p>
                  <div className="flex flex-wrap gap-2">{selected.preferred_zones.map(z => <span key={z} className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">{z}</span>)}</div>
                </div>
              )}
              {selected.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Présentation</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{selected.description}</p>
                </div>
              )}
              {selected.status === 'rejected' && selected.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs font-medium text-red-700 uppercase mb-1">Motif de rejet</p>
                  <p className="text-sm text-red-800">{selected.rejection_reason}</p>
                </div>
              )}
              {selected.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                  Candidature approuvée — compte livreur créé
                </div>
              )}

              {/* Actions si pending/on_hold */}
              {(selected.status === 'pending' || selected.status === 'on_hold') && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Notes internes (optionnel)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      placeholder="Notes internes..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Motif de rejet (si rejet)</label>
                    <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                      placeholder="Expliquer le motif..." />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleAction('approved')} disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approuver
                    </button>
                    <button onClick={() => handleAction('on_hold')} disabled={actionLoading}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                      <Clock className="w-4 h-4" /> Suspendre
                    </button>
                    <button onClick={() => handleAction('rejected')} disabled={actionLoading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                      <X className="w-4 h-4" /> Rejeter
                    </button>
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

export default TransporterApplicationsManagement;
