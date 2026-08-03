<script setup lang="ts">
const quickActions = [
  { label: 'Nuevo presupuesto', icon: 'i-lucide-file-plus', to: '/erp/budgets', color: 'info' },
  { label: 'Nueva OV', icon: 'i-lucide-shopping-cart', to: '/erp/orders', color: 'warning' },
  { label: 'Nuevo pago', icon: 'i-lucide-send', to: '/erp/treasury/payments/create', color: 'primary' },
  { label: 'Nuevo vale', icon: 'i-lucide-receipt', to: '/erp/rrhh/vales/create', color: 'secondary' },
  { label: 'Reportes', icon: 'i-lucide-bar-chart-3', to: '/erp/treasury/reports', color: 'success' },
  { label: 'Clientes', icon: 'i-lucide-users', to: '/erp/sales/customers', color: 'info' },
  { label: 'Proveedores', icon: 'i-lucide-building-2', to: '/erp/purchases/suppliers', color: 'warning' },
  { label: 'Logística', icon: 'i-lucide-truck', to: '/logistica', color: 'primary' },
]
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-zap" class="size-5 text-warning" />
        <h3 class="text-sm font-semibold">Accesos Directos</h3>
      </div>
    </template>

    <div class="flex flex-wrap gap-2">
      <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to">
        <UButton
          :label="action.label"
          :icon="action.icon"
          :color="action.color"
          variant="outline"
          size="sm"
        />
      </NuxtLink>
    </div>
  </UPageCard>
</template>
