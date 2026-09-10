import React,{useEffect,useMemo,useState} from 'react';
import {api} from '../services/api';
import {ShieldCheck,Wallet,BriefcaseBusiness,Eye,Headphones,Scale,FileCheck2,Users,Settings,LockKeyhole,ArrowLeft,RefreshCw,ChevronRight,LayoutDashboard,Landmark,ClipboardCheck,LifeBuoy,UserRoundCheck,ReceiptText} from 'lucide-react';
import {AdminPanelV2} from './AdminPanelV2';

type Role={code:string;name:string;description?:string;permissions?:string[]};
const ICONS:any={SUPER_ADMIN:ShieldCheck,ADMINISTRADOR_GENERAL:Settings,ADMIN_FINANCIERO:Wallet,ADMIN_OPERACIONES:BriefcaseBusiness,ADMIN_CUSTODIA:Landmark,ADMIN_VERIFICACION:FileCheck2,ADMIN_SOPORTE:Headphones,ADMIN_MODERACION:Eye,ADMIN_DISPUTAS:Scale,AUDITOR:LockKeyhole};
const AREA_META:any={
 SUPER_ADMIN:{group:'Dirección',short:'Todo SERVIYA',accent:'bg-red-50 text-red-700 border-red-200'},
 ADMINISTRADOR_GENERAL:{group:'Dirección',short:'Operación general',accent:'bg-blue-50 text-blue-700 border-blue-200'},
 ADMIN_FINANCIERO:{group:'Finanzas',short:'Dinero y cuentas',accent:'bg-emerald-50 text-emerald-700 border-emerald-200'},
 ADMIN_CUSTODIA:{group:'Finanzas',short:'Custodia y liberaciones',accent:'bg-orange-50 text-orange-700 border-orange-200'},
 ADMIN_OPERACIONES:{group:'Operación',short:'Servicios y contratos',accent:'bg-violet-50 text-violet-700 border-violet-200'},
 ADMIN_VERIFICACION:{group:'Operación',short:'Documentos y validación',accent:'bg-cyan-50 text-cyan-700 border-cyan-200'},
 ADMIN_SOPORTE:{group:'Usuarios',short:'Atención y tickets',accent:'bg-sky-50 text-sky-700 border-sky-200'},
 ADMIN_MODERACION:{group:'Usuarios',short:'Contenido y perfiles',accent:'bg-pink-50 text-pink-700 border-pink-200'},
 ADMIN_DISPUTAS:{group:'Control',short:'Conflictos y evidencias',accent:'bg-rose-50 text-rose-700 border-rose-200'},
 AUDITOR:{group:'Control',short:'Consulta y auditoría',accent:'bg-slate-100 text-slate-700 border-slate-300'}
};
const PERMISSION_LABELS:any={USERS:'Usuarios',SERVICES:'Servicios',VERIFICATION:'Verificación',FINANCE:'Finanzas',DISPUTES:'Disputas',SETTINGS:'Configuración',OPERATIONS:'Operaciones',DEPOSITS:'Depósitos',ESCROW:'Custodia',RELEASES:'Liberaciones',SUPPORT:'Soporte',MODERATION:'Moderación',EVIDENCE:'Evidencias',AUDIT:'Auditoría',READ_ONLY:'Solo lectura',ALL:'Acceso total'};

