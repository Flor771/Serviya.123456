import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DOMINICAN_PROVINCES } from '../data/dominicanData';
import { User, ShieldCheck, CheckCircle, Edit3 } from 'lucide-react';

interface ProfileViewProps {
  onOpenVerification: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenVerification }) => {
  const { user, updateProfile, logout } = useAuth();

  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState(user?.province || DOMINICAN_PROVINCES[0].name);
  const [municipality, setMunicipality] = useState(user?.municipality || DOMINICAN_PROVINCES[0].municipalities[0]);
  const [profession, setProfession] = useState(user?.worker_profile?.profession || 'Plomero Máster');
  const [hourlyRate, setHourlyRate] = useState<number>(user?.worker_profile?.hourly_rate_rd || 800);
  const [bio, setBio] = useState(user?.worker_profile?.bio || 'Especialista certificado con más de 10 años de experiencia en República Dominicana.');

  const [saving, setSaving] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');

  const currentProvObj = DOMINICAN_PROVINCES.find(p => p.name === province);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        phone,
        province,
        municipality
      };

      if (isWorker) {
        payload.worker_profile = {
          profession,
          hourly_rate_rd: hourlyRate,
          bio,
          specialties: ['Reparaciones de emergencia', 'Instalación industrial'],
          portfolio_images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800']
        };
      }

      await updateProfile(payload);
      setMsgSuccess('¡Perfil actualizado con éxito!');
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt="Avatar"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold">{user?.first_name} {user?.last_name}</h1>
              {user?.is_verified && <span className="text-emerald-400 font-bold text-xs">✓ Verificado</span>}
            </div>
            <p className="text-xs text-slate-400">{user?.email} • {user?.province}</p>
            <span className="inline-block mt-1 bg-blue-900/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-800">
              Rol: {user?.activeRole}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenVerification}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Solicitar Verificación Cédula</span>
        </button>
      </div>

      {msgSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{msgSuccess}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Editar Datos de Perfil</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Apellido</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono RD</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Provincia</label>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                const p = DOMINICAN_PROVINCES.find(x => x.name === e.target.value);
                if (p) setMunicipality(p.municipalities[0]);
              }}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            >
              {DOMINICAN_PROVINCES.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Worker Specifics - Only rendered for TRABAJADOR */}
        {isWorker && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase text-slate-400">Perfil de Trabajo / Oficio</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Especialidad / Oficio</label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Hora Estimada (RD$)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Biografía / Presentación técnica</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={logout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl text-xs transition border border-red-200"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </form>

    </div>
  );
};
