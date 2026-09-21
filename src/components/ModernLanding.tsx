import React, { useMemo, useState } from 'react';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { Service } from '../types';
import { Search, MapPin, ArrowRight, Sparkles, Wrench, Zap, Hammer, Laptop, Bell, MessageSquare, UserRound, BriefcaseBusiness, PlusCircle, ChevronRight, ShieldCheck } from 'lucide-react';

interface Props {
  services: Service[];
  onSelectCategory: (catId: string) => void;
  onSelectService: (service: Service) => void;
  onOpenPublish: () => void;
  onNavigateTab: (tab: string) => void;
  isWorker?: boolean;
}

const images: Record<string,string> = {
  limpieza:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=85',
  plomeria:'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1000&q=85',
  electricidad:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
  pintura:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1000&q=85',
  construccion:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=85',
  transporte:'https://images.unsplash.com/photo-1601584115197-04ecc0da31d8?auto=format&fit=crop&w=1000&q=85',
  tecnologia:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85',
  jardineria:'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1000&q=85',
  belleza:'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=85',
  reparaciones:'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=1000&q=85',
  proyectoVivienda:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85',
  proyectoWeb:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=85',
  proyectoJardineria:'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1000&q=85',
  quickLimpieza:'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1000&q=85',
  quickFuga:'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1000&q=85',
  quickLampara:'https://images.unsplash.com/photo-1558008258-3256797b43f3?auto=format&fit=crop&w=1000&q=85',
  quickHabitacion:'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1000&q=85',
  heroRapido:'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=1000&q=85',
  heroProyecto:'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1000&q=85'
};

const clean=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const iconFor=(name:string)=>{
  const k=clean(name);
  if(k.includes('limp')) return <Sparkles className="w-5 h-5"/>;
  if(k.includes('electr')) return <Zap className="w-5 h-5"/>;
  if(k.includes('constr')) return <Hammer className="w-5 h-5"/>;
  if(k.includes('tecno')) return <Laptop className="w-5 h-5"/>;
  return <Wrench className="w-5 h-5"/>;
};

const FAQS=[
 ['¿Qué es SERVIYA?','Es un marketplace de servicios donde clientes publican necesidades y trabajadores o técnicos pueden postularse para realizar trabajos.'],
 ['¿Cómo publico un trabajo?','Pulsa “Publicar un trabajo”, describe lo que necesitas, indica ubicación, presupuesto y condiciones del servicio.'],
 ['¿Cómo encuentro un trabajador?','Explora categorías, revisa trabajos y perfiles, recibe propuestas y conversa antes de seleccionar.'],
 ['¿Cómo funciona el pago?','El pago se registra y, cuando corresponde, se mantiene en Custodia SERVIYA hasta la confirmación del trabajo.'],
 ['¿Cuándo recibe el trabajador su dinero?','Después de completar el trabajo, presentar evidencia y que corresponda la liberación según el estado de la operación.'],
 ['¿Qué hago si tengo un problema?','Usa las herramientas de soporte y disputas. Los mensajes, evidencias y estados ayudan a revisar el caso.'],
 ['¿Puedo trabajar como técnico?','Sí. Regístrate como TRABAJADOR/TÉCNICO, completa tu perfil y busca oportunidades disponibles.'],
 ['¿SERVIYA guarda información de mis trabajos?','Puede conservar la información necesaria para operar la plataforma y resolver reclamaciones conforme a sus políticas.']
];

const GUIDE_CLIENT=[
 ['01','Busca','Explora categorías o usa el buscador para encontrar el servicio que necesitas.'],
 ['02','Publica','Describe el trabajo, ubicación, presupuesto y detalles importantes.'],
 ['03','Recibe propuestas','Revisa perfiles, propuestas y conversa con los candidatos.'],
 ['04','Selecciona','Acuerda las condiciones y selecciona al trabajador.'],
 ['05','Confirma','Revisa la evidencia y confirma cuando el trabajo esté terminado.'],
 ['06','Califica','Se procesa la operación y puedes valorar la experiencia.']
];
const GUIDE_WORKER=[
 ['01','Busca trabajos','Explora oportunidades disponibles y filtra por servicio o provincia.'],
 ['02','Envía tu propuesta','Explica por qué eres una buena opción y establece tu propuesta.'],
 ['03','Negocia','Conversa con el cliente y aclara precio, alcance y tiempo.'],
 ['04','Acepta','Confirma el trabajo y comienza cuando las condiciones estén listas.'],
 ['05','Entrega evidencia','Realiza el servicio y comparte fotos o comprobantes.'],
 ['06','Cobra y califica','Cuando corresponda, recibe el pago y califica al cliente.']
];

