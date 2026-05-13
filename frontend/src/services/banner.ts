import api, { API_ORIGIN } from './api';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"%3E%3Crect width="100%25" height="100%25" fill="%231e293b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23f8fafc" font-family="Arial,sans-serif" font-size="48"%3EBanner%3C/text%3E%3C/svg%3E';

export const getBannerImageUrl = (image?: string) => {
  if (!image) return PLACEHOLDER_IMAGE;
  if (/^(https?:\/\/|data:)/.test(image)) return image;
  if (image.startsWith('/uploads/')) return `${API_ORIGIN}${image}`;
  return `${API_ORIGIN}/uploads/${image}`;
};

export const fetchBanners = async (all = false) => {
  const response = await api.get('/banners', { params: all ? { all: 'true' } : undefined });
  return Array.isArray(response.data) ? response.data : response.data?.banners || [];
};

export const createBanner = async (formData: FormData) => {
  const response = await api.post('/banners', formData);
  return response.data;
};

export const updateBanner = async (id: string, formData: FormData) => {
  const response = await api.put(`/banners/${id}`, formData);
  return response.data;
};

export const deleteBanner = async (id: string) => {
  const response = await api.delete(`/banners/${id}`);
  return response.data;
};
