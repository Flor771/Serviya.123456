import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, Bell, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface NotificationsModalProps { onClose: () => void; }
type Destination = 'service' | 'chat' | 'applications' | 'wallet' | 'dispute' | 'contract';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();

  const classify = (n: any): { destination: Destination; tab: string; label: string } => {
    const type = String(n.type || '').toUpperCase();
    const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
    if (type === 'CONTRACT_ISSUED' || type === 'CONTRACT_PENDING' || type === 'CONTRACT_READY' || text.includes('contrato digital disponible') || text.includes('contrato digital')) return { destination: 'contract', tab: 'contratos', label: 'Abrir contrato digital y aceptar' };
    if (type === 'TRABAJADOR_SELECCIONADO' || text.includes('fuiste seleccionado') || text.includes('has sido seleccionado')) return { destination: 'service', tab: 'mis-servicios', label: 'Abrir negociación y contraoferta' };
    if (type.includes('MESSAGE') || type.includes('CHAT') || text.includes('mensaje')) return { destination: 'chat', tab: 'mensajes', label: 'Abrir mensajes' };
    if (type.includes('APPLICATION') || type.includes('POSTUL') || text.includes('postulación') || text.includes('postulacion')) return { destination: 'applications', tab: 'postulaciones', label: 'Abrir postulaciones' };
    if (type.includes('DISPUTE') || type.includes('DISPUTA')) return { destination: 'dispute', tab: 'mis-trabajos', label: 'Abrir disputa' };
    if (type.includes('WALLET') || type.includes('WITHDRAW') || type.includes('RETIRO') || type.includes('DEPOSIT') || type.includes('PAYMENT')) return { destination: 'wallet', tab: 'billetera', label: 'Abrir depósito y custodia' };
    return { destination: 'service', tab: 'mis-trabajos', label: 'Abrir servicio' };
  };

  const navigate = (n: any) => {
    const route = classify(n);
    onClose();
    window.dispatchEvent(new CustomEvent('serviya:navigate', { detail: { tab: route.tab, destination: route.destination, serviceId: n.related_entity_id ? String(n.related_entity_id) : '', notificationType: String(n.type || '').toUpperCase(), notificationId: n.id ? String(n.id) : '', singleWindow: true }}));
  };

  const openRelated = (n: any) => {
    onClose();
    if (n.id) api.patch(`/notifications/${n.id}/read`).catch(() => {});
    navigate(n);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative max-h-[80vh] flex flex-col">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" aria-label="Cerrar"><X className="w-5 h-5"/></button>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3"><div className="flex items-center gap-2"><Bell className="w-5 h-5 text-blue-600"/><h3 className="text-lg font-bold text-slate-900">Notificaciones</h3></div><button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline font-semibold">Marcar leídas</button></div>
      <div className="flex-1 overflow-y-auto space-y-2">{notifications.length===0?<p className="text-xs text-slate-400 text-center py-8">No tienes notificaciones pendientes.</p>:notifications.map((n:any)=>{const route=classify(n);return <button key={n.id} onClick={()=>openRelated(n)} className={`w-full text-left p-3 rounded-2xl border text-xs space-y-1 transition active:scale-[0.99] ${n.read?'bg-slate-50 border-slate-100 text-slate-600':'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-xs break-words">{n.title}</span><span className="text-[10px] text-slate-400 shrink-0">{new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><p className="break-words leading-relaxed">{n.message}</p><p className="text-[10px] font-bold mt-1 text-blue-600 inline-flex items-center gap-1">{route.label}<ArrowRight className="w-3 h-3"/></p></button>;})}</div>
    </div>
  </div>;
};
