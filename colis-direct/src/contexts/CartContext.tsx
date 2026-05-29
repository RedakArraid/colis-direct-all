import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

export interface CartItem {
  id: string;
  formData: any;
  paymentOptions: {
    printOption: 'self' | 'relay';
    needBox: boolean;
    promoCode?: string;
    promoFree?: boolean;
  };
  pickupRelayId?: string | null;
  deliveryRelayId?: string | null;
  price: number;
  printingFee: number;
  boxPrice: number;
  totalPrice: number;
  createdAt: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LS_KEY = 'colisdirect_cart';

function readFromLS(): CartItem[] {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => readFromLS());

  // Track which user's cart is currently loaded to detect user switches
  const loadedUserId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with server on login or user switch
  useEffect(() => {
    if (!user) {
      // Logout: clear in-memory state (each user gets a clean cart)
      if (loadedUserId.current !== null) {
        setItems([]);
        localStorage.removeItem(LS_KEY);
      }
      loadedUserId.current = null;
      return;
    }

    // Same user already loaded — nothing to do
    if (loadedUserId.current === user.id) return;

    // New user (or first login): start with an empty slate, then merge from server
    const previousUserId = loadedUserId.current;
    loadedUserId.current = user.id;

    if (previousUserId !== null) {
      // User switched — clear previous user's cart before loading new one
      setItems([]);
      localStorage.removeItem(LS_KEY);
    }

    let cancelled = false;
    api.getCart().then(({ data, error }) => {
      if (cancelled || error) return;
      const serverItems: CartItem[] = Array.isArray(data) ? data : [];
      setItems((local) => {
        if (serverItems.length === 0 && local.length > 0) {
          // Server empty but local has items — they'll be pushed on next save
          return local;
        }
        if (serverItems.length > 0 && local.length === 0) {
          return serverItems;
        }
        if (serverItems.length > 0 && local.length > 0) {
          // Merge: keep local items not already on server
          const serverIds = new Set(serverItems.map((i) => i.id));
          const localOnly = local.filter((i) => !serverIds.has(i.id));
          return [...serverItems, ...localOnly];
        }
        return local;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Persist to localStorage + debounced server save
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(LS_KEY);
    }

    if (!user || loadedUserId.current !== user.id) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveCart(items).catch(() => {});
    }, 800);
  }, [items, user]);

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const addToCart = (item: CartItem) => {
    setItems((prev) => [...prev, item]);
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(LS_KEY);
    if (user) {
      api.saveCart([]).catch(() => {});
    }
  };

  const getTotalItems = () => items.length;

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const isPromoFree =
        item.paymentOptions.promoFree === true ||
        (item.paymentOptions.promoCode || '').trim().toUpperCase() === 'DKMASSI';
      return total + (isPromoFree ? 0 : item.totalPrice);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
