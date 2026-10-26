<script setup lang="ts">
interface TaxSummary {
  tax_id: string
  name?: string
  code?: string
  rate?: number
  amount: number
  taxableBase?: number
}

interface CommercialAdjustmentSummary {
  concept: string
  value_type: 'PERCENTAGE' | 'AMOUNT'
  basis: 'NET' | 'GROSS'
  value: number
  calculated_amount: number
  net_discount: number
}

interface Props {
  subtotal: number
  originalSubtotal?: number
  commercialAdjustments?: CommercialAdjustmentSummary[]
  taxes: TaxSummary[]
  total: number
  showBreakdown?: boolean
  currencyCode?: string
  exchangeRate?: number | null
  convertedTotal?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  showBreakdown: true,
  commercialAdjustments: () => [],
  currencyCode: 'ARS',
  exchangeRate: null,
  convertedTotal: null,
})

function fmt(n: number, currency?: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency ?? props.currencyCode
  }).format(Number(n || 0))
}

const totalTaxes = computed(() =>
  props.taxes.reduce((acc, tax) => acc + tax.amount, 0)
)

const isForeignCurrency = computed(() => props.currencyCode !== 'ARS')
</script>

<template>
  <div class="p-4 space-y-2">
    <!-- Subtotal -->
    <div class="flex justify-between">
      <span class="text-gray-600 dark:text-gray-400">{{ commercialAdjustments.length ? 'Subtotal antes de bonificaciones' : 'Subtotal' }}</span>
      <span class="font-medium">{{ fmt(commercialAdjustments.length ? (originalSubtotal ?? subtotal) : subtotal) }}</span>
    </div>

    <template v-if="commercialAdjustments.length">
      <div v-for="(adjustment, index) in commercialAdjustments" :key="`${adjustment.concept}-${index}`" class="flex justify-between gap-4 text-sm">
        <div class="text-gray-500">
          {{ adjustment.concept }}
          <span class="text-xs text-gray-400">({{ adjustment.basis === 'NET' ? 'sobre neto' : 'sobre bruto' }})</span>
        </div>
        <div class="text-right">
          <div class="text-gray-600 dark:text-gray-400">− {{ fmt(adjustment.net_discount) }}</div>
          <div v-if="adjustment.basis === 'GROSS'" class="text-xs text-gray-400">Impacto bruto: − {{ fmt(adjustment.calculated_amount) }}</div>
        </div>
      </div>
      <div class="flex justify-between border-t pt-2">
        <span class="text-gray-600 dark:text-gray-400">Subtotal neto</span>
        <span class="font-medium">{{ fmt(subtotal) }}</span>
      </div>
    </template>

    <!-- Taxes -->
    <template v-if="showBreakdown">
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
    </template>

    <!-- Total -->
    <div class="flex justify-between text-xl font-bold border-t-2 pt-3">
      <span>Total</span>
      <span class="text-primary">{{ fmt(total) }}</span>
    </div>

    <!-- Equivalente ARS (solo si moneda extranjera) -->
    <div v-if="isForeignCurrency && convertedTotal" class="flex justify-between text-sm text-gray-500 pt-1">
      <span>Equivalente ARS</span>
      <span class="font-medium text-gray-600 dark:text-gray-400">{{ fmt(convertedTotal, 'ARS') }}</span>
    </div>
  </div>
</template>
