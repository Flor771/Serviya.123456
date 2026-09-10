import React, { useEffect, useState } from 'react';
import { Service, Application } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, MapPin, Calendar, MessageSquare, Send, Users, Lock, ShieldCheck } from 'lucide-react';
import { NegotiationPanel } from './NegotiationPanel';
import { WorkFlowActions } from './WorkFlowActions';

interface Props {
  service: Service;
  onClose: () => void;
  onRefresh: () => void;
  onOpenChat: (serviceId: string, receiverId: string) => void;
  onOpenDispute: (serviceId: string) => void;
}

export const MobileServiceDetailModal: React.FC<Props> = ({
  service,
  onClose,
  onRefresh,
  onOpenChat,
  onOpenDispute,
}) => {
  const { user } = useAuth();
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';
  const isClient = user?.id === service.client_id;
  const selected = user?.id === service.worker_id;
  const [apps, setApps] = useState<Application[]>([]);
  const [message, setMessage] = useState('');
  const [offer, setOffer] = useState(Number(service.price_rd || 0));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [openMessageFor, setOpenMessageFor] = useState<string | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);

  const loadApplications = async () => {
    if (!isClient) return;
    try {
      const data = await api.get<{ applications: Application[] }>(`/services/${service.id}/applications`);
      setApps(data.applications || []);
    } catch {
      setApps([]);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, [service.id, isClient]);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setFeedback('Escribe un mensaje para presentarte al cliente.');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      await api.post('/applications', {
        service_id: service.id,
        message: message.trim(),
        offered_price_rd: offer,
        availability_note: 'Disponibilidad inmediata',
      });
      setMessage('');
      setFeedback('Postulación enviada.');
      await loadApplications();
      onRefresh();
    } catch (e: any) {
      setFeedback(e?.message || 'No se pudo enviar la postulación.');
    } finally {
      setBusy(false);
    }
  };

  const select = async (applicationId: string) => {
    setBusy(true);
    setFeedback('');
    try {
      await api.post(`/applications/${applicationId}/select`, {});
      setFeedback('Trabajador seleccionado. Ahora pueden negociar el precio final.');
      await loadApplications();
      onRefresh();
    } catch (e: any) {
      setFeedback(e?.message || 'No se pudo seleccionar.');
    } finally {
      setBusy(false);
    }
  };

  const sendQuickMessage = async (receiverId: string) => {
    const content = quickMessage.trim();
    if (!content || sendingQuick) return;
    setSendingQuick(true);
    try {
      await api.post('/messages', { service_id: service.id, receiver_id: receiverId, content });
      setQuickMessage('');
      setOpenMessageFor(null);
      onOpenChat(service.id, receiverId);
    } catch (e: any) {
      setFeedback(e?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSendingQuick(false);
    }
  };

  const showContinuity =
    (isClient || selected) &&
    !!service.worker_id &&
    ['TRABAJADOR_SELECCIONADO', 'EN_PROGRESO', 'COMPLETADA'].includes(String(service.status));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col">
          <div className="shrink-0 bg-white border-b px-3 sm:px-4 py-3 flex items-center gap-2">
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-100" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-black text-blue-600 truncate">{service.category_name}</p>
              <h2 className="font-black text-base leading-tight break-words">{service.title}</h2>
            </div>
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800">
              {String(service.status).replace(/_/g, ' ')}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 pb-10">
            {feedback && (
              <div className="p-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                {feedback}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-500">Presupuesto inicial</p>
                <p className="font-black text-lg">RD$ {Number(service.price_rd || 0).toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-[10px] text-emerald-700">Precio acordado</p>
                <p className="font-black text-lg text-emerald-700">
                  {service.negotiated_price_rd
                    ? `RD$ ${Number(service.negotiated_price_rd).toLocaleString()}`
                    : 'Pendiente'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{service.description}</p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-red-500 shrink-0" /><span>{service.municipality}, {service.province} • {service.address_approx}</span></div>
                <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-blue-500 shrink-0" /><span>{service.service_date} • {service.service_time}</span></div>
              </div>
            </div>

            {isWorker && !selected && !['COMPLETADA', 'CANCELADA'].includes(service.status) && (
              <form onSubmit={apply} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <div className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" /><p className="font-black text-sm">Postularme a este servicio</p></div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe tu propuesta para el cliente..." className="w-full min-h-24 p-3 rounded-xl border bg-white text-sm" />
                <input type="number" min="1" value={offer} onChange={(e) => setOffer(Number(e.target.value))} className="w-full p-3 rounded-xl border bg-white text-sm font-bold" />
                <button disabled={busy} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs disabled:opacity-50">
                  <Send className="inline w-4 h-4 mr-1" />{busy ? 'Enviando...' : 'Enviar postulación'}
                </button>
              </form>
            )}

            {isClient && service.status === 'TRABAJADOR_SELECCIONADO' && service.worker_id && (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <div className="flex gap-2"><Lock className="w-5 h-5 text-blue-600 shrink-0" /><div><p className="font-black text-sm text-blue-900">Primero negociación, después pago</p><p className="text-xs text-blue-800 mt-1">El precio final debe quedar acordado antes de enviar el dinero a Custodia.</p></div></div>
                <button onClick={() => setOpenMessageFor(openMessageFor === service.worker_id ? null : service.worker_id!)} className="mt-3 w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-xs"><MessageSquare className="inline w-4 h-4 mr-1" />Mensaje al trabajador</button>
                {openMessageFor === service.worker_id && (
                  <div className="mt-3 flex gap-2">
                    <textarea value={quickMessage} onChange={(e) => setQuickMessage(e.target.value)} className="flex-1 min-h-20 p-3 rounded-xl border bg-white text-sm" placeholder="Escribe un mensaje..." />
                    <button onClick={() => sendQuickMessage(service.worker_id!)} disabled={sendingQuick} className="p-3 rounded-xl bg-blue-600 text-white"><Send className="w-5 h-5" /></button>
                  </div>
                )}
              </div>
            )}

            {(isClient || selected) && service.status === 'TRABAJADOR_SELECCIONADO' && service.worker_id && (
              <div className="rounded-2xl border border-blue-100 bg-slate-50 p-1">
                <NegotiationPanel serviceId={service.id} clientId={service.client_id} workerId={service.worker_id} budget={Number(service.price_rd || 0)} title={service.title} onRefresh={onRefresh} onOpenChat={onOpenChat} />
              </div>
            )}

            {isClient && apps.length > 0 && (
              <div className="space-y-2">
                <p className="font-black text-sm">Postulaciones recibidas</p>
                {apps.map((app) => (
                  <div key={app.id} className="rounded-2xl border p-3">
                    <p className="font-bold text-xs">{app.worker_name} {app.worker_is_verified ? '✓' : ''}</p>
                    <p className="text-xs text-slate-500">{app.worker_profession} • ★ {app.worker_rating}</p>
                    <p className="text-xs mt-1 font-bold">Propuesta: RD$ {Number(app.offered_price_rd || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-slate-700 whitespace-pre-wrap">{app.message}</p>
                    {app.status !== 'SELECCIONADO' && (
                      <button disabled={busy} onClick={() => select(app.id)} className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold">Seleccionar</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showContinuity && (
              <WorkFlowActions service={service} onRefresh={onRefresh} onOpenChat={onOpenChat} embedded showNegotiation={false} />
            )}

            {isClient && service.status === 'EN_PROGRESO' && (
              <button onClick={() => onOpenDispute(service.id)} className="w-full py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-black text-xs">
                Abrir disputa / proteger fondos
              </button>
            )}

            <div className="rounded-2xl bg-slate-900 text-white p-4 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-slate-300">Custodia SERVIYA protege el pago. La liberación final requiere confirmación del cliente y aprobación administrativa.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};