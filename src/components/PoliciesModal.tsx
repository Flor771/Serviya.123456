import React, { useState } from 'react';
import { X, ShieldCheck, FileText, LockKeyhole } from 'lucide-react';

interface PoliciesModalProps { onClose: () => void; }

type Section = { title: string; text: string };

const TERMS: Section[] = [
  { title: '1. Qué es SERVIYA', text: 'SERVIYA es una plataforma digital que facilita la publicación, búsqueda, contratación y seguimiento de servicios entre CLIENTES y TRABAJADORES/TÉCNICOS. SERVIYA registra las operaciones y ofrece herramientas de comunicación, contratación, custodia administrativa, evidencias, disputas y garantía cuando corresponda.' },
  { title: '2. Cuentas y datos verdaderos', text: 'Cada persona debe utilizar sus propios datos y mantenerlos actualizados. No se permite suplantar a otra persona, crear cuentas para fraude o utilizar información bancaria que no pertenezca al usuario autorizado.' },
  { title: '3. Roles', text: 'CLIENTE utiliza SERVIYA para contratar y pagar servicios. TRABAJADOR/TÉCNICO utiliza SERVIYA para ofrecer y realizar trabajos y solicitar retiros de fondos disponibles. ADMINISTRACIÓN gestiona verificaciones, depósitos, custodia, contratos, disputas y retiros según sus permisos.' },
  { title: '4. Publicaciones y postulaciones', text: 'El cliente debe describir correctamente el servicio, precio o presupuesto, alcance, fecha, ubicación y condiciones relevantes. El trabajador debe postularse únicamente a trabajos que pueda realizar. Una vez seleccionado un trabajador, las postulaciones quedan cerradas para ese servicio.' },
  { title: '5. Acuerdo y contrato digital', text: 'Antes de iniciar un trabajo pueden quedar registrados precio, alcance, fechas, ubicación, materiales y otras condiciones negociadas. Cuando el flujo lo requiera, SERVIYA genera un contrato digital. Las aceptaciones electrónicas quedan registradas como parte del historial de la operación.' },
  { title: '6. Transferencias y comprobantes', text: 'Durante la etapa inicial de operación, los pagos se realizan mediante transferencia a las cuentas bancarias indicadas por SERVIYA. El cliente debe registrar el comprobante y los datos solicitados. El depósito no se considera confirmado hasta que Administración verifique la transferencia.' },
  { title: '7. Custodia administrativa', text: 'Después de verificar un depósito, Administración puede marcar los fondos como retenidos en Custodia para el servicio correspondiente. Mientras estén retenidos no son fondos disponibles para retiro del trabajador.' },
  { title: '8. Finalización y liberación', text: 'El trabajador debe completar el trabajo y aportar la evidencia solicitada. El cliente revisa el resultado y confirma la finalización. Después de las validaciones correspondientes, Administración puede aprobar la liberación. SERVIYA registra el movimiento y la comisión configurada.' },
  { title: '9. Retiros del trabajador', text: 'El trabajador solo puede solicitar fondos disponibles. Los fondos pendientes, retenidos en Custodia o sujetos a disputa no están disponibles para retiro. Administración revisa y procesa las solicitudes.' },
  { title: '10. Cancelaciones y reembolsos', text: 'Las cancelaciones se resuelven según el estado del trabajo, las condiciones acordadas, las evidencias y el estado de los fondos. Cuando corresponda un reembolso, Administración registra la decisión y el movimiento asociado.' },
  { title: '11. Disputas', text: 'Cliente o trabajador pueden reportar un desacuerdo. Administración podrá revisar contrato, mensajes, comprobantes, evidencias, estados, fechas y demás registros disponibles para tomar una decisión conforme a las reglas de SERVIYA y a la legislación aplicable.' },
  { title: '12. Garantía y revisitas', text: 'Cuando un servicio tenga garantía activa, el cliente puede solicitar una revisita por un problema relacionado directamente con el trabajo contratado. La garantía no cubre automáticamente daños por mal uso, accidentes, modificaciones de terceros, desgaste normal ni trabajos nuevos no incluidos en el acuerdo.' },
  { title: '13. Ubicación', text: 'Cuando el servicio lo requiera, el cliente puede proporcionar la ubicación del trabajo mediante el mapa de SERVIYA. La ubicación se utiliza para facilitar la ejecución del servicio y la navegación del trabajador. El usuario debe evitar publicar información de ubicación que no sea necesaria.' },
  { title: '14. Conductas prohibidas', text: 'Se prohíben fraude, estafa, suplantación, amenazas, acoso, contenido ilegal, trabajos ilícitos, manipulación de comprobantes, intento de saltarse la custodia, acceso a cuentas ajenas y cualquier uso que perjudique a otros usuarios o a SERVIYA.' },
  { title: '15. Suspensión y cierre de cuentas', text: 'SERVIYA puede limitar o suspender una cuenta cuando existan indicios de fraude, incumplimiento, riesgo para otros usuarios, uso indebido de la plataforma o violación de estas condiciones. Las operaciones pendientes se revisarán según su estado.' },
  { title: '16. Disponibilidad', text: 'SERVIYA procura mantener la plataforma disponible, pero pueden existir interrupciones por mantenimiento, proveedores externos, fallos de red, dispositivos, fuerza mayor u otras causas. Una interrupción no autoriza a manipular estados o registros de una operación.' },
  { title: '17. Responsabilidad', text: 'SERVIYA facilita la conexión y gestión digital de las operaciones. Cliente y trabajador son responsables de la información que proporcionan, del cumplimiento de sus obligaciones y de ejecutar el servicio contratado conforme al acuerdo. SERVIYA no garantiza resultados que dependan exclusivamente de un usuario o tercero.' },
  { title: '18. Cambios de las condiciones', text: 'SERVIYA puede actualizar estas condiciones para reflejar cambios operativos, legales o de seguridad. Las nuevas versiones se mostrarán en la plataforma y podrán requerir una nueva aceptación cuando corresponda.' },
  { title: '19. Ley aplicable', text: 'Las operaciones de SERVIYA dirigidas al mercado dominicano se gestionarán conforme a la legislación aplicable de la República Dominicana. Cuando una disposición de estas condiciones sea inválida, las demás disposiciones continuarán vigentes en la medida permitida por la ley.' },
  { title: '20. Aceptación', text: 'Al crear una cuenta, el usuario declara que leyó y acepta estas condiciones y la Política de Privacidad. La aceptación se registra junto con la cuenta y puede ser necesaria nuevamente cuando SERVIYA publique una versión que requiera aceptación.' },
];

