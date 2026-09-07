import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { 
  Bell, 
  Wallet, 
  User as UserIcon, 
  PlusCircle, 
  ShieldCheck, 
  LogOut, 
  Briefcase, 
  Layers, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenPublish: () => void;
  onOpenWallet: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenVerification: () => void;
  onOpenDisputes: () => void;
  onNavigateTab: (tab: string) => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onOpenPublish,
  onOpenWallet,
  onOpenNotifications,
  onOpenProfile,
  onOpenAdmin,
  onOpenVerification,
  onOpenDisputes,
  onNavigateTab,
  activeTab
}) => {
  const { user, logout, toggleRole } = useAuth();
  const { unreadCount } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Dominican Flag Branding */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigateTab('inicio')}
              className="flex items-center gap-2.5 group text-left"
            >
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-800 to-red-600 flex items-center justify-center shadow-md shadow-blue-900/40 group-hover:scale-105 transition transform">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tighter">S</span>
                <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-bold px-1 rounded border border-slate-900">.do</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white group-hover:text-blue-400 transition">
                    SERVIYA<span className="text-red-500">.do</span>
                  </span>
                  <span className="text-sm">🇩🇴</span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide hidden sm:block">
                  Trabajo • Confianza • Oportunidades
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => onNavigateTab('inicio')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'inicio' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => onNavigateTab('buscar')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'buscar' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Buscar Servicios
            </button>
            <button
              onClick={() => onNavigateTab('trabajadores')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'trabajadores' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Trabajadores RD
            </button>
          </nav>

          {/* Right Action Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Install PWA Prompt */}
            <PWAInstallPrompt />

            {user ? (
              <>
                {/* Role Switcher Pill */}
                <button
                  onClick={toggleRole}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition"
                  title="Cambiar vista de rol"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Modo: {user.activeRole}</span>
                </button>

                {/* Publish Job Button */}
                <button
                  onClick={onOpenPublish}
                  className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-md transition transform active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Servicio</span>
                </button>

                {/* Notifications Bell */}
                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Wallet Shortcut */}
                <button
                  onClick={onOpenWallet}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1"
                  title="Ver Billetera SERVIYA"
                >
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </button>

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800 transition"
                  >
                    <img
                      src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={user.first_name}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-blue-500"
                    />
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-slate-200">
                      <div className="px-4 py-2.5 border-b border-slate-800">
                        <p className="text-sm font-bold text-white">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-400">
                          <span>Provincia: {user.province}</span>
                          {user.is_verified && <span className="text-emerald-400">✓ Verificado</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => { setDropdownOpen(false); onOpenProfile(); }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2.5"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>Mi Perfil y Especialidad</span>
                      </button>

                      <button
                        onClick={() => { setDropdownOpen(false); onOpenWallet(); }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2.5"
                      >
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span>Mi Billetera SERVIYA</span>
                      </button>

                      <button
                        onClick={() => { setDropdownOpen(false); onOpenVerification(); }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2.5"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span>Verificación Cédula / Badges</span>
                      </button>

                      <button
                        onClick={() => { setDropdownOpen(false); onOpenDisputes(); }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2.5"
                      >
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>Centro de Disputas</span>
                      </button>

                      {user.role === 'ADMIN' && (
                        <button
                          onClick={() => { setDropdownOpen(false); onOpenAdmin(); }}
                          className="w-full text-left px-4 py-2 text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 px-4 py-2 flex items-center gap-2.5 font-bold border-t border-b border-red-900/40"
                        >
                          <Briefcase className="w-4 h-4 text-red-400" />
                          <span>Panel Administrativo (/admin)</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setDropdownOpen(false); logout(); }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 text-red-400 flex items-center gap-2.5 mt-1 border-t border-slate-800/80"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition"
                >
                  Ingresar
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl shadow-md transition transform active:scale-95"
                >
                  Registrarme
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => { setMobileMenuOpen(false); onNavigateTab('inicio'); }}
            className="w-full text-left py-2 text-sm font-semibold text-slate-200 border-b border-slate-800"
          >
            🏠 Inicio
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); onNavigateTab('buscar'); }}
            className="w-full text-left py-2 text-sm font-semibold text-slate-200 border-b border-slate-800"
          >
            🔎 Buscar Servicios
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); onNavigateTab('trabajadores'); }}
            className="w-full text-left py-2 text-sm font-semibold text-slate-200 border-b border-slate-800"
          >
            🛠️ Trabajadores Certificados
          </button>
          {user && (
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenPublish(); }}
              className="w-full text-left py-2 text-sm font-bold text-blue-400 border-b border-slate-800"
            >
              ➕ Publicar Servicio
            </button>
          )}
        </div>
      )}
    </header>
  );
};
