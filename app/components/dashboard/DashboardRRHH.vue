<script setup lang="ts">
const props = defineProps<{
  data?: {
    totalVales: number
    byStatus: Record<string, number>
    totalDebit: number
    totalCredit: number
    accounts: { id: string; party_id: string; party_type: string; currency_code: string; balance: number }[]
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

const VALE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  PAID: 'Pagado',
  CANCELLED: 'Anulado',
}

const statusItems = computed(() => {
  if (!props.data) return []
  return Object.entries(props.data.byStatus)
    .map(([status, count]) => ({
      status,
      label: VALE_STATUS_LABELS[status] ?? status,
      count,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
})

const totalBalance = computed(() => {
  if (!props.data?.accounts) return 0
  return props.data.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-users" class="size-5 text-secondary" />
          <h3 class="text-sm font-semibold">RRHH</h3>
          <UBadge v-if="data" :label="`${data.totalVales} vales`" color="secondary" variant="soft" size="xs" />
        </div>
        <NuxtLink to="/erp/rrhh" class="text-xs text-primary hover:underline font-medium">
          Ver más
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-8 rounded" />
    </div>

    <div v-else-if="!data || data.totalVales === 0" class="text-center py-6 text-muted text-sm">
      No hay datos de RRHH
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="item in statusItems.slice(0, 4)"
        :key="item.status"
        class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
      >
        <span class="text-sm text-muted">{{ item.label }}</span>
        <span class="text-sm font-semibold">{{ item.count }}</span>
      </div>

      <div class="pt-2 border-t border-default space-y-1">
        <div class="flex items-center justify-between px-3">
          <span class="text-xs text-muted">Total débito</span>
          <span class="text-sm font-bold text-error">{{ formatCurrency(data.totalDebit) }}</span>
        </div>
        <div class="flex items-center justify-between px-3">
          <span class="text-xs text-muted">Total crédito</span>
          <span class="text-sm font-bold text-success">{{ formatCurrency(data.totalCredit) }}</span>
        </div>
      </div>

      <div v-if="data.accounts.length > 0" class="pt-2 border-t border-default">
        <div class="flex items-center justify-between px-3">
          <span class="text-xs text-muted">Saldo cuentas corrientes</span>
          <span class="text-sm font-bold" :class="totalBalance >= 0 ? 'text-success' : 'text-error'">
            {{ formatCurrency(totalBalance) }}
          </span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
