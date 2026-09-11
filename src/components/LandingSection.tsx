import React, { useState } from 'react';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { Service, User } from '../types';
import {
  ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, ChevronDown, ChevronUp,
  Hammer, HeartHandshake, Laptop, LockKeyhole, MapPin, Search, ShieldCheck,
  Sparkles, Star, Wrench, Zap
} from 'lucide-react';

interface LandingSectionProps {
  services: Service[];
  workers: User[];
  onSelectCategory: (catId: string) => void;
  onSelectService: (service: Service) => void;
  onOpenPublish: () => void;
  onNavigateTab: (tab: string) => void;
}

export const LandingSection: React.FC<LandingSectionProps> = ({
  services,
  workers,
  onSelectCategory,
  onSelectService,
  onOpenPublish,
  onNavigateTab
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const categoryIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      Sparkles: <Sparkles className="w-5 h-5" />,
      Wrench: <Wrench className="w-5 h-5" />,
      Zap: <Zap className="w-5 h-5" />,
      Hammer: <Hammer className="w-5 h-5" />,
      Laptop: <Laptop className="w-5 h-5" />
    };
    return icons[name] ?? <Wrench className="w-5 h-5" />;
  };

  const faqs = [
    ['¿Qué puedo encontrar en SERVIYA?', 'Desde mandados, limpieza y pequeñas reparaciones hasta trabajos técnicos, remodelaciones, construcción y proyectos completos.'],
    ['¿Cómo se protege el pago?', 'Cuando corresponde, el cliente paga mediante el flujo de Custodia SERVIYA. Los fondos permanecen protegidos hasta que se complete el proceso de liberación.'],
    ['¿SERVIYA sirve para trabajos pequeños?', 'Sí. La plataforma está pensada para cubrir desde el trabajo más pequeño hasta el trabajo más grande, sin limitar el tamaño del servicio.'],
    ['¿Cómo empiezo?', 'Puedes buscar un servicio, publicar un trabajo o explorar las categorías. Después puedes acordar las condiciones con el trabajador y seguir el flujo seguro de SERVIYA.']
  ];

  return (
    <div className="space-y-10 sm:space-y-14 pb-12">
      {/* PORTADA PRINCIPAL */}
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white border border-slate-800 shadow-2xl">
        <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] sm:text-xs font-bold text-blue-200 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
              SERVIYA · Trabajo • Confianza • Oportunidades
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.03] tracking-tight">
              Desde el trabajo más pequeño hasta el{' '}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">
                trabajo más grande.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm sm:text-base lg:text-lg leading-relaxed text-slate-300">
              Un solo lugar para encontrar quién haga el trabajo que necesitas, sin importar su tamaño.
              Conecta con trabajadores y técnicos, acuerda el servicio y utiliza el sistema seguro de SERVIYA.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigateTab('buscar')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-extrabold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 active:scale-[.98]"
              >
                Necesito un trabajador <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenPublish}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-extrabold backdrop-blur transition hover:bg-white/15 active:scale-[.98]"
              >
                Quiero publicar un trabajo <BriefcaseBusiness className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Escala de trabajos */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => onNavigateTab('buscar')} className="group text-left rounded-2xl border border-white/10 bg-white/[.045] p-5 transition hover:bg-white/[.08] hover:border-blue-400/40">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center"><Wrench className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Nivel 01</span>
              </div>
              <h2 className="mt-4 text-lg font-black">Microtrabajos</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Mandados, limpieza, ayuda en el hogar, reparaciones pequeñas y tareas rápidas.</p>
            </button>

            <button onClick={() => onNavigateTab('buscar')} className="group text-left rounded-2xl border border-white/10 bg-white/[.045] p-5 transition hover:bg-white/[.08] hover:border-cyan-400/40">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center"><Hammer className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Nivel 02</span>
              </div>
              <h2 className="mt-4 text-lg font-black">Trabajos normales</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Electricidad, plomería, pintura, mecánica, instalaciones, mantenimiento y oficios técnicos.</p>
            </button>

            <button onClick={() => onNavigateTab('buscar')} className="group text-left rounded-2xl border border-white/10 bg-white/[.045] p-5 transition hover:bg-white/[.08] hover:border-emerald-400/40">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Nivel 03</span>
              </div>
              <h2 className="mt-4 text-lg font-black">Grandes proyectos</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Construcción, remodelaciones, proyectos completos y servicios profesionales o empresariales.</p>
            </button>
          </div>
        </div>
      </section>

      {/* BUSCADOR */}
      <section className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Encuentra lo que necesitas</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900">Busca un servicio en tu zona</h2>
          </div>
          <span className="text-xs text-slate-500">RD$ · República Dominicana</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ej.: plomero, pintura, limpieza..." className="w-full bg-transparent text-sm text-slate-800 outline-none" />
          </div>
          <div className="sm:col-span-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
            <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)} className="w-full bg-transparent text-sm text-slate-800 outline-none">
              <option value="">Todas las provincias</option>
              {DOMINICAN_PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={() => onNavigateTab('buscar')} className="sm:col-span-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800">Buscar</button>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Explora</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">Servicios para cada necesidad</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Desde oficios cotidianos hasta especialidades profesionales.</p>
          </div>
          <button onClick={() => onNavigateTab('buscar')} className="hidden sm:flex items-center gap-1 text-xs font-bold text-blue-600">Ver todos <ArrowRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SERVICE_CATEGORIES.slice(0, 10).map(cat => (
            <button key={cat.id} onClick={() => onSelectCategory(cat.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{categoryIcon(cat.icon)}</div>
              <h3 className="mt-3 text-sm font-black text-slate-900">{cat.name}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{cat.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ASÍ FUNCIONA */}
      <section className="rounded-3xl bg-slate-950 p-6 sm:p-9 text-white shadow-xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-300">Simple y claro</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black">Así funciona SERVIYA</h2>
          <p className="mt-2 text-sm text-slate-400">Un flujo pensado para que cliente y trabajador sepan qué ocurre en cada etapa.</p>
        </div>
        <div className="mt-7 grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            ['01','Publica','Describe lo que necesitas.'],
            ['02','Encuentra','Recibe y revisa propuestas.'],
            ['03','Acuerda','Define precio y condiciones.'],
            ['04','Custodia','El pago entra al flujo seguro.'],
            ['05','Completa','El trabajador realiza el servicio.'],
            ['06','Libera','Se aprueba y se paga al trabajador.']
          ].map(([num,title,text]) => (
            <div key={num} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <span className="text-[10px] font-black text-blue-300">{num}</span>
              <h3 className="mt-2 text-sm font-black">{title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONFIANZA */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldCheck className="w-6 h-6 text-blue-600" /><h3 className="mt-3 font-black text-slate-900">Trabajadores verificados</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">La plataforma puede validar identidad y certificaciones para mostrar el distintivo de trabajador verificado.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><LockKeyhole className="w-6 h-6 text-emerald-600" /><h3 className="mt-3 font-black text-slate-900">Pago en Custodia</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">El flujo de custodia protege los fondos mientras el servicio se realiza y hasta la liberación correspondiente.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><HeartHandshake className="w-6 h-6 text-amber-500" /><h3 className="mt-3 font-black text-slate-900">Confianza y seguimiento</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Mensajes, evidencias, disputas y garantía ayudan a mantener el servicio documentado de principio a fin.</p></div>
      </section>

      {/* TRABAJOS RECIENTES */}
      {services.length > 0 && (
        <section className="space-y-5">
          <div><p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Oportunidades</p><h2 className="mt-1 text-2xl font-black text-slate-900">Trabajos publicados recientemente</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.slice(0, 3).map(s => (
              <button key={s.id} onClick={() => onSelectService(s)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{s.category_name}</span><span className="font-black text-emerald-600">RD$ {s.price_rd.toLocaleString()}</span></div>
                <h3 className="mt-3 line-clamp-2 font-black text-slate-900">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.description}</p>
                <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><MapPin className="w-3.5 h-3.5" />{s.municipality}, {s.province}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /><h2 className="text-xl sm:text-2xl font-black text-slate-900">Preguntas frecuentes</h2></div>
        <div className="mt-5 space-y-2">
          {faqs.map(([q,a], index) => {
            const open = openFaq === index;
            return <div key={q} className="overflow-hidden rounded-xl border border-slate-200">
              <button onClick={() => setOpenFaq(open ? null : index)} className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-bold text-slate-900"><span>{q}</span>{open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}</button>
              {open && <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">{a}</div>}
            </div>;
          })}
        </div>
      </section>

      <div className="text-center pt-2">
        <p className="text-sm font-black text-slate-900">SERVIYA</p>
        <p className="mt-1 text-xs text-slate-500">Trabajo • Confianza • Oportunidades</p>
        <p className="mt-2 text-[11px] text-slate-400">Desde el trabajo más pequeño hasta el trabajo más grande.</p>
      </div>
    </div>
  );
};