export const AdminRoleWindows:React.FC=()=>{
 const [access,setAccess]=useState<any>(null); const [roles,setRoles]=useState<Role[]>([]); const [selected,setSelected]=useState<string>(''); const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false); const [error,setError]=useState(''); const [mobileOpen,setMobileOpen]=useState(false);
 const load=async()=>{setRefreshing(true);setError('');try{const [a,r]=await Promise.all([api.get<any>('/admin/super-admin/access'),api.get<any>('/admin/administrator-roles')]);const role=String(a?.admin_role||'').toUpperCase();const all=(r?.roles||[]).map((x:any)=>({code:String(x.key||x.code||'').toUpperCase(),name:x.label||x.name,description:x.description,permissions:x.permissions||[]}));setAccess(a);setRoles(all);setSelected(prev=>prev||role||'ADMIN_OPERACIONES')}catch(e:any){setError(e?.message||'No se pudo cargar el acceso administrativo.')}finally{setLoading(false);setRefreshing(false)}};
 useEffect(()=>{load()},[]);
 const superAdmin=!!access?.is_super_admin;
 const visible=useMemo(()=>superAdmin?roles:roles.filter(r=>r.code===String(access?.admin_role||'').toUpperCase()),[superAdmin,roles,access]);
 const current=roles.find(r=>r.code===selected)||visible[0];
 if(loading)return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">Cargando áreas administrativas…</div>;
 if(error)return <div className="min-h-screen bg-slate-100 p-6"><div className="max-w-xl mx-auto p-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold">{error}<button onClick={load} className="block mt-3 px-4 py-2 rounded-xl bg-white border text-sm">Reintentar</button></div></div>;
 if(!current)return <div className="p-6">No hay un rol administrativo asignado.</div>;
 const Icon=ICONS[current.code]||Settings; const meta=AREA_META[current.code]||AREA_META.ADMINISTRADOR_GENERAL;
 const choose=(code:string)=>{setSelected(code);setMobileOpen(false);window.scrollTo({top:0,behavior:'smooth'})};
 return <div className="min-h-screen bg-slate-100 text-slate-800">
   <header className="sticky top-0 z-30 bg-slate-950 text-white border-b border-white/10 shadow-lg">
    <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5"/></div><div className="min-w-0"><p className="text-[10px] font-black tracking-[.18em] text-slate-400">SERVIYA • ÁREAS ADMINISTRATIVAS</p><h1 className="font-black text-base sm:text-lg truncate">Centro de administración</h1></div></div>
      <div className="flex items-center gap-2"><span className={`hidden sm:inline-flex px-3 py-2 rounded-xl text-[11px] font-black ${superAdmin?'bg-red-500/15 text-red-200':'bg-white/10 text-slate-200'}`}>{superAdmin?'SUPER ADMINISTRADOR • ACCESO TOTAL':current.name}</span><button onClick={load} disabled={refreshing} title="Actualizar" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"><RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/></button><button onClick={()=>setMobileOpen(v=>!v)} className="lg:hidden w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><LayoutDashboard className="w-4 h-4"/></button></div>
    </div>
   </header>
   <div className="max-w-[1500px] mx-auto p-3 sm:p-5 lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-5">
    <aside className={`${mobileOpen?'block':'hidden'} lg:block mb-4 lg:mb-0`}>
      <div className="lg:sticky lg:top-[76px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Áreas</p><p className="text-sm font-bold mt-1">{superAdmin?'Selecciona una ventana':'Área asignada'}</p></div>
        <nav className="p-2 max-h-[70vh] overflow-y-auto">
         {visible.map(r=>{const I=ICONS[r.code]||Settings;const active=r.code===current.code;const m=AREA_META[r.code]||meta;return <button key={r.code} onClick={()=>choose(r.code)} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 mb-1 transition ${active?'bg-slate-900 text-white shadow-sm':'hover:bg-slate-50 text-slate-700'}`}><div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active?'bg-white/10':'bg-slate-100'}`}><I className="w-4 h-4"/></div><div className="min-w-0 flex-1"><p className="text-xs font-black truncate">{r.name}</p><p className={`text-[10px] mt-0.5 truncate ${active?'text-slate-300':'text-slate-400'}`}>{m.short}</p></div>{active&&<ChevronRight className="w-4 h-4 shrink-0"/>}</button>})}
        </nav>
        <div className="p-3 border-t border-slate-100 bg-slate-50"><p className="text-[10px] text-slate-500 leading-relaxed">{superAdmin?'El Super Administrador cambia de área con la misma sesión, sin volver a iniciar sesión.':'Tu cuenta solo puede acceder al área administrativa asignada.'}</p></div>
      </div>
    </aside>
    <main className="min-w-0 space-y-4">
      <section className={`rounded-3xl border p-5 sm:p-6 ${meta.accent}`}><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div className="flex gap-4 min-w-0"><div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shrink-0"><Icon className="w-6 h-6"/></div><div><p className="text-[10px] font-black uppercase tracking-wider opacity-70">Ventana activa</p><h2 className="text-xl sm:text-2xl font-black mt-1">{current.name}</h2><p className="text-sm opacity-80 mt-1 max-w-3xl">{current.description}</p></div></div>{superAdmin&&current.code!=='SUPER_ADMIN'&&<button onClick={()=>choose('SUPER_ADMIN')} className="self-start px-3 py-2 rounded-xl bg-white/80 border border-black/5 text-xs font-black inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Centro total</button>}</div></section>
      {superAdmin&&current.code==='SUPER_ADMIN'?<>
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3"><QuickCard icon={Users} label="Usuarios" value="Control central"/><QuickCard icon={Wallet} label="Finanzas" value="Depósitos y retiros"/><QuickCard icon={Landmark} label="Custodia" value="Fondos protegidos"/><QuickCard icon={ClipboardCheck} label="Verificación" value="Documentos"/></section>
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="font-black text-lg">Centro total</h3><p className="text-xs text-slate-500 mt-1">Una sola consola para operar SERVIYA. Las funciones existentes se mantienen dentro de este centro.</p></div><div className="flex flex-wrap gap-2">{visible.filter(r=>r.code!=='SUPER_ADMIN').slice(0,5).map(r=><button key={r.code} onClick={()=>choose(r.code)} className="px-3 py-2 rounded-xl bg-slate-50 border text-xs font-bold hover:bg-slate-100">{r.name}</button>)}</div></div><div className="p-3 sm:p-5"><AdminPanelV2/></div></section>
      </>:<RestrictedArea role={current}/>} 
    </main>
   </div>
 </div>;
};

