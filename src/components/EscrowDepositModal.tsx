import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, ImagePlus, X, Upload, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface Props { serviceId: string; amount: number; onClose: () => void; onSuccess: () => void; }

export const EscrowDepositModal: React.FC<Props> = ({ serviceId, amount, onClose, onSuccess }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<number | ''>('');
  const [voucher, setVoucher] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get<any>('/wallet/bank-accounts').then((d) => {
      const list = d?.bank_accounts || [];
      setAccounts(list);
      if (list.length) setAccountId(list.find((a: any) => a.is_primary)?.id || list[0].id);
    }).catch(() => setError('No se pudieron cargar las cuentas oficiales de SERVIYA.'));
  }, []);

  const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('El voucher debe ser JPG, PNG o WebP.'));
    const img = new Image(); const reader = new FileReader();
    reader.onload = () => { img.onload = () => { const max = 1400; const scale = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale)); const ctx = c.getContext('2d'); if (!ctx) return reject(new Error('No se pudo procesar la imagen.')); ctx.drawImage(img,0,0,c.width,c.height); let q=.82, out=c.toDataURL('image/jpeg',q); while(out.length>850000 && q>.45){q-=.08;out=c.toDataURL('image/jpeg',q);} resolve(out); }; img.onerror=()=>reject(new Error('No se pudo leer el voucher.')); img.src=String(reader.result); }; reader.onerror=()=>reject(new Error('No se pudo leer el archivo.')); reader.readAsDataURL(file);
  });

  const handleFile = async (file?: File) => {
    if (!file) return; setError('');
    try { const data = await compressImage(file); setVoucher(data); setPreview(data); } catch (e:any) { setError(e.message || 'Voucher inválido.'); }
  };

  const submit = async () => {
    setError('');
    if (!voucher) { setError('Sube el recibo/voucher del depósito bancario antes de continuar.'); return; }
    if (accountId === '') { setError('Selecciona la cuenta oficial de SERVIYA donde realizaste el depósito.'); return; }
    setLoading(true);
    try {
      await api.post('/payments/escrow-bank-transfer', { service_id: serviceId, bank_account_id: Number(accountId), voucher_url: voucher });
      setSuccess('Voucher recibido. El depósito quedó registrado en Custodia SERVIYA y el trabajador fue notificado.');
      setTimeout(onSuccess, 700);
    } catch (e:any) { setError(e.message || 'No se pudo registrar el depósito.'); } finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-6">
      <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
      <div className="pr-8"><p className="text-xs font-black text-emerald-700 uppercase tracking-wider">Custodia SERVIYA</p><h2 className="text-xl font-black text-slate-900 mt-1">Depositar RD$ {amount.toLocaleString()} en Custodia</h2><p className="text-xs text-slate-500 mt-1">Realiza el depósito en una cuenta oficial de SERVIYA y sube aquí el recibo que te entrega el banco.</p></div>
      {error && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
      {success && <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}
      {!success && <div className="mt-5 space-y-4">
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200"><div className="flex items-center gap-2 font-bold text-blue-950 text-sm"><Building2 className="w-4 h-4 text-blue-600" />Cuenta bancaria oficial de SERVIYA</div><p className="text-[11px] text-blue-800 mt-1">Selecciona la cuenta a la que hiciste el depósito:</p><div className="mt-3 space-y-2">{accounts.length ? accounts.map((a:any)=><label key={a.id} className={`block p-3 rounded-xl border cursor-pointer ${Number(accountId)===Number(a.id)?'bg-white border-blue-500 ring-1 ring-blue-300':'bg-white border-blue-100'}`}><div className="flex items-center gap-2"><input type="radio" checked={Number(accountId)===Number(a.id)} onChange={()=>setAccountId(a.id)} /><span className="font-black text-xs text-slate-900">{a.bank_name}</span>{a.is_primary&&<span className="text-[9px] font-bold text-emerald-700">PRINCIPAL</span>}</div><p className="text-[11px] mt-1"><b>Cuenta:</b> {a.account_number} ({a.account_type})</p><p className="text-[11px]"><b>Titular:</b> {a.account_holder}</p>{a.rnc_cedula&&<p className="text-[11px]"><b>RNC/Cédula:</b> {a.rnc_cedula}</p>}</label>) : <div className="p-3 bg-white rounded-xl border border-blue-100 text-[11px] text-slate-700"><b>Banco Popular Dominicano</b><br/>Cuenta Corriente: <b>792003841</b><br/>Titular: <b>SERVIYA DOMINICANA SRL</b><br/>RNC: <b>1-32-45678-9</b><p className="text-[9px] text-blue-600 mt-2">Cuenta de demostración mientras Administración configura las cuentas oficiales.</p></div>}</div></div>
        <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50"><div className="flex items-center gap-2 font-bold text-slate-800 text-sm"><ImagePlus className="w-4 h-4 text-blue-600" />Subir voucher / recibo del banco</div><p className="text-[11px] text-slate-500 mt-1">Foto clara del ticket o comprobante. Es obligatorio para registrar este depósito.</p>{preview ? <div className="mt-3 relative"><img src={preview} className="w-full max-h-56 object-contain rounded-xl bg-white border border-slate-200" /><button onClick={()=>{setVoucher('');setPreview('')}} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border"><X className="w-4 h-4" /></button></div> : <label className="mt-3 flex items-center justify-center gap-2 p-4 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-400 text-xs font-bold text-blue-700"><Upload className="w-4 h-4" />Seleccionar recibo<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/></label>}</div>
        <div className="flex items-start gap-2 text-[10px] text-slate-500"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />El voucher queda asociado al pago del servicio para revisión y trazabilidad administrativa.</div>
        <button onClick={submit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 rounded-xl text-xs shadow-md">{loading?'Registrando depósito...':'✓ Registrar depósito y enviar voucher'}</button>
      </div>}
    </div>
  </div>;
};
