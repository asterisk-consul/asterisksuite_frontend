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
        },
        {
          label: 'Entes reguladores',
          icon: 'i-lucide-building-2',
          to: '/erp/treasury/reports/regulatory-payments'
        },
        {
          label: 'Servicios mensuales',
          icon: 'i-lucide-zap',
          to: '/erp/treasury/reports/utility-payments'
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
        },
        {
          label: 'Tipos de documento',
          icon: 'i-lucide-file-text',
          to: '/erp/settings/document-types'
        },
        {
          label: 'Secuencias',
          icon: 'i-lucide-hash',
          to: '/erp/settings/document-sequences'
        },
        {
          label: 'Conceptos bancarios',
          icon: 'i-lucide-receipt',
          to: '/erp/treasury/bank-concepts'
        },
        {
          label: 'Libro IVA',
          icon: 'i-lucide-book-open',
          to: '/erp/treasury/reports/libro-iva'
        },
        {
          label: 'Reportes contables',
          icon: 'i-lucide-bar-chart-3',
          to: '/erp/treasury/reports/accounting'
        },
        {
          label: 'Informe consolidado',
          icon: 'i-lucide-file-text',
          to: '/erp/treasury/reports/consolidated'
        }
      ]
    }
  ]
]
