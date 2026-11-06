<script setup lang="ts">
import { formatCurrencyAmount } from '~/utils/formatMoneda'
const props = defineProps<{
  totalDebit: number
  totalCredit: number
  currencyCode?: string
  label?: string
}>()

const formatCurrency = (amount: number) => formatCurrencyAmount(amount, props.currencyCode || 'ARS')
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <UPageCard variant="subtle">
      <div class="space-y-1">
        <p class="text-xs text-muted">{{ label ? `${label} débitos` : 'Total débitos' }}</p>
        <p class="text-xl font-semibold text-error">{{ formatCurrency(totalDebit) }}</p>
      </div>
    </UPageCard>
    <UPageCard variant="subtle">
      <div class="space-y-1">
        <p class="text-xs text-muted">{{ label ? `${label} créditos` : 'Total créditos' }}</p>
        <p class="text-xl font-semibold text-success">{{ formatCurrency(totalCredit) }}</p>
      </div>
    </UPageCard>
  </div>
</template>
