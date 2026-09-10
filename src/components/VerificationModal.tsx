import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getAuthToken } from '../services/api';
import { X, ShieldCheck, Camera, CheckCircle2, ImagePlus, Loader2 } from 'lucide-react';

interface VerificationModalProps {
  onClose: () => void;
}

type Side = 'front' | 'back';

export const VerificationModal: React.FC<VerificationModalProps> = ({ onClose }) => {
  const { user, refreshUser } = useAuth();
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [frontUrl, setFrontUrl] = useState(user?.cedula_front_url || '');
  const [backUrl, setBackUrl] = useState(user?.cedula_back_url || '');
  const [uploading, setUploading] = useState<Side | null>(null);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (side: Side, file: File) => {
    setMsgError('');
    setMsgSuccess('');
    if (!file.type.startsWith('image/')) {
      setMsgError('Selecciona una foto de la cédula.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMsgError('La foto no puede superar 8 MB.');
      return;
    }

    const preview = URL.createObjectURL(file);
    if (side === 'front') setFrontPreview(preview);
    else setBackPreview(preview);

    setUploading(side);
    try {
      const form = new FormData();
      form.append('side', side);
      form.append('photo', file);
      const token = getAuthToken();
      const base = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
      const response = await fetch(`${base}/verification/upload-photo?side=${side}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || 'No se pudo cargar la foto.');
      if (side === 'front') setFrontUrl(data.url || '');
      else setBackUrl(data.url || '');
      setMsgSuccess(side === 'front' ? 'Foto frontal cargada correctamente.' : 'Foto posterior cargada correctamente.');
      await refreshUser();
    } catch (err: any) {
      if (side === 'front') setFrontPreview('');
      else setBackPreview('');
      setMsgError(err.message || 'Error al cargar la foto.');
    } finally {
      setUploading(null);
    }
  };

  const handleFile = (side: Side, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadPhoto(side, file);
    event.target.value = '';
  };

  const submitVerification = async () => {
    setMsgError('');
    if (!frontUrl || !backUrl) {
      setMsgError('Carga la foto del frente y del dorso de la cédula.');
      return;
    }
    try {
      await api.post('/verification/upload', {
        document_type: 'CEDULA_RD',
        document_url: frontUrl,
        notes: 'Cédula cargada mediante fotos directas: frente y dorso.'
      });
      setMsgSuccess('¡Cédula enviada para verificación! El equipo de SERVIYA revisará las fotos.');
      await refreshUser();
    } catch (err: any) {
      setMsgError(err.message || 'Error al enviar la verificación.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-xl" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 pr-8">
          <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
          <h3 className="text-lg font-bold text-slate-900">Verificación de Cédula RD</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Sube fotos claras de tu cédula para obtener el distintivo <strong>“✓ Trabajador verificado”</strong>.
        </p>

        {msgError && <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">{msgError}</div>}
        {msgSuccess && <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>{msgSuccess}</span></div>}

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 mb-4">
          <div className="flex items-center gap-2 mb-1"><Camera className="w-4 h-4 text-blue-600" /><p className="text-sm font-black text-slate-900">Carga tus fotos de la cédula</p></div>
          <p className="text-[11px] text-slate-500">No usamos escáner. Puedes elegir una foto de tu teléfono o tomarla directamente con la cámara.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['front', 'back'] as Side[]).map(side => {
            const preview = side === 'front' ? frontPreview : backPreview;
            const saved = side === 'front' ? frontUrl : backUrl;
            const label = side === 'front' ? 'Frente de la cédula' : 'Dorso de la cédula';
            const inputRef = side === 'front' ? frontInput : backInput;
            return (
              <div key={side} className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => handleFile(side, e)} className="hidden" />
                <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading !== null} className="w-full min-h-32 rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col items-center justify-center text-center active:scale-[.99] transition disabled:opacity-60">
                  {preview ? <img src={preview} alt={label} className="w-full h-32 object-cover" /> : saved ? <div className="w-full h-32 flex flex-col items-center justify-center text-emerald-700"><CheckCircle2 className="w-8 h-8 mb-1" /><span className="text-xs font-bold">Foto cargada</span></div> : uploading === side ? <Loader2 className="w-8 h-8 text-blue-600 animate-spin" /> : <><ImagePlus className="w-8 h-8 text-blue-600 mb-2" /><span className="text-xs font-black text-slate-800">Subir foto</span><span className="text-[10px] text-slate-500 mt-1">Galería o cámara</span></>}
                </button>
                <p className="text-[11px] font-bold text-slate-700 mt-2 text-center">{label}</p>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={submitVerification} disabled={!frontUrl || !backUrl || uploading !== null} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50">
          🛡️ Enviar Cédula para Verificación
        </button>
      </div>
    </div>
  );
};
