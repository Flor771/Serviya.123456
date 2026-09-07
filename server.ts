import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initial Platform Settings
let platformSettings = {
  platform_commission_percent: Number(process.env.PLATFORM_COMMISSION_PERCENT) || 8.0,
  min_withdrawal_rd: 500,
  min_service_price_rd: 300,
  support_phone: '809-555-7378',
  support_email: 'soporte@serviya.do'
};

// Seed Data for Dominican Republic Marketplace
const USERS: any[] = [
  {
    id: 'user-admin-1',
    first_name: 'Admin',
    last_name: 'SERVIYA.do',
    email: 'admin@serviya.do',
    phone: '809-555-0100',
    cedula: '001-0000000-0',
    role: 'ADMIN',
    activeRole: 'ADMIN',
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo de Guzmán (DN)',
    bio: 'Administrador general del sistema SERVIYA.do',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    created_at: new Date().toISOString(),
    rating: 5.0,
    jobs_completed: 100,
    is_verified: true,
    token: 'jwt-admin-token-secret-123'
  },
  {
    id: 'user-client-1',
    first_name: 'Carlos',
    last_name: 'Mendoza',
    email: 'carlos.mendoza@gmail.com',
    phone: '829-455-8822',
    cedula: '001-1829384-2',
    role: 'CLIENTE',
    activeRole: 'CLIENTE',
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo de Guzmán (DN)',
    bio: 'Residente en Piantini. Busco personal confiable para mantenimiento de hogar.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    created_at: new Date().toISOString(),
    rating: 4.9,
    jobs_completed: 12,
    is_verified: true,
    token: 'jwt-client-token-secret-456'
  },
  {
    id: 'user-worker-1',
    first_name: 'Juan Miguel',
    last_name: 'Pérez Santos',
    email: 'juan.perez@serviya.do',
    phone: '809-688-9911',
    cedula: '001-0891234-5',
    role: 'TRABAJADOR',
    activeRole: 'TRABAJADOR',
    province: 'Santo Domingo',
    municipality: 'Santo Domingo Este',
    bio: 'Técnico certificado en plomería e instalación de tinacos y bombas de agua con 10 años de experiencia.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    created_at: new Date().toISOString(),
    rating: 4.95,
    jobs_completed: 48,
    is_verified: true,
    token: 'jwt-worker-token-secret-789',
    worker_profile: {
      id: 'wp-1',
      user_id: 'user-worker-1',
      profession: 'Plomero Maestro y Técnico en Tinacos',
      specialties: ['Instalaciones de Baño', 'Destape de Drenajes', 'Bombas de Agua', 'Fugas'],
      experience_years: 10,
      hourly_rate_rd: 800,
      availability: 'TIEMPO_COMPLETO',
      portfolio_images: [
        'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'
      ],
      certifications: ['Título Infotep Plomería Residencial', 'Licencia de Instalaciones Sanitarias'],
      verification_status: 'VERIFICADO'
    }
  },
  {
    id: 'user-worker-2',
    first_name: 'Dahiana',
    last_name: 'Rodríguez',
    email: 'dahiana.limpieza@gmail.com',
    phone: '829-333-1212',
    cedula: '031-0023412-8',
    role: 'TRABAJADOR',
    activeRole: 'TRABAJADOR',
    province: 'Santiago',
    municipality: 'Santiago de los Caballeros',
    bio: 'Servicios de limpieza profesional profunda, planchado y desinfección residencial.',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    created_at: new Date().toISOString(),
    rating: 4.88,
    jobs_completed: 35,
    is_verified: true,
    token: 'jwt-worker-token-secret-999',
    worker_profile: {
      id: 'wp-2',
      user_id: 'user-worker-2',
      profession: 'Especialista en Limpieza Residencial',
      specialties: ['Limpieza Profunda', 'Organización', 'Planchado', 'Post-Construcción'],
      experience_years: 6,
      hourly_rate_rd: 600,
      availability: 'TIEMPO_COMPLETO',
      portfolio_images: [
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600'
      ],
      certifications: ['Certificación Limpieza e Higiene Profesional'],
      verification_status: 'VERIFICADO'
    }
  }
];

const WALLETS: Record<string, any> = {
  'user-admin-1': { id: 'w-admin', user_id: 'user-admin-1', available_rd: 15400, escrow_rd: 0, pending_rd: 0, total_received_rd: 45000, total_spent_rd: 0, updated_at: new Date().toISOString() },
  'user-client-1': { id: 'w-client-1', user_id: 'user-client-1', available_rd: 8500, escrow_rd: 2500, pending_rd: 0, total_received_rd: 15000, total_spent_rd: 6500, updated_at: new Date().toISOString() },
  'user-worker-1': { id: 'w-worker-1', user_id: 'user-worker-1', available_rd: 12800, escrow_rd: 2300, pending_rd: 0, total_received_rd: 38400, total_spent_rd: 1200, updated_at: new Date().toISOString() },
  'user-worker-2': { id: 'w-worker-2', user_id: 'user-worker-2', available_rd: 5400, escrow_rd: 0, pending_rd: 0, total_received_rd: 18000, total_spent_rd: 500, updated_at: new Date().toISOString() }
};

