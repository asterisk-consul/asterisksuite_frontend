<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useProductPriceService } from '~/modulos/logistica/master-data/product-price/service/product-price.service'

import CostTemplateSelectorModal from '~/modulos/logistica/master-data/product/cost-templates/modal/CostTemplateSelectorModal.vue'
import CostSummaryCard from '~/modulos/logistica/master-data/product/costing/components/CostSummaryCard.vue'
import CostingHistoryTable from '~/modulos/logistica/master-data/product/costing/components/CostingHistoryTable.vue'
import CostingParetoTable from '~/modulos/logistica/master-data/product/costing/components/CostingParetoTable.vue'

const props = defineProps<{
  productId: string
  form: ProductFormState
  currencyId: string
}>()

const emit = defineEmits<{
  'update:currencyId': [value: string]
  'update:autoCalculate': [value: boolean]
}>()

const toast = useToast()

const {
  latestCost,
  latestMaterialCost,
  latestLaborCost,
  latestOverheadCost,
  latestSnapshot,
  loading,
  calculating,
  calculate,
  init
} = useCosting(props.productId, props.currencyId)

const { currencies, selectItems: currencySelectItems, init: initCurrencies } = useCurrencies()
const priceService = useProductPriceService()

const showTemplateModal = ref(false)

const costingTabs = [
  { label: 'Historial', slot: 'history', value: 'history' },
  { label: 'Pareto', slot: 'pareto', value: 'pareto' }
]

const activeTab = ref('history')

// =========================
// MONEDA (v-model con el padre)
// =========================

const selectedCurrency = computed({
  get: () => currencySelectItems.value.find((i) => i.value === props.currencyId),
  set: (option) => {
    emit('update:currencyId', option?.value ?? '')
  }
})

// =========================
// AUTO CALCULATE COST (v-model con el padre)
// =========================

const autoCalculate = computed({
  get: () => props.form.auto_calculate_cost,
  set: (val) => emit('update:autoCalculate', val)
})

// =========================
// CONVERSOR DE MONEDAS
// =========================

const selectedPriceCurrency = ref('')
const savingPrice = ref(false)
const savedPrice = ref<{ currency: string; amount: number; symbol: string } | null>(null)
const convertedCosts = ref<Array<{ code: string; name: string; symbol: string; amount: number }>>([])

const currentCurrency = computed(() => currencies.value.find(c => c.id === props.currencyId) ?? null)

const currencyOptions = computed(() =>
  currencies.value
    .filter(c => c.id !== props.currencyId)
    .map(c => ({ label: `${c.symbol} ${c.name}`, value: c.id }))
)

