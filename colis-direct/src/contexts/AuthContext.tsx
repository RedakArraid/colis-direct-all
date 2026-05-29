import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';
import { clearStoredActiveSpace } from '../utils/userSpace';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'client' | 'relay_partner' | 'transporter' | 'support' | 'pro';
  relay_point_id?: string;
  is_pro?: boolean;
  address?: string;
  commune?: string;
  quartier?: string;
  ville?: string;
  complement_adresse?: string;
  country_code?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (emailOrPhone: string, password: string, usePhone?: boolean) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    // Listen for token invalid events from API client
    const handleTokenInvalid = () => {
      setUser(null);
      setLoading(false);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:token-invalid', handleTokenInvalid);
    }
    
    // Polling périodique pour revalider le token (toutes les 60 secondes)
    // L'interval est toujours créé mais checkUser() est no-op si pas de token
    const interval = setInterval(() => {
      if (localStorage.getItem('auth_token')) {
        checkUser();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:token-invalid', handleTokenInvalid);
      }
    };
  }, []);

  async function checkUser() {
    try {
      // Ne pas appeler l'API si pas de token (utilisateur non connecté)
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data, error } = await api.getCurrentUser();

      if (data && !error) {
        setUser(data as User);
      } else {
        // Silently handle 401 errors (user not authenticated) - this is normal
        // Only log if it's not a 401/authentication error
        if (error && !error.includes('401') && !error.includes('Non autorisé') && !error.includes('Authentication required')) {
          console.warn('Auth check error:', error);
        }
        setUser(null);
        // Si le token est invalide, le supprimer
        if (error && (error.includes('401') || error.includes('Non autorisé') || error.includes('Authentication required') || error.includes('Token'))) {
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error: any) {
      // Only log non-401 errors
      const errorMsg = error?.message || error?.toString() || '';
      if (errorMsg && !errorMsg.includes('401') && !errorMsg.includes('Non autorisé') && !errorMsg.includes('Authentication required')) {
        console.error('Error checking user:', error);
      }
      setUser(null);
      // Si le token est invalide, le supprimer
      if (errorMsg && (errorMsg.includes('401') || errorMsg.includes('Non autorisé') || errorMsg.includes('Authentication required') || errorMsg.includes('Token'))) {
        localStorage.removeItem('auth_token');
      }
    } finally {
      setLoading(false);
    }
  }

  async function signIn(emailOrPhone: string, password: string, usePhone: boolean = false) {
    const { data, error } = await api.signIn(emailOrPhone, password, usePhone);

    if (error) {
      throw new Error(error);
    }

    if (data) {
      setUser(data as User);
    }
  }

  async function refreshUser() {
    await checkUser();
  }

  async function signUp(email: string, password: string, userData: Partial<User>) {
    const { data, error } = await api.signUp(email, password, {
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      phone: userData.phone || '',
      role: userData.role || 'client',
    });

    if (error) {
      throw new Error(error);
    }

    if (data) {
      setUser(data as User);
    }
  }

  async function signOut() {
    await api.signOut();
    clearStoredActiveSpace();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During hot-reload, context might be undefined temporarily
    // Return a default context to prevent crashes in development
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.warn('useAuth called outside AuthProvider - returning default context (this may happen during hot-reload)');
      return {
        user: null,
        loading: true,
        signIn: async () => {},
        signUp: async () => {},
        signOut: async () => {},
        refreshUser: async () => {},
      };
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
