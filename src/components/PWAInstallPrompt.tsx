import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
      return;
    }

    // No tutorial: browsers that do not expose the native PWA install
    // prompt cannot be installed programmatically from a web page.
    window.alert('Este navegador no permite la instalación directa de SERVIYA.');
  };

  return (
    <div className="fixed right-2.5 bottom-[78px] sm:right-4 sm:bottom-4 z-40">
      <button
        id="serviya-install-button"
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center gap-1 rounded-full bg-slate-900/95 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-md border border-white/20 active:scale-95 hover:bg-slate-800 transition font-bold text-[9px] sm:text-[10px]"
        title="Instalar SERVIYA"
        aria-label="Instalar SERVIYA"
      >
        <Download className="w-3 h-3" />
        <span>Instalar SERVIYA</span>
      </button>
    </div>
  );
};
