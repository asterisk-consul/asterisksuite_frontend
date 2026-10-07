<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'
import { useCostingService } from '~/modulos/logistica/master-data/product/costing/service/costing.service'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useEngineeringService } from '~/modulos/logistica/master-data/product/engineering/service/engineering.service'

import CostTemplateSelectorModal from '~/modulos/logistica/master-data/product/cost-templates/modal/CostTemplateSelectorModal.vue'
import CostSummaryCard from '~/modulos/logistica/master-data/product/costing/components/CostSummaryCard.vue'
import CostingHistoryTable from '~/modulos/logistica/master-data/product/costing/components/CostingHistoryTable.vue'
import CostingParetoTable from '~/modulos/logistica/master-data/product/costing/components/CostingParetoTable.vue'
import { useVariantCostsService } from '~/modulos/logistica/master-data/variant-cost/service/variant-cost.service'
import type { CalculatedCost } from '~/modulos/logistica/master-data/product/costing/types/costing.types'
import type { VariantCost } from '~/modulos/logistica/master-data/variant-cost/types/variant-costs.types'

const props = defineProps<{
  productId: string
  form: ProductFormState
  currencyId: string
  variantId?: string
}>()

const emit = defineEmits<{
  'update:currencyId': [value: string]
  'update:autoCalculate': [value: boolean]
}>()

const {
  latestCost,
  latestMaterialCost,
  latestLaborCost,
  latestOverheadCost,
  latestSnapshot,
  loading,
  calculating,
  init,
  calculate
} = useCosting(props.productId, props.currencyId)

const { currencies, selectItems: currencySelectItems, init: initCurrencies } = useCurrencies()
const costingService = useCostingService()
const variantCostsService = useVariantCostsService()
const variantCosts = ref<VariantCost[]>([])
const variantCalculation = ref<CalculatedCost | null>(null)

// Cálculo en vivo (estructura + template) sin guardar snapshot.
const previewCalculation = ref<CalculatedCost | null>(null)
const previewing = ref(false)

const activeVariantCost = computed(() => variantCosts.value[0] ?? null)
const displayedTotalCost = computed(() =>
  previewCalculation.value?.total_cost
  ?? (props.variantId ? Number(activeVariantCost.value?.cost ?? 0) : latestCost.value))
const displayedMaterialCost = computed(() =>
  previewCalculation.value?.material_cost ?? (props.variantId ? 0 : latestMaterialCost.value))
const displayedLaborCost = computed(() =>
  previewCalculation.value?.labor_cost ?? (props.variantId ? 0 : latestLaborCost.value))
const displayedOverheadCost = computed(() =>
  previewCalculation.value?.overhead_cost ?? (props.variantId ? 0 : latestOverheadCost.value))
const displayedOtherCost = computed(() => previewCalculation.value?.other_cost ?? 0)
const displayedCurrencySymbol = computed(() =>
  currencies.value.find(c => c.id === props.currencyId)?.symbol
  ?? (props.variantId ? activeVariantCost.value?.currency?.symbol : latestSnapshot.value?.currencies?.symbol)
  ?? '$')

const loadVariantCosts = async () => {
  variantCosts.value = props.variantId ? await variantCostsService.findByVariant(props.variantId) : []
}

// Preview: material = estructura, labor/overhead/otro = template.
const runPreview = async () => {
  if (!props.currencyId) return
  previewing.value = true
  try {
    previewCalculation.value = await costingService.calculate({
      product_id: props.productId,
      currency_id: props.currencyId,
      variant_id: props.variantId,
      save_snapshot: false
    })
  } catch {
    previewCalculation.value = null
  } finally {
    previewing.value = false
  }
}

const refreshCosts = async () => {
  if (props.variantId) await loadVariantCosts()
  else await init()
}

const showTemplateModal = ref(false)
const toast = useToast()

const costingTabs = computed(() => [
  { label: 'Historial', slot: 'history', value: 'history' },
  ...(props.variantId ? [] : [{ label: 'Pareto', slot: 'pareto', value: 'pareto' }])
])

const activeTab = ref('history')

// =========================
// CALCULAR COSTO
// =========================

