import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Service } from '../types';

const MAX_PHOTOS = 10;
const MAX_CHARS = 700_000;

const compressPhoto = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) return reject(new Error('Solo se permiten imágenes.'));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo procesar la foto.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let data = canvas.toDataURL('image/jpeg', quality);
      while (data.length > MAX_CHARS && quality > 0.42) { quality -= 0.08; data = canvas.toDataURL('image/jpeg', quality); }
      if (data.length > MAX_CHARS) return reject(new Error('La foto es demasiado grande.'));
      resolve(data);
    };
    img.onerror = () => reject(new Error('No se pudo procesar la foto.'));
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

interface Props { service: Service; onClose: () => void; onRefresh?: () => void; }

export const WorkPhotosModal: React.FC<Props> = ({ service, onClose, onRefresh }) => {
  const { user } = useAuth();
  const isWorker = user?.id === service.worker_id;
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try { const data = await api.get<{ photos: string[] }>(`/services/${service.id}/completion-photos`); setPhotos(data.photos || []); }
    catch (err:any) { setError(err.message || 'No se pudieron cargar las fotos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [service.id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    if (photos.length + newPhotos.length + files.length > MAX_PHOTOS) { setError(`Puedes guardar hasta ${MAX_PHOTOS} fotos de finalización.`); return; }
    try {
      const converted: string[] = [];
      for (const file of Array.from(files)) converted.push(await compressPhoto(file));
      setNewPhotos(prev => [...prev, ...converted].slice(0, MAX_PHOTOS - photos.length));
    } catch (err:any) { setError(err.message || 'No se pudo procesar una foto.'); }
  };

  const save = async () => {
    if (!newPhotos.length) { setError('Agrega al menos una foto del trabajo terminado.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = await api.post<{ photos:string[]; message:string }>(`/services/${service.id}/completion-photos`, { photos: newPhotos, summary });
      setPhotos(data.photos || []); setNewPhotos([]); setSummary(''); setSuccess('Evidencia guardada. El cliente recibió una notificación para revisar el trabajo.'); onRefresh?.();
    } catch (err:any) { setError(err.message || 'No se pudieron guardar las fotos.'); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
      <div className="pr-8 mb-5"><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Evidencia del trabajo</p><h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{service.title}</h2><p className="text-xs text-slate-500 mt-1">Fotos antes/después y evidencia para que ambas partes puedan revisar el avance.</p></div>
      {error && <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
      {success && <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}
      {loading ? <p className="text-sm text-slate-500">Cargando evidencia…</p> : <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">{photos.map((src, i) => <img key={`${i}-${src.slice(-12)}`} src={src} alt={`Evidencia ${i+1}`} className="w-full aspect-square object-cover rounded-xl border border-slate-200" />)}{!photos.length && <div className="col-span-full p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">Todavía no hay fotos de finalización.</div>}</div>
        {isWorker && <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3"><div className="flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-700" /><div><h3 className="font-black text-sm text-slate-900">Defender trabajo terminado</h3><p className="text-xs text-slate-600">Sube fotos reales del resultado para dejar evidencia en el servicio.</p></div></div><label className="inline-flex items-center gap-2 cursor-pointer bg-white border border-emerald-300 text-emerald-700 font-bold text-xs px-3 py-2.5 rounded-xl hover:bg-emerald-100"><ImageIcon className="w-4 h-4" />Subir fotos del trabajo<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={saving || photos.length + newPhotos.length >= MAX_PHOTOS} onChange={e => { void handleFiles(e.target.files); e.currentTarget.value=''; }} /></label>{newPhotos.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{newPhotos.map((src,i)=><div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-emerald-200"><img src={src} alt={`Nueva evidencia ${i+1}`} className="w-full h-full object-cover" /><button type="button" onClick={()=>setNewPhotos(newPhotos.filter((_,x)=>x!==i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>)}</div>}<textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={3} maxLength={1000} placeholder="Resumen del trabajo realizado (opcional)" className="w-full text-xs p-3 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" /><button type="button" onClick={save} disabled={saving || !newPhotos.length} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl disabled:opacity-50">{saving ? 'Guardando evidencia…' : '✓ Enviar evidencia al cliente'}</button></div>}
        {!isWorker && <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-800 font-semibold">Estas fotos fueron subidas por el técnico como evidencia. Revísalas antes de confirmar la finalización y liberar el pago.</div>}
      </>}
    </div>
  </div>;
};
