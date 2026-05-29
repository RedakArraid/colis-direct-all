import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-[#1A1A1A] bg-opacity-75" onClick={onClose}></div>

        <div className={`inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E6E6E6] flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-[#1A1A1A]">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#3A3A3A] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="bg-white px-4 sm:px-6 py-4 sm:py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

