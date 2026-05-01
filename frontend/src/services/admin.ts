import api from './api';

export const fetchAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const fetchAdminOrders = async () => {
  const response = await api.get('/admin/orders');
  return response.data;
};

export const fetchAdminOrderById = async (orderId: string) => {
  const response = await api.get(`/admin/orders/${orderId}`);
  return response.data;
};

export const updateAdminOrderStatus = async (orderId: string, status: string) => {
  const response = await api.put(`/admin/orders/${orderId}/status`, { status });
  return response.data;
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
  const response = await api.put(`/admin/users/${userId}/role`, { role });
  return response.data;
};
