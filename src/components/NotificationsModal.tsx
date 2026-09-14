import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, Bell, ArrowRight, CalendarDays, CheckCircle2, PlayCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NotificationsModalProps { onClose: () => void; }
type Destination = 'service' | 'chat' | 'applications' | 'wallet' | 'dispute' | 'contract' | 'revisit';
type Revisit={id:string;service_id:string;issue:string;description:string;status:string;scheduled_at?:string|null;resolution_notes?:string|null;service_title?:string|null;client_name?:string|null;certificate_ref?:string|null};
type WarrantyPayload={warranty:any;revisits:Revisit[]};
const labels:Record<string,string>={SOLICITADA:'Solicitada',PROGRAMADA:'Programada',CORRECCION_EN_PROCESO:'Corrección en proceso',CORRECCION_REALIZADA:'Corrección realizada — pendiente de confirmación',CERRADA:'Cerrada',ESCALADA_ADMIN:'Escalada a Administración'};
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString('es-DO',{dateStyle:'medium',timeStyle:'short'}):'—';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const isWorker=String(user?.activeRole||user?.role||'').toUpperCase()==='TRABAJADOR';
  const [selectedRevisit,setSelectedRevisit]=useState<Revisit|null>(null);
  const [revisitBusy,setRevisitBusy]=useState(false);
  const [revisitMessage,setRevisitMessage]=useState('');
  const [revisitError,setRevisitError]=useState('');
  const [schedule,setSchedule]=useState('');
  const [resolution,setResolution]=useState('');

  const classify=(n:any):{destination:Destination;tab:string;label:string}=>{
    const type=String(n.type||'').toUpperCase();
    const text=`${n.title||''} ${n.message||''}`.toLowerCase();
    if(type.includes('WARRANTY_REVISIT')||text.includes('revisita de garantía')||text.includes('revisita de garantia'))return{destination:'revisit',tab:'mis-servicios',label:'Abrir revisita de garantía'};
    if(type==='CONTRACT_ISSUED'||type==='CONTRACT_PENDING'||type==='CONTRACT_READY'||text.includes('contrato digital disponible')||text.includes('contrato digital'))return{destination:'contract',tab:'contratos',label:'Abrir contrato digital y aceptar'};
    if(type==='TRABAJADOR_SELECCIONADO'||text.includes('fuiste seleccionado')||text.includes('has sido seleccionado'))return{destination:'service',tab:'mis-servicios',label:'Abrir negociación y contraoferta'};
    if(type.includes('MESSAGE')||type.includes('CHAT')||text.includes('mensaje'))return{destination:'chat',tab:'mensajes',label:'Abrir mensajes'};
    if(type.includes('APPLICATION')||type.includes('POSTUL')||text.includes('postulación')||text.includes('postulacion'))return{destination:'applications',tab:'postulaciones',label:'Abrir postulaciones'};
    if(type.includes('DISPUTE')||type.includes('DISPUTA'))return{destination:'dispute',tab:'mis-trabajos',label:'Abrir disputa'};
    if(type.includes('WALLET')||type.includes('WITHDRAW')||type.includes('RETIRO')||type.includes('DEPOSIT')||type.includes('PAYMENT'))return{destination:'wallet',tab:'billetera',label:'Abrir depósito y custodia'};
    return{destination:'service',tab:'mis-trabajos',label:'Abrir servicio'};
  };

  const openWorkerRevisit=async(n:any)=>{
    setRevisitError('');setRevisitMessage('');setSelectedRevisit(null);setSchedule('');setResolution('');
    try{
      const serviceId=String(n.related_entity_id||'');
      const w=await api.get<WarrantyPayload>(`/completion/${serviceId}/warranty`);
      const found=(w?.revisits||[]).find(r=>String(r.service_id)===serviceId&&(r.status!=='CERRADA'||String(n.type||'').includes('CLOSED')));
      const fallback=(w?.revisits||[]).find(r=>r.status!=='CERRADA')||w?.revisits?.[0];
      const r=found||fallback;
      if(!r)throw new Error('La notificación existe, pero no se encontró la revisita guardada para este servicio.');
      setSelectedRevisit({...r,service_id:serviceId,service_title:w.warranty?.service_title,client_name:w.warranty?.client_name,certificate_ref:w.warranty?.certificate_ref});
    }catch(e:any){setRevisitError(e?.message||'No se pudo cargar la revisita guardada.');}
  };

  const navigate=(n:any)=>{
    const route=classify(n);
    if(route.destination==='revisit'&&isWorker){void openWorkerRevisit(n);return;}
    onClose();
    window.dispatchEvent(new CustomEvent('serviya:navigate',{detail:{tab:route.tab,destination:route.destination,serviceId:n.related_entity_id?String(n.related_entity_id):'',notificationType:String(n.type||'').toUpperCase(),notificationId:n.id?String(n.id):'',singleWindow:true}}));
  };

  const doWorkerAction=async(action:'schedule'|'start'|'complete')=>{
    if(!selectedRevisit)return;
    setRevisitBusy(true);setRevisitError('');setRevisitMessage('');
    try{
      let path='';let body:any={};let success='';
      if(action==='schedule'){if(!schedule)throw new Error('Selecciona fecha y hora para programar la revisita.');path='schedule';body={scheduled_at:new Date(schedule).toISOString()};success='Revisita programada.';}
      if(action==='start'){path='start';success='Revisita iniciada.';}
      if(action==='complete'){if(resolution.trim().length<5)throw new Error('Describe la corrección realizada.');path='complete';body={resolution_notes:resolution.trim()};success='Corrección registrada.';}
      const out=await api.post<any>(`/completion/${selectedRevisit.service_id}/warranty/revisits/${selectedRevisit.id}/${path}`,body);
      setSelectedRevisit(prev=>prev?{...prev,status:String(out?.status||prev.status),scheduled_at:action==='schedule'?body.scheduled_at:prev.scheduled_at,resolution_notes:action==='complete'?resolution.trim():prev.resolution_notes}:prev);
      setRevisitMessage(`${success} Estado guardado: ${out?.status||'OK'}.`);setSchedule('');setResolution('');
    }catch(e:any){setRevisitError(e?.message||'La acción fue rechazada.');}finally{setRevisitBusy(false);}
  };

  const openRelated=(n:any)=>{if(n.id)api.patch(`/notifications/${n.id}/read`).catch(()=>{});navigate(n);};

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative max-h-[88vh] flex flex-col">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" aria-label="Cerrar"><X className="w-5 h-5"/></button>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3"><div className="flex items-center gap-2"><Bell className="w-5 h-5 text-blue-600"/><h3 className="text-lg font-bold text-slate-900">Notificaciones</h3></div><button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline font-semibold">Marcar leídas</button></div>
      {isWorker&&selectedRevisit?<div className="flex-1 overflow-y-auto space-y-3"><button onClick={()=>{setSelectedRevisit(null);setRevisitError('');setRevisitMessage('');}} className="text-xs font-black text-blue-700">← Volver a notificaciones</button><div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4"><p className="text-[10px] uppercase tracking-widest font-black text-indigo-700">SERVIYA • TRABAJADOR / TÉCNICO</p><h2 className="text-xl font-black text-slate-900 mt-1">Revisita de garantía</h2><p className="text-xs text-slate-500 mt-1">Este es el mismo caso guardado en la garantía del servicio.</p></div>{revisitError&&<div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800">{revisitError}</div>}{revisitMessage&&<div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800"><CheckCircle2 className="inline w-4 h-4 mr-1"/>{revisitMessage}</div>}<div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs"><p><b>Servicio:</b> {selectedRevisit.service_title||'—'}</p><p><b>Cliente:</b> {selectedRevisit.client_name||'—'}</p><p><b>Certificado:</b> {selectedRevisit.certificate_ref||'—'}</p><p><b>Estado:</b> <span className="font-black text-indigo-700">{labels[selectedRevisit.status]||selectedRevisit.status}</span></p><div className="rounded-xl bg-slate-50 p-3 mt-2"><p className="font-black text-sm text-slate-900">{selectedRevisit.issue}</p><p className="text-slate-600 mt-1">{selectedRevisit.description}</p></div>{selectedRevisit.scheduled_at&&<p className="font-bold text-blue-700"><CalendarDays className="inline w-4 h-4 mr-1"/>{fmt(selectedRevisit.scheduled_at)}</p>}{selectedRevisit.resolution_notes&&<p className="rounded-xl bg-emerald-50 p-3 text-emerald-900"><b>Corrección:</b> {selectedRevisit.resolution_notes}</p>}</div>{selectedRevisit.status==='SOLICITADA'&&<div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"><p className="font-black text-sm">Programar revisita</p><input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)} className="w-full rounded-xl border border-slate-300 p-3 text-sm"/><button disabled={revisitBusy} onClick={()=>void doWorkerAction('schedule')} className="w-full rounded-xl bg-blue-600 text-white py-3 font-black disabled:opacity-50"><CalendarDays className="inline w-4 h-4 mr-1"/>Programar</button></div>}{selectedRevisit.status==='PROGRAMADA'&&<button disabled={revisitBusy} onClick={()=>void doWorkerAction('start')} className="w-full rounded-xl bg-indigo-600 text-white py-3 font-black disabled:opacity-50"><PlayCircle className="inline w-4 h-4 mr-1"/>Iniciar corrección</button>}{selectedRevisit.status==='CORRECCION_EN_PROCESO'&&<div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"><p className="font-black text-sm">Registrar corrección</p><textarea value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Describe qué corregiste y qué quedó resuelto" className="w-full min-h-24 rounded-xl border border-slate-300 p-3 text-sm"/><button disabled={revisitBusy} onClick={()=>void doWorkerAction('complete')} className="w-full rounded-xl bg-emerald-600 text-white py-3 font-black disabled:opacity-50"><CheckCircle2 className="inline w-4 h-4 mr-1"/>Registrar corrección realizada</button></div>}{selectedRevisit.status==='CORRECCION_REALIZADA'&&<div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-900">La corrección ya fue registrada. Ahora el cliente debe confirmar la solución.</div>}{selectedRevisit.status==='CERRADA'&&<div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800"><CheckCircle2 className="inline w-4 h-4 mr-1"/>Revisita cerrada y solución confirmada.</div>}</div>:<div className="flex-1 overflow-y-auto space-y-2">{notifications.length===0?<p className="text-xs text-slate-400 text-center py-8">No tienes notificaciones pendientes.</p>:notifications.map((n:any)=>{const route=classify(n);return <button key={n.id} onClick={()=>openRelated(n)} className={`w-full text-left p-3 rounded-2xl border text-xs space-y-1 transition active:scale-[0.99] ${n.read?'bg-slate-50 border-slate-100 text-slate-600':'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-xs break-words">{n.title}</span><span className="text-[10px] text-slate-400 shrink-0">{new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><p className="break-words leading-relaxed">{n.message}</p><p className="text-[10px] font-bold mt-1 text-blue-600 inline-flex items-center gap-1">{route.label}<ArrowRight className="w-3 h-3"/></p></button>;})}</div>}
    </div>
  </div>;
};
