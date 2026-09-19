import React,{useEffect,useState} from 'react';
import {api} from '../services/api';
import {Trash2,RefreshCw,AlertTriangle} from 'lucide-react';

type ServiceRow={id:string;title:string;status:string;price_rd:number;client_name:string;created_at:string};
type MovementRow={id:string;source:string;type:string;amount:number;description:string;created_at:string};

export const AdminCleanupPanel:React.FC=()=>{
 const [services,setServices]=useState<ServiceRow[]>([]);
 const [movements,setMovements]=useState<MovementRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState('');
 const [confirming,setConfirming]=useState<{kind:'service'|'movement';id:string;source?:string;label:string}|null>(null);
 const [phrase,setPhrase]=useState('');

 const load=async()=>{
  setLoading(true);setError('');
  try{
   const [s,m]=await Promise.all([api.get<any>('/admin/cleanup/services'),api.get<any>('/admin/cleanup/movements')]);
   setServices(s?.services||[]);setMovements(m?.movements||[]);
  }catch(e:any){setError(e?.message||'No se pudieron cargar los datos de prueba.')}
  finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);

 const remove=async()=>{
  if(!confirming)return;
  if(phrase.trim().toUpperCase()!=='ELIMINAR'){setError('Debes escribir ELIMINAR para confirmar.');return}
  setBusy(confirming.id);
  try{
   if(confirming.kind==='service'){
    await api.delete<any>(`/admin/cleanup/services/${encodeURIComponent(confirming.id)}`,{confirmation:'ELIMINAR'});
   }else{
    await api.delete<any>(`/admin/cleanup/movements/${encodeURIComponent(confirming.source!)}/${encodeURIComponent(confirming.id)}`,{confirmation:'ELIMINAR'});
   }
   setConfirming(null);setPhrase('');await load();
  }catch(e:any){setError(e?.message||'No se pudo eliminar.')}
  finally{setBusy('')}
 };

 return <section className="rounded-3xl bg-white border border-amber-200 shadow-sm overflow-hidden">
  <div className="p-5 bg-amber-50 border-b border-amber-200">
   <div className="flex items-start justify-between gap-3">
    <div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-700"/></div><div><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Herramientas administrativas</p><h2 className="text-xl font-black text-slate-900">Limpieza de pruebas</h2><p className="text-xs text-slate-600 mt-1 max-w-2xl">Elimina publicaciones o movimientos de prueba directamente desde la base de datos de SERVIYA. La cuenta de administrador y la aplicación no se eliminan.</p></div></div>
    <button onClick={load} className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center" title="Actualizar"><RefreshCw className="w-4 h-4"/></button>
   </div>
   {error&&<div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{error}</div>}
  </div>
  <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
   <div>
    <div className="flex items-center justify-between mb-3"><h3 className="font-black text-slate-900">Publicaciones</h3><span className="text-xs font-bold text-slate-500">{services.length}</span></div>
    <div className="space-y-2 max-h-[430px] overflow-y-auto">
     {loading?<p className="text-sm text-slate-500">Cargando…</p>:services.length===0?<p className="text-sm text-slate-500 p-4 rounded-xl bg-slate-50">No hay publicaciones.</p>:services.map(s=><div key={s.id} className="border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="font-bold text-sm truncate">{s.title}</p><p className="text-[11px] text-slate-500">{s.client_name} · RD$ {Number(s.price_rd||0).toLocaleString('es-DO')} · {s.status}</p><p className="text-[10px] text-slate-400 truncate">{s.id}</p></div>
      <button disabled={!!busy} onClick={()=>{setError('');setPhrase('');setConfirming({kind:'service',id:s.id,label:s.title})}} className="shrink-0 w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center disabled:opacity-50" title="Eliminar publicación"><Trash2 className="w-4 h-4"/></button>
     </div>)}
    </div>
   </div>
   <div>
    <div className="flex items-center justify-between mb-3"><h3 className="font-black text-slate-900">Movimientos de prueba</h3><span className="text-xs font-bold text-slate-500">{movements.length}</span></div>
    <div className="space-y-2 max-h-[430px] overflow-y-auto">
     {loading?<p className="text-sm text-slate-500">Cargando…</p>:movements.length===0?<p className="text-sm text-slate-500 p-4 rounded-xl bg-slate-50">No hay movimientos.</p>:movements.map(m=><div key={m.source+'-'+m.id} className="border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="font-bold text-sm">{m.type} · RD$ {Number(m.amount||0).toLocaleString('es-DO')}</p><p className="text-[11px] text-slate-500">{m.source} · {m.description||'Sin descripción'}</p><p className="text-[10px] text-slate-400 truncate">{m.id}</p></div>
      <button disabled={!!busy} onClick={()=>{setError('');setPhrase('');setConfirming({kind:'movement',id:m.id,source:m.source,label:m.type})}} className="shrink-0 w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center disabled:opacity-50" title="Eliminar movimiento"><Trash2 className="w-4 h-4"/></button>
     </div>)}
    </div>
   </div>
  </div>
  {confirming&&<div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
   <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4"><Trash2/></div>
    <h3 className="text-xl font-black">Confirmar eliminación</h3>
    <p className="text-sm text-slate-600 mt-2">Vas a eliminar <b>{confirming.label}</b>. Esta acción es permanente y está destinada a datos de prueba.</p>
    <p className="text-xs text-slate-500 mt-3">Escribe <b>ELIMINAR</b> para continuar.</p>
    <input value={phrase} onChange={e=>setPhrase(e.target.value)} className="w-full mt-2 p-3 rounded-xl border border-slate-300 text-sm font-bold" placeholder="ELIMINAR" autoFocus/>
    <div className="flex gap-2 mt-4"><button onClick={()=>{setConfirming(null);setPhrase('')}} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm">Cancelar</button><button onClick={remove} disabled={busy===confirming.id} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm disabled:opacity-50">{busy===confirming.id?'Eliminando…':'Eliminar'}</button></div>
   </div>
  </div>}
 </section>
};
