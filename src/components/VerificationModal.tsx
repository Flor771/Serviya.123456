import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';

interface VerificationModalProps {
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ onClose }) => {
  const { user, refreshUser } = useAuth();
  const [docType, setDocType] = useState('CEDULA');
  const [docNumber, setDocNumber] = useState(user?.cedula_passport || '001-1234567-8');
  const [documentUrl, setDocumentUrl] = useState('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800');
  const [submitting, setSubmitting] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError('');
    setMsgSuccess('');

    setSubmitting(true);
    try {
      await api.post('/verification', {
        document_type: docType,
        document_number: docNumber,
        document_url: documentUrl
      });
      setMsgSuccess('¡Documento enviado para verificación! El equipo de SERVIYA revisará tu Cédula en menos de 24 horas.');
      await refreshUser();
    } catch (err: any) {
      setMsgError(err.message || 'Error al enviar documento.');
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
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Verificación de Cédula RD</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Obtén el distintivo <strong>"✓ Trabajador verificado"</strong> para inspirar confianza y recibir hasta 3 veces más contrataciones.
        </p>

        {msgError && <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded-xl">{msgError}</div>}
        {msgSuccess && (
          <div className="mb-3 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msgSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Documento</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="CEDULA">Cédula de Identidad y Electoral RD</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="CERTIFICACION_INFOTEP">Certificación Técnica INFOTEP</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Número de Documento *</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Foto o Escaneo del Documento (URL/Preview)</label>
            <input
              type="text"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : '🛡️ Enviar para Verificación'}
          </button>
        </form>

      </div>
    </div>
  );
};
