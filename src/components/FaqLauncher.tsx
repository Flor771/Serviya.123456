import React, { useEffect, useState } from 'react';
import { ArrowRight, HelpCircle } from 'lucide-react';

const FAQ_TITLE = 'Preguntas frecuentes y mini tutorial';
const FAQ_SELECTOR = '[data-serviya-faq-legacy="true"]';

export const FaqLauncher: React.FC = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('section'));
    const section = sections.find(node => node.querySelector('h2')?.textContent?.includes(FAQ_TITLE)) as HTMLElement | undefined;
    if (!section) return;

    section.dataset.serviyaFaqLegacy = 'true';
    setAvailable(true);

    const close = () => {
      section.classList.remove('serviya-faq-open');
      document.body.classList.remove('serviya-faq-lock');
      document.getElementById('serviya-faq-close')?.remove();
    };

    const open = () => {
      section.classList.add('serviya-faq-open');
      document.body.classList.add('serviya-faq-lock');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (!document.getElementById('serviya-faq-close')) {
        const button = document.createElement('button');
        button.id = 'serviya-faq-close';
        button.type = 'button';
        button.setAttribute('aria-label', 'Volver al inicio');
        button.innerHTML = '<span>Volver al inicio</span>';
        button.className = 'fixed right-4 top-4 z-[120] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800 shadow-xl';
        button.addEventListener('click', close);
        document.body.appendChild(button);
      }
    };

    const onOpen = () => open();
    window.addEventListener('serviya:open-faq', onOpen as EventListener);
    return () => {
      window.removeEventListener('serviya:open-faq', onOpen as EventListener);
      close();
    };
  }, []);

  if (!available) return null;

  return (
    <>
      <style>{`
        body.serviya-faq-lock { overflow: hidden; }
        ${FAQ_SELECTOR} { display: none !important; }
        ${FAQ_SELECTOR}.serviya-faq-open {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 110 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
          overflow-y: auto !important;
          margin: 0 !important;
          padding: 5.5rem 1rem 2rem !important;
          border-radius: 0 !important;
          background: #f8fafc !important;
          border: 0 !important;
          box-shadow: none !important;
        }
        @media (min-width: 640px) {
          ${FAQ_SELECTOR}.serviya-faq-open { padding: 5.5rem 2rem 3rem !important; }
        }
      `}</style>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('serviya:open-faq'))}
        className="group w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Ayuda de SERVIYA</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">Preguntas frecuentes</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">Todas las respuestas, organizadas por tema, en una pantalla dedicada.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-blue-600 transition-transform group-hover:translate-x-1" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Cliente</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Trabajador</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Pagos y Custodia</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Garantías y disputas</span>
        </div>
      </button>
    </>
  );
};

export default FaqLauncher;
