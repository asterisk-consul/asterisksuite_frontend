<script setup lang="ts">
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

const props = defineProps<{
  document: any
}>()

const { baseCurrency, fetchBaseCurrency } = useCurrencies()

onMounted(async () => {
  if (!baseCurrency.value) {
    await fetchBaseCurrency()
  }
})

const isForeignCurrency = computed(() => {
  if (!baseCurrency.value) return false
  const docCurrency = props.document?.currency_code?.toUpperCase()
  return docCurrency && docCurrency !== baseCurrency.value.code.toUpperCase()
})

const showConversion = computed(() =>
  isForeignCurrency.value && props.document?.exchange_rate
)

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: props.document?.currency_code ?? 'ARS',
    maximumFractionDigits: 2
  }).format(n ?? 0)
}

function fmtBase(n: any) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: baseCurrency.value?.code ?? 'ARS',
    maximumFractionDigits: 2
  }).format(Number(n ?? 0))
}

const convertedSubtotal = computed(() =>
  props.document?.converted_subtotal != null ? Number(props.document.converted_subtotal) : null
)
const convertedTotalTaxes = computed(() =>
  props.document?.converted_total_taxes != null ? Number(props.document.converted_total_taxes) : null
)
const convertedTotal = computed(() =>
  props.document?.converted_total != null ? Number(props.document.converted_total) : null
)
const convertedPaidAmount = computed(() =>
  props.document?.converted_paid_amount != null ? Number(props.document.converted_paid_amount) : null
)
const convertedPending = computed(() =>
  convertedTotal.value != null && convertedPaidAmount.value != null
    ? convertedTotal.value - convertedPaidAmount.value
    : null
)
</script>

