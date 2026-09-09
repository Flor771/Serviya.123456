import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DOMINICAN_PROVINCES } from '../data/dominicanData';
import { User as UserIcon, ShieldCheck, CheckCircle, Camera, Loader2 } from 'lucide-react';

interface ProfileViewProps { onOpenVerification: () => void; }

const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) return reject(new Error('Selecciona una imagen válida.'));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('La imagen no es válida.'));
    img.onload = () => {
      const maxSize = 700;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo procesar la imagen.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 650_000 && quality > 0.45) {
        quality -= 0.07;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > 700_000) return reject(new Error('La foto es demasiado grande. Elige otra imagen.'));
      resolve(dataUrl);
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenVerification }) => {
  const { user, updateProfile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState(user?.province || DOMINICAN_PROVINCES[0].name);
  const [municipality, setMunicipality] = useState(user?.municipality || DOMINICAN_PROVINCES[0].municipalities[0]);
  const [profession, setProfession] = useState(user?.worker_profile?.profession || '');
  const [hourlyRate, setHourlyRate] = useState<number>(user?.worker_profile?.hourly_rate_rd || 0);
  const [bio, setBio] = useState(user?.worker_profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');
  const currentProvObj = DOMINICAN_PROVINCES.find(p => p.name === province);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(''); setMsgSuccess(''); setPhotoSaving(true);
    try {
      const avatar_url = await compressImage(file);
      await updateProfile({ avatar_url });
      setMsgSuccess('Foto de perfil actualizada correctamente.');
    } catch (err: any) {
      setPhotoError(err?.message || 'No se pudo actualizar la foto.');
    } finally { setPhotoSaving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsgSuccess('');
    try {
      const payload: any = { first_name: firstName, last_name: lastName, phone, province, municipality };
      if (isWorker) payload.worker_profile = { profession, hourly_rate_rd: hourlyRate, bio };
      await updateProfile(payload);
      setMsgSuccess('¡Perfil actualizado con éxito!');
    } catch (err) { console.error('Error updating profile:', err); }
    finally { setSaving(false); }
  };

  if (!user) return null;
  const avatar = user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  return <div className="space-y-6 pb-12 max-w-2xl mx-auto">
    <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5">
      <div className="flex items-center gap-4 w-full">
        <div className="relative shrink-0">
          <img src={avatar} alt="Foto de perfil" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoSaving} className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full border-2 border-slate-900 shadow-lg disabled:opacity-60" title="Cambiar foto de perfil" aria-label="Cambiar foto de perfil">
            {photoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><h1 className="text-xl font-bold truncate">{user.first_name} {user.last_name}</h1>{user.is_verified && <span className="text-emerald-400 font-bold text-xs">✓ Verificado</span>}</div>
          <p className="text-xs text-slate-400 truncate">{user.email} • {user.province}</p>
          <span className="inline-block mt-1 bg-blue-900/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-800">Rol: {user.activeRole}</span>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoSaving} className="mt-2 text-xs font-bold text-blue-300 hover:text-white inline-flex items-center gap-1.5"> <Camera className="w-3.5 h-3.5" /> {photoSaving ? 'Subiendo foto…' : 'Cambiar foto de perfil'} </button>
        </div>
      </div>
      {isWorker && <button onClick={onOpenVerification} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"><ShieldCheck className="w-4 h-4" /><span>Solicitar Verificación Cédula</span></button>}
    </div>

    {photoError && <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl">{photoError}</div>}
    {msgSuccess && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><span>{msgSuccess}</span></div>}

    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Editar Datos de Perfil</h2>
      <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Apellido</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Teléfono RD</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Provincia</label><select value={province} onChange={e => {setProvince(e.target.value); const p=DOMINICAN_PROVINCES.find(x=>x.name===e.target.value); if(p)setMunicipality(p.municipalities[0]);}} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">{DOMINICAN_PROVINCES.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}</select></div></div>
      {currentProvObj && <div><label className="block text-xs font-bold text-slate-700 mb-1">Municipio</label><select value={municipality} onChange={e=>setMunicipality(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">{currentProvObj.municipalities.map(m=><option key={m} value={m}>{m}</option>)}</select></div>}
      {isWorker && <div className="pt-2 border-t border-slate-100 space-y-3"><h3 className="text-xs font-bold text-slate-400 uppercase">Perfil de Trabajo / Oficio</h3><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-700 mb-1">Especialidad / Oficio</label><input type="text" value={profession} onChange={e=>setProfession(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Hora Estimada (RD$)</label><input type="number" min="0" value={hourlyRate || ''} onChange={e=>setHourlyRate(Number(e.target.value))} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" /></div></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Biografía / Presentación técnica</label><textarea rows={3} value={bio} onChange={e=>setBio(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div></div>}
      <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50">{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button>
      <div className="pt-4 border-t border-slate-100"><button type="button" onClick={logout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl text-xs transition border border-red-200">🚪 Cerrar Sesión</button></div>
    </form>
  </div>;
};
