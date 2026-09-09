import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Check, X, ShieldCheck } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  return (
    <>
      {/* Compact floating installer: does not occupy header space */}
      <div className="fixed right-3 bottom-20 sm:right-5 sm:bottom-5 z-40">
        {isInstallable ? (
          <button
            onClick={install}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-red-600 to-blue-700 text-white flex items-center justify-center shadow-xl border-2 border-white/80 active:scale-95 transition"
            title="Instalar SERVIYA"
            aria-label="Instalar SERVIYA"
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        ) : (
          <button
            onClick={() => setShowGuide(true)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xl border border-slate-700 active:scale-95 transition"
            title="Cómo instalar SERVIYA"
            aria-label="Cómo instalar SERVIYA"
          >
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" />
          </button>
        )}
      </div>

      {/* Installation guide */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
              aria-label="Cerrar guía"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-8">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-red-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">Instalar SERVIYA</h3>
                <p className="text-xs text-slate-500">Instálala en tu celular sin ocupar espacio en el encabezado.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              {isInstallable && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-900 block mb-1">Instalación rápida:</span>
                  <p className="text-slate-600">Toca el botón de descarga que aparece abajo y sigue la ventana de instalación.</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-900 block mb-1">En Android (Google Chrome):</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Toca los 3 puntos superiores (⋮) del navegador.</li>
                  <li>Selecciona “Instalar aplicación” o “Agregar a pantalla principal”.</li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="font-bold text-red-900 block mb-1">En iPhone / iPad (Safari):</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>Abre SERVIYA en Safari.</li>
                    <li>Toca el botón Compartir.</li>
                    <li>Elige “Agregar al inicio”.</li>
                  </ol>
                </div>
              )}

              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-xs font-medium">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>SERVIYA funciona como una aplicación web instalable.</span>
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
