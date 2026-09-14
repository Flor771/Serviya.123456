import React, { useEffect } from 'react';
import { WarrantyLauncher } from './WarrantyLauncher';

const BUTTON_ID = 'serviya-contract-download-button';

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;' }[char] || char));
}

async function downloadContractDocument(card: HTMLElement) {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button').forEach(button => button.remove());
  clone.querySelectorAll('[data-serviya-contract-download],[data-serviya-warranty-launcher]').forEach(node => node.remove());

  const contractNumber = card.querySelector('h3')?.textContent?.trim() || 'Contrato SERVIYA';
  const generated = new Date().toLocaleString('es-DO');
  let logo = '';
  try {
    const response = await fetch('/serviya-contract-logo.svg', { cache: 'no-store' });
    if (response.ok) logo = await response.text();
  } catch (_) {
    logo = '';
  }

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(contractNumber)} • SERVIYA</title><style>
  body{margin:0;background:#eef2f7;color:#172033;font-family:Arial,Helvetica,sans-serif}.sheet{max-width:820px;margin:24px auto;background:#fff;padding:34px;box-sizing:border-box}.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0b4fa3;padding-bottom:14px;margin-bottom:20px}.brand-logo{width:190px;max-height:70px;object-fit:contain;object-position:left center}.brand-text{text-align:right;font-size:11px;color:#64748b}.title{text-align:center;margin:14px 0 24px}.title h1{font-size:23px;margin:0;color:#0b2f61}.title p{font-size:12px;color:#64748b}.document{font-size:13px;line-height:1.6}.document .bg-white{background:#fff!important}.document .bg-slate-50{background:#f8fafc!important}.document .bg-blue-50{background:#eff6ff!important}.document .bg-emerald-50{background:#ecfdf5!important}.document .border,.document .border-t{border-color:#dbe3ee!important}.document .text-slate-900{color:#172033!important}.document .text-slate-800{color:#25324a!important}.document .text-slate-700{color:#334155!important}.document .text-slate-600{color:#475569!important}.document .text-slate-500,.document .text-slate-400{color:#64748b!important}.document .text-blue-600,.document .text-blue-700{color:#0b4fa3!important}.document .text-emerald-700,.document .text-emerald-800{color:#087443!important}.document .text-amber-700,.document .text-amber-800{color:#9a6700!important}.document .rounded-xl,.document .rounded-2xl{border-radius:8px!important}.document .p-3{padding:10px!important}.document .p-4{padding:12px!important}.document .p-5{padding:14px!important}.document .grid{display:grid;gap:10px}.document .grid-cols-2{grid-template-columns:1fr 1fr}.document ul{padding-left:18px}.document li{margin-bottom:5px}.notice{background:#f8fafc;border:1px solid #dbe3ee;border-radius:8px;padding:12px;font-size:11px;margin-top:18px}.footer{margin-top:24px;border-top:1px solid #dbe3ee;padding-top:10px;font-size:10px;color:#64748b;display:flex;justify-content:space-between;gap:16px}@media(max-width:700px){.sheet{margin:0;padding:20px}.brand{gap:12px}.brand-logo{width:145px}.brand-text{font-size:9px}.document{font-size:12px}.document .grid-cols-2{grid-template-columns:1fr}}
</style></head><body><main class="sheet"><div class="brand">${logo ? `<div class="brand-logo">${logo}</div>` : '<strong style="font-size:28px;color:#0b2f61">SERVIYA</strong>'}<div class="brand-text">Trabajo • Confianza • Oportunidades<br>Documento contractual oficial</div></div><div class="title"><h1>CONTRATO DE SERVICIOS SERVIYA</h1><p>Documento generado a partir del contrato digital registrado en SERVIYA</p></div><section class="document">${clone.outerHTML}</section><div class="notice"><b>Integridad y aceptación:</b> este documento reproduce la información del contrato digital registrado. La aceptación electrónica y el hash SHA-256 forman parte de la evidencia digital del acuerdo.</div><div class="footer"><span>Generado: ${escapeHtml(generated)}</span><span>SERVIYA • Desde el trabajo más pequeño hasta el trabajo más grande.</span></div></main></body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${contractNumber.replace(/[^a-zA-Z0-9_-]+/g, '-')}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export const ContractDocumentDownload: React.FC = () => {
  useEffect(() => {
    const inject = () => {
      const hash = Array.from(document.querySelectorAll<HTMLElement>('p')).find(node => (node.textContent || '').includes('Hash SHA-256:'));
      if (!hash) return;
      const card = hash.closest<HTMLElement>('.bg-white') || hash.parentElement?.closest<HTMLElement>('.bg-white') || hash.parentElement;
      if (!card || card.querySelector(`#${BUTTON_ID}`)) return;

      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.setAttribute('data-serviya-contract-download', 'true');
      button.setAttribute('aria-label', 'Descargar contrato SERVIYA');
      button.innerHTML = '⬇️ Descargar documento';
      button.style.cssText = 'width:100%;margin-top:14px;padding:13px 14px;border-radius:12px;border:1px solid #0b4fa3;background:#0b4fa3;color:white;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(11,79,163,.18);display:flex;align-items:center;justify-content:center;gap:8px';
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        const oldText = button.innerHTML;
        button.innerHTML = '⬇️ Preparando documento...';
        try {
          await downloadContractDocument(card);
        } finally {
          button.disabled = false;
          button.innerHTML = oldText;
        }
      });
      card.appendChild(button);
    };

    const observer = new MutationObserver(inject);
    observer.observe(document.body, { childList: true, subtree: true });
    inject();
    return () => observer.disconnect();
  }, []);

  return <WarrantyLauncher />;
};