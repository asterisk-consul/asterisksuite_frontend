# Guiones de video por versión

Guiones de grabación basados en `versiones/versions.json`, desde `0.92.0-alpha` hasta `0.100.0-alpha`. Cada escena indica qué mostrar y la locución que acompaña esa acción. Duración orientativa: 20–40 segundos por video. Usar datos de demostración y ocultar nombres, importes o credenciales reales.

## 0.92.0-alpha — Transferencias de Tesorería

**Escena 1 — Abrir el formulario.** Mostrar Tesorería y abrir la opción para crear una transferencia.

**Locución:** “Vamos a registrar una transferencia entre cuentas desde Tesorería.”

**Escena 2 — Identificar origen y destino.** Enfocar los campos de origen y destino; completar una cuenta de ejemplo y mostrar el selector de empresa solo si hay más de una disponible.

**Locución:** “El formulario diferencia claramente de qué cuenta salen los fondos y en cuál se reciben. Si tenés más de una empresa disponible, también podés elegir a cuál corresponde.”

**Escena 3 — Dejar pendiente y confirmar.** Guardar la transferencia pendiente y mostrar su estado. Luego señalar la acción de confirmación, sin ejecutarla si no se quiere modificar datos reales.

**Locución:** “Al registrarla queda pendiente. Los saldos se actualizan cuando confirmás la transferencia.”

## 0.93.0-alpha — VEP de retenciones e historial en Tesorería

**Escena 1 — Encontrar los VEP.** Abrir el listado de impuestos u obligaciones pendientes y señalar una fila de VEP.

**Locución:** “Los VEP de retenciones ahora aparecen junto con los impuestos pendientes de Tesorería.”

**Escena 2 — Consultar el detalle y el historial.** Abrir un VEP y mostrar el detalle de retenciones y los pagos asociados.

**Locución:** “Desde el detalle podés revisar las retenciones incluidas y consultar el historial de pagos vinculado al registro original.”

**Escena 3 — Mostrar una imputación parcial.** En una ficha de demostración, abrir el flujo para registrar una imputación parcial y señalar también la posibilidad de revertirla.

**Locución:** “Cuando corresponda, registrá una imputación parcial de retenciones sufridas y revertíla desde el mismo circuito si necesitás corregirla.”

## 0.93.1-alpha — Mejoras y prevención de operaciones duplicadas

**Escena 1 — Recorrer el formulario.** Mostrar las secciones de movimiento, documentos y medio de pago; destacar el orden de los cheques seleccionados.

**Locución:** “El formulario de pago organiza la información por secciones y conserva el orden de los cheques que seleccionaste.”

**Escena 2 — Mostrar protecciones ante doble clic.** En un entorno de prueba, iniciar una acción de pago o transferencia y hacer un segundo clic mientras procesa. Mostrar que la acción queda bloqueada hasta terminar.

**Locución:** “Si la operación todavía se está procesando, un segundo clic no vuelve a enviarla.”

**Escena 3 — Mencionar el alcance.** Mostrar brevemente acciones de caja, banco o stock sin repetir operaciones reales.

**Locución:** “La misma protección se aplica a movimientos de Tesorería, stock y confirmaciones de documentos con impacto operativo.”

## 0.93.2-alpha — Guardar borrador o confirmar

**Escena 1 — Editar un pago.** Abrir un pago de demostración, cambiar la fecha y acercar las acciones Guardar borrador y Confirmar.

**Locución:** “Al editar un pago o cobro, ahora se distinguen claramente dos acciones: guardar los cambios como borrador o confirmar la operación.”

**Escena 2 — Guardar la fecha.** Pulsar Guardar borrador y mostrar que la edición queda registrada.

**Locución:** “Si modificaste la fecha, primero guardá el borrador para conservar el cambio.”

**Escena 3 — Confirmar.** Señalar Confirmar después del guardado. En otra edición de prueba, mostrar que no se puede confirmar mientras la fecha modificada no se haya guardado.

**Locución:** “Así evitás confirmar una operación con una fecha distinta de la que quedó guardada.”

## 0.93.3-alpha — Movimientos anulados en caja

**Escena 1 — Vista normal de caja.** Abrir los movimientos de caja y mostrar que los pagos anulados no aparecen en la vista por defecto.

**Locución:** “La vista de caja prioriza los movimientos vigentes para que el seguimiento diario sea más claro.”

**Escena 2 — Consultar anulados.** Activar la opción o filtro correspondiente para incluir movimientos anulados y reversiones.

**Locución:** “Cuando necesitás revisar el historial, podés volver a mostrar los pagos anulados y sus reversiones. La separación visual no modifica el saldo ni el historial contable.”

## 0.93.4-alpha — Filtros y lectura de pagos

**Escena 1 — Filtrar pagos.** Abrir la tabla de pagos, desplegar un filtro y aplicarlo a registros de demostración.

**Locución:** “La tabla de pagos permite aplicar sus filtros para encontrar más rápido la operación que necesitás.”

