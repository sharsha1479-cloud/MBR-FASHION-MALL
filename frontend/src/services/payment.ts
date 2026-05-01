import api from './api';

export const createRazorpayOrder = async (amountInPaise: number, receipt?: string) => {
  const response = await api.post('/create-order', {
    amount: amountInPaise,
    currency: 'INR',
    receipt,
  });
  return response.data;
};
