import api from './api';

export const fetchCoupons = async () => {
  const response = await api.get('/coupons');
  return response.data;
};

export const createCoupon = async (payload: any) => {
  const response = await api.post('/coupons', payload);
  return response.data;
};

export const updateCoupon = async (id: string, payload: any) => {
  const response = await api.put(`/coupons/${id}`, payload);
  return response.data;
};

export const deleteCoupon = async (id: string) => {
  const response = await api.delete(`/coupons/${id}`);
  return response.data;
};

export const validateCoupon = async (code: string, subtotal: number) => {
  const response = await api.post('/coupons/validate', { code, subtotal });
  return response.data;
};