**Escena 2 — Leer una fila.** Desplazarse por las columnas y enfocar tercero, comprobante u obligación e importe aplicado.

**Locución:** “En cada fila podés identificar primero a quién se pagó, qué documento u obligación se canceló y cuál fue el importe aplicado.”

## 0.93.5-alpha — Cuenta corriente en pestañas

**Escena 1 — Entrar al detalle.** Abrir una cuenta corriente y dejar visible la pestaña de detalle de movimientos.

**Locución:** “Al entrar a una cuenta corriente, la vista inicial muestra directamente el detalle de movimientos.”

**Escena 2 — Cambiar al análisis.** Seleccionar la pestaña de análisis y mostrar su contenido.

**Locución:** “Cuando querés revisar la información desde otra perspectiva, cambiás a la pestaña de análisis. Cada vista queda organizada en su propio espacio.”

## 0.93.6-alpha — Consultar y editar pagos

**Escena 1 — Abrir el comprobante aplicado.** Desde la referencia de factura dentro de un pago, hacer clic y mostrar el comprobante de venta o compra relacionado.

**Locución:** “Desde un pago podés abrir directamente la factura que tiene aplicada, ya sea de venta o de compra.”

**Escena 2 — Conservar la fecha editada.** Volver al pago, editar su fecha y mostrar el formulario mientras se cargan los documentos pendientes.

**Locución:** “Y si estás editando la fecha, el cambio se conserva mientras se cargan los documentos pendientes, sin que un borrador local lo reemplace.”

## 0.94.0-alpha — Preferencias de columnas sincronizadas

**Escena 1 — Personalizar una tabla.** Abrir una tabla, reordenar columnas y ocultar una que no se necesite.

**Locución:** “Acomodá el orden y la visibilidad de las columnas de acuerdo con tu forma de trabajar.”

**Escena 2 — Cambiar de dispositivo o navegador.** Abrir la misma tabla con el mismo usuario y empresa en otro navegador o equipo; mostrar que conserva la configuración.

**Locución:** “La preferencia se guarda por usuario, empresa y tabla, y se sincroniza para que encuentres la misma vista en tus otros dispositivos.”

## 0.95.0-alpha — Resúmenes de tarjetas corporativas

**Escena 1 — Ver consumos y cuotas.** Abrir un resumen mensual de tarjeta corporativa y mostrar compras agrupadas con sus cuotas.

**Locución:** “Las compras confirmadas con tarjeta corporativa se agrupan en resúmenes mensuales, con el detalle de sus cuotas según el cierre y vencimiento.”

**Escena 2 — Pagar el resumen.** En datos de prueba, seleccionar el pago total y mostrar el débito bancario generado.

**Locución:** “Al pagar el resumen, se saldan sus cuotas y se registra un único débito en la cuenta bancaria.”

**Escena 3 — Mostrar reversión.** En una operación de demostración, señalar la acción de reversión y el restablecimiento de cuotas pendientes; no realizarla sobre datos reales.

**Locución:** “Si se revierte el pago, se anula ese débito y las cuotas vuelven a quedar pendientes. El cálculo también admite hasta 48 cuotas y distribuye los centavos sin diferencias.”

## 0.96.0-alpha — Cobros por canal y liquidaciones

**Escena 1 — Configurar canales.** Mostrar la configuración de canales de cobro: POS, aplicación, QR, link y e-commerce.

**Locución:** “Configurá tus canales de cobro, como POS, aplicación, QR, link o e-commerce, sin depender de la marca de tarjeta del cliente.”

**Escena 2 — Agrupar cobros.** Abrir la gestión de liquidaciones y mostrar operaciones agrupadas por canal y moneda.

**Locución:** “Después agrupá los cobros por canal y moneda y revisá el neto junto con comisiones, impuestos, retenciones y referencias.”

**Escena 3 — Acreditar el neto.** Mostrar la selección de banco o billetera y el registro de la acreditación.

**Locución:** “Acreditá la liquidación en un banco o billetera virtual, y transferí saldos entre cuentas sin duplicar el ingreso.”

## 0.96.1-alpha — Diagnóstico de tareas programadas

**Escena 1 — Mostrar el alcance técnico.** Abrir un reporte o salida de monitoreo de una ejecución de prueba y enfocar duración y empresas procesadas.

**Locución:** “Las tareas programadas de cheques, reservas de stock y autorizaciones fiscales ahora procesan los registros por lotes.”

**Escena 2 — Mostrar métricas.** Enfocar RSS, heap y estado de los pools Prisma, ocultando datos de clientes y credenciales.

**Locución:** “Al finalizar, también registran duración y métricas de memoria y conexiones. Así el equipo técnico puede diagnosticar el proceso con datos concretos.”

## 0.97.0-alpha — Notificaciones, reportes y WhatsApp

**Escena 1 — Revisar la campana.** Abrir notificaciones, mostrar asignaciones y alertas; marcar una como leída y señalar las acciones de lectura masiva o eliminación.