<template>
  <UCard v-if="document">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Totales</h3>
        <span v-if="showConversion" class="text-xs font-mono text-muted bg-muted/50 px-2 py-0.5 rounded">
          {{ document.rate_type ?? 'OFFICIAL' }} @ {{ document.exchange_rate }}
        </span>
      </div>
    </template>

    <!-- CONVERSION MODE: 3 columns -->
    <div v-if="showConversion" class="text-sm">
      <!-- Column headers -->
      <div class="grid grid-cols-[1fr_auto_auto] gap-x-6 pb-2 border-b text-xs font-medium text-muted">
        <div></div>
        <div class="text-right min-w-[120px]">{{ document.currency_code }}</div>
        <div class="text-right min-w-[120px]">{{ baseCurrency?.code ?? 'ARS' }}</div>
      </div>

      <!-- Subtotal -->
      <div class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-2">
        <span class="text-muted">Subtotal</span>
        <span class="text-right min-w-[120px]">{{ fmt(Number(document.subtotal)) }}</span>
        <span v-if="convertedSubtotal != null" class="text-right min-w-[120px] text-muted">{{ fmtBase(convertedSubtotal) }}</span>
        <span v-else class="min-w-[120px]"></span>
      </div>

      <!-- Exento -->
      <div v-if="Number(document.exempt_amount) > 0" class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-1">
        <span class="text-muted">Exento</span>
        <span class="text-right min-w-[120px]">{{ fmt(Number(document.exempt_amount)) }}</span>
        <span v-if="convertedSubtotal != null" class="text-right min-w-[120px] text-muted">{{ fmtBase(Number(document.exempt_amount) * Number(document.exchange_rate)) }}</span>
        <span v-else class="min-w-[120px]"></span>
      </div>

      <!-- Impuestos aggregate -->
      <div v-if="Number(document.total_taxes) > 0" class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-1">
        <span class="text-muted">Impuestos</span>
        <span class="text-right min-w-[120px]">{{ fmt(Number(document.total_taxes)) }}</span>
        <span v-if="convertedTotalTaxes != null" class="text-right min-w-[120px] text-muted">{{ fmtBase(convertedTotalTaxes) }}</span>
        <span v-else class="min-w-[120px]"></span>
      </div>

      <!-- Per-tax breakdown -->
      <div v-if="document.document_taxes?.length" class="pl-4 space-y-0.5">
        <div v-for="dt in document.document_taxes" :key="dt.id" class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-0.5 text-xs text-muted">
          <span>{{ dt.taxes?.name }} ({{ dt.tax_rate }}%)</span>
          <span class="text-right min-w-[120px]">{{ fmt(Number(dt.tax_amount)) }}</span>
          <span v-if="dt.converted_tax_amount != null" class="text-right min-w-[120px]">{{ fmtBase(Number(dt.converted_tax_amount)) }}</span>
          <span v-else class="min-w-[120px]"></span>
        </div>
      </div>

      <!-- Total -->
      <div class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-2 border-t mt-1 text-base font-bold">
        <span>Total</span>
        <span class="text-right min-w-[120px]">{{ fmt(Number(document.total)) }}</span>
        <span v-if="convertedTotal != null" class="text-right min-w-[120px] text-primary">{{ fmtBase(convertedTotal) }}</span>
        <span v-else class="min-w-[120px]"></span>
      </div>

      <!-- Pagado / Pendiente -->
      <template v-if="Number(document.paid_amount) > 0">
        <div class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-1 text-sm">
          <span class="text-muted">Pagado</span>
          <span class="text-right min-w-[120px] text-success-500 font-medium">{{ fmt(Number(document.paid_amount)) }}</span>
          <span v-if="convertedPaidAmount != null" class="text-right min-w-[120px] text-success-500 text-xs">{{ fmtBase(convertedPaidAmount) }}</span>
          <span v-else class="min-w-[120px]"></span>
        </div>
        <div v-if="Number(document.total) - Number(document.paid_amount) > 0.01" class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-1 text-sm">
          <span class="text-muted">Pendiente</span>
          <span class="text-right min-w-[120px] text-warning-500 font-medium">{{ fmt(Number(document.total) - Number(document.paid_amount)) }}</span>
          <span v-if="convertedPending != null && convertedPending > 0.01" class="text-right min-w-[120px] text-warning-500 text-xs">{{ fmtBase(convertedPending) }}</span>
          <span v-else class="min-w-[120px]"></span>
        </div>
      </template>
    </div>

    <!-- SIMPLE MODE: single column (base currency or no exchange rate) -->
    <div v-else class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-muted">Subtotal</span>
        <span class="font-medium">{{ fmt(Number(document.subtotal)) }}</span>
      </div>

      <div v-if="Number(document.exempt_amount) > 0" class="flex justify-between">
        <span class="text-muted">Exento</span>
        <span class="font-medium">{{ fmt(Number(document.exempt_amount)) }}</span>
      </div>

      <div v-if="Number(document.total_taxes) > 0" class="flex justify-between">
        <span class="text-muted">Impuestos</span>
        <span class="font-medium">{{ fmt(Number(document.total_taxes)) }}</span>
      </div>

      <div v-if="document.document_taxes?.length" class="pl-4 space-y-1">
        <div v-for="dt in document.document_taxes" :key="dt.id" class="flex justify-between text-xs text-muted">
          <span>{{ dt.taxes?.name }} ({{ dt.tax_rate }}%)</span>
          <span>{{ fmt(Number(dt.tax_amount)) }}</span>
        </div>
      </div>

      <div class="flex justify-between border-t pt-2 text-base font-bold">
        <span>Total</span>
        <span>{{ fmt(Number(document.total)) }}</span>
      </div>

      <div v-if="Number(document.paid_amount) > 0" class="flex justify-between text-sm">
        <span class="text-muted">Pagado</span>
        <span class="text-success-500 font-medium">{{ fmt(Number(document.paid_amount)) }}</span>
      </div>

      <div v-if="Number(document.total) - Number(document.paid_amount) > 0.01" class="flex justify-between text-sm">
        <span class="text-muted">Pendiente</span>
        <span class="text-warning-500 font-medium">{{ fmt(Number(document.total) - Number(document.paid_amount)) }}</span>
      </div>
    </div>
  </UCard>
</template>
