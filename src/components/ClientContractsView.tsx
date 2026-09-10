import React, { useMemo } from 'react';
import { MessageSquare, ShieldCheck, Clock3, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { Service } from '../types';

interface Props {
  services: Service[];
  onOpenService: (service: Service) => void;
  onOpenChat: (serviceId: string, workerId: string) => void;
}

const labels: Record<string, string> = {
  TRABAJADOR_SELECCIONADO: 'Técnico seleccionado',
  EN_PROGRESO: 'Trabajo en progreso',
  COMPLETADA: 'Trabajo terminado',
  EN_DISPUTA: 'En disputa',
  RECIBIENDO_POSTULACIONES: 'Recibiendo propuestas',
  PUBLICADA: 'Publicada',
};

const tone: Record<string, string> = {
  TRABAJADOR_SELECCIONADO: 'bg-blue-50 text-blue-700',
  EN_PROGRESO: 'bg-amber-50 text-amber-700',
  COMPLETADA: 'bg-emerald-50 text-emerald-700',
  EN_DISPUTA: 'bg-red-50 text-red-700',
};

export const ClientContractsView: React.FC<Props> = ({ services, onOpenService, onOpenChat }) => {
  const contracts = useMemo(() => services.filter(s => Boolean(s.worker_id)), [services]);
  const active = contracts.filter(s => ['TRABAJADOR_SELECCIONADO', 'EN_PROGRESO', 'EN_DISPUTA'].includes(String(s.status)));
  const finished = contracts.filter(s => String(s.status) === 'COMPLETADA');

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <p className="text-blue-700 text-xs font-black uppercase tracking-wide">CLIENTE</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Mis contrataciones</h1>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Aquí aparecen los servicios en los que ya seleccionaste un trabajador, desde la contratación hasta la finalización.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-xl bg-blue-50 p-3 text-center"><p className="text-lg font-black text-blue-700">{active.length}</p><p className="text-[10px] font-bold text-blue-700">Activas</p></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-lg font-black text-emerald-700">{finished.length}</p><p className="text-[10px] font-bold text-emerald-700">Terminadas</p></div>
        </div>
      </div>

      {!contracts.length && <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center"><Clock3 className="w-9 h-9 mx-auto text-slate-300"/><p className="font-black text-slate-700 mt-3">Todavía no tienes contrataciones</p><p className="text-xs text-slate-500 mt-1">Cuando selecciones un trabajador, la contratación aparecerá aquí.</p></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.map(s => {
          const status = String(s.status);
          const price = Number(s.negotiated_price_rd || s.price_rd || 0);
          return (
            <article key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => onOpenService(s)} className="w-full text-left p-5 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${status === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-600' : status === 'EN_DISPUTA' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {status === 'COMPLETADA' ? <CheckCircle2 className="w-5 h-5"/> : status === 'EN_DISPUTA' ? <AlertTriangle className="w-5 h-5"/> : <Clock3 className="w-5 h-5"/>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">{s.category_name}</p>
                    <h2 className="font-black text-base text-slate-900 mt-0.5 break-words">{s.title}</h2>
                    <p className="text-sm text-slate-500 mt-2">Técnico: <span className="font-bold text-slate-700">{s.worker_name || 'Técnico asignado'}</span></p>
                    <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-black">
                      <span className={`px-2 py-1 rounded-lg ${tone[status] || 'bg-slate-100 text-slate-600'}`}>{labels[status] || status}</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600">RD$ {price.toLocaleString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-1"/>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400 font-bold">Fecha</p><p className="font-black text-slate-700 mt-1">{s.service_date || 'Por coordinar'}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400 font-bold">Hora</p><p className="font-black text-slate-700 mt-1">{s.service_time || 'Por coordinar'}</p></div>
                </div>
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold">
                  {status === 'TRABAJADOR_SELECCIONADO' ? 'Técnico seleccionado. El siguiente paso es completar el pago para poner los fondos en Custodia SERVIYA.' : status === 'EN_PROGRESO' ? 'Trabajo activo. Puedes coordinar con el técnico y revisar el avance.' : status === 'COMPLETADA' ? 'El trabajador marcó el trabajo como terminado. Revisa y confirma cuando corresponda.' : status === 'EN_DISPUTA' ? 'Este trabajo está en disputa y requiere revisión.' : 'Seguimiento de la contratación.'}
                </div>
              </button>
              {s.worker_id && <div className="px-5 pb-5"><button onClick={() => onOpenChat(s.id, s.worker_id!)} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black"><MessageSquare className="w-4 h-4"/> Mensaje al técnico</button></div>}
            </article>
          );
        })}
      </div>
    </section>
  );
};
