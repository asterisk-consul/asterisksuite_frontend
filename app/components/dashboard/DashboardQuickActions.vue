<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const allActions = [
  { label: 'Nuevo presupuesto', icon: 'i-lucide-file-plus', to: '/erp/budgets', color: 'info', permission: 'documents.create' },
  { label: 'Nueva OV', icon: 'i-lucide-shopping-cart', to: '/erp/orders', color: 'warning', permission: 'documents.create' },
  { label: 'Nuevo pago', icon: 'i-lucide-send', to: '/erp/treasury/payments/create', color: 'primary', permission: 'payments.create' },
  { label: 'Nuevo vale', icon: 'i-lucide-receipt', to: '/erp/rrhh/vales/create', color: 'secondary' },
  { label: 'Reportes', icon: 'i-lucide-bar-chart-3', to: '/erp/treasury/reports', color: 'success' },
  { label: 'Clientes', icon: 'i-lucide-users', to: '/erp/sales/customers', color: 'info', permission: 'documents.read' },
  { label: 'Proveedores', icon: 'i-lucide-building-2', to: '/erp/purchases/suppliers', color: 'warning', permission: 'documents.read' },
  { label: 'Logística', icon: 'i-lucide-truck', to: '/logistica', color: 'primary' },
]

const quickActions = computed(() =>
  allActions.filter((action) => {
    if (!action.permission) return true
    return isOwnerOrAdmin.value || hasPermission(action.permission)
  })
)
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-zap" class="size-5 text-warning" />
        <h3 class="text-sm font-semibold">Accesos Directos</h3>
      </div>
    </template>

    <div v-if="quickActions.length === 0" class="text-center py-4 text-muted text-sm">
      No hay accesos disponibles con tus permisos
    </div>
    <div v-else class="flex flex-wrap gap-2">
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
