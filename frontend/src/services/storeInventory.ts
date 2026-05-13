import api from './api';

export const fetchStoreInventory = async () => {
  const response = await api.get('/admin/store-inventory');
  return response.data;
};

export const createStoreInventoryRecord = async (payload: {
  storeId: string;
  productId?: string;
  customName?: string;
  customCategory?: string;
  customPrice?: number | string;
  size?: string;
  availableStock: number | string;
  soldCount: number | string;
}) => {
  const response = await api.post('/admin/store-inventory', payload);
  return response.data;
};

export const updateStoreInventoryRecord = async (
  id: string,
  payload: {
    availableStock?: number | string;
    soldCount?: number | string;
  }
) => {
  const response = await api.put(`/admin/store-inventory/${id}`, payload);
  return response.data;
};

export const deleteStoreInventoryRecord = async (id: string) => {
  const response = await api.delete(`/admin/store-inventory/${id}`);
  return response.data;
};
