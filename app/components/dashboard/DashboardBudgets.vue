<script setup lang="ts">
import { QUOTE_STATUSES, QUOTE_STATUS_COLORS } from '~/modulos/erp/documents/types/document-statuses'

const props = defineProps<{
  data?: {
    total: number
    byStatus: Record<number, number>
    totalValue: number
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

const statusItems = computed(() => {
  if (!props.data) return []
  return Object.entries(props.data.byStatus)
    .map(([status, count]) => ({
      status: Number(status),
      label: QUOTE_STATUSES[Number(status)] ?? `Status ${status}`,
      count,
      color: QUOTE_STATUS_COLORS[Number(status)] ?? 'neutral',
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-file-text" class="size-5 text-info" />
          <h3 class="text-sm font-semibold">Presupuestos</h3>
          <UBadge v-if="data" :label="`${data.total}`" color="info" variant="soft" size="xs" />
        </div>
        <NuxtLink to="/erp/budgets" class="text-xs text-primary hover:underline font-medium">
          Ver todos
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-8 rounded" />
    </div>

    <div v-else-if="statusItems.length === 0" class="text-center py-6 text-muted text-sm">
      No hay presupuestos
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in statusItems.slice(0, 5)"
        :key="item.status"
        class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
      >
        <div class="flex items-center gap-2">
          <UBadge :label="item.label" :color="item.color" variant="soft" size="xs" />
        </div>
        <span class="text-sm font-semibold">{{ item.count }}</span>
      </div>

      <div v-if="data && data.totalValue > 0" class="pt-2 border-t border-default">
        <div class="flex items-center justify-between px-3">
          <span class="text-xs text-muted">Valor total</span>
          <span class="text-sm font-bold text-primary">{{ formatCurrency(data.totalValue) }}</span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
