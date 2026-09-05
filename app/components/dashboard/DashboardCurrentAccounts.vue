<script setup lang="ts">
import type { DashboardCurrentAccountItem } from '~/modulos/erp/dashboard/types/dashboard.types'

defineProps<{
  data?: DashboardCurrentAccountItem[]
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
          <UIcon name="i-lucide-book-open" class="size-5 text-primary" />
          <h3 class="text-sm font-semibold">Cuentas Corrientes</h3>
        </div>
        <NuxtLink to="/erp/treasury/current-accounts" class="text-xs text-primary hover:underline font-medium">
          Ver todas
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-8 rounded" />
    </div>

    <div v-else-if="!data || data.length === 0" class="text-center py-6 text-muted text-sm">
      No hay cuentas corrientes
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="account in data"
        :key="account.id"
        class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
      >
        <NuxtLink
          :to="`/erp/treasury/current-accounts/${account.party_id}`"
          class="text-sm font-medium text-primary hover:underline truncate mr-2"
        >
          {{ account.party_name }}
        </NuxtLink>
        <span
          class="text-sm font-bold shrink-0"
          :class="account.balance >= 0 ? 'text-success' : 'text-error'"
        >
          {{ formatCurrency(account.balance) }}
        </span>
      </div>
    </div>
  </UPageCard>
</template>
