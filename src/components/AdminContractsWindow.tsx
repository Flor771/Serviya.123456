import React,{useEffect,useState} from 'react';
import {api} from '../services/api';
import {FileText,RefreshCw,X,CheckCircle2,Clock3,LockKeyhole,ShieldCheck} from 'lucide-react';

type Contract=Record<string,any>;
const money=(v:any)=>`RD$ ${Number(v||0).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(v:any)=>v?new Date(v).toLocaleString('es-DO'):'Pendiente';
const val=(v:any,fallback='No registrado')=>v??fallback;

export const AdminContractsWindow:React.FC=()=>{
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[contracts,setContracts]=useState<Contract[]>([]),[summary,setSummary]=useState<any>({}),[error,setError]=useState(''),[selected,setSelected]=useState<Contract|null>(null);
 const load=async()=>{setLoading(true);setError('');try{const data=await api.get<any>('/admin-panel/contracts');setContracts(data?.contracts||[]);setSummary(data?.summary||{});}catch(e:any){setError(e?.message||'No se pudieron cargar los contratos digitales.')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const openWindow=()=>{setOpen(true);load()};
 return <>
  <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
   <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center"><FileText className="w-5 h-5"/></div><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gestión administrativa</p><h2 className="text-lg font-black mt-1">Contratos digitales</h2><p className="text-sm text-slate-500 mt-1">Contratos generados desde Custodia, con trazabilidad y aceptación de las partes.</p></div></div>
    <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black">{summary.count??contracts.length}</span>
   </div>
   <div className="grid grid-cols-3 gap-2 mt-4"><div className="rounded-xl bg-slate-50 border p-3"><div className="text-lg font-black">{summary.count??contracts.length}</div><div className="text-[10px] text-slate-500 font-bold">Total</div></div><div className="rounded-xl bg-slate-50 border p-3"><div className="text-lg font-black">{summary.accepted_by_both??0}</div><div className="text-[10px] text-slate-500 font-bold">Aceptados ambos</div></div><div className="rounded-xl bg-slate-50 border p-3"><div className="text-lg font-black">{summary.locked??0}</div><div className="text-[10px] text-slate-500 font-bold">Bloqueados</div></div></div>
   <button onClick={openWindow} className="mt-4 w-full px-4 py-3 rounded-xl bg-slate-950 text-white font-black text-sm inline-flex items-center justify-center gap-2"><FileText className="w-4 h-4"/>Abrir Contratos Digitales</button>
  </section>

  {open&&<div className="fixed inset-0 z-50 bg-slate-950/50 p-3 sm:p-6 flex items-center justify-center" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-center justify-between gap-3"><div><h2 className="font-black text-xl">Contratos digitales</h2><p className="text-xs text-slate-500">Datos reales del backend administrativo.</p></div><div className="flex items-center gap-2"><button onClick={load} disabled={loading} className="p-2 rounded-xl border bg-white"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button><button onClick={()=>setOpen(false)} className="p-2 rounded-xl border bg-white"><X className="w-4 h-4"/></button></div></div>
    <div className="p-5 space-y-3">
     {error&&<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>}
     {loading&&!contracts.length?<div className="p-8 text-center text-sm text-slate-500">Cargando contratos…</div>:contracts.length===0?<div className="p-8 text-center text-sm text-slate-500">No hay contratos digitales registrados.</div>:contracts.map(c=><button key={String(c.id)} onClick={()=>setSelected(c)} className="w-full text-left rounded-2xl border border-slate-200 p-4 hover:border-slate-400 hover:shadow-sm transition"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{c.contract_number||`Contrato #${c.id}`}</p><p className="text-sm font-bold mt-1">{c.title||'Servicio SERVIYA'}</p></div><span className="px-2 py-1 rounded-full bg-slate-100 text-[10px] font-black">{c.status||'SIN ESTADO'}</span></div><div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-slate-600"><div>Cliente: <b>{c.client_name||'—'}</b></div><div>Trabajador: <b>{c.worker_name||'—'}</b></div><div>Monto: <b>{money(c.total_amount_rd)}</b></div><div>Neto trabajador: <b>{money(c.worker_payout_rd)}</b></div></div><div className="flex flex-wrap gap-2 mt-3 text-[10px] font-bold"><span className="inline-flex items-center gap-1">{c.client_accepted_at?<CheckCircle2 className="w-3 h-3 text-emerald-600"/>:<Clock3 className="w-3 h-3 text-amber-600"/>}Cliente {c.client_accepted_at?'aceptó':'pendiente'}</span><span className="inline-flex items-center gap-1">{c.worker_accepted_at?<CheckCircle2 className="w-3 h-3 text-emerald-600"/>:<Clock3 className="w-3 h-3 text-amber-600"/>}Trabajador {c.worker_accepted_at?'aceptó':'pendiente'}</span>{c.locked_at&&<span className="inline-flex items-center gap-1"><LockKeyhole className="w-3 h-3"/>Bloqueado</span>}</div></button>)}
    </div>
   </div>
  </div>}

  {selected&&<div className="fixed inset-0 z-[60] bg-slate-950/60 p-2 sm:p-5 flex items-center justify-center" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
   <div className="w-full max-w-4xl max-h-[96vh] overflow-y-auto rounded-xl bg-slate-100 shadow-2xl">
    <div className="p-2 sm:p-4"><article className="bg-white shadow-sm border border-slate-200 mx-auto max-w-3xl">
      <header className="px-6 sm:px-10 pt-7 pb-5 border-b-4 border-blue-700">
       <div className="flex items-center justify-between gap-5"><img src="/serviya-logo.svg" alt="SERVIYA" className="h-12 sm:h-16 w-auto"/><div className="text-right"><div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Contrato de prestación de servicios</div><div className="font-black text-sm sm:text-base mt-1">{selected.contract_number||`Contrato #${selected.id}`}</div><div className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">{selected.status||'EMITIDO'}</div></div></div>
       <p className="text-xs text-slate-500 mt-4">Trabajo • Confianza • Oportunidades</p>
      </header>

      <div className="px-6 sm:px-10 py-7 space-y-7 text-[12px] leading-relaxed text-slate-700">
       <section><h3 className="section-title">1. Identificación del contrato</h3><p>El presente contrato electrónico identifica el acuerdo de prestación de servicios gestionado a través de SERVIYA. Su número de referencia, estado y fechas permiten mantener la trazabilidad de la operación dentro de la plataforma.</p><div className="grid sm:grid-cols-2 gap-3 mt-3"><Info label="Número de contrato" value={selected.contract_number}/><Info label="Estado" value={selected.status||'EMITIDO'}/><Info label="Fecha de emisión" value={date(selected.generated_at)}/><Info label="Servicio" value={selected.title||'Servicio contratado mediante SERVIYA'}/></div></section>

       <section><h3 className="section-title">2. Partes contratantes</h3><div className="grid sm:grid-cols-2 gap-4"><Party title="CLIENTE" name={val(selected.client_name)} email={selected.client_email} phone={selected.client_phone} idNumber={selected.client_document}/><Party title="TRABAJADOR / TÉCNICO" name={val(selected.worker_name)} email={selected.worker_email} phone={selected.worker_phone} idNumber={selected.worker_document}/></div></section>

       <section><h3 className="section-title">3. Objeto y alcance del trabajo</h3><p>El trabajador se compromete a ejecutar el servicio acordado con el cliente de forma diligente, conforme a la descripción, alcance, precio, plazo y condiciones registradas en SERVIYA.</p><div className="rounded-xl border bg-slate-50 p-4 mt-3 space-y-2"><Row label="Descripción" value={val(selected.description||selected.job_description,'Según la publicación y propuesta aceptada en SERVIYA.')}/><Row label="Ubicación" value={val(selected.location||selected.service_location)}/><Row label="Inicio" value={date(selected.start_date||selected.work_start_at)}/><Row label="Entrega estimada" value={date(selected.end_date||selected.work_end_at)}/><Row label="Modalidad" value={val(selected.pricing_type,'Precio acordado')}/></div></section>

       <section><h3 className="section-title">4. Precio, comisión y custodia</h3><div className="grid grid-cols-3 gap-2"><Money label="Monto acordado" value={money(selected.total_amount_rd)}/><Money label="Comisión SERVIYA" value={money(selected.commission_amount_rd)}/><Money label="Neto trabajador" value={money(selected.worker_payout_rd)}/></div><p className="mt-3">Los fondos destinados al servicio se gestionan mediante el mecanismo de Custodia de SERVIYA según el estado de la operación. La liberación al trabajador queda sujeta al cumplimiento de las condiciones del servicio y a las reglas de la plataforma.</p></section>

       <section><h3 className="section-title">5. Obligaciones del cliente</h3><ul className="list-disc pl-5 space-y-1"><li>Proporcionar información suficiente y veraz sobre el servicio solicitado.</li><li>Facilitar el acceso, materiales o condiciones previamente acordadas cuando correspondan.</li><li>Revisar el trabajo y comunicar oportunamente cualquier observación.</li><li>Cumplir el pago acordado mediante los mecanismos disponibles en SERVIYA.</li></ul></section>

       <section><h3 className="section-title">6. Obligaciones del trabajador</h3><ul className="list-disc pl-5 space-y-1"><li>Realizar personalmente o conforme a lo permitido el trabajo contratado.</li><li>Cumplir el alcance, plazo y condiciones aceptadas.</li><li>Mantener comunicación razonable con el cliente durante la ejecución.</li><li>Informar inmediatamente cualquier circunstancia que impida cumplir el acuerdo.</li></ul></section>

       <section><h3 className="section-title">7. Cambios, cancelación e incumplimiento</h3><p>Cualquier modificación relevante del alcance, precio o plazo deberá ser acordada por las partes y quedar registrada en SERVIYA. La cancelación, reembolso o ajuste de fondos dependerá del estado de la operación, las evidencias disponibles y las políticas aplicables de la plataforma.</p></section>

       <section><h3 className="section-title">8. Disputas y protección de la operación</h3><p>Ante una controversia, cualquiera de las partes podrá utilizar los mecanismos de disputa y soporte disponibles en SERVIYA. La plataforma podrá solicitar evidencias, revisar el historial de la operación y mantener los fondos en custodia mientras se determina el resultado correspondiente.</p></section>

       <section><h3 className="section-title">9. Entrega y aceptación</h3><p>El servicio se considerará aceptado cuando el cliente confirme la recepción conforme, cuando ambas partes hayan completado la aceptación correspondiente o cuando se aplique el mecanismo de cierre definido por SERVIYA para esa operación.</p></section>

       <section><h3 className="section-title">10. Aceptación electrónica</h3><p>La aceptación realizada dentro de la cuenta autenticada de cada parte queda asociada al presente contrato y a los registros de la plataforma. Las fechas y horas registradas permiten identificar cuándo cada parte aceptó las condiciones.</p><div className="grid sm:grid-cols-2 gap-4 mt-3"><Signature title="CLIENTE" accepted={selected.client_accepted_at} dateValue={selected.client_accepted_at}/><Signature title="TRABAJADOR / TÉCNICO" accepted={selected.worker_accepted_at} dateValue={selected.worker_accepted_at}/></div></section>

       <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><div className="flex gap-3"><ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5"/><div><h3 className="font-black text-slate-900">Registro y trazabilidad SERVIYA</h3><p className="mt-1">Este documento corresponde al registro electrónico de una operación de SERVIYA. Los datos mostrados deben coincidir con los registros de la plataforma y cualquier cambio posterior debe quedar trazado en el sistema.</p></div></div></section>
       <footer className="pt-3 border-t text-[10px] text-slate-400 flex justify-between gap-3"><span>SERVIYA • Trabajo • Confianza • Oportunidades</span><span>{selected.contract_number||`Contrato #${selected.id}`}</span></footer>
      </div>
     </article></div>
    <div className="sticky bottom-0 p-3 bg-white/95 backdrop-blur border-t flex gap-2"><button onClick={()=>setSelected(null)} className="ml-auto px-5 py-3 rounded-xl bg-slate-950 text-white font-black text-sm">Cerrar contrato</button></div>
   </div>
  </div>}
 </>;
};

