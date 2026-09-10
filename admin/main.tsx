import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AdminPanelV2} from '../src/components/AdminPanelV2';
import {api,getAuthToken,removeAuthToken,setAuthToken} from '../src/services/api';
import '../src/index.css';

function adminUser(payload:any){const u=payload?.user||payload||{};return {role:String(u?.role||'').toUpperCase(),activeRole:String(u?.active_role||u?.activeRole||'').toUpperCase()};}
function AdminApp(){
 const [checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const verify=async()=>{try{const me=await api.get<any>('/auth/me');const {role,activeRole}=adminUser(me);if(role==='ADMIN'||activeRole==='ADMIN'){setAuthorized(true);setError('')}else{removeAuthToken();setError('Esta cuenta no tiene permisos de administrador.')}}catch{removeAuthToken()}finally{setChecking(false)}};
 useEffect(()=>{if(getAuthToken())verify();else setChecking(false)},[]);
 const login=async(e:React.FormEvent)=>{e.preventDefault();setError('');setLoading(true);try{const data=await api.post<any>('/auth/login',{email,password});const token=data?.access_token||data?.token;if(!token)throw new Error('El servidor no devolvió un token de acceso.');setAuthToken(token);const me=await api.get<any>('/auth/me');const {role,activeRole}=adminUser(me);if(role!=='ADMIN'&&activeRole!=='ADMIN'){removeAuthToken();throw new Error('Esta cuenta no tiene permisos de administrador.')}setAuthorized(true)}catch(err:any){removeAuthToken();setError(err?.message||'No se pudo iniciar sesión.')}finally{setLoading(false)}};
 if(checking)return <div className="min-h-screen flex items-center justify-center text-slate-600">Verificando acceso administrativo…</div>;
 if(authorized)return <AdminPanelV2/>;
 return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-7 sm:p-9"><div className="mb-7"><div className="text-2xl font-black text-slate-900">SERVIYA</div><div className="text-sm font-bold text-slate-500 mt-1">Panel de Administración</div><p className="text-xs text-slate-500 mt-3">Acceso exclusivo para cuentas administrativas SERVIYA.</p></div>{error&&<div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}<form onSubmit={login} className="space-y-4"><div><label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required autoComplete="username" className="w-full p-3 rounded-xl border border-slate-200 text-sm"/></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required autoComplete="current-password" className="w-full p-3 rounded-xl border border-slate-200 text-sm"/></div><button disabled={loading} className="w-full bg-[#0D2B45] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">{loading?'Entrando…':'Entrar al panel administrativo'}</button></form></div></div>;
}
createRoot(document.getElementById('admin-root')!).render(<AdminApp/>);
