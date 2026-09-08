import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, apiFetch, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

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

const normalizeUser = (userObj: any): User | null => {
  if (!userObj) return null;
  const raw = userObj.user || userObj;

  const firstName = raw.first_name || '';
  const lastName = raw.last_name || '';
  const fullName = raw.full_name || `${firstName} ${lastName}`.trim() || raw.email || 'Usuario';

  let role = raw.role;
  if (role === 'CLIENT') role = 'CLIENTE';
  if (role === 'WORKER') role = 'TRABAJADOR';
  if (!role) role = 'CLIENTE';

  const activeRole = raw.active_role || raw.activeRole || (role === 'TRABAJADOR' ? 'TRABAJADOR' : 'CLIENTE');

  return {
    ...raw,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    role: role,
    activeRole: activeRole
  };
};

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
      const me = await apiFetch('/auth/me');
      const normalized = normalizeUser(me);
      setUser(normalized);
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
    const data = await api.post<any>('/auth/login', { email, password: pass });
    const token = data.token || data.access_token;
    if (token) {
      setAuthToken(token);
    }

    try {
      const me = await apiFetch('/auth/me');
      setUser(normalizeUser(me));
    } catch (err) {
      setUser(normalizeUser(data.user || data));
    }
  };

  const register = async (formData: any) => {
    let firstName = formData.first_name || '';
    let lastName = formData.last_name || '';

    if (!firstName && formData.full_name) {
      const parts = String(formData.full_name).trim().split(/\s+/);
      firstName = parts[0] || 'Usuario';
      lastName = parts.slice(1).join(' ') || 'SERVIYA';
    } else if (!lastName) {
      lastName = 'SERVIYA';
    }

    let role = formData.role || 'CLIENTE';
    if (role === 'CLIENT') role = 'CLIENTE';
    if (role === 'WORKER') role = 'TRABAJADOR';

    const payload: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      email: formData.email,
      phone: formData.phone || '809-555-0199',
      password: formData.password,
      role: role
    };

    if (formData.cedula || formData.cedula_passport) {
      payload.cedula = formData.cedula || formData.cedula_passport;
    }
    if (formData.province) {
      payload.province = formData.province;
    }
    if (formData.municipality) {
      payload.municipality = formData.municipality;
    }
    if (formData.profession) {
      payload.profession = formData.profession;
    }

    const data = await api.post<any>('/auth/register', payload);
    const token = data.token || data.access_token;
    if (token) {
      setAuthToken(token);
    }

    try {
      const me = await apiFetch('/auth/me');
      setUser(normalizeUser(me));
    } catch (err) {
      setUser(normalizeUser(data.user || data));
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const toggleRole = async () => {
    try {
      const nextRole = user?.activeRole === 'CLIENTE' ? 'TRABAJADOR' : 'CLIENTE';
      const data = await api.post<any>('/auth/role-toggle', { active_role: nextRole });
      if (user) {
        setUser({
          ...user,
          activeRole: data.active_role || nextRole
        });
      }
    } catch (err) {
      console.error('Error toggling role:', err);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.put<any>('/users/profile', data);
    setUser(normalizeUser(res));
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
