import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('rl_token');
    const stored = localStorage.getItem('rl_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('rl_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    localStorage.setItem('rl_token', data.token);
    localStorage.setItem('rl_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('rl_token');
    localStorage.removeItem('rl_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
