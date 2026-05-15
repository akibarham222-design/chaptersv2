import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('ae_token'));

  const ADMIN_EMAIL = 'n.i.farhan44@gmail.com';

  const isAdmin = user?.email === ADMIN_EMAIL && user?.role === 'admin';
  const isMod = ['moderator', 'admin'].includes(user?.role);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('ae_token');
    if (!storedToken) { setLoading(false); return; }
    try {
      const { data } = await authAPI.verify();
      if (data.valid) {
        const u = data.user;
        if (u.email === ADMIN_EMAIL) u.role = 'admin';
        setUser(u);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (tokenStr, userData) => {
    localStorage.setItem('ae_token', tokenStr);
    localStorage.setItem('ae_user', JSON.stringify(userData));
    setToken(tokenStr);
    if (userData.email === ADMIN_EMAIL) userData.role = 'admin';
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ae_token');
    localStorage.removeItem('ae_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
    localStorage.setItem('ae_user', JSON.stringify({ ...user, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, isMod, login, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
