import React, { useEffect, useState } from 'react';
import { X, FileText, ShieldCheck, CheckCircle2, Download, MapPin, CalendarDays, Clock3, UserRound, WalletCards, Scale, LockKeyhole } from 'lucide-react';
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
  integrity?: { sha256?: string; immutable?: boolean; locked_at?: string | null };
}

const money = (value: any) => `RD$ ${Number(value || 0).toLocaleString('es-DO')}`;
const dateText = (value: any) => value ? new Date(value).toLocaleDateString('es-DO') : '—';

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

  const download = () => {
    if (!selected) return;
    const payload = JSON.stringify({
      ...selected.document,
      integrity: {
        sha256: selected.integrity?.sha256 || selected.contract.content_hash,
        immutable: !!selected.integrity?.immutable,
        locked_at: selected.integrity?.locked_at || null
      }
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.contract.contract_number || 'contrato-serviya'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doc = selected?.document || {};
  const service = doc.service || {};
  const agreement = doc.agreement || {};
  const parties = doc.parties || {};
  const custody = doc.custody || {};
  const terms = Array.isArray(doc.terms) ? doc.terms : [];

  return <div className="fixed inset-0 z-[95] bg-slate-950/70 p-3 sm:p-6 overflow-y-auto">
    <div className="max-w-6xl mx-auto bg-slate-100 rounded-3xl shadow-2xl min-h-[80vh] overflow-hidden">
      <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">SERVIYA</p><h2 className="text-xl font-black">Contratos digitales</h2><p className="text-xs text-slate-300">Documento completo del servicio, acuerdo, Custodia, obligaciones y aceptación electrónica.</p></div>
        <button onClick={onClose} className="p-2 rounded-xl bg-white/10"><X className="w-5 h-5"/></button>
      </header>

      <div className="p-4 sm:p-6 grid lg:grid-cols-[300px,1fr] gap-4">
        <section className="space-y-3">
          {loading ? <div className="bg-white rounded-2xl p-6 text-sm text-slate-500">Cargando contratos…</div> : items.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center"><FileText className="w-9 h-9 mx-auto text-slate-300"/><p className="font-black mt-3 text-slate-700">No hay contratos emitidos</p><p className="text-xs text-slate-500 mt-1">Cuando Administración verifique el voucher, aparecerá aquí.</p></div> : items.map(item => <button key={item.id} onClick={() => void open(item)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FileText className="w-5 h-5"/></div><div className="min-w-0"><p className="text-[10px] font-black uppercase text-blue-600">Contrato emitido</p><h3 className="font-black break-words">{item.title}</h3><p className="text-xs text-slate-500 mt-1">{item.contract_number || 'Contrato digital'}</p><div className="flex flex-wrap gap-2 mt-2"><span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-black">{money(item.price_rd)}</span><span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black">{item.status}</span></div></div></div></button>)}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          {!selected ? <div className="min-h-[520px] flex flex-col items-center justify-center text-center text-slate-500"><ShieldCheck className="w-12 h-12 text-blue-300"/><p className="font-black text-slate-700 mt-3">Selecciona un contrato</p><p className="text-xs max-w-sm mt-1">Aquí se mostrará toda la información que debe conocer el cliente y el trabajador antes de aceptar electrónicamente.</p></div> : <div className="space-y-5">

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">CONTRATO DIGITAL DE PRESTACIÓN DE SERVICIOS</p><h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{selected.contract.contract_number}</h3><p className="text-xs text-slate-500 mt-1">Emitido: {selected.contract.generated_at ? new Date(selected.contract.generated_at).toLocaleString('es-DO') : '—'}</p></div>
              <div className="flex gap-2 flex-wrap"><span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-black">{selected.contract.status}</span><button onClick={download} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black"><Download className="w-4 h-4"/> Descargar</button></div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-blue-800"><FileText className="w-5 h-5"/><p className="font-black">Resumen del acuerdo</p></div>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <div><p className="text-[10px] uppercase font-black text-slate-500">Servicio</p><p className="font-black text-slate-900">{service.title || '—'}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-500">Presupuesto inicial</p><p className="font-black text-slate-900">{money(service.price_rd || 0)}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-500">Precio final acordado</p><p className="font-black text-emerald-700">{money(agreement.negotiated_price_rd)}</p></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Estado de negociación: <b>{agreement.negotiation_status || '—'}</b>{agreement.price_agreed_at ? ` · acordado el ${dateText(agreement.price_agreed_at)}` : ''}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center gap-2 mb-2"><UserRound className="w-4 h-4 text-blue-600"/><p className="font-black">Cliente</p></div><p className="font-bold">{parties.client?.name || '—'}</p><p className="text-xs text-slate-500">{parties.client?.email || ''}</p><p className="text-xs text-slate-500">{parties.client?.phone || ''}</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center gap-2 mb-2"><UserRound className="w-4 h-4 text-emerald-600"/><p className="font-black">Trabajador / Técnico</p></div><p className="font-bold">{parties.worker?.name || '—'}</p><p className="text-xs text-slate-500">{parties.worker?.email || ''}</p><p className="text-xs text-slate-500">{parties.worker?.phone || ''}</p></div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-blue-600"/><p className="font-black">Descripción y alcance del trabajo</p></div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{service.description || 'No se registró una descripción adicional.'}</p>
              {service.requirements?.length > 0 && <div className="mt-4"><p className="text-xs font-black uppercase text-slate-500">Requisitos / materiales / condiciones</p><ul className="mt-2 space-y-1">{service.requirements.map((x: any, i: number) => <li key={i} className="text-sm text-slate-600">• {typeof x === 'string' ? x : JSON.stringify(x)}</li>)}</ul></div>}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-2 mb-3"><CalendarDays className="w-4 h-4 text-blue-600"/><p className="font-black">Fecha y horario</p></div><p className="text-sm"><b>Fecha:</b> {service.service_date || '—'}</p><p className="text-sm mt-1"><b>Hora:</b> {service.service_time || '—'}</p>{service.estimated_duration && <p className="text-sm mt-1"><b>Duración estimada:</b> {service.estimated_duration}</p>}</div>
              <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-2 mb-3"><MapPin className="w-4 h-4 text-red-500"/><p className="font-black">Ubicación</p></div><p className="text-sm font-semibold">{service.address_approx || '—'}</p><p className="text-xs text-slate-500 mt-1">{[service.municipality, service.province].filter(Boolean).join(', ')}</p></div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2"><WalletCards className="w-5 h-5 text-emerald-700"/><p className="font-black text-emerald-900">Pago y Custodia SERVIYA</p></div>
              <div className="grid sm:grid-cols-4 gap-3 mt-3">
                <div><p className="text-[10px] uppercase font-black text-slate-500">Monto</p><p className="font-black">{money(custody.total_amount_rd)}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-500">Comisión</p><p className="font-black">{money(custody.commission_rd)}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-500">Neto trabajador</p><p className="font-black">{money(custody.worker_payout_rd)}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-500">Estado</p><p className="font-black text-emerald-700">{custody.status || '—'}</p></div>
              </div>
              <div className="mt-3 text-xs text-slate-600 space-y-1"><p><b>Método de pago:</b> {custody.payment_method || '—'}</p><p><b>Voucher verificado:</b> {custody.voucher_received ? 'Sí' : 'Pendiente'}</p><p><b>Regla de liberación:</b> el cliente confirma la finalización y Administración revisa el expediente antes de liberar los fondos.</p></div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-700"/><p className="font-black text-amber-900">Garantía SERVIYA</p></div>
              <p className="text-sm text-slate-700 mt-2">Para contratos nuevos, la garantía aplicable al servicio es de <b>15 días</b>, conforme a las condiciones de garantía vigentes de SERVIYA. Esta garantía no modifica ni reemplaza garantías adicionales que el trabajador pueda ofrecer por escrito.</p>
              <p className="text-xs text-slate-600 mt-2">La garantía cubre únicamente las condiciones expresamente aplicables al servicio contratado. Las reclamaciones se gestionan mediante el procedimiento de soporte y disputas de SERVIYA.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3"><Scale className="w-5 h-5 text-slate-600"/><p className="font-black">Condiciones y obligaciones</p></div>
              <ul className="space-y-2">{terms.map((term: string, i: number) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="font-black text-blue-600">{i+1}.</span><span>{term}</span></li>)}</ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-3"><LockKeyhole className="w-5 h-5 text-slate-700"/><p className="font-black">Trazabilidad y aceptación electrónica</p></div>
              <p className="text-xs text-slate-600 break-all"><b>Hash SHA-256 del documento:</b> {selected.integrity?.sha256 || selected.contract.content_hash || '—'}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs">
                <div><b>Aceptación cliente:</b> {selected.contract.client_accepted_at ? <span className="text-emerald-700">Registrada · {new Date(selected.contract.client_accepted_at).toLocaleString('es-DO')}</span> : <span className="text-amber-700">Pendiente</span>}</div>
                <div><b>Aceptación trabajador:</b> {selected.contract.worker_accepted_at ? <span className="text-emerald-700">Registrada · {new Date(selected.contract.worker_accepted_at).toLocaleString('es-DO')}</span> : <span className="text-amber-700">Pendiente</span>}</div>
              </div>
              {selected.integrity?.immutable && <p className="text-xs text-emerald-700 font-bold mt-3">✓ Documento bloqueado como evidencia después de la aceptación de ambas partes.</p>}
            </div>

            {doc.legal_notice && <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-500"><b>Aviso legal:</b> {doc.legal_notice}</div>}

            {selected.contract.status !== 'ACEPTADO_POR_AMBOS' && !selected.contract.locked_at && <button disabled={busy} onClick={() => void accept()} className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-black disabled:opacity-50"><CheckCircle2 className="w-5 h-5"/>{busy ? 'Registrando…' : 'Aceptar contrato electrónicamente'}</button>}
            {selected.contract.status === 'ACEPTADO_POR_AMBOS' && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-bold"><CheckCircle2 className="inline w-5 h-5 mr-2"/>Contrato aceptado por ambas partes y bloqueado como evidencia.</div>}
            {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          </div>}
        </section>
      </div>
    </div>
  </div>;
};
