import React, { useEffect, useState } from 'react';
import { X, FileText, ShieldCheck, CheckCircle2, Clock3 } from 'lucide-react';
import { api } from '../services/api';

interface ContractSummary {
  id: string;
  service_id: string;
  title: string;
  price_rd: number;
  status: string;
  service_status: string;
  escrow_status: string;
  contract_number?: string | null;
  generated_at?: string | null;
  client_accepted_at?: string | null;
  worker_accepted_at?: string | null;
}

interface ContractDetail {
  contract: Record<string, any>;
  document: Record<string, any>;
}

export const ContractsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [selected, setSelected] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get<{ contracts: ContractSummary[] }>('/contracts');
      setItems(data.contracts || []);
    } catch (e: any) { setError(e?.message || 'No se pudieron cargar los contratos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const open = async (item: ContractSummary) => {
    setError('');
    try {
      const data = await api.get<ContractDetail>(`/contracts/${item.id}`);
      setSelected(data);
    } catch (e: any) { setError(e?.message || 'No se pudo abrir el contrato.'); }
  };

  const accept = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      await api.post(`/contracts/${selected.contract.id}/accept`, {});
      const data = await api.get<ContractDetail>(`/contracts/${selected.contract.id}`);
      setSelected(data); await load();
    } catch (e: any) { setError(e?.message || 'No se pudo registrar la aceptación.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[95] bg-slate-950/70 p-3 sm:p-6 overflow-y-auto">
    <div className="max-w-5xl mx-auto bg-slate-100 rounded-3xl shadow-2xl min-h-[80vh] overflow-hidden">
      <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">SERVIYA</p><h2 className="text-xl font-black">Contratos digitales</h2><p className="text-xs text-slate-300">Lee y acepta los contratos emitidos después de verificar la Custodia.</p></div>
        <button onClick={onClose} className="p-2 rounded-xl bg-white/10"><X className="w-5 h-5"/></button>
      </header>
      <div className="p-4 sm:p-6 grid lg:grid-cols-[330px,1fr] gap-4">
        <section className="space-y-3">
          {loading ? <div className="bg-white rounded-2xl p-6 text-sm text-slate-500">Cargando contratos…</div> : items.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center"><FileText className="w-9 h-9 mx-auto text-slate-300"/><p className="font-black mt-3 text-slate-700">No hay contratos emitidos</p><p className="text-xs text-slate-500 mt-1">Cuando Administración verifique el voucher, aparecerá aquí.</p></div> : items.map(item => <button key={item.id} onClick={() => void open(item)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FileText className="w-5 h-5"/></div><div className="min-w-0"><p className="text-[10px] font-black uppercase text-blue-600">Contrato emitido</p><h3 className="font-black break-words">{item.title}</h3><p className="text-xs text-slate-500 mt-1">{item.contract_number || 'Contrato digital'}</p><div className="flex flex-wrap gap-2 mt-2"><span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-black">RD$ {Number(item.price_rd || 0).toLocaleString()}</span><span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black">{item.status}</span></div></div></div></button>)}
        </section>
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-h-[420px]">
          {!selected ? <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center text-slate-500"><ShieldCheck className="w-12 h-12 text-blue-300"/><p className="font-black text-slate-700 mt-3">Selecciona un contrato</p><p className="text-xs max-w-sm mt-1">El contrato contiene las partes, precio, Custodia, obligaciones, trazabilidad y aceptación electrónica.</p></div> : <div className="space-y-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">CONTRATO DIGITAL SERVIYA</p><h3 className="text-2xl font-black text-slate-900">{selected.contract.contract_number}</h3><p className="text-xs text-slate-500 mt-1">Emitido: {selected.contract.generated_at ? new Date(selected.contract.generated_at).toLocaleString('es-DO') : '—'}</p></div><span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-black">{selected.contract.status}</span></div>
          <div className="grid sm:grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-500">Cliente</p><p className="font-bold">{selected.document?.parties?.client?.name || '—'}</p><p className="text-xs text-slate-500">{selected.document?.parties?.client?.email || ''}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-500">Trabajador / Técnico</p><p className="font-bold">{selected.document?.parties?.worker?.name || '—'}</p><p className="text-xs text-slate-500">{selected.document?.parties?.worker?.email || ''}</p></div></div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] font-black uppercase text-blue-700">Servicio y Custodia</p><p className="font-black mt-1">{selected.document?.service?.title || 'Servicio'}</p><p className="text-sm text-slate-700 mt-1">RD$ {Number(selected.document?.custody?.total_amount_rd || 0).toLocaleString()} · Custodia {selected.document?.custody?.status || '—'}</p><p className="text-xs text-slate-500 mt-1">Comisión: RD$ {Number(selected.document?.custody?.commission_rd || 0).toLocaleString()} · Neto trabajador: RD$ {Number(selected.document?.custody?.worker_payout_rd || 0).toLocaleString()}</p></div>
          <div><p className="font-black text-slate-900 mb-2">Condiciones</p><ul className="space-y-2">{(selected.document?.terms || []).map((term: string, i: number) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="font-black text-blue-600">{i+1}.</span><span>{term}</span></li>)}</ul></div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3"><span className="font-black">Aceptación cliente:</span> {selected.contract.client_accepted_at ? <span className="text-emerald-700">Registrada</span> : <span className="text-amber-700">Pendiente</span>}</div><div className="rounded-xl bg-slate-50 p-3"><span className="font-black">Aceptación trabajador:</span> {selected.contract.worker_accepted_at ? <span className="text-emerald-700">Registrada</span> : <span className="text-amber-700">Pendiente</span>}</div></div>
          {selected.contract.status !== 'ACEPTADO_POR_AMBOS' && !selected.contract.locked_at && <button disabled={busy} onClick={() => void accept()} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-black disabled:opacity-50"><CheckCircle2 className="w-5 h-5"/>{busy ? 'Registrando…' : 'Aceptar contrato digital'}</button>}
          {selected.contract.status === 'ACEPTADO_POR_AMBOS' && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-bold"><CheckCircle2 className="inline w-5 h-5 mr-2"/>Contrato aceptado por ambas partes y bloqueado como evidencia.</div>}
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          </div>}
        </section>
      </div>
    </div>
  </div>;
};
