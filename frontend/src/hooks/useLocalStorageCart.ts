import { useEffect, useState } from 'react';

const CART_KEY = 'fashion-cart';

export const useLocalStorageCart = () => {
  const [cart, setCart] = useState(() => {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  return { cart, setCart };
};
