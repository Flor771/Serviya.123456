import React, { useState } from 'react';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { X, Plus, Trash2, MapPin, Calendar, Clock, DollarSign, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';

interface PublishServiceModalProps { onClose: () => void; onSuccess: () => void; }

const MAX_PHOTOS = 10;
const MAX_PHOTO_CHARS = 700_000;

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
      while (data.length > MAX_PHOTO_CHARS && quality > 0.42) {
        quality -= 0.08;
        data = canvas.toDataURL('image/jpeg', quality);
      }
      if (data.length > MAX_PHOTO_CHARS) return reject(new Error('La foto es demasiado grande.'));
      resolve(data);
    };
    img.onerror = () => reject(new Error('No se pudo procesar la foto.'));
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

export const PublishServiceModal: React.FC<PublishServiceModalProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(SERVICE_CATEGORIES[0].id);
  const [subcategory, setSubcategory] = useState(SERVICE_CATEGORIES[0].subcategories[0] || '');
  const [priceRd, setPriceRd] = useState<number | ''>(1500);
  const [province, setProvince] = useState(DOMINICAN_PROVINCES[0].name);
  const [municipality, setMunicipality] = useState(DOMINICAN_PROVINCES[0].municipalities[0]);
  const [addressApprox, setAddressApprox] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceTime, setServiceTime] = useState('09:00 AM');
  const [estimatedDuration, setEstimatedDuration] = useState('3 horas');
  const [images, setImages] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState('');
  const [requirements, setRequirements] = useState<string[]>(['Llegar puntual', 'Traer herramientas de trabajo']);
  const [submitting, setSubmitting] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [error, setError] = useState('');

  const selectedCatObj = SERVICE_CATEGORIES.find(c => c.id === categoryId);
  const currentProvObj = DOMINICAN_PROVINCES.find(p => p.name === province);

  const handleAddRequirement = () => { if (reqInput.trim()) { setRequirements([...requirements, reqInput.trim()]); setReqInput(''); } };
  const handleRemoveRequirement = (idx: number) => setRequirements(requirements.filter((_, i) => i !== idx));

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    if (images.length + files.length > MAX_PHOTOS) { setError(`Puedes subir hasta ${MAX_PHOTOS} fotos por solicitud.`); return; }
    setProcessingPhotos(true);
    try {
      const converted: string[] = [];
      for (const file of Array.from(files)) converted.push(await compressPhoto(file));
      setImages(prev => [...prev, ...converted].slice(0, MAX_PHOTOS));
    } catch (err: any) { setError(err.message || 'No se pudo procesar una de las fotos.'); }
    finally { setProcessingPhotos(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!title.trim() || !description.trim() || !priceRd) { setError('Completa el título, descripción y precio orientativo.'); return; }
    setSubmitting(true);
    try {
      await api.post('/services', { title, description, category_id: categoryId, category_name: selectedCatObj?.name || 'Otros', subcategory, price_rd: Number(priceRd), province, municipality, address_approx: addressApprox, service_date: serviceDate, service_time: serviceTime, estimated_duration: estimatedDuration, images, photos: images, requirements, payment_type: 'CUSTODIA_SERVIYA' });
      onSuccess(); onClose();
    } catch (err: any) { setError(err.message || 'Error al publicar la solicitud.'); }
    finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 my-auto">
      <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"><X className="w-5 h-5" /></button>
      <div className="space-y-1 mb-6"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Paso 1 de 1</span><h2 className="text-2xl font-black text-slate-900">Publicar Solicitud de Servicio 🇩🇴</h2><p className="text-xs text-slate-500">Publicar es 100% gratis. Los trabajadores postulados ofrecerán sus presupuestos.</p></div>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-xs font-bold text-slate-700 mb-1">Título del Servicio / Trabajo *</label><input type="text" placeholder="Ej: Instalación de Tinaco y Calentador en Bella Vista" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" required /></div>
        <div><label className="block text-xs font-bold text-slate-700 mb-1">Descripción detallada *</label><textarea rows={3} placeholder="Explica exactamente qué necesitas, requerimientos, espacio y estado del equipo..." value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Categoría *</label><select value={categoryId} onChange={e => { setCategoryId(e.target.value); const cat = SERVICE_CATEGORIES.find(c => c.id === e.target.value); if (cat?.subcategories.length) setSubcategory(cat.subcategories[0]); }} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">{SERVICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Subcategoría</label><select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">{selectedCatObj?.subcategories.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Presupuesto Estimado (RD$) *</label><div className="relative"><span className="absolute left-3 top-3 text-xs font-bold text-slate-400">RD$</span><input type="number" value={priceRd} onChange={e => setPriceRd(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-xs sm:text-sm pl-12 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold" required /></div></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Duración Estimada</label><input type="text" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Provincia RD *</label><select value={province} onChange={e => { setProvince(e.target.value); const p = DOMINICAN_PROVINCES.find(x => x.name === e.target.value); if (p) setMunicipality(p.municipalities[0]); }} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">{DOMINICAN_PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Municipio *</label><select value={municipality} onChange={e => setMunicipality(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">{currentProvObj?.municipalities.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
        <div><label className="block text-xs font-bold text-slate-700 mb-1">Sector / Referencia Aproximada</label><input type="text" placeholder="Ej: Piantini, cerca de la Av. Winston Churchill" value={addressApprox} onChange={e => setAddressApprox(e.target.value)} className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Fecha Deseada</label><input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Hora Deseada</label><input type="text" value={serviceTime} onChange={e => setServiceTime(e.target.value)} className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div></div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200"><div className="flex items-center justify-between gap-3 mb-2"><div><label className="block text-sm font-black text-slate-900">Fotos del trabajo</label><p className="text-xs text-slate-600 mt-0.5">Sube fotos para que los trabajadores puedan revisar lo que necesitas antes de postularse.</p></div><span className="text-xs font-bold text-blue-700 shrink-0">{images.length}/{MAX_PHOTOS}</span></div><label className="inline-flex items-center gap-2 cursor-pointer bg-white border border-blue-300 text-blue-700 font-bold text-xs px-3 py-2.5 rounded-xl hover:bg-blue-100 transition"><ImageIcon className="w-4 h-4" />{processingPhotos ? 'Procesando fotos…' : 'Subir fotos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={processingPhotos || images.length >= MAX_PHOTOS} onChange={e => { void handlePhotoFiles(e.target.files); e.currentTarget.value = ''; }} /></label>{images.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">{images.map((src, idx) => <div key={`${idx}-${src.slice(-20)}`} className="relative aspect-square rounded-xl overflow-hidden border border-blue-200 bg-white"><img src={src} alt={`Foto del trabajo ${idx + 1}`} className="w-full h-full object-cover" /><button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow" aria-label="Eliminar foto"><Trash2 className="w-3 h-3" /></button></div>)}</div>}</div>

        <div><label className="block text-xs font-bold text-slate-700 mb-1">Requisitos para el trabajador</label><div className="flex gap-2 mb-2"><input type="text" placeholder="Ej: Traer escaleras de 12 pies" value={reqInput} onChange={e => setReqInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /><button type="button" onClick={handleAddRequirement} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 shrink-0">Agregar</button></div><div className="flex flex-wrap gap-1.5">{requirements.map((req, idx) => <span key={idx} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-200"><span>{req}</span><button type="button" onClick={() => handleRemoveRequirement(idx)} className="text-blue-500 hover:text-red-600"><X className="w-3.5 h-3.5" /></button></span>)}</div></div>
        <button type="submit" disabled={submitting || processingPhotos} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition text-sm disabled:opacity-50">{submitting ? 'Publicando en SERVIYA.do...' : '🚀 Publicar Servicio Gratis'}</button>
      </form>
    </div>
  </div>;
};
