import api from './api';

type UserData = { name: string; email: string; password: string };

type LoginData = { email: string; password: string };

type ChangePasswordData = { currentPassword: string; newPassword: string };

type ForgotPasswordData = { email: string };

type ResetPasswordData = { email: string; otp: string; newPassword: string };

export const signup = async (data: UserData) => {
  const response = await api.post('/auth/signup', data);
  persistAuth(response.data);
  return response.data;
};

export const login = async (data: LoginData) => {
  const response = await api.post('/auth/login', data);
  persistAuth(response.data);
  return response.data;
};

export const changePassword = async (data: ChangePasswordData) => {
  const response = await api.put('/auth/password', data);
  return response.data;
};

export const requestPasswordOtp = async (data: ForgotPasswordData) => {
  const response = await api.post('/auth/forgot-password', data);
  return response.data;
};

export const resetPasswordWithOtp = async (data: ResetPasswordData) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};

export const logoutRequest = async () => {
  await api.post('/auth/logout');
};

export const removeUserFromStorage = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  sessionStorage.removeItem('user');
};

export const getUserFromStorage = () => {
  const stored = sessionStorage.getItem('user');
  try {
    return stored ? JSON.parse(stored) : null;
  } catch {
    sessionStorage.removeItem('user');
    return null;
  }
};

const persistAuth = (user: any) => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  sessionStorage.setItem('user', JSON.stringify(user));
};
