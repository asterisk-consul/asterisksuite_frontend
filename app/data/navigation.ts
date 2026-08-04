import type { NavigationMenuItem } from '@nuxt/ui'

export const navigationLinks = [
  [
    {
      label: 'Inicio',
      icon: 'i-lucide-house',
      to: '/'
    },

    {
      label: 'Ventas',
      icon: 'i-lucide-receipt',
      defaultOpen: false,
      children: [
        { label: 'Presupuestos', to: '/erp/budgets' },
        { label: 'Órdenes de Venta', to: '/erp/orders' },
        { label: 'Comprobantes', to: '/erp/sales' },
        { label: 'Remitos', to: '/erp/remitos' },
        { label: 'Clientes', to: '/erp/sales/customers' },
        {
          label: 'Resumen de productos vendidos',
          to: '/erp/sales/sales-reports/salesProducts'
        }
      ]
    },

    {
      label: 'Compras',
      icon: 'i-lucide-folder-closed',
      defaultOpen: false,
      children: [
        { label: 'Órdenes de Compra', to: '/erp/orders?direction=-1' },
        { label: 'Comprobantes', to: '/erp/purchases/purchases-documents' },
        { label: 'Proveedores', to: '/erp/purchases/suppliers' },
        {
          label: 'Resumen de productos comprados',
          to: '/productdash'
        }
      ]
    },
    {
      label: 'Tesorería',
      to: '/erp/treasury/dashboard',
      icon: 'i-lucide-wallet'
    },
    {
      label: 'RRHH',
      to: '/erp/rrhh',
      icon: 'i-lucide-users'
    },
    {
      label: 'Partes interesadas',
      to: '/erp/stakeholders',
      icon: 'i-lucide-building-2'
    },
    {
      label: 'logistica',
      to: '/logistica',
      icon: 'i-lucide-truck'
    },
    {
      label: 'Stock',
      to: '/stock',
      icon: 'i-lucide-box',
      defaultOpen: false
    },
    {
      label: 'Fabricacion',
      to: '/fabricacion',
      icon: 'i-lucide-factory',
      defaultOpen: false
    },
    {
      label: 'Empresa',
      icon: 'i-lucide-building-2',
      defaultOpen: false,
      children: [
        { label: 'Datos de la empresa', to: '/settings/company' },
        { label: 'Configuración Fiscal', to: '/settings/fiscal-config' }
      ]
    },
    {
      label: 'Ajustes',
      icon: 'i-lucide-settings',
      defaultOpen: false,
      children: [
        { label: 'Perfil', to: '/settings', exact: true },
        { label: 'Usuarios y Roles', to: '/settings/users' },
        { label: 'Seguridad', to: '/settings/security' },
        { label: 'Impuestos', to: '/settings/taxes' },
        { label: 'Monedas', to: '/settings/monedas' },
        { label: 'Tipos de Documento', to: '/erp/settings/document-types' },
        { label: 'Secuencias', to: '/erp/settings/document-sequences' }
      ]
    }
  ],
  [
    {
      label: 'Documentacion',
      icon: 'i-lucide-book-text',
      to: 'https://asterisk-consul.github.io/donandresdoc/',
      target: '_blank'
    }
  ]
] as NavigationMenuItem[][]
