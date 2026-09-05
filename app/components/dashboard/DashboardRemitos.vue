<script setup lang="ts">
import { REMITO_STATUSES, REMITO_STATUS_COLORS } from '~/modulos/erp/documents/types/document-statuses'

const props = defineProps<{
  data?: {
    total: number
    byStatus: Record<number, number>
  }
  loading?: boolean
}>()

const statusItems = computed(() => {
  if (!props.data) return []
  return Object.entries(props.data.byStatus)
    .map(([status, count]) => ({
      status: Number(status),
      label: REMITO_STATUSES[Number(status)] ?? `Status ${status}`,
      count,
      color: REMITO_STATUS_COLORS[Number(status)] ?? 'neutral',
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
          <UIcon name="i-lucide-truck" class="size-5 text-success" />
          <h3 class="text-sm font-semibold">Remitos</h3>
          <UBadge v-if="data" :label="`${data.total}`" color="success" variant="soft" size="xs" />
        </div>
        <NuxtLink to="/erp/remitos" class="text-xs text-primary hover:underline font-medium">
          Ver todos
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-8 rounded" />
    </div>

    <div v-else-if="statusItems.length === 0" class="text-center py-6 text-muted text-sm">
      No hay remitos
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in statusItems"
        :key="item.status"
        class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
      >
        <div class="flex items-center gap-2">
          <UBadge :label="item.label" :color="item.color" variant="soft" size="xs" />
        </div>
        <span class="text-sm font-semibold">{{ item.count }}</span>
      </div>
    </div>
  </UPageCard>
</template>
