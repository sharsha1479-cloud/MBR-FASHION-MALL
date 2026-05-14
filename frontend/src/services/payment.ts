import api from './api';

export const createRazorpayOrder = async (payload: { orderItems: any[]; couponCode?: string; receipt?: string }) => {
  const response = await api.post('/create-order', {
    ...payload,
    currency: 'INR',
  });
  return response.data;
};
