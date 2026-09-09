import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DOMINICAN_PROVINCES } from '../data/dominicanData';
import { PoliciesModal } from './PoliciesModal';
import { X, UserRound, Wrench } from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'register';
  initialRole?: 'CLIENTE' | 'TRABAJADOR';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode, initialRole = 'CLIENTE', onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('809-555-0199');
  const [cedula, setCedula] = useState('001-1234567-8');
  const [province, setProvince] = useState(DOMINICAN_PROVINCES[0].name);
  const [municipality, setMunicipality] = useState(DOMINICAN_PROVINCES[0].municipalities[0]);
  const [role, setRole] = useState<'CLIENTE' | 'TRABAJADOR'>(initialRole);
  const [profession, setProfession] = useState('Técnico Electricista');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const currentProvObj = DOMINICAN_PROVINCES.find(p => p.name === province);

  const chooseRole = (next: 'CLIENTE' | 'TRABAJADOR') => { setRole(next); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      if (!password) { setError('La contraseña es obligatoria.'); return; }
      setLoading(true);
      try { await login(email, password, role); onClose(); }
      catch (err: any) { setError(err.message || 'Error en la autenticación.'); }
      finally { setLoading(false); }
    } else {
      if (!password) { setError('La contraseña es obligatoria.'); return; }
      if (!confirmPassword) { setError('Debe confirmar su contraseña.'); return; }
      if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
      if (!acceptPolicies) { setError('Debe aceptar las políticas y condiciones para registrarse.'); return; }
      setLoading(true);
      try {
        await register({ email, password, first_name: firstName, last_name: lastName, phone, cedula_passport: cedula, province, municipality, role, profession: role === 'TRABAJADOR' ? profession : undefined, accept_policies: true });
        onClose();
      } catch (err: any) { setError(err.message || 'Error en la autenticación.'); }
      finally { setLoading(false); }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-auto">
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1 font-black text-2xl text-slate-900">SERVIYA</div>
            <p className="text-xs text-slate-500 mt-1">{mode === 'login' ? 'Ingresa según el rol que usarás en SERVIYA' : 'Crea tu cuenta de cliente o trabajador en RD'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button type="button" onClick={() => chooseRole('CLIENTE')} className={`p-3 rounded-2xl border text-left transition ${role === 'CLIENTE' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-200'}`}>
              <UserRound className={`w-5 h-5 mb-1 ${role === 'CLIENTE' ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="block text-sm font-black text-slate-900">Soy Cliente</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Contratar servicios y trabajos</span>
            </button>
            <button type="button" onClick={() => chooseRole('TRABAJADOR')} className={`p-3 rounded-2xl border text-left transition ${role === 'TRABAJADOR' ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
              <Wrench className={`w-5 h-5 mb-1 ${role === 'TRABAJADOR' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="block text-sm font-black text-slate-900">Soy Trabajador / Técnico</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Ofrecer servicios y realizar trabajos</span>
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && <>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600"><strong className="text-slate-900">Rol seleccionado:</strong> {role === 'CLIENTE' ? 'CLIENTE — contratar servicios y trabajos.' : 'TRABAJADOR / TÉCNICO — ofrecer servicios y realizar trabajos.'}</div>
              <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required /></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Apellido *</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required /></div></div>
              {role === 'TRABAJADOR' && <div><label className="block text-xs font-bold text-slate-700 mb-1">Especialidad Principal *</label><input type="text" placeholder="Ej: Plomero, Electricista, Limpieza" value={profession} onChange={e => setProfession(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required /></div>}
              <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-slate-700 mb-1">Teléfono RD</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Cédula RD</label><input type="text" value={cedula} onChange={e => setCedula(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></div></div>
              <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-slate-700 mb-1">Provincia</label><select value={province} onChange={e => { setProvince(e.target.value); const p = DOMINICAN_PROVINCES.find(x => x.name === e.target.value); if (p) setMunicipality(p.municipalities[0]); }} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl">{DOMINICAN_PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-700 mb-1">Municipio</label><select value={municipality} onChange={e => setMunicipality(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl">{currentProvObj?.municipalities.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
            </>}
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label><input type="email" placeholder="tu.correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" required /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Contraseña *</label><input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" required /></div>
            {mode === 'register' && <>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Confirmar contraseña *</label><input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl" required /></div>
              <div className="flex items-start gap-2 pt-1"><input type="checkbox" id="acceptPolicies" checked={acceptPolicies} onChange={e => setAcceptPolicies(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /><label htmlFor="acceptPolicies" className="text-xs text-slate-600 cursor-pointer select-none">Acepto las <button type="button" onClick={() => setShowPolicies(true)} className="text-blue-600 font-bold hover:underline">políticas y condiciones</button> *</label></div>
            </>}
            <button type="submit" disabled={loading} className={`w-full mt-2 text-white font-bold py-3 rounded-xl text-xs shadow-lg transition disabled:opacity-50 ${role === 'CLIENTE' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{loading ? 'Procesando...' : mode === 'login' ? (role === 'CLIENTE' ? 'Ingresar como Cliente' : 'Ingresar como Trabajador / Técnico') : (role === 'CLIENTE' ? 'Crear cuenta de Cliente' : 'Crear cuenta de Trabajador / Técnico')}</button>
          </form>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">{mode === 'login' ? <p>¿No tienes cuenta? <button onClick={() => setMode('register')} className="text-blue-600 font-bold hover:underline">Regístrate gratis</button></p> : <p>¿Ya tienes cuenta? <button onClick={() => setMode('login')} className="text-blue-600 font-bold hover:underline">Inicia sesión</button></p>}</div>
        </div>
      </div>
      {showPolicies && <PoliciesModal onClose={() => setShowPolicies(false)} />}
    </>
  );
};
