import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Check, X, ShieldCheck } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return <>
    <div className="fixed right-2.5 bottom-[78px] sm:right-4 sm:bottom-4 z-40">
      <button id="serviya-install-button" type="button" onClick={handleInstall} className="inline-flex items-center gap-1 rounded-full bg-slate-900/95 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-md border border-white/20 active:scale-95 hover:bg-slate-800 transition font-bold text-[9px] sm:text-[10px]" title="Instalar SERVIYA" aria-label="Instalar SERVIYA">
        <Download className="w-3 h-3" /><span>Instalar SERVIYA</span>
      </button>
    </div>
    {showGuide && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button onClick={()=>setShowGuide(false)} className="absolute top-4 right-4 text-slate-400 p-1 rounded-full hover:bg-slate-100" aria-label="Cerrar"><X className="w-5 h-5"/></button>
        <div className="flex items-center gap-3 mb-4 pr-8"><div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center"><ShieldCheck className="w-6 h-6"/></div><div><h3 className="text-lg font-black text-slate-900">Instalar SERVIYA</h3><p className="text-xs text-slate-500">Este navegador no ofrece instalación directa.</p></div></div>
        {isIOS ? <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700"><p className="font-black mb-2">iPhone / iPad</p><ol className="list-decimal list-inside space-y-1"><li>Abre SERVIYA en Safari o en el navegador compatible.</li><li>Toca <b>Compartir</b>.</li><li>Selecciona <b>Añadir a pantalla de inicio</b>.</li><li>Confirma con <b>Añadir</b>.</li></ol></div> : <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-slate-700"><p className="font-black text-blue-900 mb-2">Android / otros navegadores</p><ol className="list-decimal list-inside space-y-1"><li>Abre SERVIYA en Chrome, Samsung Internet o un navegador compatible.</li><li>Abre el menú del navegador.</li><li>Selecciona <b>Instalar aplicación</b> o <b>Añadir a pantalla principal</b>.</li><li>Confirma la instalación.</li></ol></div>}
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs font-semibold mt-4"><Check className="w-4 h-4"/>Si el navegador ofrece instalación directa, SERVIYA la abrirá automáticamente al tocar el botón.</div>
        <button onClick={()=>setShowGuide(false)} className="mt-4 w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs">Cerrar</button>
      </div>
    </div>}
  </>;
};
