import { useState, useEffect } from 'react';
import { User, Save, X, Mail, Phone, MapPin, Edit, Lock, Plus, Trash2, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import PhoneInput from '../components/PhoneInput';
import CommuneSelect from '../components/CommuneSelect';
import { BasePageProps } from '../types/pages';

interface MyProfilePageProps extends BasePageProps {
  // onNavigate non utilisé, supprimé pour cohérence
}

function MyProfilePage({}: MyProfilePageProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État d'édition pour chaque section
  const [editingSection, setEditingSection] = useState<'info' | 'addresses' | 'credentials' | null>(null);

  // Section 1: Mes informations (non-sensitive — no password needed)
  const [infoData, setInfoData] = useState({
    first_name: '',
    last_name: '',
    address: '',
    country_code: '+225',
    phone: '',
  });

  // Section 2: Mes adresses d'expéditions (multiple addresses)
  const [shippingAddresses, setShippingAddresses] = useState<any[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddressData, setNewAddressData] = useState({
    address: '',
    complement_adresse: '',
    ville: '',
    commune: '',
    quartier: '',
    is_default: false,
  });

  // Section 3: Mes paramètres de connexion (sensitive — current password always required)
  const [credentialsData, setCredentialsData] = useState({
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setInfoData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        address: user.address || '',
        country_code: user.country_code || '+225',
        phone: user.phone || '',
      });
      setCredentialsData({
        email: user.email || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    }
  }, [user]);

  // Load shipping addresses
  useEffect(() => {
    const loadShippingAddresses = async () => {
      try {
        const { data, error } = await api.getShippingAddresses();
        if (error) throw new Error(error);
        setShippingAddresses(data || []);
      } catch (err: any) {
        console.error('Error loading shipping addresses:', err);
      }
    };
    if (user) {
      loadShippingAddresses();
    }
  }, [user]);

  const handleSaveInfo = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await api.updateUser(user!.id, {
        first_name: infoData.first_name,
        last_name: infoData.last_name,
        address: infoData.address,
        country_code: infoData.country_code,
        phone: infoData.phone,
      });
      if (error) throw new Error(error);
      
      setSuccess('Informations mises à jour avec succès !');
      setEditingSection(null);
      await refreshUser();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!newAddressData.address || !newAddressData.commune || !newAddressData.quartier) {
        throw new Error('Adresse, commune et quartier sont requis');
      }

      const { data, error } = await api.createShippingAddress(newAddressData);
      if (error) throw new Error(error);

      setShippingAddresses([...shippingAddresses, data]);
      setSuccess('Adresse ajoutée avec succès !');
      setEditingSection(null);
      setNewAddressData({
        address: '',
        complement_adresse: '',
        ville: '',
        commune: '',
        quartier: '',
        is_default: false,
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout de l\'adresse');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAddress = async (id: string, addressData: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error } = await api.updateShippingAddress(id, addressData);
      if (error) throw new Error(error);

      setShippingAddresses(shippingAddresses.map(addr => addr.id === id ? data : addr));
      setSuccess('Adresse mise à jour avec succès !');
      setEditingAddressId(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await api.deleteShippingAddress(id);
      if (error) throw new Error(error);

      setShippingAddresses(shippingAddresses.filter(addr => addr.id !== id));
      setSuccess('Adresse supprimée avec succès !');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await api.updateShippingAddress(id, { is_default: true });
      if (error) throw new Error(error);

      // Update all addresses to ensure only one is default
      setShippingAddresses(shippingAddresses.map(addr => ({
        ...addr,
        is_default: addr.id === id ? true : false,
      })));
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!credentialsData.current_password) {
        throw new Error('Le mot de passe actuel est requis');
      }

      if (credentialsData.new_password) {
        if (credentialsData.new_password !== credentialsData.confirm_password) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        if (credentialsData.new_password.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }
      }

      // Mettre à jour l'email (current_password requis côté backend)
      const emailChanged = credentialsData.email !== user?.email;
      if (emailChanged) {
        const { error } = await api.updateUser(user!.id, {
          email: credentialsData.email,
          current_password: credentialsData.current_password,
        });
        if (error) throw new Error(error);
      }

      // Changer le mot de passe si demandé
      if (credentialsData.new_password) {
        const { error } = await api.changePassword(
          user!.id,
          credentialsData.current_password,
          credentialsData.new_password
        );
        if (error) throw new Error(error);
      }

      if (!emailChanged && !credentialsData.new_password) {
        throw new Error('Aucune modification détectée');
      }

      setSuccess('Paramètres de connexion mis à jour avec succès !');
      setEditingSection(null);
      setCredentialsData({
        ...credentialsData,
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      await refreshUser();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setInfoData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        address: user.address || '',
        country_code: user.country_code || '+225',
        phone: user.phone || '',
      });
      setCredentialsData({
        email: user.email || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    }
    setEditingSection(null);
    setEditingAddressId(null);
    setNewAddressData({
      address: '',
      complement_adresse: '',
      ville: '',
      commune: '',
      quartier: '',
      is_default: false,
    });
    setError(null);
    setSuccess(null);
  };

  const SectionHeader = ({ title, section, onEdit }: { title: string; section: string; onEdit: () => void }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-extrabold text-[#1A1A1A]">{title}</h3>
      {editingSection !== section && (
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-[#FF6C00] hover:bg-orange-50 rounded-lg transition-colors"
          title="Modifier"
        >
          <Edit className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  // Component for editing an existing address
  const AddressEditForm = ({ address, onSave, onCancel, loading }: { address: any; onSave: (data: any) => void; onCancel: () => void; loading: boolean }) => {
    const [editData, setEditData] = useState({
      address: address.address,
      complement_adresse: address.complement_adresse || '',
      ville: address.ville || '',
      commune: address.commune,
      quartier: address.quartier,
      is_default: address.is_default,
    });

    return (
      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Adresse *</label>
          <textarea
            value={editData.address}
            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Complément d'adresse</label>
          <input
            type="text"
            value={editData.complement_adresse}
            onChange={(e) => setEditData({ ...editData, complement_adresse: e.target.value })}
            className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
            placeholder="Appartement, bâtiment, étage..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Ville</label>
            <input
              type="text"
              value={editData.ville}
              onChange={(e) => setEditData({ ...editData, ville: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Commune *</label>
            <CommuneSelect
              value={editData.commune}
              onChange={(v) => setEditData({ ...editData, commune: v })}
              required
              className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Quartier *</label>
            <input
              type="text"
              value={editData.quartier}
              onChange={(e) => setEditData({ ...editData, quartier: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`is_default_${address.id}`}
            checked={editData.is_default}
            onChange={(e) => setEditData({ ...editData, is_default: e.target.checked })}
            className="w-4 h-4 text-[#FF6C00] border-[#E6E6E6] rounded focus:ring-[#FF6C00]"
          />
          <label htmlFor={`is_default_${address.id}`} className="text-sm text-[#3A3A3A]">
            Définir comme adresse par défaut
          </label>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave(editData)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-6 sm:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FF6C00] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Mon profil</h1>
              <p className="text-sm text-[#6B7280]">Gérez vos informations personnelles</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Section 1: Mes informations */}
        <div className="card p-5 sm:p-6">
          <SectionHeader
            title="Mes informations"
            section="info"
            onEdit={() => setEditingSection('info')}
          />

          {editingSection === 'info' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Prénom</label>
                  <input
                    type="text"
                    value={infoData.first_name}
                    onChange={(e) => setInfoData({ ...infoData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Nom</label>
                  <input
                    type="text"
                    value={infoData.last_name}
                    onChange={(e) => setInfoData({ ...infoData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                  />
                </div>
              </div>

              <PhoneInput
                value={infoData.phone}
                preferDialPlus={infoData.country_code}
                onChange={(v) => setInfoData((d) => ({ ...d, phone: v }))}
                onCountryMetaChange={(m) => setInfoData((d) => ({ ...d, country_code: m.dialPlus }))}
                label={
                  <span className="text-sm font-semibold text-[#3A3A3A] mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Numéro de téléphone
                  </span>
                }
              />

              <p className="text-xs text-[#6B7280] flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Pour modifier votre email, rendez-vous dans <strong>Paramètres de connexion</strong>.
              </p>

              <div>
                <label className="block text-sm font-semibold text-[#3A3A3A] mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adresse
                </label>
                <textarea
                  value={infoData.address}
                  onChange={(e) => setInfoData({ ...infoData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveInfo}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[#6B7280]">Prénom:</span>
                  <p className="font-medium text-[#1A1A1A]">{infoData.first_name || 'Non renseigné'}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Nom:</span>
                  <p className="font-medium text-[#1A1A1A]">{infoData.last_name || 'Non renseigné'}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Téléphone:</span>
                  <p className="font-medium text-[#1A1A1A]">
                    {infoData.phone
                      ? (infoData.phone.startsWith('+')
                          ? infoData.phone
                          : `${infoData.country_code || '+225'} ${infoData.phone}`)
                      : 'Non renseigné'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[#6B7280]">Adresse:</span>
                  <p className="font-medium text-[#1A1A1A]">{infoData.address || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Mes adresses d'expéditions */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-[#1A1A1A]">Mes adresses d'expéditions</h3>
            {editingSection !== 'addresses' && (
              <button
                type="button"
                onClick={() => setEditingSection('addresses')}
                className="p-2 text-[#FF6C00] hover:bg-orange-50 rounded-lg transition-colors"
                title="Ajouter une adresse"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Liste des adresses */}
          {shippingAddresses.length > 0 && (
            <div className="space-y-4 mb-6">
              {shippingAddresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-xl p-4 ${address.is_default ? 'border-[#FF6C00] bg-orange-50' : 'border-[#E6E6E6]'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {address.is_default && (
                        <Star className="w-4 h-4 text-[#FF6C00] fill-[#FF6C00]" />
                      )}
                      <span className="text-sm font-bold text-[#3A3A3A]">
                        {address.is_default ? 'Adresse par défaut' : 'Adresse'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!address.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(address.id)}
                          className="p-1 text-[#6B7280] hover:text-[#FF6C00] transition-colors"
                          title="Définir comme adresse par défaut"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      {editingAddressId !== address.id && (
                        <button
                          type="button"
                          onClick={() => setEditingAddressId(address.id)}
                          className="p-1 text-[#FF6C00] hover:bg-orange-50 rounded transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(address.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {editingAddressId === address.id ? (
                    <AddressEditForm
                      address={address}
                      onSave={(updatedData) => {
                        handleUpdateAddress(address.id, updatedData);
                      }}
                      onCancel={() => setEditingAddressId(null)}
                      loading={loading}
                    />
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[#6B7280]">Adresse:</span>
                        <p className="font-medium text-[#1A1A1A]">{address.address}</p>
                      </div>
                      {address.complement_adresse && (
                        <div>
                          <span className="text-[#6B7280]">Complément:</span>
                          <p className="font-medium text-[#1A1A1A]">{address.complement_adresse}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {address.ville && (
                          <div>
                            <span className="text-[#6B7280]">Ville:</span>
                            <p className="font-medium text-[#1A1A1A]">{address.ville}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-[#6B7280]">Commune:</span>
                          <p className="font-medium text-[#1A1A1A]">{address.commune}</p>
                        </div>
                        <div>
                          <span className="text-[#6B7280]">Quartier:</span>
                          <p className="font-medium text-[#1A1A1A]">{address.quartier}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'ajout d'adresse */}
          {editingSection === 'addresses' && (
            <div className="border-2 border-dashed border-[#E6E6E6] rounded-xl p-4 bg-[#F6F7F9]">
              <h4 className="text-sm font-bold text-[#1A1A1A] mb-4">Ajouter une nouvelle adresse</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Adresse *</label>
                  <textarea
                    value={newAddressData.address}
                    onChange={(e) => setNewAddressData({ ...newAddressData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    placeholder="Numéro et nom de rue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Complément d'adresse</label>
                  <input
                    type="text"
                    value={newAddressData.complement_adresse}
                    onChange={(e) => setNewAddressData({ ...newAddressData, complement_adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    placeholder="Appartement, bâtiment, étage..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Ville</label>
                    <input
                      type="text"
                      value={newAddressData.ville}
                      onChange={(e) => setNewAddressData({ ...newAddressData, ville: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Commune *</label>
                    <CommuneSelect
                      value={newAddressData.commune}
                      onChange={(v) => setNewAddressData({ ...newAddressData, commune: v })}
                      required
                      className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Quartier *</label>
                    <input
                      type="text"
                      value={newAddressData.quartier}
                      onChange={(e) => setNewAddressData({ ...newAddressData, quartier: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default_new"
                    checked={newAddressData.is_default}
                    onChange={(e) => setNewAddressData({ ...newAddressData, is_default: e.target.checked })}
                    className="w-4 h-4 text-[#FF6C00] border-[#E6E6E6] rounded focus:ring-[#FF6C00]"
                  />
                  <label htmlFor="is_default_new" className="text-sm text-[#3A3A3A]">
                    Définir comme adresse par défaut
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAddress}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}

          {shippingAddresses.length === 0 && editingSection !== 'addresses' && (
            <div className="text-center py-8 text-[#6B7280]">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Aucune adresse d'expédition enregistrée</p>
              <p className="text-sm">Cliquez sur le bouton + pour ajouter une adresse</p>
            </div>
          )}
        </div>

        {/* Section 3: Mes paramètres de connexion */}
        <div className="card p-5 sm:p-6">
          <SectionHeader
            title="Mes paramètres de connexion"
            section="credentials"
            onEdit={() => setEditingSection('credentials')}
          />

          {editingSection === 'credentials' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A3A3A] mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Adresse email
                </label>
                <input
                  type="email"
                  value={credentialsData.email}
                  onChange={(e) => setCredentialsData({ ...credentialsData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                />
              </div>

              <div className="pt-4 border-t space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A3A3A] mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Mot de passe actuel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={credentialsData.current_password}
                    onChange={(e) => setCredentialsData({ ...credentialsData, current_password: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    placeholder="Requis pour valider toute modification"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Nouveau mot de passe (optionnel)</label>
                  <input
                    type="password"
                    value={credentialsData.new_password}
                    onChange={(e) => setCredentialsData({ ...credentialsData, new_password: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    placeholder="Minimum 6 caractères"
                  />
                </div>

                {credentialsData.new_password && (
                  <div>
                    <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={credentialsData.confirm_password}
                      onChange={(e) => setCredentialsData({ ...credentialsData, confirm_password: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[#6B7280]">Email:</span>
                <p className="font-medium text-[#1A1A1A]">{user?.email || 'Non renseigné'}</p>
              </div>
              <div>
                <span className="text-[#6B7280]">Mot de passe:</span>
                <p className="font-medium text-[#1A1A1A]">••••••••</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyProfilePage;
