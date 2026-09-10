import React, { useEffect, useState } from 'react';
import { Clock3, MapPin, PauseCircle, PlayCircle, Wrench, Flag, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Service } from '../types';

const STATUSES = [
  { key: 'EN_CAMINO', label: 'En camino', icon: MapPin },
  { key: 'TRABAJANDO', label: 'Trabajando', icon: Wrench },
  { key: 'PAUSADO', label: 'Trabajo pausado', icon: PauseCircle },
  { key: 'FINALIZANDO', label: 'Finalizando trabajo', icon: Flag },
];

export const WorkStatusPanel: React.FC<{ service: Service }> = ({ service }) => {
  const { user } = useAuth();
  const isWorker = String(user?.id) === String(service.worker_id);
  const isClient = String(user?.id) === String(service.client_id);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try { setData(await api.get(`/work-status/${service.id}`)); } catch { setData(null); }
  };
  useEffect(() => { if (user && (isWorker || isClient)) load(); }, [service.id, user?.id, service.status]);

  if (!user || (!isWorker && !isClient) || !service.worker_id || service.status === 'COMPLETADA') return null;
  const current = data?.current_status || (service.status === 'EN_PROGRESO' ? 'TRABAJANDO' : 'EN_CAMINO');
  const canUpdate = isWorker && ['TRABAJADOR_SELECCIONADO', 'EN_PROGRESO'].includes(String(service.status));
  const update = async (status: string) => {
    setBusy(true); setError(''); setMessage('');
    try { const result = await api.post(`/work-status/${service.id}`, { status, note: note.trim() || null }); setMessage(`Estado actualizado: ${result.label}.`); setNote(''); await load(); }
    catch (e: any) { setError(e?.message || 'No se pudo actualizar el estado.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Seguimiento del trabajo</p><h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">Estado actual: {data?.label || (current === 'TRABAJANDO' ? 'Trabajando' : 'En camino')}</h3><p className="text-xs text-slate-500 mt-1">{isWorker ? 'Actualiza el progreso para que el cliente pueda seguir el trabajo.' : 'El trabajador actualiza este estado y tú puedes ver el progreso.'}</p></div>
      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Clock3 className="w-5 h-5"/></div>
    </div>
    {(message || error) && <div className={`mt-2 rounded-xl p-2.5 text-xs font-semibold ${error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>{error || message}</div>}
    {canUpdate && <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">{STATUSES.map(({key,label,icon:Icon}) => <button key={key} type="button" disabled={busy || current === key} onClick={() => update(key)} className={`min-h-16 rounded-xl border px-2 py-2 text-xs font-black flex flex-col items-center justify-center gap-1 transition ${current === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}><Icon className="w-4 h-4"/>{label}</button>)}</div>
      <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Nota opcional para el cliente (ej.: llegué al lugar, falta material, retomando el trabajo...)" className="w-full mt-2 border border-slate-200 rounded-xl p-2.5 text-xs min-h-16 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
    </>}
    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Historial reciente</p>{data?.history?.length ? <div className="space-y-2">{data.history.slice(0,5).map((item:any, index:number) => <div key={`${item.created_at}-${index}`} className="flex gap-2 items-start"><div className="mt-0.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5"/></div><div className="min-w-0"><p className="text-xs font-bold text-slate-700">{STATUSES.find(s=>s.key===item.status)?.label || item.status.replaceAll('_',' ')}</p><p className="text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString()} {item.note ? `• ${item.note}` : ''}</p></div></div>)}</div> : <p className="text-xs text-slate-500">Aún no hay actualizaciones manuales. El estado inicial se toma del flujo del servicio.</p>}</div>
  </section>;
};
