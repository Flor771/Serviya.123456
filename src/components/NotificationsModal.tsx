import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, Bell, CheckCircle } from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative max-h-[80vh] flex flex-col">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Notificaciones</h3>
          </div>
          <button
            onClick={markAllAsRead}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Marcar leídas
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tienes notificaciones pendientes.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl border text-xs space-y-1 ${
                  n.read ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{n.title}</span>
                  <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p>{n.message}</p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
