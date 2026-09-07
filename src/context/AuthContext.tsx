import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  toggleRole: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.error('Failed to load user:', err);
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.post<{ user: User; token: string }>('/auth/login', { email, password: pass });
    setAuthToken(data.token);
    setUser(data.user);
  };

  const register = async (formData: any) => {
    const data = await api.post<{ user: User; token: string }>('/auth/register', formData);
    setAuthToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const toggleRole = async () => {
    try {
      const data = await api.post<{ user: User }>('/auth/role-toggle', {});
      setUser(data.user);
    } catch (err) {
      console.error('Error toggling role:', err);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.put<{ user: User }>('/users/profile', data);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, toggleRole, updateProfile, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
