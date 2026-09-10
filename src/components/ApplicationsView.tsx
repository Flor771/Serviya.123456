import React, { useEffect, useState } from 'react';
import { ClipboardList, Clock3, CheckCircle2, XCircle, MessageSquare, RefreshCw, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { Application, Service } from '../types';

interface MyApplication extends Application {
  service: Service;
}

interface Props {
  onOpenService: (service: Service) => void;
}

const statusLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente de respuesta',
  SELECCIONADO: 'Postulación aceptada',
  RECHAZADO: 'No seleccionada',
};

export const ApplicationsView: React.FC<Props> = ({ onOpenService }) => {
  const [items, setItems] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ applications: MyApplication[] }>('/applications/mine');
      setItems(data.applications || []);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar tus postulaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pending = items.filter(a => a.status === 'PENDIENTE');
  const accepted = items.filter(a => a.status === 'SELECCIONADO');
  const rejected = items.filter(a => a.status === 'RECHAZADO');

  const group = (title: string, list: MyApplication[], tone: string) => list.length ? (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-black text-base text-slate-900">{title}</h2>
        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${tone}`}>{list.length}</span>
      </div>
      <div className="space-y-3">
        {list.map(a => {
          const s = a.service;
          const acceptedNow = a.status === 'SELECCIONADO' && s.worker_id;
          return (
            <article key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => onOpenService(s)} className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${acceptedNow ? 'bg-emerald-50 text-emerald-600' : a.status === 'RECHAZADO' ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                    {acceptedNow ? <CheckCircle2 className="w-5 h-5" /> : a.status === 'RECHAZADO' ? <XCircle className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">{s.category_name}</p>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 break-words mt-0.5">{s.title}</h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 break-words">Cliente: {s.client_name}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold">
                      <span className={`px-2 py-1 rounded-lg ${acceptedNow ? 'bg-emerald-50 text-emerald-700' : a.status === 'RECHAZADO' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{statusLabel[a.status] || a.status}</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600">Tu propuesta: RD$ {Number(a.offered_price_rd || 0).toLocaleString()}</span>
                      {s.negotiated_price_rd ? <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700">Acordado: RD$ {Number(s.negotiated_price_rd).toLocaleString()}</span> : null}
                    </div>
                  </div>
                </div>
              </button>

              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                {acceptedNow ? (
                  <button onClick={() => onOpenService(s)} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700">
                    <MessageSquare className="w-4 h-4" /> Abrir sesión y negociar
                  </button>
                ) : a.status === 'PENDIENTE' ? (
                  <button onClick={() => onOpenService(s)} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-black">
                    <MessageSquare className="w-4 h-4" /> Abrir sesión / ver postulación
                  </button>
                ) : (
                  <button onClick={() => onOpenService(s)} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">Ver servicio</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  ) : null;

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-emerald-700 text-xs font-black uppercase tracking-wide">TRABAJADOR / TÉCNICO</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Mis postulaciones</h1>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Aquí se agrupan todas las postulaciones que has enviado. Cuando una sea aceptada, puedes entrar a la misma sesión para negociar y continuar el trabajo.</p>
          </div>
          <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 shrink-0" title="Actualizar"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-amber-50 p-3 text-center"><p className="text-lg font-black text-amber-700">{pending.length}</p><p className="text-[10px] font-bold text-amber-700">Pendientes</p></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-lg font-black text-emerald-700">{accepted.length}</p><p className="text-[10px] font-bold text-emerald-700">Aceptadas</p></div>
          <div className="rounded-xl bg-slate-100 p-3 text-center"><p className="text-lg font-black text-slate-600">{rejected.length}</p><p className="text-[10px] font-bold text-slate-600">No seleccionadas</p></div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-xs font-semibold">{error}<button onClick={load} className="block mt-2 underline font-black">Intentar de nuevo</button></div>}
      {loading && !items.length ? <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">Cargando tus postulaciones…</div> : null}
      {!loading && !items.length && !error ? <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center"><ClipboardList className="w-9 h-9 mx-auto text-slate-300"/><p className="font-black text-slate-700 mt-3">Todavía no has enviado postulaciones</p><p className="text-xs text-slate-500 mt-1">Busca trabajos disponibles y envía tu primera postulación.</p></div> : null}

      {group('Postulaciones aceptadas', accepted, 'bg-emerald-100 text-emerald-700')}
      {group('Postulaciones pendientes', pending, 'bg-amber-100 text-amber-700')}
      {group('No seleccionadas', rejected, 'bg-slate-200 text-slate-600')}
    </section>
  );
};
