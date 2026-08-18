# Changelog

## 18 de agosto, 2026

<details open>
<summary>

### v0.25.0-alpha

> Cuentas corrientes: proveedores, empleados y socios muestran 'Saldo a favor' en vez de 'A cobrar' cuando el saldo es favorable a la empresa.

</summary>

---

##### 🩹 Fixes

- **current-accounts**: Label 'Saldo a favor' para proveedores/empleados/socios con saldo favorable (antes decía 'A cobrar')

##### ❤️ Contributors

- agustin

</details>

<details open>
<summary>

### v0.24.0-alpha

> Control de facturación al completar viaje: modal de confirmación con opción generar factura o solo completar. Recreación de vistas legacy en schema tenant.

</summary>

---

##### 🚀 Features

- **trips**: Modal de confirmación al completar viaje — preguntar si generar factura de venta o solo marcar completado
- **trips**: Backend: flag `generate` en `updateStatus` para controlar generación automática de factura
- **trips**: Endpoint `generate-from-trip` con proxy en frontend

##### 🩹 Fixes

- **views**: Recreación de vistas legacy (`vw_trips_drivers`, `tarifa`, `vista_liquidacion_choferes`, `vw_reporte_despachos`) en schema `tenant`

##### ❤️ Contributors

- agustin

</details>

## 04 de agosto, 2026

<details open>
<summary>

### v0.15.0-alpha

> Sistema de documentos unificado con máquina de estados, formularios modulares y páginas universales.

</summary>

#### 💡 Highlights

- **Páginas universales de documentos** — Una sola página maneja Presupuesto, OV, Remito y Factura con acciones dinámicas por categoría y estado. Incluye cadena documental, impresión y entregas parciales.
- **Máquina de estados** — Cada categoría de documento tiene sus propias transiciones válidas. El sistema valida y bloquea transiciones ilegales.

---

##### 🚀 Features

- **documents**: Páginas universales de detalle y creación para todas las categorías de documentos
- **documents**: Máquina de estados con transiciones válidas por categoría (QUOTE, ORDER, REMITO, INVOICE)
- **documents**: Formularios modulares: PresupuestoForm, OrdenVentaForm, FacturaForm reutilizables
- **documents**: Componente DocumentHeader compartido con badges de estado y cadena documental
- **documents**: Componente DocumentHelpPopover con ayuda de acciones y estados disponibles
- **stakeholders**: BusinessPartyForm con soporte multi-tab para empleado/socio

##### 🩹 Fixes

- **documents**: Check-processing scheduler: procesamiento automático de cheques pendientes
- **documents**: documents-sales: entregas parciales y facturación parcial

##### ❤️ Contributors

- agustin

</details>

<details>
<summary>

### v0.14.0-alpha

> Gestión de usuarios, vinculación empleados/socios, CRUD mejorado.

</summary>

#### 💡 Highlights

- **Vinculación de usuarios con empleados y socios** — Los empleados y socios ahora pueden vincularse a usuarios del sistema. Se puede crear el usuario directamente desde el formulario de alta.
- **Gestión completa de usuarios** — Nueva página de administración de usuarios con CRUD, asignación de roles, cambio de contraseña y búsqueda.

---

##### 🚀 Features

- **rrhh**: Vinculación de usuarios con empleados y socios (link/unlink)
- **rrhh**: Creación de empleados y socios con usuario asociado desde el formulario
- **settings**: Página de gestión de usuarios con CRUD completo, roles y cambio de contraseña
- **access-control**: Endpoints de gestión de usuarios: crear, editar, cambiar contraseña, buscar
- **rrhh**: Columnas de tabla mejoradas: badge de usuario vinculado, filtros de estado

##### 🩹 Fixes

- **employees**: Service y store con métodos linkUser/unlinkUser
- **partners**: Service y store con métodos linkUser/unlinkUser
- **backend**: Companies controller: endpoints de usuarios (create, update, password, delete)

##### ❤️ Contributors

- agustin

</details>

<details>
<summary>

### v0.13.1-alpha

> Cuentas corrientes: totales respetan moneda en vez de mezclar divisas.

</summary>

---

##### 🩹 Fixes

- **current-accounts**: Totales de saldos ahora se desglosan por moneda en listing de Treasury
- **current-accounts**: Historial de cuentas corrientes usa mini tabla por moneda en vez de texto corrido
- **rrhh**: Dashboard RRHH muestra saldo CC por moneda en vez de total mezclado
- **rrhh**: Reporte de saldos RRHH desglosa empleados/socios por moneda

##### ❤️ Contributors

- agustin

</details>

---

## 20 de marzo, 2026

<details>
<summary>

### v1.1.5-alpha

> Correcciones en lógica de updates y refactor de componentes UI.

</summary>

---

##### 🩹 Fixes

- **clientes**: Corrección en la lógica de actualizaciones (updates)
- **ui**: Refactor de `Create.vue` y `Edit.vue` para los módulos de Clientes, Viajes y Corredores

</details>

---

## 17 de marzo, 2026

<details>
<summary>

### v1.1.1-alpha

> Integración de corredores con trips.

</summary>

---

##### 🚀 Features

- **trips**: Integración completa de corredores (Pages, Stores, Services y Types) con el módulo de Trips

##### 🩹 Fixes

- **flota**: Actualización de registros en nueva flota [DON-107](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-107)

</details>

---

## 13 de marzo, 2026

<details>
<summary>

### v0.0.1-alpha

> Correcciones iniciales en UI y lógica.

</summary>

---

##### 🩹 Fixes

- **clientes**: Carga de clientes [DON-111](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-111)
- **vehiculos**: Validación en tipo de vehículo [DON-110](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-110)
- **ui**: Timeout de la UI [DON-109](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-109)
- **flota**: Campo chofer en nueva flota [DON-108](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-108)
- **logica**: Corrección en lógica de refrigerado [DON-106](https://asteriskconsul-1753224743977.atlassian.net/browse/DON-106)
- **general**: Corrección en update de estados
- **api**: Fix en endpoint de vehículos

</details>

---

## 01 de marzo, 2026

<details>
<summary>

### v0.0.0-alpha

> Inicio del proyecto.

</summary>

---

##### 🚀 Features

- **core**: Inicialización del sistema
- **transporte**: Módulo base de transporte (v0.6.0-alpha)

</details>
