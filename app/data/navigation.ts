import type { NavigationMenuItem } from '@nuxt/ui'

export const navigationLinks = [
  [
    {
      label: 'Inicio',
      icon: 'i-lucide-house',
      to: '/'
    },

    // {
    //   label: 'Kilometros',
    //   icon: 'i-lucide-truck',
    //   to: '/VKilomentros'
    // },
    {
      label: 'Ventas',
      icon: 'i-lucide-receipt',
      defaultOpen: false,
      children: [
        { label: 'Comprobantes', to: '/erp/sales' },
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
        { label: 'Comprobantes', to: '/erp/purchases/purchases-documents' },

        { label: 'Proveedores', to: '/erp/purchases/suppliers' },
        {
          label: 'Resumen de productos comprados',
          to: '/productdash'
        }
      ]
    },
    // {
    //   label: 'Combustible',
    //   to: '/combustible',
    //   icon: 'i-lucide-fuel',
    //   defaultOpen: false
    // },
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
      // defaultOpen: false,
      // children: [{ label: 'Demostracion', to: '/logistica/operaciones' }]
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
      label: 'Ajustes',
      to: '/settings',
      icon: 'i-lucide-settings',
      defaultOpen: false,
      type: 'trigger',
      children: [
        { label: 'General', to: '/settings', exact: true },
        { label: 'Miembros', to: '/settings/members' },
        { label: 'Usuarios', to: '/settings/users' },
        { label: 'Roles y permisos', to: '/settings/roles' },
        { label: 'Notificaciones', to: '/settings/notifications' },
        { label: 'Seguridad', to: '/settings/security' },
        { label: 'Impuestos', to: '/settings/taxes' },
        { label: 'Configuración Fiscal', to: '/settings/fiscal-config' },
        { label: 'Monedas', to: '/settings/monedas' }
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
    // {
    //   label: 'Ayuda',
    //   icon: 'i-lucide-info',
    //   to: '/changelog/',
    //   target: '_blank'
    // }
  ]
] as NavigationMenuItem[][]