const handleCalculate = async () => {
  if (!props.currencyId) {
    toast.add({ title: 'Seleccioná una moneda', color: 'error' })
    return
  }
  try {
    // 1. Recalcular ingeniería si tiene tree
    if (['BOM', 'ENGINEERING', 'PURCHASE'].includes(props.form.cost_source ?? '')) {
      await useEngineeringService().calculate(props.productId, props.variantId)
    }
    // 2. Calcular costo con la moneda actual
    const result = await calculate(true, props.currencyId, props.variantId)
    previewCalculation.value = result
    if (props.variantId) variantCalculation.value = result
    // 3. Refrescar historial
    if (props.variantId) await loadVariantCosts()
    else await init()
    toast.add({ title: 'Costo calculado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error al calcular', description: err?.data?.message || 'No se pudo calcular', color: 'error' })
  }
}

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
  get: () => Boolean(props.form.auto_calculate_cost),
  set: (val) => emit('update:autoCalculate', Boolean(val))
})

// =========================
// HANDLERS
// =========================

const handleAssigned = async () => {
  await init()
}

onMounted(async () => {
  await initCurrencies()
  if (props.variantId) await loadVariantCosts()
  else await init()
  await runPreview()
})

watch([() => props.variantId, () => props.currencyId], () => {
  runPreview()
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
            <USwitch v-model="autoCalculate" label="Calcular desde costo + margen" />
            <p class="text-xs text-muted">
              Cuando está activo, las ventas toman el costo vigente más el porcentaje indicado.
            </p>
            <UFormField v-if="autoCalculate" label="Margen (%)" class="pt-2">
              <UInputNumber v-model="form.sale_margin_percentage" :min="0" :step="0.01" class="w-full" />
            </UFormField>
          </div>
        </UFormField>
      </div>
    </UCard>

    <!-- ========================= -->
    <!-- ACCIONES                  -->
    <!-- ========================= -->
    <div class="flex justify-between items-center gap-2">
      <div class="flex items-center gap-3">
        <UButton
          label="Calcular costo"
          icon="i-lucide-calculator"
          color="primary"
          :loading="calculating"
          @click="handleCalculate"
        />
        <span v-if="previewing" class="text-xs text-muted">Calculando desglose…</span>
      </div>
      <div class="flex gap-2">
        <UButton
          label="Refrescar"
          icon="i-lucide-refresh-cw"
          variant="outline"
          size="sm"
          :loading="loading"
          @click="refreshCosts"
        />
        <UButton
          label="Template"
          icon="i-lucide-settings"
          variant="outline"
          size="sm"
          @click="() => { showTemplateModal = true }"
        />
      </div>
    </div>

    <!-- ========================= -->
    <!-- TABS: HISTORIAL / PARETO  -->
    <!-- ========================= -->
    <UTabs v-model="activeTab" :items="costingTabs" variant="link">
      <template #history>
        <CostSummaryCard
          :total-cost="displayedTotalCost"
          :material-cost="displayedMaterialCost"
          :labor-cost="displayedLaborCost"
          :overhead-cost="displayedOverheadCost"
          :other-cost="displayedOtherCost"
          :currency-symbol="displayedCurrencySymbol"
          :original-currency-code="props.variantId ? activeVariantCost?.currency?.code : latestSnapshot?.currencies?.code"
        />

        <div v-if="variantId" class="mt-4 overflow-hidden rounded-lg border border-default">
          <div class="border-b border-default bg-elevated/40 px-4 py-3">
            <p class="text-sm font-semibold">Historial de la variante</p>
            <p class="text-xs text-muted">Cada cálculo conserva el costo vigente de esta variante.</p>
          </div>
          <div v-if="variantCosts.length" class="divide-y divide-default">
            <div v-for="cost in variantCosts" :key="cost.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p class="text-sm font-medium">{{ cost.source === 'ENGINEERING' ? 'BOM e ingeniería' : cost.source }}</p>
                <p class="text-xs text-muted">{{ new Date(cost.effective_date ?? cost.created_at ?? '').toLocaleString('es-AR') }}</p>
              </div>
              <p class="font-semibold tabular-nums">{{ cost.currency?.symbol ?? '$' }} {{ Number(cost.cost).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
            </div>
          </div>
          <p v-else class="px-4 py-8 text-center text-sm text-muted">Todavía no hay cálculos guardados para esta variante.</p>
        </div>
        <CostingHistoryTable v-else :product-id="productId" :currency-id="currencyId" />
      </template>

      <template v-if="!variantId" #pareto>
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
