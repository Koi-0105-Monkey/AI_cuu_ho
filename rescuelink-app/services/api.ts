import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE: Change this URL to your local machine IP (e.g. 192.168.x.x) or 10.0.2.2 if testing on Android
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to get token from storage', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
