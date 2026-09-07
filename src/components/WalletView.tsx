import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { DOMINICAN_BANKS } from '../data/dominicanData';
import { 
  Wallet as WalletIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Lock, 
  Clock, 
  PlusCircle, 
  Building2, 
  X, 
  CheckCircle,
  ShieldAlert
} from 'lucide-react';

export const WalletView: React.FC = () => {
  const { wallet, transactions, loading, depositRD, withdrawRD } = useWallet();
  const { user } = useAuth();

  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit Form
  const [depositAmount, setDepositAmount] = useState<number | ''>(2500);
  const [depositMethod, setDepositMethod] = useState('Tarjeta Visa / Mastercard');
  const [cardLast4, setCardLast4] = useState('4821');
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Withdraw Form
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>(1000);
  const [bankName, setBankName] = useState(DOMINICAN_BANKS[0]);
  const [accountType, setAccountType] = useState('AHORROS');
  const [accountNumber, setAccountNumber] = useState('789123456');
  const [holderName, setHolderName] = useState('');
  const [holderCedula, setHolderCedula] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [msgError, setMsgError] = useState('');
  const [msgSuccess, setMsgSuccess] = useState('');

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError('');
    setMsgSuccess('');

    if (!depositAmount || Number(depositAmount) <= 0) {
      setMsgError('Ingresa un monto válido en RD$.');
      return;
    }

    setDepositSubmitting(true);
    try {
      await depositRD(Number(depositAmount), depositMethod, cardLast4);
      setMsgSuccess(`¡Depósito de RD$ ${Number(depositAmount).toLocaleString()} realizado con éxito!`);
      setShowDepositModal(false);
    } catch (err: any) {
      setMsgError(err.message || 'Error en el depósito.');
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError('');
    setMsgSuccess('');

    if (!isWorker) {
      setMsgError('Los retiros bancarios están reservados exclusivamente para cuentas de Trabajador.');
      return;
    }

    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      setMsgError('Ingresa un monto válido.');
      return;
    }

    if (!holderName || !holderCedula || !accountNumber) {
      setMsgError('Por favor completa todos los datos bancarios.');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      await withdrawRD({
        amount_rd: Number(withdrawAmount),
        bank_name: bankName,
        account_type: accountType,
        account_number: accountNumber,
        account_holder_name: holderName,
        account_holder_cedula: holderCedula
      });

      setMsgSuccess(`Solicitud de retiro de RD$ ${Number(withdrawAmount).toLocaleString()} enviada. En revisión por el administrador.`);
      setShowWithdrawModal(false);
    } catch (err: any) {
      setMsgError(err.message || 'Error al procesar retiro.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">MI BILLETERA SERVIYA.do 🇩🇴</h1>
          <p className="text-xs sm:text-sm text-slate-500">Gestión transparente de tus fondos y pagos protegidos en Custodia</p>
        </div>
      </div>

      {msgSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{msgSuccess}</span>
        </div>
      )}

      {/* Visual Billetera Dashboard as requested in Prompt Section 39 */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-sm tracking-wider uppercase text-slate-300">Balance General (RD$)</span>
          </div>
          <span className="text-xs text-blue-400 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-900 font-bold">Moneda Oficial: DOP</span>
        </div>

        {/* 3 Balance Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Disponible */}
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase block">Disponible</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">
              RD$ {wallet ? wallet.available_rd.toLocaleString() : '0.00'}
            </p>
            <span className="text-[10px] text-slate-500 block">Fondos libres para contratar o retirar</span>
          </div>

          {/* En custodia */}
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>En Custodia</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-400">
              RD$ {wallet ? wallet.escrow_rd.toLocaleString() : '0.00'}
            </p>
            <span className="text-[10px] text-slate-500 block">Retenido hasta completar trabajos</span>
          </div>

          {/* Pendiente / Retiro */}
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Pendiente Retiro</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-blue-400">
              RD$ {wallet ? wallet.pending_rd.toLocaleString() : '0.00'}
            </p>
            <span className="text-[10px] text-slate-500 block">En proceso de transferencia bancaria</span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Depositar Fondos</span>
          </button>

          {isWorker ? (
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Solicitar Retiro</span>
            </button>
          ) : (
            <div className="flex-1 bg-slate-800 text-slate-300 font-medium text-xs px-3 py-3 rounded-xl border border-slate-700 flex items-center justify-center text-center">
              <span>Cliente: Fondos para pago de trabajos</span>
            </div>
          )}
        </div>
      </div>

      {/* Movements & Transaction Log */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Historial de Movimientos Billetera</h2>

        {transactions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Aún no registras movimientos en tu billetera SERVIYA.do.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    tx.type === 'depósito' || tx.type === 'liberación' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tx.type === 'depósito' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{tx.description}</span>
                    <span className="text-[11px] text-slate-500">{new Date(tx.created_at).toLocaleString()} • Ref: {tx.reference}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`font-black text-sm block ${
                    tx.type === 'depósito' || tx.type === 'liberación' ? 'text-emerald-600' : 'text-slate-800'
                  }`}>
                    {tx.type === 'depósito' || tx.type === 'liberación' ? '+' : '-'} RD$ {tx.amount_rd.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Depositar Saldo en Billetera RD$</h3>
            <p className="text-xs text-slate-500 mb-4">Utiliza tus tarjetas o transferencia bancaria en República Dominicana.</p>

            {msgError && <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded-xl">{msgError}</div>}

            <form onSubmit={handleDepositSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto a Depositar (RD$) *</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="Tarjeta Visa / Mastercard">Tarjeta Visa / Mastercard</option>
                  <option value="Transferencia Banco Popular">Transferencia Banco Popular</option>
                  <option value="Transferencia Banreservas">Transferencia Banreservas</option>
                  <option value="Transferencia Banco BHD">Transferencia Banco BHD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Últimos 4 dígitos tarjeta (Simulado)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={depositSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
              >
                {depositSubmitting ? 'Procesando...' : '💰 Confirmar Depósito RD$'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-auto">
            <button onClick={() => setShowWithdrawModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Solicitar Retiro a Banco RD 🇩🇴</h3>
            <p className="text-xs text-slate-500 mb-4">Transferencia directa a tu cuenta bancaria nacional.</p>

            {msgError && <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded-xl">{msgError}</div>}

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto a Retirar (RD$) *</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Banco Dominicano *</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  {DOMINICAN_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo Cuenta</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="AHORROS">Ahorros</option>
                    <option value="CORRIENTE">Corriente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número Cuenta *</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo Titular *</label>
                <input
                  type="text"
                  placeholder="Nombre según documento bancario"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cédula Titular *</label>
                <input
                  type="text"
                  placeholder="001-0000000-0"
                  value={holderCedula}
                  onChange={(e) => setHolderCedula(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={withdrawSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
              >
                {withdrawSubmitting ? 'Enviando...' : '🏦 Enviar Solicitud de Retiro'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