const Info:React.FC<{label:string,value:any}>=({label,value})=><div className="rounded-xl border bg-white p-3"><div className="text-[9px] uppercase tracking-wider font-black text-slate-400">{label}</div><div className="font-bold mt-1 break-words text-slate-800">{value||'No registrado'}</div></div>;
const Row:React.FC<{label:string,value:any}>=({label,value})=><div className="grid grid-cols-[105px_1fr] gap-2"><b className="text-slate-500">{label}</b><span>{value||'No registrado'}</span></div>;
const Money:React.FC<{label:string,value:string}>=({label,value})=><div className="rounded-xl border bg-slate-50 p-3"><div className="text-[9px] uppercase font-black text-slate-400">{label}</div><div className="font-black text-sm mt-1 text-slate-900">{value}</div></div>;
const Party:React.FC<{title:string,name:any,email?:any,phone?:any,idNumber?:any}>=({title,name,email,phone,idNumber})=><div className="rounded-xl border p-4"><div className="text-[9px] tracking-widest font-black text-blue-700">{title}</div><div className="font-black text-base mt-2">{name}</div><div className="text-slate-500 mt-2">Correo: {email||'No registrado'}</div><div className="text-slate-500">Teléfono: {phone||'No registrado'}</div><div className="text-slate-500">Documento: {idNumber||'No registrado'}</div></div>;
const Signature:React.FC<{title:string,accepted:any,dateValue:any}>=({title,accepted,dateValue})=><div className="rounded-xl border p-4 min-h-28"><div className="text-[9px] uppercase font-black text-slate-400">{title}</div><div className="mt-6 border-t pt-2 font-black flex items-center gap-2">{accepted?<><CheckCircle2 className="w-4 h-4 text-emerald-600"/>Aceptación registrada</>:<><Clock3 className="w-4 h-4 text-amber-600"/>Pendiente de aceptación</>}</div><div className="text-[10px] text-slate-500 mt-1">{accepted?date(dateValue):'—'}</div></div>;
