import type { NavigationMenuItem } from '@nuxt/ui'

export const links: NavigationMenuItem[][] = [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: '/erp/treasury/dashboard'
    },
    {
      label: 'Cuentas bancarias',
      icon: 'i-lucide-landmark',
      to: '/erp/treasury/bank-accounts'
    },
    {
      label: 'Cajas',
      icon: 'i-lucide-wallet',
      to: '/erp/treasury/cash-boxes',
      defaultOpen: false,
      children: [
        {
          label: 'Transferencias',
          icon: 'i-lucide-arrow-left-right',
          to: '/erp/treasury/cash-box-transfers'
        }
      ]
    },
    {
      label: 'Pagos y cobros',
      icon: 'i-lucide-hand-coins',
      to: '/erp/treasury/payments'
    },
    {
      label: 'Cheques',
      icon: 'i-lucide-square-check',
      to: '/erp/treasury/checks'
    },
    {
      label: 'Cuentas corrientes',
      icon: 'i-lucide-file-text',
      to: '/erp/treasury/current-accounts'
    },
    {
      label: 'Reportes',
      icon: 'i-lucide-bar-chart-3',
      defaultOpen: false,
      children: [
        {
          label: 'Movimientos',
          icon: 'i-lucide-activity',
          to: '/erp/treasury/reports/movements'
        },
        {
          label: 'Pagos por usuario',
          icon: 'i-lucide-users',
          to: '/erp/treasury/reports/by-user'
        }
      ]
    },
    {
      label: 'Contabilidad',
      icon: 'i-lucide-calculator',
      defaultOpen: false,
      children: [
        {
          label: 'Plan de cuentas',
          icon: 'i-lucide-list-tree',
          to: '/erp/contabilidad/accounts'
        }
      ]
    }
  ]
]