export const ModernLanding:React.FC<Props>=({services,onSelectCategory,onSelectService,onOpenPublish,onNavigateTab,isWorker=false})=>{
 const [q,setQ]=useState('');
 const [province,setProvince]=useState('');
 const categories=SERVICE_CATEGORIES.slice(0,10);
 const featured=services.slice(0,6);
 const filtered=useMemo(()=>services.filter(s=>{
   const text=`${s.title} ${s.description||''} ${s.category_name||''}`.toLowerCase();
   return (!q||text.includes(q.toLowerCase()))&&(!province||s.province===province);
 }).slice(0,6),[services,q,province]);
 const categoryImage=(name:string)=>images[clean(name)]||images.reparaciones;
 const quick=[
   ['Limpieza del hogar','quickLimpieza','RD$ 1,500'],
   ['Reparar una fuga','quickFuga','RD$ 1,500'],
   ['Instalar una lámpara','quickLampara','RD$ 1,000'],
   ['Pintar una habitación','quickHabitacion','Desde RD$ 3,000']
 ];
 const projects=[
   ['Remodelación de vivienda','proyectoVivienda','Desde RD$ 250,000'],
   ['Diseño de página web','proyectoWeb','Desde RD$ 28,000'],
   ['Proyecto de jardinería','proyectoJardineria','Cotización']
 ];
 const guide=isWorker?GUIDE_WORKER:GUIDE_CLIENT;
 const openPrimary=()=>isWorker?onNavigateTab('buscar'):onOpenPublish;

 return <div className="space-y-5 pb-8">
   <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white shadow-xl">
     <div className="grid lg:grid-cols-[1.05fr_.95fr]">
       <div className="p-5 sm:p-8 lg:p-10">
         <div className="flex items-center gap-2">
           <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-black">S</div>
           <div><p className="font-black tracking-tight text-lg">SERVIYA</p><p className="text-[9px] text-blue-200">Trabajo • Confianza • Oportunidades</p></div>
         </div>
         <h1 className="mt-6 text-3xl sm:text-5xl font-black leading-tight">{isWorker?'Encuentra trabajos y oportunidades':'Tu trabajo, en buenas manos'}</h1>
         <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-xl">{isWorker?'Encuentra trabajos publicados, envía propuestas y administra tus servicios.':'Encuentra o publica servicios de forma segura y fácil.'}</p>
         <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-lg">
           <Search className="ml-2 h-5 w-5 text-slate-400"/>
           <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onNavigateTab('buscar')} className="min-w-0 flex-1 px-1 py-3 text-sm text-slate-900 outline-none" placeholder={isWorker?'Buscar trabajos...':'¿Qué servicio necesitas?'}/>
           <button onClick={()=>onNavigateTab('buscar')} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white">Buscar</button>
         </div>
         <div className="mt-4 flex flex-wrap gap-2">
           <button onClick={openPrimary} className="inline-flex items-center gap-2 rounded-xl bg-[#FFB703] px-4 py-3 text-xs font-black text-slate-950 shadow">{isWorker?<BriefcaseBusiness className="w-4 h-4"/>:<PlusCircle className="w-4 h-4"/>}{isWorker?'Buscar trabajos':'Publicar un trabajo'}</button>
           <button onClick={()=>onNavigateTab(isWorker?'mis-servicios':'mis-trabajos')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-xs font-black text-white"><BriefcaseBusiness className="w-4 h-4"/>Mis trabajos</button>
         </div>
       </div>
       <div className="hidden sm:grid grid-cols-2 gap-3 p-4">
         <div className="relative min-h-[280px] overflow-hidden rounded-3xl"><img src={images.heroRapido} className="absolute inset-0 h-full w-full object-cover" alt="Profesional de SERVIYA"/><div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 to-transparent"/><b className="absolute bottom-4 left-4 text-sm">Servicios rápidos</b></div>
         <div className="relative mt-8 min-h-[280px] overflow-hidden rounded-3xl"><img src={images.heroProyecto} className="absolute inset-0 h-full w-full object-cover" alt="Proyecto de construcción"/><div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 to-transparent"/><b className="absolute bottom-4 left-4 text-sm">Grandes proyectos</b></div>
       </div>
     </div>
   </section>

   <section>
     <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Explora</p><h2 className="text-2xl font-black">Categorías</h2></div><button onClick={()=>onNavigateTab('buscar')} className="text-xs font-black text-blue-600">Ver todas <ArrowRight className="inline w-3 h-3"/></button></div>
     <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
       {categories.map(cat=><button key={cat.id} onClick={()=>onSelectCategory(cat.id)} className="min-w-[132px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm hover:border-blue-300">
         <div className="relative h-24"><img src={categoryImage(cat.name)} className="h-full w-full object-cover" alt={cat.name}/><div className="absolute inset-0 bg-gradient-to-t from-blue-950/75 to-transparent"/><span className="absolute bottom-2 left-2 text-white">{iconFor(cat.name)}</span></div>
         <div className="p-3"><h3 className="text-xs font-black leading-tight">{cat.name}</h3></div>
       </button>)}
     </div>
   </section>

   <section>
     <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Oportunidades</p><h2 className="text-2xl font-black">{isWorker?'Trabajos disponibles':'Trabajos destacados'}</h2></div><button onClick={()=>onNavigateTab('buscar')} className="text-xs font-black text-blue-600">Ver todos →</button></div>
     <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
       {(q||province?filtered:featured).length?(q||province?filtered:featured).map((s,i)=><button key={s.id} onClick={()=>onSelectService(s)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm hover:shadow-md">
         <div className="relative h-32"><img src={[images.limpieza,images.plomeria,images.electricidad,images.transporte,images.tecnologia,images.jardineria][i%6]} className="h-full w-full object-cover" alt={s.title}/><span className="absolute left-2 top-2 rounded-lg bg-white/95 px-2 py-1 text-[9px] font-black text-blue-700">Servicio</span></div>
         <div className="p-3"><h3 className="line-clamp-2 text-sm font-black">{s.title}</h3><p className="mt-2 text-sm font-black text-blue-700">RD$ {Number(s.negotiated_price_rd||s.price_rd||0).toLocaleString()}</p><p className="mt-1 text-[10px] text-slate-500"><MapPin className="mr-1 inline h-3 w-3"/>{s.municipality||'RD'}, {s.province||'República Dominicana'}</p></div>
       </button>):<div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">Aquí aparecerán los trabajos publicados.</div>}
     </div>
   </section>

   <section>
     <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Para hoy</p><h2 className="text-2xl font-black">Trabajos simples</h2></div><button onClick={()=>onNavigateTab('buscar')} className="text-xs font-black text-blue-600">Ver más →</button></div>
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
       {quick.map(([title,key,price])=><button key={title} onClick={()=>onNavigateTab('buscar')} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm"><img src={images[key]} className="h-28 w-full object-cover" alt={title}/><div className="p-3"><p className="text-[9px] font-black uppercase text-blue-600">Servicio</p><h3 className="mt-1 text-sm font-black">{title}</h3><p className="mt-2 text-xs font-black text-blue-700">{price}</p></div></button>)}
     </div>
   </section>

   <section className="rounded-3xl bg-blue-950 p-4 sm:p-6 text-white">
     <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Proyectos</p><h2 className="text-2xl font-black">Grandes proyectos</h2></div><button onClick={onOpenPublish} className="rounded-xl bg-[#FFB703] px-4 py-2.5 text-xs font-black text-slate-950">{isWorker?'Ver oportunidades':'Publicar proyecto'}</button></div>
     <div className="grid md:grid-cols-3 gap-3">{projects.map(([title,key,price])=><button key={title} onClick={isWorker?()=>onNavigateTab('buscar'):onOpenPublish} className="relative h-48 overflow-hidden rounded-2xl text-left"><img src={images[key]} className="absolute inset-0 h-full w-full object-cover" alt={title}/><div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-950/10 to-transparent"/><div className="absolute bottom-0 p-4"><h3 className="text-base font-black">{title}</h3><p className="mt-1 text-xs font-black text-[#FFB703]">{price}</p></div></button>)}</div>
   </section>

   <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
     <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Buscar</p><h2 className="text-xl font-black">Encuentra servicios en RD</h2></div><span className="text-xs text-slate-400">República Dominicana</span></div>
     <div className="mt-4 grid gap-2 sm:grid-cols-12">
       <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:col-span-6"><Search className="h-4 w-4 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Buscar por servicio..."/></div>
       <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:col-span-4"><MapPin className="h-4 w-4 text-slate-400"/><select value={province} onChange={e=>setProvince(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none"><option value="">Todas las provincias</option>{DOMINICAN_PROVINCES.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
       <button onClick={()=>onNavigateTab('buscar')} className="rounded-xl bg-blue-600 py-3 text-sm font-black text-white sm:col-span-2">Buscar</button>
     </div>
   </section>

   <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
     <div className="mx-auto max-w-2xl text-center"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Guía rápida</p><h2 className="mt-1 text-2xl font-black">Cómo usar SERVIYA</h2><p className="mt-2 text-sm text-slate-500">Todo el proceso, paso a paso.</p></div>
     <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">{guide.map(([num,title,text])=><div key={num} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white">{num}</span><h3 className="mt-3 font-black">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p></div>)}</div>
     <div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={openPrimary} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">{isWorker?'Buscar trabajos':'Publicar mi primer trabajo'}</button><button onClick={()=>onNavigateTab(isWorker?'postulaciones':'buscar')} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">{isWorker?'Ver mis postulaciones':'Buscar un servicio'}</button></div>
   </section>

   <section className="rounded-3xl bg-blue-950 p-5 sm:p-7 text-white">
     <div className="text-center"><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Ayuda</p><h2 className="mt-1 text-2xl font-black">Preguntas y respuestas</h2><p className="mt-2 text-sm text-blue-200">Toca una pregunta para ver la respuesta.</p></div>
     <div className="mx-auto mt-5 max-w-3xl space-y-2">{FAQS.map(([question,answer])=><details key={question} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-bold">{question}<ChevronRight className="h-4 w-4 text-blue-300 transition group-open:rotate-90"/></summary><p className="px-4 pb-4 text-xs leading-relaxed text-blue-100">{answer}</p></details>)}</div>
   </section>

   <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
     <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Seguridad</p><h2 className="text-xl font-black">Políticas de SERVIYA</h2><p className="mt-1 text-sm text-slate-500">Consulta reglas, pagos, custodia, privacidad y soporte.</p></div><button onClick={()=>window.dispatchEvent(new CustomEvent('serviya:open-policies'))} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white">Ver políticas</button></div>
     <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><ShieldCheck className="h-5 w-5"/><p className="mt-2 text-xs font-black">Custodia y pagos</p></div><div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><Bell className="h-5 w-5"/><p className="mt-2 text-xs font-black">Notificaciones</p></div><div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><MessageSquare className="h-5 w-5"/><p className="mt-2 text-xs font-black">Soporte</p></div></div>
   </section>

   <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
     <button onClick={()=>onNavigateTab('buscar')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"><Search className="h-5 w-5 text-blue-600"/><p className="mt-2 text-xs font-black">Buscar</p></button>
     <button onClick={()=>onNavigateTab(isWorker?'mis-servicios':'mis-trabajos')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"><BriefcaseBusiness className="h-5 w-5 text-blue-600"/><p className="mt-2 text-xs font-black">Mis trabajos</p></button>
     <button onClick={()=>onNavigateTab('mensajes')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"><MessageSquare className="h-5 w-5 text-blue-600"/><p className="mt-2 text-xs font-black">Mensajes</p></button>
     <button onClick={()=>onNavigateTab('perfil')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"><UserRound className="h-5 w-5 text-blue-600"/><p className="mt-2 text-xs font-black">Perfil</p></button>
   </section>
 </div>;
};
