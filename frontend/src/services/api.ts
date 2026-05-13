import axios from 'axios';

const getApiBase = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  if (typeof window === 'undefined') {
    return configuredUrl;
  }

  const frontendHost = window.location.hostname;
  const apiUrl = new URL(configuredUrl);
  const apiIsLocal = ['localhost', '127.0.0.1'].includes(apiUrl.hostname);
  const frontendIsLocal = ['localhost', '127.0.0.1'].includes(frontendHost);

  if (apiIsLocal && !frontendIsLocal) {
    apiUrl.hostname = frontendHost;
  }

  return apiUrl.toString().replace(/\/$/, '');
};

export const API_BASE = getApiBase();
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('user');
  let token = localStorage.getItem('token');
  if (stored) {
    try {
      token = JSON.parse(stored)?.token || token;
    } catch {
      localStorage.removeItem('user');
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export default api;