const WALLET_TRANSACTIONS: any[] = [
  {
    id: 'tx-101',
    wallet_id: 'w-client-1',
    user_id: 'user-client-1',
    type: 'depósito',
    amount_rd: 10000,
    description: 'Recarga de saldo con Tarjeta Visa **** 4821',
    reference: 'REF-DEP-8831',
    status: 'EXITOSO',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'tx-102',
    wallet_id: 'w-client-1',
    user_id: 'user-client-1',
    type: 'pago',
    amount_rd: 2500,
    description: 'Pago retenido en custodia para Servicio: Instalación de Calentador y Tinaco',
    reference: 'ESCROW-SERV-01',
    status: 'EXITOSO',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const SERVICES: any[] = [
  {
    id: 'serv-101',
    title: 'Instalación y revisión de Tinaco 500G y Calentador',
    description: 'Necesito un plomero capacitado para instalar un tinaco de 500 galones en el techo de la casa de 2 niveles y revisar la presión del calentador de agua.',
    category_id: 'cat-plomeria',
    category_name: 'Plomería',
    subcategory: 'Tinacos y Cisternas',
    price_rd: 2500,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo de Guzmán (DN)',
    address_approx: 'Sector Bella Vista, cerca de la Av. Sarasota',
    service_date: '2026-09-10',
    service_time: '09:00 AM',
    estimated_duration: '4 horas',
    images: ['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800'],
    requirements: ['Traer herramientas propias de plomería', 'Experiencia en trabajos en altura'],
    payment_type: 'CUSTODIA_SERVIYA',
    status: 'EN_PROGRESO',
    client_id: 'user-client-1',
    client_name: 'Carlos Mendoza',
    client_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    client_rating: 4.9,
    worker_id: 'user-worker-1',
    worker_name: 'Juan Miguel Pérez Santos',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    applications_count: 3
  },
  {
    id: 'serv-102',
    title: 'Limpieza profunda de apartamento 3 habitaciones',
    description: 'Se solicita persona de confianza para limpieza profunda de apartamento en Evaristo Morales: cristales, cocina, baños y balcón.',
    category_id: 'cat-limpieza',
    category_name: 'Limpieza',
    subcategory: 'Hogar',
    price_rd: 1800,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo de Guzmán (DN)',
    address_approx: 'Evaristo Morales, Santo Domingo',
    service_date: '2026-09-12',
    service_time: '08:30 AM',
    estimated_duration: '6 horas',
    images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'],
    requirements: ['Productos de limpieza incluidos', 'Referencia comprobable'],
    payment_type: 'CUSTODIA_SERVIYA',
    status: 'PUBLICADA',
    client_id: 'user-client-1',
    client_name: 'Carlos Mendoza',
    client_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    client_rating: 4.9,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    applications_count: 1
  },
  {
    id: 'serv-103',
    title: 'Mantenimiento e instalación de 2 Aires Acondicionados Inverter',
    description: 'Requiero técnico para mantenimiento preventivo y limpieza de 2 split inverter 12k BTU en Santiago.',
    category_id: 'cat-reparaciones',
    category_name: 'Reparaciones',
    subcategory: 'Aires Acondicionados',
    price_rd: 3200,
    province: 'Santiago',
    municipality: 'Santiago de los Caballeros',
    address_approx: 'Villa Olga, Santiago',
    service_date: '2026-09-15',
    service_time: '02:00 PM',
    estimated_duration: '3 horas',
    images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800'],
    requirements: ['Lona de recolección de agua y bomba de presión'],
    payment_type: 'CUSTODIA_SERVIYA',
    status: 'PUBLICADA',
    client_id: 'user-client-1',
    client_name: 'Carlos Mendoza',
    client_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    client_rating: 4.9,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    applications_count: 2
  }
];

const APPLICATIONS: any[] = [
  {
    id: 'app-201',
    service_id: 'serv-101',
    worker_id: 'user-worker-1',
    worker_name: 'Juan Miguel Pérez Santos',
    worker_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    worker_profession: 'Plomero Maestro y Técnico en Tinacos',
    worker_rating: 4.95,
    worker_is_verified: true,
    message: 'Saludos Don Carlos. Tengo disponibilidad para realizar la instalación este jueves. Incluyo chequeo de válvulas y prueba de presión.',
    offered_price_rd: 2500,
    availability_note: 'Disponible desde temprano 8:00 AM',
    status: 'SELECCIONADO',
    created_at: new Date(Date.now() - 86400000 * 1.5).toISOString()
  },
  {
    id: 'app-202',
    service_id: 'serv-102',
    worker_id: 'user-worker-2',
    worker_name: 'Dahiana Rodríguez',
    worker_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    worker_profession: 'Especialista en Limpieza Residencial',
    worker_rating: 4.88,
    worker_is_verified: true,
    message: 'Buenas tardes. Cuento con equipo completo para dejar su apartamento imponente. Quedo a sus órdenes.',
    offered_price_rd: 1800,
    availability_note: 'Disponibilidad inmediata para la fecha solicitada',
    status: 'PENDIENTE',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

const ESCROW_RECORDS: any[] = [
  {
    id: 'escrow-1',
    service_id: 'serv-101',
    client_id: 'user-client-1',
    worker_id: 'user-worker-1',
    total_amount_rd: 2500,
    commission_rate_percent: 8.0,
    commission_amount_rd: 200,
    worker_payout_rd: 2300,
    status: 'RETENIDO',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const REVIEWS: any[] = [
  {
    id: 'rev-1',
    service_id: 'serv-00',
    reviewer_id: 'user-client-1',
    reviewer_name: 'Carlos Mendoza',
    reviewer_role: 'CLIENTE',
    target_user_id: 'user-worker-1',
    rating: 5,
    comment: 'Excelente trabajo de plomería. Muy puntual, pulcro y respetuoso. Altamente recomendado en SERVIYA.do!',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString()
  }
];

const NOTIFICATIONS: any[] = [
  {
    id: 'notif-1',
    user_id: 'user-client-1',
    title: 'Nueva postulación recibida',
    message: 'Juan Miguel Pérez se ha postulado para tu servicio de Plomería en Bella Vista.',
    type: 'APPLICATION',
    read: false,
    related_entity_id: 'serv-101',
    created_at: new Date().toISOString()
  },
  {
    id: 'notif-2',
    user_id: 'user-worker-1',
    title: '¡Te han contratado!',
    message: 'Carlos Mendoza ha seleccionado tu propuesta y los fondos están protegidos en Custodia SERVIYA.',
    type: 'HIRED',
    read: true,
    related_entity_id: 'serv-101',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

const MESSAGES: any[] = [
  {
    id: 'msg-1',
    service_id: 'serv-101',
    sender_id: 'user-client-1',
    sender_name: 'Carlos Mendoza',
    receiver_id: 'user-worker-1',
    content: 'Hola Juan, ¿pudiste ver la dirección exacta en Bella Vista?',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'msg-2',
    service_id: 'serv-101',
    sender_id: 'user-worker-1',
    sender_name: 'Juan Miguel Pérez Santos',
    receiver_id: 'user-client-1',
    content: 'Sí Don Carlos, conozco bien el área. Estaré puntual el jueves a las 9 AM con todos los insumos.',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

const VERIFICATIONS: any[] = [
  {
    id: 'ver-1',
    user_id: 'user-worker-1',
    user_name: 'Juan Miguel Pérez Santos',
    user_phone: '809-688-9911',
    document_type: 'CEDULA_FRONTAL',
    document_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
    status: 'VERIFICADO',
    submitted_at: new Date(Date.now() - 86400000 * 15).toISOString()
  }
];

const DISPUTES: any[] = [];
const WITHDRAWALS: any[] = [];
const PAYMENT_TRANSACTIONS: any[] = [];
const CONTRACTS: any[] = [];
const AUDIT_LOGS: any[] = [];

const PAYMENT_MODE = process.env.PAYMENT_MODE || 'simulation';

// Helper for audit logging
const logAudit = (userId: string | null, action: string, details: string) => {
  AUDIT_LOGS.unshift({
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user_id: userId,
    action,
    details,
    created_at: new Date().toISOString()
  });
};

// Simulation Payment Provider Abstraction Class
class SimulationPaymentProvider {
  static createPayment(params: {
    userId: string;
    amountRd: number;
    paymentMethod: string;
    serviceId?: string;
    contractId?: string;
  }) {
    const tx = {
      transaction_id: `pay-sim-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: params.userId,
      service_id: params.serviceId,
      contract_id: params.contractId,
      amount: params.amountRd,
      currency: 'DOP',
      payment_method: params.paymentMethod || 'TARJETA_SIMULADA',
      provider: 'SimulationPaymentProvider',
      status: 'SUCCEEDED',
      reference: `REF-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      mode: PAYMENT_MODE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    PAYMENT_TRANSACTIONS.unshift(tx);
    logAudit(params.userId, 'PAYMENT_SIMULATED', `Pago simulado procesado por RD$ ${params.amountRd} (${params.paymentMethod})`);
    return tx;
  }

  static refundPayment(transactionId: string, amountRd: number, userId: string) {
    const tx = PAYMENT_TRANSACTIONS.find(t => t.transaction_id === transactionId);
    if (tx) {
      tx.status = 'REFUNDED';
      tx.updated_at = new Date().toISOString();
    }
    logAudit(userId, 'REFUND_PROCESSED', `Reembolso simulado de RD$ ${amountRd} para transacción ${transactionId}`);
  }
}

// API Router
const apiRouter = express.Router();

// Helper to find user by header or auth simulation
const getCurrentUser = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return USERS[1]; // default client
  const token = authHeader.replace('Bearer ', '');
  const user = USERS.find(u => u.token === token || u.id === token);
  return user || USERS[1];
};

// Middleware: Require Admin
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
};

// --- AUTH ENDPOINTS ---
apiRouter.post('/auth/register', (req, res) => {
  const { first_name, last_name, email, phone, password, role, province, municipality, cedula } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Por favor completa todos los campos obligatorios.' });
  }

  const existing = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una cuenta con este correo electrónico.' });
  }

  const chosenRole = role === 'TRABAJADOR' ? 'TRABAJADOR' : 'CLIENTE';

  const newUser: any = {
    id: `user-${Date.now()}`,
    first_name,
    last_name,
    email,
    phone: phone || '809-000-0000',
    cedula: cedula || '',
    role: chosenRole,
    activeRole: chosenRole,
    province: province || 'Distrito Nacional',
    municipality: municipality || 'Santo Domingo de Guzmán (DN)',
    bio: chosenRole === 'TRABAJADOR' ? 'Profesional registrado en SERVIYA.do' : 'Cliente registrado en SERVIYA.do',
    avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
    created_at: new Date().toISOString(),
    rating: 5.0,
    jobs_completed: 0,
    is_verified: false,
    token: `jwt-token-${Date.now()}`
  };

  if (chosenRole === 'TRABAJADOR') {
    newUser.worker_profile = {
      id: `wp-${Date.now()}`,
      user_id: newUser.id,
      profession: req.body.profession || 'Servicios Generales',
      specialties: ['Servicios Varios'],
      experience_years: 1,
      hourly_rate_rd: 500,
      availability: 'TIEMPO_COMPLETO',
      portfolio_images: [],
      certifications: [],
      verification_status: 'SIN_VERIFICAR'
    };
  }

  USERS.push(newUser);

  // Initialize Wallet
  WALLETS[newUser.id] = {
    id: `w-${newUser.id}`,
    user_id: newUser.id,
    available_rd: 0,
    escrow_rd: 0,
    pending_rd: 0,
    total_received_rd: 0,
    total_spent_rd: 0,
    updated_at: new Date().toISOString()
  };

  res.json({ message: 'Registro exitoso', user: newUser, token: newUser.token });
});

apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas. Verifica tu email y contraseña.' });
  }

  res.json({ message: 'Inicio de sesión exitoso', user, token: user.token });
});

apiRouter.get('/auth/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user });
});

apiRouter.post('/auth/recover-password', (req, res) => {
  const { email } = req.body;
  res.json({ message: `Si el correo ${email} existe en SERVIYA.do, hemos enviado las instrucciones de recuperación.` });
});

apiRouter.post('/auth/role-toggle', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'ADMIN') return res.json({ user });
  user.activeRole = user.activeRole === 'CLIENTE' ? 'TRABAJADOR' : 'CLIENTE';
  res.json({ user });
});

// --- USER & WORKER PROFILE ---
apiRouter.get('/users/profile', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user });
});

