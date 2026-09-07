import React, { useState } from 'react';
import { api } from '../services/api';
import { X, ShieldAlert, CheckCircle } from 'lucide-react';

interface DisputesModalProps {
  serviceId?: string;
  onClose: () => void;
}

export const DisputesModal: React.FC<DisputesModalProps> = ({ serviceId, onClose }) => {
  const [reason, setReason] = useState('TRABAJO_INCOMPLETO');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      setMsgError('Selecciona un servicio para iniciar la disputa.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/disputes', {
        service_id: serviceId,
        reason,
        description
      });
      setMsgSuccess('Disputa abierta. El equipo administrativo de SERVIYA mediara los fondos en custodia.');
    } catch (err: any) {
      setMsgError(err.message || 'Error al abrir disputa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">Centro de Disputas SERVIYA</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Si surgió algún desacuerdo durante el trabajo, nuestro equipo intervendrá para mediar los fondos.</p>

        {msgError && <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded-xl">{msgError}</div>}
        {msgSuccess && (
          <div className="mb-3 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{msgSuccess}</span>
          </div>
        )}

        {serviceId ? (
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
          <div className="text-center py-6 text-xs text-slate-500">
            Abre los detalles del servicio correspondiente para iniciar una disputa sobre los fondos en custodia.
          </div>
        )}

      </div>
    </div>
  );
};
