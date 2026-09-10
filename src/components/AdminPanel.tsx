import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Briefcase, ShieldCheck, Check, X, Sliders, Building2, MessageSquare, Eye } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState({ total_users: 1240, active_workers: 450, total_services: 890, escrow_held_rd: 145000, commission_earned_rd: 38400, pending_verifications: 3, open_disputes: 1, pending_withdrawals: 2 });
  const [commissionRate, setCommissionRate] = useState<number>(8.0);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');
  const [newBank, setNewBank] = useState('Banco Popular');
  const [newNumber, setNewNumber] = useState('');
  const [newType, setNewType] = useState('CORRIENTE');
  const [newHolder, setNewHolder] = useState('SERVIYA DOMINICANA SRL');
  const [newRnc, setNewRnc] = useState('');
  const [newPrimary, setNewPrimary] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true); setMsgError('');
    try {
      const data = await api.get<any>('/admin/stats');
      if (data) { setStats(data.stats || stats); setCommissionRate(data.commission_rate || 8.0); setVerifications(data.verifications || []); setWithdrawals(data.withdrawals || []); setDisputes(data.disputes || []); }
      const accData = await api.get<any>('/admin/bank-accounts');
      if (accData?.bank_accounts) setBankAccounts(accData.bank_accounts);
      const depositData = await api.get<any>('/admin-panel/escrows/pending-deposits');
      setPendingDeposits(depositData?.pending_deposits || []);
    } catch (err: any) { console.error('Error fetching admin data:', err); setMsgError(err?.message || 'No se pudieron cargar los datos administrativos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAdminData(); }, []);

  const approveDeposit = async (serviceId: string) => {
    setMsgError('');
    try { await api.post(`/admin-panel/escrows/${serviceId}/approve-deposit`, { notes: 'Depósito verificado por Administración.' }); setMsgSuccess('Depósito verificado. El servicio ahora está en Custodia y aparece en Mis trabajos.'); await fetchAdminData(); }
    catch (err: any) { setMsgError(err?.message || 'No se pudo confirmar el depósito.'); }
  };
  const rejectDeposit = async (serviceId: string) => {
    setMsgError('');
    try { await api.post(`/admin-panel/escrows/${serviceId}/reject-deposit`, { notes: 'Voucher o depósito no verificado.' }); setMsgSuccess('Depósito rechazado. El servicio no fue activado.'); await fetchAdminData(); }
    catch (err: any) { setMsgError(err?.message || 'No se pudo rechazar el depósito.'); }
  };
  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newBank || !newNumber) return;
    try { await api.post('/admin/bank-accounts', { bank_name:newBank, account_number:newNumber, account_type:newType, account_holder:newHolder, rnc_cedula:newRnc, is_active:true, is_primary:newPrimary }); setMsgSuccess('Cuenta bancaria agregada exitosamente.'); setNewNumber(''); fetchAdminData(); }
    catch (err: any) { setMsgError(err?.message || 'Error agregando cuenta.'); }
  };
  const handleToggleActiveBank = async (acc:any) => { try { await api.put(`/admin/bank-accounts/${acc.id}`, { is_active: !acc.is_active }); setMsgSuccess(`Cuenta ${acc.bank_name} actualizada.`); fetchAdminData(); } catch (e:any) { setMsgError(e?.message || 'Error actualizando cuenta.'); } };
  const handleSetPrimaryBank = async (acc:any) => { try { await api.put(`/admin/bank-accounts/${acc.id}`, { is_primary:true }); setMsgSuccess(`Cuenta ${acc.bank_name} establecida como principal.`); fetchAdminData(); } catch (e:any) { setMsgError(e?.message || 'Error actualizando cuenta.'); } };
  const handleDeleteBank = async (id:number) => { try { await api.delete(`/admin/bank-accounts/${id}`); setMsgSuccess('Cuenta bancaria eliminada.'); fetchAdminData(); } catch (e:any) { setMsgError(e?.message || 'Error eliminando cuenta.'); } };
  const handleUpdateCommission = async () => { try { await api.put('/admin/settings', { commission_percent:commissionRate }); setMsgSuccess(`Comisión de la plataforma ajustada a ${commissionRate}%`); } catch (e:any) { setMsgError(e?.message || 'Error actualizando comisión.'); } };
  const handleApproveDoc = async (docId:string,status:string) => { try { await api.patch(`/admin/verifications/${docId}`, { status }); setMsgSuccess(`Documento marcado como ${status}`); fetchAdminData(); } catch (e:any) { setMsgError(e?.message || 'Error procesando documento.'); } };
  const handleApproveWithdrawal = async (withdrawId:string,status:string) => { try { await api.patch(`/admin/withdrawals/${withdrawId}`, { status }); setMsgSuccess(`Retiro bancario marcado como ${status}`); fetchAdminData(); } catch (e:any) { setMsgError(e?.message || 'Error procesando retiro.'); } };
  const handleResolveDispute = async (disputeId:string,resolution:string) => { try { await api.post(`/admin/disputes/${disputeId}/resolve`, { resolution }); setMsgSuccess('Disputa resuelta.'); fetchAdminData(); } catch (e:any) { setMsgError(e?.message || 'Error resolviendo disputa.'); } };

  return <div className="space-y-8 pb-12 max-w-6xl mx-auto">
    <div className="bg-red-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-red-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div><div className="inline-flex items-center gap-1.5 bg-red-900/80 text-red-200 text-xs font-bold px-3 py-1 rounded-full mb-2"><Briefcase className="w-3.5 h-3.5 text-red-400"/><span>Panel de Control Administrativo</span></div><h1 className="text-2xl sm:text-3xl font-black">Consola Central SERVIYA</h1><p className="text-xs sm:text-sm text-red-200">Verificación de depósitos, Custodia, comisiones, retiros, disputas y documentos.</p></div>
      <button onClick={fetchAdminData} disabled={loading} className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md">🔄 Actualizar</button>
    </div>
    {msgSuccess && <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200">✓ {msgSuccess}</div>}
    {msgError && <div className="p-3.5 bg-red-50 text-red-800 text-xs font-semibold rounded-2xl border border-red-200">⚠ {msgError}</div>}

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400 uppercase">Usuarios</span><p className="text-xl sm:text-2xl font-black">{stats.total_users}</p><span className="text-[10px] text-slate-500">{stats.active_workers} trabajadores</span></div>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400 uppercase">Custodia RD$</span><p className="text-xl sm:text-2xl font-black text-amber-600">RD$ {stats.escrow_held_rd.toLocaleString()}</p><span className="text-[10px] text-slate-500">Fondos confirmados</span></div>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400 uppercase">Comisiones RD$</span><p className="text-xl sm:text-2xl font-black text-emerald-600">RD$ {stats.commission_earned_rd.toLocaleString()}</p><span className="text-[10px] text-slate-500">{commissionRate}%</span></div>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400 uppercase">Depósitos por verificar</span><p className="text-xl sm:text-2xl font-black text-orange-600">{pendingDeposits.length}</p><span className="text-[10px] text-slate-500">Revisión obligatoria</span></div>
    </div>

    <section className="bg-white p-6 rounded-3xl border-2 border-orange-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-orange-600"/><div><h2 className="text-base font-black text-slate-900">Depósitos pendientes de verificación ({pendingDeposits.length})</h2><p className="text-xs text-slate-500">El voucher debe revisarse y el dinero debe estar confirmado en la cuenta oficial antes de ponerlo en Custodia.</p></div></div>
      {pendingDeposits.length===0 ? <p className="text-xs text-slate-400 text-center py-8">No hay depósitos esperando verificación.</p> : <div className="space-y-4">{pendingDeposits.map(d=><div key={d.id} className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 space-y-4"><div className="flex flex-col sm:flex-row justify-between gap-3"><div><p className="font-black text-slate-900">{d.title}</p><p className="text-xs text-slate-600 mt-1">Monto reportado: <b>RD$ {Number(d.total_amount_rd).toLocaleString()}</b></p><p className="text-xs text-slate-500">{d.bank_name || 'Cuenta SERVIYA'} • {d.account_number || '—'} • {d.account_type || '—'}</p><p className="text-[10px] text-slate-400 mt-1">Referencia de servicio: {d.service_id}</p></div><span className="self-start bg-orange-100 text-orange-800 text-[10px] font-black px-3 py-1 rounded-full">PENDIENTE DE VERIFICAR</span></div><div className="bg-white rounded-2xl border border-slate-200 p-3"><p className="text-[10px] font-black uppercase text-slate-500 mb-2">Voucher del cliente</p>{d.voucher_url ? <img src={d.voucher_url} alt="Voucher de depósito" className="w-full max-h-80 object-contain rounded-xl bg-slate-100"/> : <p className="text-xs text-red-600 font-bold">No hay voucher. No aprobar.</p>}</div><div className="flex flex-col sm:flex-row gap-2"><button onClick={()=>approveDeposit(d.service_id)} disabled={!d.voucher_url || loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2"><Check className="w-4 h-4"/> Confirmé que el dinero llegó — Poner en Custodia</button><button onClick={()=>rejectDeposit(d.service_id)} disabled={loading} className="sm:w-40 bg-red-50 hover:bg-red-100 text-red-700 font-black py-3 rounded-xl text-xs border border-red-200 flex items-center justify-center gap-2"><X className="w-4 h-4"/> Rechazar</button></div></div>)}</div>}
    </section>

    <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><div className="flex items-center gap-2"><Sliders className="w-5 h-5 text-blue-600"/><h2 className="text-base font-bold">Configuración de Tasa de Comisión</h2><button onClick={handleUpdateCommission} className="ml-auto bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl">Guardar Tasa</button></div><div className="flex items-center justify-between text-xs"><span>Tasa actual: <strong>{commissionRate}%</strong></span><input type="range" min={1} max={15} step={0.5} value={commissionRate} onChange={e=>setCommissionRate(Number(e.target.value))} className="w-64 accent-blue-600"/></div></section>

    <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600"/><h2 className="text-base font-bold">Aprobación de Documentos / Cédulas ({verifications.length})</h2></div>{verifications.length===0?<p className="text-xs text-slate-400 text-center py-6">No hay documentos pendientes.</p>:<div className="space-y-3">{verifications.map(doc=><div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between gap-3 text-xs"><div><b className="text-sm block">{doc.user_name}</b><span className="text-slate-500">{doc.document_type}: {doc.document_number}</span></div><div className="flex gap-2"><button onClick={()=>handleApproveDoc(doc.id,'APROBADO')} className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl"><Check className="inline w-3.5 h-3.5"/> Aprobar</button><button onClick={()=>handleApproveDoc(doc.id,'RECHAZADO')} className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl border border-red-200"><X className="inline w-3.5 h-3.5"/> Rechazar</button></div></div>)}</div>}</section>

    <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600"/><h2 className="text-base font-bold">Solicitudes de Retiro Bancario ({withdrawals.length})</h2></div>{withdrawals.length===0?<p className="text-xs text-slate-400 text-center py-6">No hay retiros pendientes.</p>:<div className="space-y-3">{withdrawals.map(w=><div key={w.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between gap-3 text-xs"><div><b className="text-sm">RD$ {w.amount_rd.toLocaleString()}</b><p className="text-slate-600">{w.bank_name} ({w.account_type} {w.account_number})</p></div><button onClick={()=>handleApproveWithdrawal(w.id,'COMPLETADO')} className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl">✓ Aprobar</button></div>)}</div>}</section>

    <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"><div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600"/><h2 className="text-base font-bold">Cuentas Bancarias Oficiales de SERVIYA</h2></div><form onSubmit={handleCreateBankAccount} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs"><h3 className="font-bold">Agregar Cuenta Bancaria SERVIYA</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><select value={newBank} onChange={e=>setNewBank(e.target.value)} className="p-2.5 bg-white border rounded-xl"><option>Banco Popular</option><option>Banreservas</option><option>Banco BHD</option><option>Banco Santa Cruz</option><option>Scotiabank RD</option></select><input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Número de cuenta" className="p-2.5 bg-white border rounded-xl" required/><select value={newType} onChange={e=>setNewType(e.target.value)} className="p-2.5 bg-white border rounded-xl"><option>CORRIENTE</option><option>AHORROS</option></select></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input value={newHolder} onChange={e=>setNewHolder(e.target.value)} placeholder="Titular" className="p-2.5 bg-white border rounded-xl"/><input value={newRnc} onChange={e=>setNewRnc(e.target.value)} placeholder="RNC o Cédula" className="p-2.5 bg-white border rounded-xl"/></div><div className="flex justify-between items-center"><label className="text-xs font-bold"><input type="checkbox" checked={newPrimary} onChange={e=>setNewPrimary(e.target.checked)} className="mr-2"/>Cuenta principal</label><button className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl">➕ Guardar</button></div></form><div className="space-y-3">{bankAccounts.map(acc=><div key={acc.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between gap-3 text-xs"><div><b>{acc.bank_name}</b> {acc.is_primary&&<span className="text-emerald-700">⭐ Principal</span>}<p>Número: <strong>{acc.account_number}</strong> • {acc.account_type}</p><p className="text-slate-500">Titular: {acc.account_holder}</p></div><div className="flex gap-2"><button onClick={()=>handleSetPrimaryBank(acc)} className="bg-slate-200 px-2 py-1 rounded-lg">Principal</button><button onClick={()=>handleToggleActiveBank(acc)} className="bg-amber-100 px-2 py-1 rounded-lg">{acc.is_active?'Desactivar':'Activar'}</button><button onClick={()=>handleDeleteBank(acc.id)} className="bg-red-50 text-red-600 px-2 py-1 rounded-lg">Eliminar</button></div></div>)}</div></section>
  </div>;
};