import React, { useMemo, useState } from 'react';
import { LocateFixed, MapPin, Navigation } from 'lucide-react';

interface Props {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onChange: (value: { latitude: number; longitude: number; address: string }) => void;
}

export const ServiceLocationPicker: React.FC<Props> = ({ latitude, longitude, address, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapSrc = useMemo(() => {
    if (latitude == null || longitude == null) return '';
    const delta = 0.015;
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }, [latitude, longitude]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { latitude: lat, longitude: lng } = coords;
        let resolved = '';
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { Accept: 'application/json' } });
          if (response.ok) {
            const data = await response.json();
            resolved = String(data.display_name || '');
          }
        } catch { /* coordinates remain usable even if reverse geocoding is unavailable */ }
        onChange({ latitude: lat, longitude: lng, address: resolved || address || 'Ubicación seleccionada por GPS' });
      } finally { setLoading(false); }
    }, (geoError) => {
      setLoading(false);
      setError(geoError.code === 1 ? 'Permite la ubicación del navegador para usar esta opción.' : 'No se pudo obtener tu ubicación.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  const openNavigation = () => {
    if (latitude == null || longitude == null) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank', 'noopener,noreferrer');
  };

  return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-black text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" /> Ubicación del trabajo</p>
        <p className="text-xs text-slate-600 mt-1">Guarda la ubicación exacta para que solo el cliente y el trabajador asignado puedan verla.</p>
      </div>
      <button type="button" onClick={locate} disabled={loading} className="shrink-0 inline-flex items-center gap-1.5 bg-white border border-blue-300 text-blue-700 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"><LocateFixed className="w-4 h-4" />{loading ? 'Ubicando…' : 'Usar mi ubicación'}</button>
    </div>
    {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
    {address && <p className="text-xs text-slate-700 bg-white border border-blue-100 rounded-xl p-2.5">{address}</p>}
    {latitude != null && longitude != null ? <>
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white aspect-[16/10]"><iframe title="Mapa de ubicación del trabajo" src={mapSrc} className="w-full h-full border-0" loading="lazy" /></div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-mono text-slate-500 bg-white border rounded-lg px-2 py-1">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        <button type="button" onClick={openNavigation} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><Navigation className="w-4 h-4" /> Ver cómo llegar</button>
      </div>
    </> : <div className="rounded-xl border border-dashed border-blue-300 bg-white p-5 text-center text-xs text-slate-500">Pulsa <strong>Usar mi ubicación</strong> para colocar el punto en el mapa.</div>}
  </div>;
};
