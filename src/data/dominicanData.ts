import { Category } from '../types';

export const DOMINICAN_PROVINCES = [
  {
    name: 'Distrito Nacional',
    municipalities: ['Santo Domingo de Guzmán (DN)']
  },
  {
    name: 'Santo Domingo',
    municipalities: ['Santo Domingo Este', 'Santo Domingo Norte', 'Santo Domingo Oeste', 'Boca Chica', 'Los Alcarrizos', 'Pedro Brand', 'San Antonio de Guerra']
  },
  {
    name: 'Santiago',
    municipalities: ['Santiago de los Caballeros', 'Baitoa', 'Jánico', 'Licey al Medio', 'Puñal', 'Sabana Iglesia', 'San José de las Matas', 'Tamboril', 'Villa González']
  },
  {
    name: 'San Cristóbal',
    municipalities: ['San Cristóbal', 'Bajos de Haina', 'Cambita Garabitos', 'Los Cacaos', 'Sabana Grande de Palenque', 'San Gregorio de Nigua', 'Yaguate']
  },
  {
    name: 'La Vega',
    municipalities: ['Concepción de La Vega', 'Jarabacoa', 'Constanza', 'Jima Abajo']
  },
  {
    name: 'Puerto Plata',
    municipalities: ['San Felipe de Puerto Plata', 'Sosúa', 'Cabarete', 'Imbert', 'Luperón', 'Altamira', 'Villa Isabela']
  },
  {
    name: 'La Romana',
    municipalities: ['La Romana', 'Guaymate', 'Villa Hermosa']
  },
  {
    name: 'La Altagracia',
    municipalities: ['Higüey', 'Punta Cana / Bávaro', 'San Rafael del Yuma']
  },
  {
    name: 'San Pedro de Macorís',
    municipalities: ['San Pedro de Macorís', 'Consuelo', 'Guayacanes', 'Quisqueya']
  },
  {
    name: 'Duarte',
    municipalities: ['San Francisco de Macorís', 'Arenoso', 'Castillo', 'Las Guáranas', 'Pimentel', 'Villa Riva']
  },
  {
    name: 'Espaillat',
    municipalities: ['Moca', 'Cayetano Germosén', 'Gaspar Hernández', 'Jamao al Norte']
  },
  {
    name: 'Barahona',
    municipalities: ['Santa Cruz de Barahona', 'Cabral', 'Enriquillo', 'Paraíso', 'Vicente Noble']
  },
  {
    name: 'Monseñor Nouel',
    municipalities: ['Bonao', 'Maimón', 'Piedra Blanca']
  },
  {
    name: 'Peravia',
    municipalities: ['Baní', 'Nizao']
  },
  {
    name: 'Azua',
    municipalities: ['Azua de Compostela', 'Padre Las Casas', 'Peralta', 'Sabana Yegua']
  },
  {
    name: 'Samaná',
    municipalities: ['Santa Bárbara de Samaná', 'Las Terrenas', 'Sánchez']
  },
  {
    name: 'Monte Plata',
    municipalities: ['Monte Plata', 'Bayaguana', 'Sabana Grande de Boyá', 'Yamasá']
  },
  {
    name: 'Valverde',
    municipalities: ['Mao', 'Esperanza', 'Laguna Salada']
  },
  {
    name: 'Sánchez Ramírez',
    municipalities: ['Cotuí', 'Cevicos', 'Fantino']
  }
];

export const DOMINICAN_BANKS = [
  'Banco Popular Dominicano',
  'Banco de Reservas (Banreservas)',
  'Banco BHD',
  'Banco Santa Cruz',
  'Scotiabank República Dominicana',
  'Banco Promerica',
  'Qik Banco Digital',
  'Asociación Popular de Ahorros y Préstamos (APAP)',
  'Asociación La Nacional de Ahorros y Préstamos'
];

