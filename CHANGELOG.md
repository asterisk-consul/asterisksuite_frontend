Aquí tenés el contenido listo para tu archivo `changelog.md`, unificando los registros previos con los nuevos cambios que pasaste:

# Changelog

## [0.13.1-alpha] - 2026-08-04

### Fix o corregido

- **Cuentas Corrientes:** Los totales de saldos ahora respetan la moneda. Antes mezclaban USD y ARS en un solo monto. Los resúmenes muestran desglose por moneda y el historial usa una mini tabla por divisa.
- **Dashboard RRHH:** La card "Saldo total CC" ahora muestra el saldo por moneda en lugar de un único total mezclado.
- **Reporte Saldos RRHH:** Totales de empleados, socios y general ahora se desglosan por moneda.

---

## [0.15.0-alpha] - 2026-08-04

### Agregado

- **Documentos:** Páginas universales de detalle y creación para todas las categorías (Presupuesto, OV, Remito, Factura).
- **Documentos:** Máquina de estados con transiciones válidas por categoría.
- **Documentos:** Formularios modulares reutilizables (PresupuestoForm, OrdenVentaForm, FacturaForm).
- **Documentos:** Componente DocumentHeader compartido con badges de estado y cadena documental.
- **Documentos:** Componente DocumentHelpPopover con ayuda contextual.
- **Stakeholders:** BusinessPartyForm multi-tab para empleado/socio.

### Fix o corregido

- **Check Processing:** Scheduler automático de procesamiento de cheques pendientes.
- **Documents Sales:** Entregas parciales y facturación parcial.

---

## [0.14.0-alpha] - 2026-08-04

### Agregado

- **RRHH:** Vinculación de usuarios con empleados y socios (link/unlink).
- **RRHH:** Creación de empleados y socios con usuario asociado desde el formulario.
- **Settings:** Página de gestión de usuarios con CRUD completo, roles y cambio de contraseña.
- **Access Control:** Endpoints de gestión de usuarios: crear, editar, cambiar contraseña, buscar.
- **RRHH:** Columnas de tabla mejoradas con badge de usuario vinculado y filtros de estado.

### Fix o corregido

- **Employees/Partners:** Services y stores con métodos linkUser/unlinkUser.
- **Backend:** Companies controller con endpoints de usuarios (create, update, password, delete).

---

## [1.1.5-alpha] - 2026-03-20

### Fix o corregido

- **Clientes, Unidades y Viajes:** Corrección en la lógica de actualizaciones (updates).
- **Componentes UI:** Refactor de `Create.vue` y `Edit.vue` para los módulos de Clientes, Viajes y Corredores (_corridors_).

---

## [1.1.1-alpha] - 2026-03-17

### Modificado

- **Corredores:** Se integra toda la estructura de corredores (Pages, Stores, Services y Types) y su relación directa con el módulo de **Trips**.

### Fix o corregido

- [ ] Actualización de registros en nueva flota [DON-107](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-107)

---

## [0.0.1-alpha] - 2026-03-13

### Fix o corregido

- [x] Carga de clientes [DON-111](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-111)
- [x] Validación en tipo de vehículo [DON-110](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-110)
- [x] Timeout de la UI [DON-109](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-109)
- [x] Nueva flota: campo chofer [DON-108](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-108)
- [x] Actualizar refrigerado [DON-106](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-106)
- [x] Corrección en update de estados.
- [x] Fix en endpoint de vehículos.

---

## [0.0.0-alpha] - 2026-03-01

### Agregado

## [0.0.0-alpha] - 2026-03-01

### Agregado

- Inicio del proyecto.
- Módulo inicial de **Transporte** (v0.6.0-alpha).

¿Querés que te ayude a redactar alguna sección más técnica para la documentación del módulo de corredores?
