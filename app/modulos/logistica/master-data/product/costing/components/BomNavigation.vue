<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [
    { label: 'BOM e ingeniería', icon: 'i-lucide-git-branch', to: '/bom' },
    { label: 'Nuevo BOM', icon: 'i-lucide-plus', to: '/bom/create' }
  ],
  [
    { label: 'Productos y materiales', icon: 'i-lucide-package', to: '/productos' },
    { label: 'Disponibilidad de stock', icon: 'i-lucide-chart-no-axes-combined', to: '/stock/disponibilidad' },
    { label: 'Depósitos', icon: 'i-lucide-warehouse', to: '/productos/warehouses' }
  ],
  [
    { label: 'Costos de productos', icon: 'i-lucide-dollar-sign', to: '/productos/costos' },
    { label: 'Plantillas de costo', icon: 'i-lucide-file-text', to: '/cost-templates' }
  ]
]
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="px-2 text-xs font-medium uppercase tracking-wide text-muted">Fabricación</p>
      <UNavigationMenu :items="items" orientation="vertical" class="mt-2" :ui="{ link: 'p-2 overflow-hidden' }" />
    </div>

    <UAlert
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
      title="BOM y stock"
      description="El BOM define cuánto material consume una unidad. Disponibilidad muestra cuánto puede fabricarse con el stock actual y en tránsito."
    />
  </div>
</template>
