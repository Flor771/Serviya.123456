import React from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, Hammer, Sparkles } from 'lucide-react';

const EXAMPLES = [
  { level: 'MICROTRABAJO', label: 'Algo sencillo', price: 'RD$300–RD$1,500', icon: Sparkles, examples: ['Llevar un documento o hacer una diligencia cercana.', 'Limpiar una habitación, baño o cocina.', 'Armar una mesa, silla o mueble pequeño.', 'Cambiar una lámpara, toma corriente o llave sencilla.'] },
  { level: 'MICROTRABAJO', label: 'Pequeño servicio', price: 'RD$800–RD$3,000', icon: BriefcaseBusiness, examples: ['Lavar un vehículo a domicilio.', 'Podar y limpiar un patio pequeño.', 'Instalar una repisa o soporte de TV.', 'Configurar una computadora, impresora o Wi‑Fi.'] },
  { level: 'TRABAJO NORMAL', label: 'Trabajo del día a día', price: 'RD$3,000–RD$15,000', icon: Hammer, examples: ['Pintar una habitación o un espacio completo.', 'Reparar una fuga o instalar accesorios de baño.', 'Dar mantenimiento a un aire acondicionado.', 'Hacer una mudanza pequeña dentro de la ciudad.'] },
  { level: 'TRABAJO NORMAL', label: 'Servicio especializado', price: 'RD$8,000–RD$40,000', icon: BriefcaseBusiness, examples: ['Instalar cámaras de seguridad en una vivienda.', 'Reparar o renovar una instalación eléctrica.', 'Instalar inversor, paneles o equipos eléctricos.', 'Colocar cerámica, sheetrock o acabados en un área.'] },
  { level: 'TRABAJO GRANDE', label: 'Trabajo para equipo', price: 'RD$35,000–RD$150,000+', icon: Building2, examples: ['Remodelar una cocina o un baño completo.', 'Pintar una vivienda completa, interior y exterior.', 'Realizar una mudanza residencial grande.', 'Ejecutar trabajos de construcción que requieran varios técnicos.'] },
  { level: 'TRABAJO GRANDE', label: 'Proyecto de mayor alcance', price: 'RD$100,000–RD$500,000+', icon: Building2, examples: ['Remodelar varios espacios de una casa.', 'Instalar electricidad, plomería y terminaciones de una obra.', 'Preparar un local comercial para abrir al público.', 'Coordinar un proyecto con varios trabajadores y especialidades.'] },
  { level: 'PROYECTO', label: 'Proyecto completo', price: 'Desde RD$250,000', icon: Building2, examples: ['Remodelación completa de una casa o apartamento.', 'Construcción o renovación integral de un local comercial.', 'Proyecto que combine diseño, materiales, mano de obra y supervisión.', 'Obras grandes con varias etapas, equipos y profesionales.'] },
  { level: 'PROYECTO', label: 'Proyecto personalizado', price: 'Presupuesto acordado', icon: Building2, examples: ['Cualquier necesidad que no encaje en una categoría específica.', 'Proyectos por etapas con entregas y condiciones acordadas.', 'Servicios profesionales o técnicos de alto alcance.', 'Trabajos especiales negociados entre cliente y trabajador.'] },
];

export const ExamplesSection: React.FC = () => (
  <section className="space-y-4">
    <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl">
      <p className="text-blue-300 text-[11px] font-black uppercase tracking-widest">Ideas para publicar</p>
      <h2 className="text-2xl sm:text-3xl font-black mt-1">¿Qué puedes publicar en SERVIYA?</h2>
      <p className="text-slate-300 text-sm mt-2 max-w-3xl">Desde una tarea de pocos minutos hasta un proyecto completo. Estos son ejemplos ilustrativos para ayudarte a imaginar qué puedes publicar.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {EXAMPLES.map((item, index) => {
        const Icon = item.icon;
        return <article key={`${item.level}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between gap-2"><div className="rounded-xl bg-blue-50 p-2"><Icon className="w-5 h-5 text-blue-600" /></div><span className="text-[10px] font-black uppercase tracking-wide rounded-full bg-slate-100 text-slate-600 px-2 py-1">{item.level}</span></div>
          <h3 className="mt-3 font-black text-slate-900">{item.label}</h3>
          <p className="mt-1 text-sm font-black text-blue-700">{item.price}</p>
          <ul className="mt-3 space-y-2">{item.examples.map(example => <li key={example} className="text-xs leading-relaxed text-slate-600 flex gap-2"><ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />{example}</li>)}</ul>
        </article>;
      })}
    </div>
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center text-xs text-blue-900">Los montos son solamente ejemplos orientativos. En SERVIYA, el precio final se acuerda entre cliente y trabajador según alcance, ubicación, materiales, tiempo y condiciones.</div>
  </section>
);
