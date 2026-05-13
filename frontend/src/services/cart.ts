import api from './api';

const notifyCartChanged = () => {
  window.dispatchEvent(new Event('cart-count-changed'));
};

export const fetchCart = async () => {
  const response = await api.get('/cart');
  return response.data;
};

export const addCartItem = async (productId: string, quantity: number, options?: { comboProductId?: string; comboVariantId?: string; variantId?: string; size?: string }) => {
  const payload = options?.comboProductId
    ? { comboProductId: options.comboProductId, comboVariantId: options.comboVariantId, quantity, size: options.size }
    : { productId, variantId: options?.variantId, quantity, size: options?.size };
  const response = await api.post('/cart', payload);
  notifyCartChanged();
  return response.data;
};

export const updateCartItem = async (cartItemId: string, quantity: number) => {
  const response = await api.put(`/cart/${cartItemId}`, { quantity });
  notifyCartChanged();
  return response.data;
};

export const removeCartItem = async (cartItemId: string) => {
  const response = await api.delete(`/cart/${cartItemId}`);
  notifyCartChanged();
  return response.data;
};

export const clearCart = async () => {
  const response = await api.delete('/cart');
  notifyCartChanged();
  return response.data;
};
