# Organización de usuarios por rol en SERVIYA

La interfaz administrativa debe presentar los usuarios separados por rol, sin mezclar experiencias ni permisos.

## Cliente
- Publica servicios y trabajos.
- Negocia con trabajadores.
- Paga el monto acordado directamente a Custodia SERVIYA.
- Consulta sus servicios, pagos, contratos, disputas y garantías.
- No solicita retiros ni usa depósito general.

## Trabajador / Técnico
- Publica/ofrece servicios y recibe solicitudes.
- Gestiona propuestas, contratos y trabajos asignados.
- Consulta saldo disponible y fondos en custodia asociados a trabajos.
- Registra una cuenta bancaria para pagos.
- Es el único usuario normal que puede solicitar retiros.

## Administración
- Panel protegido y separado.
- Usuarios organizados en Cliente / Trabajador-Técnico / Administración.
- Gestiona depósitos y custodia, liberaciones, retiros, verificaciones, cuentas bancarias, usuarios, administradores, disputas, auditoría y soporte.
- Puede agregar otros administradores con el mismo nivel de acceso.
- No tiene un retiro normal como trabajador.

## Regla de despliegue
Estas reglas son funcionales y deben mantenerse tanto en PWA como en web y panel administrativo. Los controles de backend son la autoridad final; ocultar un botón no sustituye la validación de permisos.