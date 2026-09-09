import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, Bell } from 'lucide-react';
import { api } from '../services/api';

interface NotificationsModalProps { onClose: () => void; }

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();

  const openRelated = async (n: any) => {
    try {
      if (n.id) {
        try { await api.patch(`/notifications/${n.id}/read`); } catch {}
      }
      const serviceId = n.related_entity_id;
      if (!serviceId) { onClose(); return; }

      const data = await api.get<{ services: any[] }>('/services');
      const service = (data.services || []).find((s: any) => String(s.id) === String(serviceId));
      onClose();
      if (!service) return;

      // Open the most relevant section first, then open the service card/detail.
      const type = String(n.type || '').toUpperCase();
      const targetTab = type.includes('SELECCION') || type.includes('SERVICE_STARTED') || type.includes('TRABAJO')
        ? 'Mis trabajos'
        : 'Mis publicaciones';

      const navButtons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
      const nav = navButtons.find((b) => (b.textContent || '').trim() === targetTab || (b.textContent || '').includes(targetTab));
      if (nav) nav.click();

      // App state changes asynchronously; give React time to render the target section.
      window.setTimeout(() => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        const title = String(service.title || '').trim();
        const card = buttons.find((b) => (b.textContent || '').includes(title));
        if (card) card.click();
      }, 300);
    } catch (err) {
      console.error('No se pudo abrir la notificación:', err);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-blue-600" /><h3 className="text-lg font-bold text-slate-900">Notificaciones</h3></div>
          <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline font-semibold">Marcar leídas</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tienes notificaciones pendientes.</p>
          ) : notifications.map((n: any) => (
            <button
              key={n.id}
              onClick={() => openRelated(n)}
              className={`w-full text-left p-3 rounded-2xl border text-xs space-y-1 transition active:scale-[0.99] ${n.read ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'}`}
            >
              <div className="flex items-center justify-between gap-2"><span className="font-bold text-xs break-words">{n.title}</span><span className="text-[10px] text-slate-400 shrink-0">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
              <p className="break-words leading-relaxed">{n.message}</p>
              {n.related_entity_id && <p className="text-[10px] text-blue-600 font-bold mt-1">Toca para abrir el trabajo →</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
