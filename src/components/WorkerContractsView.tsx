import React, { useEffect, useState } from 'react';
import { FileCheck2, Fingerprint, X, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface DigitalContract {
  id: string; service_id: string; contract_number: string | null; status: string;
  content_hash: string | null; generated_at: string | null;
  client_accepted_at: string | null; worker_accepted_at: string | null;
  escrow_status: string;
}

export const WorkerContractsView: React.FC = () => {
  const [contracts, setContracts] = useState<DigitalContract[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const r = await api.get<{ contracts: DigitalContract[] }>('/contracts');
      setContracts(r.contracts || []);
    } catch {
      setContracts([]);
    }
  };

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const open = async (id: string) => {
    try {
      setMessage('');
      const r = await api.get<any>(`/contracts/${id}`);
      setSelected(r);
    } catch (e: any) {
      setMessage(e?.message || 'No se pudo abrir el contrato.');
    }
  };

  const accept = async () => {
    if (!selected?.contract?.id) return;
    setAccepting(true); setMessage('');
    try {
      const r = await api.post<any>(`/contracts/${selected.contract.id}/accept`, {});
      setMessage(`Firma electrónica registrada. Huella de aceptación: ${r.acceptance_hash}`);
      await refresh();
      setSelected(await api.get<any>(`/contracts/${selected.contract.id}`));
    } catch (e: any) {
      setMessage(e?.message || 'No se pudo registrar la firma.');
    } finally { setAccepting(false); }
  };

  if (loading) return <div className="bg-white rounded-2xl border p-6 text-sm text-slate-500">Cargando contratos…</div>;

  return <section className="space-y-4">
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <p className="text-emerald-700 text-xs font-black uppercase tracking-widest">SERVIYA • TRABAJADOR / TÉCNICO</p>
      <h2 className="text-2xl font-black text-slate-900 mt-1">Contratos digitales</h2>
      <p className="text-sm text-slate-500 mt-1">Aquí recibes los contratos de tus servicios con fondos ya verificados y retenidos en Custodia.</p>
    </div>
    {message && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-3 text-xs font-semibold break-all">{message}</div>}
    {!contracts.length && <div className="bg-white rounded-2xl border p-8 text-center text-sm text-slate-500">Todavía no tienes contratos emitidos.</div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {contracts.map(c => <article key={c.service_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><FileCheck2 className="w-5 h-5"/></div><div className="min-w-0 flex-1"><p className="text-[10px] text-slate-400 font-black uppercase">Contrato digital</p><h3 className="font-black text-slate-900 mt-1 break-all">{c.contract_number || 'Contrato emitido'}</h3><p className="text-xs text-slate-500 mt-1">Estado: <span className="font-bold text-slate-700">{c.status}</span></p></div></div>
        <div className="grid grid-cols-2 gap-2 mt-4 text-xs"><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400 font-bold">Tu firma</p><p className="font-black mt-1">{c.worker_accepted_at ? '✓ Aceptado' : 'Pendiente'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400 font-bold">Cliente</p><p className="font-black mt-1">{c.client_accepted_at ? '✓ Aceptado' : 'Pendiente'}</p></div></div>
        <button onClick={() => open(c.id)} className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black"><FileCheck2 className="w-4 h-4"/> Ver contrato y firmar</button>
      </article>)}
    </div>
    {selected && <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"><div className="min-h-full flex items-center justify-center"><div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl my-6 overflow-hidden"><div className="bg-slate-900 text-white p-6 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-emerald-400"><FileCheck2 className="w-5 h-5"/><span className="text-xs font-black tracking-widest">SERVIYA · CONTRATO DIGITAL</span></div><h2 className="text-xl sm:text-2xl font-black mt-2 break-all">{selected.contract.contract_number}</h2></div><button onClick={() => setSelected(null)} className="p-2 rounded-xl bg-white/10"><X className="w-5 h-5"/></button></div><div className="p-6 space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"><div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] uppercase text-slate-400 font-bold">Estado</span><p className="font-black mt-1">{selected.contract.status}</p></div><div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] uppercase text-slate-400 font-bold">Cliente</span><p className="font-black mt-1">{selected.contract.client_accepted_at ? '✓ Firmó' : 'Pendiente'}</p></div><div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] uppercase text-slate-400 font-bold">Trabajador</span><p className="font-black mt-1">{selected.contract.worker_accepted_at ? '✓ Firmó' : 'Pendiente'}</p></div></div><div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 break-all"><div className="flex items-center gap-2 text-indigo-700"><Fingerprint className="w-4 h-4"/><span className="text-[10px] font-black uppercase">Huella SHA-256</span></div><p className="text-xs font-mono mt-1">{selected.contract.content_hash}</p></div><div className="border rounded-2xl p-4 max-h-96 overflow-y-auto text-xs text-slate-700"><pre className="whitespace-pre-wrap font-sans">{JSON.stringify(selected.document,null,2)}</pre></div><div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 rounded-xl p-3">Al aceptar, SERVIYA registra tu identidad de cuenta, fecha y hora, IP, navegador y una huella criptográfica de la aceptación. Esto deja constancia electrónica del acto de aceptación; la fuerza legal frente a terceros depende de la legislación y formalidades aplicables.</div><div className="flex flex-col sm:flex-row gap-2"><button disabled={accepting || Boolean(selected.contract.worker_accepted_at)} onClick={accept} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">{selected.contract.worker_accepted_at ? <><CheckCircle2 className="inline w-4 h-4 mr-1"/> Aceptado y firmado por ti</> : accepting ? 'Registrando firma…' : 'Aceptar y firmar contrato'}</button><button onClick={() => setSelected(null)} className="py-3 px-5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black">Cerrar</button></div></div></div></div></div>}
  </section>;
};