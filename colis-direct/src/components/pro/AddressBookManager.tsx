import { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, Star, StarOff, User, Mail, Phone, MapPin, Search } from 'lucide-react';
import { api } from '../../lib/api';
import Modal from '../admin/Modal';
import PhoneInput from '../PhoneInput';

interface AddressBookEntry {
  id: string;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_email?: string;
  recipient_phone: string;
  recipient_commune: string;
  recipient_quartier: string;
  recipient_address: string;
  label?: string;
  notes?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressBookManagerProps {
  onSelectEntry?: (entry: AddressBookEntry) => void;
}

function AddressBookManager({ onSelectEntry }: AddressBookManagerProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AddressBookEntry | null>(null);
  const [formData, setFormData] = useState({
    recipient_first_name: '',
    recipient_last_name: '',
    recipient_email: '',
    recipient_phone: '',
    recipient_commune: '',
    recipient_quartier: '',
    recipient_address: '',
    label: '',
    notes: '',
    is_favorite: false,
  });

  const COMMUNES = [
    'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi',
    'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Songon'
  ];

  useEffect(() => {
    loadAddressBook();
  }, []);

  const loadAddressBook = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getAddressBook();
      if (error) throw new Error(error);
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading address book:', error);
      alert('Erreur lors du chargement du carnet d\'adresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingEntry) {
        const { error } = await api.updateAddressBookEntry(editingEntry.id, formData);
        if (error) throw new Error(error);
      } else {
        const { error } = await api.createAddressBookEntry(formData);
        if (error) throw new Error(error);
      }
      setShowModal(false);
      setEditingEntry(null);
      resetForm();
      loadAddressBook();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;
    
    try {
      const { error } = await api.deleteAddressBookEntry(id);
      if (error) throw new Error(error);
      loadAddressBook();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleFavorite = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await api.updateAddressBookEntry(id, { is_favorite: !currentValue });
      if (error) throw new Error(error);
      loadAddressBook();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleEdit = (entry: AddressBookEntry) => {
    setEditingEntry(entry);
    setFormData({
      recipient_first_name: entry.recipient_first_name,
      recipient_last_name: entry.recipient_last_name,
      recipient_email: entry.recipient_email || '',
      recipient_phone: entry.recipient_phone,
      recipient_commune: entry.recipient_commune,
      recipient_quartier: entry.recipient_quartier,
      recipient_address: entry.recipient_address,
      label: entry.label || '',
      notes: entry.notes || '',
      is_favorite: entry.is_favorite,
    });
    setShowModal(true);
  };

  const handleSelect = (entry: AddressBookEntry) => {
    if (onSelectEntry) {
      onSelectEntry(entry);
    }
  };

  const resetForm = () => {
    setFormData({
      recipient_first_name: '',
      recipient_last_name: '',
      recipient_email: '',
      recipient_phone: '',
      recipient_commune: '',
      recipient_quartier: '',
      recipient_address: '',
      label: '',
      notes: '',
      is_favorite: false,
    });
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    resetForm();
    setShowModal(true);
  };

  const filteredEntries = entries.filter(entry => {
    const query = searchQuery.toLowerCase();
    return (
      entry.recipient_first_name.toLowerCase().includes(query) ||
      entry.recipient_last_name.toLowerCase().includes(query) ||
      entry.recipient_phone.includes(query) ||
      entry.label?.toLowerCase().includes(query) ||
      entry.recipient_commune.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#FF6C00] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-[#FF6C00]" />
          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1A1A1A]">
            Carnet d'adresses ({entries.length})
          </h3>
        </div>
        <button
          onClick={handleNewEntry}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle adresse
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone, label..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
        />
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-[#F6F7F9] rounded-xl">
          <User className="w-16 h-16 text-[#D1D5DB] mx-auto mb-4" />
          <p className="text-[#6B7280]">Aucune adresse trouvée</p>
          {searchQuery ? (
            <p className="text-sm text-[#6B7280] mt-2">Essayez une autre recherche</p>
          ) : (
            <button
              onClick={handleNewEntry}
              className="mt-4 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
            >
              Ajouter votre première adresse
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={`relative bg-white rounded-xl border-2 p-6 transition-shadow hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] ${
                entry.is_favorite ? 'border-yellow-400' : 'border-[#E6E6E6]'
              } ${onSelectEntry ? 'cursor-pointer hover:border-[#FF6C00]' : ''}`}
              onClick={() => onSelectEntry && handleSelect(entry)}
            >
              {/* Favorite Badge */}
              {entry.is_favorite && (
                <div className="absolute top-4 right-4">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                </div>
              )}

              {/* Label */}
              {entry.label && (
                <div className="mb-3">
                  <span className="px-3 py-1 bg-[#FF6C00] text-white text-xs font-semibold rounded-full">
                    {entry.label}
                  </span>
                </div>
              )}

              {/* Name */}
              <h4 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-2">
                {entry.recipient_first_name} {entry.recipient_last_name}
              </h4>

              {/* Details */}
              <div className="space-y-2 text-sm text-[#6B7280]">
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{entry.recipient_phone}</span>
                </div>
                {entry.recipient_email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{entry.recipient_email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{entry.recipient_commune}, {entry.recipient_quartier}</span>
                </div>
                <div className="text-xs text-[#6B7280] ml-6">
                  {entry.recipient_address}
                </div>
                {entry.notes && (
                  <div className="mt-2 text-xs text-[#6B7280] italic ml-6">
                    "{entry.notes}"
                  </div>
                )}
              </div>

              {/* Actions */}
              {!onSelectEntry && (
                <div className="mt-4 pt-4 border-t border-[#E6E6E6] flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(entry.id, entry.is_favorite);
                    }}
                    className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                    title={entry.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    {entry.is_favorite ? (
                      <Star className="w-5 h-5 fill-current" />
                    ) : (
                      <StarOff className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(entry);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEntry(null);
          resetForm();
        }}
        title={editingEntry ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.recipient_first_name}
                onChange={(e) => setFormData({ ...formData, recipient_first_name: e.target.value })}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                Nom *
              </label>
              <input
                type="text"
                value={formData.recipient_last_name}
                onChange={(e) => setFormData({ ...formData, recipient_last_name: e.target.value })}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>
          </div>

          <PhoneInput
            value={formData.recipient_phone}
            onChange={(v) => setFormData({ ...formData, recipient_phone: v })}
            required
            label={
              <span className="text-sm font-medium text-[#3A3A3A]">
                <Phone className="w-4 h-4 inline mr-1" />
                Téléphone *
              </span>
            }
          />

          <div>
            <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={formData.recipient_email}
              onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
              className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                Commune *
              </label>
              <select
                value={formData.recipient_commune}
                onChange={(e) => setFormData({ ...formData, recipient_commune: e.target.value })}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              >
                <option value="">Sélectionner</option>
                {COMMUNES.map(commune => (
                  <option key={commune} value={commune}>{commune}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                Quartier *
              </label>
              <input
                type="text"
                value={formData.recipient_quartier}
                onChange={(e) => setFormData({ ...formData, recipient_quartier: e.target.value })}
                className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Adresse complète *
            </label>
            <textarea
              value={formData.recipient_address}
              onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
              Label (ex: Bureau, Entrepôt, Client VIP)
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Label optionnel"
              className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Notes additionnelles..."
              className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_favorite"
              checked={formData.is_favorite}
              onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
              className="w-4 h-4 text-[#FF6C00] border-[#D1D5DB] rounded focus:ring-[#FF6C00]"
            />
            <label htmlFor="is_favorite" className="ml-2 text-sm text-[#3A3A3A]">
              Marquer comme favori
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingEntry(null);
                resetForm();
              }}
              className="px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.recipient_first_name || !formData.recipient_last_name || 
                       !formData.recipient_phone || !formData.recipient_commune || 
                       !formData.recipient_quartier || !formData.recipient_address}
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingEntry ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AddressBookManager;

