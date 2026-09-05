<script setup lang="ts">
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

const props = defineProps<{
  totalCost: number | string
  materialCost: number | string
  laborCost: number | string
  overheadCost: number | string
  currencySymbol?: string
  originalCurrencyCode?: string
}>()

const { currencies, init: initCurrencies } = useCurrencies()
const toast = useToast()

onMounted(async () => {
  if (!currencies.value.length) {
    await initCurrencies()
  }
})

// USelectMenu v-model: guarda el objeto {label, value}
const targetCurrencyOption = ref<{ label: string; value: string } | null>(null)

// UUID string extraído del objeto
const resolvedCurrencyId = computed(() => targetCurrencyOption.value?.value ?? '')

const conversionRate = ref<number | null>(null)
const converting = ref(false)

const targetCurrency = computed(() =>
  resolvedCurrencyId.value ? currencies.value.find(c => c.id === resolvedCurrencyId.value) : null
)

const targetCurrencyOptions = computed(() =>
  currencies.value
    .filter(c => c.code !== props.originalCurrencyCode)
    .map(c => ({ label: `${c.symbol} ${c.name}`, value: c.id }))
)

const symbol = computed(() => {
  if (targetCurrency.value) return targetCurrency.value.symbol
  return props.currencySymbol ?? '$'
})

const toNum = (val: number | string) => {
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

const convertValue = (value: number | string) => {
  const num = toNum(value)
  if (conversionRate.value != null) {
    return num * conversionRate.value
  }
  return num
}

const formatMoney = (value: number | string) => {
  const converted = convertValue(value)
  return `${symbol.value} ${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(converted)}`
}

const percentages = computed(() => {
  const total = toNum(props.totalCost) || 1
  return {
    material: (toNum(props.materialCost) / total) * 100,
    labor: (toNum(props.laborCost) / total) * 100,
    overhead: (toNum(props.overheadCost) / total) * 100
  }
})

// Fetch conversion rate when target currency changes
watch(resolvedCurrencyId, async (id) => {
  if (!id) {
    conversionRate.value = null
    return
  }

  if (!props.originalCurrencyCode) {
    conversionRate.value = null
    return
  }

  const tc = currencies.value.find(c => c.id === id)
  if (!tc || tc.code === props.originalCurrencyCode) {
    conversionRate.value = null
    return
  }

  converting.value = true
  try {
    const result = await $fetch<{ converted_amount: number }>('/api/erp/pricing/exchange/convert', {
      method: 'GET',
      query: { amount: 1, from: props.originalCurrencyCode, to: tc.code }
    })
    conversionRate.value = result.converted_amount
  } catch (err: any) {
    conversionRate.value = null
    const msg = err?.data?.message || err?.message || 'No existe cotización'
    toast.add({
      title: 'Sin cotización',
      description: `No se pudo convertir ${props.originalCurrencyCode} → ${tc.code}: ${msg}`,
      color: 'warning'
    })
  } finally {
    converting.value = false
  }
})
</script>

<template>
  <UCard>
    <div class="space-y-5">
      <!-- Header con total + selector de moneda -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-muted">Costo Total</p>
          <p class="text-3xl font-bold tabular-nums">{{ formatMoney(totalCost) }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UBadge v-if="conversionRate != null" label="Convertido" color="primary" variant="soft" size="xs" />
          <USelectMenu
            v-model="targetCurrencyOption"
            :items="targetCurrencyOptions"
            placeholder="Otra moneda"
            searchable
            size="sm"
            class="w-44"
          />
        </div>
      </div>

      <div class="overflow-hidden h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 flex">
        <div class="bg-success transition-all" :style="{ width: `${percentages.material}%` }" />
        <div class="bg-warning transition-all" :style="{ width: `${percentages.labor}%` }" />
        <div class="bg-info transition-all" :style="{ width: `${percentages.overhead}%` }" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Materiales</p>
          <p class="font-semibold tabular-nums">{{ formatMoney(materialCost) }}</p>
          <p class="text-xs text-success">{{ percentages.material.toFixed(1) }}%</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Mano de obra</p>
          <p class="font-semibold tabular-nums">{{ formatMoney(laborCost) }}</p>
          <p class="text-xs text-warning">{{ percentages.labor.toFixed(1) }}%</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Overhead</p>
          <p class="font-semibold tabular-nums">{{ formatMoney(overheadCost) }}</p>
          <p class="text-xs text-info">{{ percentages.overhead.toFixed(1) }}%</p>
        </div>
      </div>
    </div>
  </UCard>
</template>
