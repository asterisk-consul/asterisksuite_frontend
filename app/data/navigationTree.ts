export interface DrilldownNode {
  label: string
  icon?: string
  to?: string
  exact?: boolean
  permission?: string
  children?: DrilldownNode[]
}

// 🔥 ÁRBOL UNIFICADO DE NAVEGACIÓN (drill-down)
// Campo `permission`: si el usuario no tiene este permiso, el nodo no se muestra
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
    permission: 'sales.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/erp/sales' },
      { label: 'Presupuestos', icon: 'i-lucide-file-text', to: '/erp/budgets' },
      { label: 'Órdenes de Venta', icon: 'i-lucide-shopping-cart', to: '/erp/orders' },
      { label: 'Comprobantes', icon: 'i-lucide-file-check', to: '/erp/sales' },
      { label: 'Remitos', icon: 'i-lucide-truck', to: '/erp/remitos' },
      {
        label: 'Clientes',
        icon: 'i-lucide-users',
        to: '/erp/sales/customers',
        children: [
          { label: 'Listado', icon: 'i-lucide-list', to: '/erp/sales/customers' },
          { label: 'Nuevo cliente', icon: 'i-lucide-user-plus', to: '/erp/sales/customers/create' }
        ]
      },
      {
        label: 'Resumen de productos vendidos',
        icon: 'i-lucide-bar-chart-3',
        to: '/erp/sales/sales-reports/salesProducts'
      }
    ]
  },

  // ─── ERP: COMPRAS ──────────────────────────────────────────────
  {
    label: 'Compras',
    icon: 'i-lucide-folder-closed',
    permission: 'purchases.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/erp/purchases/' },
      { label: 'Órdenes de Compra', icon: 'i-lucide-shopping-cart', to: '/erp/purchases/orders' },
      { label: 'Remitos de Compra', icon: 'i-lucide-truck', to: '/erp/purchases/remitos' },
      { label: 'Comprobantes', icon: 'i-lucide-file-check', to: '/erp/purchases' },
      {
        label: 'Proveedores',
        icon: 'i-lucide-building-2',
        to: '/erp/purchases/suppliers',
        children: [
          { label: 'Listado', icon: 'i-lucide-list', to: '/erp/purchases/suppliers' },
          { label: 'Nuevo proveedor', icon: 'i-lucide-user-plus', to: '/erp/purchases/suppliers/create' }
        ]
      },
      { label: 'Resumen de productos comprados', icon: 'i-lucide-bar-chart-3', to: '/productdash' }
    ]
  },

  // ─── ERP: TESORERÍA ────────────────────────────────────────────
  {
    label: 'Tesorería',
    icon: 'i-lucide-wallet',
    to: '/erp/treasury/dashboard',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/erp/treasury/dashboard' },
      {
        label: 'Cuentas bancarias',
        icon: 'i-lucide-landmark',
        to: '/erp/treasury/bank-accounts',
        permission: 'treasury.bank_accounts.read'
      },
      {
        label: 'Cajas',
        icon: 'i-lucide-wallet',
        to: '/erp/treasury/cash-boxes',
        permission: 'treasury.cash_boxes.read',
        children: [
          { label: 'Cajas', icon: 'i-lucide-wallet', to: '/erp/treasury/cash-boxes' },
          {
            label: 'Transferencias',
            icon: 'i-lucide-arrow-left-right',
            to: '/erp/treasury/cash-box-transfers',
            permission: 'treasury.cash_box_transfers.read'
          }
        ]
      },
      {
        label: 'Pagos y cobros',
        icon: 'i-lucide-hand-coins',
        to: '/erp/treasury/payments',
        permission: 'treasury.payments.read'
      },
      { label: 'Cheques', icon: 'i-lucide-square-check', to: '/erp/treasury/checks' },
      { label: 'Cuentas corrientes', icon: 'i-lucide-file-text', to: '/erp/treasury/current-accounts' },
      {
        label: 'Reportes',
        icon: 'i-lucide-bar-chart-3',
        children: [
          { label: 'Movimientos', icon: 'i-lucide-activity', to: '/erp/treasury/reports/movements' },
          { label: 'Pagos por usuario', icon: 'i-lucide-users', to: '/erp/treasury/reports/by-user' },
          { label: 'Entes reguladores', icon: 'i-lucide-building-2', to: '/erp/treasury/reports/regulatory-payments' },
          { label: 'Servicios mensuales', icon: 'i-lucide-zap', to: '/erp/treasury/reports/utility-payments' }
        ]
      },
      {
        label: 'Contabilidad',
        icon: 'i-lucide-calculator',
        children: [
          {
            label: 'Plan de cuentas',
            icon: 'i-lucide-list-tree',
            to: '/erp/contabilidad/accounts',
            permission: 'accounts.read'
          },
          { label: 'Tipos de documento', icon: 'i-lucide-file-text', to: '/erp/settings/document-types' },
          { label: 'Secuencias', icon: 'i-lucide-hash', to: '/erp/settings/document-sequences' },
          { label: 'Conceptos bancarios', icon: 'i-lucide-receipt', to: '/erp/treasury/bank-concepts' },
          { label: 'Libro IVA', icon: 'i-lucide-book-open', to: '/erp/treasury/reports/libro-iva' },
          { label: 'Reportes contables', icon: 'i-lucide-bar-chart-3', to: '/erp/treasury/reports/accounting' },
          { label: 'Informe consolidado', icon: 'i-lucide-file-text', to: '/erp/treasury/reports/consolidated' }
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
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/erp/rrhh' },
      { label: 'Empleados', icon: 'i-lucide-user', to: '/erp/rrhh/employees' },
      { label: 'Socios', icon: 'i-lucide-users', to: '/erp/rrhh/partners' },
      { label: 'Vales', icon: 'i-lucide-receipt', to: '/erp/rrhh/vales' },
      { label: 'Cuentas Corrientes', icon: 'i-lucide-file-text', to: '/erp/rrhh/current-accounts' },
      {
        label: 'Reportes',
        icon: 'i-lucide-bar-chart-3',
        children: [
          { label: 'Vales por período', icon: 'i-lucide-calendar', to: '/erp/rrhh/reports/vales-periodo' },
          { label: 'Movimientos', icon: 'i-lucide-activity', to: '/erp/rrhh/reports/movimientos' },
          { label: 'Saldos', icon: 'i-lucide-wallet', to: '/erp/rrhh/reports/saldos' }
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
      { label: 'Listado', icon: 'i-lucide-list', to: '/erp/stakeholders' },
      { label: 'Nuevo', icon: 'i-lucide-plus', to: '/erp/stakeholders/create' }
    ]
  },

  // ─── LOGÍSTICA ─────────────────────────────────────────────────
  {
    label: 'Logística',
    icon: 'i-lucide-truck',
    to: '/logistica',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/logistica' },
      {
        label: 'Viajes',
        icon: 'i-lucide-route',
        to: '/logistica/viajes',
        permission: 'trips.read',
        children: [
          { label: 'Viajes', icon: 'i-lucide-truck', to: '/logistica/viajes' },
          { label: 'Orden de despacho', icon: 'i-lucide-clipboard-list', to: '/logistica/viajes/dispatch-orders' },
          { label: 'Corredores', icon: 'i-lucide-map', to: '/logistica/viajes/corridors' },
          { label: 'Choferes', icon: 'i-lucide-user', to: '/logistica/viajes/drivers' },
          { label: 'Locaciones', icon: 'i-lucide-map-pin', to: '/logistica/viajes/locaciones' }
        ]
      },
      { label: 'Depósitos', icon: 'i-lucide-warehouse', to: '/logistica/warehouse', permission: 'warehouses.read' },
      {
        label: 'Flota',
        icon: 'i-lucide-car',
        to: '/logistica/vehicles-combinations',
        children: [
          { label: 'Combinaciones', icon: 'i-lucide-layers', to: '/logistica/vehicles-combinations' },
          { label: 'Vehículos', icon: 'i-lucide-bus-front', to: '/logistica/vehicles-combinations/vehicles' }
        ]
      },
      {
        label: 'Partes interesadas',
        icon: 'i-lucide-building-2',
        to: '/logistica/business-parties',
        children: [
          { label: 'Listado', icon: 'i-lucide-list', to: '/logistica/business-parties' },
          { label: 'Contactos', icon: 'i-lucide-users', to: '/logistica/business-parties/contacts' }
        ]
      },
      { label: 'Reportes', icon: 'i-lucide-bar-chart-3', to: '/logistica/reportes/choferes' },
      {
        label: 'Configuraciones',
        icon: 'i-lucide-cog',
        children: [
          {
            label: 'Documentación de transporte',
            icon: 'i-lucide-book-open',
            to: '/logistica/configuraciones/transport-document'
          },
          { label: 'Tarifas', icon: 'i-lucide-banknotes', to: '/logistica/configuraciones/tarifas' }
        ]
      }
    ]
  },

  // ─── STOCK / PRODUCTOS ─────────────────────────────────────────
  {
    label: 'Stock',
    icon: 'i-lucide-box',
    to: '/stock',
    permission: 'products.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/stock' },
      { label: 'Productos', icon: 'i-lucide-package', to: '/productos' }
    ]
  },

  // ─── FABRICACIÓN ───────────────────────────────────────────────
  {
    label: 'Fabricación',
    icon: 'i-lucide-factory',
    to: '/fabricacion',
    permission: 'products.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/fabricacion' },
      {
        label: 'Productos',
        icon: 'i-lucide-package',
        to: '/productos',
        children: [
          { label: 'Listado', icon: 'i-lucide-list', to: '/productos' },
          { label: 'Nuevo producto', icon: 'i-lucide-plus', to: '/productos/create' },
          { label: 'Costos', icon: 'i-lucide-dollar-sign', to: '/productos/costos' }
        ]
      },
      { label: 'BOM (Ingeniería)', icon: 'i-lucide-git-branch', to: '/bom' },
      { label: 'Plantillas de costo', icon: 'i-lucide-file-text', to: '/cost-templates' }
    ]
  },

  // ─── EMPRESA ───────────────────────────────────────────────────
  {
    label: 'Empresa',
    icon: 'i-lucide-building-2',
    children: [
      { label: 'Datos de la empresa', icon: 'i-lucide-building', to: '/settings/company' },
      { label: 'Configuración Fiscal', icon: 'i-lucide-percent', to: '/settings/fiscal-config' },
      { label: 'Miembros', icon: 'i-lucide-users', to: '/settings/members' }
    ]
  },

  // ─── AJUSTES ───────────────────────────────────────────────────
  {
    label: 'Ajustes',
    icon: 'i-lucide-settings',
    to: '/settings',
    exact: true,
    children: [
      { label: 'Perfil', icon: 'i-lucide-user', to: '/settings', exact: true },
      { label: 'Usuarios', icon: 'i-lucide-users', to: '/settings/users', permission: 'roles.read' },
      { label: 'Roles', icon: 'i-lucide-shield', to: '/settings/roles', permission: 'roles.read' },
      { label: 'Seguridad', icon: 'i-lucide-shield-check', to: '/settings/security' },
      { label: 'Impuestos', icon: 'i-lucide-percent', to: '/settings/taxes', permission: 'taxes.read' },
      { label: 'Monedas', icon: 'i-lucide-banknote', to: '/settings/monedas', permission: 'currencies.read' },
      { label: 'Notificaciones', icon: 'i-lucide-bell', to: '/settings/notifications' }
    ]
  }
]
