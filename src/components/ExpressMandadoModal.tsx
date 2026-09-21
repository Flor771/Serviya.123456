import React, { useMemo, useState } from 'react';
import { X, Zap, Bike, MapPin, Clock, Users } from 'lucide-react';
import { SERVICE_CATEGORIES, DOMINICAN_PROVINCES } from '../data/dominicanData';
import { api } from '../services/api';

type Mode = 'EXPRESS' | 'MANDADO';
interface Props { mode: Mode; onClose: () => void; onSuccess: () => void; }

export const ExpressMandadoModal: React.FC<Props> = ({ mode, onClose, onSuccess }) => {
  const express = mode === 'EXPRESS';
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [price,setPrice]=useState<number|''>(express?1500:350);
  const [date,setDate]=useState(new Date().toISOString().split('T')[0]);
  const [time,setTime]=useState(express?'Ahora':'09:00 AM');
  const [duration,setDuration]=useState(express?'4 horas':'1 hora');
  const [people,setPeople]=useState(1);
  const [province,setProvince]=useState('Santo Domingo');
  const [municipality,setMunicipality]=useState('Santo Domingo Este');
  const [origin,setOrigin]=useState('');
  const [destination,setDestination]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const category=useMemo(()=>SERVICE_CATEGORIES.find(c=>c.id===(express?'cat-otros':'cat-otros'))!,[express]);
  const prov=DOMINICAN_PROVINCES.find(p=>p.name===province);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError('');
    if(!title.trim()||!description.trim()||!price){setError('Completa título, descripción y pago.');return;}
    if(!origin.trim()||!destination.trim()){setError(express?'Indica dónde se realizará el trabajo.':'Indica origen y destino del mandado.');return;}
    setSubmitting(true);
    try{
      const fullDescription=express
        ? description+'\n\nModalidad: SERVIYA EXPRESS\nPersonas requeridas: '+people+'\nLugar: '+origin
        : description+'\n\nModalidad: SERVIYA MANDADOS\nOrigen: '+origin+'\nDestino: '+destination;
      await api.post('/services',{
        title,description:fullDescription,category_id:category.id,category_name:category.name,
        subcategory:express?'Trabajo por horas / Express':'Diligencias y Mandados',
        price_rd:Number(price),province,municipality,address_approx:express?origin:origin+' → '+destination,
        location_lat:null,location_lng:null,location_address:origin,
        service_date:date,service_time:time,estimated_duration:duration,
        images:[],photos:[],requirements:express?['Trabajo rápido','Confirmar disponibilidad antes de iniciar']:['Confirmar origen y destino','Confirmar entrega'],
        payment_type:'CUSTODIA_SERVIYA'
      });
      onSuccess(); onClose();
    }catch(err:any){setError(err?.message||'No se pudo publicar.');}finally{setSubmitting(false);}
  };

  return <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="min-h-full flex items-center justify-center py-6">
      <form onSubmit={submit} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-5 sm:p-7 space-y-4">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4"/></button>
        <div className="pr-10">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-black uppercase tracking-widest">{express?<Zap className="w-4 h-4"/>:<Bike className="w-4 h-4"/>}{express?'SERVIYA EXPRESS':'SERVIYA MANDADOS'}</div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{express?'Necesito a alguien ahora':'Necesito un mandado'}</h2>
          <p className="text-xs text-slate-500 mt-1">{express?'Publica un trabajo por horas y recibe postulaciones.':'Publica una compra, recogida o entrega y recibe postulaciones.'}</p>
        </div>
        {error&&<div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-xs font-bold">{error}</div>}
        <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder={express?'Ej.: Descargar mercancía':'Ej.: Comprar y entregar materiales'} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/>
        <textarea required rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder={express?'Describe el trabajo, lo que hay que hacer y condiciones.':'Describe exactamente qué hay que comprar, recoger o entregar.'} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-black text-slate-600">Pago (RD$)</label><input type="number" min="1" required value={price} onChange={e=>setPrice(e.target.value===''?'':Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold"/></div>
          <div><label className="text-[11px] font-black text-slate-600">Duración</label><input value={duration} onChange={e=>setDuration(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
        </div>
        {express&&<div><label className="text-[11px] font-black text-slate-600 flex items-center gap-1"><Users className="w-3 h-3"/> Personas necesarias</label><input type="number" min="1" max="20" value={people} onChange={e=>setPeople(Math.max(1,Number(e.target.value)))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-black text-slate-600">Provincia</label><select value={province} onChange={e=>{setProvince(e.target.value);const p=DOMINICAN_PROVINCES.find(x=>x.name===e.target.value);if(p)setMunicipality(p.municipalities[0]);}} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">{DOMINICAN_PROVINCES.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
          <div><label className="text-[11px] font-black text-slate-600">Municipio</label><select value={municipality} onChange={e=>setMunicipality(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">{prov?.municipalities.map(m=><option key={m}>{m}</option>)}</select></div>
        </div>
        <div><label className="text-[11px] font-black text-slate-600 flex items-center gap-1"><MapPin className="w-3 h-3"/> {express?'Lugar del trabajo':'Origen'}</label><input required value={origin} onChange={e=>setOrigin(e.target.value)} placeholder={express?'Sector / referencia':'Dirección o punto de recogida'} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
        <div><label className="text-[11px] font-black text-slate-600">{express?'Horario':'Destino'}</label>{express?<input value={time} onChange={e=>setTime(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/>:<input required value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Dirección o punto de entrega" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/>}</div>
        <div><label className="text-[11px] font-black text-slate-600">Fecha</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
        <button disabled={submitting} className="w-full rounded-xl bg-blue-600 text-white py-3.5 font-black text-sm disabled:opacity-50">{submitting?'Publicando...':express?'⚡ Publicar trabajo Express':'🛵 Publicar mandado'}</button>
      </form>
    </div>
  </div>;
};
