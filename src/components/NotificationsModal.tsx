import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, Bell, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface NotificationsModalProps { onClose: () => void; }
type Destination = 'service' | 'chat' | 'applications' | 'wallet' | 'dispute';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();
  const [detail, setDetail] = useState<any | null>(null);

  const classify = (n: any): { destination: Destination; tab: string; label: string } => {
    const type = String(n.type || '').toUpperCase();
    const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
    if (type.includes('MESSAGE') || type.includes('CHAT') || text.includes('mensaje')) return { destination: 'chat', tab: 'mensajes', label: 'Abrir mensajes' };
    if (type.includes('APPLICATION') || type.includes('POSTUL') || text.includes('postulación') || text.includes('postulacion')) return { destination: 'applications', tab: 'postulaciones', label: 'Abrir postulaciones' };
    if (type.includes('DISPUTE') || type.includes('DISPUTA')) return { destination: 'dispute', tab: 'mis-trabajos', label: 'Abrir disputa' };
    if (type.includes('WALLET') || type.includes('WITHDRAW') || type.includes('RETIRO')) return { destination: 'wallet', tab: 'billetera', label: 'Abrir billetera' };
    return { destination: 'service', tab: 'mis-trabajos', label: 'Abrir servicio' };
  };

  const navigate = (n: any) => {
    const route = classify(n);
    onClose();
    window.dispatchEvent(new CustomEvent('serviya:navigate', { detail: {
      tab: route.tab,
      destination: route.destination,
      serviceId: n.related_entity_id ? String(n.related_entity_id) : '',
      notificationType: String(n.type || '').toUpperCase(),
      notificationId: n.id ? String(n.id) : ''
    }}));
  };

  const openRelated = async (n: any) => {
    try {
      if (n.id) { try { await api.patch(`/notifications/${n.id}/read`); } catch {} }
      const type = String(n.type || '').toUpperCase();
      const isAdminNotice = type.includes('ADMIN') || ['DEPOSIT_VERIFIED','PAYMENT_RELEASED','PAYMENT_ADMIN_APPROVED','DEPOSIT_REJECTED'].includes(type);
      if (isAdminNotice) setDetail(n); else navigate(n);
    } catch (err) {
      console.error('No se pudo abrir la notificación:', err);
      onClose();
    }
  };

  if (detail) {
    const route = classify(detail);
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0"><div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5"/></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">SERVIYA • NOTIFICACIÓN</p><h2 className="text-xl sm:text-2xl font-black mt-1 break-words">{detail.title}</h2></div></div>
          <button onClick={()=>setDetail(null)} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0" aria-label="Cerrar"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 sm:p-7">
          <p className="text-base sm:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{detail.message}</p>
          <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500"><p><b>Fecha:</b> {new Date(detail.created_at).toLocaleString()}</p>{detail.related_entity_id&&<p className="mt-1"><b>Referencia:</b> {detail.related_entity_id}</p>}</div>
          <div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>navigate(detail)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold"><ArrowRight className="w-4 h-4"/>{route.label}</button><button onClick={()=>setDetail(null)} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold">Cerrar</button></div>
        </div>
      </div>
    </div>;
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative max-h-[80vh] flex flex-col">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" aria-label="Cerrar"><X className="w-5 h-5"/></button>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3"><div className="flex items-center gap-2"><Bell className="w-5 h-5 text-blue-600"/><h3 className="text-lg font-bold text-slate-900">Notificaciones</h3></div><button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline font-semibold">Marcar leídas</button></div>
      <div className="flex-1 overflow-y-auto space-y-2">{notifications.length===0?<p className="text-xs text-slate-400 text-center py-8">No tienes notificaciones pendientes.</p>:notifications.map((n:any)=>{const route=classify(n);const isAdminNotice=String(n.type||'').toUpperCase().includes('ADMIN')||['DEPOSIT_VERIFIED','PAYMENT_RELEASED','PAYMENT_ADMIN_APPROVED','DEPOSIT_REJECTED'].includes(String(n.type||'').toUpperCase());return <button key={n.id} onClick={()=>openRelated(n)} className={`w-full text-left p-3 rounded-2xl border text-xs space-y-1 transition active:scale-[0.99] ${n.read?'bg-slate-50 border-slate-100 text-slate-600':'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-xs break-words">{n.title}</span><span className="text-[10px] text-slate-400 shrink-0">{new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><p className="break-words leading-relaxed">{n.message}</p><p className="text-[10px] font-bold mt-1 text-blue-600 inline-flex items-center gap-1">{isAdminNotice?'Abrir notificación completa':route.label}<ArrowRight className="w-3 h-3"/></p></button>})}</div>
    </div>
  </div>;
};
