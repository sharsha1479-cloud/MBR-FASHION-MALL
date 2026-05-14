import api from './api';
import { resolveImageUrl } from './imageUrl';

export const COMBO_PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="900" height="600"%3E%3Crect width="100%25" height="100%25" fill="%23f8fafc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="Arial,sans-serif" font-size="44"%3ENo Combo Image%3C/text%3E%3C/svg%3E';

export const getComboImageUrl = (image?: string) => {
  return resolveImageUrl(image, COMBO_PLACEHOLDER_IMAGE);
};

export const fetchCombos = async (all = false) => {
  try {
    const response = await api.get('/combos', { params: all ? { all: 'true' } : undefined });
    return Array.isArray(response.data) ? response.data : response.data?.combos || [];
  } catch (error) {
    console.error('Combo products are unavailable.', error);
    return [];
  }
};

export const fetchComboById = async (id: string) => {
  const response = await api.get(`/combos/${id}`);
  return response.data;
};

export const createCombo = async (formData: FormData) => {
  const response = await api.post('/combos', formData);
  return response.data;
};

export const updateCombo = async (id: string, formData: FormData) => {
  const response = await api.put(`/combos/${id}`, formData);
  return response.data;
};

export const deleteCombo = async (id: string) => {
  const response = await api.delete(`/combos/${id}`);
  return response.data;
};
