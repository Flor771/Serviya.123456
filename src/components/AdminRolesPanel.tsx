import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { UserPlus, UserCog, Power, RefreshCw, ShieldCheck } from 'lucide-react';

type AdminRole = { code: string; name: string; description?: string; permissions?: string[] };
type Administrator = { id:string; first_name:string; last_name:string; email:string; phone:string; admin_role:string; role_label?:string; is_active:boolean; is_verified:boolean; created_at:string };

export const AdminRolesPanel: React.FC = () => {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [admins, setAdmins] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', password:'', admin_role:'ADMIN_OPERACIONES' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [data, roleData] = await Promise.all([
        api.get<any>('/admin/administrators'),
        api.get<any>('/admin/administrator-roles')
      ]);
      setAdmins(data?.administrators || []);
      const rawRoles = roleData?.roles || [];
      setRoles(rawRoles.map((r:any) => ({ code: r.key || r.code, name: r.label || r.name, description: r.description, permissions: r.permissions })));
    } catch (e:any) { setError(e?.message || 'No se pudo cargar el equipo administrativo.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      await api.post('/admin/administrators', { first_name:form.first_name, last_name:form.last_name, email:form.email, phone:form.phone, admin_role:form.admin_role, password:form.password });
      setMessage('Administrador agregado correctamente.');
      setForm({ first_name:'', last_name:'', email:'', phone:'', password:'', admin_role:'ADMIN_OPERACIONES' });
      await load();
    } catch (e:any) { setError(e?.message || 'No se pudo crear el administrador.'); }
    finally { setSaving(false); }
  };

  const updateRole = async (admin: Administrator, role: string) => {
    setError(''); setMessage('');
    try { await api.patch(`/admin/administrators/${admin.id}`, { admin_role: role }); setMessage('Rol administrativo actualizado.'); await load(); }
    catch (e:any) { setError(e?.message || 'No se pudo actualizar el rol.'); }
  };

  const toggle = async (admin: Administrator) => {
    setError(''); setMessage('');
    try { await api.patch(`/admin/administrators/${admin.id}`, { is_active: !admin.is_active }); setMessage('Acceso administrativo actualizado.'); await load(); }
    catch (e:any) { setError(e?.message || 'No se pudo actualizar el acceso.'); }
  };

  return (
    <section id="admin-configuration" className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm space-y-6 scroll-mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center"><UserCog className="w-6 h-6 text-blue-600"/></div><div><h2 className="font-black text-lg">Configuración y equipo administrativo</h2><p className="text-xs text-slate-500">Agrega varios administradores y asigna a cada uno el nivel de acceso que corresponde.</p></div></div>
        <button onClick={load} disabled={loading} className="px-3 py-2 rounded-xl border bg-white text-xs font-black inline-flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/> Actualizar</button>
      </div>
      {message && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">✓ {message}</div>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">⚠ {error}</div>}
      <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={createAdmin} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600"/><h3 className="font-black">Agregar administrador</h3></div>
          <div className="grid grid-cols-2 gap-2"><input required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} placeholder="Nombre" className="p-3 rounded-xl border bg-white text-sm"/><input required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} placeholder="Apellido" className="p-3 rounded-xl border bg-white text-sm"/></div>
          <input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Correo administrativo" className="w-full p-3 rounded-xl border bg-white text-sm"/>
          <input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Teléfono" className="w-full p-3 rounded-xl border bg-white text-sm"/>
          <input required minLength={10} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Contraseña inicial (mín. 10 caracteres)" className="w-full p-3 rounded-xl border bg-white text-sm" autoComplete="new-password"/>
          <select value={form.admin_role} onChange={e=>setForm({...form,admin_role:e.target.value})} className="w-full p-3 rounded-xl border bg-white text-sm">{roles.filter(r=>r.code!=='SUPER_ADMIN').map(r=><option key={r.code} value={r.code}>{r.name}</option>)}</select>
          <p className="text-[11px] text-slate-500">El Super Administrador queda protegido. Cada área recibe solo sus permisos.</p>
          <button disabled={saving} className="w-full bg-blue-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2"><UserPlus className="w-4 h-4"/>{saving?'Creando…':'Crear cuenta administrativa'}</button>
        </form>
        <div className="space-y-3">
          <h3 className="font-black">Administradores actuales ({admins.length})</h3>
          {!admins.length && <p className="text-xs text-slate-400 p-5 rounded-2xl bg-slate-50 border">No hay administradores registrados.</p>}
          {admins.map(a=><div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between gap-3"><div><b>{a.first_name} {a.last_name}</b><p className="text-xs text-slate-500">{a.email} • {a.phone}</p></div><span className={`text-[10px] font-black px-2 py-1 rounded-full ${a.is_active?'bg-emerald-100 text-emerald-700':'bg-slate-200 text-slate-500'}`}>{a.is_active?'ACTIVO':'INACTIVO'}</span></div>
            <select value={a.admin_role || 'ADMINISTRADOR_GENERAL'} onChange={e=>updateRole(a,e.target.value)} disabled={a.admin_role==='SUPER_ADMIN'} className="w-full p-2.5 rounded-xl border bg-white text-xs font-bold">{roles.map(r=><option key={r.code} value={r.code}>{r.name}</option>)}</select>
            <div className="flex gap-2"><button onClick={()=>toggle(a)} disabled={a.admin_role==='SUPER_ADMIN'} className="flex-1 p-2 rounded-lg border bg-white text-xs font-bold inline-flex items-center justify-center gap-1"><Power className="w-3.5 h-3.5"/>{a.is_active?'Desactivar':'Activar'}</button></div>
          </div>)}
        </div>
      </div>
      <div><h3 className="font-black mb-3">Roles administrativos disponibles</h3><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{roles.map(r=><div key={r.code} className="p-3 rounded-xl border bg-white"><p className="text-xs font-black flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600"/>{r.name}</p><p className="text-[10px] text-slate-500 mt-1">{r.description}</p></div>)}</div></div>
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900"><b>Seguridad:</b> el acceso base sigue siendo ADMIN; <b>admin_role</b> define el área funcional. Solo Super Administrador y Administrador General pueden gestionar administradores.</div>
    </section>
  );
};