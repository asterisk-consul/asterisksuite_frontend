<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { DashboardPersonal } from '~/modulos/erp/dashboard/types/dashboard.types'

const props = defineProps<{
  data?: DashboardPersonal
  loading?: boolean
}>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-user" class="size-5 text-primary" />
        <h3 class="text-sm font-semibold">Mi Actividad</h3>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16 w-full rounded-lg" />
      <USkeleton class="h-20 w-full rounded-lg" />
    </div>

    <div v-else-if="!data" class="text-center py-4 text-muted text-sm">
      Sin datos disponibles
    </div>

    <div v-else class="space-y-4">
      <!-- Stats rapidos -->
      <div class="grid grid-cols-3 gap-2">
        <div class="text-center p-2.5 rounded-lg bg-muted/30 min-w-0">
          <p class="text-xl font-bold text-info truncate">{{ data.pendingDocuments }}</p>
          <p class="text-[10px] text-muted mt-0.5 truncate">Pendientes</p>
        </div>
        <div class="text-center p-2.5 rounded-lg bg-muted/30 min-w-0">
          <p class="text-xl font-bold text-success truncate">{{ data.monthlyPayments }}</p>
          <p class="text-[10px] text-muted mt-0.5 truncate">Pagos mes</p>
        </div>
        <div class="text-center p-2.5 rounded-lg bg-muted/30 min-w-0">
          <p class="text-xl font-bold text-primary truncate">{{ formatCurrency(data.monthlyAmount) }}</p>
          <p class="text-[10px] text-muted mt-0.5 truncate">Monto mes</p>
        </div>
      </div>

      <!-- Actividad reciente -->
      <div v-if="data.recentActivity.length > 0">
        <h4 class="text-xs font-semibold text-muted mb-2">Ultima actividad</h4>
        <div class="space-y-1.5">
          <div
            v-for="(activity, index) in data.recentActivity"
            :key="index"
            class="flex items-start gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/20 transition-colors"
          >
            <div class="size-5 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
              <UIcon name="i-lucide-activity" class="size-2.5 text-muted" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-1 flex-wrap">
                <span class="text-xs text-muted">{{ activity.action }}</span>
                <span v-if="activity.detail" class="text-xs font-medium text-foreground truncate">{{ activity.detail }}</span>
              </div>
              <span class="text-[10px] text-muted/70">en {{ activity.table }}</span>
            </div>
            <time class="text-[10px] text-muted shrink-0 whitespace-nowrap">{{ formatTimeAgo(new Date(activity.date)) }}</time>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-2 text-muted text-xs">
        Sin actividad reciente
      </div>
    </div>
  </UPageCard>
</template>
