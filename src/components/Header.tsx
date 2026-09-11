import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { ClientFundsCard } from './ClientFundsCard';
import { Bell, User as UserIcon, PlusCircle, ShieldCheck, LogOut, Layers, Menu, X, ChevronDown, MessageSquare, FileText, BriefcaseBusiness, ClipboardList, ClipboardCheck } from 'lucide-react';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenPublish: () => void;
  onOpenWallet: () => void;
  onOpenNotifications: () => void;
  onOpenMessages?: () => void;
  onOpenProfile: () => void;
  onOpenVerification: () => void;
  onOpenDisputes: () => void;
  onOpenPolicies: () => void;
  onNavigateTab: (tab: string) => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth, onOpenPublish, onOpenNotifications, onOpenMessages,
  onOpenProfile, onOpenVerification, onOpenDisputes, onOpenPolicies,
  onNavigateTab, activeTab
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';
  const navItems: [string, string][] = isWorker ? [['inicio', 'Inicio'], ['buscar', 'Buscar trabajos'], ['mis-servicios', 'Mis trabajos']] : [['inicio', 'Inicio'], ['buscar', 'Buscar servicios'], ['mis-trabajos', 'Mis trabajos']];
  const close = () => { setMobileMenuOpen(false); setMoreOpen(false); setProfileOpen(false); };
  const openMyPublications = () => { close(); onNavigateTab('inicio'); };
  const openApplications = () => { close(); onNavigateTab('postulaciones'); };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg overflow-x-clip">
        <PWAInstallPrompt />
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-14 sm:min-h-20 gap-1">
            <button onClick={() => { close(); onNavigateTab('inicio'); }} className="flex items-center gap-2 min-w-0 flex-1 text-left">
              <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-800 to-red-600 flex items-center justify-center shadow-md"><span className="text-lg sm:text-2xl font-black">S</span></div>
              <div className="min-w-0"><span className="block text-lg sm:text-2xl font-black leading-none truncate">SERVIYA</span><span className="hidden sm:block text-[10px] text-slate-400 mt-1 truncate">Trabajo • Confianza • Oportunidades</span></div>
            </button>

            <nav className="hidden md:flex items-center justify-center gap-1 flex-[2]">
              {navItems.map(([tab, label]) => <button key={tab} onClick={() => onNavigateTab(tab)} className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${activeTab === tab ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}>{label}</button>)}
              {!isWorker && <button onClick={() => onNavigateTab('trabajadores')} className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${activeTab === 'trabajadores' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}>Trabajadores</button>}
              <div className="relative">
                <button onClick={() => setMoreOpen(v => !v)} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800">Más <ChevronDown className="inline w-3.5 h-3.5" /></button>
                {moreOpen && <div className="absolute left-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50">
                  {isWorker && <button onClick={openApplications} className="w-full text-left p-3 rounded-xl text-xs font-bold hover:bg-slate-800"><ClipboardCheck className="inline w-4 h-4 mr-2 text-emerald-400" />Postulaciones</button>}
                  {!isWorker && <button onClick={openMyPublications} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><ClipboardList className="inline w-4 h-4 mr-2 text-blue-400" />Mis publicaciones</button>}
                  <button onClick={() => { close(); onOpenMessages?.(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><MessageSquare className="inline w-4 h-4 mr-2 text-blue-400" />Mensajes</button>
                  <button onClick={() => { close(); onOpenProfile(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><UserIcon className="inline w-4 h-4 mr-2" />Mi Perfil</button>
                  {isWorker && <button onClick={() => { close(); onOpenVerification(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><ShieldCheck className="inline w-4 h-4 mr-2" />Verificación</button>}
                  <button onClick={() => { close(); onOpenDisputes(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><Layers className="inline w-4 h-4 mr-2 text-amber-400" />Disputas</button>
                  <button onClick={() => { close(); onOpenPolicies(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><FileText className="inline w-4 h-4 mr-2" />Políticas</button>
                </div>}
              </div>
            </nav>

            <div className="flex items-center justify-end gap-0.5 sm:gap-2 shrink-0">
              {user && <>
                <button onClick={() => onOpenMessages?.()} className="p-2 rounded-xl hover:bg-slate-800" title="Mensajes"><MessageSquare className="w-5 h-5 text-blue-400" /></button>
                <button onClick={onOpenNotifications} className="relative p-2 rounded-xl hover:bg-slate-800" title="Notificaciones"><Bell className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-600 text-[9px] font-bold min-w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}</button>
                <div className="relative">
                  <button onClick={() => setProfileOpen(v => !v)} className="p-1 rounded-xl hover:bg-slate-800" title="Mi perfil" aria-label="Mi perfil">
                    {user.avatar_url ? <img src={user.avatar_url} alt={`Foto de perfil de ${user.first_name || 'usuario'}`} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-500 bg-slate-800" /> : <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-blue-500 bg-slate-800 flex items-center justify-center"><UserIcon className="w-5 h-5 text-slate-300" /></div>}
                  </button>
                  {profileOpen && <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-800"><p className="font-bold text-sm truncate">{user.first_name} {user.last_name}</p><p className="text-[10px] text-slate-400 truncate">{user.email}</p></div>
                    {isWorker && <button onClick={openApplications} className="w-full text-left p-3 rounded-xl text-xs font-bold hover:bg-slate-800"><ClipboardCheck className="inline w-4 h-4 mr-2 text-emerald-400" />Postulaciones</button>}
                    {!isWorker && <button onClick={openMyPublications} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><ClipboardList className="inline w-4 h-4 mr-2 text-blue-400" />Mis publicaciones</button>}
                    {!isWorker && <button onClick={() => { close(); onNavigateTab('mis-trabajos'); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><BriefcaseBusiness className="inline w-4 h-4 mr-2 text-blue-400" />Mis trabajos</button>}
                    {isWorker && <button onClick={() => { close(); onNavigateTab('mis-servicios'); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><BriefcaseBusiness className="inline w-4 h-4 mr-2 text-emerald-400" />Mis trabajos</button>}
                    <button onClick={() => { close(); onOpenProfile(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><UserIcon className="inline w-4 h-4 mr-2" />Mi Perfil</button>
                    <button onClick={() => { close(); onOpenMessages?.(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><MessageSquare className="inline w-4 h-4 mr-2" />Mensajes</button>
                    {isWorker && <button onClick={() => { close(); onOpenVerification(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><ShieldCheck className="inline w-4 h-4 mr-2" />Verificación</button>}
                    <button onClick={() => { close(); onOpenDisputes(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><Layers className="inline w-4 h-4 mr-2" />Disputas</button>
                    <button onClick={() => { close(); onOpenPolicies(); }} className="w-full text-left p-3 rounded-xl text-xs hover:bg-slate-800"><FileText className="inline w-4 h-4 mr-2" />Políticas</button>
                    <button onClick={() => { close(); logout(); }} className="w-full text-left p-3 rounded-xl text-xs text-red-400 hover:bg-slate-800 border-t border-slate-800 mt-1"><LogOut className="inline w-4 h-4 mr-2" />Cerrar sesión</button>
                  </div>}
                </div>
              </>}
              {!user && <><button onClick={() => onOpenAuth('login')} className="hidden sm:block px-2 py-2 text-xs font-semibold">Ingresar</button><button onClick={() => onOpenAuth('register')} className="hidden sm:block px-3 py-2 bg-blue-600 rounded-xl text-xs font-bold">Registrarme</button></>}
              <button onClick={() => setMobileMenuOpen(v => !v)} className="md:hidden p-2 rounded-xl hover:bg-slate-800" title="Menú">{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
            </div>
          </div>

          {mobileMenuOpen && <div className="md:hidden border-t border-slate-800 py-2 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            {navItems.map(([tab, label]) => <button key={tab} onClick={() => { close(); onNavigateTab(tab); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800">{label}</button>)}
            {!isWorker && <button onClick={() => { close(); onNavigateTab('trabajadores'); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800"><BriefcaseBusiness className="inline w-4 h-4 mr-2 text-emerald-400" />Trabajadores</button>}
            {user ? <>
              {isWorker && <button onClick={openApplications} className="w-full text-left px-3 py-3 rounded-xl text-sm font-black hover:bg-slate-800 bg-emerald-950/30"><ClipboardCheck className="inline w-4 h-4 mr-2 text-emerald-400" />Postulaciones</button>}
              {!isWorker && <button onClick={openMyPublications} className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold hover:bg-slate-800"><ClipboardList className="inline w-4 h-4 mr-2 text-blue-400" />Mis publicaciones</button>}
              <button onClick={() => { close(); onOpenMessages?.(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold hover:bg-slate-800"><MessageSquare className="inline w-4 h-4 mr-2 text-blue-400" />Mensajes</button>
              <button onClick={() => { close(); onOpenNotifications(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800"><Bell className="inline w-4 h-4 mr-2" />Notificaciones {unreadCount > 0 ? `(${unreadCount})` : ''}</button>
              <button onClick={() => { close(); onOpenProfile(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800"><UserIcon className="inline w-4 h-4 mr-2" />Mi Perfil</button>
              {isWorker && <button onClick={() => { close(); onOpenVerification(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800"><ShieldCheck className="inline w-4 h-4 mr-2" />Verificación</button>}
              <button onClick={() => { close(); onOpenDisputes(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800"><Layers className="inline w-4 h-4 mr-2" />Disputas</button>
              <button onClick={() => { close(); onOpenPolicies(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800"><FileText className="inline w-4 h-4 mr-2" />Políticas y reglas</button>
              {!isWorker && <button onClick={() => { close(); onOpenPublish(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold text-blue-400 hover:bg-slate-800"><PlusCircle className="inline w-4 h-4 mr-2" />Publicar servicio</button>}
              <button onClick={() => { close(); logout(); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-slate-800"><LogOut className="inline w-4 h-4 mr-2" />Cerrar sesión</button>
            </> : <><button onClick={() => { close(); onOpenAuth('login'); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold">Ingresar</button><button onClick={() => { close(); onOpenAuth('register'); }} className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold text-blue-400">Registrarme</button></>}
          </div>}
        </div>
      </header>
      {user && activeTab === 'inicio' && <ClientFundsCard />}
    </>
  );
};
