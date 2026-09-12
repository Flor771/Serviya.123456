import React, { useEffect, useState } from 'react';
import { ArrowRight, BellRing, ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { ExamplesSection } from './ExamplesSection';

type Announcement = {
  id: number;
  title: string;
  body: string;
  image_urls: string[];
  audience: string;
  priority: string;
  action_label?: string | null;
  action_tab?: string | null;
};

export const AnnouncementsSection: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    api.get<{ announcements: Announcement[] }>('/announcements')
      .then(data => setItems(data?.announcements || []))
      .catch(() => setItems([]));
  }, []);

  const priorityClass = (p: string) => p === 'URGENTE' ? 'bg-red-50 text-red-700 border-red-100' : p === 'IMPORTANTE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100';

  return <div className="space-y-8">
    {items.length > 0 && <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Comunicación oficial</p><h2 className="mt-1 text-2xl font-black text-slate-900">📢 Anuncios</h2><p className="mt-1 text-xs text-slate-500">Novedades y avisos oficiales de SERVIYA.</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.slice(0, 4).map(item => <button key={item.id} onClick={() => { setSelected(item); setImageIndex(0); }} className="text-left overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition">
          {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt="" className="w-full h-40 object-cover" /> : <div className="h-28 bg-slate-950 flex items-center justify-center"><ImageIcon className="w-7 h-7 text-blue-300" /></div>}
          <div className="p-5"><span className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${priorityClass(item.priority)}`}>{item.priority}</span><h3 className="mt-3 font-black text-slate-900">{item.title}</h3><p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500">{item.body}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-blue-600">Ver anuncio <ArrowRight className="w-4 h-4" /></span></div>
        </button>)}
      </div>
    </section>}

    <ExamplesSection />

    {selected && <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100"><div className="flex items-center gap-2"><BellRing className="w-5 h-5 text-blue-600"/><h3 className="font-black text-slate-900">Anuncio SERVIYA</h3></div><button onClick={() => setSelected(null)} className="p-2 rounded-xl bg-slate-100"><X className="w-4 h-4"/></button></div>
        {selected.image_urls?.length > 0 && <div className="relative bg-slate-950"><img src={selected.image_urls[imageIndex]} alt="" className="w-full max-h-80 object-contain" />{selected.image_urls.length > 1 && <><button onClick={() => setImageIndex(i => (i - 1 + selected.image_urls.length) % selected.image_urls.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"><ChevronLeft className="w-5 h-5"/></button><button onClick={() => setImageIndex(i => (i + 1) % selected.image_urls.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"><ChevronRight className="w-5 h-5"/></button></>}</div>}
        <div className="p-6"><h2 className="text-2xl font-black text-slate-900">{selected.title}</h2><p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{selected.body}</p>{selected.action_label && <button onClick={() => { if (selected.action_tab && onNavigateTab) onNavigateTab(selected.action_tab); setSelected(null); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">{selected.action_label}<ArrowRight className="w-4 h-4"/></button>}</div>
      </div>
    </div>}
  </div>;
};
