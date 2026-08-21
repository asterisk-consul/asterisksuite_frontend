# Asterisk Suite — Product Page Copy

> Documento maestro con todo el copy de la landing page de ventas.
> Idioma: Español (Argentina). Tono: Startup/tech.

---

## Hero

**Tagline:**
Tu ERP, tu regla.

**Subtagline:**
Gestión empresarial completa para pymes argentinas. Ventas, compras, logística, stock, contabilidad y RRHH en una sola plataforma multi-tenant.

**CTA primario:** Crear mi empresa
**CTA secundario:** Ver documentación

---

## Problema

### Tu negocio merece más que planillas

Las pymes argentinas crecen con Excel, WhatsApp y llamadas. Pero llega un punto donde:

- **No sabés cuánto stock tenés** en cada depósito
- **Los viajes se pierden** entre planillas y llamadas
- **La facturación es un infierno** de copy-paste y errores
- **No tenés visibilidad** de cuentas corrientes ni pagos
- **Tu equipo trabaja doble** por falta de integración

No es un problema de gente. Es un problema de herramientas.

---

## Solución

### Asterisk Suite: un ERP que se adapta a vos

Asterisk Suite es una plataforma ERP/Logística multi-tenant diseñada para pymes argentinas. Cada empresa tiene su propia base de datos aislada, con control total sobre ventas, compras, inventario, logística, tesorería y más.

**Una plataforma. Todo conectado. Sin excusas.**

---

## Módulos

### ERP — Ventas y Compras
Facturación electrónica, órdenes de compra, remitos, presupuestos, cotizaciones. Todo el ciclo comercial de tu empresa.

### Tesorería y Finanzas
Cajas, cheques, cuentas corrientes, pagos, transferencias entre cajas. Control total de tu flujo de dinero.

### Logística y Transporte
Viajes, choferes, vehículos, rutas, almacenes, picking. Gestioná toda tu operación logística en un solo lugar.

### Inventario y Productos
Stock por depósito, BOM (lista de materiales), costos, categorías, atributos. Nunca más perdés de vista tu inventario.

### RRHH
Empleados, socios, vales, reportes. La gente de tu empresa también merece un buen sistema.

### Contabilidad
Plan de cuentas, asientos, balances. Tu contador te lo va a agradecer.

### Importación de Datos
Cargá productos, compras y ventas desde Excel en minutos. Pipeline de 4 etapas con validación automática.

---

## Diferenciadores

### Multi-tenant real
Cada empresa tiene su propia base de datos PostgreSQL. No es un flag en una tabla — es aislamiento real. Tus datos nunca se mezclan con los de otros.

### Seguridad de verdad
JWT con refresh rotation, bcrypt, auditoría automática de cada operación, soft-delete. Tu data está protegida desde el día uno.

### Control de acceso granular
Roles por defecto (admin, manager, user, viewer) + permisos por módulo + overrides por usuario. El OWNER bypass todo. RBAC completo.

### Open source, moderno
NestJS + Prisma + PostgreSQL + Nuxt 3 + Nuxt UI. Stack moderno, TypeScript en todo, sin deuda técnica.

---

## Stack Tecnológico

### Backend
- **NestJS 11** — Framework Node.js empresarial
- **Prisma 7** — ORM type-safe y migraciones
- **PostgreSQL** — Base de datos robusta y confiable
- **JWT + bcrypt** — Autenticación segura

### Frontend
- **Nuxt 4** — Framework Vue 3 con SSR
- **Nuxt UI 4** — Componentes UI modernos
- **Tailwind CSS** — Estilos utility-first
- **Pinia** — State management

### DevOps
- Multi-database provisioning automático
- Migraciones con `prisma migrate`
- Pool de conexiones por tenant

---

## Security

### Autenticación
- JWT access tokens (24h) + refresh tokens (7d)
- Refresh token rotation con ventana de gracia de 60s
- SHA-256 hashing de refresh tokens (nunca se almacenan en plaintext)
- Cambio de contraseña revoca todas las sesiones

### Autorización
- Guard chain por request: Tenant → Access → JWT → Permissions
- DENY override > ALLOW override > role permission > default deny
- OWNER bypass completo del PermissionsGuard

### Auditoría
- Prisma `$extends` intercepta todas las operaciones create/update/delete
- Logs automáticos con old/new data, userId e IP
- Tablas separadas para schema público y tenant

### Datos
- Cada tenant = base de datos PostgreSQL separada
- Two schemas por DB: `tenant` (datos de negocio) + `public` (compartido)
- Pool de conexiones: max 5 por tenant, cacheado en Map

---

## CTA Final

### ¿Listo para dejar de trabar con planillas?

Creá tu empresa en minutos. Sin compromisos. Sin tarjeta de crédito.

**Crear mi empresa** →
