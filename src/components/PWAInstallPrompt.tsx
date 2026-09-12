import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Check, X, ShieldCheck } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (isInstallable) { await install(); return; }
    setShowGuide(true);
  };

  return (
    <>
      <div className="fixed right-2.5 bottom-[78px] sm:right-4 sm:bottom-4 z-40">
        <button id="serviya-install-button" type="button" onClick={handleInstall} className="inline-flex items-center gap-1 rounded-full bg-slate-900/95 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-md border border-white/20 active:scale-95 hover:bg-slate-800 transition font-bold text-[9px] sm:text-[10px]" title="Instalar SERVIYA" aria-label="Instalar SERVIYA">
          {isInstallable ? <Download className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}<span>Instalar</span>
        </button>
      </div>
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition" aria-label="Cerrar guía"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4 pr-8"><div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-red-600 flex items-center justify-center text-white shadow-md"><ShieldCheck className="w-7 h-7" /></div><div className="min-w-0"><h3 className="text-lg font-bold text-slate-900">Instalar SERVIYA</h3><p className="text-xs text-slate-500">Instala SERVIYA en tu teléfono, tableta o iPhone/iPad.</p></div></div>
            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              {isInstallable && <div className="p-3 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-900 block mb-1">Instalación rápida:</span><p className="text-slate-600">Toca “Instalar” y confirma la instalación cuando el navegador la muestre.</p></div>}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-900 block mb-1">Android y tabletas (Chrome):</span><ol className="list-decimal list-inside space-y-1 text-slate-600"><li>Abre SERVIYA en Google Chrome.</li><li>Toca “Instalar”.</li><li>Si Chrome no muestra la instalación, toca ⋮ y elige “Instalar aplicación” o “Agregar a pantalla principal”.</li></ol></div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="font-bold text-slate-900 block mb-1">iPhone / iPad (Safari):</span><ol className="list-decimal list-inside space-y-1 text-slate-600"><li>Abre SERVIYA en Safari.</li><li>Toca el botón Compartir.</li><li>Selecciona “Agregar a pantalla de inicio” o “Añadir a pantalla de inicio”.</li><li>Confirma con “Agregar”.</li></ol>{!isIOS && <p className="text-[11px] text-slate-500 mt-2">En iPhone/iPad la instalación se realiza desde Safari.</p>}</div>
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-xs font-medium"><Check className="w-4 h-4 shrink-0 text-emerald-600" /><span>Una vez instalada, SERVIYA aparece como una aplicación en la pantalla del dispositivo.</span></div>
            </div>
            <button onClick={() => setShowGuide(false)} className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition">Entendido</button>
          </div>
        </div>
      )}
    </>
  );
};
