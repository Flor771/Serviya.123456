import React, { useState } from 'react';
import { Play, Camera, CheckCircle, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { Service } from '../types';
import { WorkPhotosModal } from './WorkPhotosModal';

interface Props { service: Service; onRefresh: () => void; onOpenChat: (serviceId: string, receiverId: string) => void; }

export const WorkFlowActions: React.FC<Props> = ({ service, onRefresh, onOpenChat }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPhotos, setShowPhotos] = useState(false);

  const start = async () => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.post(`/applications/service/${service.id}/start`, { note: 'Inicio del trabajo desde SERVIYA' });
      setSuccess('Trabajo iniciado. Ahora puedes subir la evidencia y coordinar con el cliente.');
      onRefresh();
    } catch (e: any) { setError(e.message || 'No se pudo iniciar el trabajo.'); }
    finally { setBusy(false); }
  };

  if (!service.worker_id) return null;

  return <>
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[45] w-[calc(100%-1.5rem)] max-w-2xl">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-3">
        {error && <div className="mb-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-2.5">{error}</div>}
        {success && <div className="mb-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5">{success}</div>}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Flujo del trabajo</p><p className="text-sm font-black text-slate-900">{service.status.replaceAll('_',' ')}</p></div>
          <div className="text-[10px] text-slate-500 text-right">Publicación → selección → custodia → progreso → evidencia → confirmación → pago</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {service.status === 'TRABAJADOR_SELECCIONADO' && <button disabled={busy} onClick={start} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2.5 rounded-xl disabled:opacity-50"><Play className="w-4 h-4"/>{busy ? 'Iniciando…' : 'Iniciar trabajo'}</button>}
          {service.status === 'EN_PROGRESO' && <button onClick={() => setShowPhotos(true)} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2.5 rounded-xl"><Camera className="w-4 h-4"/>Subir fotos del trabajo</button>}
          {service.status === 'EN_PROGRESO' && <button onClick={() => onOpenChat(service.id, service.client_id)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2.5 rounded-xl"><MessageSquare className="w-4 h-4"/>Mensajes</button>}
          {service.status === 'COMPLETADA' && <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs px-3 py-2.5 rounded-xl"><CheckCircle className="w-4 h-4"/>Trabajo completado y pago liberado</div>}
        </div>
      </div>
    </div>
    {showPhotos && <WorkPhotosModal service={service} onClose={() => setShowPhotos(false)} onRefresh={onRefresh} />}
  </>;
};
