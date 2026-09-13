import React from 'react';
import { CheckCircle2, FileCheck2, LockKeyhole, WalletCards } from 'lucide-react';

const groups = [
  {
    number: '1',
    title: 'Acuerdo',
    icon: CheckCircle2,
    steps: ['Publicar', 'Postularse', 'Seleccionar', 'Negociar'],
  },
  {
    number: '2',
    title: 'Pago y protección',
    icon: LockKeyhole,
    steps: ['Depositar', 'Verificación', 'Custodia', 'Contrato digital'],
  },
  {
    number: '3',
    title: 'Trabajo',
    icon: FileCheck2,
    steps: ['Aceptación electrónica', 'Inicio oficial', 'Ejecución', 'Finalización'],
  },
  {
    number: '4',
    title: 'Cierre',
    icon: WalletCards,
    steps: ['Confirmación', 'Liberación', 'Retiro', 'Cierre y valoración'],
  },
];

export function ServiyaFlowVisual() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="serviya-flow-title">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Proceso completo</p>
        <h2 id="serviya-flow-title" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Así funciona SERVIYA
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Desde el trabajo más pequeño hasta el trabajo más grande, cada etapa queda clara y registrada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(({ number, title, icon: Icon, steps }) => (
          <article key={number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Etapa {number}</p>
                <h3 className="font-bold text-slate-900">{title}</h3>
              </div>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2">
              {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700 shadow-sm">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
        <p className="text-sm font-bold text-slate-900">Cada etapa deja constancia</p>
        <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
          Acción realizada → confirmación inmediata → estado guardado → siguiente paso indicado.
        </p>
      </div>
    </section>
  );
}

export default ServiyaFlowVisual;
