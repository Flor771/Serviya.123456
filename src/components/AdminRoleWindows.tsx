import React,{useEffect,useState} from 'react';
import {api} from '../services/api';
import {ShieldCheck,Wallet,BriefcaseBusiness,Eye,Headphones,Scale,FileCheck2,Users,Settings,ArrowLeft,LockKeyhole} from 'lucide-react';
import {AdminPanelV2} from './AdminPanelV2';

type Role={code:string;name:string;description?:string;permissions?:string[]};
const ICONS:any={SUPER_ADMIN:ShieldCheck,ADMINISTRADOR_GENERAL:Settings,ADMIN_FINANCIERO:Wallet,ADMIN_OPERACIONES:BriefcaseBusiness,ADMIN_CUSTODIA:Wallet,ADMIN_VERIFICACION:FileCheck2,ADMIN_SOPORTE:Headphones,ADMIN_MODERACION:Eye,ADMIN_DISPUTAS:Scale,AUDITOR:LockKeyhole};

export const AdminRoleWindows:React.FC=()=>{
 const [access,setAccess]=useState<any>(null); const [roles,setRoles]=useState<Role[]>([]); const [selected,setSelected]=useState<string>(''); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 useEffect(()=>{(async()=>{try{const [a,r]=await Promise.all([api.get<any>('/admin/super-admin/access'),api.get<any>('/admin/administrator-roles')]);const role=String(a?.admin_role||'').toUpperCase();const all=(r?.roles||[]).map((x:any)=>({code:x.key||x.code,name:x.label||x.name,description:x.description,permissions:x.permissions}));setAccess(a);setRoles(all);setSelected(role||'ADMIN_OPERACIONES')}catch(e:any){setError(e?.message||'No se pudo cargar el acceso administrativo.')}finally{setLoading(false)}})()},[]);
 if(loading)return <div className="min-h-screen flex items-center justify-center text-slate-600">Cargando áreas administrativas…</div>;
 if(error)return <div className="m-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold">{error}</div>;
 const superAdmin=!!access?.is_super_admin;
 const visible=superAdmin?roles:roles.filter(r=>r.code===String(access?.admin_role||'').toUpperCase());
 const current=roles.find(r=>r.code===selected)||visible[0];
 if(!current)return <div className="p-6">No hay un rol administrativo asignado.</div>;
 const Icon=ICONS[current.code]||Settings;
 return <div className="min-h-screen bg-slate-100 p-3 sm:p-6">
  <div className="max-w-7xl mx-auto space-y-5">
   <header className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-xs font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full"><ShieldCheck className="w-4 h-4"/> SERVIYA • ÁREAS ADMINISTRATIVAS</div><h1 className="text-2xl sm:text-3xl font-black mt-2">Ventanas por rol</h1><p className="text-sm text-slate-500 mt-1">Cada rol trabaja en su propia ventana. El Super Administrador cambia de área directamente con la misma sesión.</p></div><div className="text-xs font-black px-3 py-2 rounded-xl bg-slate-100">{superAdmin?'SUPER ADMINISTRADOR • ACCESO TOTAL':'ROL: '+current.name}</div></div></header>
   {superAdmin&&<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{visible.map(r=>{const I=ICONS[r.code]||Settings;return <button key={r.code} onClick={()=>setSelected(r.code)} className={`text-left p-4 rounded-2xl border-2 transition ${selected===r.code?'border-blue-600 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-blue-300'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><I className="w-5 h-5 text-blue-700"/></div><div><p className="font-black text-sm">{r.name}</p><p className="text-[11px] text-slate-500 mt-0.5">{r.description}</p></div></div></button>})}</div>}
   <section className="bg-white rounded-3xl border-2 border-blue-100 shadow-sm overflow-hidden"><div className="p-5 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center"><Icon className="w-6 h-6 text-blue-700"/></div><div><h2 className="text-xl font-black">{current.name}</h2><p className="text-xs text-slate-500">{current.description}</p></div></div>{superAdmin&&<button onClick={()=>setSelected('SUPER_ADMIN')} className="px-3 py-2 rounded-xl border bg-white text-xs font-black inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Centro total</button>}</div><div className="p-4 sm:p-6"><RoleModuleNotice role={current.code}/><AdminPanelV2/></div></section>
  </div>
 </div>;
};

const RoleModuleNotice:React.FC<{role:string}>=({role})=><div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-100"><p className="text-sm font-black">Ventana activa: {role}</p><p className="text-xs text-slate-600 mt-1">Esta ventana conserva la sesión administrativa actual. El Super Administrador puede entrar y salir de cualquier rol sin volver a escribir correo ni contraseña.</p></div>;
