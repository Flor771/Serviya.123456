import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { X, ShieldAlert, CheckCircle, Clock, ChevronRight } from 'lucide-react';

interface DisputeItem {
  id: number;
  service_id: string;
  service_title: string;
  reason: string;
  description: string;
  status: string;
  resolution_notes?: string | null;
  created_at: string;
}

interface DisputesModalProps {
  serviceId?: string | null;
  onClose: () => void;
}

export const DisputesModal: React.FC<DisputesModalProps> = ({ serviceId, onClose }) => {
  const [reason, setReason] = useState('TRABAJO_INCOMPLETO');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [eligibleServices, setEligibleServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(serviceId || '');
  const [loading, setLoading] = useState(false);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ disputes: DisputeItem[] }>('/disputes');
      setDisputes(data.disputes || []);
    } catch (err: any) {
      setMsgError(err.message || 'No se pudieron cargar las disputas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedServiceId(serviceId || '');
  }, [serviceId]);

  const loadEligibleServices = async () => {
    if (serviceId) return;
    try {
      const data = await api.get<{ services: any[] }>('/services');
      const mine = (data.services || []).filter((s: any) =>
        s.worker_id && ['TRABAJADOR_SELECCIONADO','EN_PROGRESO','FINALIZANDO','PENDIENTE_APROBACION','EN_DISPUTA'].includes(String(s.status))
      );
      setEligibleServices(mine);
    } catch {
      setEligibleServices([]);
    }
  };

  useEffect(() => {
    loadDisputes();
    loadEligibleServices();
  }, [serviceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeServiceId = selectedServiceId || serviceId;
    if (!activeServiceId) {
      setMsgError('Selecciona el servicio correspondiente para iniciar la disputa.');
      return;
    }
    if (!description.trim()) {
      setMsgError('Describe lo sucedido antes de abrir la disputa.');
      return;
    }

    setSubmitting(true);
    setMsgError('');
    try {
      await api.post('/disputes', {
        service_id: activeServiceId,
        reason,
        description: description.trim()
      });
      setMsgSuccess('Disputa abierta. El equipo administrativo de SERVIYA mediará los fondos en custodia.');
      setDescription('');
      await loadDisputes();
    } catch (err: any) {
      setMsgError(err.message || 'Error al abrir disputa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">Centro de Disputas SERVIYA</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Consulta tus casos o abre una disputa cuando exista un desacuerdo sobre un servicio.</p>

        {msgError && <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded-xl">{msgError}</div>}
        {msgSuccess && (
          <div className="mb-3 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{msgSuccess}</span>
          </div>
        )}

        {!selectedServiceId && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Abrir una disputa</h4>
            {eligibleServices.length > 0 ? <div className="space-y-2 mb-4">{eligibleServices.map((s:any) => <button key={s.id} type="button" onClick={()=>{setSelectedServiceId(String(s.id));setMsgError('');setMsgSuccess('')}} className="w-full text-left bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-black text-slate-900">{s.title || 'Servicio SERVIYA'}</p>
              <p className="text-[10px] text-red-700 mt-1">{String(s.status || '').replaceAll('_',' ')} • RD$ {Number(s.negotiated_price_rd || s.price_rd || 0).toLocaleString('es-DO')}</p>
              <p className="text-[10px] text-slate-500 mt-1">Toca para iniciar el reclamo</p>
            </button>)}</div> : <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center text-[11px] text-slate-500 mb-4">No hay servicios con trabajador asignado disponibles para abrir una nueva disputa.</div>}
            <h4 className="text-xs font-bold text-slate-700 mb-2">Mis disputas</h4>
            {loading ? (
              <div className="text-center py-4 text-xs text-slate-500">Cargando disputas...</div>
            ) : disputes.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-xs text-slate-500">
                No tienes disputas registradas.
              </div>
            ) : (
              <div className="space-y-2">
                {disputes.map((d) => (
                  <div key={d.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{d.service_title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{d.reason}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {d.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">{d.description}</p>
                    {d.resolution_notes && <p className="text-[11px] text-emerald-700 mt-2">Resolución: {d.resolution_notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedServiceId ? (
          <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800"><b>Servicio seleccionado:</b> {eligibleServices.find((s:any)=>String(s.id)===String(selectedServiceId))?.title || selectedServiceId}</div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo Principal</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="TRABAJO_INCOMPLETO">El trabajo quedó incompleto</option>
                <option value="DEFECTO_CALIDAD">Trabajo de mala calidad o daño material</option>
                <option value="NO_PRESENTACION">El trabajador no se presentó</option>
                <option value="OTRO">Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Explicación detallada *</label>
              <textarea
                rows={4}
                placeholder="Describe lo sucedido, acuerdos no cumplidos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Abriendo Disputa...' : '⚠️ Abrir Disputa Oficial'}
            </button>
          </form>
        ) : (
          <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
            Abre los detalles de un servicio para iniciar una nueva disputa <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
};
