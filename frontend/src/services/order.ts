import api from './api';

export const createOrder = async (payload: any) => {
  const response = await api.post('/orders', payload);
  return response.data;
};

export const payOrder = async (orderId: string, body: any) => {
  const response = await api.put(`/orders/${orderId}/pay`, body);
  return response.data;
};

export const fetchOrder = async (orderId: string) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};
