import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WorkerBankAccountPanel } from './WorkerBankAccountPanel';
import { Wallet as WalletIcon, Lock, Clock, ArrowUpRight, CheckCircle, Building2, ShieldCheck } from 'lucide-react';

interface SavedBankAccount {
  id: number | string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder_name: string;
  account_holder_cedula: string;
  is_active: boolean;
}

export const WalletView: React.FC = () => {
  const { wallet, transactions, withdrawRD } = useWallet();
  const { user } = useAuth();
  const normalizedRole = String(user?.activeRole || user?.role || '').toUpperCase();
  const isWorker = normalizedRole === 'TRABAJADOR';
  const isClient = normalizedRole === 'CLIENTE';
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>(1000);
  const [savedAccount, setSavedAccount] = useState<SavedBankAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isWorker) {
      setSavedAccount(null);
      return;
    }
    let cancelled = false;
    setLoadingAccount(true);
    api.get<{ bank_account: SavedBankAccount | null }>('/worker/bank-account')
      .then(data => {
        if (!cancelled) setSavedAccount(data.bank_account && data.bank_account.is_active ? data.bank_account : null);
      })
      .catch(() => {
        if (!cancelled) setSavedAccount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAccount(false);
      });
    return () => { cancelled = true; };
  }, [isWorker]);

  const maskAccount = (number: string) => {
    const clean = String(number || '');
    if (clean.length <= 4) return clean;
    return `•••• ${clean.slice(-4)}`;
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!isWorker) return setError('Los retiros bancarios están reservados exclusivamente para Trabajadores.');
    if (!savedAccount) return setError('Primero debes configurar una cuenta bancaria en tu perfil.');
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return setError('Ingresa un monto válido.');
    setSubmitting(true);
    try {
      await withdrawRD({ amount_rd: Number(withdrawAmount) });
      setMessage(`Solicitud de retiro de RD$ ${Number(withdrawAmount).toLocaleString()} enviada a Administración.`);
      setShowWithdrawModal(false);
    } catch (err: any) {
      setError(err?.message || 'No se pudo procesar el retiro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isClient) return null;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">MI BILLETERA SERVIYA</h1>
        <p className="text-xs sm:text-sm text-slate-500">Gestión transparente de fondos y pagos protegidos mediante Custodia SERVIYA.</p>
      </div>

      {message && <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{message}</div>}
      {error && <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200">{error}</div>}

      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2"><WalletIcon className="w-6 h-6 text-emerald-400" /><span className="font-bold text-sm tracking-wider uppercase text-slate-300">Balance General (RD$)</span></div>
          <span className="text-xs text-blue-400 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-900 font-bold">DOP</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80"><span className="text-xs text-slate-400 font-semibold uppercase block">Disponible</span><p className="text-2xl sm:text-3xl font-black text-emerald-400">RD$ {wallet ? wallet.available_rd.toLocaleString() : '0.00'}</p><span className="text-[10px] text-slate-500 block">Fondos disponibles según las reglas de SERVIYA</span></div>
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80"><div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase"><Lock className="w-3.5 h-3.5 text-amber-400" />En Custodia</div><p className="text-2xl sm:text-3xl font-black text-amber-400">RD$ {wallet ? wallet.escrow_rd.toLocaleString() : '0.00'}</p><span className="text-[10px] text-slate-500 block">Fondos retenidos hasta completar el servicio</span></div>
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80"><div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase"><Clock className="w-3.5 h-3.5 text-blue-400" />Pendiente Retiro</div><p className="text-2xl sm:text-3xl font-black text-blue-400">RD$ {wallet ? wallet.pending_rd.toLocaleString() : '0.00'}</p><span className="text-[10px] text-slate-500 block">En proceso de transferencia bancaria</span></div>
        </div>
        <button onClick={() => setShowWithdrawModal(true)} disabled={!savedAccount || loadingAccount} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"><ArrowUpRight className="w-4 h-4" />{loadingAccount ? 'Cargando cuenta bancaria...' : savedAccount ? 'Solicitar Retiro' : 'Configura tu cuenta bancaria primero'}</button>
      </div>

      {isWorker && savedAccount && <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /><h2 className="text-base font-black text-slate-900">Cuenta para retiros</h2></div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full"><ShieldCheck className="w-3 h-3" />Configurada</span>
        </div>
        <p className="text-sm font-bold text-slate-800">{savedAccount.bank_name} • {savedAccount.account_type}</p>
        <p className="text-xs text-slate-500 mt-1">Cuenta {maskAccount(savedAccount.account_number)} • Titular: {savedAccount.account_holder_name}</p>
        <p className="text-[11px] text-slate-400 mt-2">Esta cuenta se utilizará automáticamente en tus próximas solicitudes de retiro. Puedes actualizarla desde tu configuración bancaria.</p>
      </div>}

      <WorkerBankAccountPanel />

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Historial de Movimientos Billetera</h2>
        {transactions.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">Aún no registras movimientos en tu billetera SERVIYA.</p> : <div className="space-y-2">{transactions.map(tx => <div key={tx.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"><div><span className="font-bold text-slate-900 block">{tx.description}</span><span className="text-[11px] text-slate-500">{new Date(tx.created_at).toLocaleString()} • Ref: {tx.reference}</span></div><div className="text-right"><span className="font-black text-sm block">RD$ {tx.amount_rd.toLocaleString()}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{tx.status}</span></div></div>)}</div>}
      </div>

      {showWithdrawModal && savedAccount && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"><div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl my-auto"><h3 className="text-lg font-bold text-slate-900 mb-1">Solicitar retiro</h3><p className="text-xs text-slate-500 mb-4">El retiro se enviará a tu cuenta bancaria configurada. No tendrás que volver a escribir sus datos.</p><div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200"><p className="text-[10px] font-bold uppercase text-slate-400">Cuenta de destino</p><p className="text-sm font-black text-slate-900 mt-1">{savedAccount.bank_name} • {savedAccount.account_type}</p><p className="text-xs text-slate-500 mt-1">{maskAccount(savedAccount.account_number)} • {savedAccount.account_holder_name}</p></div><form onSubmit={handleWithdraw} className="space-y-3"><input type="number" min="1" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Monto RD$" required /><div className="flex gap-2"><button type="button" onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-sm">Cancelar</button><button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50">{submitting ? 'Enviando...' : 'Confirmar retiro'}</button></div></form></div></div>}
    </div>
  );
};
