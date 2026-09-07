import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Check, X, ShieldCheck } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  return (
    <>
      {/* Prominent Header / Top Banner button */}
      <div className="flex items-center gap-2">
        {isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-blue-700 hover:from-red-700 hover:to-blue-800 text-white font-semibold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-md transition-all transform active:scale-95"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>📲 INSTALAR SERVIYA</span>
          </button>
        )}

        {!isInstallable && (
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-slate-100 font-medium text-xs px-3 py-1.5 rounded-xl border border-slate-700 shadow-sm transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>¿Cómo instalar?</span>
          </button>
        )}
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-red-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Instala SERVIYA.do 🇩🇴</h3>
                <p className="text-xs text-slate-500">Accede como aplicación en tu celular sin descargar en tienda</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-900 block mb-1">🤖 En Android (Google Chrome):</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Toca el botón <strong>"Instalar SERVIYA"</strong> arriba si aparece.</li>
                  <li>O toca los 3 puntos superiores <strong>(⋮)</strong> de tu navegador.</li>
                  <li>Selecciona <strong>"Instalar aplicación"</strong> o "Agregar a pantalla principal".</li>
                </ol>
              </div>

              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <span className="font-bold text-red-900 block mb-1">🍎 En iPhone / iPad (Safari):</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Abre <strong>SERVIYA.do</strong> en el navegador Safari.</li>
                  <li>Toca el botón <strong>Compartir ( Compartir )</strong> en la barra inferior.</li>
                  <li>Desplázate hacia abajo y elige <strong>"Agregar al inicio"</strong>.</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-xs font-medium">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>La PWA funciona como app nativa, es más liviana y guarda tus servicios en RD.</span>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
