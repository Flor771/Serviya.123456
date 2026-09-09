import React, { useEffect, useState } from 'react';
import { Play, Camera, CheckCircle, MessageSquare, Lock, ShieldCheck, FileCheck2 } from 'lucide-react';
import { api } from '../services/api';
import { Service } from '../types';
import { WorkPhotosModal } from './WorkPhotosModal';
import { NegotiationPanel } from './NegotiationPanel';

interface Props { service: Service; onRefresh: () => void; onOpenChat: (serviceId: string, receiverId: string) => void; }

export const WorkFlowActions: React.FC<Props> = ({ service, onRefresh, onOpenChat }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPhotos, setShowPhotos] = useState(false);
  const [completion, setCompletion] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [warranty, setWarranty] = useState<any>(null);

  const load = async () => {
    try { setCompletion(await api.get(`/completion/${service.id}`)); } catch { setCompletion(null); }
    try { const w:any = await api.get(`/completion/${service.id}/warranty`); setWarranty(w?.warranty || null); } catch { setWarranty(null); }
  };
  useEffect(() => { load(); }, [service.id, service.status]);

  const start = async () => {
    setBusy(true); setError(''); setSuccess('');
    try { await api.post(`/applications/service/${service.id}/start`, { note: 'Inicio del trabajo desde SERVIYA' }); setSuccess('Trabajo iniciado. Ahora puedes coordinar, subir evidencia y completar el servicio.'); onRefresh(); }
    catch (e:any) { setError(e.message || 'No se pudo iniciar el trabajo.'); }
    finally { setBusy(false); }
  };
  const submitCompletion = async () => {
    if (!summary.trim()) { setError('Escribe un resumen de lo realizado antes de enviarlo a revisión.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try { await api.post(`/completion/${service.id}/submit`, { summary: summary.trim() }); setSuccess('Trabajo enviado a revisión. El cliente debe comprobar la evidencia y aprobar la liberación.'); await load(); onRefresh(); }
    catch (e:any) { setError(e.message || 'No se pudo enviar el trabajo a revisión.'); }
    finally { setBusy(false); }
  };

  if (!service.worker_id) return null;
  const selected = service.status === 'TRABAJADOR_SELECCIONADO';
  const inProgress = service.status === 'EN_PROGRESO';
  const completed = service.status === 'COMPLETADA';
  const isClient = true; // visibility is enforced by backend; role-specific actions are gated by service ownership in the child components

  if (selected && !completion?.completion_submitted) {
    return <NegotiationPanel serviceId={service.id} clientId={service.client_id} workerId={service.worker_id} budget={service.price_rd} title={service.title} onRefresh={onRefresh} onOpenChat={onOpenChat} />;
  }

  return <>
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[45] w-[calc(100%-1.5rem)] max-w-2xl">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-3">
        {error && <div className="mb-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-2.5">{error}</div>}
        {success && <div className="mb-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5">{success}</div>}
        <div className="flex items-center justify-between gap-3 mb-2"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Flujo SERVIYA</p><p className="text-sm font-black text-slate-900">{service.status.replaceAll('_',' ')}</p></div><div className="text-[10px] text-slate-500 text-right">Publicación → selección → negociación → custodia → progreso → evidencia → conformidad → garantía</div></div>
        {selected && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2"><Lock className="w-4 h-4 shrink-0 mt-0.5"/><div><b>Esperando precio final y Custodia.</b><br/>La publicación solo mostró un presupuesto orientativo. El trabajo no puede comenzar hasta que ambas partes acuerden el precio y el cliente deposite ese monto en Custodia SERVIYA.</div></div>}
        {inProgress && <div className="space-y-2"><div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900"><b>Custodia retenida.</b> El trabajo puede ejecutarse. Comparte evidencia mediante fotos y chat.</div><div className="flex flex-wrap gap-2"><button onClick={()=>setShowPhotos(true)} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2.5 rounded-xl"><Camera className="w-4 h-4"/>Subir fotos del trabajo</button><button onClick={()=>onOpenChat(service.id,service.client_id)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2.5 rounded-xl"><MessageSquare className="w-4 h-4"/>Mensajes</button><button onClick={submitCompletion} disabled={busy} className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2.5 rounded-xl disabled:opacity-50"><FileCheck2 className="w-4 h-4"/>Enviar trabajo a revisión</button></div>{!completion?.completion_submitted&&<textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Resumen del trabajo realizado para el acta de conformidad..." className="w-full border border-slate-300 rounded-xl p-2.5 text-xs min-h-16"/>}{completion?.completion_submitted&&<div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900"><b>Trabajo enviado a revisión.</b> Esperando la conformidad del cliente y la liberación de fondos.</div>}</div>}
        {completed && <div className="rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 p-3 text-xs font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4"/>Servicio completado y fondos liberados.</div>}
        {warranty && <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0"/><div><b>Garantía SERVIYA activa por {warranty.coverage_days} días.</b><br/>Certificado: {warranty.certificate_ref} • Vence: {new Date(warranty.expires_at).toLocaleDateString()}</div></div>}
        {service.status === 'EN_PROGRESO' && !completion?.completion_submitted && <div className="mt-2 text-[10px] text-slate-500">La liberación de fondos está bloqueada hasta que el técnico envíe la evidencia y el trabajo a revisión.</div>}
      </div>
    </div>
    {showPhotos && <WorkPhotosModal service={service} onClose={() => setShowPhotos(false)} onRefresh={onRefresh} />}
  </>;
};
