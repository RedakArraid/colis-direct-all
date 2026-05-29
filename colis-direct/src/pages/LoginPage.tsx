import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Phone, Building2, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSpace, userHasDualClientProAccess } from '../contexts/UserSpaceContext';
import Chatbot from '../components/Chatbot';
import Logo from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import PhoneInput from '../components/PhoneInput';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { setActiveSpace, activeSpace } = useUserSpace();
  const { theme, setTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [showSpaceChooser, setShowSpaceChooser] = useState(false);
  const [email, setEmail] = useState('');
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  // Le rôle est toujours 'client' pour les nouveaux comptes
  const [, setIsPro] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) { setLockedUntil(null); setError(''); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (user && justLoggedIn) {
      if (userHasDualClientProAccess(user)) {
        setShowSpaceChooser(true);
        return;
      }
      if (user.role === 'admin') {
        onNavigate('admin-dashboard');
      } else if (user.role === 'support') {
        onNavigate('support-dashboard');
      } else if (user.role === 'relay_partner') {
        onNavigate('relay-dashboard');
      } else if (user.role === 'transporter') {
        onNavigate('transporter-login');
      } else {
        onNavigate('home');
      }
      setJustLoggedIn(false);
    }
  }, [user, justLoggedIn, onNavigate]);

  /** Déjà connecté : évite formulaire + modale figée après F5 ou clic « Connexion ». */
  useEffect(() => {
    if (authLoading || !user || justLoggedIn || showSpaceChooser || successMessage) {
      return;
    }

    if (userHasDualClientProAccess(user)) {
      setShowSpaceChooser(false);
      if (activeSpace === 'pro') {
        onNavigate('pro-dashboard');
      } else {
        onNavigate('home');
      }
      return;
    }

    if (user.role === 'admin') {
      onNavigate('admin-dashboard');
    } else if (user.role === 'support') {
      onNavigate('support-dashboard');
    } else if (user.role === 'relay_partner') {
      onNavigate('relay-dashboard');
    } else if (user.role === 'transporter') {
      onNavigate('transporter-login');
    } else {
      onNavigate('home');
    }
  }, [authLoading, user, justLoggedIn, showSpaceChooser, successMessage, activeSpace, onNavigate]);

  // Forcer le mode professionnel quand le thème est sur "pro"
  useEffect(() => {
    if (theme === 'pro') {
      setIsLogin(true); // toujours page de connexion
      setIsPro(true);
    }
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        if (loginMode === 'email') {
          await signIn(loginEmail.trim(), password, false);
        } else {
          await signIn(loginPhone, password, true);
        }
        setJustLoggedIn(true);
      } else {
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères');
          setLoading(false);
          return;
        }

        if (!firstName || !lastName || !phone) {
          setError('Veuillez remplir tous les champs');
          setLoading(false);
          return;
        }

        await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
          phone,
          role: 'client', // Toujours créer un compte client
        });

        setSuccessMessage('Compte créé avec succès! Vous pouvez maintenant vous connecter.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
      }
    } catch (err: any) {
      const msg: string = err.message || 'Une erreur est survenue';
      if (msg.startsWith('RATE_LIMIT:')) {
        const seconds = parseInt(msg.split(':')[1], 10) || 300;
        setLockedUntil(Date.now() + seconds * 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setError(`Trop de tentatives. Réessayez dans ${mins > 0 ? `${mins}m ` : ''}${secs}s.`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChooseClientSpace = () => {
    setActiveSpace('client');
    setTheme('standard');
    setShowSpaceChooser(false);
    setJustLoggedIn(false);
    onNavigate('home');
  };

  const handleChooseProSpace = () => {
    setActiveSpace('pro');
    setTheme('pro');
    setShowSpaceChooser(false);
    setJustLoggedIn(false);
    onNavigate('pro-dashboard');
  };

  return (
    <>
    <div className={`min-h-screen flex ${theme === 'pro' ? 'bg-gradient-to-br from-green-50 to-green-100' : ''}`}>
      {/* Left panel — dark brand side (hidden on mobile) */}
      {theme !== 'pro' && (
        <div
          className="hidden lg:flex flex-col justify-between w-1/2 min-h-screen"
          style={{ background: '#0f0f0f', padding: 48 }}
        >
          <div>
            <Logo size="sm" showText className="text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1, margin: 0, color: '#fff' }}>
              Bienvenue sur COLISDIRECT
            </h1>
            <p style={{ fontSize: 16, marginTop: 14, opacity: 0.92, maxWidth: 380, color: '#fff' }}>
              Connectez-vous pour envoyer, suivre et recevoir vos colis en toute simplicité.
            </p>
            <div
              style={{
                marginTop: 32, borderRadius: 18,
                background: 'rgba(255,255,255,0.18)',
                height: 260,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="text-white/30 text-sm font-mono tracking-widest uppercase">COLISDIRECT</span>
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, color: '#fff' }}>© 2026 COLISDIRECT — Côte d'Ivoire</div>
        </div>
      )}

      {/* Right panel — form */}
      <div className={`flex-1 flex items-center justify-center py-10 px-4 sm:px-8 ${theme === 'pro' ? 'w-full' : ''} min-h-screen bg-white`}>
      <div className="max-w-md w-full">
        <div className="bg-white">
          {/* Mobile logo (only visible on small screens where left panel is hidden) */}
          <div className="lg:hidden text-center mb-8">
            <Logo size="md" showText />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
              {theme === 'pro' ? 'Connexion Professionnelle' : isLogin ? 'Se connecter' : 'Créer un compte'}
            </h2>
            <p className="text-sm text-[#6B7280] mt-2">
              {theme === 'pro'
                ? 'Accédez à votre espace entreprise COLISDIRECT'
                : isLogin
                  ? (<>Pas encore de compte ?{' '}<button onClick={() => setIsLogin(false)} className="text-[#FF6C00] font-bold hover:underline">S'inscrire</button></>)
                  : (<>Déjà un compte ?{' '}<button onClick={() => setIsLogin(true)} className="text-[#FF6C00] font-bold hover:underline">Se connecter</button></>)}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-800">
                {lockedUntil
                  ? `Trop de tentatives. Réessayez dans ${Math.floor(lockCountdown / 60) > 0 ? `${Math.floor(lockCountdown / 60)}m ` : ''}${lockCountdown % 60}s.`
                  : error}
              </p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[#3A3A3A] mb-2">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Votre prénom"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-[#D1D5DB] rounded-lg focus:ring-2 ${theme === 'pro' ? 'focus:ring-green-600' : 'focus:ring-[#FF6C00]'} focus:border-transparent transition-colors`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[#3A3A3A] mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Votre nom"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-[#D1D5DB] rounded-lg focus:ring-2 ${theme === 'pro' ? 'focus:ring-green-600' : 'focus:ring-[#FF6C00]'} focus:border-transparent transition-colors`}
                    />
                  </div>
                </div>

                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                  label={
                    <span className="text-xs sm:text-sm font-medium text-[#3A3A3A] flex items-center gap-1">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                      Téléphone
                    </span>
                  }
                  className={`[&_input]:text-sm sm:[&_input]:text-base [&_input]:py-2 sm:[&_input]:py-3 [&_input]:border-2 [&_select]:border-2 ${theme === 'pro' ? '[&_input]:focus:ring-green-600 [&_select]:focus:ring-green-600' : '[&_input]:focus:ring-[#FF6C00] [&_select]:focus:ring-[#FF6C00]'}`}
                />
              </>
            )}

            {isLogin && (
              <div className="flex flex-col gap-2">
                <span className="text-xs sm:text-sm font-medium text-[#3A3A3A]">Connexion avec</span>
                <div
                  className={`flex rounded-lg border-2 border-[#D1D5DB] p-1 gap-1 ${theme === 'pro' ? 'border-green-200' : ''}`}
                  role="group"
                  aria-label="Mode de connexion"
                >
                  <button
                    type="button"
                    onClick={() => setLoginMode('email')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      loginMode === 'email'
                        ? theme === 'pro'
                          ? 'bg-green-600 text-white'
                          : 'bg-[#FF6C00] text-white'
                        : 'text-[#6B7280] hover:bg-[#F6F7F9]'
                    }`}
                  >
                    E-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('phone')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      loginMode === 'phone'
                        ? theme === 'pro'
                          ? 'bg-green-600 text-white'
                          : 'bg-[#FF6C00] text-white'
                        : 'text-[#6B7280] hover:bg-[#F6F7F9]'
                    }`}
                  >
                    Téléphone
                  </button>
                </div>
              </div>
            )}

            {isLogin && loginMode === 'email' ? (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#3A3A3A] mb-2">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  E-mail
                </label>
                <input
                  type="text"
                  inputMode="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-[#D1D5DB] rounded-lg focus:ring-2 ${theme === 'pro' ? 'focus:ring-green-600' : 'focus:ring-[#FF6C00]'} focus:border-transparent transition-colors`}
                />
              </div>
            ) : isLogin ? (
              <PhoneInput
                value={loginPhone}
                onChange={setLoginPhone}
                required
                label={
                  <span className="text-xs sm:text-sm font-medium text-[#3A3A3A] flex items-center gap-1">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                    Numéro de téléphone
                  </span>
                }
                className={`[&_input]:text-sm sm:[&_input]:text-base [&_input]:py-2 sm:[&_input]:py-3 [&_input]:border-2 [&_select]:border-2 ${theme === 'pro' ? '[&_input]:focus:ring-green-600 [&_select]:focus:ring-green-600' : '[&_input]:focus:ring-[#FF6C00] [&_select]:focus:ring-[#FF6C00]'}`}
              />
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#3A3A3A] mb-2">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-[#D1D5DB] rounded-lg focus:ring-2 ${theme === 'pro' ? 'focus:ring-green-600' : 'focus:ring-[#FF6C00]'} focus:border-transparent transition-colors`}
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#3A3A3A] mb-2">
                <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-[#D1D5DB] rounded-lg focus:ring-2 ${theme === 'pro' ? 'focus:ring-green-600' : 'focus:ring-[#FF6C00]'} focus:border-transparent transition-colors pr-10 sm:pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#3A3A3A]"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 border-2 border-[#D1D5DB] rounded-lg focus:ring-2 ${theme === 'pro' ? 'focus:ring-green-600' : 'focus:ring-[#FF6C00]'} focus:border-transparent transition-colors`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!lockedUntil}
              className={`w-full ${theme === 'pro' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#FF6C00] hover:bg-[#E66100]'} text-white py-3.5 px-6 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
            >
              {loading
                ? 'Chargement...'
                : lockedUntil
                  ? `Attendre ${Math.floor(lockCountdown / 60) > 0 ? `${Math.floor(lockCountdown / 60)}m ` : ''}${lockCountdown % 60}s`
                  : isLogin
                    ? 'Se connecter'
                    : 'Créer mon compte'}
            </button>
          </form>

          {/* Social login — visual only */}
          {theme !== 'pro' && isLogin && (
            <div className="mt-6">
              <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                <div className="flex-1 h-px bg-[#E6E6E6]" />
                ou continuer avec
                <div className="flex-1 h-px bg-[#E6E6E6]" />
              </div>
              <div className="flex gap-3 mt-4">
                {['Google', 'Apple', 'Facebook'].map((p) => (
                  <button key={p} className="flex-1 py-2.5 bg-white border border-[#E6E6E6] rounded-xl text-sm font-semibold text-[#3A3A3A] hover:bg-[#F6F7F9] transition-colors">{p}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                if (showSpaceChooser && user && userHasDualClientProAccess(user)) {
                  handleChooseClientSpace();
                  return;
                }
                onNavigate('home');
              }}
              className="text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
            >
              ← Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
      </div>
      <Chatbot />
    </div>

    {showSpaceChooser && user && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="space-chooser-title">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
          <h2 id="space-chooser-title" className="text-xl sm:text-2xl font-bold text-[#1A1A1A] text-center mb-2">
            Où souhaitez-vous aller ?
          </h2>
          <p className="text-sm text-[#6B7280] text-center mb-6">
            Votre compte permet d’accéder à l’espace particulier et à l’espace professionnel.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleChooseClientSpace}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#FF6C00] text-[#FF6C00] font-semibold hover:bg-orange-50 transition-colors"
            >
              <Package className="w-5 h-5" />
              Espace client
            </button>
            <button
              type="button"
              onClick={handleChooseProSpace}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
            >
              <Building2 className="w-5 h-5" />
              Espace pro
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default LoginPage;
