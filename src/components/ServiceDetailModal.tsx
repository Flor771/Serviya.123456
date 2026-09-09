import React, { useState, useEffect, useCallback } from 'react';
import { Service, Application } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../services/api';
import { 
  X, MapPin, Calendar, Clock, DollarSign, User as UserIcon, ShieldCheck, Lock,
  CheckCircle, Send, Star, MessageSquare, AlertTriangle, Ban, RotateCcw
} from 'lucide-react';

interface ServiceDetailModalProps {
  service: Service;
  onClose: () => void;
  onRefresh: () => void;
  onOpenChat: (service_id: string, receiver_id: string) => void;
  onOpenReview: (service_id: string, target_user_id: string) => void;
  onOpenDispute: (service_id: string) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service, onClose, onRefresh, onOpenChat, onOpenReview, onOpenDispute
}) => {
  const { user } = useAuth();
  const { payEscrow, releaseEscrow } = useWallet();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [message, setMessage] = useState('');
  const [offeredPriceRd, setOfferedPriceRd] = useState<number>(service.price_rd);
  const [availabilityNote, setAvailabilityNote] = useState('Disponibilidad inmediata');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const isClient = user?.id === service.client_id;
  const isSelectedWorker = user?.id === service.worker_id;

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await api.get<{ applications: Application[] }>(`/services/${service.id}/applications`);
      setApplications(data.applications);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoadingApps(false);
    }
  }, [service.id]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const clearFeedback = () => { setActionError(''); setActionSuccess(''); };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault(); clearFeedback();
    if (!message.trim()) { setActionError('Escribe un mensaje para el cliente.'); return; }
    setSubmittingApp(true);
    try {
      await api.post('/applications', {
        service_id: service.id, message,
        offered_price_rd: Number(offeredPriceRd), availability_note: availabilityNote
      });
      setActionSuccess('¡Te has postulado con éxito! El cliente recibirá una notificación.');
      await fetchApplications(); onRefresh();
    } catch (err: any) { setActionError(err.message || 'Error al postularte.'); }
    finally { setSubmittingApp(false); }
  };

  const handleSelectWorker = async (appId: string) => {
    clearFeedback(); setSubmittingAction(true);
    try {
      await api.post(`/applications/${appId}/select`, {});
      setActionSuccess('Trabajador seleccionado. Procede a depositar los fondos en Custodia SERVIYA.');
      await fetchApplications(); onRefresh();
    } catch (err: any) { setActionError(err.message || 'Error al seleccionar trabajador.'); }
    finally { setSubmittingAction(false); }
  };

  const handleDepositEscrow = async () => {
    clearFeedback(); setSubmittingAction(true);
    try {
      await payEscrow(service.id);
      setActionSuccess('¡Pago depositado en Custodia SERVIYA! El trabajador ha sido notificado.');
      onRefresh();
    } catch (err: any) { setActionError(err.message || 'Error al depositar en custodia.'); }
    finally { setSubmittingAction(false); }
  };

  const handleConfirmCompletion = async () => {
    clearFeedback(); setSubmittingAction(true);
    try {
      await releaseEscrow(service.id);
      setActionSuccess('¡Pago liberado al trabajador! Gracias por utilizar Custodia SERVIYA.');
      onRefresh();
      if (service.worker_id) onOpenReview(service.id, service.worker_id);
    } catch (err: any) { setActionError(err.message || 'Error al liberar el pago.'); }
    finally { setSubmittingAction(false); }
  };

  const handleClientCancel = async () => {
    if (!window.confirm('¿Confirmas que deseas cancelar este servicio? Si ya hay fondos en custodia, la cancelación quedará protegida para revisión.')) return;
    clearFeedback(); setSubmittingAction(true);
    try {
      await api.post(`/services/${service.id}/cancel`, {});
      setActionSuccess('Servicio cancelado. Si había fondos en custodia, quedaron protegidos para la resolución correspondiente.');
      onRefresh();
    } catch (err: any) { setActionError(err.message || 'No se pudo cancelar el servicio.'); }
    finally { setSubmittingAction(false); }
  };

  const handleWorkerCancel = async () => {
    if (!window.confirm('¿Confirmas que no podrás realizar este servicio? Si existen fondos en custodia, pasarán a revisión administrativa.')) return;
    clearFeedback(); setSubmittingAction(true);
    try {
      await api.post(`/services/${service.id}/cancel-by-worker`, {});
      setActionSuccess('Cancelación registrada. Si había fondos en custodia, quedaron protegidos para revisión administrativa.');
      onRefresh();
    } catch (err: any) { setActionError(err.message || 'No se pudo cancelar el servicio.'); }
    finally { setSubmittingAction(false); }
  };

  const handleNoShow = async () => {
    if (!window.confirm('¿Confirmas que el trabajador no se presentó? Esto abrirá una disputa y protegerá los fondos en custodia.')) return;
    clearFeedback(); setSubmittingAction(true);
    try {
      await api.post(`/services/${service.id}/report-no-show`, {});
      setActionSuccess('No-show reportado. La disputa quedó abierta y los fondos permanecen protegidos.');
      onRefresh();
    } catch (err: any) { setActionError(err.message || 'No se pudo reportar el no-show.'); }
    finally { setSubmittingAction(false); }
  };

  const handleRefund = async () => {
    if (!window.confirm('¿Solicitas el reembolso total de los fondos que están en Custodia SERVIYA?')) return;
    clearFeedback(); setSubmittingAction(true);
    try {
      await api.post('/payments/refund', { service_id: service.id });
      setActionSuccess('Reembolso solicitado y procesado. El saldo fue devuelto a tu billetera SERVIYA.');
      onRefresh();
    } catch (err: any) { setActionError(err.message || 'No se pudo procesar el reembolso.'); }
    finally { setSubmittingAction(false); }
  };

  const hasAlreadyApplied = applications.some(a => a.worker_id === user?.id);
  const canCancelClient = isClient && !['COMPLETADA', 'CANCELADA', 'EN_DISPUTA'].includes(service.status);
  const canCancelWorker = isSelectedWorker && !['COMPLETADA', 'CANCELADA', 'EN_DISPUTA'].includes(service.status);
  const canReportNoShow = isClient && service.status === 'EN_PROGRESO';
  const canRefund = isClient && service.status === 'EN_PROGRESO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"><X className="w-5 h-5" /></button>

        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-50 text-blue-800 font-bold text-xs px-3 py-1 rounded-lg border border-blue-100">{service.category_name}</span>
          <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${service.status === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : service.status === 'EN_PROGRESO' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>Estado: {service.status}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-4 border-b border-slate-100">
          <div><h2 className="text-xl sm:text-2xl font-black text-slate-900">{service.title}</h2><p className="text-xs text-slate-500 mt-1">Publicado por {service.client_name} • Rating: ★ {service.client_rating}</p></div>
          <div className="text-left sm:text-right"><span className="text-[10px] text-slate-400 uppercase font-bold block">Presupuesto</span><span className="text-2xl font-black text-emerald-600">RD$ {service.price_rd.toLocaleString()}</span></div>
        </div>

        {actionError && <div className="my-3 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">{actionError}</div>}
        {actionSuccess && <div className="my-3 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><span>{actionSuccess}</span></div>}

        <div className="py-4 space-y-4 text-xs sm:text-sm text-slate-700">
          <div><h3 className="font-bold text-slate-900 text-xs uppercase text-slate-400 mb-1">Descripción del trabajo</h3><p className="leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">{service.description}</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500 shrink-0" /><span><strong>Ubicación:</strong> {service.municipality}, {service.province} ({service.address_approx})</span></div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500 shrink-0" /><span><strong>Fecha y hora:</strong> {service.service_date} a las {service.service_time}</span></div>
          </div>
          {service.requirements && service.requirements.length > 0 && <div><h3 className="font-bold text-slate-900 text-xs uppercase text-slate-400 mb-1">Requisitos exigidos</h3><ul className="list-disc list-inside space-y-1 text-xs text-slate-600">{service.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
        </div>

        {isClient && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            {service.status === 'TRABAJADOR_SELECCIONADO' && <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm"><Lock className="w-4 h-4 text-emerald-600" /><span>Siguiente paso: Depositar en Custodia SERVIYA</span></div>
              <p className="text-xs text-emerald-700">Deposita RD$ {service.price_rd.toLocaleString()} para asegurar los fondos. El dinero no se entrega al trabajador hasta que confirmes la obra lista.</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button disabled={submittingAction} onClick={handleDepositEscrow} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition">💰 Depositar RD$ {service.price_rd.toLocaleString()} en Custodia</button>
                {canCancelClient && <button disabled={submittingAction} onClick={handleClientCancel} className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-700 border border-red-200 font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1"><Ban className="w-3.5 h-3.5" />Cancelar servicio</button>}
              </div>
            </div>}

            {service.status === 'EN_PROGRESO' && <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm"><CheckCircle className="w-4 h-4 text-blue-600" /><span>Trabajo EN PROGRESO</span></div>
              <p className="text-xs text-blue-700">¿El trabajador finalizó el trabajo correctamente? Confirma para liberar el pago de la Custodia SERVIYA.</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button disabled={submittingAction} onClick={handleConfirmCompletion} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition">✓ Confirmar Finalización y Liberar Pago</button>
                {canRefund && <button disabled={submittingAction} onClick={handleRefund} className="bg-white hover:bg-emerald-50 disabled:opacity-50 text-emerald-700 border border-emerald-200 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Solicitar reembolso</button>}
                {canReportNoShow && <button disabled={submittingAction} onClick={handleNoShow} className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-700 border border-red-200 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Reportar no-show</button>}
                <button disabled={submittingAction} onClick={() => onOpenDispute(service.id)} className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 font-semibold text-xs px-3 py-2 rounded-xl">Abrir Disputa</button>
              </div>
              {canCancelClient && <button disabled={submittingAction} onClick={handleClientCancel} className="text-xs text-red-700 font-semibold hover:underline flex items-center gap-1 pt-1"><Ban className="w-3.5 h-3.5" />Cancelar servicio</button>}
            </div>}

            {service.status === 'EN_DISPUTA' && <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2"><div className="flex items-center gap-2 text-red-900 font-bold text-sm"><AlertTriangle className="w-4 h-4" /><span>Servicio en disputa</span></div><p className="text-xs text-red-700">Los fondos permanecen protegidos mientras ADMIN revisa y resuelve el caso.</p><button onClick={() => onOpenDispute(service.id)} className="bg-white text-red-700 border border-red-200 font-semibold text-xs px-3 py-2 rounded-xl">Ver disputa</button></div>}

            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Postulaciones Recibidas ({applications.length})</h3>
              {loadingApps ? <p className="text-xs text-slate-500">Cargando postulaciones...</p> : applications.length === 0 ? <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl text-center">Esperando postulaciones de trabajadores capacitados en RD.</p> : <div className="space-y-3">{applications.map((app) => <div key={app.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><img src={app.worker_avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'} alt={app.worker_name} className="w-10 h-10 rounded-full object-cover border border-blue-500" /><div><div className="flex items-center gap-1"><span className="font-bold text-xs sm:text-sm text-slate-900">{app.worker_name}</span>{app.worker_is_verified && <span className="text-xs text-blue-600 font-bold" title="Trabajador Verificado">✓</span>}</div><span className="text-[11px] text-slate-500 block">{app.worker_profession} • Rating: ★ {app.worker_rating}</span></div></div><div className="text-right"><span className="text-xs font-black text-slate-900 block">RD$ {app.offered_price_rd.toLocaleString()}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${app.status === 'SELECCIONADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{app.status}</span></div></div>
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">{app.message}</p>
                <div className="flex items-center justify-between pt-1"><button onClick={() => onOpenChat(service.id, app.worker_id)} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /><span>Enviar Mensaje</span></button>{service.status !== 'COMPLETADA' && app.status !== 'SELECCIONADO' && <button disabled={submittingAction} onClick={() => handleSelectWorker(app.id)} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm">Seleccionar Trabajador</button>}</div>
              </div>)}</div>}
            </div>
          </div>
        )}

        {isSelectedWorker && service.status !== 'COMPLETADA' && service.status !== 'CANCELADA' && (
          <div className="mt-4 pt-4 border-t border-slate-200 p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm"><AlertTriangle className="w-4 h-4" /><span>Servicio asignado a ti</span></div>
            <p className="text-xs text-amber-800">Si no puedes realizar el servicio, cancélalo desde aquí. Si existen fondos en custodia, ADMIN revisará la resolución.</p>
            <div className="flex flex-wrap gap-2"><button disabled={submittingAction} onClick={() => onOpenChat(service.id, service.client_id)} className="bg-white text-blue-700 border border-blue-200 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />Enviar Mensaje</button>{canCancelWorker && <button disabled={submittingAction} onClick={handleWorkerCancel} className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-700 border border-red-200 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1"><Ban className="w-3.5 h-3.5" />Cancelar servicio</button>}</div>
        </div>
        )}

        {!isClient && user && user.activeRole === 'TRABAJADOR' && service.status !== 'COMPLETADA' && service.status !== 'CANCELADA' && service.status !== 'EN_DISPUTA' && !isSelectedWorker && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">{hasAlreadyApplied ? <div className="p-4 bg-blue-50 text-blue-900 font-semibold text-xs rounded-2xl border border-blue-200 text-center">✓ Ya te has postulado a esta solicitud. Puedes comunicarte con el cliente por mensaje.</div> : <form onSubmit={handleApply} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200"><h3 className="font-bold text-slate-900 text-sm">Postularme a este Servicio</h3><div><label className="block text-[11px] font-bold text-slate-700 mb-1">Tu Propuesta / Mensaje al cliente</label><textarea rows={2} placeholder="Explica tu experiencia, disponibilidad y por qué eres el ideal..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" required /></div><div className="grid grid-cols-2 gap-2"><div><label className="block text-[11px] font-bold text-slate-700 mb-1">Precio Ofertado (RD$)</label><input type="number" value={offeredPriceRd} onChange={(e) => setOfferedPriceRd(Number(e.target.value))} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-bold" required /></div><div><label className="block text-[11px] font-bold text-slate-700 mb-1">Disponibilidad</label><input type="text" value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl" /></div></div><button type="submit" disabled={submittingApp} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50">{submittingApp ? 'Enviando...' : '🚀 Enviar Postulación'}</button></form>}</div>
        )}
      </div>
    </div>
  );
};