import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, CalendarDays, RefreshCw, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

type Revisit = { id:string; issue:string; description:string; status:string; scheduled_at?:string|null; resolution_notes?:string|null; created_at?:string|null; resolved_at?:string|null };
type WarrantyPayload = { warranty:{ id:string; service_id:string; certificate_ref?:string|null; coverage_days:number; status:string; activated_at?:string|null; expires_at?:string|null; client_name?:string|null; worker_name?:string|null; service_title?:string|null; amount_rd:number; expired:boolean }; revisits:Revisit[] };

const fmt=(v?:string|null)=>v?new Date(v).toLocaleString('es-DO',{dateStyle:'medium',timeStyle:'short'}):'—';

export const WarrantyLauncher:React.FC=()=>{
 const [card,setCard]=useState<HTMLElement|null>(null); const [open,setOpen]=useState(false); const [serviceId,setServiceId]=useState(''); const [data,setData]=useState<WarrantyPayload|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [issue,setIssue]=useState(''); const [description,setDescription]=useState(''); const [sending,setSending]=useState(false); const [message,setMessage]=useState('');
 useEffect(()=>{
  const inject=()=>{
   const hash=Array.from(document.querySelectorAll<HTMLElement>('p')).find(n=>(n.textContent||'').includes('Hash SHA-256:'));
   if(!hash)return;
   const root=hash.closest<HTMLElement>('.bg-white')||hash.parentElement?.closest<HTMLElement>('.bg-white'); if(!root)return;
   const serviceText=Array.from(root.querySelectorAll('p')).find(n=>(n.textContent||'').includes('Servicio'));
   const contractCard=root;
   const idMatch=(contractCard.textContent||'').match(/Servicio[^\n]*\n[^\n]*/i);
   const buttons=contractCard.querySelectorAll<HTMLButtonElement>('button');
   if(!contractCard.querySelector('[data-serviya-warranty-launcher]')){
    const wrap=document.createElement('div'); wrap.setAttribute('data-serviya-warranty-launcher','true'); wrap.style.cssText='margin-top:10px;';
    const btn=document.createElement('button'); btn.type='button'; btn.textContent='🛡️ Garantía SERVIYA'; btn.style.cssText='width:100%;padding:12px 14px;border-radius:12px;border:1px solid #0f766e;background:#ecfdf5;color:#0f766e;font-weight:900;font-size:13px;cursor:pointer;';
    btn.onclick=(e)=>{e.preventDefault();e.stopPropagation();setCard(contractCard);const sid=(contractCard.getAttribute('data-service-id')||'');setServiceId(sid);setOpen(true);setError('');setMessage('');}; wrap.appendChild(btn); contractCard.appendChild(wrap);
   }
   const serviceIdAttr=contractCard.getAttribute('data-service-id'); if(serviceIdAttr)setServiceId(serviceIdAttr);
   if(serviceText && !serviceIdAttr){ const text=serviceText.parentElement?.textContent||''; const candidate=text.replace(/^.*Servicio/i,'').trim().split(/\n|Monto|RD\$/i)[0].trim(); if(candidate && candidate.length<80) contractCard.setAttribute('data-service-label',candidate); }
  };
  const observer=new MutationObserver(inject); observer.observe(document.body,{childList:true,subtree:true}); inject(); return()=>observer.disconnect();
 },[]);
 useEffect(()=>{ if(open&&serviceId)load(); },[open,serviceId]);
 const load=async()=>{setLoading(true);setError('');try{setData(await api.get<WarrantyPayload>(`/completion/${serviceId}/warranty`));}catch(e:any){setData(null);setError(e?.message||'No se pudo cargar la garantía.');}finally{setLoading(false);}};
 const request=async()=>{if(!serviceId||issue.trim().length<3||description.trim().length<10)return;setSending(true);setError('');setMessage('');try{const r=await api.post<any>(`/completion/${serviceId}/warranty/revisit`,{issue:issue.trim(),description:description.trim()});setMessage(`Revisita solicitada correctamente. Estado: ${r?.status||'SOLICITADA'}.`);setIssue('');setDescription('');await load();}catch(e:any){setError(e?.message||'No se pudo solicitar la revisita.');}finally{setSending(false);}};
 const close=()=>{setOpen(false);setData(null);setError('');setMessage('');setIssue('');setDescription('');};
 return open?<div className="fixed inset-0 z-[95] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" onClick={close}><div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl bg-slate-100 shadow-2xl" onClick={e=>e.stopPropagation()}>
  <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">SERVIYA • PROTECCIÓN</p><h2 className="text-2xl font-black text-slate-900 mt-1">Garantía SERVIYA</h2><p className="text-xs text-slate-500 mt-1">Protección registrada después de la liquidación del servicio.</p></div><button onClick={close} className="p-2 rounded-xl bg-slate-100"><X className="w-5 h-5"/></button></div>
  <div className="p-4 sm:p-5 space-y-4">
   {loading&&<div className="bg-white rounded-2xl p-7 text-center text-sm text-slate-500">Cargando garantía…</div>}
   {error&&<div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm font-semibold flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>{error}</div>}
   {message&&<div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm font-bold flex gap-2"><CheckCircle2 className="w-5 h-5 shrink-0"/>{message}</div>}
   {data&&<>
    <section className={`rounded-2xl border p-5 ${data.warranty.expired?'border-slate-200 bg-white':'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-emerald-600"/></div><div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Certificado</p><h3 className="font-black text-slate-900">{data.warranty.certificate_ref||'GAR-SRV'}</h3></div></div><span className="px-3 py-1.5 rounded-lg bg-white text-xs font-black text-emerald-700">{data.warranty.status}</span></div>
      <div className="grid grid-cols-2 gap-3 mt-5"><div className="bg-white rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase font-bold">Cobertura</p><p className="text-lg font-black text-slate-900">{data.warranty.coverage_days} días</p></div><div className="bg-white rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase font-bold">Vence</p><p className="text-sm font-black text-slate-900">{fmt(data.warranty.expires_at)}</p></div></div>
      <div className="mt-3 text-xs text-slate-600 space-y-1"><p><b>Servicio:</b> {data.warranty.service_title||'—'}</p><p><b>Cliente:</b> {data.warranty.client_name||'—'}</p><p><b>Trabajador:</b> {data.warranty.worker_name||'—'}</p><p><b>Activada:</b> {fmt(data.warranty.activated_at)}</p></div>
    </section>
    {!data.warranty.expired&&<section className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-blue-600"/><h3 className="font-black text-slate-900">Solicitar revisita</h3></div><p className="text-xs text-slate-500 mt-1">Si el trabajo presenta un problema cubierto durante la garantía, registra aquí la solicitud.</p><input value={issue} onChange={e=>setIssue(e.target.value)} placeholder="Problema a revisar" className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe el problema con detalle (mínimo 10 caracteres)" rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/><button disabled={sending||issue.trim().length<3||description.trim().length<10} onClick={request} className="mt-3 w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-black disabled:opacity-50">{sending?'Registrando…':'Solicitar revisita'}</button></section>}
    <section className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-2"><Clock3 className="w-5 h-5 text-indigo-600"/><h3 className="font-black text-slate-900">Historial de garantía</h3></div>{!data.revisits.length?<p className="text-xs text-slate-500 mt-3">No hay revisitas registradas.</p>:<div className="mt-3 space-y-3">{data.revisits.map(r=><article key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between gap-3"><div><p className="font-black text-sm text-slate-900">{r.issue}</p><p className="text-xs text-slate-500 mt-1">Solicitada: {fmt(r.created_at)}</p></div><span className="text-[10px] font-black px-2 py-1 rounded-lg bg-white text-slate-700">{r.status}</span></div>{r.scheduled_at&&<p className="text-xs text-blue-700 font-bold mt-2"><CalendarDays className="inline w-3.5 h-3.5 mr-1"/>Programada: {fmt(r.scheduled_at)}</p>}{r.resolution_notes&&<p className="text-xs text-slate-600 mt-2"><b>Resolución:</b> {r.resolution_notes}</p>}</article>)}</div>}</section>
   </>}
  </div>
 </div></div>:null;
};
