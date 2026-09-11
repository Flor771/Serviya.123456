import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, CalendarDays, Camera, Send, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  serviceId: string;
  coverageDays: number;
  certificateRef?: string;
  expiresAt?: string;
  onClose: () => void;
}

const statusLabel: Record<string, string> = {
  SOLICITADA: 'Revisita solicitada',
  PROGRAMADA: 'Revisita programada',
  CORRECCION_EN_PROCESO: 'Corrección en proceso',
  CORRECCION_REALIZADA: 'Problema corregido — pendiente de confirmación',
  CERRADA: 'Garantía cerrada',
  ESCALADA_ADMIN: 'Escalada a Administración',
};

export const WarrantyModal: React.FC<Props> = ({ serviceId, coverageDays, certificateRef, expiresAt, onClose }) => {
  const { user } = useAuth();
  const isClient = user?.id != null;
  const [tab, setTab] = useState<'info' | 'revisita' | 'historial'>('info');
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [revisits, setRevisits] = useState<any[]>([]);

  const load = async () => {
    try {
      const data = await api.get<{ revisits: any[] }>(`/completion/${serviceId}/warranty/revisits`);
      setRevisits(data.revisits || []);
    } catch { setRevisits([]); }
  };
  useEffect(() => { void load(); }, [serviceId]);

  const requestVisit = async () => {
    if (!issue.trim() || description.trim().length < 10) {
      setFeedback('Indica el problema y explica con detalle qué ocurrió.');
      return;
    }
    setBusy(true); setFeedback('');
    try {
      await api.post(`/completion/${serviceId}/warranty/revisit`, { issue: issue.trim(), description: description.trim() });
      setIssue(''); setDescription('');
      setFeedback('Solicitud de revisita enviada. El trabajador recibirá una notificación.');
      await load(); setTab('historial');
    } catch (e: any) { setFeedback(e?.message || 'No se pudo solicitar la revisita.'); }
    finally { setBusy(false); }
  };

  const confirmResolved = async (id: string) => {
    setBusy(true); setFeedback('');
    try { await api.post(`/completion/${serviceId}/warranty/revisits/${id}/confirm`, {}); setFeedback('Corrección confirmada. La revisita quedó cerrada.'); await load(); }
    catch (e: any) { setFeedback(e?.message || 'No se pudo cerrar la revisita.'); }
    finally { setBusy(false); }
  };

  const escalate = async (id: string) => {
    if (!window.confirm('¿Quieres escalar esta revisita a Administración SERVIYA?')) return;
    setBusy(true); setFeedback('');
    try { await api.post(`/completion/${serviceId}/warranty/revisits/${id}/escalate`, {}); setFeedback('La revisita fue enviada a Administración.'); await load(); }
    catch (e: any) { setFeedback(e?.message || 'No se pudo escalar la revisita.'); }
    finally { setBusy(false); }
  };

  const fmtDate = (value?: string) => value ? new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Pendiente';

  return <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
    <div className="bg-white w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl shadow-2xl">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
        <div className="flex-1"><p className="text-[10px] uppercase tracking-widest font-black text-emerald-700">SERVIYA • PROTECCIÓN</p><h2 className="text-lg font-black text-slate-900">Garantía SERVIYA</h2></div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-100"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <div><p className="font-black text-emerald-950">Garantía activa por {coverageDays} días</p><p className="text-xs text-emerald-800 mt-1">Certificado: {certificateRef || 'SERVIYA'} • Vence: {fmtDate(expiresAt)}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([['info','Qué cubre'],['revisita','Solicitar revisita'],['historial','Historial']] as const).map(([key,label]) => <button key={key} onClick={()=>setTab(key)} className={`rounded-xl px-3 py-2.5 text-xs font-black border ${tab===key?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200'}`}>{label}</button>)}
        </div>
        {feedback && <div className="rounded-xl bg-blue-50 border border-blue-200 text-blue-800 p-3 text-xs font-semibold">{feedback}</div>}

        {tab==='info' && <div className="space-y-4 text-xs text-slate-700">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"><h3 className="font-black text-sm text-emerald-950">¿Qué cubre?</h3><ul className="mt-2 space-y-2 list-disc list-inside"><li>Defectos o problemas directamente relacionados con el trabajo realizado.</li><li>Correcciones cuando el resultado no corresponde con lo acordado en el servicio.</li><li>Una revisita del trabajador para evaluar y corregir el problema cubierto.</li><li>Seguimiento del caso y registro de la solución dentro de SERVIYA.</li></ul></section>
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4"><h3 className="font-black text-sm text-red-950">¿Qué no cubre?</h3><ul className="mt-2 space-y-2 list-disc list-inside"><li>Daños posteriores causados por el cliente, terceros, accidentes, mal uso o modificaciones.</li><li>Trabajos adicionales o cambios solicitados después de finalizar el servicio.</li><li>Desgaste normal de materiales o situaciones que no estén relacionadas con el trabajo.</li><li>Problemas de un servicio distinto al certificado.</li></ul></section>
          <section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-sm text-slate-950">¿Cómo funciona una revisita?</h3><ol className="mt-2 space-y-2 list-decimal list-inside"><li>El cliente describe el problema y, si puede, agrega evidencia.</li><li>SERVIYA registra la solicitud y notifica al trabajador.</li><li>El trabajador acepta y acuerda la fecha de revisita.</li><li>Se realiza la revisión y la corrección que corresponda.</li><li>El trabajador marca la corrección realizada.</li><li>El cliente confirma si quedó solucionado. Si no, puede escalar a Administración.</li></ol></section>
          <div className="rounded-xl bg-slate-900 text-white p-3 flex gap-2"><CalendarDays className="w-4 h-4 text-emerald-400 shrink-0"/><p>La garantía tiene fecha de inicio, vencimiento y certificado. La fecha se calcula automáticamente desde la activación; no se escribe manualmente.</p></div>
        </div>}

        {tab==='revisita' && <div className="space-y-3">
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900"><b>Solicitar revisita por garantía</b><p className="mt-1">Úsala cuando aparezca un problema directamente relacionado con el trabajo terminado.</p></div>
          <label className="block text-xs font-black text-slate-700">¿Cuál es el problema?</label><input value={issue} onChange={e=>setIssue(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Ej.: volvió a presentar una falla" />
          <label className="block text-xs font-black text-slate-700">Explicación</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full min-h-32 rounded-xl border border-slate-200 p-3 text-sm" placeholder="Explica cuándo apareció, qué ocurrió y qué esperas que se revise..." />
          <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 flex items-center gap-2"><Camera className="w-4 h-4"/>Puedes indicar el problema ahora. La evidencia fotográfica puede añadirse al seguimiento de la revisita.</div>
          <button disabled={busy || !isClient} onClick={requestVisit} className="w-full rounded-xl bg-emerald-600 text-white py-3 font-black text-xs disabled:opacity-50"><Send className="inline w-4 h-4 mr-1"/>{busy?'Enviando...':'Solicitar revisita'}</button>
        </div>}

        {tab==='historial' && <div className="space-y-3">{revisits.length===0 ? <div className="rounded-2xl border border-slate-200 p-5 text-center text-xs text-slate-500">No hay revisitas registradas para esta garantía.</div> : revisits.map(r=><div key={r.id} className="rounded-2xl border border-slate-200 p-4 space-y-2"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-sm text-slate-900">{r.issue}</p><p className="text-[11px] text-slate-500">Solicitada {fmtDate(r.created_at)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black">{statusLabel[r.status] || r.status}</span></div><p className="text-xs text-slate-700">{r.description}</p>{r.scheduled_at&&<p className="text-xs text-blue-700 font-bold"><Clock3 className="inline w-3.5 h-3.5 mr-1"/>Revisita: {fmtDate(r.scheduled_at)}</p>}{r.resolution_notes&&<p className="text-xs bg-slate-50 rounded-xl p-3">{r.resolution_notes}</p>}<div className="flex flex-wrap gap-2">{isClient && r.status==='CORRECCION_REALIZADA' && <button disabled={busy} onClick={()=>confirmResolved(r.id)} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-black"><CheckCircle2 className="inline w-4 h-4 mr-1"/>Confirmar solución</button>}{['SOLICITADA','PROGRAMADA','CORRECCION_EN_PROCESO','CORRECCION_REALIZADA'].includes(r.status) && <button disabled={busy} onClick={()=>escalate(r.id)} className="rounded-xl bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-xs font-black"><AlertTriangle className="inline w-4 h-4 mr-1"/>Escalar a Administración</button>}</div></div>)}</div>}
      </div>
    </div>
  </div>;
};