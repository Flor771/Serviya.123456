import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Clock3, ShieldCheck, UserRound, BriefcaseBusiness, Hash, Info } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Fund = { payment_id:string; depositor_name:string; destination_worker_name:string; service_title:string; amount_dop:number; status:string; status_label:string; reference:string; date:string|null };
type FundsResponse = { total_deposited_dop:number; total_in_custody_dop:number; total_pending_dop:number; funds:Fund[] };

const money = (n:number) => `RD$ ${Number(n || 0).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export const ClientFundsCard: React.FC = () => {
  const { user } = useAuth();
  const role = String(user?.activeRole || user?.role || '').toUpperCase();
  const [data,setData] = useState<FundsResponse|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(() => {
    if (role !== 'CLIENTE') { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError('');
    api.get<FundsResponse>('/client-funds').then(v => { if (alive) setData(v); }).catch(e => { if (alive) setError(e?.message || 'No se pudieron cargar los pagos.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [role]);

  if (role !== 'CLIENTE') return null;
  if (loading) return <section className="max-w-7xl mx-auto px-3 sm:px-6 py-4"><div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 animate-pulse text-slate-400">Cargando pagos y custodias reales de SERVIYA…</div></section>;
  if (error) return <section className="max-w-7xl mx-auto px-3 sm:px-6 py-4"><div className="rounded-3xl bg-red-950/30 border border-red-800/50 p-5 text-red-200">{error}</div></section>;

  const funds = data?.funds || [];
  return <section className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
    <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950/80 to-slate-900 border-b border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs uppercase tracking-widest text-blue-300 font-bold">Pagos del cliente</p><h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{money(data?.total_deposited_dop || 0)}</h2><p className="text-xs text-slate-400 mt-1">Total de pagos registrados para acuerdos de servicios</p></div>
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-[11px] text-slate-400">En custodia</p><p className="font-black text-emerald-400">{money(data?.total_in_custody_dop || 0)}</p></div><div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-[11px] text-slate-400">Pendiente de verificación</p><p className="font-black text-amber-400">{money(data?.total_pending_dop || 0)}</p></div></div>
        <div className="mt-4 flex gap-2 rounded-2xl border border-blue-900/60 bg-blue-950/30 p-3 text-xs text-blue-200"><Info className="w-4 h-4 shrink-0 mt-0.5"/><span>Esto <b>no es una recarga de saldo</b>. Cada registro nace de un acuerdo con un trabajador. El cliente paga y sube el voucher; Administración verifica el depósito y solamente entonces pasa los fondos a Custodia.</span></div>
      </div>
      <div className="p-4 sm:p-6 space-y-3">
        {funds.length === 0 ? <div className="py-8 text-center text-slate-400"><ArrowDownToLine className="w-8 h-8 mx-auto mb-2 opacity-60" /><p className="font-semibold">Todavía no tienes pagos registrados.</p><p className="text-xs mt-1">Cuando llegues a un acuerdo y realices el pago en Custodia, aparecerá aquí con su estado.</p></div> : funds.map(f => <article key={f.payment_id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-lg font-black text-white">{money(f.amount_dop)}</p><p className="text-xs text-slate-400">{f.status_label}</p></div><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${f.status === 'RETENIDO' ? 'bg-emerald-950 text-emerald-300' : f.status === 'PENDIENTE_VERIFICACION' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{f.status_label}</span></div>
          <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs"><p className="text-slate-300"><UserRound className="inline w-3.5 h-3.5 mr-1 text-blue-400" />Depositante: <b>{f.depositor_name}</b></p><p className="text-slate-300"><UserRound className="inline w-3.5 h-3.5 mr-1 text-emerald-400" />Trabajador destino: <b>{f.destination_worker_name}</b></p><p className="text-slate-300"><BriefcaseBusiness className="inline w-3.5 h-3.5 mr-1 text-blue-400" />Servicio: <b>{f.service_title}</b></p><p className="text-slate-400"><Hash className="inline w-3.5 h-3.5 mr-1" />Referencia: <b>{f.reference}</b></p>{f.date && <p className="text-slate-400"><Clock3 className="inline w-3.5 h-3.5 mr-1" />Fecha: {new Date(f.date).toLocaleString('es-DO')}</p>}</div>
        </article>)}
      </div>
    </div>
  </section>;
};