apiRouter.put('/users/profile', (req, res) => {
  const user = getCurrentUser(req);
  const { first_name, last_name, phone, province, municipality, bio, avatar_url, profession, hourly_rate_rd } = req.body;

  if (first_name) user.first_name = first_name;
  if (last_name) user.last_name = last_name;
  if (phone) user.phone = phone;
  if (province) user.province = province;
  if (municipality) user.municipality = municipality;
  if (bio) user.bio = bio;
  if (avatar_url) user.avatar_url = avatar_url;

  if (user.worker_profile) {
    if (profession) user.worker_profile.profession = profession;
    if (hourly_rate_rd) user.worker_profile.hourly_rate_rd = Number(hourly_rate_rd);
  }

  res.json({ message: 'Perfil actualizado exitosamente', user });
});

apiRouter.get('/users/workers', (req, res) => {
  const { query, province, is_verified } = req.query;
  let workers = USERS.filter(u => u.role === 'TRABAJADOR' || u.worker_profile);

  if (province) {
    workers = workers.filter(w => w.province === String(province));
  }
  if (is_verified === 'true') {
    workers = workers.filter(w => w.is_verified);
  }
  if (query) {
    const q = String(query).toLowerCase();
    workers = workers.filter(w =>
      w.first_name.toLowerCase().includes(q) ||
      w.last_name.toLowerCase().includes(q) ||
      (w.worker_profile?.profession && w.worker_profile.profession.toLowerCase().includes(q))
    );
  }

  res.json({ workers });
});

// --- SERVICES ENDPOINTS ---
apiRouter.get('/services', (req, res) => {
  const { category, province, min_price, max_price, query, status, client_id } = req.query;
  let list = [...SERVICES];

  if (category) {
    list = list.filter(s => s.category_id === category || s.category_name.toLowerCase() === String(category).toLowerCase());
  }
  if (province) {
    list = list.filter(s => s.province === province);
  }
  if (min_price) {
    list = list.filter(s => s.price_rd >= Number(min_price));
  }
  if (max_price) {
    list = list.filter(s => s.price_rd <= Number(max_price));
  }
  if (client_id) {
    list = list.filter(s => s.client_id === client_id);
  }
  if (status) {
    list = list.filter(s => s.status === status);
  }
  if (query) {
    const q = String(query).toLowerCase();
    list = list.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category_name.toLowerCase().includes(q) ||
      s.province.toLowerCase().includes(q)
    );
  }

  res.json({ services: list });
});

