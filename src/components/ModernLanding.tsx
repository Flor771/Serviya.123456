import React, { useMemo, useState } from 'react';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { Service } from '../types';
import { Search, MapPin, ArrowRight, Sparkles, Wrench, Zap, Hammer, Laptop, ChevronRight } from 'lucide-react';

interface Props {
  services: Service[];
  onSelectCategory: (catId: string) => void;
  onSelectService: (service: Service) => void;
  onOpenPublish: () => void;
  onNavigateTab: (tab: string) => void;
}

const images: Record<string,string> = {
  limpieza:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
  plomeria:'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80',
  electricidad:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80',
  pintura:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80',
  construccion:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
  transporte:'https://images.unsplash.com/photo-1601584115197-04ecc0da31d8?auto=format&fit=crop&w=900&q=80',
  tecnologia:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  jardineria:'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=900&q=80',
  belleza:'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  reparaciones:'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80',
  proyectoVivienda:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80',
  proyectoElectrico:'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80',
  proyectoPintura:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80',
  quickLimpieza:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
  quickFuga:'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80',
  quickLampara:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80',
  quickHabitacion:'https://images.unsplash.com/photo-1564540583246-934409427776?auto=format&fit=crop&w=900&q=80',
  heroRapido:'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80',
  heroProyecto:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80'
};

