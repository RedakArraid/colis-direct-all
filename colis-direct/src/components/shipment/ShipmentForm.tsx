import { useState, useEffect } from 'react';
import { MapPin, User, Mail, Phone, Home, BookOpen, Star, Plus, X, Edit, Package, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { ShipmentFormData } from '../../pages/CreateShipmentPage';
import { ALL_COMMUNE_NAMES } from '../../utils/ciLocations';
import PhoneInput from '../PhoneInput';
import CommuneSelect from '../CommuneSelect';
import { isPaystackCompatibleEmail, sanitizeOptionalEmail } from '../../utils/paymentEmail';

interface ShipmentFormProps {
  onSubmit: (data: ShipmentFormData) => void;
  onSaveRecipient?: (data: Partial<ShipmentFormData>) => Promise<void>;
  onNavigate?: (page: string) => void;
  initialData?: ShipmentFormData | null;
}

const COMMUNES = ALL_COMMUNE_NAMES;

function ShipmentForm({ onSubmit, onSaveRecipient, onNavigate, initialData }: ShipmentFormProps) {
  const { user } = useAuth();
  const hasInitialData = Boolean(initialData);

  const [formData, setFormData] = useState<ShipmentFormData>(() => initialData ?? {
    sender_first_name: '',
    sender_last_name: '',
    sender_email: '',
    sender_phone: '',
    sender_commune: '',
    sender_quartier: '',
    sender_address: '',
    recipient_first_name: '',
    recipient_last_name: '',
    recipient_email: '',
    recipient_phone: '',
    recipient_commune: '',
    recipient_quartier: '',
    recipient_address: '',
    grid_type: 'colis',
    package_type: 'petit',
    weight: 1,
    is_fragile: false,
    home_delivery: false,
    is_insured: false,
    pickup_method: undefined,
  });

  const [_loadingDefaultAddress, setLoadingDefaultAddress] = useState(true);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [recipientAddresses, setRecipientAddresses] = useState<any[]>([]);
  const [saveRecipientToAddressBook, setSaveRecipientToAddressBook] = useState(false);
  const [showShippingAddressModal, setShowShippingAddressModal] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState<any[]>([]);
  const [loadingShippingAddresses, setLoadingShippingAddresses] = useState(false);
  const [showNewShippingAddressForm, setShowNewShippingAddressForm] = useState(false);
  const [newShippingAddress, setNewShippingAddress] = useState({
    address: '',
    complement_adresse: '',
    ville: '',
    commune: '',
    quartier: '',
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      if (!hasInitialData) loadUserProfileData();
      else setLoadingDefaultAddress(false);
      loadRecipientAddresses();
      loadShippingAddresses();
    } else {
      setLoadingDefaultAddress(false);
    }
  }, [user, hasInitialData]);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const loadUserProfileData = () => {
    if (!user) return;
    setLoadingDefaultAddress(true);
    try {
      if (!hasInitialData) {
        setFormData(prev => ({
          ...prev,
          sender_first_name: user.first_name || '',
          sender_last_name: user.last_name || '',
          sender_email: isPaystackCompatibleEmail(user.email || '') ? user.email!.trim() : '',
          sender_phone: user.phone || '',
          sender_commune: user.commune || '',
          sender_quartier: user.quartier || '',
          sender_address: user.address || '',
        }));
      }
      loadDefaultShippingAddress();
    } catch (err) {
      console.error('Error loading user profile data:', err);
    } finally {
      setLoadingDefaultAddress(false);
    }
  };

  const loadShippingAddresses = async () => {
    if (!user) return;
    setLoadingShippingAddresses(true);
    try {
      const { data, error } = await api.getShippingAddresses();
      if (!error && data) setShippingAddresses(data || []);
    } catch (err) {
      console.error('Error loading shipping addresses:', err);
    } finally {
      setLoadingShippingAddresses(false);
    }
  };

  const loadDefaultShippingAddress = async () => {
    if (!user) return;
    try {
      const { data, error } = await api.getShippingAddresses();
      if (!error && data && data.length > 0) {
        const defaultAddr = data.find((addr: any) => addr.is_default) || data[0];
        if (defaultAddr && !hasInitialData) {
          setFormData(prev => ({
            ...prev,
            sender_address: defaultAddr.address || '',
            sender_commune: defaultAddr.commune || user.commune || '',
            sender_quartier: defaultAddr.quartier || user.quartier || '',
          }));
        }
      }
    } catch (err) {
      console.error('Error loading default shipping address:', err);
    }
  };

  const handleSelectShippingAddress = (address: any) => {
    setFormData(prev => ({
      ...prev,
      sender_address: address.address || '',
      sender_commune: address.commune || user?.commune || '',
      sender_quartier: address.quartier || user?.quartier || '',
    }));
    setShowShippingAddressModal(false);
  };

  const handleAddShippingAddress = async () => {
    if (!user) return;
    try {
      if (!newShippingAddress.address || !newShippingAddress.commune || !newShippingAddress.quartier) {
        alert('Adresse, commune et quartier sont requis');
        return;
      }
      const { data, error } = await api.createShippingAddress(newShippingAddress);
      if (error) throw new Error(error);
      await loadShippingAddresses();
      handleSelectShippingAddress(data);
      setShowNewShippingAddressForm(false);
      setNewShippingAddress({ address: '', complement_adresse: '', ville: '', commune: '', quartier: '', is_default: false });
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'ajout de l'adresse");
    }
  };

  const loadRecipientAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await api.getRecipientAddresses();
      if (!error && data) setRecipientAddresses(data || []);
    } catch (err) {
      console.error('Error loading recipient addresses:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAddressBook && !(event.target as Element).closest('.address-book-dropdown')) {
        setShowAddressBook(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddressBook]);

  const handleSelectRecipient = (address: any) => {
    let commune = address.commune || '';
    if (commune && !COMMUNES.includes(commune)) {
      const matched = COMMUNES.find(c => c.toLowerCase().trim() === commune.toLowerCase().trim());
      if (matched) commune = matched;
    }
    setFormData(prev => ({
      ...prev,
      recipient_first_name: address.first_name || '',
      recipient_last_name: address.last_name || '',
      recipient_email: address.email || '',
      recipient_phone: address.phone || '',
      recipient_commune: commune,
      recipient_quartier: address.quartier || '',
      recipient_address: address.address || '',
    }));
    setShowAddressBook(false);
    setSaveRecipientToAddressBook(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sauvegarder le destinataire dans le carnet si demandé
    if (user && saveRecipientToAddressBook && formData.recipient_first_name && formData.recipient_last_name) {
      try {
        const exists = recipientAddresses.some(
          addr => addr.phone === formData.recipient_phone &&
            addr.first_name === formData.recipient_first_name &&
            addr.last_name === formData.recipient_last_name
        );
        if (!exists && onSaveRecipient) {
          await onSaveRecipient({
            recipient_first_name: formData.recipient_first_name,
            recipient_last_name: formData.recipient_last_name,
            recipient_email: formData.recipient_email,
            recipient_phone: formData.recipient_phone,
            recipient_commune: formData.recipient_commune,
            recipient_quartier: formData.recipient_quartier,
            recipient_address: formData.recipient_address,
          });
          await loadRecipientAddresses();
        }
      } catch (err) {
        console.error('Error saving recipient:', err);
      }
    }

    onSubmit({
      ...formData,
      sender_email: sanitizeOptionalEmail(formData.sender_email) || '',
      recipient_email: sanitizeOptionalEmail(formData.recipient_email) || '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Expéditeur (compact 30%) + Destinataire (large 70%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-6">

      {/* ── Expéditeur ── */}
      <div className="bg-[#F6F7F9] p-6 rounded-xl flex flex-col">
        <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] flex items-center mb-6">
          <User className="w-5 h-5 mr-2 text-[#FF6C00]" />
          Expéditeur
        </h2>

        {user ? (
          <div className="space-y-4 flex-1">
            {/* Toutes les infos profil en lecture seule (y compris l'adresse) */}
            <div className="bg-white border border-[#E6E6E6] rounded-xl p-4">
              <div className="mb-4 space-y-2">
                <span className="text-xs text-[#6B7280] flex items-center gap-1">
                  🔒 Informations issues de votre profil
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShippingAddressModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#FF6C00] hover:text-[#E66100] font-semibold border border-[#FF6C00] rounded-lg hover:bg-[#FFF3E8] transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Changer l'adresse
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('my-profile')}
                    className="text-xs text-[#FF6C00] hover:underline font-semibold"
                  >
                    Modifier mon profil
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-xs text-[#6B7280]">Nom</span>
                  <p className="font-medium text-[#1A1A1A] truncate">{formData.sender_last_name || <span className="text-[#9CA3AF] italic">Non renseigné</span>}</p>
                </div>
                <div>
                  <span className="text-xs text-[#6B7280]">Prénom</span>
                  <p className="font-medium text-[#1A1A1A] truncate">{formData.sender_first_name || <span className="text-[#9CA3AF] italic">Non renseigné</span>}</p>
                </div>
                <div>
                  <span className="text-xs text-[#6B7280]">Téléphone</span>
                  <p className="font-medium text-[#1A1A1A] truncate">{formData.sender_phone || <span className="text-[#9CA3AF] italic">Non renseigné</span>}</p>
                </div>
                <div>
                  <span className="text-xs text-[#6B7280]">Email</span>
                  <p className="font-medium text-[#1A1A1A] truncate">{formData.sender_email || <span className="text-[#9CA3AF] italic">Non renseigné</span>}</p>
                </div>
                <div>
                  <span className="text-xs text-[#6B7280]">Commune</span>
                  <p className="font-medium text-[#1A1A1A] truncate">{formData.sender_commune || <span className="text-orange-500 font-semibold text-xs">⚠ Requis</span>}</p>
                </div>
                <div>
                  <span className="text-xs text-[#6B7280]">Quartier</span>
                  <p className="font-medium text-[#1A1A1A] truncate">{formData.sender_quartier || <span className="text-orange-500 font-semibold text-xs">⚠ Requis</span>}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <span className="text-xs text-[#6B7280] flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    Adresse
                  </span>
                  <p className="font-medium text-[#1A1A1A] text-sm leading-relaxed">{formData.sender_address || <span className="text-orange-500 font-semibold text-xs">⚠ Requis — utilisez "Changer l'adresse"</span>}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Nom *</label>
              <input type="text" name="sender_last_name" value={formData.sender_last_name}
                onChange={handleChange} required
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Prénom *</label>
              <input type="text" name="sender_first_name" value={formData.sender_first_name}
                onChange={handleChange} required
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">
                <Mail className="w-4 h-4 inline mr-1" />Email
              </label>
              <input type="email" name="sender_email" value={formData.sender_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
            </div>
            <PhoneInput value={formData.sender_phone}
              onChange={(v) => setFormData(prev => ({ ...prev, sender_phone: v }))}
              required name="sender_phone"
              label={<span className="text-sm font-semibold text-[#3A3A3A]"><Phone className="w-4 h-4 inline mr-1" />Téléphone *</span>}
            />
            <div>
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Commune *</label>
              <CommuneSelect name="sender_commune" value={formData.sender_commune}
                onChange={(v) => setFormData(prev => ({ ...prev, sender_commune: v }))} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Quartier *</label>
              <input type="text" name="sender_quartier" value={formData.sender_quartier}
                onChange={handleChange} required
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">
                <Home className="w-4 h-4 inline mr-1" />Description précise de l'adresse *
              </label>
              <textarea name="sender_address" value={formData.sender_address}
                onChange={handleChange} required rows={2}
                placeholder="Ex: En face de la pharmacie principale, 2ème rue à gauche"
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />Repère (optionnel)
              </label>
              <input type="text" name="sender_repere" value={formData.sender_repere || ''}
                onChange={handleChange}
                placeholder="Ex: À côté du marché, en face de l'école, près de la mosquée..."
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
            </div>
          </div>
        )}

        {/* Modal adresse d'expédition */}
        {showShippingAddressModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#E6E6E6] p-4 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-[#1A1A1A]">Adresse d'expédition</h3>
                <button type="button" onClick={() => { setShowShippingAddressModal(false); setShowNewShippingAddressForm(false); }}
                  className="p-1 text-[#9CA3AF] hover:text-[#3A3A3A]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {!showNewShippingAddressForm ? (
                  <>
                    {loadingShippingAddresses ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00] mx-auto" />
                        <p className="mt-2 text-[#6B7280]">Chargement…</p>
                      </div>
                    ) : shippingAddresses.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                        <p className="text-[#6B7280] mb-4">Aucune adresse enregistrée</p>
                        <button type="button" onClick={() => setShowNewShippingAddressForm(true)}
                          className="btn-primary inline-flex items-center gap-2">
                          <Plus className="w-5 h-5" />Ajouter une adresse
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {shippingAddresses.map((address) => (
                          <div key={address.id}
                            className={`border rounded-xl p-4 cursor-pointer transition-colors ${address.is_default ? 'border-[#FF6C00] bg-[#FFF3E8]' : 'border-[#E6E6E6] hover:border-[#FF6C00] hover:bg-[#FFF3E8]'}`}
                            onClick={() => handleSelectShippingAddress(address)}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {address.is_default && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 text-xs font-bold bg-[#FF6C00] text-white rounded-full">
                                    <Star className="w-3 h-3 fill-current" />Par défaut
                                  </span>
                                )}
                                <p className="font-bold text-[#1A1A1A] mb-1">{address.address}</p>
                                {address.complement_adresse && <p className="text-sm text-[#6B7280] mb-1">{address.complement_adresse}</p>}
                                <p className="text-sm text-[#6B7280]">{address.quartier}, {address.commune}{address.ville && `, ${address.ville}`}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => setShowNewShippingAddressForm(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#E6E6E6] rounded-xl text-[#3A3A3A] hover:border-[#FF6C00] hover:text-[#FF6C00] transition-colors">
                          <Plus className="w-5 h-5" />Ajouter une adresse
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-bold text-[#1A1A1A]">Nouvelle adresse</h4>
                    <div>
                      <label className="block text-sm font-semibold text-[#3A3A3A] mb-1.5">Adresse *</label>
                      <textarea value={newShippingAddress.address}
                        onChange={(e) => setNewShippingAddress({ ...newShippingAddress, address: e.target.value })}
                        rows={3} required
                        className="w-full px-3 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all"
                        placeholder="Numéro et nom de rue" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#3A3A3A] mb-1.5">Complément d'adresse</label>
                      <input type="text" value={newShippingAddress.complement_adresse}
                        onChange={(e) => setNewShippingAddress({ ...newShippingAddress, complement_adresse: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all"
                        placeholder="Appartement, bâtiment, étage…" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#3A3A3A] mb-1.5">Ville</label>
                        <input type="text" value={newShippingAddress.ville}
                          onChange={(e) => setNewShippingAddress({ ...newShippingAddress, ville: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#3A3A3A] mb-1.5">Commune *</label>
                        <CommuneSelect value={newShippingAddress.commune}
                          onChange={(v) => setNewShippingAddress({ ...newShippingAddress, commune: v })}
                          required className="w-full px-3 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#3A3A3A] mb-1.5">Quartier *</label>
                        <input type="text" value={newShippingAddress.quartier} required
                          onChange={(e) => setNewShippingAddress({ ...newShippingAddress, quartier: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#3A3A3A]">
                      <input type="checkbox" checked={newShippingAddress.is_default}
                        onChange={(e) => setNewShippingAddress({ ...newShippingAddress, is_default: e.target.checked })}
                        className="w-4 h-4 accent-[#FF6C00] focus:ring-[#FF6C00] rounded" />
                      Définir comme adresse par défaut
                    </label>
                    <div className="flex gap-3 justify-end pt-4 border-t border-[#E6E6E6]">
                      <button type="button"
                        onClick={() => { setShowNewShippingAddressForm(false); setNewShippingAddress({ address: '', complement_adresse: '', ville: '', commune: '', quartier: '', is_default: false }); }}
                        className="btn-outline text-sm">
                        Annuler
                      </button>
                      <button type="button" onClick={handleAddShippingAddress}
                        className="btn-primary text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" />Ajouter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Destinataire ── */}
      <div className="bg-[#F6F7F9] p-6 rounded-xl flex flex-col">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] flex items-center">
            <User className="w-5 h-5 mr-2 text-[#FF6C00]" />
            Destinataire
          </h2>
          {user && (
            <div className="relative address-book-dropdown">
              <button type="button" onClick={() => setShowAddressBook(!showAddressBook)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#E66100] transition-colors text-sm font-semibold">
                <BookOpen className="w-4 h-4" />
                Carnet d'adresses
              </button>
              {showAddressBook && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm sm:max-w-none bg-white border border-[#E6E6E6] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] z-50 max-h-96 overflow-y-auto address-book-dropdown">
                  <div className="p-4 bg-[#F6F7F9] border-b border-[#E6E6E6] rounded-t-xl">
                    <h3 className="font-bold text-[#1A1A1A]">Sélectionner un destinataire</h3>
                  </div>
                  {recipientAddresses.length === 0 ? (
                    <div className="p-6 text-center">
                      <BookOpen className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                      <p className="text-sm text-[#6B7280] mb-1">Carnet vide</p>
                      <p className="text-xs text-[#9CA3AF]">Le destinataire sera ajouté automatiquement</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E6E6E6]">
                      {recipientAddresses.map((address) => (
                        <button key={address.id} type="button"
                          onClick={() => handleSelectRecipient(address)}
                          className="w-full p-4 text-left hover:bg-[#F6F7F9] transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {address.label && (
                                <span className="inline-block px-2 py-0.5 bg-[#FF6C00] text-white text-xs font-bold rounded mb-1">
                                  {address.label}
                                </span>
                              )}
                              <p className="font-bold text-[#1A1A1A]">{address.first_name} {address.last_name}</p>
                              <p className="text-sm text-[#6B7280] flex items-center gap-1">
                                <Phone className="w-3 h-3" />{address.phone}
                              </p>
                              <p className="text-xs text-[#6B7280]">{address.commune}, {address.quartier}</p>
                            </div>
                            {address.is_default && <Star className="w-4 h-4 text-[#FF6C00] fill-current" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Nom *</label>
            <input type="text" name="recipient_last_name" value={formData.recipient_last_name}
              onChange={handleChange} required
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Prénom *</label>
            <input type="text" name="recipient_first_name" value={formData.recipient_first_name}
              onChange={handleChange} required
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">
              <Mail className="w-4 h-4 inline mr-1" />Email
            </label>
            <input type="email" name="recipient_email" value={formData.recipient_email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
          <PhoneInput value={formData.recipient_phone}
            onChange={(v) => setFormData(prev => ({ ...prev, recipient_phone: v }))}
            required name="recipient_phone"
            label={<span className="text-sm font-semibold text-[#3A3A3A]"><Phone className="w-4 h-4 inline mr-1" />Téléphone *</span>}
          />
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Commune *</label>
            <CommuneSelect name="recipient_commune" value={formData.recipient_commune}
              onChange={(v) => setFormData(prev => ({ ...prev, recipient_commune: v }))} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Quartier *</label>
            <input type="text" name="recipient_quartier" value={formData.recipient_quartier}
              onChange={handleChange} required
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">
              <Home className="w-4 h-4 inline mr-1" />Description précise de l'adresse *
            </label>
            <textarea name="recipient_address" value={formData.recipient_address}
              onChange={handleChange} required rows={2}
              placeholder="Ex: En face de la pharmacie principale, 2ème rue à gauche"
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />Repère (optionnel)
            </label>
            <input type="text" name="recipient_repere" value={formData.recipient_repere || ''}
              onChange={handleChange}
              placeholder="Ex: À côté du marché, en face de l'école, près de la mosquée..."
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
        </div>

        {user && (
          <label className="mt-4 flex items-center gap-2 cursor-pointer text-sm text-[#3A3A3A]">
            <input type="checkbox" checked={saveRecipientToAddressBook}
              onChange={(e) => setSaveRecipientToAddressBook(e.target.checked)}
              className="w-4 h-4 accent-[#FF6C00] focus:ring-[#FF6C00] rounded" />
            Ajouter ce destinataire à mon carnet d'adresses
          </label>
        )}
      </div>

      </div>

      {/* ── Informations du colis ── */}
      <div className="bg-[#F6F7F9] p-6 rounded-xl">
        <h2 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-6">Informations du colis</h2>

        {/* Type d'envoi */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#3A3A3A] mb-3">
            Type d'envoi <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'courier', icon: <Mail className={`w-8 h-8 mb-2 ${formData.grid_type === 'courier' ? 'text-[#FF6C00]' : 'text-[#9CA3AF]'}`} />, label: 'Courrier', desc: 'Documents, enveloppes' },
              { value: 'colis',   icon: <Package className={`w-8 h-8 mb-2 ${formData.grid_type === 'colis'   ? 'text-[#FF6C00]' : 'text-[#9CA3AF]'}`} />, label: 'Colis',    desc: 'Objets, marchandises' },
            ].map((t) => (
              <button key={t.value} type="button"
                onClick={() => setFormData({ ...formData, grid_type: t.value as 'courier' | 'colis', ...(t.value === 'courier' ? { package_type: 'petit', is_fragile: false, is_insured: false } : {}) })}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${formData.grid_type === t.value ? 'border-[#FF6C00] bg-[#FFF3E8]' : 'border-[#E6E6E6] bg-white hover:border-[#FF6C00] hover:bg-[#FFF3E8]'}`}>
                {t.icon}
                <span className={`font-bold text-sm mb-1 ${formData.grid_type === t.value ? 'text-[#FF6C00]' : 'text-[#3A3A3A]'}`}>{t.label}</span>
                <span className="text-xs text-[#6B7280] text-center">{t.desc}</span>
                {formData.grid_type === t.value && (
                  <div className="mt-2 w-6 h-6 bg-[#FF6C00] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Taille + Poids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {formData.grid_type === 'colis' && (
            <div>
              <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Taille du colis *</label>
              <select name="package_type" value={formData.package_type} onChange={handleChange} required
                className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all">
                <option value="petit">Petit (≤ 2 kg)</option>
                <option value="moyen">Moyen (2–10 kg)</option>
                <option value="grand">Grand (&gt; 10 kg)</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Poids (kg) *</label>
            <input type="number" name="weight" value={formData.weight} onChange={handleChange}
              required min="0.1" step="0.1"
              className="w-full px-4 py-2 border border-[#E6E6E6] rounded-xl focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent transition-all" />
          </div>
        </div>

        {/* Options supplémentaires (colis uniquement) */}
        {formData.grid_type === 'colis' && (
          <div>
            <label className="block text-sm font-semibold text-[#3A3A3A] mb-3">Options supplémentaires</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'is_fragile', icon: <Package className={`w-8 h-8 mb-2 ${formData.is_fragile ? 'text-[#FF6C00]' : 'text-[#9CA3AF]'}`} />, label: 'Colis fragile', price: '+500 FCFA' },
                { key: 'is_insured', icon: <Shield className={`w-8 h-8 mb-2 ${formData.is_insured ? 'text-[#FF6C00]' : 'text-[#9CA3AF]'}`} />, label: 'Assurer mon colis', price: '+500 FCFA' },
              ].map((opt) => {
                const active = formData[opt.key as 'is_fragile' | 'is_insured'];
                return (
                  <button key={opt.key} type="button"
                    onClick={() => setFormData({ ...formData, [opt.key]: !active })}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${active ? 'border-[#FF6C00] bg-[#FFF3E8]' : 'border-[#E6E6E6] bg-white hover:border-[#FF6C00] hover:bg-[#FFF3E8]'}`}>
                    {opt.icon}
                    <span className={`font-bold text-sm mb-1 ${active ? 'text-[#FF6C00]' : 'text-[#3A3A3A]'}`}>{opt.label}</span>
                    <span className="text-xs text-[#6B7280]">{opt.price}</span>
                    {active && (
                      <div className="mt-2 w-6 h-6 bg-[#FF6C00] rounded-full flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary px-8 py-3 text-base">
          Continuer →
        </button>
      </div>
    </form>
  );
}

export default ShipmentForm;
