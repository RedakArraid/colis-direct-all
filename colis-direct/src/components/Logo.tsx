import React from 'react';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const sizeClasses = {
  sm: 'h-10 sm:h-16 w-auto',
  md: 'h-12 sm:h-20 w-auto',
  lg: 'h-16 sm:h-28 w-auto',
  xl: 'h-24 sm:h-40 w-auto',
};

export default function Logo({ showText: _showText = false, size = 'md', className = '', onClick }: LogoProps) {
  const imageSize = sizeClasses[size];

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <a
      href="/"
      aria-label="Aller à l'accueil"
      onClick={handleClick}
      className={`flex flex-col items-center ${className.replace('text-white', '').trim()}`}
    >
      <img
        src="/logo.png"
        alt="COLISDIRECT Logo"
        className={`${imageSize} object-contain drop-shadow-sm border-0 outline-none`}
        style={{ border: 'none', outline: 'none' }}
      />
    </a>
  );
}