const clean = (v:string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const iconFor = (name:string) => {
  const k = clean(name);
  if(k.includes('limp')) return <Sparkles className="w-5 h-5"/>;
  if(k.includes('electr')) return <Zap className="w-5 h-5"/>;
  if(k.includes('constr')) return <Hammer className="w-5 h-5"/>;
  if(k.includes('tecno')) return <Laptop className="w-5 h-5"/>;
  return <Wrench className="w-5 h-5"/>;
};



const FAQS = [
  ['¿Qué es SERVIYA?','Es un marketplace de servicios donde clientes pueden publicar necesidades y trabajadores o técnicos pueden postularse para realizar trabajos.'],
  ['¿Cómo publico un trabajo?','Pulsa “Publicar trabajo”, describe lo que necesitas, indica ubicación, presupuesto o precio y las condiciones del servicio.'],
  ['¿Cómo contrato a un trabajador?','Revisa las propuestas recibidas, conversa con los candidatos, acuerda las condiciones y selecciona al trabajador.'],
  ['¿Cómo funciona el pago?','El cliente registra el comprobante del depósito. Administración verifica el pago y, cuando corresponde, mantiene los fondos en Custodia SERVIYA hasta la confirmación del trabajo.'],
  ['¿Cuándo recibe el trabajador su dinero?','Después de completar el trabajo, presentar la evidencia y que el cliente confirme la finalización, Administración procesa la liberación según el estado de la operación.'],
  ['¿Qué hago si tengo un problema?','Puedes utilizar las herramientas de soporte y disputas de SERVIYA. Los registros del trabajo ayudan a revisar el caso.'],
  ['¿Puedo trabajar como técnico?','Sí. Regístrate como TRABAJADOR/TÉCNICO, completa tu perfil y busca trabajos disponibles para enviar tus propuestas.'],
  ['¿SERVIYA guarda información de mis trabajos?','SERVIYA puede conservar publicaciones, mensajes, contratos, evidencias, valoraciones y movimientos necesarios para operar y resolver reclamaciones, según su Política de Privacidad.']
];

const GUIDE = [
  ['01','Busca','Explora categorías o usa el buscador para encontrar el servicio que necesitas.'],
  ['02','Publica','Si no encuentras lo que buscas, publica tu trabajo con los detalles importantes.'],
  ['03','Conecta','Recibe propuestas, revisa perfiles y conversa antes de seleccionar.'],
  ['04','Trabaja','Acuerda las condiciones y realiza el servicio siguiendo el flujo de SERVIYA.'],
  ['05','Confirma','Revisa la evidencia y confirma cuando el trabajo esté terminado.'],
  ['06','Cierra','Se procesa la liberación correspondiente y puedes valorar la experiencia.']
];

export const ModernLanding:React.FC<Props> = ({services,onSelectCategory,onSelectService,onOpenPublish,onNavigateTab}) => {
  const [q,setQ] = useState('');
  const [province,setProvince] = useState('');
  const categories = SERVICE_CATEGORIES.slice(0,10);
  const featured = services.slice(0,6);
  const imageFor = (name:string) => images[clean(name)] || images.reparaciones;
  const filtered = useMemo(()=>services.filter(s=>{
    const text = `${s.title} ${s.description||''} ${s.category_name||''}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && (!province || s.province===province);
  }).slice(0,6),[services,q,province]);

  const quick = [
    ['Limpieza del hogar','quickLimpieza','RD$1,500'],
    ['Reparar una fuga','quickFuga','RD$1,500'],
    ['Instalar una lámpara','quickLampara','RD$1,000'],
    ['Pintar una habitación','quickHabitacion','Desde RD$3,000']
  ];
  const projects = [
    ['Remodelación de vivienda','proyectoVivienda','Desde RD$250,000'],
    ['Instalación eléctrica completa','proyectoElectrico','Cotización'],
    ['Proyecto de pintura','proyectoPintura','Cotización']
  ];

  return <div className="space-y-7 pb-8">
    <section className="rounded-[28px] overflow-hidden bg-slate-950 text-white shadow-xl">
      <div className="grid lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-6 sm:p-9 lg:p-11">
          <p className="text-[11px] font-black tracking-[.22em] text-blue-300 uppercase">SERVIYA</p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-black leading-tight">¿Qué servicio necesitas?</h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl">Encuentra trabajadores y técnicos para cualquier necesidad, desde una tarea pequeña hasta un proyecto completo.</p>
          <div className="mt-6 flex items-center gap-2 bg-white rounded-2xl p-2">
            <Search className="ml-2 w-5 h-5 text-slate-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onNavigateTab('buscar')} className="flex-1 min-w-0 px-1 py-3 outline-none text-sm text-slate-900" placeholder="Buscar plomero, limpieza, electricidad..."/>
            <button onClick={()=>onNavigateTab('buscar')} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black">Buscar</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={()=>onNavigateTab('buscar')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black">Buscar trabajador</button>
            <button onClick={onOpenPublish} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black border border-white/10">Publicar trabajo</button>
          </div>
        </div>
        <div className="hidden sm:grid grid-cols-2 gap-3 p-5">
          <div className="relative overflow-hidden rounded-3xl min-h-[250px]"><img src={images.heroRapido} className="absolute inset-0 h-full w-full object-cover" alt="Profesional trabajando"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/><b className="absolute bottom-4 left-4">Soluciones rápidas</b></div>
          <div className="relative overflow-hidden rounded-3xl min-h-[250px] mt-8"><img src={images.heroProyecto} className="absolute inset-0 h-full w-full object-cover" alt="Proyecto de construcción"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/><b className="absolute bottom-4 left-4">Grandes proyectos</b></div>
        </div>
      </div>
    </section>

    <section>
      <div className="flex items-end justify-between mb-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Categorías</p><h2 className="text-2xl font-black">Explora servicios</h2></div><button onClick={()=>onNavigateTab('buscar')} className="text-xs font-black text-blue-600">Ver todos <ArrowRight className="inline w-3 h-3"/></button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map(cat=><button key={cat.id} onClick={()=>onSelectCategory(cat.id)} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow-sm hover:shadow-md hover:border-blue-300">
          <div className="relative h-28"><img src={imageFor(cat.name)} className="w-full h-full object-cover group-hover:scale-105 transition" alt={cat.name}/><div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent"/><span className="absolute bottom-2 left-2 text-white">{iconFor(cat.name)}</span></div>
          <div className="p-3"><h3 className="font-black text-sm">{cat.name}</h3><p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{cat.description}</p></div>
        </button>)}
      </div>
    </section>

    <section>
      <div className="flex items-end justify-between mb-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Para hoy</p><h2 className="text-2xl font-black">Trabajos simples</h2></div><button onClick={()=>onNavigateTab('buscar')} className="text-xs font-black text-blue-600">Ver más →</button></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quick.map(([title,cat,price])=><button key={title} onClick={()=>onNavigateTab('buscar')} className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow-sm hover:shadow-md"><img src={images[cat]} className="h-28 w-full object-cover" alt={title}/><div className="p-3"><p className="text-[10px] font-bold text-blue-600 uppercase">{cat}</p><h3 className="font-black text-sm mt-1">{title}</h3><p className="mt-2 text-xs font-black text-blue-600">{price}</p></div></button>)}
      </div>
    </section>

    <section className="rounded-3xl bg-slate-900 p-5 sm:p-7 text-white">
      <div className="flex items-end justify-between mb-4"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Más alcance</p><h2 className="text-2xl font-black">Grandes proyectos</h2></div><button onClick={onOpenPublish} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black">Publicar proyecto</button></div>
      <div className="grid md:grid-cols-3 gap-3">{projects.map(([title,cat,price])=><button key={title} onClick={onOpenPublish} className="relative h-48 overflow-hidden rounded-2xl text-left"><img src={images[cat]} className="absolute inset-0 w-full h-full object-cover" alt={title}/><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent"/><div className="absolute bottom-0 p-4"><h3 className="font-black text-lg">{title}</h3><p className="text-xs text-blue-300 font-black mt-1">{price}</p></div></button>)}</div>
    </section>

    <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Cerca de ti</p><h2 className="text-xl font-black">Busca por servicio y provincia</h2></div><span className="text-xs text-slate-400">República Dominicana</span></div>
      <div className="mt-4 grid sm:grid-cols-12 gap-2">
        <div className="sm:col-span-6 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3"><Search className="w-4 h-4 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" placeholder="¿Qué necesitas?"/></div>
        <div className="sm:col-span-4 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3"><MapPin className="w-4 h-4 text-slate-400"/><select value={province} onChange={e=>setProvince(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm"><option value="">Todas las provincias</option>{DOMINICAN_PROVINCES.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
        <button onClick={()=>onNavigateTab('buscar')} className="sm:col-span-2 rounded-xl bg-slate-900 text-white text-sm font-black">Buscar</button>
      </div>
    </section>

    <section>
      <div className="flex items-end justify-between mb-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Oportunidades</p><h2 className="text-2xl font-black">Trabajos publicados</h2></div><button onClick={()=>onNavigateTab('buscar')} className="text-xs font-black text-blue-600">Ver todos →</button></div>
      {(q||province?filtered:featured).length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{(q||province?filtered:featured).map((s,i)=><button key={s.id} onClick={()=>onSelectService(s)} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-left hover:shadow-md"><img src={[images.limpieza,images.plomeria,images.electricidad,images.pintura,images.construccion,images.transporte][i % 6]} className="h-36 w-full object-cover" alt={s.title}/><div className="p-4"><div className="flex justify-between gap-2"><h3 className="font-black line-clamp-2">{s.title}</h3><b className="text-blue-600 text-sm whitespace-nowrap">RD$ {Number(s.price_rd||0).toLocaleString()}</b></div><p className="text-xs text-slate-500 mt-2 line-clamp-2">{s.description}</p><p className="text-[11px] text-slate-500 mt-3"><MapPin className="inline w-3.5 h-3.5 mr-1"/>{s.municipality}, {s.province}</p></div></button>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">Aquí aparecerán los trabajos publicados.</div>}
    </section>


    <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7">
      <div className="text-center max-w-2xl mx-auto"><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Mini tutorial</p><h2 className="text-2xl font-black mt-1">Cómo usar SERVIYA</h2><p className="text-sm text-slate-500 mt-2">Una guía rápida para comenzar, desde buscar un servicio hasta cerrar el trabajo.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
        {GUIDE.map(([num,title,text])=><div key={num} className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><span className="inline-flex w-8 h-8 items-center justify-center rounded-xl bg-blue-600 text-white text-xs font-black">{num}</span><h3 className="font-black mt-3">{title}</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p></div>)}
      </div>
      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <button onClick={onOpenPublish} className="rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-black">Publicar mi primer trabajo</button>
        <button onClick={()=>onNavigateTab('buscar')} className="rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-black">Buscar un servicio</button>
      </div>
    </section>

    <section className="rounded-3xl bg-slate-950 text-white p-5 sm:p-7">
      <div className="text-center"><p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Ayuda</p><h2 className="text-2xl font-black mt-1">Preguntas y respuestas</h2><p className="text-sm text-slate-400 mt-2">Toca una pregunta para ver la respuesta.</p></div>
      <div className="mt-5 space-y-2 max-w-3xl mx-auto">
        {FAQS.map(([question,answer])=><details key={question} className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden"><summary className="cursor-pointer list-none px-4 py-4 font-bold text-sm flex items-center justify-between gap-3">{question}<span className="text-blue-300 text-lg group-open:rotate-45 transition">+</span></summary><p className="px-4 pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed">{answer}</p></details>)}
      </div>
    </section>

    <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Legal</p><h2 className="text-xl font-black">Políticas de SERVIYA</h2><p className="text-sm text-slate-500 mt-1">Consulta los términos de uso y la política de privacidad.</p></div><button onClick={()=>window.dispatchEvent(new CustomEvent('serviya:open-policies'))} className="rounded-xl bg-blue-600 text-white px-4 py-3 text-xs font-black">Ver políticas</button></div>
    </section>

    <section className="grid sm:grid-cols-3 gap-3">
      {[['Seguro y transparente','Custodia SERVIYA protege el flujo del pago durante el servicio.'],['Trabajadores verificados','La plataforma puede mostrar verificaciones de identidad y certificaciones.'],['Todo queda registrado','Mensajes, evidencias, estados y valoraciones acompañan cada servicio.']].map(([title,text])=><div key={title} className="rounded-2xl bg-white border border-slate-200 p-5"><div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><ChevronRight className="w-5 h-5"/></div><h3 className="font-black mt-3">{title}</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p></div>)}
    </section>

    <div className="text-center pt-2"><p className="font-black">SERVIYA</p><p className="text-xs text-slate-500 mt-1">Trabajo • Confianza • Oportunidades</p></div>
  </div>;
};