apiRouter.post('/services', (req, res) => {
  const user = getCurrentUser(req);
  const { title, description, category_id, category_name, subcategory, price_rd, province, municipality, address_approx, service_date, service_time, estimated_duration, images, requirements, payment_type } = req.body;

  if (!title || !description || !price_rd) {
    return res.status(400).json({ error: 'Proporciona un título, descripción y precio estimado.' });
  }

  const newService: any = {
    id: `serv-${Date.now()}`,
    title,
    description,
    category_id: category_id || 'cat-otros',
    category_name: category_name || 'Otros Servicios',
    subcategory: subcategory || 'Varios',
    price_rd: Number(price_rd),
    province: province || user.province,
    municipality: municipality || user.municipality,
    address_approx: address_approx || 'Dirección aproximada proporcionada',
    service_date: service_date || new Date().toISOString().split('T')[0],
    service_time: service_time || '09:00 AM',
    estimated_duration: estimated_duration || 'Por definir',
    images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'],
    requirements: requirements || [],
    payment_type: payment_type || 'CUSTODIA_SERVIYA',
    status: 'PUBLICADA',
    client_id: user.id,
    client_name: `${user.first_name} ${user.last_name}`,
    client_avatar: user.avatar_url,
    client_rating: user.rating,
    created_at: new Date().toISOString(),
    applications_count: 0
  };

  SERVICES.unshift(newService);
  res.json({ message: 'Servicio publicado correctamente en SERVIYA.do', service: newService });
});

apiRouter.get('/services/:id', (req, res) => {
  const serv = SERVICES.find(s => s.id === req.params.id);
  if (!serv) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json({ service: serv });
});

// --- APPLICATIONS ENDPOINTS ---
apiRouter.post('/applications', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id, message, offered_price_rd, availability_note } = req.body;

  const service = SERVICES.find(s => s.id === service_id);
  if (!service) return res.status(404).json({ error: 'Trabajo no encontrado' });

  const existingApp = APPLICATIONS.find(a => a.service_id === service_id && a.worker_id === user.id);
  if (existingApp) {
    return res.status(400).json({ error: 'Ya te has postulado previamente a este trabajo.' });
  }

  const newApp: any = {
    id: `app-${Date.now()}`,
    service_id,
    worker_id: user.id,
    worker_name: `${user.first_name} ${user.last_name}`,
    worker_avatar: user.avatar_url,
    worker_profession: user.worker_profile?.profession || 'Profesional de Servicios',
    worker_rating: user.rating,
    worker_is_verified: user.is_verified,
    message: message || 'Interesado en realizar el trabajo con alta calidad.',
    offered_price_rd: Number(offered_price_rd) || service.price_rd,
    availability_note: availability_note || 'Disponibilidad inmediata',
    status: 'PENDIENTE',
    created_at: new Date().toISOString()
  };

  APPLICATIONS.push(newApp);
  service.applications_count += 1;
  if (service.status === 'PUBLICADA') {
    service.status = 'RECIBIENDO_POSTULACIONES';
  }

  // Notify client
  NOTIFICATIONS.unshift({
    id: `notif-${Date.now()}`,
    user_id: service.client_id,
    title: '¡Nueva postulación recibida!',
    message: `${user.first_name} se ha postulado para tu trabajo: ${service.title}`,
    type: 'APPLICATION',
    read: false,
    related_entity_id: service.id,
    created_at: new Date().toISOString()
  });

  res.json({ message: 'Postulación enviada con éxito.', application: newApp });
});

apiRouter.get('/services/:id/applications', (req, res) => {
  const apps = APPLICATIONS.filter(a => a.service_id === req.params.id);
  res.json({ applications: apps });
});

apiRouter.post('/applications/:id/select', (req, res) => {
  const user = getCurrentUser(req);
  const appItem = APPLICATIONS.find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Postulación no encontrada' });

  const service = SERVICES.find(s => s.id === appItem.service_id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  appItem.status = 'SELECCIONADO';
  service.status = 'TRABAJADOR_SELECCIONADO';
  service.worker_id = appItem.worker_id;
  service.worker_name = appItem.worker_name;

  // Notify worker
  NOTIFICATIONS.unshift({
    id: `notif-${Date.now()}`,
    user_id: appItem.worker_id,
    title: '¡Has sido seleccionado!',
    message: `El cliente te ha seleccionado para el servicio "${service.title}". Revisa tus instrucciones.`,
    type: 'HIRED',
    read: false,
    related_entity_id: service.id,
    created_at: new Date().toISOString()
  });

  res.json({ message: 'Trabajador seleccionado. Procede con el depósito en Custodia SERVIYA.', service });
});

// --- CONTRACTS ENDPOINTS ---
apiRouter.get('/contracts', (req, res) => {
  const user = getCurrentUser(req);
  const userContracts = CONTRACTS.filter(c => c.client_id === user.id || c.worker_id === user.id);
  res.json({ contracts: userContracts });
});

apiRouter.get('/contracts/:id', (req, res) => {
  const user = getCurrentUser(req);
  const contract = CONTRACTS.find(c => c.id === req.params.id && (c.client_id === user.id || c.worker_id === user.id || user.role === 'ADMIN'));
  if (!contract) return res.status(404).json({ error: 'Contrato no encontrado o no tienes permiso' });
  res.json({ contract });
});

apiRouter.post('/contracts/:id/confirm-completion', (req, res) => {
  const user = getCurrentUser(req);
  const contract = CONTRACTS.find(c => c.id === req.params.id && (c.client_id === user.id || user.role === 'ADMIN'));
  if (!contract) return res.status(404).json({ error: 'Contrato no encontrado' });

  contract.status = 'COMPLETED';
  contract.completed_at = new Date().toISOString();

  // Find associated escrow
  const escrowItem = ESCROW_RECORDS.find(e => e.service_id === contract.service_id && e.status === 'RETENIDO');
  if (escrowItem) {
    escrowItem.status = 'LIBERADO';
    escrowItem.released_at = new Date().toISOString();

    let clientWallet = WALLETS[contract.client_id];
    if (clientWallet) {
      clientWallet.escrow_rd = Math.max(0, clientWallet.escrow_rd - escrowItem.total_amount_rd);
    }

    let workerWallet = WALLETS[contract.worker_id];
    if (!workerWallet) {
      workerWallet = { id: `w-${contract.worker_id}`, user_id: contract.worker_id, available_rd: 0, escrow_rd: 0, pending_rd: 0, total_received_rd: 0, total_spent_rd: 0, updated_at: new Date().toISOString() };
      WALLETS[contract.worker_id] = workerWallet;
    }

    workerWallet.available_rd += escrowItem.worker_payout_rd;
    workerWallet.total_received_rd += escrowItem.worker_payout_rd;

    let adminWallet = WALLETS['user-admin-1'];
    if (adminWallet) {
      adminWallet.available_rd += escrowItem.commission_amount_rd;
      adminWallet.total_received_rd += escrowItem.commission_amount_rd;
    }

    WALLET_TRANSACTIONS.unshift({
      id: `tx-${Date.now()}-w`,
      wallet_id: workerWallet.id,
      user_id: contract.worker_id,
      type: 'liberación',
      amount_rd: escrowItem.worker_payout_rd,
      description: `Pago liberado por finalización de contrato (${contract.id})`,
      reference: `REL-${escrowItem.id}`,
      status: 'EXITOSO',
      created_at: new Date().toISOString()
    });
  }

  const service = SERVICES.find(s => s.id === contract.service_id);
  if (service) service.status = 'COMPLETADA';

  logAudit(user.id, 'CONTRACT_COMPLETED', `Contrato ${contract.id} confirmado como completado. Fondos liberados.`);
  res.json({ message: 'Contrato completado y pago liberado al trabajador exitosamente.', contract });
});

apiRouter.post('/payments/refund', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id, reason } = req.body;

  const service = SERVICES.find(s => s.id === service_id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  const escrowItem = ESCROW_RECORDS.find(e => e.service_id === service_id && e.status === 'RETENIDO');
  if (!escrowItem) return res.status(400).json({ error: 'No se encontró pago retenido en custodia para este servicio' });

  escrowItem.status = 'REEMBOLSADO';

  let clientWallet = WALLETS[escrowItem.client_id];
  if (clientWallet) {
    clientWallet.escrow_rd = Math.max(0, clientWallet.escrow_rd - escrowItem.total_amount_rd);
    clientWallet.available_rd += escrowItem.total_amount_rd;
    clientWallet.updated_at = new Date().toISOString();
  }

  service.status = 'CANCELADA';

  WALLET_TRANSACTIONS.unshift({
    id: `tx-ref-${Date.now()}`,
    wallet_id: clientWallet ? clientWallet.id : `w-${user.id}`,
    user_id: escrowItem.client_id,
    type: 'depósito',
    amount_rd: escrowItem.total_amount_rd,
    description: `Reembolso de Custodia por cancelación de "${service.title}" - Motivo: ${reason || 'Solicitud cliente'}`,
    reference: `REFUND-${escrowItem.id}`,
    status: 'EXITOSO',
    created_at: new Date().toISOString()
  });

  logAudit(user.id, 'ESCROW_REFUNDED', `Custodia ${escrowItem.id} reembolsada al cliente ${escrowItem.client_id}`);
  res.json({ message: 'Fondos en custodia reembolsados exitosamente al cliente.', escrow: escrowItem });
});

