import React,{useEffect,useState} from 'react';
import {api} from '../services/api';
import {FileText,RefreshCw,X,CheckCircle2,Clock3,LockKeyhole} from 'lucide-react';

type Contract=Record<string,any>;

const money=(v:any)=>`RD$ ${Number(v||0).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export const AdminContractsWindow:React.FC=()=>{
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[contracts,setContracts]=useState<Contract[]>([]),[summary,setSummary]=useState<any>({}),[error,setError]=useState(''),[selected,setSelected]=useState<Contract|null>(null);
 const load=async()=>{setLoading(true);setError('');try{const data=await api.get<any>('/admin-panel/contracts');setContracts(data?.contracts||[]);setSummary(data?.summary||{});}catch(e:any){setError(e?.message||'No se pudieron cargar los contratos digitales.')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const openWindow=()=>{setOpen(true);load()};
 return <>
  <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
   <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center"><FileText className="w-5 h-5"/></div><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gestión administrativa</p><h2 className="text-lg font-black mt-1">Contratos digitales</h2><p className="text-sm text-slate-500 mt-1">Contratos generados desde las operaciones en Custodia, con aceptación de cliente y trabajador.</p></div></div>
    <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black">{summary.count??contracts.length}</span>
   </div>
   <div className="grid grid-cols-3 gap-2 mt-4">
    <div className="rounded-xl bg-slate-50 border p-3"><div className="text-lg font-black">{summary.count??contracts.length}</div><div className="text-[10px] text-slate-500 font-bold">Total</div></div>
    <div className="rounded-xl bg-slate-50 border p-3"><div className="text-lg font-black">{summary.accepted_by_both??0}</div><div className="text-[10px] text-slate-500 font-bold">Aceptados ambos</div></div>
    <div className="rounded-xl bg-slate-50 border p-3"><div className="text-lg font-black">{summary.locked??0}</div><div className="text-[10px] text-slate-500 font-bold">Bloqueados</div></div>
   </div>
   <button onClick={openWindow} className="mt-4 w-full px-4 py-3 rounded-xl bg-slate-950 text-white font-black text-sm inline-flex items-center justify-center gap-2"><FileText className="w-4 h-4"/>Abrir Contratos Digitales</button>
  </section>

  {open&&<div className="fixed inset-0 z-50 bg-slate-950/50 p-3 sm:p-6 flex items-center justify-center" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-center justify-between gap-3"><div><h2 className="font-black text-xl">Contratos digitales</h2><p className="text-xs text-slate-500">Datos reales del backend administrativo.</p></div><div className="flex items-center gap-2"><button onClick={load} disabled={loading} className="p-2 rounded-xl border bg-white"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button><button onClick={()=>setOpen(false)} className="p-2 rounded-xl border bg-white"><X className="w-4 h-4"/></button></div></div>
    <div className="p-5 space-y-3">
     {error&&<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>}
     {loading&&!contracts.length?<div className="p-8 text-center text-sm text-slate-500">Cargando contratos…</div>:contracts.length===0?<div className="p-8 text-center text-sm text-slate-500">No hay contratos digitales registrados.</div>:contracts.map(c=><button key={String(c.id)} onClick={()=>setSelected(c)} className="w-full text-left rounded-2xl border border-slate-200 p-4 hover:border-slate-400 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{c.contract_number||`Contrato #${c.id}`}</p><p className="text-sm font-bold mt-1">{c.title||'Servicio SERVIYA'}</p></div><span className="px-2 py-1 rounded-full bg-slate-100 text-[10px] font-black">{c.status||'SIN ESTADO'}</span></div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-slate-600"><div>Cliente: <b>{c.client_name||'—'}</b></div><div>Trabajador: <b>{c.worker_name||'—'}</b></div><div>Monto: <b>{money(c.total_amount_rd)}</b></div><div>Neto trabajador: <b>{money(c.worker_payout_rd)}</b></div></div>
      <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-bold"><span className="inline-flex items-center gap-1">{c.client_accepted_at?<CheckCircle2 className="w-3 h-3 text-emerald-600"/>:<Clock3 className="w-3 h-3 text-amber-600"/>}Cliente {c.client_accepted_at?'aceptó':'pendiente'}</span><span className="inline-flex items-center gap-1">{c.worker_accepted_at?<CheckCircle2 className="w-3 h-3 text-emerald-600"/>:<Clock3 className="w-3 h-3 text-amber-600"/>}Trabajador {c.worker_accepted_at?'aceptó':'pendiente'}</span>{c.locked_at&&<span className="inline-flex items-center gap-1"><LockKeyhole className="w-3 h-3"/>Bloqueado</span>}</div>
     </button>)}
    </div>
   </div>
  </div>}

  {selected&&<div className="fixed inset-0 z-[60] bg-slate-950/50 p-3 sm:p-6 flex items-center justify-center" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="p-5 border-b flex items-center justify-between"><div><h3 className="font-black text-lg">{selected.contract_number||`Contrato #${selected.id}`}</h3><p className="text-xs text-slate-500 mt-1">{selected.title||'Servicio SERVIYA'}</p></div><button onClick={()=>setSelected(null)} className="p-2 rounded-xl border"><X className="w-4 h-4"/></button></div><div className="p-5 space-y-3 text-sm"><div className="grid sm:grid-cols-2 gap-3"><Info label="Cliente" value={selected.client_name}/><Info label="Trabajador" value={selected.worker_name}/><Info label="Estado" value={selected.status}/><Info label="Monto acordado" value={money(selected.total_amount_rd)}/><Info label="Comisión SERVIYA" value={money(selected.commission_amount_rd)}/><Info label="Pago al trabajador" value={money(selected.worker_payout_rd)}/><Info label="Generado" value={selected.generated_at?new Date(selected.generated_at).toLocaleString('es-DO'):'—'}/><Info label="Bloqueado" value={selected.locked_at?new Date(selected.locked_at).toLocaleString('es-DO'):'No'}/></div><div className="rounded-2xl bg-slate-50 border p-4"><p className="font-black text-sm">Aceptaciones</p><p className="text-xs mt-2">Cliente: {selected.client_accepted_at?'Aceptado':'Pendiente'}</p><p className="text-xs mt-1">Trabajador: {selected.worker_accepted_at?'Aceptado':'Pendiente'}</p></div><button onClick={()=>setSelected(null)} className="w-full px-4 py-3 rounded-xl bg-slate-950 text-white font-black">Cerrar</button></div></div></div>}
 </>;
};

const Info:React.FC<{label:string,value:any}>=({label,value})=><div className="rounded-xl border bg-white p-3"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">{label}</div><div className="font-bold mt-1 break-words">{value||'—'}</div></div>;
