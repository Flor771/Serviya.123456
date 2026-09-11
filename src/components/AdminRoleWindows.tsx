import React,{useEffect,useState} from 'react';
import {api} from '../services/api';
import {ShieldCheck,RefreshCw} from 'lucide-react';
import {AdminPanelV2} from './AdminPanelV2';
import {AdminAlerts} from './AdminAlerts';

export const AdminRoleWindows:React.FC=()=>{
 const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [refresh,setRefresh]=useState(0);
 useEffect(()=>{(async()=>{try{await api.get('/admin/super-admin/access');}catch(e:any){setError(e?.message||'No se pudo validar el acceso administrativo.')}finally{setLoading(false)}})()},[refresh]);
 if(loading)return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">Cargando Administración SERVIYA…</div>;
 if(error)return <div className="min-h-screen bg-slate-100 p-6"><div className="max-w-xl mx-auto p-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold">{error}<button onClick={()=>{setLoading(true);setError('');setRefresh(x=>x+1)}} className="block mt-3 px-4 py-2 rounded-xl bg-white border text-sm">Reintentar</button></div></div>;
 return <div className="min-h-screen bg-slate-100 text-slate-800">
  <header className="sticky top-0 z-30 bg-slate-950 text-white border-b border-white/10 shadow-lg">
   <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div><div><p className="text-[10px] font-black tracking-[.18em] text-slate-400">SERVIYA • ADMINISTRACIÓN</p><h1 className="font-black text-base sm:text-lg">Panel central</h1></div></div>
    <button onClick={()=>{setLoading(true);setRefresh(x=>x+1)}} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><RefreshCw className="w-4 h-4"/></button>
   </div>
  </header>
  <main className="max-w-[1500px] mx-auto p-3 sm:p-5 space-y-4">
   <AdminAlerts/>
   <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Acceso administrativo único</p><h2 className="text-2xl font-black mt-1">Administrador</h2><p className="text-sm text-slate-500 mt-1 max-w-3xl">Una sola consola para administrar toda la plataforma: usuarios, servicios, verificaciones, depósitos, Custodia, liberaciones, retiros, cuentas bancarias, soporte, disputas y auditoría.</p></section>
   <AdminPanelV2/>
  </main>
 </div>;
};
