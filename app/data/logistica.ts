import type { NavigationMenuItem } from '@nuxt/ui'
export const links: NavigationMenuItem[][] = [
  [
    { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/' },
    { label: 'Viajes', icon: 'i-heroicons-truck', to: '/' },
    {
      label: 'Depósitos',
      icon: 'i-heroicons-building-storefront',
      to: '/'
    },
    {
      label: 'Picking',
      icon: 'i-heroicons-clipboard-document-list',
      to: '/'
    },
    { label: 'Stock', icon: 'i-heroicons-archive-box', to: '/' },
    { label: 'Flota', icon: 'i-heroicons-wrench-screwdriver', to: '/' },
    {
      label: 'Clientes',
      icon: 'i-heroicons-building-office-2',
      to: '/'
    },
    { label: 'Reportes', icon: 'i-heroicons-chart-bar', to: '/' }
  ],
  [
    { label: 'Permisos', icon: 'i-heroicons-lock-closed', to: '/' },
    { label: 'Multi-Empresa', icon: 'i-heroicons-globe-alt', to: '/' }
  ]
]
