import React from 'react';
import { Home, Search, PlusCircle, Wallet, User as UserIcon, BriefcaseBusiness } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onOpenPublish: () => void;
  onOpenWallet: () => void;
  onOpenProfile: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onNavigateTab, onOpenPublish, onOpenWallet, onOpenProfile, onOpenAuth }) => {
  const { user } = useAuth();
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';

  const go = (tab: string) => {
    if (!user) { onOpenAuth('login'); return; }
    onNavigateTab(tab);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-400 px-2 py-1.5 shadow-2xl">
      <div className="grid grid-cols-5 gap-1">
        <button onClick={() => onNavigateTab('inicio')} className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${activeTab === 'inicio' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'}`}>
          <Home className="w-5 h-5" /><span className="text-[10px] mt-0.5">Inicio</span>
        </button>
        <button onClick={() => go('buscar')} className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${activeTab === 'buscar' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'}`}>
          <Search className="w-5 h-5" /><span className="text-[10px] mt-0.5">{isWorker ? 'Buscar trabajos' : 'Buscar'}</span>
        </button>
        {isWorker ? (
          <button onClick={() => go('mis-servicios')} className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${activeTab === 'mis-servicios' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'}`}>
            <BriefcaseBusiness className="w-5 h-5" /><span className="text-[10px] mt-0.5">Mis trabajos</span>
          </button>
        ) : (
          <button onClick={() => { if (user) onOpenPublish(); else onOpenAuth('login'); }} className="flex flex-col items-center justify-center py-1 rounded-xl text-blue-400 hover:text-blue-300 transform active:scale-90 transition">
            <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg shadow-blue-600/40 -mt-4 border-2 border-slate-900"><PlusCircle className="w-5 h-5" /></div>
            <span className="text-[10px] mt-0.5 font-bold text-blue-400">Publicar</span>
          </button>
        )}
        <button onClick={() => { if (user) onOpenWallet(); else onOpenAuth('login'); }} className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${activeTab === 'billetera' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'}`}>
          <Wallet className="w-5 h-5" /><span className="text-[10px] mt-0.5">Billetera</span>
        </button>
        <button onClick={() => { if (user) onOpenProfile(); else onOpenAuth('login'); }} className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${activeTab === 'perfil' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'}`}>
          <UserIcon className="w-5 h-5" /><span className="text-[10px] mt-0.5">Perfil</span>
        </button>
      </div>
    </div>
  );
};
