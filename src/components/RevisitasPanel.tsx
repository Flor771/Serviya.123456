import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, CalendarDays, CheckCircle2, PlayCircle, Send } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type C = { service_id: string; title?: string; contract_number?: string | null };

export const RevisitasPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const isWorker = user?.activeRole === 'TRABAJADOR' || user?.role === 'TRABAJADOR';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [schedule, setSchedule] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const cs = await api.get<{ contracts: C[] }>('/contracts');
      const out: any[] = [];
      for (const c of cs?.contracts || []) {
        try {
          const completion = await api.get<any>(`/completion/${c.service_id}`);
          const w = await api.get<any>(`/completion/${c.service_id}/warranty`);
          const proof = Array.isArray(completion?.photos) ? completion.photos.length > 0 : Boolean(completion?.photos);
          if (String(completion?.status || '').toUpperCase() !== 'COMPLETADA' || !completion?.completion_submitted || !proof || w?.warranty?.expired) continue;
          const revisits = (w?.revisits || []).filter((r: any) => String(r.status || '').toUpperCase() !== 'CERRADA');
          if (isWorker) {
            if (revisits.length) out.push({ ...c, warranty: w.warranty, revisits });
          } else {
            out.push({ ...c, warranty: w.warranty, revisits });
          }
        } catch { /* one contract failing must not break the panel */ }
      }
      setItems(out);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar las revisitas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [isWorker]);

  const request = async () => {
    if (!selected) return;
    const serviceId = String(selected?.service_id || selected?.warranty?.service_id || '').trim();
    if (!serviceId) {
      setError('No se pudo identificar el servicio seleccionado. Cierra esta ventana y vuelve a abrir la revisita.');
      return;
    }
    if (issue.trim().length < 3 || description.trim().length < 3) {
      setError('Indica el problema y una explicación breve de al menos 3 caracteres.');
      return;
    }
    setBusy(true); setError('');
    try {
      const r = await api.post<any>(`/completion/${encodeURIComponent(serviceId)}/warranty/revisit`, { issue: issue.trim(), description: description.trim() });
      setIssue(''); setDescription(''); setSelected(null);
      await load();
      window.alert(`Solicitud de revisita enviada. Estado guardado: ${r?.status || 'SOLICITADA'}.`);
    } catch (e: any) {
      setError(e?.message || 'La solicitud fue rechazada.');
    } finally { setBusy(false); }
  };

  const workerAction = async (serviceId: string, revisitId: string, action: 'schedule' | 'start' | 'complete') => {
    setBusy(true); setError('');
    try {
      if (action === 'schedule') {
        if (!schedule) { setError('Selecciona una fecha y hora para programar la revisita.'); return; }
        await api.post(`/completion/${serviceId}/warranty/revisits/${revisitId}/schedule`, { scheduled_at: new Date(schedule).toISOString() });
      } else if (action === 'start') {
        await api.post(`/completion/${serviceId}/warranty/revisits/${revisitId}/start`, {});
      } else {
        if (notes.trim().length < 3) { setError('Explica brevemente la corrección realizada (mínimo 3 caracteres).'); return; }
        await api.post(`/completion/${serviceId}/warranty/revisits/${revisitId}/complete`, { notes: notes.trim() });
        setNotes('');
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'La acción no pudo completarse.');
    } finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[96] bg-slate-950/70 flex items-center justify-center p-3" onClick={onClose}>
    <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-100 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="sticky top-0 z-10 bg-white border-b p-5 flex justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">SERVIYA • GARANTÍA</p>
          <h2 className="text-2xl font-black text-slate-900">{isWorker ? 'Solicitudes de revisita' : 'Revisitas'}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {isWorker ? 'Aquí aparecen las solicitudes de clientes. Programa, inicia y registra la corrección.' : 'Solicita una revisita únicamente para un trabajo finalizado con evidencia y garantía vigente.'}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-100"><X /></button>
      </div>

      <div className="p-4 space-y-3">
        {error && <div className="rounded-2xl bg-red-50 border border-red-200 text-red-800 p-3 text-xs font-semibold">{error}</div>}
        {loading ? <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-500">Cargando revisitas…</div> : !items.length ?
          <div className="bg-white rounded-2xl p-8 text-center"><ShieldCheck className="w-10 h-10 mx-auto text-slate-300"/><p className="font-black text-slate-700 mt-3">{isWorker ? 'No tienes solicitudes de revisita pendientes' : 'No hay trabajos elegibles para una revisita'}</p><p className="text-xs text-slate-500 mt-1">{isWorker ? 'Las solicitudes de los clientes aparecerán aquí cuando existan.' : 'Debe ser un trabajo ya finalizado, con evidencia registrada y garantía vigente.'}</p></div>
          : items.map(x => <article key={x.service_id} className="bg-white rounded-2xl border p-4">
            <div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase font-black text-indigo-600">{x.contract_number || 'Contrato SERVIYA'}</p><h3 className="font-black text-slate-900">{x.title || x.warranty?.service_title}</h3><p className="text-xs text-slate-500 mt-1">Garantía: {x.warranty?.coverage_days || 15} días · vence {x.warranty?.expires_at ? new Date(x.warranty.expires_at).toLocaleDateString('es-DO') : '—'}</p></div><span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black"><CheckCircle2 className="inline w-3 h-3"/> Finalizado</span></div>
            {!isWorker && <div className="mt-3 space-y-3">
              <p className="text-xs text-emerald-700 font-bold">✓ Evidencia registrada</p>
              {x.revisits?.length > 0 && x.revisits.map((r: any) => {
                const status = String(r.status || '').toUpperCase();
                const labels: Record<string,string> = {
                  SOLICITADA: 'Solicitud enviada • Esperando programación',
                  PROGRAMADA: 'Revisita programada • Esperando visita',
                  CORRECCION_EN_PROCESO: 'Revisita en proceso',
                  EN_PROCESO: 'Revisita en proceso',
                  CORRECCION_REALIZADA: 'Corrección realizada • Esperando tu confirmación',
                  ESCALADA_ADMIN: 'En revisión por Administración'
                };
                return <div key={r.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-wide text-indigo-700">Revisita</p>
                      <p className="font-black text-slate-900">{r.issue}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-indigo-700">{labels[status] || r.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{r.description}</p>
                  {r.scheduled_at && <p className="mt-2 text-xs font-bold text-blue-700"><CalendarDays className="inline w-3 h-3 mr-1"/>Programada: {new Date(r.scheduled_at).toLocaleString('es-DO')}</p>}
                  {status === 'CORRECCION_REALIZADA' && <p className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">El trabajador registró la corrección. Revisa el trabajo y confirma si quedó solucionado.</p>}
                </div>;
              })}
              <button type="button" onClick={() => { setSelected({ ...x, service_id: x.service_id || x.warranty?.service_id }); setError(''); setIssue(''); setDescription(''); }} className="w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-black">{x.revisits?.length ? 'Solicitar otra revisita' : 'Solicitar revisita de este trabajo'}</button>
            </div>}
            {isWorker && <div className="mt-3 space-y-3">{x.revisits.map((r: any) => <div key={r.id} className="rounded-2xl border bg-slate-50 p-4"><div className="flex justify-between gap-2"><div><p className="font-black text-slate-900">{r.issue}</p><p className="text-xs text-slate-600 mt-1">{r.description || 'Sin descripción adicional.'}</p></div><span className="text-[10px] font-black text-indigo-700">{r.status}</span></div>{r.scheduled_at && <p className="mt-2 text-xs text-blue-700"><CalendarDays className="inline w-3 h-3"/> {new Date(r.scheduled_at).toLocaleString('es-DO')}</p>}<div className="mt-3 grid gap-2">{r.status === 'SOLICITADA' && <><input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full rounded-xl border p-3 text-sm"/><button disabled={busy} onClick={() => workerAction(x.service_id, r.id, 'schedule')} className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-black"><CalendarDays className="inline w-4 h-4 mr-1"/> Programar revisita</button></>}{r.status === 'PROGRAMADA' && <button disabled={busy} onClick={() => workerAction(x.service_id, r.id, 'start')} className="w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-black"><PlayCircle className="inline w-4 h-4 mr-1"/> Iniciar revisita</button>}{['EN_PROCESO','CORRECCION_EN_PROCESO'].includes(String(r.status || '').toUpperCase()) && <><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Describe la corrección realizada" className="w-full rounded-xl border p-3 text-sm"/><button disabled={busy} onClick={() => workerAction(x.service_id, r.id, 'complete')} className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-black"><Send className="inline w-4 h-4 mr-1"/> Registrar corrección</button></>}</div></div>)}</div>}
          </article>)}
      </div>

      {selected && !isWorker && <div className="fixed inset-0 z-[110] bg-slate-950/60 flex items-center justify-center p-3" onClick={() => setSelected(null)}><div className="w-full max-w-lg bg-white rounded-3xl p-5" onClick={e => e.stopPropagation()}><h3 className="text-xl font-black">Solicitar revisita</h3><p className="text-xs text-slate-500 mt-1">{selected.title || selected.warranty?.service_title}</p><input value={issue} onChange={e => setIssue(e.target.value)} placeholder="Qué debe revisarse" className="mt-4 w-full rounded-xl border p-3 text-sm"/><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el problema" rows={4} className="mt-2 w-full rounded-xl border p-3 text-sm"/><button type="button" disabled={busy} onClick={request} className="mt-3 w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-black">{busy ? 'Registrando…' : 'Enviar solicitud de revisita'}</button><button type="button" onClick={() => setSelected(null)} className="mt-2 w-full py-2 text-xs font-bold text-slate-500">Cancelar</button></div></div>}
    </div>
  </div>;
};
