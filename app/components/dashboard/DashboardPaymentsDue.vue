<script setup lang="ts">
const props = defineProps<{
  data?: {
    payments: { count: number; total: number }
    collections: { count: number; total: number }
  }
  loading?: boolean
}>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

const totalItems = computed(() => {
  if (!props.data) return 0
  return props.data.payments.count + props.data.collections.count
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-hourglass" class="size-5 text-secondary" />
          <h3 class="text-sm font-semibold">Pagos/Cobros Pendientes</h3>
        </div>
        <NuxtLink to="/erp/treasury/payments" class="text-xs text-primary hover:underline font-medium">
          Ver todos
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-16 rounded-lg" />
    </div>

    <div v-else-if="totalItems === 0" class="text-center py-6 text-muted text-sm">
      No hay pagos/cobros pendientes
    </div>

    <div v-else class="space-y-3">
      <div v-if="(data?.payments.count ?? 0) > 0" class="p-3 rounded-lg bg-error/5 border border-error/20">
        <div class="flex items-center justify-between min-w-0 gap-2">
          <div class="flex items-center gap-2 shrink-0">
            <div class="w-2 h-2 rounded-full bg-error" />
            <span class="text-xs text-muted font-medium">Pagos a proveedores</span>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs text-muted">{{ data?.payments.count }} pendientes</span>
            <span class="text-sm font-bold text-error ml-2">{{ formatCurrency(data?.payments.total ?? 0) }}</span>
          </div>
        </div>
      </div>
      <div v-if="(data?.collections.count ?? 0) > 0" class="p-3 rounded-lg bg-success/5 border border-success/20">
        <div class="flex items-center justify-between min-w-0 gap-2">
          <div class="flex items-center gap-2 shrink-0">
            <div class="w-2 h-2 rounded-full bg-success" />
            <span class="text-xs text-muted font-medium">Cobros a clientes</span>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs text-muted">{{ data?.collections.count }} pendientes</span>
            <span class="text-sm font-bold text-success ml-2">{{ formatCurrency(data?.collections.total ?? 0) }}</span>
          </div>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