const QuickCard:React.FC<{icon:any;label:string;value:string}>=({icon:Icon,label,value})=><div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"><Icon className="w-5 h-5 text-blue-700"/><p className="text-[10px] font-black uppercase text-slate-400 mt-3">{label}</p><p className="text-xs sm:text-sm font-black mt-1">{value}</p></div>;

const RestrictedArea:React.FC<{role:Role}>=({role})=>{const Icon=ICONS[role.code]||Settings;const permissions=role.permissions||[];return <div className="space-y-4"><section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7"><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0"><Icon className="w-6 h-6 text-slate-700"/></div><div><p className="text-xs font-black uppercase text-slate-400">Área protegida</p><h3 className="text-xl font-black mt-1">{role.name}</h3><p className="text-sm text-slate-500 mt-2 max-w-2xl">{role.description}</p></div></div></section><section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5"><h3 className="font-black">Módulos autorizados</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">{permissions.length?permissions.map((p:string)=><div key={p} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center"><LockKeyhole className="w-4 h-4 text-slate-600"/></div><div><p className="text-sm font-black">{PERMISSION_LABELS[p]||p}</p><p className="text-[11px] text-slate-500">Permiso: {p}</p></div></div>):<p className="text-sm text-slate-500">No se recibieron permisos para esta área.</p>}</div></section><section className="bg-slate-900 text-white rounded-3xl p-5"><div className="flex items-center gap-3"><ReceiptText className="w-5 h-5 text-slate-300"/><div><p className="font-black text-sm">Ventana independiente</p><p className="text-xs text-slate-400 mt-1">Esta área está separada del Centro total. Las acciones deben respetar los permisos asignados al administrador.</p></div></div></section></div>};
