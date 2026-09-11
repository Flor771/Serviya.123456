import React,{useEffect,useState} from 'react';
import {Bell,RefreshCw,ShieldAlert,CheckCircle2} from 'lucide-react';
import {api} from '../services/api';

type Note={id:string;title:string;message:string;type:string;read:boolean;related_entity_id?:string|null;created_at:string};

export const AdminAlerts:React.FC=()=>{
 const [notes,setNotes]=useState<Note[]>([]);
 const [loading,setLoading]=useState(false);
 const [open,setOpen]=useState<Note|null>(null);
 const load=async()=>{try{setLoading(true);const r=await api.get<any>('/notifications');setNotes((r?.notifications||[]).filter((n:Note)=>!n.read));}catch{}finally{setLoading(false)}};
 useEffect(()=>{load();const id=window.setInterval(load,10000);return()=>window.clearInterval(id)},[]);
 const mark=async(n:Note)=>{try{await api.patch(`/notifications/${n.id}/read`,{});}catch{}setNotes(x=>x.filter(y=>y.id!==n.id));setOpen(n)};
 return <section className={`rounded-3xl border-2 shadow-sm overflow-hidden ${notes.length?'border-orange-300 bg-orange-50/40':'border-slate-200 bg-white'}`}>
  <div className="p-5 flex items-center justify-between gap-3">
   <div className="flex items-center gap-3"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${notes.length?'bg-orange-600 text-white':'bg-slate-100 text-slate-600'}`}><Bell className="w-5 h-5"/></div><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Centro de alertas</p><h3 className="font-black text-lg">Notificaciones de Administración {notes.length>0&&<span className="ml-2 inline-flex min-w-6 h-6 px-2 items-center justify-center rounded-full bg-red-600 text-white text-xs">{notes.length}</span>}</h3><p className="text-xs text-slate-500">Se actualiza automáticamente. Las alertas críticas aparecen aquí.</p></div></div>
   <button onClick={load} disabled={loading} className="p-3 rounded-xl border bg-white"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button>
  </div>
  <div className="px-5 pb-5">{notes.length?notes.slice(0,8).map(n=><button key={n.id} onClick={()=>mark(n)} className="w-full text-left p-4 mb-2 rounded-2xl border border-orange-200 bg-white hover:border-orange-400 transition"><div className="flex items-start gap-3"><ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5"/><div className="min-w-0"><b className="text-sm">{n.title}</b><p className="text-sm text-slate-600 mt-1">{n.message}</p><p className="text-[10px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()} • {n.type}</p></div></div></button>):<div className="p-4 rounded-2xl bg-white border text-sm text-slate-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600"/>No hay alertas administrativas sin leer.</div>}</div>
  {open&&<div className="fixed inset-0 z-[100] bg-black/50 p-4 flex items-center justify-center" onClick={()=>setOpen(null)}><div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><p className="text-[10px] font-black uppercase text-orange-600">Alerta administrativa</p><h3 className="text-xl font-black mt-2">{open.title}</h3><p className="text-sm text-slate-700 mt-4 whitespace-pre-wrap">{open.message}</p>{open.related_entity_id&&<p className="text-xs text-slate-400 mt-4">Servicio relacionado: {open.related_entity_id}</p>}<button onClick={()=>setOpen(null)} className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-black">Cerrar</button></div></div>}
 </section>;
};
