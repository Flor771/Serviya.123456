import React, { useState } from 'react';
import { CheckCircle, Lock, Wallet as WalletIcon, ArrowRight } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

interface Props {
  serviceId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const WalletEscrowFlowModal: React.FC<Props> = ({ serviceId, amount, onClose, onSuccess }) => {
  const { wallet, depositRD, payEscrow } = useWallet();
  const [depositAmount, setDepositAmount] = useState<number | ''>(amount);
  const [method, setMethod] = useState('Tarjeta Visa / Mastercard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currentBalance = Number(wallet?.available_rd || 0);
  const needed = Math.max(0, amount - currentBalance);

  const proceed = async () => {
    setError('');
    setBusy(true);
    try {
      if (needed > 0) {
        const value = Number(depositAmount);
        if (!value || value < needed) {
          throw new Error(`Necesitas depositar al menos RD$ ${needed.toLocaleString()} para cubrir la Custodia.`);
        }
        await depositRD(value, method, '4821');
      }
      await payEscrow(serviceId);
      setSuccess(true);
      window.setTimeout(onSuccess, 900);
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar el pago en Custodia SERVIYA.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-6">
        <button onClick={onClose} disabled={busy} className="absolute top-4 right-4 text-slate-400 text-xs font-bold disabled:opacity-40">Cerrar</button>
        <div className="flex items-center gap-3 pr-12">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700"><WalletIcon className="w-6 h-6" /></div>
          <div><p className="text-[10px] uppercase tracking-widest font-black text-emerald-700">Billetera SERVIYA</p><h2 className="text-xl font-black text-slate-900">Preparar pago en Custodia</h2></div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-900 text-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Precio acordado</p>
          <p className="text-3xl font-black mt-1">RD$ {amount.toLocaleString()}</p>
          <p className="text-xs text-slate-300 mt-2">El dinero se retendrá en Custodia SERVIYA y no se entregará al trabajador hasta el cierre autorizado.</p>
        </div>

        {error && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
        {success ? (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-start gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Pago recibido. Los fondos ya están retenidos en Custodia SERVIYA y el trabajador puede comenzar.</span>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-slate-500">Saldo disponible</span><b>RD$ {currentBalance.toLocaleString()}</b></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Falta para pagar</span><b className={needed ? 'text-amber-700' : 'text-emerald-700'}>RD$ {needed.toLocaleString()}</b></div>
            </div>

            {needed > 0 ? <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 space-y-3">
              <p className="text-xs font-black text-blue-900">Deposita en tu Billetera SERVIYA</p>
              <input type="number" min={needed} value={depositAmount} onChange={e => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-blue-200 bg-white rounded-xl p-3 text-sm font-bold" />
              <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border border-blue-200 bg-white rounded-xl p-3 text-xs">
                <option>Tarjeta Visa / Mastercard</option>
                <option>Transferencia Banco Popular</option>
                <option>Transferencia Banreservas</option>
                <option>Transferencia Banco BHD</option>
              </select>
              <p className="text-[10px] text-blue-700">Modo simulación: no se solicitan números completos de tarjeta ni CVV.</p>
            </div> : <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 font-semibold">Tu saldo disponible ya cubre el precio acordado. Solo falta enviarlo a Custodia.</div>}

            <button disabled={busy} onClick={proceed} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2">
              {busy ? 'Procesando…' : <><Lock className="w-4 h-4" /> Depositar y pagar en Custodia <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