// --- WALLET & PAYMENTS ENDPOINTS ---
apiRouter.get('/wallet', (req, res) => {
  const user = getCurrentUser(req);
  let wallet = WALLETS[user.id];
  if (!wallet) {
    wallet = {
      id: `w-${user.id}`,
      user_id: user.id,
      available_rd: 5000,
      escrow_rd: 0,
      pending_rd: 0,
      total_received_rd: 5000,
      total_spent_rd: 0,
      updated_at: new Date().toISOString()
    };
    WALLETS[user.id] = wallet;
  }

  const txs = WALLET_TRANSACTIONS.filter(t => t.user_id === user.id);
  res.json({ wallet, transactions: txs });
});

apiRouter.post('/wallet/deposit', (req, res) => {
  const user = getCurrentUser(req);
  const { amount_rd, method, card_last_4 } = req.body;
  const amount = Number(amount_rd);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Ingresa un monto válido para depositar.' });
  }

  let wallet = WALLETS[user.id];
  if (!wallet) {
    wallet = { id: `w-${user.id}`, user_id: user.id, available_rd: 0, escrow_rd: 0, pending_rd: 0, total_received_rd: 0, total_spent_rd: 0, updated_at: new Date().toISOString() };
    WALLETS[user.id] = wallet;
  }

  wallet.available_rd += amount;
  wallet.total_received_rd += amount;
  wallet.updated_at = new Date().toISOString();

  const newTx: any = {
    id: `tx-${Date.now()}`,
    wallet_id: wallet.id,
    user_id: user.id,
    type: 'depósito',
    amount_rd: amount,
    description: `Recarga de fondos mediante ${method || 'Tarjeta de Débito/Crédito'} (${card_last_4 ? '**** ' + card_last_4 : 'RD$'})`,
    reference: `REF-DEP-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'EXITOSO',
    created_at: new Date().toISOString()
  };

  WALLET_TRANSACTIONS.unshift(newTx);

  res.json({ message: `Depósito de RD$ ${amount.toLocaleString()} procesado exitosamente.`, wallet, transaction: newTx });
});

apiRouter.post('/payments/escrow', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id, payment_method } = req.body;

  const service = SERVICES.find(s => s.id === service_id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  let clientWallet = WALLETS[user.id];
  if (!clientWallet || clientWallet.available_rd < service.price_rd) {
    return res.status(400).json({ error: `Saldo insuficiente en tu billetera. Requieres RD$ ${service.price_rd.toLocaleString()} disponibles.` });
  }

  // Deduct available, add to escrow
  clientWallet.available_rd -= service.price_rd;
  clientWallet.escrow_rd += service.price_rd;
  clientWallet.total_spent_rd += service.price_rd;
  clientWallet.updated_at = new Date().toISOString();

  const commissionRate = platformSettings.platform_commission_percent;
  const commissionAmount = Math.round(service.price_rd * (commissionRate / 100));
  const workerPayout = service.price_rd - commissionAmount;

  const newEscrow: any = {
    id: `escrow-${Date.now()}`,
    service_id: service.id,
    client_id: service.client_id,
    worker_id: service.worker_id || 'user-worker-1',
    total_amount_rd: service.price_rd,
    commission_rate_percent: commissionRate,
    commission_amount_rd: commissionAmount,
    worker_payout_rd: workerPayout,
    status: 'RETENIDO',
    created_at: new Date().toISOString()
  };

  ESCROW_RECORDS.push(newEscrow);
  service.status = 'EN_PROGRESO';

  // Contract record creation
  const newContract: any = {
    id: `contract-${Date.now()}`,
    service_id: service.id,
    client_id: service.client_id,
    worker_id: service.worker_id || 'user-worker-1',
    agreed_price_rd: service.price_rd,
    pricing_modality: service.pricing_modality || 'PRECIO_FIJO',
    job_scope: service.job_scope || 'TRABAJO_NORMAL',
    commission_percent: commissionRate,
    commission_amount_rd: commissionAmount,
    worker_payout_rd: workerPayout,
    status: 'FUNDED',
    created_at: new Date().toISOString(),
    start_date: new Date().toISOString()
  };

  CONTRACTS.push(newContract);

  // Simulation Payment Provider Execution
  const simTx = SimulationPaymentProvider.createPayment({
    userId: user.id,
    amountRd: service.price_rd,
    paymentMethod: payment_method || 'BILLETERA_SERVIYA',
    serviceId: service.id,
    contractId: newContract.id
  });

  // Transaction record
  WALLET_TRANSACTIONS.unshift({
    id: `tx-${Date.now()}`,
    wallet_id: clientWallet.id,
    user_id: user.id,
    type: 'pago',
    amount_rd: service.price_rd,
    description: `Retención en Custodia SERVIYA para "${service.title}" (Ref: ${simTx.reference})`,
    reference: `ESCROW-${newEscrow.id}`,
    status: 'EXITOSO',
    created_at: new Date().toISOString()
  });

  // Audit log
  logAudit(user.id, 'ESCROW_FUNDED', `Pago de RD$ ${service.price_rd} retenido en Custodia para servicio ${service.id}`);

  // Notify worker
  if (service.worker_id) {
    NOTIFICATIONS.unshift({
      id: `notif-${Date.now()}`,
      user_id: service.worker_id,
      title: '¡Pago retenido en Custodia!',
      message: `El cliente ha pagado RD$ ${service.price_rd.toLocaleString()} en custodia. Ya puedes iniciar la obra.`,
      type: 'ESCROW_FUNDED',
      read: false,
      related_entity_id: service.id,
      created_at: new Date().toISOString()
    });
  }

  res.json({
    message: 'Pago depositado en Custodia SERVIYA exitosamente. MODO SIMULACIÓN ACTIVO. El trabajo está ahora EN_PROGRESO.',
    service,
    escrow: newEscrow,
    contract: newContract,
    payment_transaction: simTx
  });
});

apiRouter.post('/payments/release', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id } = req.body;

  const service = SERVICES.find(s => s.id === service_id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  const escrowItem = ESCROW_RECORDS.find(e => e.service_id === service_id && e.status === 'RETENIDO');
  if (!escrowItem) return res.status(400).json({ error: 'No se encontró un pago en custodia retenido para este servicio.' });

  // Update Escrow
  escrowItem.status = 'LIBERADO';
  escrowItem.released_at = new Date().toISOString();

  // Update Client Wallet
  let clientWallet = WALLETS[service.client_id];
  if (clientWallet) {
    clientWallet.escrow_rd = Math.max(0, clientWallet.escrow_rd - escrowItem.total_amount_rd);
  }

  // Update Worker Wallet
  let workerWallet = WALLETS[escrowItem.worker_id];
  if (!workerWallet) {
    workerWallet = { id: `w-${escrowItem.worker_id}`, user_id: escrowItem.worker_id, available_rd: 0, escrow_rd: 0, pending_rd: 0, total_received_rd: 0, total_spent_rd: 0, updated_at: new Date().toISOString() };
    WALLETS[escrowItem.worker_id] = workerWallet;
  }

  workerWallet.available_rd += escrowItem.worker_payout_rd;
  workerWallet.total_received_rd += escrowItem.worker_payout_rd;
  workerWallet.updated_at = new Date().toISOString();

  // Update Admin Wallet (Commission)
  let adminWallet = WALLETS['user-admin-1'];
  if (adminWallet) {
    adminWallet.available_rd += escrowItem.commission_amount_rd;
    adminWallet.total_received_rd += escrowItem.commission_amount_rd;
  }

  service.status = 'COMPLETADA';

  // Worker transaction
  WALLET_TRANSACTIONS.unshift({
    id: `tx-${Date.now()}-w`,
    wallet_id: workerWallet.id,
    user_id: escrowItem.worker_id,
    type: 'liberación',
    amount_rd: escrowItem.worker_payout_rd,
    description: `Pago liberado de Custodia para "${service.title}" (Comisión SERVIYA: RD$ ${escrowItem.commission_amount_rd})`,
    reference: `REL-${escrowItem.id}`,
    status: 'EXITOSO',
    created_at: new Date().toISOString()
  });

  // Notify Worker
  NOTIFICATIONS.unshift({
    id: `notif-${Date.now()}`,
    user_id: escrowItem.worker_id,
    title: '¡Fondos liberados!',
    message: `Has recibido RD$ ${escrowItem.worker_payout_rd.toLocaleString()} disponibles en tu billetera.`,
    type: 'PAYMENT_RELEASED',
    read: false,
    related_entity_id: service.id,
    created_at: new Date().toISOString()
  });

  res.json({ message: 'Pago liberado con éxito al trabajador. Trabajo completado.', service });
});

apiRouter.post('/wallet/withdraw', (req, res) => {
  const user = getCurrentUser(req);

  // CRITICAL ROLE RULE: Only TRABAJADOR role can request bank withdrawals
  if (!user || user.role !== 'TRABAJADOR') {
    return res.status(403).json({ error: 'Acceso denegado. Solamente los usuarios con rol TRABAJADOR pueden solicitar retiros de fondos.' });
  }

  const { amount_rd, bank_name, account_type, account_number, account_holder_name, account_holder_cedula } = req.body;
  const amount = Number(amount_rd);

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Indica un monto válido para el retiro.' });
  }

  let wallet = WALLETS[user.id];
  if (!wallet || wallet.available_rd < amount) {
    return res.status(400).json({ error: 'Saldo disponible insuficiente para solicitar este retiro.' });
  }

  if (amount < platformSettings.min_withdrawal_rd) {
    return res.status(400).json({ error: `El monto mínimo de retiro es RD$ ${platformSettings.min_withdrawal_rd}.` });
  }

  // Prevent duplicate concurrent withdrawals that exceed available funds
  wallet.available_rd -= amount;
  wallet.pending_rd += amount;
  wallet.updated_at = new Date().toISOString();

  const newWithdrawal: any = {
    id: `with-${Date.now()}`,
    user_id: user.id,
    user_name: `${user.first_name} ${user.last_name}`,
    amount_rd: amount,
    bank_name,
    account_type,
    account_number,
    account_holder_name,
    account_holder_cedula,
    status: 'PENDIENTE',
    requested_at: new Date().toISOString()
  };

  WITHDRAWALS.unshift(newWithdrawal);

  WALLET_TRANSACTIONS.unshift({
    id: `tx-${Date.now()}`,
    wallet_id: wallet.id,
    user_id: user.id,
    type: 'retiro',
    amount_rd: amount,
    description: `Solicitud de retiro a ${bank_name} (${account_type}) - Cta: ${account_number}`,
    reference: `WITH-${newWithdrawal.id}`,
    status: 'PENDIENTE',
    created_at: new Date().toISOString()
  });

  logAudit(user.id, 'WITHDRAWAL_REQUESTED', `Trabajador ${user.id} solicitó retiro de RD$ ${amount} a ${bank_name}`);

  res.json({ message: 'Solicitud de retiro registrada. El pago se procesará en 24 horas hábiles.', withdrawal: newWithdrawal });
});

// --- MESSAGES ENDPOINTS ---
apiRouter.get('/messages/:service_id', (req, res) => {
  const user = getCurrentUser(req);
  const serviceId = req.params.service_id;

  // Protect messages: sender, receiver, service owner, assigned worker, or admin
  const msgs = MESSAGES.filter(m => m.service_id === serviceId && (
    m.sender_id === user.id ||
    m.receiver_id === user.id ||
    user.role === 'ADMIN'
  ));
  res.json({ messages: msgs });
});

apiRouter.post('/messages', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id, receiver_id, content } = req.body;

  if (!content) return res.status(400).json({ error: 'Escribe un mensaje.' });

  const newMsg: any = {
    id: `msg-${Date.now()}`,
    service_id,
    sender_id: user.id,
    sender_name: `${user.first_name} ${user.last_name}`,
    receiver_id,
    content,
    created_at: new Date().toISOString()
  };

  MESSAGES.push(newMsg);
  res.json({ message: newMsg });
});

// --- NOTIFICATIONS ENDPOINTS ---
apiRouter.get('/notifications', (req, res) => {
  const user = getCurrentUser(req);
  const userNotifs = NOTIFICATIONS.filter(n => n.user_id === user.id);
  res.json({ notifications: userNotifs });
});

apiRouter.patch('/notifications/mark-read', (req, res) => {
  const user = getCurrentUser(req);
  NOTIFICATIONS.forEach(n => {
    if (n.user_id === user.id) n.read = true;
  });
  res.json({ message: 'Notificaciones marcadas como leídas' });
});

// --- REVIEWS ENDPOINTS ---
apiRouter.post('/reviews', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id, target_user_id, rating, comment } = req.body;

  if (!rating || !comment) return res.status(400).json({ error: 'Ingresa una calificación y comentario.' });

  const newRev: any = {
    id: `rev-${Date.now()}`,
    service_id,
    reviewer_id: user.id,
    reviewer_name: `${user.first_name} ${user.last_name}`,
    reviewer_role: user.activeRole,
    target_user_id,
    rating: Number(rating),
    comment,
    created_at: new Date().toISOString()
  };

  REVIEWS.unshift(newRev);
  res.json({ message: 'Calificación publicada con éxito.', review: newRev });
});

apiRouter.get('/reviews/user/:user_id', (req, res) => {
  const userRevs = REVIEWS.filter(r => r.target_user_id === req.params.user_id);
  res.json({ reviews: userRevs });
});

// --- VERIFICATION ENDPOINTS ---
apiRouter.post('/verification/upload', (req, res) => {
  const user = getCurrentUser(req);
  const { document_type, document_url } = req.body;

  const newVer: any = {
    id: `ver-${Date.now()}`,
    user_id: user.id,
    user_name: `${user.first_name} ${user.last_name}`,
    user_phone: user.phone,
    document_type: document_type || 'CEDULA_FRONTAL',
    document_url: document_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
    status: 'PENDIENTE',
    submitted_at: new Date().toISOString()
  };

  VERIFICATIONS.unshift(newVer);
  if (user.worker_profile) {
    user.worker_profile.verification_status = 'PENDIENTE';
  }

  res.json({ message: 'Documento subido correctamente. Un administrador revisará tu solicitud.', verification: newVer });
});

// --- DISPUTES ENDPOINTS ---
apiRouter.post('/disputes', (req, res) => {
  const user = getCurrentUser(req);
  const { service_id, against_user_id, against_name, reason, description, evidence_urls } = req.body;

  const service = SERVICES.find(s => s.id === service_id);

  const newDispute: any = {
    id: `disp-${Date.now()}`,
    service_id,
    service_title: service?.title || 'Servicio en Disputa',
    opened_by_user_id: user.id,
    opened_by_name: `${user.first_name} ${user.last_name}`,
    against_user_id,
    against_name: against_name || 'Contraparte',
    reason,
    description,
    evidence_urls: evidence_urls || [],
    status: 'ABIERTA',
    created_at: new Date().toISOString()
  };

  DISPUTES.unshift(newDispute);
  if (service) service.status = 'EN_DISPUTA';

  res.json({ message: 'Disputa abierta. El equipo de mediación de SERVIYA.do analizará el caso.', dispute: newDispute });
});

apiRouter.get('/disputes', (req, res) => {
  const user = getCurrentUser(req);
  const list = user.role === 'ADMIN' ? DISPUTES : DISPUTES.filter(d => d.opened_by_user_id === user.id || d.against_user_id === user.id);
  res.json({ disputes: list });
});

// --- ADMIN ENDPOINTS (Protected by requireAdmin) ---
apiRouter.get(['/admin/kpis', '/admin/stats'], requireAdmin, (req, res) => {
  const totalCommissionsRD = ESCROW_RECORDS.reduce((sum, e) => sum + e.commission_amount_rd, 0);

  res.json({
    stats: {
      total_users: USERS.length,
      active_workers: USERS.filter(u => u.role === 'TRABAJADOR').length,
      total_services: SERVICES.length,
      escrow_held_rd: ESCROW_RECORDS.filter(e => e.status === 'RETENIDO').reduce((s, e) => s + e.total_amount_rd, 0) || 145000,
      commission_earned_rd: totalCommissionsRD || 38400,
      pending_verifications: VERIFICATIONS.filter(v => v.status === 'PENDIENTE').length,
      open_disputes: DISPUTES.filter(d => d.status === 'ABIERTA').length,
      pending_withdrawals: WITHDRAWALS.filter(w => w.status === 'PENDIENTE').length
    },
    commission_rate: platformSettings.platform_commission_percent,
    verifications: VERIFICATIONS,
    withdrawals: WITHDRAWALS,
    disputes: DISPUTES,
    settings: platformSettings
  });
});

apiRouter.get('/admin/users', requireAdmin, (req, res) => {
  res.json({ users: USERS });
});

apiRouter.patch('/admin/users/:id/status', requireAdmin, (req, res) => {
  const targetUser = USERS.find(u => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { status } = req.body; // 'ACTIVE' or 'SUSPENDED'
  targetUser.status = status;
  logAudit((req as any).user?.id || 'admin', 'USER_STATUS_UPDATED', `Usuario ${targetUser.id} actualizado a ${status}`);
  res.json({ message: `Estado del usuario actualizado a ${status}`, user: targetUser });
});

apiRouter.get('/admin/verifications', requireAdmin, (req, res) => {
  res.json({ verifications: VERIFICATIONS });
});

apiRouter.patch('/admin/verifications/:id', requireAdmin, (req, res) => {
  const ver = VERIFICATIONS.find(v => v.id === req.params.id);
  const status = req.body.status || 'VERIFICADO';
  if (ver) {
    ver.status = status;
    const targetUser = USERS.find(u => u.id === ver.user_id);
    if (targetUser && (status === 'APROBADO' || status === 'VERIFICADO')) {
      targetUser.is_verified = true;
      if (targetUser.worker_profile) {
        targetUser.worker_profile.verification_status = 'VERIFICADO';
      }
    }
    logAudit((req as any).user?.id || 'admin', 'VERIFICATION_UPDATED', `Documento ${ver.id} de usuario ${ver.user_id} marcado como ${status}`);
  }
  res.json({ message: `Estado de verificación actualizado a ${status}` });
});

apiRouter.post('/admin/verifications/:id/approve', requireAdmin, (req, res) => {
  const ver = VERIFICATIONS.find(v => v.id === req.params.id);
  if (!ver) return res.status(404).json({ error: 'Verificación no encontrada' });

  ver.status = 'VERIFICADO';
  const targetUser = USERS.find(u => u.id === ver.user_id);
  if (targetUser) {
    targetUser.is_verified = true;
    if (targetUser.worker_profile) {
      targetUser.worker_profile.verification_status = 'VERIFICADO';
    }
  }

  logAudit((req as any).user?.id || 'admin', 'VERIFICATION_APPROVED', `Cédula de usuario ${ver.user_id} aprobada con éxito`);
  res.json({ message: 'Verificación aprobada. Badge ✓ otorgado.', verification: ver });
});

apiRouter.get('/admin/withdrawals', requireAdmin, (req, res) => {
  res.json({ withdrawals: WITHDRAWALS });
});

apiRouter.patch('/admin/withdrawals/:id', requireAdmin, (req, res) => {
  const withItem = WITHDRAWALS.find(w => w.id === req.params.id);
  const status = req.body.status || 'COMPLETADO';
  if (withItem) {
    withItem.status = status;
    if (status === 'COMPLETADO') {
      let wallet = WALLETS[withItem.user_id];
      if (wallet) {
        wallet.pending_rd = Math.max(0, wallet.pending_rd - withItem.amount_rd);
      }
    }
  }
  logAudit((req as any).user?.id || 'admin', 'WITHDRAWAL_UPDATED', `Retiro ${req.params.id} marcado como ${status}`);
  res.json({ message: `Retiro bancario actualizado a ${status}` });
});

apiRouter.post('/admin/withdrawals/:id/process', requireAdmin, (req, res) => {
  const withItem = WITHDRAWALS.find(w => w.id === req.params.id);
  if (!withItem) return res.status(404).json({ error: 'Retiro no encontrado' });

  withItem.status = 'COMPLETADO';
  withItem.processed_at = new Date().toISOString();

  let wallet = WALLETS[withItem.user_id];
  if (wallet) {
    wallet.pending_rd = Math.max(0, wallet.pending_rd - withItem.amount_rd);
  }

  logAudit((req as any).user?.id || 'admin', 'WITHDRAWAL_PROCESSED', `Retiro bancario ${withItem.id} completado para ${withItem.account_holder_name}`);
  res.json({ message: 'Retiro marcado como COMPLETADO. Fondos transferidos.', withdrawal: withItem });
});

apiRouter.post('/admin/disputes/:id/resolve', requireAdmin, (req, res) => {
  const disp = DISPUTES.find(d => d.id === req.params.id);
  const { resolution, action } = req.body; // action: 'RELEASE_TO_WORKER' or 'REFUND_TO_CLIENT'

  if (!disp) return res.status(404).json({ error: 'Disputa no encontrada' });

  disp.status = 'RESUELTA';
  disp.resolution = resolution || 'Mediación completada por administrador';
  disp.resolved_at = new Date().toISOString();

  const escrowItem = ESCROW_RECORDS.find(e => e.service_id === disp.service_id && (e.status === 'RETENIDO' || e.status === 'EN_DISPUTA'));

  if (escrowItem) {
    if (action === 'REFUND_TO_CLIENT') {
      escrowItem.status = 'REEMBOLSADO';
      let clientWallet = WALLETS[escrowItem.client_id];
      if (clientWallet) {
        clientWallet.escrow_rd = Math.max(0, clientWallet.escrow_rd - escrowItem.total_amount_rd);
        clientWallet.available_rd += escrowItem.total_amount_rd;
      }
    } else {
      escrowItem.status = 'LIBERADO';
      let clientWallet = WALLETS[escrowItem.client_id];
      if (clientWallet) clientWallet.escrow_rd = Math.max(0, clientWallet.escrow_rd - escrowItem.total_amount_rd);

      let workerWallet = WALLETS[escrowItem.worker_id];
      if (workerWallet) {
        workerWallet.available_rd += escrowItem.worker_payout_rd;
      }
    }
  }

  const service = SERVICES.find(s => s.id === disp.service_id);
  if (service) service.status = action === 'REFUND_TO_CLIENT' ? 'CANCELADA' : 'COMPLETADA';

  logAudit((req as any).user?.id || 'admin', 'DISPUTE_RESOLVED', `Disputa ${disp.id} resuelta con acción: ${action || 'Mediación'}`);
  res.json({ message: 'Disputa resuelta exitosamente.', dispute: disp });
});

apiRouter.put('/admin/settings', requireAdmin, (req, res) => {
  const { commission_percent, platform_commission_percent, min_withdrawal_rd, min_service_price_rd } = req.body;
  if (commission_percent !== undefined) platformSettings.platform_commission_percent = Number(commission_percent);
  if (platform_commission_percent !== undefined) platformSettings.platform_commission_percent = Number(platform_commission_percent);
  if (min_withdrawal_rd !== undefined) platformSettings.min_withdrawal_rd = Number(min_withdrawal_rd);
  if (min_service_price_rd !== undefined) platformSettings.min_service_price_rd = Number(min_service_price_rd);

  logAudit((req as any).user?.id || 'admin', 'SETTINGS_UPDATED', `Comisión ajustada a ${platformSettings.platform_commission_percent}%`);
  res.json({ message: 'Configuración de plataforma actualizada.', settings: platformSettings });
});

apiRouter.get('/admin/audit-logs', requireAdmin, (req, res) => {
  res.json({ audit_logs: AUDIT_LOGS });
});

// Mount API router under /api/v1
app.use('/api/v1', apiRouter);

// Start Vite Server or Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVIYA.do backend corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
