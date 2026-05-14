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
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

const persistSessionUser = (user: any) => {
  sessionStorage.setItem('user', JSON.stringify(user));
  return user?.token || null;
};

api.interceptors.request.use((config) => {
  const stored = sessionStorage.getItem('user');
  let token = '';
  if (stored) {
    try {
      token = JSON.parse(stored)?.token || token;
    } catch {
      sessionStorage.removeItem('user');
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshPromise = refreshPromise || api.post('/auth/refresh').then((response) => persistSessionUser(response.data)).finally(() => {
      refreshPromise = null;
    });

    const token = await refreshPromise;
    if (token && originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
