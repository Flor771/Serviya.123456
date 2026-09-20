import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle, MessageSquare, ShieldCheck, Play, CircleCheckBig, LockKeyhole, X, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Service } from '../types';
import { WorkPhotosModal } from './WorkPhotosModal';
import { NegotiationPanel } from './NegotiationPanel';
import { WorkStatusPanel } from './WorkStatusPanel';
import { WarrantyModal } from './WarrantyModal';

interface Props { service: Service; onRefresh: () => void; onOpenChat: (serviceId: string, receiverId: string) => void; embedded?: boolean; showNegotiation?: boolean; }

const Window: React.FC<{title:string; subtitle?:string; onClose:()=>void; children:React.ReactNode}> = ({title,subtitle,onClose,children}) => (
  <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 flex items-center justify-center" onClick={onClose}>
    <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl" onClick={e=>e.stopPropagation()}>
      <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">SERVIYA • VENTANA</p><h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{title}</h2>{subtitle&&<p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</div>
        <button onClick={onClose} className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center" aria-label="Cerrar ventana"><X className="w-5 h-5"/></button>
      </div>
      <div className="p-3 sm:p-5">{children}</div>
    </div>
  </div>
);

export const WorkFlowActions: React.FC<Props> = ({ service, onRefresh, onOpenChat, embedded = false, showNegotiation = true }) => {
  const { user } = useAuth();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [showPhotos,setShowPhotos]=useState(false),[completion,setCompletion]=useState<any>(null),[workStatus,setWorkStatus]=useState<any>(null),[warranty,setWarranty]=useState<any>(null),[showWarranty,setShowWarranty]=useState(false);
  const [openWindow,setOpenWindow]=useState<'status'|'contract'|'finish'|'review'|null>(null);

  const userId=String(user?.id??''),workerId=String(service.worker_id??''),clientId=String(service.client_id??'');
  const role=String(user?.role??user?.activeRole??'').toUpperCase();
  const isWorkerByRole=role==='TRABAJADOR'||role==='TECNICO'||role==='TÉCNICO';
  const isWorkerAssigned=!!workerId&&userId===workerId, isWorker=isWorkerAssigned||(isWorkerByRole&&!!workerId), isClient=!!clientId&&userId===clientId;

  const load=async()=>{try{setCompletion(await api.get(`/completion/${service.id}`))}catch{setCompletion(null)}try{setWorkStatus(await api.get(`/work-status/${service.id}`))}catch{setWorkStatus(null)}try{const w:any=await api.get(`/completion/${service.id}/warranty`);setWarranty(w?.warranty||null)}catch{setWarranty(null)}};
  useEffect(()=>{if(user)void load()},[service.id,service.status,user?.id]);

  const executeWork=async()=>{if(!window.confirm('¿Confirmas que vas a iniciar oficialmente este trabajo? La Custodia permanecerá protegida.'))return;setBusy(true);setError('');setSuccess('');try{await api.post(`/completion/${service.id}/execute`);setSuccess('Trabajo iniciado oficialmente. La Custodia permanece protegida.');await load();onRefresh()}catch(e:any){setError(e?.message||'No se pudo iniciar el trabajo.')}finally{setBusy(false)}};
  const approveCompletion=async()=>{if(!window.confirm('¿Confirmas que revisaste las fotos y que el trabajo quedó terminado y conforme? Al aceptar, la solicitud pasará a Administración para la liberación de los fondos.'))return;setBusy(true);setError('');setSuccess('');try{await api.post(`/completion/${service.id}/approve`);setSuccess('Conformidad registrada. La solicitud pasó a Administración; los fondos siguen protegidos.');await load();onRefresh();setOpenWindow(null)}catch(e:any){setError(e?.message||'No se pudo registrar la aprobación.')}finally{setBusy(false)}};

  if(!user||(!isWorker&&!isClient))return null;
  const selected=service.status==='TRABAJADOR_SELECCIONADO',inProgress=service.status==='EN_PROGRESO',completed=service.status==='COMPLETADA',finalizing=workStatus?.current_status==='FINALIZANDO';
  const workerRoleCanFinish=isWorker&&!completed&&!completion?.completion_submitted&&(selected||inProgress||finalizing);
  const completionPhotos=Array.isArray(completion?.photos)?completion.photos:(typeof completion?.photos==='string'?(()=>{try{const p=JSON.parse(completion.photos);return Array.isArray(p)?p:[]}catch{return[]}})():[]);
  const evidenceReady=completionPhotos.length>0, clientCanApprove=isClient&&evidenceReady&&(!(!completion?.completion_submitted&&!finalizing));

  const open=(w:'status'|'contract'|'finish'|'review')=>{setError('');setSuccess('');setOpenWindow(w)};

  const launcher=(title:string,desc:string,action:()=>void,cls='border-slate-200 bg-slate-50',icon:React.ReactNode=<ChevronRight className="w-5 h-5"/> )=>(
    <button onClick={action} className={`w-full flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left hover:shadow-md transition ${cls}`}>
      <span><b className="block text-sm text-slate-900">{title}</b><span className="block text-[11px] text-slate-500 mt-1">{desc}</span></span><span className="shrink-0">{icon}</span>
    </button>
  );

  return <>
    <div className={embedded?'w-full':'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[45] w-[calc(100%-1.5rem)] max-w-2xl'}>
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-700 to-teal-600 text-white"><p className="text-[10px] uppercase tracking-widest font-black opacity-90">Continuidad del trabajo</p><p className="text-base font-black mt-1">{String(service.status).replaceAll('_',' ')}</p><p className="text-[11px] opacity-90 mt-1">Toca una ventana para abrirla.</p></div>
        {error&&<div className="m-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-2.5">{error}</div>}
        {success&&<div className="m-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5">{success}</div>}
        <div className="p-3 space-y-2">
          {launcher('Estado y seguimiento','Avance, estado e historial del trabajo.',()=>open('status'))}
          {selected&&showNegotiation&&launcher('Contratación y Custodia','Negociación, precio y proceso de pago.',()=>open('contract'),'border-blue-200 bg-blue-50',<ShieldCheck className="w-5 h-5 text-blue-600"/>)}
          {selected&&isWorker&&!finalizing&&!showNegotiation&&<button onClick={executeWork} disabled={busy} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-sm disabled:opacity-50"><Play className="inline w-4 h-4 mr-2"/>{busy?'Iniciando…':'Iniciar trabajo oficialmente'}</button>}
          {workerRoleCanFinish&&launcher('Finalizar trabajo','Subir evidencia y enviar el trabajo a revisión.',()=>open('finish'),'border-emerald-200 bg-emerald-50',<Camera className="w-5 h-5 text-emerald-600"/>)}
          {clientCanApprove&&launcher('Trabajo terminado • Revisar evidencia','Fotos, resumen y confirmación del cliente.',()=>open('review'),'border-amber-300 bg-amber-50',<CheckCircle className="w-5 h-5 text-amber-600"/>)}
          {isClient&&completion?.completion_submitted&&completion?.status==='PENDIENTE_APROBACION'&&<div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900"><b>Conformidad registrada.</b> La solicitud está en Administración y los fondos siguen protegidos.</div>}
          {completion?.completion_submitted&&<div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-700"><b>Seguimiento:</b> {isClient?(completion?.status==='PENDIENTE_APROBACION'?'Solicitud enviada a Administración.':'Revisa las fotos y confirma cuando estés conforme.'):'Esperando conformidad del cliente y liberación administrativa.'}</div>}
          <button onClick={()=>onOpenChat(service.id,isWorker?service.client_id:service.worker_id!)} className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-3 rounded-xl"><MessageSquare className="w-4 h-4"/>Mensajes</button>
        </div>
      </div>
      {completed&&<div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 space-y-3 mt-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center"><CircleCheckBig className="w-6 h-6"/></div><div><p className="text-[10px] uppercase tracking-widest font-black text-emerald-700">SERVIYA • ESTADO FINAL</p><h3 className="text-lg sm:text-xl font-black text-emerald-950">PROCESO FINALIZADO</h3></div></div><p className="text-sm text-emerald-900">Cliente: Conformidad registrada</p><p className="text-sm text-emerald-900">Trabajador: Pago liberado a su billetera</p><p className="text-sm text-emerald-900">Custodia: Fondos liberados</p><div className="rounded-xl bg-white border border-emerald-200 p-3 text-xs text-emerald-900"><LockKeyhole className="w-4 h-4 inline mr-1"/>Proceso cerrado. Garantía de 60 días.</div>{warranty&&<button onClick={()=>setShowWarranty(true)} className="w-full inline-flex items-center justify-center gap-2 bg-white border border-emerald-300 text-emerald-800 font-bold text-xs px-3 py-3 rounded-xl"><ShieldCheck className="w-4 h-4"/>Ver garantía</button>}</div>}
    </div>

    {openWindow==='status'&&<Window title="Estado y seguimiento" subtitle="Consulta el avance sin abrir las demás etapas." onClose={()=>setOpenWindow(null)}><WorkStatusPanel service={service}/></Window>}
    {openWindow==='contract'&&selected&&<Window title="Contratación y Custodia" subtitle="Negociación y condiciones antes de ejecutar el trabajo." onClose={()=>setOpenWindow(null)}><div className="space-y-3"><NegotiationPanel serviceId={service.id} clientId={service.client_id} workerId={service.worker_id} budget={service.price_rd} title={service.title} onRefresh={onRefresh} onOpenChat={onOpenChat}/>{isWorker&&!finalizing&&<button onClick={executeWork} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-black text-sm px-4 py-3 rounded-xl disabled:opacity-50"><Play className="w-4 h-4"/>{busy?'Iniciando…':'Iniciar trabajo oficialmente'}</button>}</div></Window>}
    {openWindow==='finish'&&workerRoleCanFinish&&<Window title="Finalizar trabajo" subtitle="Evidencia y envío a revisión." onClose={()=>setOpenWindow(null)}><div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 mb-3"><b>Custodia retenida.</b> El pago permanece protegido durante la revisión.</div><button onClick={()=>setShowPhotos(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-black text-sm px-4 py-3 rounded-xl disabled:opacity-50"><Camera className="w-5 h-5"/>{busy?'Procesando…':'Subir evidencia y enviar trabajo terminado'}</button></Window>}
    {openWindow==='review'&&clientCanApprove&&<Window title="Trabajo terminado • Revisar evidencia" subtitle="Revisa el resumen y las fotos antes de confirmar." onClose={()=>setOpenWindow(null)}><div className="space-y-3"><div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900">Al confirmar, la solicitud pasa a Administración. Los fondos siguen protegidos hasta la liberación administrativa.</div>{completion?.summary&&<div className="rounded-xl bg-white border p-3"><p className="text-[10px] uppercase font-black text-slate-500">Resumen del trabajador</p><p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">{completion.summary}</p></div>}{evidenceReady&&<div><p className="text-[10px] uppercase font-black text-slate-500 mb-2">Fotos de evidencia ({completionPhotos.length})</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{completionPhotos.map((photo:string,index:number)=><a key={index} href={photo} target="_blank" rel="noreferrer" className="rounded-xl overflow-hidden border bg-white"><img src={photo} alt={`Evidencia ${index+1}`} className="w-full h-28 object-cover"/></a>)}</div></div>}<button onClick={approveCompletion} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-black text-sm px-3 py-3 rounded-xl disabled:opacity-50"><CheckCircle className="w-5 h-5"/>{busy?'Registrando…':'Aceptar trabajo finalizado y enviar a Administración'}</button></div></Window>}

    {showPhotos&&<WorkPhotosModal service={service} onClose={()=>setShowPhotos(false)} onRefresh={async()=>{await load();onRefresh();}}/>}
    {showWarranty&&warranty&&<WarrantyModal warranty={warranty} onClose={()=>setShowWarranty(false)}/>}
  </>;
};