**Locución:** “La campana reúne asignaciones y alertas operativas, fiscales y de Tesorería según tus permisos. Podés leerlas una por una, marcar varias como leídas o quitarlas de la lista.”

**Escena 2 — Explorar el consolidado.** Abrir el reporte consolidado y alternar entre grilla, gráficos, tablas y resumen.

**Locución:** “El reporte consolidado organiza la información en vistas de grilla, gráficos, tablas y resumen para las empresas seleccionadas.”

**Escena 3 — Mostrar el envío semanal.** Abrir la configuración del reporte semanal de inventario o consolidado; señalar grupo de OpenWA, selección de empresas, prueba e historial. No exponer números o credenciales.

**Locución:** “También podés preparar envíos semanales en PDF a grupos de WhatsApp, elegir las empresas, hacer una prueba y consultar el historial de ejecuciones.”

## 0.98.0-alpha — Exportaciones por empresa y moneda

**Escena 1 — Elegir presentación.** En el consolidado, seleccionar la opción de mostrar empresas juntas y luego la opción por empresa.

**Locución:** “Antes de descargar el consolidado, elegí si querés presentar las empresas juntas o separadas.”

**Escena 2 — Descargar archivos.** Exportar una vista de demostración a PDF y Excel.

**Locución:** “La elección se respeta en las descargas PDF y Excel.”

**Escena 3 — Mostrar el comparativo.** Enfocar el comparativo de totales seleccionados, separados por empresa y moneda.

**Locución:** “Además, el reporte incorpora un comparativo con los totales por empresa y moneda.”

## 0.98.1-alpha — Tablas consolidadas más legibles

**Escena 1 — Identificar empresas.** Mostrar filas de distintas empresas en el consolidado y enfocar la columna que identifica a cada una.

**Locución:** “En las tablas consolidadas ahora queda visible a qué empresa pertenece cada registro.”

**Escena 2 — Revisar el PDF.** Abrir una exportación y recorrer una tabla con varias columnas.

**Locución:** “También mejoramos el ajuste de las tablas del PDF para que el detalle se lea mejor y las columnas no queden comprimidas.”

## 0.99.0-alpha — Catálogo de descuentos y bonificaciones

**Escena 1 — Crear un concepto.** Abrir la gestión de conceptos comerciales y crear uno de ejemplo con nombre y valor sugerido.

**Locución:** “Creá conceptos de descuento y bonificación para reutilizarlos en tus facturas.”

**Escena 2 — Aplicarlo a una factura.** Abrir una factura de venta, seleccionar el concepto del catálogo y mostrar el valor sugerido.

**Locución:** “Al cargar una factura de venta, elegí un concepto existente y aplicá su valor sugerido.”

**Escena 3 — Editarlo y repetirlo en compras.** Modificar el valor para esa operación y mostrar que también se puede elegir en una factura de compra.

**Locución:** “El valor sigue siendo editable para cada caso, y el catálogo está disponible tanto para ventas como para compras.”

## 0.99.1-alpha — Permisos y estabilidad en pagos

**Escena 1 — Verificar permisos.** Abrir la configuración de roles y mostrar los permisos de pagos y obligaciones asignados a un rol de demostración.

**Locución:** “Los permisos de pagos y obligaciones ahora coinciden con los permisos asignados a cada rol.”

**Escena 2 — Mostrar el pago con cheques.** Abrir un pago de demostración con cheques y actualizar la ficha; mantener la pantalla unos segundos para mostrar que el contenido permanece estable.

**Locución:** “Además, al actualizar un pago con cheques, su ficha se mantiene estable mientras trabajás.”

## 0.100.0-alpha — Flujos comerciales y reportes ERP

**Escena 1 — Configurar concepto por comprobante.** Mostrar la configuración de conceptos comerciales y elegir el tipo de comprobante para el que se ofrece un descuento o bonificación.

**Locución:** “Configurá descuentos y bonificaciones según el tipo de comprobante para que cada documento ofrezca los conceptos que corresponden.”

**Escena 2 — Convertir un documento compatible.** Abrir un documento de prueba con un concepto aplicado y mostrar su conversión a otro documento compatible, conservando el concepto.

**Locución:** “Al convertir documentos compatibles, el concepto comercial se conserva en el nuevo comprobante.”

**Escena 3 — Consultar resúmenes.** Abrir los resúmenes de ventas y compras, elegir un período y mostrar métricas y gráficos comparativos por tipo de comprobante.

**Locución:** “En ventas y compras podés consultar métricas por período y comparar los resultados por tipo de comprobante.”

**Escena 4 — Crear comprobantes y adjuntar archivos.** Mostrar el acceso unificado para iniciar un comprobante, un filtro de estado o una mejora de carga con teclado. Cerrar abriendo una transferencia de Tesorería y mostrando la biblioteca o un archivo adjunto de ejemplo.

**Locución:** “También reunimos los accesos para crear comprobantes, mejoramos los formularios, los atajos de teclado y los filtros de estado. Y ahora podés organizar archivos y adjuntarlos a las transferencias de Tesorería.”
