import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EscrowDepositModal } from './EscrowDepositModal';
import { MessageSquare, Lock, Handshake, CheckCircle, ShieldCheck, Send, X } from 'lucide-react';

interface Props { serviceId:string; clientId:string; workerId:string; budget:number; title:string; onRefresh:()=>void; onOpenChat:(serviceId:string,receiverId:string)=>void; }

type Negotiation = { budget_rd:number; negotiated_price_rd:number|null; offer_rd:number|null; offer_by:string|null; offer_note:string|null; status:string; price_agreed_at:string|null; service_status:string };

export const NegotiationPanel:React.FC<Props>=({serviceId,clientId,workerId,budget,title,onRefresh,onOpenChat})=>{
 const {user}=useAuth();
 const [data,setData]=useState<Negotiation|null>(null);
 const [price,setPrice]=useState(''); const [note,setNote]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState(''); const [showPay,setShowPay]=useState(false); const [showForm,setShowForm]=useState(false);
 const isClient=user?.id===clientId; const isWorker=user?.id===workerId; const load=async()=>{try{setData(await api.get<Negotiation>(`/negotiation/${serviceId}`));}catch(e:any){setError(e.message||'No se pudo cargar la negociación.')}};
 useEffect(()=>{load(); const t=window.setInterval(load,4000); return()=>window.clearInterval(t)},[serviceId]);
 if(!user||(!isClient&&!isWorker)||!data) return null;
 const offerPending=data.status==='PENDIENTE_ACEPTACION'; const agreed=data.status==='ACORDADO'&&data.negotiated_price_rd!==null;
 const submitOffer=async()=>{setError('');setSuccess('');const p=Number(price);if(!p||p<=0){setError('Indica un precio válido en RD$.');return}setBusy(true);try{await api.post(`/negotiation/${serviceId}/offer`,{price_rd:p,note:note.trim()||null});setSuccess('Propuesta enviada. La otra parte debe aceptarla.');setPrice('');setNote('');setShowForm(false);await load();}catch(e:any){setError(e.message||'No se pudo enviar la propuesta.')}finally{setBusy(false)}};
 const accept=async()=>{setError('');setSuccess('');setBusy(true);try{await api.post(`/negotiation/${serviceId}/accept`,{});setSuccess('Precio acordado. Ahora el cliente puede proceder al pago en Custodia SERVIYA.');await load();onRefresh();}catch(e:any){setError(e.message||'No se pudo aceptar el precio.')}finally{setBusy(false)}};
 return <>
  <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[48] w-[calc(100%-1rem)] max-w-2xl">
   <div className="bg-white border border-blue-200 shadow-2xl rounded-3xl overflow-hidden">
    <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-teal-600 text-white flex items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-widest opacity-90">Contratación & Escrow</p><p className="font-black text-sm">Negociación de precio • {title}</p></div>
      <Handshake className="w-5 h-5"/>
    </div>
    <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><p className="text-slate-500">Presupuesto inicial</p><p className="font-black text-slate-900 mt-1">RD$ {Number(budget).toLocaleString()}</p><p className="text-[10px] text-slate-500 mt-1">Orientativo; no está en custodia.</p></div><div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><p className="text-emerald-700">Estado del precio</p><p className="font-black text-emerald-900 mt-1">{agreed?'ACORDADO':offerPending?'PENDIENTE DE ACEPTACIÓN':'NEGOCIANDO'}</p></div></div>
      {error&&<div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700">{error}</div>}
      {success&&<div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-800 flex gap-2"><CheckCircle className="w-4 h-4 shrink-0"/>{success}</div>}
      {!agreed&&data.offer_rd!==null&&<div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase font-black text-blue-700">Propuesta actual</p><p className="text-xl font-black text-slate-900">RD$ {Number(data.offer_rd).toLocaleString()}</p></div><span className="text-[10px] font-bold bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full">{data.offer_by===user.id?'Tu propuesta':'Propuesta recibida'}</span></div>{data.offer_note&&<p className="text-xs text-slate-600 mt-2">{data.offer_note}</p>}{data.offer_by!==user.id&&<button disabled={busy} onClick={accept} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-xl disabled:opacity-50"><CheckCircle className="w-4 h-4 inline mr-1"/>Aceptar precio de RD$ {Number(data.offer_rd).toLocaleString()}</button>}</div>}
      {!agreed&&<div className="flex gap-2"><button onClick={()=>setShowForm(v=>!v)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-slate-300 text-slate-800 font-bold text-xs py-2.5 rounded-xl"><Send className="w-4 h-4"/>{data.offer_rd!==null?'Contraofertar / cambiar precio':'Proponer precio'}</button><button onClick={()=>onOpenChat(serviceId,isClient?workerId:clientId)} className="inline-flex items-center justify-center gap-1.5 bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl"><MessageSquare className="w-4 h-4"/>Chat</button></div>}
      {!agreed&&showForm&&<div className="rounded-2xl border border-slate-200 p-3 space-y-2"><div className="flex justify-between"><p className="text-xs font-black">Nueva propuesta</p><button onClick={()=>setShowForm(false)}><X className="w-4 h-4 text-slate-400"/></button></div><input value={price} onChange={e=>setPrice(e.target.value)} type="number" min="1" placeholder="Precio final acordado en RD$" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"/><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Condiciones, materiales, alcance o fecha..." className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs min-h-20"/><button disabled={busy} onClick={submitOffer} className="w-full bg-blue-600 text-white font-black text-xs py-3 rounded-xl disabled:opacity-50">{busy?'Enviando…':'Enviar propuesta'}</button></div>}
      {agreed&&isClient&&<div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-emerald-900"><ShieldCheck className="w-5 h-5"/><div><p className="text-[10px] uppercase font-black">Precio final sin sorpresas</p><p className="text-xl font-black">RD$ {Number(data.negotiated_price_rd).toLocaleString()}</p></div></div><p className="text-xs text-emerald-800 mt-2">Ambas partes aceptaron el precio. Ahora sí se solicita el dinero para ponerlo en Custodia SERVIYA. No se utilizó el presupuesto inicial para cobrar.</p><button onClick={()=>setShowPay(true)} className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl"><Lock className="w-4 h-4 inline mr-1"/>Proceder al pago en Custodia SERVIYA — RD$ {Number(data.negotiated_price_rd).toLocaleString()}</button></div>}
      {agreed&&isWorker&&<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900"><div className="flex items-center gap-2 font-black"><Lock className="w-4 h-4"/>Precio acordado: RD$ {Number(data.negotiated_price_rd).toLocaleString()}</div><p className="mt-1">Esperando que el cliente deposite este monto en Custodia SERVIYA. Cuando la custodia esté retenida podrás iniciar el trabajo.</p></div>}
    </div>
   </div>
  </div>
  {showPay&&data.negotiated_price_rd!==null&&<EscrowDepositModal serviceId={serviceId} amount={Number(data.negotiated_price_rd)} onClose={()=>setShowPay(false)} onSuccess={()=>{setShowPay(false);onRefresh();load();}}/>}
 </>;
};
