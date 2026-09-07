import React, { useState } from 'react';
import { Service } from '../types';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { Search, MapPin, Filter, DollarSign, Calendar, Clock, PlusCircle } from 'lucide-react';

interface ServicesViewProps {
  services: Service[];
  onSelectService: (service: Service) => void;
  onOpenPublish: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onSelectService,
  onOpenPublish
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(20000);

  const currentProvinceData = DOMINICAN_PROVINCES.find(p => p.name === selectedProvince);

  const filteredServices = services.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category_name.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedCategory && s.category_id !== selectedCategory) {
      return false;
    }

    if (selectedProvince && s.province !== selectedProvince) {
      return false;
    }

    if (selectedMunicipality && s.municipality !== selectedMunicipality) {
      return false;
    }

    if (s.price_rd > maxPrice) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Marketplace de Servicios en RD 🇩🇴</h1>
          <p className="text-xs sm:text-sm text-slate-300">Explora trabajos publicados o contrata personal capacitado</p>
        </div>
        <button
          onClick={onOpenPublish}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publicar Trabajo</span>
        </button>
      </div>

      {/* Filter Bar Grid */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Search Query */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por título o palabra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todas las Categorías</option>
              {SERVICE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Province Selector */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedMunicipality('');
              }}
              className="w-full text-xs bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todas las Provincias RD</option>
              {DOMINICAN_PROVINCES.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Municipality Selector */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              disabled={!selectedProvince}
              className="w-full text-xs bg-transparent focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="">{selectedProvince ? 'Todos los municipios' : 'Selecciona provincia primero'}</option>
              {currentProvinceData?.municipalities.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Price Slider */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
          <span>Precio máximo: <strong>RD$ {maxPrice.toLocaleString()}</strong></span>
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-48 cursor-pointeraccent-blue-600"
          />
        </div>
      </div>

      {/* Services List Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <p className="text-3xl">🔍</p>
          <h3 className="font-bold text-slate-800 text-base">No se encontraron trabajos con estos filtros</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Prueba cambiando la provincia, ajustando el precio o buscando con un término diferente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-blue-100">
                    {service.category_name}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {service.status}
                  </span>
                </div>

                <h2 className="font-bold text-slate-900 text-base line-clamp-2">{service.title}</h2>
                <p className="text-xs text-slate-600 line-clamp-3">{service.description}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{service.municipality}, {service.province}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      {service.service_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {service.service_time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Monto Orientativo</span>
                  <span className="text-lg font-black text-slate-900">RD$ {service.price_rd.toLocaleString()}</span>
                </div>

                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-2 rounded-xl shadow-sm transition">
                  Ver Postulación
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
