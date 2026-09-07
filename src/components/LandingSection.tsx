import React, { useState } from 'react';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { Service, User } from '../types';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Wallet, 
  Star, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Wrench, 
  Zap, 
  Paintbrush, 
  Hammer, 
  Truck, 
  Laptop, 
  Scissors, 
  HeartHandshake, 
  Car, 
  GraduationCap, 
  Camera, 
  Lock,
  ChevronDown,
  ChevronUp
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

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-6 h-6" />;
      case 'Wrench': return <Wrench className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Paintbrush': return <Paintbrush className="w-6 h-6" />;
      case 'Hammer': return <Hammer className="w-6 h-6" />;
      case 'Truck': return <Truck className="w-6 h-6" />;
      case 'Laptop': return <Laptop className="w-6 h-6" />;
      case 'Scissors': return <Scissors className="w-6 h-6" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6" />;
      case 'Car': return <Car className="w-6 h-6" />;
      case 'GraduationCap': return <GraduationCap className="w-6 h-6" />;
      case 'Camera': return <Camera className="w-6 h-6" />;
      default: return <Wrench className="w-6 h-6" />;
    }
  };

  const faqs = [
    {
      q: '¿Cómo funciona el pago seguro en Custodia SERVIYA.do?',
      a: 'Cuando contratas un servicio, depositas los fondos en la Billetera SERVIYA.do. El dinero permanece protegido en custodia retenida y sólo se libera al trabajador cuando confirmas que el trabajo fue realizado a satisfacción.'
    },
    {
      q: '¿Cómo obtienen los trabajadores el distintivo "✓ Trabajador verificado"?',
      a: 'Cada profesional sube su documento de identidad (Cédula de Identidad y Electoral RD) y certificaciones técnicas (INFOTEP o universidades). Nuestro equipo revisa la autenticidad antes de aprobar su distintivo oficial.'
    },
    {
      q: '¿Qué comisión cobra SERVIYA.do en República Dominicana?',
      a: 'Mantenemos la comisión más competitiva del mercado (entre 5% y 8%), la cual se descuenta únicamente al momento de liberar el pago al trabajador. Publicar solicitudes para clientes es 100% gratuito.'
    },
    {
      q: '¿En cuáles provincias de RD está disponible SERVIYA.do?',
      a: 'SERVIYA.do opera en las 32 provincias del país, con mayor densidad de profesionales en el Distrito Nacional, Santo Domingo Este/Norte/Oeste, Santiago de los Caballeros, La Vega, Puerto Plata y La Altagracia (Punta Cana).'
    }
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-300 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Marketplace de Servicios #1 en República Dominicana 🇩🇴</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Encuentra expertos de confianza o <span className="bg-gradient-to-r from-blue-400 via-blue-200 to-red-400 bg-clip-text text-transparent">ofrece tus servicios</span> en RD.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Conectamos clientes con plomeros, electricistas, personal de limpieza, mecánicos y técnicos verificados. Pagos protegidos en custodia con moneda oficial <strong>RD$</strong>.
          </p>

          {/* Search Box */}
          <div className="bg-white p-2 sm:p-3 rounded-2xl shadow-xl border border-slate-200 text-slate-900 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6 flex items-center gap-2 px-3 bg-slate-50 rounded-xl py-2 border border-slate-200">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="¿Qué servicio o reparación necesitas?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-2 px-3 bg-slate-50 rounded-xl py-2 border border-slate-200">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 cursor-pointer"
              >
                <option value="">Todas las provincias RD</option>
                {DOMINICAN_PROVINCES.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                onClick={() => onNavigateTab('buscar')}
                className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-1"
              >
                <span>Buscar</span>
              </button>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('buscar')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <span>Buscar Servicios</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenPublish}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transition"
            >
              ➕ Publicar un Trabajo
            </button>
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Categorías de Servicios</h2>
            <p className="text-xs sm:text-sm text-slate-500">Explora por área de especialidad técnica o profesional en RD</p>
          </div>
          <button
            onClick={() => onNavigateTab('buscar')}
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {SERVICE_CATEGORIES.slice(0, 10).map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-sm hover:shadow-md text-left transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition transform">
                {getCategoryIcon(cat.icon)}
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition">{cat.name}</h3>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{cat.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED SERVICES */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Servicios y Trabajos Recientes</h2>
            <p className="text-xs sm:text-sm text-slate-500">Solicitudes activas esperando postulaciones en el país</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.slice(0, 3).map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectService(s)}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="bg-blue-50 text-blue-700 font-bold text-[11px] px-2.5 py-1 rounded-lg border border-blue-100">
                    {s.category_name}
                  </span>
                  <span className="text-base font-black text-emerald-600">
                    RD$ {s.price_rd.toLocaleString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2">{s.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{s.description}</p>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="truncate">{s.municipality}, {s.province}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{s.applications_count} Postulaciones</span>
                <span className="font-semibold text-blue-600 hover:underline">Ver detalles →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ESCROW / TRUST SYSTEM EXPLANATION */}
      <section className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-bold text-xs px-3 py-1 rounded-full border border-emerald-500/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Sistema de Custodia Garantizada SERVIYA</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold">¿Cómo protegemos tu dinero y tu trabajo?</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Sin adelantos sospechosos ni estafas. El dinero queda seguro en la plataforma hasta completar el servicio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 font-extrabold text-lg flex items-center justify-center mx-auto">1</div>
            <h3 className="font-bold text-sm">1. Publicas o Postulas</h3>
            <p className="text-xs text-slate-400">El cliente publica gratis y los trabajadores certificados envían su propuesta con precio RD$.</p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 font-extrabold text-lg flex items-center justify-center mx-auto">2</div>
            <h3 className="font-bold text-sm">2. Depósito en Custodia</h3>
            <p className="text-xs text-slate-400">El cliente selecciona al trabajador y deposita el valor acordado en la Billetera Custodia.</p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 font-extrabold text-lg flex items-center justify-center mx-auto">3</div>
            <h3 className="font-bold text-sm">3. Realización del Trabajo</h3>
            <p className="text-xs text-slate-400">El profesional ejecuta la obra sabiendo que los fondos ya están 100% asegurados.</p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-600/30 text-emerald-400 font-extrabold text-lg flex items-center justify-center mx-auto">4</div>
            <h3 className="font-bold text-sm">4. Confirmación y Pago</h3>
            <p className="text-xs text-slate-400">El cliente confirma la entrega y SERVIYA libera el pago directo a la billetera del trabajador.</p>
          </div>
        </div>
      </section>

      {/* TOP VERIFIED WORKERS */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Trabajadores Destacados</h2>
          <p className="text-xs sm:text-sm text-slate-500">Profesionales con cédula validada y calificaciones 5 estrellas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {workers.map((w) => (
            <div key={w.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
              <img
                src={w.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                alt={w.first_name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{w.first_name} {w.last_name}</h3>
                  {w.is_verified && (
                    <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0" title="Trabajador Verificado">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-blue-700">{w.worker_profile?.profession || 'Profesional de Servicios'}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {w.rating}
                  </span>
                  <span>•</span>
                  <span>{w.jobs_completed} trabajos realizados</span>
                </div>
                <p className="text-[11px] text-slate-500">{w.province}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Preguntas Frecuentes</h2>
          <p className="text-xs sm:text-sm text-slate-500">Todo lo que necesitas saber para empezar en SERVIYA.do</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between gap-2 hover:bg-slate-50 transition"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 pt-8 mt-12 text-slate-500 text-xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1 font-black text-slate-900 text-lg">
              SERVIYA<span className="text-red-600">.do</span> 🇩🇴
            </div>
            <p className="text-xs text-slate-500">Plataforma dominicana para conectar clientes con trabajadores profesionales.</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Para Clientes</h4>
            <ul className="space-y-1">
              <li><button onClick={() => onNavigateTab('buscar')} className="hover:underline">Buscar Servicios</button></li>
              <li><button onClick={onOpenPublish} className="hover:underline">Publicar un Trabajo</button></li>
              <li><button onClick={() => onNavigateTab('billetera')} className="hover:underline">Billetera y Depósitos</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Para Trabajadores</h4>
            <ul className="space-y-1">
              <li><button onClick={() => onNavigateTab('buscar')} className="hover:underline">Buscar Servicios</button></li>
              <li><button onClick={() => onNavigateTab('perfil')} className="hover:underline">Solicitar Verificación Cédula</button></li>
              <li><button onClick={() => onNavigateTab('billetera')} className="hover:underline">Retiros a Bancos RD</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Contacto & Soporte</h4>
            <p>Santo Domingo, República Dominicana</p>
            <p>soporte@serviya.do</p>
            <p>809-555-SERVIYA</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>© 2026 SERVIYA.do. Todos los derechos reservados. República Dominicana 🇩🇴</p>
          <p className="text-slate-400">Trabajo • Confianza • Oportunidades</p>
        </div>
      </footer>

    </div>
  );
};
