import type { NavigationMenuItem } from '@nuxt/ui'

export const links: NavigationMenuItem[][] = [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: '/erp/rrhh'
    },
    {
      label: 'Empleados',
      icon: 'i-lucide-user',
      to: '/erp/rrhh/employees'
    },
    {
      label: 'Socios',
      icon: 'i-lucide-users',
      to: '/erp/rrhh/partners'
    },
    {
      label: 'Vales',
      icon: 'i-lucide-receipt',
      to: '/erp/rrhh/vales'
    },
    {
      label: 'Cuentas Corrientes',
      icon: 'i-lucide-file-text',
      to: '/erp/rrhh/current-accounts'
    },
    {
      label: 'Reportes',
      icon: 'i-lucide-bar-chart-3',
      defaultOpen: false,
      children: [
        {
          label: 'Vales por período',
          icon: 'i-lucide-calendar',
          to: '/erp/rrhh/reports/vales-periodo'
        }
        // {
        //   label: 'Saldos CC RRHH',
        //   icon: 'i-lucide-wallet',
        //   to: '/erp/rrhh/reports/saldos'
        // },
        // {
        //   label: 'Movimientos por persona',
        //   icon: 'i-lucide-user',
        //   to: '/erp/rrhh/reports/movimientos'
        // }
      ]
    }
  ]
]
