import api, { API_ORIGIN } from './api';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800"%3E%3Crect width="100%25" height="100%25" fill="%23f8fafc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="Arial,sans-serif" font-size="48"%3ENo Image%3C/text%3E%3C/svg%3E';

export const getCategoryImageUrl = (image?: string) => {
  if (!image) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/uploads/')) return `${API_ORIGIN}${image}`;
  if (image.startsWith('/')) return image;
  return `${API_ORIGIN}/uploads/${image}`;
};

export const fetchCategories = async () => {
  const response = await api.get('/categories');
  return Array.isArray(response.data) ? response.data : response.data?.categories || [];
};

export const createCategory = async (formData: FormData) => {
  const response = await api.post('/categories', formData);
  return response.data;
};

export const updateCategory = async (id: string, formData: FormData) => {
  const response = await api.put(`/categories/${id}`, formData);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};
