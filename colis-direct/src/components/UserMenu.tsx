import { useEffect, useState } from 'react';
import { Settings, Package2, MapPin, Receipt, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useUserSpace, userHasDualClientProAccess } from '../contexts/UserSpaceContext';

interface UserMenuProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  badges?: Record<string, number>;
}

function UserMenu({ currentPage, onNavigate, badges }: UserMenuProps) {
  const { user } = useAuth();
  const { activeSpace } = useUserSpace();
  const [internalBadges, setInternalBadges] = useState<Record<string, number>>({});

  const treatAsClientForSidebar =
    user != null &&
    (user.role === 'client' ||
      (userHasDualClientProAccess(user) && activeSpace === 'client'));

  useEffect(() => {
    if (!user || user.role === 'support' || user.role === 'admin' || !treatAsClientForSidebar) {
      setInternalBadges({});
      return;
    }

    if (badges) {
      setInternalBadges(badges);
      return;
    }

    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const response = await api.getCustomerMessages();
        const unreadCount = Array.isArray(response?.data)
          ? response.data.filter((conversation: any) => conversation.unread).length
          : 0;
        if (!cancelled) {
          setInternalBadges(unreadCount > 0 ? { messageries: unreadCount } : {});
        }
      } catch (error) {
        if (!cancelled) {
          setInternalBadges({});
        }
      }
    };

    fetchUnread();

    return () => {
      cancelled = true;
    };
  }, [user, badges, treatAsClientForSidebar]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (badges) {
        setInternalBadges(badges);
        return;
      }
      const unread = (event as CustomEvent<number>).detail;
      if (typeof unread === 'number') {
        setInternalBadges((prev) => ({
          ...prev,
          messageries: unread,
        }));
      }
    };
    window.addEventListener('customer-messages-unread', handler as EventListener);
    return () => window.removeEventListener('customer-messages-unread', handler as EventListener);
  }, [badges]);

  const menuItems = [
    { id: 'my-profile', label: 'Mon profil', icon: Settings },
    { id: 'my-shipments', label: 'Mes colis', icon: Package2 },
    { id: 'my-address-book', label: 'Carnet', icon: MapPin },
    { id: 'my-purchases', label: 'Achats', icon: Receipt },
    { id: 'messageries', label: 'Messages', icon: MessageSquare },
  ];

  const activeBadges = badges ?? internalBadges;

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block bg-white border-r border-[#E6E6E6] w-64 min-h-screen p-4 flex-shrink-0">
        <h2 className="text-lg font-extrabold tracking-tight text-[#1A1A1A] mb-6">Mon espace</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const badgeCount = activeBadges?.[item.id];

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-[#FF6C00] text-white'
                    : 'text-[#3A3A3A] hover:bg-[#F0F0F0]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </span>
                {badgeCount ? (
                  <span
                    className={`inline-flex min-w-[20px] h-5 text-xs font-semibold items-center justify-center rounded-full ${
                      isActive ? 'bg-white text-[#FF6C00]' : 'bg-[#FF6C00] text-white'
                    }`}
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E6E6E6] flex items-stretch h-16 safe-area-pb">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const badgeCount = activeBadges?.[item.id];

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative ${
                isActive ? 'text-[#FF6C00]' : 'text-[#6B7280]'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badgeCount ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-[14px] h-[14px] text-[10px] font-bold items-center justify-center rounded-full bg-[#FF6C00] text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-[56px]">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-[#FF6C00] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

export default UserMenu;
