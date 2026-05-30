import { useState } from 'react';
import { Check, MapPin, Upload, Loader2, AlertCircle, Map, X, ArrowLeft } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import CommuneSelect from '../components/CommuneSelect';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { api } from '../lib/api';

interface RelayApplicationPageProps {
  onNavigate?: (page: string) => void;
}

function RelayApplicationPage({ onNavigate }: RelayApplicationPageProps) {
  const navigate = (page: string) => {
    if (onNavigate) onNavigate(page);
  };

  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useState(() => {
    let mounted = true;
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(async ([L, RL]) => {
      if (!mounted) return;
      const mk2x = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
      const mk = (await import('leaflet/dist/images/marker-icon.png')).default;
      const sh = (await import('leaflet/dist/images/marker-shadow.png')).default;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: mk2x, iconUrl: mk, shadowUrl: sh });
      setMapComponents({ L, ...RL });
    });
    return () => { mounted = false; };
  });

  const [formData, setFormData] = useState({
    applicant_first_name: '',
    applicant_last_name: '',
    business_name: '',
    business_type: '',
    phone: '',
    email: '',
    commune: '',
    quartier: '',
    address: '',
    address_complement: '',
    description: '',
    hours: '',
    has_storage_space: false,
    latitude: null as number | null,
    longitude: null as number | null,
    city: '',
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({ ...prev, latitude, longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&countrycodes=ci&addressdetails=1`
          );
          const data = await res.json();
          const addr = data.address || {};
          setFormData((prev) => ({
            ...prev,
            city: addr.city || addr.town || addr.village || '',
            commune: addr.city_district || addr.suburb || addr.city || addr.town || '',
            quartier: '',
            address: '',
          }));
          setShowMapModal(true);
        } catch {
          alert("Position capturée, mais impossible de récupérer l'adresse. Complétez manuellement.");
        } finally {
          setGeolocating(false);
        }
      },
      () => {
        setGeolocating(false);
        alert("Impossible d'obtenir votre position. Autorisez la géolocalisation et réessayez.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);
    setPhotoUrls(newPhotos.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (i: number) => {
    const p = photos.filter((_, idx) => idx !== i);
    setPhotos(p);
    setPhotoUrls(p.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.latitude || !formData.longitude) {
      setError("Géolocalisez votre commerce avant de soumettre (bouton \"Ma position\").");
      return;
    }
    setLoading(true);
    try {
      let photo_urls: string[] = [];
      if (photos.length > 0) {
        const { data: uploadData, error: uploadError } = await api.uploadPhotos(photos);
        if (uploadError) throw new Error(`Erreur upload photos : ${uploadError}`);
        photo_urls = uploadData?.urls ?? [];
      }
      const { data, error: apiError } = await api.submitRelayApplication({ ...formData, photo_urls });
      if (apiError) throw new Error(apiError);
      if (data?.application) {
        setApplicationId(data.application.id);
        setSubmitted(true);
      } else {
        throw new Error('Réponse inattendue du serveur');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Succès ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="card max-w-2xl w-full p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight mb-3">
            Candidature soumise avec succès !
          </h2>
          <p className="text-[#6B7280] mb-2">
            Votre dossier a été transmis à notre équipe. Vous recevrez un email de confirmation sous peu.
          </p>
          {applicationId && (
            <p className="text-sm text-[#6B7280] mb-8">
              Numéro de suivi : <strong className="text-[#1A1A1A]">{applicationId}</strong>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('home')} className="btn-primary">
              Retour à l'accueil
            </button>
            <button onClick={() => navigate('become-relay')} className="btn-outline flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Page partenaires
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="px-4 sm:px-8 lg:px-10 pt-6 pb-0">
        <div className="bg-[#0f0f0f] rounded-3xl px-8 sm:px-14 py-12 sm:py-16">
          <button
            onClick={() => navigate('become-relay')}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux options partenaires
          </button>
          <div className="text-xs font-bold text-[#FF6C00] uppercase tracking-widest mb-4">
            Candidature Point relais
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Devenez point relais{' '}
            <span className="text-[#FF6C00]">COLISDIRECT</span>
          </h1>
          <p className="text-base text-white/70 mt-4 leading-relaxed max-w-xl">
            Remplissez le formulaire ci-dessous. Notre équipe examine chaque dossier sous 48h ouvrées et vous contacte par email.
          </p>
        </div>
      </section>

      {/* Formulaire */}
      <section className="py-16 px-4 sm:px-8 lg:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="card p-6 sm:p-10">

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {formData.latitude && formData.longitude && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 text-sm font-semibold">Position GPS capturée</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="text-sm text-[#FF6C00] hover:text-[#E66100] font-medium flex items-center gap-1"
                  >
                    <Map className="w-4 h-4" />
                    Voir sur la carte
                  </button>
                </div>
                <div className="text-xs text-[#6B7280] space-y-1">
                  {formData.city && <div className="text-green-700 font-medium">Ville : {formData.city} ✓</div>}
                  {formData.commune && <div className="text-green-700 font-medium">Commune : {formData.commune} ✓</div>}
                  <div className="text-orange-600 font-medium">Complétez le quartier et l'adresse ci-dessous.</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Identité */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6]">
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Prénom *</label>
                    <input type="text" required value={formData.applicant_first_name}
                      onChange={(e) => setFormData({ ...formData, applicant_first_name: e.target.value })}
                      className="input-field" placeholder="Votre prénom" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Nom *</label>
                    <input type="text" required value={formData.applicant_last_name}
                      onChange={(e) => setFormData({ ...formData, applicant_last_name: e.target.value })}
                      className="input-field" placeholder="Votre nom" />
                  </div>
                </div>
              </div>

              {/* Commerce */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6]">
                  Informations du commerce
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Nom du commerce *</label>
                    <input type="text" required value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="input-field" placeholder="Ex : Kiosque Plateau" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Type d'établissement *</label>
                    <select required value={formData.business_type}
                      onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                      className="input-field">
                      <option value="">Sélectionner</option>
                      <option value="cybercafé">Cybercafé</option>
                      <option value="boutique">Boutique</option>
                      <option value="imprimerie">Imprimerie</option>
                      <option value="supérette">Supérette</option>
                      <option value="kiosque">Kiosque</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Géolocalisation */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6]">
                  Localisation du commerce
                </h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Géolocalisation obligatoire</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Soyez sur le lieu du commerce au moment de la candidature pour une localisation précise.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeolocate}
                      disabled={geolocating}
                      className="flex-shrink-0 px-4 py-2.5 bg-[#FF6C00] text-white rounded-xl text-sm font-bold hover:bg-[#E66100] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {geolocating
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Localisation…</>
                        : <><MapPin className="w-4 h-4" />Ma position</>
                      }
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
                      Ville *{formData.city && <span className="ml-1 text-green-600 font-normal">✓ auto-remplie</span>}
                    </label>
                    <input type="text" required value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`input-field ${formData.city ? 'border-green-300 bg-green-50' : ''}`}
                      placeholder="Ex : Abidjan" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
                      Commune *{formData.commune && <span className="ml-1 text-green-600 font-normal">✓ auto-remplie</span>}
                    </label>
                    <CommuneSelect value={formData.commune}
                      onChange={(v) => setFormData({ ...formData, commune: v })}
                      required
                      className={`input-field ${formData.commune ? 'border-green-300 bg-green-50' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
                      Quartier *<span className="ml-1 text-orange-600 font-normal">à compléter</span>
                    </label>
                    <input type="text" required value={formData.quartier}
                      onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                      className="input-field" placeholder="Ex : Angré, Koumassi marché…" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
                      Adresse précise *<span className="ml-1 text-orange-600 font-normal">à compléter</span>
                    </label>
                    <input type="text" required value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input-field" placeholder="Rue, numéro, repère…" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Description / repères visuels *</label>
                    <textarea required value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2} className="input-field resize-none"
                      placeholder="Ex : En face de la pharmacie, à côté du marché…" />
                  </div>
                </div>
              </div>

              {/* Contact & horaires */}
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E6E6E6]">
                  Contact & horaires
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PhoneInput value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                    required
                    label={<span className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Téléphone *</span>}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Email *</label>
                    <input type="email" required value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field" placeholder="email@exemple.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Horaires d'ouverture *</label>
                    <input type="text" required value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="input-field" placeholder="Ex : Lun–Ven 8h–20h, Sam 9h–17h" />
                  </div>
                </div>
              </div>

              {/* Engagement + photos */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-4 bg-[#F6F7F9] rounded-xl border border-[#E6E6E6]">
                  <input type="checkbox" checked={formData.has_storage_space}
                    onChange={(e) => setFormData({ ...formData, has_storage_space: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[#FF6C00] focus:ring-[#FF6C00]" />
                  <span className="text-sm text-[#3A3A3A] font-semibold">
                    Je confirme avoir un espace disponible pour stocker les colis *
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
                    Photos du local (optionnel, max 5)
                  </label>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload}
                    className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload"
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#E6E6E6] rounded-xl cursor-pointer hover:border-[#FF6C00] transition-colors">
                    <Upload className="w-5 h-5 text-[#9CA3AF]" />
                    <span className="text-sm text-[#6B7280]">Ajouter des photos</span>
                  </label>
                  {photoUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {photoUrls.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-28 object-cover rounded-xl" />
                          <button type="button" onClick={() => removePhoto(i)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || geolocating || !formData.latitude || !formData.longitude}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Soumission en cours…</>
                  : <><MapPin className="w-5 h-5" />Soumettre ma candidature</>
                }
              </button>

              {!formData.latitude && (
                <p className="text-center text-xs text-orange-600 font-medium">
                  ⚠️ Cliquez sur "Ma position" pour géolocaliser votre commerce avant de soumettre.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Modal carte */}
      {showMapModal && formData.latitude && formData.longitude && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMapModal(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#E6E6E6] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#1A1A1A] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FF6C00]" />
                Votre position sur la carte
              </h2>
              <button onClick={() => setShowMapModal(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-[#3A3A3A] space-y-1">
                <div><strong>Coordonnées GPS :</strong> {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</div>
                {formData.city && <div className="text-green-700 font-medium">Ville : {formData.city} ✓</div>}
                {formData.commune && <div className="text-green-700 font-medium">Commune : {formData.commune} ✓</div>}
                <div className="text-orange-600 font-medium">Complétez le quartier et l'adresse dans le formulaire.</div>
              </div>
              <div className="relative w-full h-[480px] rounded-xl overflow-hidden border-2 border-[#FF6C00] bg-[#F6F7F9]">
                {MapComponents ? (
                  <MapComponents.MapContainer
                    center={[formData.latitude, formData.longitude]}
                    zoom={15}
                    zoomControl={true}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                  >
                    <MapComponents.TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapComponents.Marker
                      position={[formData.latitude, formData.longitude]}
                    />
                  </MapComponents.MapContainer>
                ) : (
                  <iframe width="100%" height="100%" frameBorder="0" scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.longitude - 0.01},${formData.latitude - 0.01},${formData.longitude + 0.01},${formData.latitude + 0.01}&layer=mapnik&marker=${formData.latitude},${formData.longitude}`}
                    style={{ border: 'none', position: 'absolute', inset: 0 }}
                    title="Carte position" />
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-xl text-sm font-bold hover:bg-[#E66100] transition-colors">
                  <Map className="w-4 h-4" /> Google Maps
                </a>
                <a href={`https://www.openstreetmap.org/?mlat=${formData.latitude}&mlon=${formData.longitude}#map=16/${formData.latitude}/${formData.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-xl text-sm font-bold hover:bg-[#F6F7F9] transition-colors">
                  <MapPin className="w-4 h-4" /> OpenStreetMap
                </a>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                Vérifiez que le marqueur correspond bien à votre commerce. Sinon réessayez la géolocalisation.
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

export default RelayApplicationPage;
