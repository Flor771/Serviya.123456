import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, apiFetch, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

interface AuthContextType { user: User | null; loading: boolean; login: (email: string, pass: string) => Promise<void>; register: (data: any) => Promise<void>; logout: () => void; toggleRole: () => Promise<void>; updateProfile: (data: Partial<User>) => Promise<void>; refreshUser: () => Promise<void>; }

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
  return { ...raw, first_name: firstName, last_name: lastName, full_name: fullName, role, activeRole };
};

const isAdminUser = (userObj: any) => normalizeUser(userObj)?.role === 'ADMIN';
const rejectAdminSession = () => { removeAuthToken(); throw new Error('El acceso administrativo se realiza únicamente desde el panel de administración.'); };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) { setUser(null); return; }
      const me = await apiFetch('/auth/me');
      if (isAdminUser(me)) { removeAuthToken(); setUser(null); return; }
      setUser(normalizeUser(me));
    } catch (err) {
      console.error('Failed to load user:', err);
      removeAuthToken(); setUser(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCurrentUser(); }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.post<any>('/auth/login', { email, password: pass });
    const token = data.token || data.access_token;
    if (token) setAuthToken(token);
    try {
      const me = await apiFetch('/auth/me');
      if (isAdminUser(me) || isAdminUser(data.user || data)) { rejectAdminSession(); }
      setUser(normalizeUser(me));
    } catch (err) {
      removeAuthToken();
      if (isAdminUser(data.user || data)) rejectAdminSession();
      throw err;
    }
  };

  const register = async (formData: any) => {
    let firstName = formData.first_name || '';
    let lastName = formData.last_name || '';
    if (!firstName && formData.full_name) { const parts = String(formData.full_name).trim().split(/\s+/); firstName = parts[0] || 'Usuario'; lastName = parts.slice(1).join(' ') || 'SERVIYA'; }
    else if (!lastName) lastName = 'SERVIYA';
    let role = formData.role || 'CLIENTE';
    if (role === 'CLIENT') role = 'CLIENTE';
    if (role === 'WORKER') role = 'TRABAJADOR';
    if (role !== 'CLIENTE' && role !== 'TRABAJADOR') role = 'CLIENTE';
    const payload: Record<string, any> = { first_name:firstName, last_name:lastName, email:formData.email, phone:formData.phone || '809-555-0199', password:formData.password, role, accept_policies:formData.accept_policies !== undefined ? formData.accept_policies : true };
    if (formData.cedula || formData.cedula_passport) payload.cedula = formData.cedula || formData.cedula_passport;
    if (formData.province) payload.province = formData.province;
    if (formData.municipality) payload.municipality = formData.municipality;
    if (formData.profession) payload.profession = formData.profession;
    const data = await api.post<any>('/auth/register', payload);
    const token = data.token || data.access_token;
    if (token) setAuthToken(token);
    try {
      const me = await apiFetch('/auth/me');
      if (isAdminUser(me) || isAdminUser(data.user || data)) { rejectAdminSession(); }
      setUser(normalizeUser(me));
    } catch (err) { removeAuthToken(); throw err; }
  };

  const logout = () => { removeAuthToken(); setUser(null); };
  const toggleRole = async () => { try { const nextRole = user?.activeRole === 'CLIENTE' ? 'TRABAJADOR' : 'CLIENTE'; const data = await api.post<any>('/auth/role-toggle', { active_role: nextRole }); if (user) setUser({ ...user, activeRole: data.active_role || nextRole }); } catch (err) { console.error('Error toggling role:', err); } };
  const updateProfile = async (data: Partial<User>) => { const res = await api.put<any>('/users/profile', data); if (isAdminUser(res)) { removeAuthToken(); setUser(null); return; } setUser(normalizeUser(res)); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, toggleRole, updateProfile, refreshUser: fetchCurrentUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within an AuthProvider'); return ctx; };