export const SERVICE_CATEGORIES: Category[] = [
  {
    id: 'cat-limpieza',
    name: 'Limpieza',
    slug: 'limpieza',
    icon: 'Sparkles',
    description: 'Limpieza residencial, comercial, post-construcción y lavado de muebles o tapicería.',
    subcategories: ['Hogar', 'Oficinas', 'Post-Construcción', 'Muebles y Tapicería', 'Ventanas y Cristales']
  },
  {
    id: 'cat-plomeria',
    name: 'Plomería',
    slug: 'plomeria',
    icon: 'Wrench',
    description: 'Reparación de tuberías, bombas de agua, tinacos, filtraciones e instalaciones de baños y cocinas.',
    subcategories: ['Instalaciones', 'Reparación de Fugas', 'Tinacos y Cisternas', 'Destape de Drenajes', 'Calentadores de Agua']
  },
  {
    id: 'cat-electricidad',
    name: 'Electricidad',
    slug: 'electricidad',
    icon: 'Zap',
    description: 'Electricidad residencial e industrial, inversores, paneles solares y cortocircuitos.',
    subcategories: ['Cortocircuitos', 'Instalación de Inversores', 'Paneles Solares', 'Cableado Residencial', 'Luminarias y Lámparas']
  },
  {
    id: 'cat-pintura',
    name: 'Pintura',
    slug: 'pintura',
    icon: 'Paintbrush',
    description: 'Pintura de interiores, fachadas, impermeabilización de techos y acabados decorativos.',
    subcategories: ['Interiores', 'Exteriores y Fachadas', 'Impermeabilización de Techos', 'Acabados de Lujo']
  },
  {
    id: 'cat-reparaciones',
    name: 'Reparaciones',
    slug: 'reparaciones',
    icon: 'Hammer',
    description: 'Aires acondicionados, lavadoras, neveras, estufas y electrodomésticos en general.',
    subcategories: ['Aires Acondicionados', 'Neveras y Congeladores', 'Lavadoras y Secadoras', 'Estufas y Hornos']
  },
  {
    id: 'cat-construccion',
    name: 'Construcción',
    slug: 'construccion',
    icon: 'HardHat',
    description: 'Albañilería, instalación de cerámica, sheetrock, plomería de obra y remodelaciones.',
    subcategories: ['Albañilería y Cemento', 'Pisos y Cerámica', 'Sheetrock y Techos', 'Remodelaciones']
  },
  {
    id: 'cat-transporte',
    name: 'Transporte y Mudanzas',
    slug: 'transporte',
    icon: 'Truck',
    description: 'Mudanzas locales e interurbanas, acarreos y fletes pesados en República Dominicana.',
    subcategories: ['Mudanza Residencial', 'Mudanza Comercial', 'Acarreo Pequeño', 'Flete Interurbano']
  },
  {
    id: 'cat-tecnologia',
    name: 'Tecnología',
    slug: 'tecnologia',
    icon: 'Laptop',
    description: 'Soporte informático, reparación de laptops, instalación de redes, wifi y cámaras de seguridad.',
    subcategories: ['Reparación de PC / Laptops', 'Cámaras de Seguridad', 'Redes y Wi-Fi', 'Mantenimiento de Servidores']
  },
  {
    id: 'cat-jardineria',
    name: 'Jardinería y Poda',
    slug: 'jardineria',
    icon: 'Trees',
    description: 'Mantenimiento de jardines, poda de árboles, césped y diseño de áreas verdes.',
    subcategories: ['Poda y Corte de Césped', 'Mantenimiento de Jardín', 'Diseño Paisajista', 'Sistemas de Riego']
  },
  {
    id: 'cat-belleza',
    name: 'Belleza y Cuidado Personal',
    slug: 'belleza',
    icon: 'Scissors',
    description: 'Barbería a domicilio, peinado, maquillaje, uñas, masajes relajantes y estética.',
    subcategories: ['Barbería a Domicilio', 'Peluquería y Peinados', 'Manicura y Pedicura', 'Masajes Terapeúticos']
  },
  {
    id: 'cat-cuidados',
    name: 'Cuidado de Personas',
    slug: 'cuidados',
    icon: 'HeartHandshake',
    description: 'Cuidado de niños (nñera/babysitter), atención a adultos mayores y enfermería a domicilio.',
    subcategories: ['Niñera / Babysitter', 'Cuidado de Adulto Mayor', 'Enfermería a Domicilio', 'Tutoría Infantil']
  },
  {
    id: 'cat-mecanica',
    name: 'Mecánica Automotriz',
    slug: 'mecanica',
    icon: 'Car',
    description: 'Diagnóstico a domicilio, despinche, cambio de batería, cambio de aceite y mecánica rápida.',
    subcategories: ['Mecánica Rápida', 'Cambio de Batería / Auxilio', 'Electricidad Automotriz', 'Despinche y Llantas']
  },
  {
    id: 'cat-educacion',
    name: 'Educación y Clases',
    slug: 'educacion',
    icon: 'GraduationCap',
    description: 'Clases particulares de matemáticas, inglés, música y refuerzo escolar.',
    subcategories: ['Refuerzo Escolar', 'Clases de Inglés', 'Clases de Música', 'Matemáticas y Ciencias']
  },
  {
    id: 'cat-fotografia',
    name: 'Fotografía y Eventos',
    slug: 'fotografia',
    icon: 'Camera',
    description: 'Fotografía para bodas, cumpleaños, eventos corporativos, DJs, sonido y decoración.',
    subcategories: ['Fotografía y Video', 'DJ y Sonido', 'Decoración de Eventos', 'Animación e Infatiles']
  },
  {
    id: 'cat-otros',
    name: 'Otros Servicios',
    slug: 'otros',
    icon: 'MoreHorizontal',
    description: 'Cualquier otra solicitud o servicio profesional en República Dominicana.',
    subcategories: ['Diligencias y Mandados', 'Costura y Confección', 'Cuidado de Mascotas', 'Varios']
  }
];
