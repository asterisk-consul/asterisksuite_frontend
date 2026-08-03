<script setup lang="ts">
const props = defineProps<{
  totalDebit: number
  totalCredit: number
  currencyCode?: string
  label?: string
}>()

const formatCurrency = (amount: number) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: props.currencyCode || 'ARS'
  }).format(num)
}
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
