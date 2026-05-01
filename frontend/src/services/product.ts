import api from './api';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const getProductImageUrl = (image?: string) => {
  return image ? `${API_ORIGIN}/uploads/${image}` : 'https://via.placeholder.com/800x800?text=No+Image';
};

export const fetchProducts = async (params?: Record<string, string | number>) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const fetchProductById = async (id: string) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (formData: FormData) => {
  const response = await api.post('/products', formData);
  return response.data;
};

export const updateProduct = async (id: string, formData: FormData) => {
  const response = await api.put(`/products/${id}`, formData);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
