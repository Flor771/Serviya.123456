import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LandingSection } from './components/LandingSection';
import { ServicesView } from './components/ServicesView';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { PublishServiceModal } from './components/PublishServiceModal';
import { WalletView } from './components/WalletView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { MessagesModal } from './components/MessagesModal';
import { NotificationsModal } from './components/NotificationsModal';
import { VerificationModal } from './components/VerificationModal';
import { DisputesModal } from './components/DisputesModal';
import { ReviewsModal } from './components/ReviewsModal';
import { AdminPanel } from './components/AdminPanel';
import { Service, User } from './types';
import { api } from './services/api';

const MOCK_INITIAL_SERVICES: Service[] = [
  { id: 's-101', title: 'Instalación de Tinaco y Calentador Solar en Bella Vista', description: 'Busco plomero con experiencia para instalar tinaco de 500 galones en techo de 3er nivel y conectar calentador solar de 150L. Incluye tubería de CPVC.', category_id: 'cat-plumber', category_name: 'Plomería y Tuberías', subcategory: 'Instalación de Tinacos', price_rd: 4500, province: 'Distrito Nacional', municipality: 'Bella Vista', address_approx: 'C/ Sarasota cerca de la Av. Núñez de Cáceres', service_date: '2026-09-10', service_time: '08:30 AM', estimated_duration: '4 horas', images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'], requirements: ['Traer escaleras de 12 pies', 'Herramientas de corte CPVC', 'Puntualidad'], status: 'PUBLICADA', payment_type: 'CUSTODIA_SERVIYA', client_id: 'user-client-1', client_name: 'Ana Rosario', client_rating: 4.9, applications_count: 3, created_at: new Date().toISOString() },
  { id: 's-102', title: 'Reparación de Cortocircuito y Panel de Breakers en Santiago', description: 'El breaker principal de la casa se dispara al encender los aires acondicionados. Se requiere diagnóstico de carga y reemplazo de breakers defectuosos.', category_id: 'cat-electrician', category_name: 'Electricidad', subcategory: 'Cortocircuitos y Tableros', price_rd: 3200, province: 'Santiago', municipality: 'Santiago de los Caballeros', address_approx: 'Los Jardines Metropolitanos', service_date: '2026-09-08', service_time: '10:00 AM', estimated_duration: '3 horas', images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800'], requirements: ['Certificación INFOTEP deseable', 'Probador de voltaje digital'], status: 'PUBLICADA', payment_type: 'CUSTODIA_SERVIYA', client_id: 'user-client-2', client_name: 'Roberto Méndez', client_rating: 4.8, applications_count: 2, created_at: new Date().toISOString() },
  { id: 's-103', title: 'Mantenimiento Profundo de 3 Aires Inverter en Punta Cana', description: 'Mantenimiento preventivo, limpieza de evaporador y condensador con hidrolavadora para 3 equipos Split Inverter de 12,000 y 18,000 BTU.', category_id: 'cat-hvac', category_name: 'Aires Acondicionados', subcategory: 'Limpieza y Mantenimiento Inverter', price_rd: 5500, province: 'La Altagracia', municipality: 'Higüey (Punta Cana)', address_approx: 'Residencial Bávaro Green', service_date: '2026-09-09', service_time: '02:00 PM', estimated_duration: '5 horas', images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800'], requirements: ['Llevar lona de protección', 'Bomba de lavado a presión'], status: 'PUBLICADA', payment_type: 'CUSTODIA_SERVIYA', client_id: 'user-client-3', client_name: 'Hotelera Bávaro SRL', client_rating: 5.0, applications_count: 5, created_at: new Date().toISOString() }
];

const MOCK_INITIAL_WORKERS: User[] = [
  { id: 'w-201', email: 'juan.plomero@serviya.do', first_name: 'Juan Miguel', last_name: 'Pérez Santos', phone: '809-555-0144', province: 'Distrito Nacional', municipality: 'Santo Domingo', role: 'TRABAJADOR', activeRole: 'TRABAJADOR', is_verified: true, rating: 4.95, jobs_completed: 48, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', worker_profile: { profession: 'Plomero Máster Certificado', hourly_rate_rd: 900, bio: 'Técnico graduado en INFOTEP con 12 años instalando tuberías, tinacos, bombas sumergibles y calentadores solares.', specialties: ['Plomería CPVC/PEX', 'Bombas de Agua', 'Calentadores'], portfolio_images: [] }, created_at: new Date().toISOString() },
  { id: 'w-202', email: 'carlos.electricista@serviya.do', first_name: 'Carlos', last_name: 'Rodríguez Tavárez', phone: '809-555-0188', province: 'Santiago', municipality: 'Santiago de los Caballeros', role: 'TRABAJADOR', activeRole: 'TRABAJADOR', is_verified: true, rating: 4.88, jobs_completed: 32, avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', worker_profile: { profession: 'Perito Electricista Industrial', hourly_rate_rd: 850, bio: 'Especialista en tableros trifásicos, plantas eléctricas y cortocircuitos residenciales.', specialties: ['Tableros Eléctricos', 'Inversores', 'Generadores'], portfolio_images: [] }, created_at: new Date().toISOString() }
];

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inicio');
  const [services, setServices] = useState<Service[]>(MOCK_INITIAL_SERVICES);
  const [workers] = useState<User[]>(MOCK_INITIAL_WORKERS);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [chatParams, setChatParams] = useState<{ serviceId: string; receiverId: string } | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [disputeServiceId, setDisputeServiceId] = useState<string | null>(null);
  const [reviewParams, setReviewParams] = useState<{ serviceId: string; targetUserId: string } | null>(null);

  const fetchServices = async () => {
    try {
      const data = await api.get<{ services: Service[] }>('/services');
      if (data?.services) setServices(data.services);
    } catch (err) { console.log('Using initial services'); }
  };

  useEffect(() => { fetchServices(); }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      <Header
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onOpenPublish={() => setShowPublishModal(true)}
        onOpenWallet={() => setActiveTab('billetera')}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenMessages={() => setChatParams({ serviceId: '', receiverId: '' })}
        onOpenProfile={() => setActiveTab('perfil')}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenVerification={() => setShowVerificationModal(true)}
        onOpenDisputes={() => setDisputeServiceId('')}
        onNavigateTab={(tab) => setActiveTab(tab)}
        activeTab={activeTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pb-12">
        {activeTab === 'inicio' && <LandingSection services={services} workers={workers} onSelectCategory={() => setActiveTab('buscar')} onSelectService={(service) => setSelectedService(service)} onOpenPublish={() => { if (user) setShowPublishModal(true); else setAuthModalMode('login'); }} onNavigateTab={(tab) => setActiveTab(tab)} />}
        {activeTab === 'buscar' && <ServicesView services={services} onSelectService={(s) => setSelectedService(s)} onOpenPublish={() => { if (user) setShowPublishModal(true); else setAuthModalMode('login'); }} />}
        {activeTab === 'trabajadores' && <div className="space-y-6 pb-12"><div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl"><h1 className="text-2xl font-black">Trabajadores Certificados en República Dominicana 🇩🇴</h1><p className="text-xs text-slate-300">Profesionales con Cédula verificada y garantía en sus trabajos</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{workers.map(w => <div key={w.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4"><img src={w.avatar_url} alt={w.first_name} className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shrink-0" /><div className="space-y-1"><div className="flex items-center gap-1.5"><h3 className="font-bold text-slate-900 text-base">{w.first_name} {w.last_name}</h3>{w.is_verified && <span className="text-xs text-blue-600 font-bold">✓ Verificado</span>}</div><p className="text-xs font-semibold text-blue-700">{w.worker_profile?.profession}</p><p className="text-xs text-slate-600">{w.worker_profile?.bio}</p><div className="text-xs font-bold text-slate-800 pt-1">Tarifa: RD$ {w.worker_profile?.hourly_rate_rd}/hora • {w.province}</div></div></div>)}</div></div>}
        {activeTab === 'billetera' && <WalletView />}
        {activeTab === 'perfil' && <ProfileView onOpenVerification={() => setShowVerificationModal(true)} />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      <BottomNav activeTab={activeTab} onNavigateTab={(tab) => setActiveTab(tab)} onOpenPublish={() => setShowPublishModal(true)} onOpenWallet={() => setActiveTab('billetera')} onOpenProfile={() => setActiveTab('perfil')} onOpenAuth={(mode) => setAuthModalMode(mode)} />

      {selectedService && <ServiceDetailModal service={selectedService} onClose={() => setSelectedService(null)} onRefresh={fetchServices} onOpenChat={(sId, rId) => setChatParams({ serviceId: sId, receiverId: rId })} onOpenReview={(sId, tId) => setReviewParams({ serviceId: sId, targetUserId: tId })} onOpenDispute={(sId) => setDisputeServiceId(sId)} />}
      {showPublishModal && <PublishServiceModal onClose={() => setShowPublishModal(false)} onSuccess={fetchServices} />}
      {authModalMode && <AuthModal initialMode={authModalMode} onClose={() => setAuthModalMode(null)} />}
      {chatParams && <MessagesModal serviceId={chatParams.serviceId} receiverId={chatParams.receiverId} onClose={() => setChatParams(null)} />}
      {showNotificationsModal && <NotificationsModal onClose={() => setShowNotificationsModal(false)} />}
      {showVerificationModal && <VerificationModal onClose={() => setShowVerificationModal(false)} />}
      {disputeServiceId !== null && <DisputesModal serviceId={disputeServiceId || undefined} onClose={() => setDisputeServiceId(null)} />}
      {reviewParams && <ReviewsModal serviceId={reviewParams.serviceId} targetUserId={reviewParams.targetUserId} onClose={() => setReviewParams(null)} />}
    </div>
  );
};

export const App: React.FC = () => <AuthProvider><WalletProvider><NotificationProvider><AppContent /></NotificationProvider></WalletProvider></AuthProvider>;
export default App;
