import { useState } from 'react';
import { Package, FileText, Shield, Search, MapPin, Home } from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { usePricing } from '../hooks/usePricing';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

type DeliveryMode = 'relay' | 'home';
type PricingTab = 'courier' | 'colis' | 'options';
type ColisSize = 'petit' | 'moyen' | 'grand';

function PricingPage({ onNavigate }: PricingPageProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('relay');
  const [activeTab, setActiveTab] = useState<PricingTab>('courier');
  const [colisSize, setColisSize] = useState<ColisSize>('petit');
  const { grids, options, loading, error } = usePricing();

  const handleTrackPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      localStorage.setItem('trackingNumber', trackingNumber.trim());
      onNavigate('tracking');
    }
  };

  const filteredGrids = grids.filter(g => {
    if (!g.is_active) return false;
    if (g.delivery_mode && g.delivery_mode !== deliveryMode) return false;
    if (activeTab === 'courier') return g.grid_type === 'courier' && !g.package_size;
    if (activeTab === 'colis') return g.grid_type === 'colis' && g.package_size === colisSize;
    return false;
  });
  const activeOptions = options.filter(o => o.is_active);

  const formatPrice = (price: number) => new Intl.NumberFormat('fr-FR').format(price);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FF6C00] to-[#FF8C33] text-white py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Des tarifs simples et accessibles
          </h1>
          <p className="text-xl text-white/90">À partir de 600 FCFA — pas de frais cachés.</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Mode + tab filters */}
          <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-[#E6E6E6] mb-8">
            {/* Delivery mode pills */}
            <button
              onClick={() => setDeliveryMode('relay')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                deliveryMode === 'relay' ? 'bg-[#FF6C00] text-white' : 'bg-[#F6F7F9] text-[#6B7280] hover:bg-[#E6E6E6]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Point Relais
            </button>
            <button
              onClick={() => setDeliveryMode('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                deliveryMode === 'home' ? 'bg-[#FF6C00] text-white' : 'bg-[#F6F7F9] text-[#6B7280] hover:bg-[#E6E6E6]'
              }`}
            >
              <Home className="w-4 h-4" />
              Domicile
            </button>

            <div className="w-px h-6 bg-[#E6E6E6] mx-1" />

            {/* Tab buttons */}
            {(['courier', 'colis', 'options'] as PricingTab[]).map((tab) => {
              const labels: Record<PricingTab, string> = { courier: 'Courrier', colis: 'Colis', options: 'Options' };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-1 px-1 font-bold text-sm border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[#FF6C00] text-[#FF6C00]'
                      : 'border-transparent text-[#6B7280] hover:text-[#3A3A3A]'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Colis size sub-tabs */}
          {activeTab === 'colis' && (
            <div className="flex gap-3 mb-6">
              {([
                { id: 'petit' as ColisSize, label: 'Petit (0 - 5 kg)', icon: Package },
                { id: 'moyen' as ColisSize, label: 'Moyen (5.5 - 10 kg)', icon: Package },
                { id: 'grand' as ColisSize, label: 'Grand (> 10 kg)', icon: Package },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setColisSize(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                    colisSize === id
                      ? 'border-[#FF6C00] bg-[#FFF3E8] text-[#FF6C00]'
                      : 'border-[#E6E6E6] bg-white text-[#6B7280] hover:border-[#FF6C00]/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Pricing content */}
          <div className="mb-12">
            {(activeTab === 'courier' || activeTab === 'colis') && (
              <div className="card p-7">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#FF6C00] rounded-xl flex items-center justify-center">
                    {activeTab === 'courier' ? (
                      <FileText className="w-7 h-7 text-white" />
                    ) : (
                      <Package className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1A1A1A]">
                      {activeTab === 'courier' ? 'Courrier / Document' :
                       `Colis — ${colisSize === 'petit' ? 'Petit' : colisSize === 'moyen' ? 'Moyen' : 'Grand'}`}
                    </h2>
                    <p className="text-sm text-[#6B7280]">
                      {deliveryMode === 'relay' ? 'Livraison en point relais' : 'Livraison à domicile'}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00]" />
                    <p className="mt-4 text-[#6B7280]">Chargement des tarifs...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600 font-semibold mb-2">Erreur de chargement</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 btn-primary text-sm py-2 px-4"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : filteredGrids.length > 0 ? (
                  <div className="space-y-4">
                    {filteredGrids.map((grid) => (
                      <div key={grid.id} className="bg-[#F6F7F9] p-5 rounded-xl">
                        <div className="text-sm font-semibold text-[#3A3A3A] mb-3">
                          {grid.weight_min === 0 ? 'Jusqu\'à' : `${grid.weight_min} — `}{grid.weight_max} kg
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-xl border border-[#E6E6E6]">
                            <div className="text-xs text-[#6B7280] mb-1">Intra commune</div>
                            <div className="text-2xl font-extrabold text-[#FF6C00]">
                              {formatPrice(grid.price_intra_commune)} <span className="text-sm font-semibold">FCFA</span>
                            </div>
                            {grid.supplement_per_kg_intra > 0 && (
                              <div className="text-xs text-[#6B7280] mt-1">
                                +{formatPrice(grid.supplement_per_kg_intra)} FCFA/kg supplémentaire
                              </div>
                            )}
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-[#E6E6E6]">
                            <div className="text-xs text-[#6B7280] mb-1">Inter commune</div>
                            <div className="text-2xl font-extrabold text-[#FF6C00]">
                              {formatPrice(grid.price_inter_commune)} <span className="text-sm font-semibold">FCFA</span>
                            </div>
                            {grid.supplement_per_kg_inter > 0 && (
                              <div className="text-xs text-[#6B7280] mt-1">
                                +{formatPrice(grid.supplement_per_kg_inter)} FCFA/kg supplémentaire
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#F6F7F9] p-6 rounded-xl">
                    <p className="text-[#6B7280] text-sm mb-4">
                      Aucun tarif configuré pour ce mode de livraison — tarifs indicatifs :
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <div className="bg-white p-4 rounded-xl border border-[#E6E6E6]">
                        <div className="text-xs text-[#6B7280] mb-1">Intra commune</div>
                        <div className="text-2xl font-extrabold text-[#FF6C00]">
                          {activeTab === 'courier' ? '600' :
                           colisSize === 'petit' ? '1 000' :
                           colisSize === 'moyen' ? '1 500' : '2 000'} <span className="text-sm font-semibold">FCFA</span>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-[#E6E6E6]">
                        <div className="text-xs text-[#6B7280] mb-1">Inter commune</div>
                        <div className="text-2xl font-extrabold text-[#FF6C00]">
                          {activeTab === 'courier' ? '1 000' :
                           colisSize === 'petit' ? '1 500' :
                           colisSize === 'moyen' ? '2 000' : '2 500'} <span className="text-sm font-semibold">FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'options' && (
              <div className="card p-7">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#FF6C00] rounded-xl flex items-center justify-center">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1A1A1A]">Options supplémentaires</h2>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00]" />
                  </div>
                ) : activeOptions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {activeOptions.map((option) => (
                      <div key={option.id} className="bg-[#F6F7F9] rounded-xl p-5 text-center">
                        <div className="trust-icon mx-auto mb-3">
                          <Shield className="w-5 h-5 text-[#FF6C00]" />
                        </div>
                        <h3 className="font-bold text-sm text-[#1A1A1A] mb-1">{option.option_name}</h3>
                        <p className="text-2xl font-extrabold text-[#FF6C00] mb-1">
                          {option.price_type === 'fixed'
                            ? `${formatPrice(option.price_value)} FCFA`
                            : `${option.price_value}%`}
                        </p>
                        {option.option_description && (
                          <p className="text-xs text-[#6B7280]">{option.option_description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                      { icon: Package, name: 'Colis fragile', price: '500 FCFA', desc: 'Manipulation délicate' },
                      { icon: Shield, name: 'Assurance complète', price: '1 500 FCFA', desc: 'Rembourse la valeur totale' },
                      { icon: Shield, name: 'Assurance de base', price: '25%', desc: 'De la valeur totale du colis' },
                    ].map((o) => (
                      <div key={o.name} className="bg-[#F6F7F9] rounded-xl p-5 text-center">
                        <div className="trust-icon mx-auto mb-3">
                          <o.icon className="w-5 h-5 text-[#FF6C00]" />
                        </div>
                        <h3 className="font-bold text-sm text-[#1A1A1A] mb-1">{o.name}</h3>
                        <p className="text-2xl font-extrabold text-[#FF6C00] mb-1">{o.price}</p>
                        <p className="text-xs text-[#6B7280]">{o.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tracking section */}
          <div className="bg-[#F6F7F9] rounded-2xl p-7 mb-10">
            <h2 className="text-xl font-extrabold text-[#1A1A1A] text-center mb-5">Suivre mon colis</h2>
            <form onSubmit={handleTrackPackage} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Entrez votre numéro de suivi"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap">
                <Search className="w-4 h-4" />
                Suivre
              </button>
            </form>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-[#6B7280] mb-5">Prêt à envoyer votre colis ?</p>
            <button
              onClick={() => onNavigate('create-shipment')}
              className="btn-primary px-10 py-4 text-base shadow-lg"
            >
              Créer un envoi
            </button>
          </div>
        </div>
      </section>
      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

export default PricingPage;
