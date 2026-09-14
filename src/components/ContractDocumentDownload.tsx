import React, { useEffect } from 'react';
import { WarrantyLauncher } from './WarrantyLauncher';

const BUTTON_ID = 'serviya-contract-download-button';
function escapeHtml(value: string) { return value.replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;' }[char] || char)); }
function openPrintableContract(card: HTMLElement) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  if (!popup) { window.alert('El navegador bloqueó la ventana del contrato. Permite ventanas emergentes para descargarlo.'); return; }
  const clone = card.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button').forEach(button => button.remove());
  clone.querySelectorAll('[data-serviya-contract-download],[data-serviya-warranty-launcher]').forEach(node => node.remove());
  const contractNumber = card.querySelector('h3')?.textContent?.trim() || 'Contrato SERVIYA';
  const generated = new Date().toLocaleString('es-DO');
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(contractNumber)} • SERVIYA</title><style>
  @page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#172033;font-family:Arial,Helvetica,sans-serif}.sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm 16mm;box-shadow:0 8px 30px rgba(15,23,42,.14)}.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0b4fa3;padding-bottom:12px;margin-bottom:18px}.brand img{width:190px;max-height:70px;object-fit:contain;object-position:left center}.brand-meta{text-align:right;font-size:10px;color:#64748b}.title{text-align:center;margin:12px 0 22px}.title h1{font-size:22px;margin:0;color:#0b2f61;letter-spacing:.4px}.title p{font-size:11px;color:#64748b;margin:6px 0}.document{font-size:12px;line-height:1.55}.document>*{max-width:100%}.document .bg-white{background:#fff!important}.document .bg-slate-50{background:#f8fafc!important}.document .bg-blue-50{background:#eff6ff!important}.document .bg-emerald-50{background:#ecfdf5!important}.document .border,.document .border-t{border-color:#dbe3ee!important}.document .text-slate-900{color:#172033!important}.document .text-slate-800{color:#25324a!important}.document .text-slate-700{color:#334155!important}.document .text-slate-600{color:#475569!important}.document .text-slate-500,.document .text-slate-400{color:#64748b!important}.document .text-blue-600,.document .text-blue-700{color:#0b4fa3!important}.document .text-emerald-700,.document .text-emerald-800{color:#087443!important}.document .text-amber-700,.document .text-amber-800{color:#9a6700!important}.document .rounded-xl,.document .rounded-2xl{border-radius:8px!important}.document .p-3{padding:10px!important}.document .p-4{padding:12px!important}.document .p-5{padding:14px!important}.document .mt-1{margin-top:4px}.document .mt-3{margin-top:10px}.document .mt-4{margin-top:14px}.document .mt-5{margin-top:18px}.document .grid{display:grid;gap:10px}.document .grid-cols-2{grid-template-columns:1fr 1fr}.document ul{padding-left:18px}.document li{margin-bottom:5px}.footer{margin-top:24px;border-top:1px solid #dbe3ee;padding-top:10px;font-size:9px;color:#64748b;display:flex;justify-content:space-between;gap:16px}.notice{background:#f8fafc;border:1px solid #dbe3ee;border-radius:8px;padding:10px;font-size:10px;margin-top:14px}.no-print{display:none!important}@media print{body{background:#fff}.sheet{width:auto;min-height:auto;margin:0;box-shadow:none;padding:0}.document{font-size:11.5px}}
  </style></head><body><main class="sheet"><div class="brand"><img src="/serviya-contract-logo.svg" alt="SERVIYA"><div class="brand-meta">Trabajo • Confianza • Oportunidades<br>Documento contractual oficial</div></div><div class="title"><h1>CONTRATO DE SERVICIOS SERVIYA</h1><p>Documento generado a partir del contrato digital registrado en SERVIYA</p></div><section class="document">${clone.outerHTML}</section><div class="notice"><b>Integridad y aceptación:</b> este documento reproduce la información del contrato digital registrado. La aceptación electrónica y el hash SHA-256 que aparecen en el contrato son parte de la evidencia digital del acuerdo.</div><div class="footer"><span>Generado: ${escapeHtml(generated)}</span><span>SERVIYA • Desde el trabajo más pequeño hasta el trabajo más grande.</span></div></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`);
  popup.document.close();
}
export const ContractDocumentDownload: React.FC = () => {
  useEffect(() => {
    const inject = () => {
      const hash = Array.from(document.querySelectorAll<HTMLElement>('p')).find(node => (node.textContent || '').includes('Hash SHA-256:'));
      if (!hash) return;
      const card = hash.closest<HTMLElement>('.bg-white') || hash.parentElement?.closest<HTMLElement>('.bg-white') || hash.parentElement;
      if (!card || card.querySelector(`#${BUTTON_ID}`)) return;
      const button = document.createElement('button'); button.id = BUTTON_ID; button.type = 'button'; button.setAttribute('data-serviya-contract-download','true'); button.textContent = '📥 Descargar contrato PDF'; button.style.cssText='width:100%;margin-top:14px;padding:12px 14px;border-radius:12px;border:1px solid #0b4fa3;background:#0b4fa3;color:white;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 12px rgba(11,79,163,.18)'; button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openPrintableContract(card);}); card.appendChild(button);
    };
    const observer = new MutationObserver(inject); observer.observe(document.body,{childList:true,subtree:true}); inject(); return()=>observer.disconnect();
  },[]);
  return <WarrantyLauncher />;
};
