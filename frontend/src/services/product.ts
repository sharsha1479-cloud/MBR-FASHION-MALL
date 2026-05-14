import api from './api';
import { resolveImageUrl } from './imageUrl';

export const PRODUCT_PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800"%3E%3Crect width="100%25" height="100%25" fill="%23f8fafc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="Arial,sans-serif" font-size="48"%3ENo Image%3C/text%3E%3C/svg%3E';

export const getProductImageUrl = (image?: string | string[]) => {
  if (Array.isArray(image)) {
    return resolveImageUrl(image[0], PRODUCT_PLACEHOLDER_IMAGE);
  }

  return resolveImageUrl(image, PRODUCT_PLACEHOLDER_IMAGE);
};

export const fetchProducts = async (params?: Record<string, string | number>) => {
  const response = await api.get('/products', { params });
  return Array.isArray(response.data) ? response.data : response.data?.products || [];
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

export const deleteProductVariant = async (productId: string, variantId: string) => {
  const response = await api.delete(`/products/${productId}/variants/${variantId}`);
  return response.data;
};
