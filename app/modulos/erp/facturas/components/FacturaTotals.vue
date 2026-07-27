<script setup lang="ts">
interface TaxSummary {
  tax_id: string
  name?: string
  code?: string
  rate?: number
  amount: number
  taxableBase?: number
}

interface Props {
  subtotal: number
  taxes: TaxSummary[]
  total: number
}

const props = defineProps<Props>()

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(n || 0))
}

const totalTaxes = computed(() =>
  props.taxes.reduce((acc, tax) => acc + tax.amount, 0)
)
</script>

<template>
  <div class="p-4 space-y-2">
    <!-- Subtotal -->
    <div class="flex justify-between">
      <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
      <span class="font-medium">{{ fmt(subtotal) }}</span>
    </div>

    <!-- Taxes -->
    <div
      v-for="tax in taxes"
      :key="tax.tax_id"
      class="flex justify-between text-sm"
    >
      <span class="text-gray-500">
        {{ tax.name }}
        <span class="text-xs text-gray-400">({{ tax.rate }}%)</span>
      </span>
      <span class="text-gray-600 dark:text-gray-400">{{ fmt(tax.amount) }}</span>
    </div>

    <!-- Total impuestos -->
    <div
      v-if="taxes.length"
      class="flex justify-between text-sm border-t pt-2"
    >
      <span class="text-gray-500">Total impuestos</span>
      <span class="font-medium">{{ fmt(totalTaxes) }}</span>
    </div>

    <!-- Total -->
    <div class="flex justify-between text-xl font-bold border-t-2 pt-3">
      <span>Total</span>
      <span class="text-primary">{{ fmt(total) }}</span>
    </div>
  </div>
</template>