const PRIVACY: Section[] = [
  { title: '1. Responsable y alcance', text: 'SERVIYA utiliza los datos necesarios para operar la plataforma, conectar clientes y trabajadores, administrar operaciones y prestar soporte. Esta política explica qué información puede recopilarse, para qué se utiliza y cómo se protege.' },
  { title: '2. Datos de cuenta', text: 'Podemos recopilar nombre, apellido, correo electrónico, teléfono, provincia, municipio, rol, fotografía de perfil y credenciales técnicas necesarias para iniciar sesión.' },
  { title: '3. Verificación de identidad', text: 'Para verificar trabajadores pueden solicitarse datos o documentos de identidad y certificaciones. Estos datos se utilizan para el proceso de verificación y para cumplir controles de seguridad. No deben publicarse innecesariamente.' },
  { title: '4. Trabajos y comunicaciones', text: 'SERVIYA puede conservar publicaciones, postulaciones, negociaciones, contratos, mensajes relacionados con trabajos, evidencias, valoraciones, disputas y estados necesarios para prestar el servicio y resolver reclamaciones.' },
  { title: '5. Fotografías y documentos', text: 'Las fotos y documentos enviados para un trabajo, verificación o garantía se utilizan para la finalidad indicada. El acceso debe limitarse a las personas y funciones que necesiten esa información para operar el servicio.' },
  { title: '6. Ubicación', text: 'Cuando el usuario autorice la ubicación del dispositivo, SERVIYA puede utilizarla para facilitar la selección o navegación hacia un lugar de trabajo. La ubicación del servicio puede quedar asociada al trabajo para que las partes autorizadas puedan ejecutarlo.' },
  { title: '7. Información bancaria', text: 'Para retiros de trabajadores pueden registrarse banco, tipo o número de cuenta y datos necesarios para identificar el destino del pago. Esta información debe mantenerse restringida y no mostrarse públicamente.' },
  { title: '8. Datos de operaciones', text: 'SERVIYA conserva referencias de transferencias, comprobantes, montos, estados de Custodia, comisiones, liberaciones, retiros y demás movimientos necesarios para auditoría y conciliación.' },
  { title: '9. Seguridad', text: 'SERVIYA aplica controles técnicos y administrativos razonables para proteger cuentas y datos. Ningún sistema conectado a Internet puede garantizar riesgo cero; por eso los usuarios deben mantener sus contraseñas y dispositivos protegidos.' },
  { title: '10. Proveedores tecnológicos', text: 'SERVIYA puede utilizar proveedores de alojamiento, base de datos, almacenamiento, autenticación, mapas, mensajería u otros servicios tecnológicos necesarios para operar. Solo deben compartirse los datos necesarios para cada función.' },
  { title: '11. Conservación', text: 'Los datos se conservarán durante el tiempo necesario para operar la cuenta, mantener historiales, resolver disputas, cumplir obligaciones legales y proteger los derechos de SERVIYA y sus usuarios. Cuando ya no sean necesarios, se eliminarán o anonimizarán cuando corresponda.' },
  { title: '12. Derechos del usuario', text: 'El usuario puede solicitar información sobre sus datos, corrección de información inexacta y, cuando legalmente corresponda, eliminación u otras medidas. Algunas informaciones pueden tener que conservarse por obligaciones legales, seguridad o historial de operaciones.' },
  { title: '13. Contacto y reclamaciones', text: 'Las solicitudes relacionadas con privacidad deben dirigirse al canal de soporte que SERVIYA habilite. Las solicitudes deberán identificar suficientemente la cuenta para evitar entregar información a una persona no autorizada.' },
  { title: '14. Actualizaciones', text: 'Esta política puede actualizarse cuando cambien las funciones, proveedores, prácticas de seguridad o requisitos legales. La versión vigente será la que se publique en SERVIYA y podrá requerir nueva aceptación cuando corresponda.' },
];

