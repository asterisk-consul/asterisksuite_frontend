export interface DrilldownNode {
  label: string
  icon?: string
  to?: string
  exact?: boolean
  children?: DrilldownNode[]
}

// 🔥 ÁRBOL UNIFICADO DE NAVEGACIÓN (drill-down)
// Nivel 0: módulos principales → Nivel 1: secciones → Nivel 2+: sub-opciones
// Cada módulo arranca con su "Resumen" apuntando al dashboard/index existente
export const navigationTree: DrilldownNode[] = [
  {
    label: 'Inicio',
    icon: 'i-lucide-house',
    to: '/',
    exact: true
  },

  // ─── ERP: VENTAS ───────────────────────────────────────────────
  {
    label: 'Ventas',
    icon: 'i-lucide-receipt',
    children: [
      { label: 'Resumen', to: '/erp/sales' },
      { label: 'Presupuestos', to: '/erp/budgets' },
      { label: 'Órdenes de Venta', to: '/erp/orders' },
      { label: 'Comprobantes', to: '/erp/sales' },
      { label: 'Remitos', to: '/erp/remitos' },
      {
        label: 'Clientes',
        to: '/erp/sales/customers',
        children: [
          { label: 'Listado', to: '/erp/sales/customers' },
          { label: 'Nuevo cliente', to: '/erp/sales/customers/create' }
        ]
      },
      {
        label: 'Resumen de productos vendidos',
        to: '/erp/sales/sales-reports/salesProducts'
      }
    ]
  },

  // ─── ERP: COMPRAS ──────────────────────────────────────────────
  {
    label: 'Compras',
    icon: 'i-lucide-folder-closed',
    children: [
      { label: 'Resumen', to: '/erp/purchases' },
      { label: 'Órdenes de Compra', to: '/erp/orders?direction=-1' },
      { label: 'Comprobantes', to: '/erp/purchases/purchases-documents' },
      {
        label: 'Proveedores',
        to: '/erp/purchases/suppliers',
        children: [
          { label: 'Listado', to: '/erp/purchases/suppliers' },
          { label: 'Nuevo proveedor', to: '/erp/purchases/suppliers/create' }
        ]
      },
      { label: 'Resumen de productos comprados', to: '/productdash' }
    ]
  },

  // ─── ERP: TESORERÍA ────────────────────────────────────────────
  {
    label: 'Tesorería',
    icon: 'i-lucide-wallet',
    to: '/erp/treasury/dashboard',
    children: [
      { label: 'Resumen', to: '/erp/treasury/dashboard' },
      { label: 'Cuentas bancarias', to: '/erp/treasury/bank-accounts' },
      {
        label: 'Cajas',
        to: '/erp/treasury/cash-boxes',
        children: [
          { label: 'Cajas', to: '/erp/treasury/cash-boxes' },
          { label: 'Transferencias', to: '/erp/treasury/cash-box-transfers' }
        ]
      },
      { label: 'Pagos y cobros', to: '/erp/treasury/payments' },
      { label: 'Cheques', to: '/erp/treasury/checks' },
      { label: 'Cuentas corrientes', to: '/erp/treasury/current-accounts' },
      {
        label: 'Reportes',
        children: [
          { label: 'Movimientos', to: '/erp/treasury/reports/movements' },
          { label: 'Pagos por usuario', to: '/erp/treasury/reports/by-user' },
          { label: 'Entes reguladores', to: '/erp/treasury/reports/regulatory-payments' },
          { label: 'Servicios mensuales', to: '/erp/treasury/reports/utility-payments' }
        ]
      },
      {
        label: 'Contabilidad',
        children: [
          { label: 'Plan de cuentas', to: '/erp/contabilidad/accounts' },
          { label: 'Tipos de documento', to: '/erp/settings/document-types' },
          { label: 'Secuencias', to: '/erp/settings/document-sequences' },
          { label: 'Conceptos bancarios', to: '/erp/treasury/bank-concepts' },
          { label: 'Libro IVA', to: '/erp/treasury/reports/libro-iva' },
          { label: 'Reportes contables', to: '/erp/treasury/reports/accounting' },
          { label: 'Informe consolidado', to: '/erp/treasury/reports/consolidated' }
        ]
      }
    ]
  },

  // ─── ERP: RRHH ─────────────────────────────────────────────────
  {
    label: 'RRHH',
    icon: 'i-lucide-users',
    to: '/erp/rrhh',
    children: [
      { label: 'Resumen', to: '/erp/rrhh' },
      { label: 'Empleados', to: '/erp/rrhh/employees' },
      { label: 'Socios', to: '/erp/rrhh/partners' },
      { label: 'Vales', to: '/erp/rrhh/vales' },
      { label: 'Cuentas Corrientes', to: '/erp/rrhh/current-accounts' },
      {
        label: 'Reportes',
        children: [
          { label: 'Vales por período', to: '/erp/rrhh/reports/vales-periodo' },
          { label: 'Movimientos', to: '/erp/rrhh/reports/movimientos' },
          { label: 'Saldos', to: '/erp/rrhh/reports/saldos' }
        ]
      }
    ]
  },

  // ─── ERP: PARTES INTERESADAS ───────────────────────────────────
  {
    label: 'Partes interesadas',
    icon: 'i-lucide-building-2',
    to: '/erp/stakeholders',
    children: [
      { label: 'Listado', to: '/erp/stakeholders' },
      { label: 'Nuevo', to: '/erp/stakeholders/create' }
    ]
  },

  // ─── LOGÍSTICA ─────────────────────────────────────────────────
  {
    label: 'Logística',
    icon: 'i-lucide-truck',
    to: '/logistica',
    children: [
      { label: 'Resumen', to: '/logistica' },
      {
        label: 'Viajes',
        to: '/logistica/viajes',
        children: [
          { label: 'Viajes', to: '/logistica/viajes' },
          { label: 'Orden de despacho', to: '/logistica/viajes/dispatch-orders' },
          { label: 'Corredores', to: '/logistica/viajes/corridors' },
          { label: 'Choferes', to: '/logistica/viajes/drivers' },
          { label: 'Locaciones', to: '/logistica/viajes/locaciones' }
        ]
      },
      { label: 'Depósitos', to: '/logistica/warehouse' },
      {
        label: 'Flota',
        to: '/logistica/vehicles-combinations',
        children: [
          { label: 'Combinaciones', to: '/logistica/vehicles-combinations' },
          { label: 'Vehículos', to: '/logistica/vehicles-combinations/vehicles' }
        ]
      },
      {
        label: 'Partes interesadas',
        to: '/logistica/business-parties',
        children: [
          { label: 'Listado', to: '/logistica/business-parties' },
          { label: 'Contactos', to: '/logistica/business-parties/contacts' }
        ]
      },
      { label: 'Reportes', to: '/logistica/reportes/choferes' },
      {
        label: 'Configuraciones',
        children: [
          { label: 'Documentación de transporte', to: '/logistica/configuraciones/transport-document' },
          { label: 'Tarifas', to: '/logistica/configuraciones/tarifas' }
        ]
      }
    ]
  },

  // ─── STOCK / PRODUCTOS ─────────────────────────────────────────
  {
    label: 'Stock',
    icon: 'i-lucide-box',
    to: '/stock',
    children: [
      { label: 'Resumen', to: '/stock' },
      { label: 'Productos', to: '/productos' }
    ]
  },

  // ─── FABRICACIÓN ───────────────────────────────────────────────
  {
    label: 'Fabricación',
    icon: 'i-lucide-factory',
    to: '/fabricacion',
    children: [
      { label: 'Resumen', to: '/fabricacion' },
      {
        label: 'Productos',
        to: '/productos',
        children: [
          { label: 'Listado', to: '/productos' },
          { label: 'Nuevo producto', to: '/productos/create' },
          { label: 'Costos', to: '/productos/costos' }
        ]
      },
      { label: 'BOM (Ingeniería)', to: '/bom' },
      { label: 'Plantillas de costo', to: '/cost-templates' }
    ]
  },

  // ─── EMPRESA ───────────────────────────────────────────────────
  {
    label: 'Empresa',
    icon: 'i-lucide-building-2',
    children: [
      { label: 'Datos de la empresa', to: '/settings/company' },
      { label: 'Configuración Fiscal', to: '/settings/fiscal-config' },
      { label: 'Miembros', to: '/settings/members' }
    ]
  },

  // ─── AJUSTES ───────────────────────────────────────────────────
  {
    label: 'Ajustes',
    icon: 'i-lucide-settings',
    to: '/settings',
    exact: true,
    children: [
      { label: 'Perfil', to: '/settings', exact: true },
      { label: 'Usuarios y Roles', to: '/settings/users' },
      { label: 'Seguridad', to: '/settings/security' },
      { label: 'Impuestos', to: '/settings/taxes' },
      { label: 'Monedas', to: '/settings/monedas' },
      { label: 'Notificaciones', to: '/settings/notifications' }
    ]
  },

  // ─── DOCUMENTACIÓN (externa) ───────────────────────────────────
  {
    label: 'Documentación',
    icon: 'i-lucide-book-text',
    to: 'https://asterisk-consul.github.io/donandresdoc/'
  }
]
