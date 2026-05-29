/**
 * Types communs pour les pages de l'application
 */

/**
 * Props de base pour toutes les pages
 * onNavigate est optionnel car certaines pages ne font pas de navigation interne
 */
export interface BasePageProps {
  onNavigate?: (page: string) => void;
}

/**
 * Interface pour une adresse (expéditeur ou destinataire)
 */
export interface Address {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  commune: string;
  quartier: string;
  address: string;
  is_default?: boolean;
}

/**
 * Statuts de chargement pour les pages
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Props pour les composants qui affichent des erreurs
 */
export interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
}

/**
 * Props pour les composants qui affichent des messages de succès
 */
export interface SuccessDisplayProps {
  success: string | null;
  onDismiss?: () => void;
}

