import api from './api';

type UserData = { name: string; email: string; password: string };

type LoginData = { email: string; password: string };

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

export const removeUserFromStorage = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
};

export const getUserFromStorage = () => {
  const stored = localStorage.getItem('user');
  if (!stored) {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return token && role ? { token, role } : null;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const persistAuth = (user: any) => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', user.token);
  localStorage.setItem('role', user.role);
};
