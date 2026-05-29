import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Check, X, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { BasePageProps, Address } from '../types/pages';
import LoadingSpinner from '../components/LoadingSpinner';
import PhoneInput from '../components/PhoneInput';

interface MyAddressBookPageProps extends BasePageProps {
  // onNavigate non utilisé, supprimé pour cohérence
}

function MyAddressBookPage({}: MyAddressBookPageProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Address>({
    id: '',
    label: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    commune: '',
    quartier: '',
    address: '',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await api.getRecipientAddresses();
      if (error) throw new Error(error);
      setAddresses(data || []);
    } catch (err: any) {
      console.error('Error loading addresses:', err);
      setError(err.message || 'Erreur lors du chargement des adresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingId) {
        const { error } = await api.updateRecipientAddress(editingId, formData);
        if (error) throw new Error(error);
      } else {
        const { error } = await api.createRecipientAddress(formData);
        if (error) throw new Error(error);
      }
      
      await loadAddresses();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;
    
    try {
      const { error } = await api.deleteRecipientAddress(id);
      if (error) throw new Error(error);
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await api.updateRecipientAddress(id, { is_default: true });
      if (error) throw new Error(error);
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleEdit = (address: Address) => {
    setFormData(address);
    setEditingId(address.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      label: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      commune: '',
      quartier: '',
      address: '',
      is_default: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1A1A] mb-1 sm:mb-2">Mon carnet d'adresse</h1>
            <p className="text-sm sm:text-base text-[#6B7280]">Gérez les adresses de vos destinataires</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Ajouter une adresse
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1A1A1A]">
                {editingId ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
              </h2>
              <button
                onClick={resetForm}
                className="text-[#9CA3AF] hover:text-[#3A3A3A]"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                  Libellé (ex: Domicile, Bureau)
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  placeholder="Ex: Domicile"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                    Téléphone
                  </label>
                  <PhoneInput value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} required label={null} />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                    Commune
                  </label>
                  <input
                    type="text"
                    value={formData.commune}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                    Quartier
                  </label>
                  <input
                    type="text"
                    value={formData.quartier}
                    onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-1 sm:mb-2">
                  Adresse complète
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-3 h-3 sm:w-4 sm:h-4 text-[#FF6C00] focus:ring-[#FF6C00] rounded"
                />
                <label htmlFor="is_default" className="text-xs sm:text-sm text-[#3A3A3A]">
                  Définir comme adresse par défaut
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {loading ? (
            <div className="p-8">
              <LoadingSpinner message="Chargement de votre carnet d'adresses..." />
            </div>
          ) : addresses.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280]">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2">Aucune adresse enregistrée</p>
              <p className="text-sm text-[#9CA3AF]">Ajoutez votre première adresse pour commencer</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border-2 rounded-lg p-3 sm:p-4 ${
                    address.is_default ? 'border-[#FF6C00] bg-orange-50' : 'border-[#E6E6E6]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A] truncate">{address.label}</h3>
                        {address.is_default && (
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 text-[#FF6C00] fill-current flex-shrink-0" />
                        )}
                      </div>
                      {address.is_default && (
                        <span className="text-[10px] sm:text-xs text-[#FF6C00] font-medium">Par défaut</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(address)}
                        className="text-[#9CA3AF] hover:text-[#FF6C00] transition-colors"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        className="text-[#9CA3AF] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-[#6B7280]">
                    <p className="font-medium text-[#1A1A1A] text-sm sm:text-base">
                      {address.first_name} {address.last_name}
                    </p>
                    <p className="break-words">{address.phone}</p>
                    {address.email && <p className="break-words">{address.email}</p>}
                    <p className="mt-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="break-words">{address.address}</span>
                    </p>
                    <p>
                      {address.quartier}, {address.commune}
                    </p>
                  </div>

                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-2 sm:mt-3 w-full text-xs sm:text-sm text-[#FF6C00] hover:text-[#ff8534] font-medium"
                    >
                      Définir par défaut
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyAddressBookPage;

