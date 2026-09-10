import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DOMINICAN_BANKS } from '../data/dominicanData';

const ALLOWED = ['BANRESERVAS', 'BANCO POPULAR', 'BHD'];

export const WorkerBankAccountPanel: React.FC = () => {
  const { user } = useAuth();
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bank, setBank] = useState('BANCO POPULAR');
  const [type, setType] = useState('AHORROS');
  const [number, setNumber] = useState('');
  const [confirm, setConfirm] = useState('');
  const [holder, setHolder] = useState('');
  const [cedula, setCedula] = useState('');

  useEffect(() => {
    if (!isWorker) { setLoading(false); return; }
    api.get<any>('/worker/bank-account').then((data) => {
      const a = data?.bank_account;
      if (a) {
        setBank(a.bank_name || 'BANCO POPULAR');
        setType(a.account_type || 'AHORROS');
        setNumber(a.account_number || '');
        setConfirm(a.account_number || '');
        setHolder(a.account_holder_name || '');
        setCedula(a.account_holder_cedula || '');
      }
    }).catch((e:any) => setError(e?.message || 'No se pudo cargar tu cuenta bancaria.')).finally(() => setLoading(false));
  }, [isWorker]);

  if (!isWorker) return null;

  const banks = DOMINICAN_BANKS.filter((b) => ALLOWED.includes(String(b).toUpperCase()) || String(b).toUpperCase() === 'BANCO DE RESERVAS').map((b) => String(b).toUpperCase() === 'BANCO DE RESERVAS' ? 'BANRESERVAS' : String(b));
  const options = Array.from(new Set([...ALLOWED, ...banks]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!number.trim() || number.trim() !== confirm.trim()) { setError('Los números de cuenta no coinciden.'); return; }
    if (!holder.trim() || !cedula.trim()) { setError('Completa el titular y la cédula.'); return; }
    setSaving(true);
    try {
      await api.put('/worker/bank-account', { bank_name: bank, account_type: type, account_number: number.trim(), confirm_account_number: confirm.trim(), account_holder_name: holder.trim(), account_holder_cedula: cedula.trim() });
      setSuccess('Cuenta bancaria guardada. SERVIYA la utilizará para tus futuras solicitudes de retiro.');
    } catch (e:any) { setError(e?.message || 'No se pudo guardar la cuenta bancaria.'); }
    finally { setSaving(false); }
  };

  return <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
    <div className="flex items-start gap-3">
      <div className="p-3 rounded-2xl bg-blue-50 text-blue-700"><Building2 className="w-6 h-6" /></div>
      <div><h2 className="text-lg font-black text-slate-900">Cuenta bancaria para retiros</h2><p className="text-xs text-slate-500">Aquí el Trabajador/Técnico registra la cuenta donde recibirá los fondos liberados.</p></div>
    </div>
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex gap-2 text-xs text-emerald-900"><ShieldCheck className="w-4 h-4 shrink-0"/><span>La cuenta queda asociada a tu perfil y puede actualizarse antes de solicitar otro retiro.</span></div>
    {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">{error}</div>}
    {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex gap-2"><CheckCircle2 className="w-4 h-4"/>{success}</div>}
    {loading ? <p className="text-xs text-slate-500">Cargando cuenta bancaria…</p> : <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-xs font-bold text-slate-700">Banco<select value={bank} onChange={e=>setBank(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs"><option value="BANRESERVAS">Banreservas</option><option value="BANCO POPULAR">Banco Popular</option><option value="BHD">BHD</option></select></label>
      <label className="text-xs font-bold text-slate-700">Tipo de cuenta<select value={type} onChange={e=>setType(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs"><option value="AHORROS">Cuenta de Ahorros</option><option value="CORRIENTE">Cuenta Corriente</option></select></label>
      <label className="text-xs font-bold text-slate-700">Número de cuenta<input value={number} onChange={e=>setNumber(e.target.value)} required className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs" placeholder="Número de cuenta"/></label>
      <label className="text-xs font-bold text-slate-700">Confirmar número<input value={confirm} onChange={e=>setConfirm(e.target.value)} required className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs" placeholder="Repite el número"/></label>
      <label className="text-xs font-bold text-slate-700">Titular de la cuenta<input value={holder} onChange={e=>setHolder(e.target.value)} required className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs" placeholder="Nombre completo"/></label>
      <label className="text-xs font-bold text-slate-700">Cédula del titular<input value={cedula} onChange={e=>setCedula(e.target.value)} required className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs" placeholder="000-0000000-0"/></label>
      <button type="submit" disabled={saving} className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3 rounded-xl disabled:opacity-50"><Save className="w-4 h-4"/>{saving ? 'Guardando…' : 'Guardar cuenta bancaria'}</button>
    </form>}
  </div>;
};