import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PoliciesModalProps {
  onClose: () => void;
}

export const PoliciesModal: React.FC<PoliciesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-black text-slate-900">Políticas y Reglas SERVIYA.do</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">Reglas básicas para contratar, ofrecer servicios y proteger los fondos.</p>

        <div className="space-y-3 text-xs text-slate-700">
          {[
            ['1. Custodia SERVIYA', 'El pago de un servicio se mantiene en custodia hasta que el cliente confirme la finalización o exista una resolución administrativa.'],
            ['2. Cliente y fondos', 'El cliente puede depositar fondos en SERVIYA y utilizarlos para pagar servicios. El cliente no puede solicitar retiros normales.'],
            ['3. Trabajador y retiros', 'El trabajador puede solicitar retiros de sus fondos disponibles. Los retiros están sujetos a validación y procesamiento administrativo.'],
            ['4. Servicio contratado', 'El trabajador seleccionado debe realizar el servicio según la descripción, requisitos, fecha y condiciones acordadas.'],
            ['5. Cancelaciones', 'Una cancelación con fondos en custodia puede requerir revisión cuando existan intereses o posibles incumplimientos de las partes.'],
            ['6. No presentación', 'Si el trabajador no se presenta, el cliente puede reportarlo cuando exista un pago activo en custodia.'],
            ['7. Disputas', 'Cliente o trabajador pueden abrir una disputa cuando corresponda. Los fondos en custodia quedan protegidos mientras se revisa el caso.'],
            ['8. Reembolsos y resolución', 'La administración puede resolver una disputa con reembolso total, reembolso parcial o liberación de fondos al trabajador según la evidencia disponible.'],
            ['9. Verificación', 'La verificación de identidad y certificaciones puede ser requerida para ofrecer servicios como trabajador.'],
            ['10. Conducta', 'No se permite fraude, información falsa, abuso, daño intencional, suplantación ni uso indebido de la plataforma. SERVIYA puede suspender cuentas conforme a sus procedimientos.']
          ].map(([title, text]) => (
            <div key={title} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
              <p className="font-bold text-slate-900 mb-1">{title}</p>
              <p className="leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
