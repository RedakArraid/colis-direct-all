import { LogIn, UserPlus } from 'lucide-react';

interface AuthChoiceStepProps {
  onLogin: () => void;
  onContinueWithoutLogin: () => void;
}

function AuthChoiceStep({ onLogin, onContinueWithoutLogin }: AuthChoiceStepProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A] mb-4">Créer un envoi</h2>
        <p className="text-[#6B7280]">Choisissez comment vous souhaitez procéder</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option: Se connecter */}
        <button
          onClick={onLogin}
          className="flex flex-col items-center p-8 border-2 border-[#FF6C00] rounded-xl hover:bg-orange-50 transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <div className="bg-[#FF6C00] rounded-full p-4 mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Se connecter</h3>
          <p className="text-sm text-[#6B7280] text-center">
            Connectez-vous pour que vos informations soient automatiquement pré-remplies
          </p>
        </button>

        {/* Option: Continuer sans se connecter */}
        <button
          onClick={onContinueWithoutLogin}
          className="flex flex-col items-center p-8 border-2 border-[#E6E6E6] rounded-xl hover:bg-[#F6F7F9] transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-[#E6E6E6]"
        >
          <div className="bg-[#E6E6E6] rounded-full p-4 mb-4">
            <UserPlus className="w-8 h-8 text-[#3A3A3A]" />
          </div>
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Continuer sans se connecter</h3>
          <p className="text-sm text-[#6B7280] text-center">
            Remplissez manuellement vos informations pour créer votre envoi
          </p>
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>Conseil :</strong> En vous connectant, vous pourrez suivre tous vos envois et accéder à votre historique.
        </p>
      </div>
    </div>
  );
}

export default AuthChoiceStep;

