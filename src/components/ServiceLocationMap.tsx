import React, { useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { ServiceLocation } from '../types';

export const ServiceLocationMap: React.FC<{ location: ServiceLocation }> = ({ location }) => {
  const mapSrc = useMemo(() => {
    if (!location.available || location.latitude == null || location.longitude == null) return '';
    const d = 0.015;
    const bbox = `${location.longitude - d},${location.latitude - d},${location.longitude + d},${location.latitude + d}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
  }, [location]);

  if (!location.available || location.latitude == null || location.longitude == null) return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Este servicio todavía no tiene una ubicación de mapa disponible.</div>;

  const navigate = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`, '_blank', 'noopener,noreferrer');
  return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" /> Ubicación del trabajo</p><p className="text-xs text-slate-600 mt-1">{location.address || `${location.municipality || ''}, ${location.province || ''}`}</p></div><button type="button" onClick={navigate} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shrink-0"><Navigation className="w-4 h-4" /> Cómo llegar</button></div>
    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white aspect-[16/10]"><iframe title="Mapa del trabajo" src={mapSrc} className="w-full h-full border-0" loading="lazy" /></div>
  </div>;
};