const formatMoney = (amount: number | string | null | undefined, symbol = '$') => {
  const num = Number(amount) || 0
  return `${symbol} ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const calculateConversions = async () => {
  if (!latestCost.value || !currentCurrency.value) return

  const results = []
  for (const currency of currencies.value) {
    if (currency.id === props.currencyId) continue

    try {
      const result = await $fetch<{ converted_amount: number }>('/api/erp/pricing/exchange/convert', {
        method: 'GET',
        query: {
          amount: latestCost.value,
          from: currentCurrency.value.code,
          to: currency.code
        }
      })
      results.push({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        amount: result.converted_amount
      })
    } catch {
      // Ignorar errores de conversión
    }
  }
  convertedCosts.value = results
}

// =========================
// GUARDAR COMO PRECIO
// =========================

const saveCostAsPrice = async () => {
  if (!selectedPriceCurrency.value || !latestCost.value) return

  savingPrice.value = true
  try {
    const currency = currencies.value.find(c => c.id === selectedPriceCurrency.value)
    await priceService.create({
      product_id: props.productId,
      currency_id: selectedPriceCurrency.value,
      price: latestCost.value,
      exemption_rate: 0
    })
    savedPrice.value = {
      currency: currency?.code ?? '',
      amount: latestCost.value,
      symbol: currency?.symbol ?? '$'
    }
    toast.add({ title: 'Precio guardado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.message, color: 'error' })
  } finally {
    savingPrice.value = false
  }
}

// =========================
// HANDLERS
// =========================

const handleCalculate = async () => {
  await calculate()
  await calculateConversions()
}

const handleAssigned = async () => await init()

onMounted(async () => {
  await init()
  await initCurrencies()
  await calculateConversions()
})
</script>

<template>
  <div class="space-y-6">
    <!-- ========================= -->
    <!-- CONFIGURACIÓN DE COSTOS   -->
    <!-- ========================= -->
    <UCard>
      <template #header>
        <p class="text-sm font-medium">Configuración de costos</p>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Moneda -->
        <UFormField label="Moneda del costo" required>
          <USelectMenu
            v-model="selectedCurrency"
            :items="currencySelectItems"
            placeholder="Seleccionar moneda"
            searchable
            class="w-full"
          />
        </UFormField>

        <!-- Auto calcular costo -->
        <UFormField label="Precio de venta">
          <div class="space-y-1">
            <USwitch v-model="autoCalculate" label="Usar costo calculado como precio de venta" />
            <p class="text-xs text-muted">
              Cuando está activo, el precio de factura se toma del costo calculado.
            </p>
          </div>
        </UFormField>
      </div>
    </UCard>

    <!-- ========================= -->
    <!-- ACCIONES                  -->
    <!-- ========================= -->
    <div class="flex justify-end gap-2">
      <UButton
        label="Actualizar costo"
        icon="i-lucide-calculator"
        :loading="calculating"
        @click="handleCalculate"
      />
      <UButton
        label="Cambiar template"
        icon="i-lucide-settings"
        variant="outline"
        @click="showTemplateModal = true"
      />
    </div>

    <!-- ========================= -->
    <!-- TABS: HISTORIAL / PARETO  -->
    <!-- ========================= -->
    <UTabs v-model="activeTab" :items="costingTabs" variant="link">
      <template #history>
        <CostSummaryCard
          :total-cost="latestCost"
          :material-cost="latestMaterialCost"
          :labor-cost="latestLaborCost"
          :overhead-cost="latestOverheadCost"
          currency-symbol="$"
        />

        <!-- Conversiones a otras monedas -->
        <UCard v-if="convertedCosts.length">
          <template #header>
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">Equivalente en otras monedas</p>
              <UBadge label="Solo visual" variant="soft" size="xs" />
            </div>
          </template>
          <div class="space-y-2">
            <div
              v-for="c in convertedCosts"
              :key="c.code"
              class="flex items-center justify-between py-2 border-b border-default last:border-0"
            >
              <div class="flex items-center gap-2">
                <UBadge :label="c.code" color="neutral" variant="soft" size="xs" />
                <span class="text-sm text-muted">{{ c.name }}</span>
              </div>
              <span class="font-semibold">{{ formatMoney(c.amount, c.symbol) }}</span>
            </div>
          </div>
        </UCard>

        <!-- Guardar como precio de venta -->
        <UCard>
          <template #header>
            <p class="text-sm font-medium">Precio de venta</p>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Guardar el costo calculado como precio de venta para facturación.
            </p>
            <div class="flex items-center gap-3">
              <USelectMenu
                v-model="selectedPriceCurrency"
                :items="currencyOptions"
                placeholder="Moneda"
                class="w-40"
              />
              <UButton
                label="Guardar como precio"
                icon="i-lucide-save"
                :loading="savingPrice"
                :disabled="!selectedPriceCurrency"
                @click="saveCostAsPrice"
              />
            </div>
            <p v-if="savedPrice" class="text-sm text-success">
              ✓ Precio guardado en {{ savedPrice.currency }}: {{ formatMoney(savedPrice.amount, savedPrice.symbol) }}
            </p>
          </div>
        </UCard>

        <CostingHistoryTable :product-id="productId" :currency-id="currencyId" />
      </template>

      <template #pareto>
        <CostingParetoTable :product-id="productId" :currency-id="currencyId" />
      </template>
    </UTabs>

    <!-- ========================= -->
    <!-- MODAL: CAMBIAR TEMPLATE   -->
    <!-- ========================= -->
    <CostTemplateSelectorModal
      v-model:open="showTemplateModal"
      :product-id="productId"
      :current-template-id="latestSnapshot?.cost_template_id ?? null"
      @assigned="handleAssigned"
    />
  </div>
</template>
