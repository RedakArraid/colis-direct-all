import { useState, useEffect } from 'react';
import { Check, X, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';

interface WalletRow {
  id: string;
  transporter_id: string;
  balance_fcfa: string;
  total_earned_fcfa: string;
  total_withdrawn_fcfa: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  transporter_status: string;
  pending_withdrawals: string;
}

interface WithdrawalRow {
  id: string;
  transporter_id: string;
  amount_fcfa: string;
  orange_money_ref?: string;
  notes?: string;
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

function fmt(v: string | number) {
  return Number(v).toLocaleString('fr-FR');
}

function MarketplaceFinanceManagement() {
  const [tab, setTab] = useState<'wallets' | 'withdrawals'>('withdrawals');
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<WithdrawalRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveModal, setApproveModal] = useState<WithdrawalRow | null>(null);
  const [approveRef, setApproveRef] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wRes, dRes] = await Promise.all([
        api.getAdminWallets(),
        api.getAdminWithdrawals(),
      ]);
      if (wRes.data) setWallets(wRes.data);
      if (dRes.data) setWithdrawals(dRes.data);
    } catch (e: any) {
      toast.error('Erreur chargement finance: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setActionLoading(approveModal.id);
    try {
      const { error } = await api.approveWithdrawal(approveModal.id, approveRef || undefined);
      if (error) throw new Error(error);
      toast.success('Retrait validé');
      setApproveModal(null);
      setApproveRef('');
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      const { error } = await api.rejectWithdrawal(rejectModal.id, rejectReason || undefined);
      if (error) throw new Error(error);
      toast.success('Retrait rejeté — solde remboursé');
      setRejectModal(null);
      setRejectReason('');
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance_fcfa), 0);
  const totalEarned  = wallets.reduce((s, w) => s + Number(w.total_earned_fcfa), 0);
  const totalPending = withdrawals.reduce((s, w) => s + Number(w.amount_fcfa), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-[#FF6C00]" />
            Finance Marketplace
          </h2>
        </div>
        <button onClick={loadAll} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Soldes livreurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalBalance)} <span className="text-sm font-normal text-gray-500">FCFA</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Total gagné (all time)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalEarned)} <span className="text-sm font-normal text-gray-500">FCFA</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Retraits en attente</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{fmt(totalPending)} <span className="text-sm font-normal text-gray-500">FCFA</span>
            {withdrawals.length > 0 && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{withdrawals.length}</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([['withdrawals','Retraits en attente'],['wallets','Portefeuilles livreurs']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#FF6C00] text-[#FF6C00]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
            {t === 'withdrawals' && withdrawals.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{withdrawals.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#FF6C00]" /></div>
      ) : tab === 'withdrawals' ? (
        withdrawals.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Aucun retrait en attente</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Livreur','Téléphone','Montant','Orange Money','Date','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{w.first_name} {w.last_name}</div>
                        <div className="text-xs text-gray-500">{w.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{w.phone}</td>
                      <td className="px-4 py-3 font-semibold text-orange-600">{fmt(w.amount_fcfa)} FCFA</td>
                      <td className="px-4 py-3 text-gray-700">{w.orange_money_ref || <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(w.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setApproveModal(w); setApproveRef(''); }}
                            disabled={actionLoading === w.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" /> Valider
                          </button>
                          <button onClick={() => { setRejectModal(w); setRejectReason(''); }}
                            disabled={actionLoading === w.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                            <X className="w-3.5 h-3.5" /> Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        wallets.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Aucun livreur avec portefeuille</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Livreur','Véhicule','Solde','Total gagné','Total retiré','Retraits en attente'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {wallets.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{w.first_name} {w.last_name}</div>
                        <div className="text-xs text-gray-500">{w.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 capitalize">{w.vehicle_type}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmt(w.balance_fcfa)} FCFA</td>
                      <td className="px-4 py-3 text-green-700">{fmt(w.total_earned_fcfa)} FCFA</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(w.total_withdrawn_fcfa)} FCFA</td>
                      <td className="px-4 py-3">
                        {Number(w.pending_withdrawals) > 0
                          ? <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{w.pending_withdrawals} en attente</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal approbation retrait */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Valider le retrait</h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{approveModal.first_name} {approveModal.last_name}</span> — {fmt(approveModal.amount_fcfa)} FCFA via Orange Money ({approveModal.orange_money_ref})
            </p>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Référence transaction Orange Money (optionnel)</label>
              <input value={approveRef} onChange={e => setApproveRef(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: OM20260528XXXXX" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmer le virement
              </button>
              <button onClick={() => setApproveModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejet retrait */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Rejeter le retrait</h3>
            <p className="text-sm text-gray-600">
              Le solde de <span className="font-medium">{fmt(rejectModal.amount_fcfa)} FCFA</span> sera remboursé au livreur.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Motif (optionnel)</label>
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Raison du rejet..." />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Rejeter et rembourser
              </button>
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketplaceFinanceManagement;
