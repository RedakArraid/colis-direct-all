import { useEffect, useState, useRef } from 'react';
import {
  User, LogOut, Menu, X, Settings, Package2, MapPin,
  Receipt, MessageSquare, Building2, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSpace, userHasDualClientProAccess } from '../contexts/UserSpaceContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';
import CartIcon from './CartIcon';
import { api } from '../lib/api';

type PageType =
  | 'home' | 'how-it-works' | 'become-relay' | 'relay-application' | 'become-transporter'
  | 'pricing' | 'tracking' | 'map' | 'about' | 'create-shipment'
  | 'login' | 'admin-dashboard' | 'relay-dashboard' | 'transporter-login'
  | 'transporter-pickup' | 'pro-dashboard' | 'support-dashboard'
  | 'my-profile' | 'my-shipments' | 'my-address-book' | 'my-addresses'
  | 'my-purchases' | 'messageries' | 'cart' | 'career';

interface HeaderProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const NAV_ITEMS: { id: PageType; label: string }[] = [
  { id: 'home',            label: 'Accueil' },
  { id: 'create-shipment', label: 'Envoyer un colis' },
  { id: 'tracking',        label: 'Suivi de colis' },
  { id: 'map',             label: 'Points relais' },
  { id: 'become-relay',   label: 'Devenir partenaire' },
  { id: 'about',           label: 'À propos' },
];

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { activeSpace, setActiveSpace } = useUserSpace();
  useCart();

  const [mobileOpen, setMobileOpen]           = useState(false);
  const [userMenuOpen, setUserMenuOpen]        = useState(false);
  const [unreadMessages, setUnreadMessages]    = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const dualAccess    = user != null && userHasDualClientProAccess(user);
  const showClientMenu = user != null && (user.role === 'client' || (dualAccess && activeSpace === 'client'));

  /* ── logout ── */
  const handleLogout = async () => {
    await signOut();
    onNavigate('home');
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  /* ── pro toggle ── */
  const handleSwitchToPro = () => {
    if (user?.role === 'pro' || user?.is_pro) {
      setActiveSpace('pro');
      setTheme('pro');
      onNavigate('pro-dashboard');
    } else {
      onNavigate('login');
    }
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  /* ── close user menu on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [userMenuOpen]);

  /* ── unread messages count ── */
  useEffect(() => {
    let cancelled = false;
    if (!user || !showClientMenu) { setUnreadMessages(0); return; }
    api.getCustomerMessages().then(({ data }) => {
      if (!cancelled && Array.isArray(data)) {
        setUnreadMessages(data.filter((c: any) => c.unread).length);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user, showClientMenu]);

  useEffect(() => {
    const h = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === 'number') setUnreadMessages(n);
    };
    window.addEventListener('customer-messages-unread', h as EventListener);
    return () => window.removeEventListener('customer-messages-unread', h as EventListener);
  }, []);

  /* ── lock body scroll when mobile open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (id: PageType) => currentPage === id;

  return (
    <>
      <header className="bg-white border-b border-[#E6E6E6] sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16 sm:h-[68px]">

            {/* ── Logo ── */}
            <div className="flex-shrink-0">
              <Logo size="sm" showText onClick={() => onNavigate('home')} />
            </div>

            {/* ── Desktop nav ── */}
            <nav className="hidden lg:flex items-center gap-7">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(item.id)
                      ? 'text-[#FF6C00] font-bold'
                      : 'text-[#3A3A3A] hover:text-[#FF6C00]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* ── Desktop right ── */}
            <div className="hidden lg:flex items-center gap-3">
              <CartIcon onClick={() => onNavigate('cart')} />

              {user ? (
                /* Logged-in user menu */
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E6E6E6] hover:border-[#FF6C00] hover:bg-[#FFF3E8] transition-all text-sm font-semibold text-[#1A1A1A]"
                    aria-label="Mon compte"
                  >
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-[#FFF3E8] flex items-center justify-center">
                        <User className="w-4 h-4 text-[#FF6C00]" />
                      </div>
                      {unreadMessages > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                      )}
                    </div>
                    <span className="max-w-[120px] truncate">{user.first_name || user.email}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-card-hover border border-[#E6E6E6] py-2 z-50 animate-fade-in">
                      {dualAccess && (
                        <>
                          <button
                            type="button"
                            onClick={handleSwitchToPro}
                            className="w-full px-4 py-2.5 text-left text-sm text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors"
                          >
                            <Building2 className="w-4 h-4 text-[#FF6C00]" />
                            Espace professionnel
                          </button>
                          <div className="border-t border-[#E6E6E6] my-1" />
                        </>
                      )}
                      {showClientMenu && (
                        <>
                          <button onClick={() => { onNavigate('my-profile'); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors">
                            <Settings className="w-4 h-4 text-[#6B7280]" /> Mon profil
                          </button>
                          <button onClick={() => { onNavigate('my-shipments'); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors">
                            <Package2 className="w-4 h-4 text-[#6B7280]" /> Mes colis
                          </button>
                          <button onClick={() => { onNavigate('my-address-book'); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors">
                            <MapPin className="w-4 h-4 text-[#6B7280]" /> Mon carnet d'adresses
                          </button>
                          <button onClick={() => { onNavigate('my-purchases'); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors">
                            <Receipt className="w-4 h-4 text-[#6B7280]" /> Mes achats
                          </button>
                          <button onClick={() => { onNavigate('messageries'); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors">
                            <MessageSquare className="w-4 h-4 text-[#6B7280]" /> Messageries
                            {unreadMessages > 0 && (
                              <span className="ml-auto inline-flex min-w-[18px] h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                {unreadMessages}
                              </span>
                            )}
                          </button>
                          <div className="border-t border-[#E6E6E6] my-1" />
                        </>
                      )}
                      <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <LogOut className="w-4 h-4" /> Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Not logged in */
                <>
                  <button
                    onClick={() => onNavigate('login')}
                    className="text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6C00] transition-colors px-3 py-2"
                  >
                    Se connecter
                  </button>
                  <button
                    onClick={() => onNavigate('login')}
                    className="bg-[#FF6C00] hover:bg-[#E66100] text-white rounded-lg px-4 py-2 text-sm font-bold transition-colors"
                  >
                    S'inscrire
                  </button>
                </>
              )}
            </div>

            {/* ── Mobile right ── */}
            <div className="lg:hidden flex items-center gap-2">
              <CartIcon onClick={() => onNavigate('cart')} />
              <button
                className="p-2 rounded-xl hover:bg-[#F6F7F9] transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[88vw] bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E6E6]">
              <Logo size="sm" showText />
              <button
                className="p-2 rounded-xl hover:bg-[#F6F7F9] transition-colors"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(item.id)
                      ? 'bg-[#FFF3E8] text-[#FF6C00] font-bold'
                      : 'text-[#3A3A3A] hover:bg-[#F6F7F9]'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* If user is logged in — client links */}
              {user && showClientMenu && (
                <>
                  <div className="border-t border-[#E6E6E6] my-3" />
                  <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-4 py-1">Mon compte</p>
                  {[
                    { id: 'my-profile' as PageType,      label: 'Mon profil',          icon: Settings },
                    { id: 'my-shipments' as PageType,    label: 'Mes colis',           icon: Package2 },
                    { id: 'my-address-book' as PageType, label: "Carnet d'adresses",   icon: MapPin },
                    { id: 'my-purchases' as PageType,    label: 'Mes achats',          icon: Receipt },
                    { id: 'messageries' as PageType,     label: 'Messageries',         icon: MessageSquare },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { onNavigate(id); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[#6B7280]" />
                      {label}
                      {id === 'messageries' && unreadMessages > 0 && (
                        <span className="ml-auto inline-flex min-w-[18px] h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {unreadMessages}
                        </span>
                      )}
                    </button>
                  ))}

                  {dualAccess && (
                    <button
                      onClick={handleSwitchToPro}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[#3A3A3A] hover:bg-[#F6F7F9] flex items-center gap-3 transition-colors"
                    >
                      <Building2 className="w-4 h-4 text-[#FF6C00]" />
                      Espace professionnel
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="p-4 border-t border-[#E6E6E6] space-y-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { onNavigate('login'); setMobileOpen(false); }}
                    className="w-full btn-primary text-sm py-3"
                  >
                    S'inscrire gratuitement
                  </button>
                  <button
                    onClick={() => { onNavigate('login'); setMobileOpen(false); }}
                    className="w-full text-sm font-semibold text-[#3A3A3A] py-3 hover:text-[#FF6C00] transition-colors"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
