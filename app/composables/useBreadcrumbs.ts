import { useRoute } from 'vue-router'

const NON_CLICKABLE_GROUP_PATHS = new Set([
  '/logistica/configuraciones',
  '/logistica/reportes'
])

export const useBreadcrumbs = () => {
  const route = useRoute()
  const router = useRouter()
  const isNavigable = (to: string) =>
    !NON_CLICKABLE_GROUP_PATHS.has(to.replace(/\/$/, ''))
    && router.resolve(to).matched.length > 0

  const homeItem = { icon: 'i-lucide-house', to: '/' }

  const items = computed(() => {
    const base = [homeItem]

    // 👉 override manual desde páginas (edit, create, etc.)
    if (route.meta.breadcrumb) {
      const manualItems = route.meta.breadcrumb as Array<Record<string, any>>
      const safeItems = manualItems.map((item, index) => {
        if (!item.to || index === manualItems.length - 1) {
          const labelOnly = { ...item }
          delete labelOnly.to
          return labelOnly
        }
        return isNavigable(item.to) ? item : { ...item, to: undefined }
      })
      return [...base, ...safeItems]
    }

    const segments = route.path.split('/').filter(Boolean)

    const dynamic = segments
      .map((segment, index) => {
        const config = breadcrumbMap[segment]

        // 👉 label base
        let label = config?.label || formatLabel(segment)

        // 👉 si no hay label (ej: oculto), skip
        if (!label) return null

        const candidate = config?.to ?? '/' + segments.slice(0, index + 1).join('/')
        const isCurrentPage = index === segments.length - 1
        const isClickable = !isCurrentPage
          && config?.clickable !== false
          && isNavigable(candidate)

        return isClickable ? { label, to: candidate } : { label }
      })
      .filter(Boolean)

    return [...base, ...dynamic]
  })

  return { items }
}

//
// 🔥 MAPA CENTRAL
//
const breadcrumbMap: Record<
  string,
  { label: string; to?: string; clickable?: boolean }
> = {
  // módulos
  logistica: { label: 'Logística', to: '/logistica' },
  erp: { label: 'ERP', clickable: false },
  treasury: { label: 'Tesorería', to: '/erp/treasury/dashboard' },
  dashboard: { label: 'Resumen' },
  reports: { label: 'Reportes' },
  settings: { label: 'Configuración' },

  // agrupadores
  transport: { label: 'Transporte', clickable: false },
  'master-data': { label: 'Datos Maestros', clickable: false },
  configuraciones: { label: 'Configuraciones', clickable: false },
  containers: { label: 'Contenedores', clickable: false },

  // entidades
  trips: { label: 'Viajes', to: '/logistica/transport/trips' },
  'dispatch-orders': {
    label: 'Órdenes de despacho',
    to: '/logistica/viajes/dispatch-orders'
  },
  corridors: { label: 'Corredores' },
  drivers: { label: 'Choferes' },
  vehicles: { label: 'Vehículos' },
  'vehicle-combinations': { label: 'Flota' },
  warehouse: { label: 'Depósitos' },
  warehouses: { label: 'Depósitos', to: '/productos/warehouses' },
  'transport-document': { label: 'Documentación de transporte' },

  // master data
  'business-parties': { label: 'Partes Interesadas' },
  locations: { label: 'Ubicaciones' },
  stakeholders: { label: 'Partes interesadas' },

  // acciones
  create: { label: 'Crear', clickable: false },
  edit: { label: 'Editar', clickable: false },
  // ERP - ventas
  sales: { label: 'Ventas', to: '/erp/sales' },
  customers: { label: 'Clientes', to: '/erp/sales/customers' },
  purchases: { label: 'Compras', to: '/erp/purchases' },
  orders: { label: 'Órdenes' },
  budgets: { label: 'Presupuestos' },
  remitos: { label: 'Remitos' },
  suppliers: { label: 'Proveedores' },
  'purchases-documents': {
    label: 'Facturas de Compra',
    to: '/erp/purchases'
  },
  payments: { label: 'Pagos y cobros', to: '/erp/treasury/payments' },
  checks: { label: 'Cheques', to: '/erp/treasury/checks' },
  'cash-boxes': { label: 'Cajas', to: '/erp/treasury/cash-boxes' },
  'cash-box-transfers': { label: 'Transferencias de caja' },
  'bank-accounts': { label: 'Cuentas bancarias', to: '/erp/treasury/bank-accounts' },
  'bank-concepts': { label: 'Conceptos bancarios' },
  'current-accounts': { label: 'Cuentas corrientes' },
  'taxes-services': { label: 'Impuestos y servicios' },
  intake: { label: 'Capturas pendientes' },
  accounting: { label: 'Contabilidad' },
  consolidated: { label: 'Informe consolidado' },
  movements: { label: 'Movimientos' },
  'by-user': { label: 'Por usuario' },
  'expenses-by-account': { label: 'Movimientos por cuenta' },
  'libro-iva': { label: 'Libro IVA' },
  rrhh: { label: 'RRHH', to: '/erp/rrhh' },
  employees: { label: 'Empleados' },
  partners: { label: 'Socios' },
  vales: { label: 'Vales' },
  comisiones: { label: 'Comisiones' },
  'sales-flow': { label: 'Circuito de ventas' },
  'fiscal-authorizations': { label: 'Autorizaciones fiscales' },
  new: { label: 'Nuevo', clickable: false }
}

