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
  const [loading, setLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');

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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
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

    </div>
  );
};
