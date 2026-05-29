import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Filter, Key } from 'lucide-react';
import { api } from '../../lib/api';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import PhoneInput from '../../components/PhoneInput';

const debugLog = (..._args: unknown[]) => {};

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'client',
    is_pro: false,
    relay_point_id: '',
  });
  const [relayPoints, setRelayPoints] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; userId: string | null; userEmail: string }>({ open: false, userId: null, userEmail: '' });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, searchQuery ? 300 : 0); // Debounce search
    
    return () => clearTimeout(timer);
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    loadRelayPoints();
  }, []);

  const loadRelayPoints = async () => {
    try {
      const { data, error } = await api.getRelayPoints({ is_active: true });
      if (!error && data) {
        debugLog('loaded relay points', Array.isArray(data) ? data.length : 0);
        setRelayPoints(Array.isArray(data) ? data : []);
      } else {
        console.error('Error loading relay points:', error);
      }
    } catch (error) {
      console.error('Error loading relay points:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.getUsers({
        role: roleFilter || undefined,
        search: searchQuery || undefined,
      });
      if (data) setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '', // Don't show password when editing
      role: user.role || 'client',
      is_pro: user.is_pro || false,
      relay_point_id: user.relay_point_id || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setErrors({});
    
    // Validation
    if (!formData.email) {
      setErrors({ email: 'L\'email est requis' });
      return;
    }
    
    if (!editingUser && !formData.password) {
      setErrors({ password: 'Le mot de passe est requis pour créer un utilisateur' });
      return;
    }

    if (!editingUser && formData.password.length < 6) {
      setErrors({ password: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    if (formData.role === 'relay_partner' && !formData.relay_point_id) {
      setErrors({ relay_point_id: 'Un point relais doit être assigné à un utilisateur point relais' });
      return;
    }

    try {
      if (editingUser) {
        // Update: exclude password if empty, exclude email (cannot be changed)
        // Set relay_point_id to null if not relay_partner
        const { password: _pw, email: _em, relay_point_id: _rpid, ...updateData } = formData;
        const payload = {
          ...updateData,
          relay_point_id: (formData.role !== 'relay_partner' ? null : (formData.relay_point_id || null)) as string | null,
        };
        const { error } = await api.updateUser(editingUser.id, payload);
        if (error) {
          setErrors({ general: error });
          return;
        }
      } else {
        // Create: include password and email
        // Set relay_point_id to null if not relay_partner
        const createPayload = {
          ...formData,
          relay_point_id: formData.role !== 'relay_partner' ? null : (formData.relay_point_id || null),
        };
        const { error } = await api.createUser(createPayload);
        if (error) {
          setErrors({ general: error });
          return;
        }
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'client',
        is_pro: false,
        relay_point_id: '',
      });
      setErrors({});
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      const errorMessage = error?.error || error?.message || 'Erreur lors de la sauvegarde';
      setErrors({ general: errorMessage });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
      const { error } = await api.deleteUser(id);
      if (error) {
        alert(`Erreur lors de la suppression: ${error}`);
        return;
      }
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Erreur lors de la suppression: ${error?.error || error?.message || 'Erreur inconnue'}`);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal.userId || !newPassword || newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const { error } = await api.resetUserPassword(resetPasswordModal.userId, newPassword);
      if (error) {
        alert(`Erreur lors de la réinitialisation: ${error}`);
        return;
      }
      alert(`Mot de passe réinitialisé avec succès pour ${resetPasswordModal.userEmail}`);
      setResetPasswordModal({ open: false, userId: null, userEmail: '' });
      setNewPassword('');
      loadUsers();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(`Erreur lors de la réinitialisation: ${error?.error || error?.message || 'Erreur inconnue'}`);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      relay_partner: 'bg-blue-100 text-blue-800',
      transporter: 'bg-green-100 text-green-800',
      pro: 'bg-purple-100 text-purple-800',
      client: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || colors.client}`}>
        {role}
      </span>
    );
  };

  const getRelayPointName = (relayPointId: string | null) => {
    if (!relayPointId) return <span className="text-red-600 text-xs">Non assigné</span>;
    const rp = relayPoints.find(p => p.id === relayPointId);
    return rp ? <span className="text-sm">{rp.name}</span> : <span className="text-gray-500 text-xs">{relayPointId.substring(0, 8)}...</span>;
  };

  const columns = [
    { key: 'email', label: 'Email' },
    {
      key: 'name',
      label: 'Nom',
      render: (user: any) => `${user.first_name} ${user.last_name}`.trim() || 'N/A',
    },
    { key: 'phone', label: 'Téléphone' },
    {
      key: 'role',
      label: 'Rôle',
      render: (user: any) => getRoleBadge(user.role),
    },
    {
      key: 'relay_point',
      label: 'Point relais',
      render: (user: any) => user.role === 'relay_partner' ? getRelayPointName(user.relay_point_id) : <span className="text-gray-400 text-xs">-</span>,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (user: any) => new Date(user.created_at).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF6C00]" />
            Gestion des utilisateurs
          </h2>
          <p className="text-sm text-gray-600 mt-1 sm:mt-2">Gérez tous les utilisateurs de la plateforme</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              password: '',
              role: 'client',
              is_pro: false,
              relay_point_id: '',
            });
            setErrors({});
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Nouvel utilisateur
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent appearance-none bg-white"
          >
            <option value="">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="client">Client</option>
            <option value="relay_partner">Point relais</option>
            <option value="transporter">Transporteur</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        actions={(user) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleEdit(user)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setResetPasswordModal({ open: true, userId: user.id, userEmail: user.email })}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Réinitialiser le mot de passe"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(user.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
          setErrors({});
        }}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {errors.general}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              required
              disabled={!!editingUser}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setErrors({ ...errors, password: '' });
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                required={!editingUser}
                minLength={6}
                placeholder="Minimum 6 caractères"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <PhoneInput value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, relay_point_id: e.target.value !== 'relay_partner' ? '' : formData.relay_point_id })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="client">Client</option>
              <option value="admin">Admin</option>
              <option value="relay_partner">Point relais</option>
              <option value="transporter">Transporteur</option>
              <option value="pro">Pro</option>
              <option value="support">Support</option>
            </select>
          </div>

          {formData.role === 'relay_partner' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Point relais associé *
                {relayPoints.length === 0 && (
                  <span className="ml-2 text-xs text-amber-600">(Chargement...)</span>
                )}
              </label>
              {relayPoints.length === 0 ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Aucun point relais disponible
                </div>
              ) : (
                <select
                  value={formData.relay_point_id || ''}
                  onChange={(e) => setFormData({ ...formData, relay_point_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                  required={formData.role === 'relay_partner'}
                >
                  <option value="">-- Sélectionner un point relais --</option>
                  {relayPoints.map((rp) => (
                    <option key={rp.id} value={rp.id}>
                      {rp.name} - {rp.commune} {rp.quartier ? `(${rp.quartier})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.relay_point_id && (
                <p className="mt-1 text-xs text-red-600">{errors.relay_point_id}</p>
              )}
              {!formData.relay_point_id && formData.role === 'relay_partner' && !errors.relay_point_id && relayPoints.length > 0 && (
                <p className="mt-1 text-xs text-amber-600">Un point relais doit être assigné à un utilisateur point relais</p>
              )}
              {relayPoints.length === 0 && (
                <p className="mt-1 text-xs text-red-600">Aucun point relais actif trouvé. Veuillez créer des points relais d'abord.</p>
              )}
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_pro"
              checked={formData.is_pro}
              onChange={(e) => setFormData({ ...formData, is_pro: e.target.checked })}
              className="w-4 h-4 text-[#FF6C00] focus:ring-[#FF6C00] rounded"
            />
            <label htmlFor="is_pro" className="ml-2 text-sm text-gray-700">
              Compte professionnel
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
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
            >
              {editingUser ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPasswordModal.open}
        onClose={() => {
          setResetPasswordModal({ open: false, userId: null, userEmail: '' });
          setNewPassword('');
        }}
        title="Réinitialiser le mot de passe"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Réinitialiser le mot de passe pour <strong>{resetPasswordModal.userEmail}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              placeholder="Minimum 6 caractères"
              minLength={6}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setResetPasswordModal({ open: false, userId: null, userEmail: '' });
                setNewPassword('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

