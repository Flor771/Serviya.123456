import React, { useEffect, useState } from 'react';
import { CheckCircle, Lock, Upload, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface Props { serviceId: string; amount: number; onClose: () => void; onSuccess: () => void; }

export const WalletEscrowFlowModal: React.FC<Props> = ({ serviceId, amount, onClose, onSuccess }) => {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankAccountId, setBankAccountId] = useState<number | ''>('');
  const [voucher, setVoucher] = useState('');
  const [voucherName, setVoucherName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get<any>('/wallet/bank-accounts').then(data => {
      const accounts = data?.bank_accounts || [];
      setBankAccounts(accounts);
      const primary = accounts.find((a: any) => a.is_primary) || accounts[0];
      if (primary) setBankAccountId(primary.id);
    }).catch(() => setBankAccounts([]));
  }, []);

  const readVoucher = (file: File) => {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('El voucher debe ser una foto JPG, PNG o WebP.'); return; }
    if (file.size > 650 * 1024) { setError('La foto del voucher no puede superar 650 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setVoucher(String(reader.result || ''));
    reader.readAsDataURL(file);
    setVoucherName(file.name);
  };

  const submitVoucher = async () => {
    setError('');
    if (!bankAccountId) { setError('Selecciona la cuenta oficial de SERVIYA donde realizaste el depósito.'); return; }
    if (!voucher) { setError('Es obligatorio subir la foto del voucher antes de solicitar la Custodia.'); return; }
    setBusy(true);
    try {
      await api.post('/payments/escrow-bank-transfer', { service_id: serviceId, bank_account_id: Number(bankAccountId), voucher_url: voucher });
      setSubmitted(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'No se pudo registrar el voucher.');
    } finally { setBusy(false); }
  };

  if (submitted) return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-6">
        <div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-amber-50 text-amber-700"><ShieldCheck className="w-6 h-6" /></div><div><p className="text-[10px] uppercase tracking-widest font-black text-amber-700">VERIFICACIÓN PENDIENTE</p><h2 className="text-xl font-black text-slate-900">Voucher recibido</h2></div></div>
        <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 font-semibold">Tu comprobante fue enviado a Administración. <b>El dinero todavía NO está en Custodia</b> hasta que Administración confirme que el depósito llegó a la cuenta oficial de SERVIYA.</div>
        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">Monto reportado</span><b>RD$ {amount.toLocaleString()}</b></div><div className="flex justify-between"><span className="text-slate-500">Voucher</span><b className="truncate max-w-[180px]">{voucherName}</b></div><div className="flex justify-between"><span className="text-slate-500">Estado</span><b className="text-amber-700">Pendiente de verificación</b></div></div>
        <p className="mt-4 text-[11px] text-slate-500">No podrás iniciar el trabajo ni aparecerá en “Mis trabajos” hasta la confirmación administrativa.</p>
        <button onClick={onClose} className="mt-5 w-full bg-slate-900 text-white font-black py-3.5 rounded-xl text-xs">Cerrar</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-6">
        <button onClick={onClose} disabled={busy} className="absolute top-4 right-4 text-slate-400 text-xs font-bold disabled:opacity-40">Cerrar</button>
        <div className="flex items-center gap-3 pr-12"><div className="p-3 rounded-2xl bg-blue-50 text-blue-700"><Upload className="w-6 h-6" /></div><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-700">PAGO EN CUSTODIA</p><h2 className="text-xl font-black text-slate-900">Comprobar depósito</h2></div></div>
        <div className="mt-5 rounded-2xl bg-slate-900 text-white p-4"><p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Precio acordado</p><p className="text-3xl font-black mt-1">RD$ {amount.toLocaleString()}</p><p className="text-xs text-slate-300 mt-2">Primero realizas el depósito a una cuenta oficial de SERVIYA y subes el voucher. Administración verifica la llegada del dinero antes de ponerlo en Custodia.</p></div>
        {error && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <div className="mt-5 space-y-4">
          <div><label className="block text-xs font-black text-slate-700 mb-1">Cuenta oficial SERVIYA *</label><select value={bankAccountId} onChange={e => setBankAccountId(e.target.value ? Number(e.target.value) : '')} className="w-full border border-slate-200 bg-white rounded-xl p-3 text-xs">{bankAccounts.length ? bankAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} • {a.account_number} • {a.account_type}</option>) : <option value="">No hay cuentas oficiales configuradas</option>}</select></div>
          <div><label className="block text-xs font-black text-slate-700 mb-1">Foto del voucher *</label><label className="w-full min-h-28 border-2 border-dashed border-blue-200 bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer"><Upload className="w-6 h-6 text-blue-600 mb-2"/><span className="text-xs font-black text-blue-900">Subir foto del comprobante</span><span className="text-[10px] text-blue-700 mt-1">JPG, PNG o WebP · máximo 650 KB</span><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) readVoucher(f); }} /></label>{voucherName && <p className="mt-2 text-[10px] text-emerald-700 font-bold">✓ {voucherName}</p>}</div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900"><b>Importante:</b> subir el voucher <u>no significa que el dinero ya esté en Custodia</u>. Administración debe comprobar primero que el depósito llegó.</div>
          <button disabled={busy || !bankAccountId || !voucher} onClick={submitVoucher} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2"><Lock className="w-4 h-4" />{busy ? 'Enviando comprobante…' : 'Enviar voucher para verificación'}</button>
        </div>
      </div>
    </div>
  );
};