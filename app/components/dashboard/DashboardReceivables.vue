<script setup lang="ts">
defineProps<{
  data?: {
    total: number
    totalAmount: number
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
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-receipt" class="size-5 text-warning" />
          <h3 class="text-sm font-semibold">Documentos por cobrar</h3>
        </div>
        <NuxtLink to="/erp/sales" class="text-xs text-primary hover:underline font-medium">
          Ver todos
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-16 rounded-lg" />
    </div>

    <div v-else-if="!data || data.total === 0" class="text-center py-6 text-muted text-sm">
      No hay documentos pendientes
    </div>

    <div v-else class="space-y-3">
      <div class="p-3 rounded-lg bg-muted/30">
        <div class="flex items-center justify-between min-w-0">
          <span class="text-xs text-muted font-medium shrink-0">Facturas pendientes</span>
          <span class="text-sm font-bold shrink-0">{{ data.total }}</span>
        </div>
      </div>
      <div class="p-3 rounded-lg bg-warning/5 border border-warning/20">
        <div class="flex items-center justify-between min-w-0">
          <span class="text-xs text-muted font-medium shrink-0">Saldo total</span>
          <span class="text-sm font-bold text-warning shrink-0 truncate">{{ formatCurrency(data.totalAmount) }}</span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
