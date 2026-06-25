import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rl_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
