/**
 * Composant de chargement réutilisable
 * Standardise l'affichage du loading dans toute l'application
 */

interface LoadingSpinnerProps {
  /** Texte à afficher sous le spinner */
  message?: string;
  /** Taille du spinner : 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Couleur du spinner */
  color?: 'primary' | 'gray' | 'white';
  /** Affichage en plein écran ou inline */
  fullScreen?: boolean;
  /** Classe CSS supplémentaire */
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 border-b-2',
  md: 'h-8 w-8 border-b-2',
  lg: 'h-16 w-16 border-b-4',
};

const colorClasses = {
  primary: 'border-[#FF6C00]',
  gray: 'border-[#6B7280]',
  white: 'border-white',
};

function LoadingSpinner({
  message = 'Chargement...',
  size = 'md',
  color = 'primary',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className={`text-center ${className}`}>
      <div className="flex justify-center">
        <div
          className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className.includes('mx-auto') ? '' : 'mx-auto'}`}
        ></div>
      </div>
      {message && (
        <p className={`mt-4 text-[#6B7280] ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
}

export default LoadingSpinner;

