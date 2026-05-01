import api from './api';

export const fetchCart = async () => {
  const response = await api.get('/cart');
  return response.data;
};

export const addCartItem = async (productId: string, quantity: number) => {
  const response = await api.post('/cart', { productId, quantity });
  return response.data;
};

export const updateCartItem = async (cartItemId: string, quantity: number) => {
  const response = await api.put(`/cart/${cartItemId}`, { quantity });
  return response.data;
};

export const removeCartItem = async (cartItemId: string) => {
  const response = await api.delete(`/cart/${cartItemId}`);
  return response.data;
};

export const clearCart = async () => {
  const response = await api.delete('/cart');
  return response.data;
};
