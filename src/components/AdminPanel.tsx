import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Briefcase, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  X, 
  Sliders, 
  Building2,
  Lock,
  ArrowUpRight
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState({
    total_users: 1240,
    active_workers: 450,
    total_services: 890,
    escrow_held_rd: 145000,
    commission_earned_rd: 38400,
    pending_verifications: 3,
    open_disputes: 1,
    pending_withdrawals: 2
  });

  const [commissionRate, setCommissionRate] = useState<number>(8.0);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');

  // Bank account form
  const [newBank, setNewBank] = useState('Banco Popular');
  const [newNumber, setNewNumber] = useState('');
  const [newType, setNewType] = useState('CORRIENTE');
  const [newHolder, setNewHolder] = useState('SERVIYA DOMINICANA SRL');
  const [newRnc, setNewRnc] = useState('1-32-45678-9');
  const [newPrimary, setNewPrimary] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/admin/stats');
      if (data) {
        setStats(data.stats || stats);
        setCommissionRate(data.commission_rate || 8.0);
        setVerifications(data.verifications || []);
        setWithdrawals(data.withdrawals || []);
        setDisputes(data.disputes || []);
      }
      const accData = await api.get<any>('/admin/bank-accounts');
      if (accData && accData.bank_accounts) {
        setBankAccounts(accData.bank_accounts);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank || !newNumber) return;
    try {
      await api.post('/admin/bank-accounts', {
        bank_name: newBank,
        account_number: newNumber,
        account_type: newType,
        account_holder: newHolder,
        rnc_cedula: newRnc,
        is_active: true,
        is_primary: newPrimary
      });
      setMsgSuccess('Cuenta bancaria agregada exitosamente.');
      setNewNumber('');
      fetchAdminData();
    } catch (err) {
      console.error('Error adding bank account:', err);
    }
  };

  const handleToggleActiveBank = async (acc: any) => {
    try {
      await api.put(`/admin/bank-accounts/${acc.id}`, {
        is_active: !acc.is_active
      });
      setMsgSuccess(`Cuenta ${acc.bank_name} actualizada.`);
      fetchAdminData();
    } catch (err) {
      console.error('Error updating bank account:', err);
    }
  };

  const handleSetPrimaryBank = async (acc: any) => {
    try {
      await api.put(`/admin/bank-accounts/${acc.id}`, {
        is_primary: true
      });
      setMsgSuccess(`Cuenta ${acc.bank_name} establecida como principal.`);
      fetchAdminData();
    } catch (err) {
      console.error('Error updating primary bank account:', err);
    }
  };

  const handleDeleteBank = async (id: number) => {
    try {
      await api.delete(`/admin/bank-accounts/${id}`);
      setMsgSuccess('Cuenta bancaria eliminada.');
      fetchAdminData();
    } catch (err) {
      console.error('Error deleting bank account:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateCommission = async () => {
    try {
      await api.put('/admin/settings', { commission_percent: commissionRate });
      setMsgSuccess(`Comisión de la plataforma ajustada a ${commissionRate}%`);
    } catch (err) {
      console.error('Error updating commission:', err);
    }
  };

  const handleApproveDoc = async (docId: string, status: string) => {
    try {
      await api.patch(`/admin/verifications/${docId}`, { status });
      setMsgSuccess(`Documento marcado como ${status}`);
      fetchAdminData();
    } catch (err) {
      console.error('Error approving doc:', err);
    }
  };

  const handleApproveWithdrawal = async (withdrawId: string, status: string) => {
    try {
      await api.patch(`/admin/withdrawals/${withdrawId}`, { status });
      setMsgSuccess(`Retiro bancario marcado como ${status}`);
      fetchAdminData();
    } catch (err) {
      console.error('Error processing withdrawal:', err);
    }
  };

  const handleResolveDispute = async (disputeId: string, resolution: string) => {
    try {
      await api.post(`/admin/disputes/${disputeId}/resolve`, { resolution });
      setMsgSuccess('Disputa resuelta.');
      fetchAdminData();
    } catch (err) {
      console.error('Error resolving dispute:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-red-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-red-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-red-900/80 text-red-200 text-xs font-bold px-3 py-1 rounded-full mb-2">
            <Briefcase className="w-3.5 h-3.5 text-red-400" />
            <span>Panel de Control Administrativo (/admin)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Consola Central SERVIYA.do 🇩🇴</h1>
          <p className="text-xs sm:text-sm text-red-200">Monitoreo de comisiones, disputas, retiros bancarios y verificaciones de Cédulas</p>
        </div>

        <button
          onClick={fetchAdminData}
          className="bg-red-800 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          🔄 Actualizar KPIs
        </button>
      </div>

      {msgSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200">
          ✓ {msgSuccess}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Usuarios Totales</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.total_users}</p>
          <span className="text-[10px] text-slate-500">{stats.active_workers} trabajadores activos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Fondos en Custodia RD$</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600">RD$ {stats.escrow_held_rd.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">Retenidos por seguridad</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Ganancia Comisión RD$</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">RD$ {stats.commission_earned_rd.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">Ingresos plataforma ({commissionRate}%)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Disputas Abiertas</span>
          <p className="text-xl sm:text-2xl font-black text-red-600">{stats.open_disputes}</p>
          <span className="text-[10px] text-slate-500">Mediación requerida</span>
        </div>

      </div>

      {/* Commission Rate Slider Settings */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Configuración de Tasa de Comisión</h2>
          </div>
          <button
            onClick={handleUpdateCommission}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition"
          >
            Guardar Tasa
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-700">
          <span>Tasa actual de comisión retenida al trabajador: <strong>{commissionRate}%</strong></span>
          <input
            type="range"
            min={1.0}
            max={15.0}
            step={0.5}
            value={commissionRate}
            onChange={(e) => setCommissionRate(Number(e.target.value))}
            className="w-64 cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Pending Verifications */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Aprobación de Documentos / Cédulas ({verifications.length})</h2>
        </div>

        {verifications.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No hay documentos de Cédula pendientes de revisión.</p>
        ) : (
          <div className="space-y-3">
            {verifications.map((doc) => (
              <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{doc.user_name}</span>
                  <span className="text-slate-500">{doc.document_type}: {doc.document_number}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveDoc(doc.id, 'APROBADO')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprobar "Verificado"</span>
                  </button>
                  <button
                    onClick={() => handleApproveDoc(doc.id, 'RECHAZADO')}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Withdrawals */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Solicitudes de Retiro Bancario en RD ({withdrawals.length})</h2>
        </div>

        {withdrawals.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No hay retiros bancarios pendientes.</p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div key={w.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-black text-slate-900 text-sm block">RD$ {w.amount_rd.toLocaleString()}</span>
                  <span className="text-slate-600">{w.bank_name} ({w.account_type} {w.account_number})</span>
                  <span className="text-slate-400 block">Titular: {w.account_holder_name} (Cédula: {w.account_holder_cedula})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveWithdrawal(w.id, 'COMPLETADO')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
                  >
                    ✓ Aprobar y Transferir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official SERVIYA Bank Accounts Management */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Cuentas Bancarias Oficiales de SERVIYA (Para Depósitos de Clientes)</h2>
          </div>
        </div>

        {/* Add Bank Account Form */}
        <form onSubmit={handleCreateBankAccount} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
          <h3 className="font-bold text-slate-800">Agregar Nueva Cuenta Bancaria SERVIYA</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Banco *</label>
              <select
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
              >
                <option value="Banco Popular">Banco Popular</option>
                <option value="Banreservas">Banreservas</option>
                <option value="Banco BHD">Banco BHD</option>
                <option value="Banco Santa Cruz">Banco Santa Cruz</option>
                <option value="Scotiabank RD">Scotiabank RD</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Número de Cuenta *</label>
              <input
                type="text"
                placeholder="Ej. 792003841"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
              >
                <option value="CORRIENTE">Corriente</option>
                <option value="AHORROS">Ahorros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Titular de la Cuenta</label>
              <input
                type="text"
                value={newHolder}
                onChange={(e) => setNewHolder(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">RNC o Cédula Titular</label>
              <input
                type="text"
                value={newRnc}
                onChange={(e) => setNewRnc(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={newPrimary}
                onChange={(e) => setNewPrimary(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Marcar como Cuenta Principal</span>
            </label>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-sm"
            >
              ➕ Guardar Cuenta
            </button>
          </div>
        </form>

        {/* Existing Accounts List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase">Cuentas Configuradas ({bankAccounts.length})</h3>
          {bankAccounts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No hay cuentas bancarias registradas en el sistema.</p>
          ) : (
            bankAccounts.map((acc) => (
              <div key={acc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{acc.bank_name}</span>
                    {acc.is_primary && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        ⭐ Principal
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.is_active ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                      {acc.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    Número: <strong className="text-slate-900">{acc.account_number}</strong> ({acc.account_type || 'Ahorros'})
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Titular: {acc.account_holder || 'SERVIYA SRL'} {acc.rnc_cedula ? `• RNC/Cédula: ${acc.rnc_cedula}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!acc.is_primary && (
                    <button
                      onClick={() => handleSetPrimaryBank(acc)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2.5 py-1.5 rounded-xl transition text-[11px]"
                    >
                      Hacer Principal
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActiveBank(acc)}
                    className={`font-bold px-2.5 py-1.5 rounded-xl transition text-[11px] ${
                      acc.is_active ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {acc.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDeleteBank(acc.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1.5 rounded-xl border border-red-200 transition text-[11px]"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
