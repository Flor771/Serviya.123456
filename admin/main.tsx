import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminPanel } from '../src/components/AdminPanel';
import { api, getAuthToken, removeAuthToken, setAuthToken } from '../src/services/api';
import '../src/index.css';

function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifySession = async () => {
    try {
      const me = await api.get<any>('/auth/me');
      if (me?.role === 'ADMIN' || me?.active_role === 'ADMIN') setAuthorized(true);
      else { removeAuthToken(); setError('Esta cuenta no tiene permisos de administrador.'); }
    } catch { removeAuthToken(); }
    finally { setChecking(false); }
  };

  useEffect(() => { if (getAuthToken()) verifySession(); else setChecking(false); }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await api.post<any>('/auth/login', { email, password });
      const token = data?.access_token || data?.token;
      if (!token) throw new Error('El servidor no devolvió un token de acceso.');
      setAuthToken(token);
      const me = await api.get<any>('/auth/me');
      if (me?.role !== 'ADMIN' && me?.active_role !== 'ADMIN') {
        removeAuthToken(); throw new Error('Esta cuenta no tiene permisos de administrador.');
      }
      setAuthorized(true);
    } catch (err: any) { setError(err.message || 'No se pudo iniciar sesión.'); }
    finally { setLoading(false); }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-600">Verificando acceso administrativo…</div>;
  if (authorized) return <AdminPanel />;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-7 sm:p-9">
        <div className="mb-7">
          <div className="text-2xl font-black text-slate-900">SERVIYA<span className="text-red-600">.do</span></div>
          <div className="text-sm font-bold text-slate-500 mt-1">Panel de Administración</div>
          <p className="text-xs text-slate-500 mt-3">Acceso exclusivo para cuentas con rol ADMIN. Las cuentas CLIENTE y TRABAJADOR no pueden entrar.</p>
        </div>
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
        <form onSubmit={login} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="username" className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label><input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password" className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <button disabled={loading} className="w-full bg-[#0D2B45] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">{loading ? 'Entrando…' : 'Entrar al panel administrativo'}</button>
        </form>
      </div>
    </div>
  );
}

createRoot(document.getElementById('admin-root')!).render(<AdminApp />);
