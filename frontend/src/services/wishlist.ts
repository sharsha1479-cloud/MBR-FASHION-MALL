import api from './api';

const notifyWishlistChanged = () => {
  window.dispatchEvent(new Event('wishlist-count-changed'));
};

export const fetchWishlist = async () => {
  const response = await api.get('/wishlist');
  return response.data;
};

export const addWishlistItem = async (productId: string) => {
  const response = await api.post('/wishlist', { productId });
  notifyWishlistChanged();
  return response.data;
};

export const removeWishlistItem = async (wishlistItemId: string) => {
  const response = await api.delete(`/wishlist/${wishlistItemId}`);
  notifyWishlistChanged();
  return response.data;
};
