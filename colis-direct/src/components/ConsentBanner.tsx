import { useState, useEffect } from 'react';
import { Shield, X, Check } from 'lucide-react';

const CONSENT_KEY = 'colisdirect_cndp_consent';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setTimeout(() => setVisible(true), 1500);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString(), version: '1.0' }));
    setVisible(false);
  };

  const refuse = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString(), version: '1.0' }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-5">
      <div className="max-w-4xl mx-auto bg-white border border-[#E6E6E6] rounded-xl shadow-2xl">
        <div className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-[#FF6C00] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#1A1A1A] text-sm md:text-base">
                Protection de vos données — CNDP Côte d'Ivoire
              </h3>
              <p className="text-sm text-[#6B7280] mt-1">
                Conformément à la loi ivoirienne n°2013-450, Colis Direct collecte vos données (nom, téléphone, adresse) uniquement pour traiter vos expéditions. Vos données ne sont pas revendues.{' '}
                <button onClick={() => setShowDetails(!showDetails)} className="text-[#FF6C00] underline hover:no-underline">
                  {showDetails ? 'Masquer' : 'En savoir plus'}
                </button>
              </p>
              {showDetails && (
                <div className="mt-3 p-3 bg-[#F6F7F9] rounded-lg text-xs text-[#6B7280] space-y-1">
                  <p>• <strong>Données collectées :</strong> nom, prénom, téléphone, adresse de livraison</p>
                  <p>• <strong>Finalité :</strong> traitement et suivi des colis, notifications</p>
                  <p>• <strong>Conservation :</strong> 3 ans après la dernière transaction</p>
                  <p>• <strong>Vos droits :</strong> accès, rectification, suppression — contact@colisdirect.ci</p>
                  <p>• <strong>Autorité :</strong> Commission Nationale De protection des Données (CNDP-CI)</p>
                </div>
              )}
            </div>
            <button onClick={refuse} className="text-[#9CA3AF] hover:text-[#6B7280] flex-shrink-0" aria-label="Fermer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-end">
            <button
              onClick={refuse}
              className="px-4 py-2 text-sm text-[#3A3A3A] border border-[#E6E6E6] rounded-lg hover:bg-[#F6F7F9] transition-colors"
            >
              Refuser le non-essentiel
            </button>
            <button
              onClick={accept}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors font-medium"
            >
              <Check className="w-4 h-4" />
              Accepter et continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
