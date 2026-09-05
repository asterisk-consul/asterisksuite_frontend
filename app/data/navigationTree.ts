export interface DrilldownNode {
  label: string
  icon?: string
  to?: string
  exact?: boolean
  permission?: string
  visibleIf?: 'is_salesperson'
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

  // ─── MIS VENTAS ──────────────────────────────────────────────
  {
    label: 'Mis ventas',
    icon: 'i-lucide-bar-chart-3',
    to: '/mis-ventas',
    visibleIf: 'is_salesperson',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/mis-ventas' },
      { label: 'Mis órdenes', icon: 'i-lucide-file-text', to: '/mis-ventas/ordenes' },
      { label: 'Pend. de cobro', icon: 'i-lucide-clock', to: '/mis-ventas/pendientes' },
      { label: 'Por cliente', icon: 'i-lucide-users', to: '/mis-ventas/por-cliente' },
      { label: 'Análisis', icon: 'i-lucide-bar-chart-3', to: '/mis-ventas/analisis' }
    ]
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
      },
      {
        label: 'Ventas por Punto de Venta',
        icon: 'i-lucide-map-pin',
        to: '/erp/sales/sales-reports/by-point-of-sale'
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
      {
        label: 'Resumen',
        icon: 'i-lucide-layout-dashboard',
        to: '/erp/treasury/dashboard',
        permission: 'payments.read'
      },
      {
        label: 'Cuentas bancarias',
        icon: 'i-lucide-landmark',
        to: '/erp/treasury/bank-accounts',
        permission: 'bank_accounts.read'
      },
      {
        label: 'Cajas',
        icon: 'i-lucide-wallet',
        to: '/erp/treasury/cash-boxes',
        permission: 'cash_boxes.read',
        children: [
          { label: 'Cajas', icon: 'i-lucide-wallet', to: '/erp/treasury/cash-boxes', permission: 'cash_boxes.read' },
          {
            label: 'Transferencias',
            icon: 'i-lucide-arrow-left-right',
            to: '/erp/treasury/cash-box-transfers',
            permission: 'cash_box_transfers.read'
          }
        ]
      },
      {
        label: 'Pagos y cobros',
        icon: 'i-lucide-hand-coins',
        to: '/erp/treasury/payments',
        permission: 'payments.read'
      },
      {
        label: 'Capturas pendientes',
        icon: 'i-lucide-inbox',
        to: '/erp/treasury/intake',
        permission: 'intake.read'
      },
      { label: 'Cheques', icon: 'i-lucide-square-check', to: '/erp/treasury/checks', permission: 'payments.read' },
      {
        label: 'Cuentas corrientes',
        icon: 'i-lucide-file-text',
        to: '/erp/treasury/current-accounts',
        permission: 'payments.read'
      },
      {
        label: 'Impuestos y servicios',
        icon: 'i-lucide-landmark',
        to: '/erp/treasury/taxes-services',
        permission: 'payments.read'
      },
      {
        label: 'Reportes',
        icon: 'i-lucide-bar-chart-3',
        permission: 'payments.read',
        children: [
          {
            label: 'Movimientos',
            icon: 'i-lucide-activity',
            to: '/erp/treasury/reports/movements',
            permission: 'payments.read'
          },
          {
            label: 'Pagos por usuario',
            icon: 'i-lucide-users',
            to: '/erp/treasury/reports/by-user',
            permission: 'payments.read'
          }
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
          {
            label: 'Tipos de documento',
            icon: 'i-lucide-file-text',
            to: '/erp/settings/document-types',
            permission: 'payments.read'
          },
          {
            label: 'Secuencias',
            icon: 'i-lucide-hash',
            to: '/erp/settings/document-sequences',
            permission: 'payments.read'
          },
          {
            label: 'Conceptos bancarios',
            icon: 'i-lucide-receipt',
            to: '/erp/treasury/bank-concepts',
            permission: 'bank_accounts.read'
          },
          {
            label: 'Libro IVA',
            icon: 'i-lucide-book-open',
            to: '/erp/treasury/reports/libro-iva',
            permission: 'payments.read'
          },
          {
            label: 'Reportes contables',
            icon: 'i-lucide-bar-chart-3',
            to: '/erp/treasury/reports/accounting',
            permission: 'payments.read'
          },
          {
            label: 'Gastos por cuenta',
            icon: 'i-lucide-chart-pie',
            to: '/erp/treasury/reports/expenses-by-account',
            permission: 'payments.read'
          },
          {
            label: 'Informe consolidado',
            icon: 'i-lucide-file-text',
            to: '/erp/treasury/reports/consolidated',
            permission: 'payments.read'
          }
        ]
      }
    ]
  },

  // ─── ERP: RRHH ─────────────────────────────────────────────────
  {
    label: 'RRHH',
    icon: 'i-lucide-users',
    to: '/erp/rrhh',
    permission: 'employees.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/erp/rrhh', permission: 'employees.read' },
      { label: 'Empleados', icon: 'i-lucide-user', to: '/erp/rrhh/employees', permission: 'employees.read' },
      { label: 'Socios', icon: 'i-lucide-users', to: '/erp/rrhh/partners', permission: 'partners.read' },
      { label: 'Vales', icon: 'i-lucide-receipt', to: '/erp/rrhh/vales', permission: 'vales.read' },
      {
        label: 'Cuentas Corrientes',
        icon: 'i-lucide-file-text',
        to: '/erp/rrhh/current-accounts',
        permission: 'employees.read'
      },
      {
        label: 'Reportes',
        icon: 'i-lucide-bar-chart-3',
        permission: 'employees.read',
        children: [
          {
            label: 'Vales por período',
            icon: 'i-lucide-calendar',
            to: '/erp/rrhh/reports/vales-periodo',
            permission: 'vales.read'
          },
          {
            label: 'Comisiones',
            icon: 'i-lucide-percent',
            to: '/erp/rrhh/reports/comisiones',
            permission: 'employees.read'
          },
          {
            label: 'Movimientos',
            icon: 'i-lucide-activity',
            to: '/erp/rrhh/reports/movimientos',
            permission: 'employees.read'
          },
          { label: 'Saldos', icon: 'i-lucide-wallet', to: '/erp/rrhh/reports/saldos', permission: 'employees.read' }
        ]
      }
    ]
  },

  // ─── ERP: PARTES INTERESADAS ───────────────────────────────────
  {
    label: 'Partes interesadas',
    icon: 'i-lucide-building-2',
    to: '/erp/stakeholders',
    permission: 'business_parties.read',
    children: [
      { label: 'Listado', icon: 'i-lucide-list', to: '/erp/stakeholders', permission: 'business_parties.read' },
      { label: 'Nuevo', icon: 'i-lucide-plus', to: '/erp/stakeholders/create', permission: 'business_parties.create' }
    ]
  },

  // ─── LOGÍSTICA ─────────────────────────────────────────────────
  {
    label: 'Logística',
    icon: 'i-lucide-truck',
    to: '/logistica',
    permission: 'trips.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/logistica', permission: 'trips.read' },
      {
        label: 'Viajes',
        icon: 'i-lucide-route',
        to: '/logistica/viajes',
        permission: 'trips.read',
        children: [
          { label: 'Viajes', icon: 'i-lucide-truck', to: '/logistica/viajes', permission: 'trips.read' },
          {
            label: 'Orden de despacho',
            icon: 'i-lucide-clipboard-list',
            to: '/logistica/viajes/dispatch-orders',
            permission: 'dispatch_orders.read'
          },
          {
            label: 'Corredores',
            icon: 'i-lucide-map',
            to: '/logistica/viajes/corridors',
            permission: 'corridors.read'
          },
          { label: 'Choferes', icon: 'i-lucide-user', to: '/logistica/viajes/drivers', permission: 'drivers.read' }
        ]
      },
      {
        label: 'Flota',
        icon: 'i-lucide-car',
        to: '/logistica/vehicles-combinations',
        permission: 'vehicles.read',
        children: [
          {
            label: 'Combinaciones',
            icon: 'i-lucide-layers',
            to: '/logistica/vehicles-combinations',
            permission: 'vehicle_combinations.read'
          },
          {
            label: 'Vehículos',
            icon: 'i-lucide-bus-front',
            to: '/logistica/vehicles-combinations/vehicles',
            permission: 'vehicles.read'
          }
        ]
      },
      {
        label: 'Mantenimiento',
        icon: 'i-lucide-wrench',
        to: '/logistica/mantenimiento',
        permission: 'trips.read',
        children: [
          {
            label: 'Dashboard',
            icon: 'i-lucide-layout-dashboard',
            to: '/logistica/mantenimiento/dashboard',
            permission: 'trips.read'
          },
          {
            label: 'Órdenes',
            icon: 'i-lucide-clipboard-list',
            to: '/logistica/mantenimiento',
            permission: 'trips.read'
          },
          {
            label: 'Cubiertas',
            icon: 'i-lucide-circle',
            to: '/logistica/mantenimiento/cubiertas',
            permission: 'trips.read'
          },
          {
            label: 'Planes preventivos',
            icon: 'i-lucide-calendar-check',
            to: '/logistica/mantenimiento/planes',
            permission: 'trips.read'
          }
        ]
      },
      {
        label: 'Partes interesadas',
        icon: 'i-lucide-building-2',
        to: '/logistica/business-parties',
        permission: 'business_parties.read',
        children: [
          {
            label: 'Listado',
            icon: 'i-lucide-list',
            to: '/logistica/business-parties',
            permission: 'business_parties.read'
          },
          {
            label: 'Contactos',
            icon: 'i-lucide-users',
            to: '/logistica/business-parties/contacts',
            permission: 'contacts.read'
          }
        ]
      },
      { label: 'Reportes', icon: 'i-lucide-bar-chart-3', to: '/logistica/reportes/choferes', permission: 'trips.read' },
      {
        label: 'Configuraciones',
        icon: 'i-lucide-cog',
        permission: 'trips.read',
        children: [
          {
            label: 'Documentación de transporte',
            icon: 'i-lucide-book-open',
            to: '/logistica/configuraciones/transport-document',
            permission: 'transport_document_types.read'
          },
          {
            label: 'Tarifas',
            icon: 'i-lucide-banknotes',
            to: '/logistica/configuraciones/tarifas',
            permission: 'transfer_rates.read'
          }
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
      {
        label: 'Productos',
        icon: 'i-lucide-package',
        to: '/productos',
        children: [
          { label: 'Listado', icon: 'i-lucide-list', to: '/productos' },
          { label: 'Nuevo producto', icon: 'i-lucide-plus', to: '/productos/create' },
          { label: 'Costos', icon: 'i-lucide-dollar-sign', to: '/productos/costos' },
          // { label: 'Listas de precio', icon: 'i-lucide-tag', to: '/productos/price-lists' },
          { label: 'Por cliente / proveedor', icon: 'i-lucide-users', to: '/productos/by-party' }
        ]
      },
      { label: 'Depósitos', icon: 'i-lucide-warehouse', to: '/productos/warehouses', permission: 'warehouses.read' }
    ]
  },

  // ─── FABRICACIÓN ───────────────────────────────────────────────
  {
    label: 'Fabricación',
    icon: 'i-lucide-factory',
    to: '/fabricacion',
    permission: 'products.read',
    children: [
      { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/fabricacion', permission: 'products.read' },
      { label: 'BOM (Ingeniería)', icon: 'i-lucide-git-branch', to: '/bom', permission: 'products.read' },
      { label: 'Plantillas de costo', icon: 'i-lucide-file-text', to: '/cost-templates', permission: 'products.read' }
    ]
  },

  // ─── OPERACIONES INTERNACIONALES ───────────────────────────────
  {
    label: 'Operaciones Internacionales',
    icon: 'i-lucide-globe',
    permission: 'international_operations.read',
    children: [
      {
        label: 'Operaciones',
        icon: 'i-lucide-ship',
        to: '/operaciones-internacionales',
        permission: 'international_operations.read'
      },
      {
        label: 'Nueva operación',
        icon: 'i-lucide-plus',
        to: '/operaciones-internacionales/create',
        permission: 'international_operations.create'
      }
    ]
  },

  // ─── EMPRESA ───────────────────────────────────────────────────
  {
    label: 'Empresa',
    icon: 'i-lucide-building-2',
    permission: 'companies.read',
    children: [
      {
        label: 'Datos de la empresa',
        icon: 'i-lucide-building',
        to: '/settings/company',
        permission: 'companies.read'
      },
      {
        label: 'Configuración Fiscal',
        icon: 'i-lucide-percent',
        to: '/settings/fiscal-config',
        permission: 'companies.read'
      }
      // { label: 'Miembros', icon: 'i-lucide-users', to: '/settings/members', permission: 'companies.read' }
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
      { label: 'Locaciones', icon: 'i-lucide-map-pin', to: '/ajustes/locaciones', permission: 'locations.read' },
      { label: 'Notificaciones', icon: 'i-lucide-bell', to: '/settings/notifications' },
      { label: 'Papelera', icon: 'i-lucide-trash-2', to: '/settings/trash', permission: 'trash.read' }
    ]
  }
]