//
// 🔧 FORMAT LABEL (con UUID smart)
//
function formatLabel(segment: string): string | null {
  // 👉 UUID → mostrar corto
  if (/^[0-9a-f-]{36}$/.test(segment)) {
    return segment.split('-')[0] ?? null // e7450c8c
  }

  // 👉 si es número puro (id incremental), ocultar
  if (/^\d+$/.test(segment)) {
    return null
  }

  const knownLabel = routeSegmentLabels[segment]
  if (knownLabel) return knownLabel

  // Fallback por palabras para que una ruta nueva también nazca en español.
  const words = segment
    .replace(/([a-záéíóú])([A-Z])/g, '$1-$2')
    .split('-')
    .filter(Boolean)
    .map(word => routeWordLabels[word.toLowerCase()] ?? word.toLowerCase())

  const label = words.join(' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const routeSegmentLabels: Record<string, string> = {
  accounting: 'Contabilidad',
  accounts: 'Plan de cuentas',
  analisis: 'Análisis',
  attributes: 'Atributos',
  bom: 'Lista de materiales (BOM)',
  'business-parties': 'Partes interesadas',
  'by-party': 'Por cliente o proveedor',
  'by-point-of-sale': 'Por punto de venta',
  'by-supplier': 'Por proveedor',
  'by-user': 'Por usuario',
  'change-password': 'Cambiar contraseña',
  changelog: 'Historial de cambios',
  company: 'Empresa',
  configuracion: 'Configuración',
  consolidated: 'Informe consolidado',
  contacts: 'Contactos',
  'cost-templates': 'Plantillas de costos',
  'create-company': 'Crear empresa',
  dashboard: 'Resumen',
  'data-import': 'Importación de datos',
  'dispatch-orders': 'Órdenes de despacho',
  'document-sequences': 'Secuencias de documentos',
  'document-types': 'Tipos de documento',
  drivers: 'Choferes',
  employees: 'Empleados',
  fabricacion: 'Fabricación',
  fiscal: 'Fiscal',
  'fiscal-config': 'Configuración fiscal',
  'fiscal-rules': 'Reglas fiscales',
  'international-operations': 'Operaciones internacionales',
  inbox: 'Bandeja de entrada',
  landing: 'Inicio',
  login: 'Iniciar sesión',
  'operaciones-internacionales': 'Operaciones internacionales',
  management: 'Estado de la empresa',
  members: 'Miembros',
  notifications: 'Notificaciones',
  partners: 'Socios',
  permissions: 'Permisos',
  'price-lists': 'Listas de precios',
  productdash: 'Productos comprados',
  register: 'Registrarse',
  'purchases-documents': 'Comprobantes de compra',
  'regulatory-payments': 'Pagos regulatorios',
  security: 'Seguridad',
  'sales-reports': 'Reportes de ventas',
  'select-company': 'Seleccionar empresa',
  settings: 'Configuración',
  stakeholders: 'Partes interesadas',
  suppliers: 'Proveedores',
  taxes: 'Impuestos',
  tags: 'Etiquetas',
  'taxes-services': 'Impuestos y servicios',
  'transport-document': 'Documentación de transporte',
  trash: 'Papelera',
  treasury: 'Tesorería',
  'utility-payments': 'Pagos de servicios',
  vehicles: 'Vehículos',
  'vehicles-combinations': 'Flota',
  warehouses: 'Depósitos',
  withholdings: 'Retenciones',
  'vales-periodo': 'Vales por período',
  salesProducts: 'Productos vendidos',
  ReporteBiPages: 'Reporte BI'
}

const routeWordLabels: Record<string, string> = {
  account: 'cuenta',
  accounts: 'cuentas',
  bank: 'bancarias',
  boxes: 'cajas',
  business: 'partes',
  cash: 'caja',
  change: 'cambiar',
  combinations: 'combinaciones',
  company: 'empresa',
  consolidated: 'consolidado',
  containers: 'contenedores',
  create: 'crear',
  current: 'corrientes',
  customers: 'clientes',
  dashboard: 'resumen',
  document: 'documento',
  documents: 'documentos',
  edit: 'editar',
  employees: 'empleados',
  expenses: 'movimientos',
  fiscal: 'fiscal',
  import: 'importación',
  intake: 'capturas pendientes',
  international: 'internacionales',
  lists: 'listas',
  movements: 'movimientos',
  new: 'nuevo',
  notifications: 'notificaciones',
  of: 'de',
  operations: 'operaciones',
  orders: 'órdenes',
  partners: 'socios',
  payments: 'pagos',
  point: 'punto',
  price: 'precios',
  products: 'productos',
  purchases: 'compras',
  reports: 'reportes',
  rules: 'reglas',
  sale: 'venta',
  sales: 'ventas',
  security: 'seguridad',
  sequences: 'secuencias',
  services: 'servicios',
  suppliers: 'proveedores',
  templates: 'plantillas',
  transport: 'transporte',
  types: 'tipos',
  user: 'usuario',
  users: 'usuarios',
  vehicles: 'vehículos',
  warehouses: 'depósitos',
  by: 'por'
}
