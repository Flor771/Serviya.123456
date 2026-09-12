import React, { useEffect, useState } from 'react';
import { BellRing, ChevronRight, X } from 'lucide-react';
import { api } from '../services/api';

type Announcement = { id:number; title:string; body:string; image_urls:string[]; audience:string; priority:string; action_label?:string|null; action_tab?:string|null; published:boolean; };

export const AnnouncementsBanner: React.FC = () => {
  const [items,setItems] = useState<Announcement[]>([]);
  const [closed,setClosed] = useState<number[]>([]);
  useEffect(()=>{(async()=>{try{const d=await api.get<{announcements:Announcement[]}>('/announcements');setItems(d.announcements||[]);}catch{setItems([])}})()},[]);
  const visible=items.filter(a=>!closed.includes(a.id));
  if(!visible.length)return null;
  return <div className="space-y-3 mb-5">{visible.map(a=><article key={a.id} className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${a.priority==='URGENTE'?'bg-red-50 border-red-200':a.priority==='IMPORTANTE'?'bg-amber-50 border-amber-200':'bg-blue-50 border-blue-200'}`}>
    <button onClick={()=>setClosed(v=>[...v,a.id])} className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/80 text-slate-500" aria-label="Cerrar anuncio"><X className="w-4 h-4"/></button>
    <div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0"><BellRing className="w-4 h-4 text-blue-600"/></div><div className="min-w-0 pr-6"><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Anuncio SERVIYA · {a.priority}</p><h3 className="font-black text-slate-900 mt-1">{a.title}</h3><p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{a.body}</p>{a.image_urls?.length>0&&<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">{a.image_urls.map((u,i)=><img key={i} src={u} alt={a.title} className="w-full max-h-64 object-cover rounded-xl border border-white" />)}</div>}{a.action_label&&<button onClick={()=>{if(a.action_tab)window.dispatchEvent(new CustomEvent('serviya:navigate',{detail:{tab:a.action_tab,destination:a.action_tab}}))}} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-black">{a.action_label}<ChevronRight className="w-4 h-4"/></button>}</div></div>
  </article>)}</div>;
};
