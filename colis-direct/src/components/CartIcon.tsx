import { ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface CartIconProps {
  onClick: () => void;
}

function CartIcon({ onClick }: CartIconProps) {
  const { getTotalItems } = useCart();
  const itemCount = getTotalItems();

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#F6F7F9] hover:bg-[#E6E6E6] transition-colors cursor-pointer"
      aria-label="Panier"
    >
      <ShoppingCart className="w-5 h-5 text-[#3A3A3A]" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-[#FF6C00] text-white text-xs font-bold rounded-full">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
}

export default CartIcon;

