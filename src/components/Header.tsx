import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { Bell, Wallet, User as UserIcon, PlusCircle, ShieldCheck, LogOut, Briefcase, Layers, Menu, X, ChevronDown, MessageSquare, FileText } from 'lucide-react';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void; onOpenPublish: () => void; onOpenWallet: () => void; onOpenNotifications: () => void; onOpenMessages?: () => void; onOpenProfile: () => void; onOpenAdmin: () => void; onOpenVerification: () => void; onOpenDisputes: () => void; onOpenPolicies: () => void; onNavigateTab: (tab: string) => void; activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth, onOpenPublish, onOpenWallet, onOpenNotifications, onOpenMessages, onOpenProfile, onOpenAdmin, onOpenVerification, onOpenDisputes, onOpenPolicies, onNavigateTab, activeTab }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false); const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';
  const navItems = isWorker ? [['inicio','Inicio'],['buscar','Buscar trabajos'],['mis-servicios','Mis trabajos']] : [['inicio','Inicio'],['buscar','Buscar servicios'],['trabajadores','Trabajadores']];

  return <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16 sm:h-20">
      <button onClick={() => onNavigateTab('inicio')} className="flex items-center gap-2.5 group text-left"><div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-800 to-red-600 flex items-center justify-center shadow-md"><span className="text-xl sm:text-2xl font-black text-white">S</span><span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-bold px-1 rounded border border-slate-900">.do</span></div><div className="flex flex-col"><div className="flex items-center gap-1"><span className="text-lg sm:text-2xl font-black text-white">SERVIYA<span className="text-red-500">.do</span></span><span>🇩🇴</span></div><span className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">{isWorker ? 'Servicios • Trabajos • Oportunidades' : 'Servicios • Confianza • Oportunidades'}</span></div></button>
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">{navItems.map(([tab,label]) => <button key={tab} onClick={() => onNavigateTab(tab)} className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>{label}</button>)}</nav>
      <div className="flex items-center gap-2 sm:gap-3"><PWAInstallPrompt />{user ? <>
        { !isWorker && <button onClick={onOpenPublish} className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl"><PlusCircle className="w-4 h-4" /><span>Publicar Servicio</span></button> }
        {onOpenMessages && <button onClick={onOpenMessages} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl" title="Mensajes"><MessageSquare className="w-5 h-5 text-blue-400" /></button>}
        <button onClick={onOpenNotifications} className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"><Bell className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}</button>
        <button onClick={onOpenWallet} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl" title="Billetera"><Wallet className="w-5 h-5 text-emerald-400" /></button>
        <div className="relative"><button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800"><img src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt={user.first_name} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-blue-500" /><ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" /></button>{dropdownOpen && <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-slate-200">
          <div className="px-4 py-2.5 border-b border-slate-800"><p className="text-sm font-bold text-white">{user.first_name} {user.last_name}</p><p className="text-xs text-slate-400 truncate">{user.email}</p><p className="text-[11px] text-blue-400 mt-1">Modo: {isWorker ? 'TRABAJADOR / TÉCNICO' : 'CLIENTE'}</p></div>
          <button onClick={() => {setDropdownOpen(false);onOpenProfile();}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex gap-2.5"><UserIcon className="w-4 h-4 text-slate-400" />Mi Perfil</button>
          <button onClick={() => {setDropdownOpen(false);onOpenWallet();}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex gap-2.5"><Wallet className="w-4 h-4 text-emerald-400" />Mi Billetera</button>
          {isWorker && <button onClick={() => {setDropdownOpen(false);onOpenVerification();}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex gap-2.5"><ShieldCheck className="w-4 h-4 text-blue-400" />Verificación de trabajador</button>}
          <button onClick={() => {setDropdownOpen(false);onOpenDisputes();}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex gap-2.5"><Layers className="w-4 h-4 text-amber-400" />Mis disputas</button>
          <button onClick={() => {setDropdownOpen(false);onOpenPolicies();}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex gap-2.5"><FileText className="w-4 h-4 text-blue-300" />Políticas y Reglas</button>
          {user.role === 'ADMIN' && <button onClick={() => {setDropdownOpen(false);onOpenAdmin();}} className="w-full text-left px-4 py-2 text-xs bg-red-950/40 text-red-300 flex gap-2.5 font-bold border-y border-red-900/40"><Briefcase className="w-4 h-4 text-red-400" />Panel Administrativo</button>}
          <button onClick={() => {setDropdownOpen(false);logout();}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 text-red-400 flex gap-2.5 mt-1 border-t border-slate-800"><LogOut className="w-4 h-4" />Cerrar Sesión</button>
        </div>}</div>
      </> : <div className="flex items-center gap-2"><button onClick={() => onOpenAuth('login')} className="text-xs sm:text-sm font-semibold text-slate-300 px-3 py-2">Ingresar</button><button onClick={() => onOpenAuth('register')} className="bg-blue-600 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl">Registrarme</button></div>}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-300">{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button></div></div>
    {mobileMenuOpen && <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">{navItems.map(([tab,label]) => <button key={tab} onClick={() => {setMobileMenuOpen(false);onNavigateTab(tab);}} className="w-full text-left py-2 text-sm font-semibold text-slate-200 border-b border-slate-800">{label}</button>)}{user && !isWorker && <button onClick={() => {setMobileMenuOpen(false);onOpenPublish();}} className="w-full text-left py-2 text-sm font-bold text-blue-400">➕ Publicar Servicio</button>}<button onClick={() => {setMobileMenuOpen(false);onOpenPolicies();}} className="w-full text-left py-2 text-sm font-semibold text-slate-200">📋 Políticas y Reglas</button></div>}
    </div></header>;
};