export const PoliciesModal: React.FC<PoliciesModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');
  const sections = tab === 'terms' ? TERMS : PRIVACY;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 relative my-4 max-h-[92vh] overflow-hidden flex flex-col">
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100" aria-label="Cerrar"><X className="w-5 h-5"/></button>
      <div className="p-5 sm:p-7 border-b border-slate-100 pr-14">
        <div className="flex items-start gap-3"><ShieldCheck className="w-7 h-7 text-blue-600 shrink-0"/><div><h2 className="text-xl sm:text-2xl font-black text-slate-900">SERVIYA · Legal y privacidad</h2><p className="text-xs sm:text-sm text-slate-500 mt-1">Condiciones de uso y tratamiento de datos para la operación de SERVIYA.</p></div></div>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={() => setTab('terms')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black border ${tab === 'terms' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}><FileText className="w-4 h-4"/> Términos y condiciones</button>
          <button onClick={() => setTab('privacy')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black border ${tab === 'privacy' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}><LockKeyhole className="w-4 h-4"/> Política de privacidad</button>
        </div>
      </div>
      <div className="p-5 sm:p-7 overflow-y-auto">
        <p className="text-[11px] text-slate-400 mb-4">Documento informativo para la operación de SERVIYA en República Dominicana. Debe revisarse con asesoría legal local antes del lanzamiento comercial definitivo.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs text-slate-700">
          {sections.map(section => <section key={section.title} className="bg-slate-50 border border-slate-100 rounded-2xl p-4"><h3 className="font-black text-slate-900 mb-1">{section.title}</h3><p className="leading-relaxed text-slate-600">{section.text}</p></section>)}
        </div>
      </div>
    </div>
  </div>;
};
