import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LandingSection } from './components/LandingSection';
import { ServicesView } from './components/ServicesView';
import { MobileServiceDetailModal } from './components/MobileServiceDetailModal';
import { PublishServiceModal } from './components/PublishServiceModal';
import { WalletView } from './components/WalletView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { MessagesModal } from './components/MessagesModal';
import { NotificationsModal } from './components/NotificationsModal';
import { VerificationModal } from './components/VerificationModal';
import { DisputesModal } from './components/DisputesModal';
import { ReviewsModal } from './components/ReviewsModal';
import { PoliciesModal } from './components/PoliciesModal';
import { WorkPhotosModal } from './components/WorkPhotosModal';
import { WorkFlowActions } from './components/WorkFlowActions';
import { WorkersView } from './components/WorkersView';
import { Service } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const isWorker = user?.role === 'TRABAJADOR' || user?.activeRole === 'TRABAJADOR';
  const [activeTab, setActiveTab] = useState('inicio');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [photoService, setPhotoService] = useState<Service | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [authRole, setAuthRole] = useState<'CLIENTE' | 'TRABAJADOR'>('CLIENTE');
  const [chatParams, setChatParams] = useState<{ serviceId: string; receiverId: string } | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [disputeServiceId, setDisputeServiceId] = useState<string | null>(null);
  const [reviewParams, setReviewParams] = useState<{ serviceId: string; targetUserId: string } | null>(null);
  const openAuth = (mode: 'login' | 'register', role: 'CLIENTE' | 'TRABAJADOR') => { setAuthRole(role); setAuthModalMode(mode); };
  const fetchServices = async () => { try { const data = await api.get<{ services: Service[] }>('/services'); setServices(data?.services || []); } catch (err) { console.error('No se pudieron cargar los servicios:', err); setServices([]); } };
  useEffect(() => { if (!loading) fetchServices(); }, [loading, user?.id]);
  useEffect(() => { setActiveTab('inicio'); }, [user?.id, user?.role]);
  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 font-semibold">Cargando SERVIYA…</div>;
  const clientServices = user ? services.filter(s => s.client_id === user.id) : [];
  const workerServices = user ? services.filter(s => s.worker_id === user.id) : [];
  const availableServices = services.filter(s => s.status === 'PUBLICADA' || s.status === 'RECIBIENDO_POSTULACIONES');
  const openService = (service: Service) => setSelectedService(service);
  const openChat = (serviceId: string, receiverId: string) => setChatParams({ serviceId, receiverId });
  return <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
    <Header onOpenAuth={(mode) => openAuth(mode, authRole)} onOpenPublish={() => { setAuthRole('CLIENTE'); setShowPublishModal(true); }} onOpenWallet={() => setActiveTab('billetera')} onOpenNotifications={() => setShowNotificationsModal(true)} onOpenMessages={() => setChatParams({ serviceId: '', receiverId: '' })} onOpenProfile={() => setActiveTab('perfil')} onOpenVerification={() => setShowVerificationModal(true)} onOpenDisputes={() => setDisputeServiceId('')} onOpenPolicies={() => setShowPoliciesModal(true)} onNavigateTab={(tab) => setActiveTab(tab)} activeTab={activeTab} />
    <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-12 overflow-x-hidden">
      {!user && activeTab === 'inicio' && <><section className="mb-6 rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7"><div className="text-center mb-5"><p className="text-xs font-black uppercase tracking-widest text-blue-600">SERVIYA</p><h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">¿Cómo vas a usar SERVIYA?</h2><p className="text-sm text-slate-500 mt-2">Elige tu rol para entrar a la experiencia correspondiente.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><button onClick={() => openAuth('login','CLIENTE')} className="text-left rounded-2xl border-2 border-blue-200 bg-blue-50 p-5"><p className="text-xs font-black text-blue-700 uppercase">ROL CLIENTE</p><h3 className="text-xl font-black text-slate-900 mt-1">Soy Cliente</h3><p className="text-sm text-slate-600 mt-2">Publicar servicios, buscar trabajadores, contratar, pagar mediante Custodia SERVIYA y confirmar trabajos.</p><span className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Ingresar como Cliente</span></button><button onClick={() => openAuth('login','TRABAJADOR')} className="text-left rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-black text-emerald-700 uppercase">ROL TRABAJADOR / TÉCNICO</p><h3 className="text-xl font-black text-slate-900 mt-1">Soy Trabajador / Técnico</h3><p className="text-sm text-slate-600 mt-2">Buscar trabajos, postularse, gestionar trabajos asignados, enviar evidencia y solicitar retiros.</p><span className="inline-block mt-4 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Ingresar como Trabajador / Técnico</span></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3"><button onClick={() => openAuth('register','CLIENTE')} className="text-xs font-bold text-blue-700 py-2">Crear cuenta de Cliente</button><button onClick={() => openAuth('register','TRABAJADOR')} className="text-xs font-bold text-emerald-700 py-2">Crear cuenta de Trabajador / Técnico</button></div></section><LandingSection services={services} workers={[]} onSelectCategory={() => setActiveTab('buscar')} onSelectService={openService} onOpenPublish={() => openAuth('login','CLIENTE')} onNavigateTab={setActiveTab} /></>}
      {user && !isWorker && activeTab === 'inicio' && <div className="space-y-6"><section className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl"><p className="text-blue-300 text-xs font-bold uppercase tracking-widest">SERVIYA • CLIENTE</p><h1 className="text-2xl sm:text-3xl font-black mt-1">Encuentra al profesional que necesitas.</h1><p className="text-slate-300 text-sm mt-2 max-w-2xl">Publica tu servicio, recibe propuestas y paga con Custodia SERVIYA. Tus fondos permanecen protegidos hasta que confirmes el trabajo y administración apruebe la liberación.</p><div className="flex flex-wrap gap-2 mt-5"><button onClick={() => setActiveTab('buscar')} className="bg-blue-600 px-4 py-2.5 rounded-xl text-sm font-bold">Buscar servicios</button><button onClick={() => setActiveTab('trabajadores')} className="bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold">Buscar trabajadores</button><button onClick={() => setShowPublishModal(true)} className="bg-white text-slate-900 px-4 py-2.5 rounded-xl text-sm font-bold">Publicar servicio</button></div></section><section><div className="flex items-center justify-between mb-3"><h2 className="font-black text-lg">Mis servicios</h2><span className="text-xs text-slate-500">{clientServices.length} registrados</span></div>{clientServices.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{clientServices.map(s => <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><button onClick={() => openService(s)} className="text-left w-full"><p className="text-xs text-blue-700 font-bold">{s.category_name}</p><h3 className="font-bold mt-1">{s.title}</h3><p className="text-sm text-slate-500 mt-1">RD$ {Number(s.price_rd).toLocaleString()} • {s.status}</p></button>{s.images?.length>0&&<button onClick={()=>setPhotoService(s)} className="mt-3 text-xs font-bold text-blue-700">📷 Ver fotos ({s.images.length})</button>}</div>)}</div> : <div className="bg-white rounded-2xl p-6 border border-slate-200 text-sm text-slate-500">Todavía no has publicado servicios.</div>}</section></div>}
      {user && isWorker && activeTab === 'inicio' && <div className="space-y-6"><section className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl"><p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">SERVIYA • TRABAJADOR / TÉCNICO</p><h1 className="text-2xl sm:text-3xl font-black mt-1">Encuentra trabajos y administra tus servicios.</h1><p className="text-slate-300 text-sm mt-2 max-w-2xl">Postúlate a servicios, gestiona los trabajos que aceptes y cobra mediante la Billetera SERVIYA.</p><div className="flex flex-wrap gap-2 mt-5"><button onClick={() => setActiveTab('buscar')} className="bg-blue-600 px-4 py-2.5 rounded-xl text-sm font-bold">Buscar trabajos</button><button onClick={() => setActiveTab('mis-servicios')} className="bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold">Mis trabajos</button><button onClick={() => setActiveTab('billetera')} className="bg-emerald-600 px-4 py-2.5 rounded-xl text-sm font-bold">Mi billetera</button></div></section><section className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="bg-white rounded-2xl p-5 border border-slate-200"><p className="text-xs text-slate-500">Trabajos asignados</p><p className="text-2xl font-black mt-1">{workerServices.length}</p></div><div className="bg-white rounded-2xl p-5 border border-slate-200"><p className="text-xs text-slate-500">Disponibles ahora</p><p className="text-2xl font-black mt-1">{availableServices.length}</p></div><div className="bg-white rounded-2xl p-5 border border-slate-200"><p className="text-xs text-slate-500">Verificación</p><p className="text-sm font-bold mt-2">{user.is_verified ? '✓ Verificado' : 'Pendiente'}</p></div></section></div>}
      {user && activeTab === 'buscar' && <ServicesView services={isWorker ? availableServices : services} onSelectService={openService} onOpenPublish={() => setShowPublishModal(true)} />}
      {user && !isWorker && activeTab === 'trabajadores' && <WorkersView />}
      {user && isWorker && activeTab === 'mis-servicios' && <section className="space-y-4"><div className="bg-white rounded-3xl p-6 border border-slate-200"><p className="text-emerald-700 text-xs font-bold uppercase">TRABAJADOR / TÉCNICO</p><h1 className="text-2xl font-black mt-1">Mis trabajos</h1><p className="text-sm text-slate-500 mt-1">Servicios que tienes asignados o en proceso.</p></div>{workerServices.length?<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{workerServices.map(s=><div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><button onClick={()=>openService(s)} className="text-left w-full"><h3 className="font-bold">{s.title}</h3><p className="text-sm text-slate-500 mt-1">RD$ {Number(s.price_rd).toLocaleString()} • {s.status}</p></button><button onClick={()=>setPhotoService(s)} className="mt-3 inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">Subir fotos del trabajo</button></div>)}</div>:<div className="bg-white rounded-2xl p-6 text-sm text-slate-500 border border-slate-200">No tienes trabajos asignados todavía.</div>}</section>}
      {user && activeTab === 'billetera' && <WalletView />}
      {user && activeTab === 'perfil' && <ProfileView onOpenVerification={() => setShowVerificationModal(true)} />}
    </main>
    {user&&<BottomNav activeTab={activeTab} onNavigateTab={setActiveTab} onOpenPublish={()=>setShowPublishModal(true)} onOpenWallet={()=>setActiveTab('billetera')} onOpenProfile={()=>setActiveTab('perfil')} onOpenAuth={(mode)=>openAuth(mode,authRole)} onOpenMessages={()=>setChatParams({serviceId:'',receiverId:''})} onOpenNotifications={()=>setShowNotificationsModal(true)} onOpenVerification={()=>setShowVerificationModal(true)} onOpenDisputes={()=>setDisputeServiceId('')} onOpenPolicies={()=>setShowPoliciesModal(true)} />}
    {selectedService&&<MobileServiceDetailModal service={selectedService} onClose={()=>setSelectedService(null)} onRefresh={fetchServices} onOpenChat={openChat} onOpenDispute={sId=>setDisputeServiceId(sId)} />}
    {selectedService&&user&&<WorkFlowActions service={selectedService} onRefresh={fetchServices} onOpenChat={openChat} />}
    {photoService&&<WorkPhotosModal service={photoService} onClose={()=>setPhotoService(null)} onRefresh={fetchServices} />}
    {showPublishModal&&user&&!isWorker&&<PublishServiceModal onClose={()=>setShowPublishModal(false)} onSuccess={fetchServices} />}
    {authModalMode&&<AuthModal initialMode={authModalMode} initialRole={authRole} onClose={()=>setAuthModalMode(null)} />}
    {chatParams&&<MessagesModal serviceId={chatParams.serviceId} receiverId={chatParams.receiverId} onClose={()=>setChatParams(null)} />}
    {showNotificationsModal&&<NotificationsModal onClose={()=>setShowNotificationsModal(false)} />}
    {showVerificationModal&&user&&isWorker&&<VerificationModal onClose={()=>setShowVerificationModal(false)} />}
    {showPoliciesModal&&<PoliciesModal onClose={()=>setShowPoliciesModal(false)} />}
    {disputeServiceId!==null&&user&&<DisputesModal serviceId={disputeServiceId||undefined} onClose={()=>setDisputeServiceId(null)} />}
    {reviewParams&&<ReviewsModal serviceId={reviewParams.serviceId} targetUserId={reviewParams.targetUserId} onClose={()=>setReviewParams(null)} />}
  </div>;
};
export const App:React.FC=()=> <AuthProvider><WalletProvider><NotificationProvider><AppContent/></NotificationProvider></WalletProvider></AuthProvider>;
export default App;
