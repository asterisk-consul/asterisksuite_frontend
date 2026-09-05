<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'

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
const engineering = useEngineering(props.productId)

const showTemplateModal = ref(false)
const toast = useToast()

const costingTabs = [
  { label: 'Historial', slot: 'history', value: 'history' },
  { label: 'Pareto', slot: 'pareto', value: 'pareto' }
]

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
    if (['BOM', 'ENGINEERING', 'PURCHASE'].includes(props.form.cost_source)) {
      await engineering.calculate()
    }
    // 2. Calcular costo con la moneda actual
    await calculate(true, props.currencyId)
    // 3. Refrescar historial
    await init()
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
  get: () => props.form.auto_calculate_cost,
  set: (val) => emit('update:autoCalculate', val)
})

// =========================
// HANDLERS
// =========================

const handleAssigned = async () => {
  await init()
}

onMounted(async () => {
  await init()
  await initCurrencies()
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
    <div class="flex justify-between items-center gap-2">
      <UButton
        label="Calcular costo"
        icon="i-lucide-calculator"
        color="primary"
        :loading="calculating"
        @click="handleCalculate"
      />
      <div class="flex gap-2">
        <UButton
          label="Refrescar"
          icon="i-lucide-refresh-cw"
          variant="outline"
          size="sm"
          :loading="loading"
          @click="init"
        />
        <UButton
          label="Template"
          icon="i-lucide-settings"
          variant="outline"
          size="sm"
          @click="showTemplateModal = true"
        />
      </div>
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
          :currency-symbol="latestSnapshot?.currencies?.symbol ?? '$'"
          :original-currency-code="latestSnapshot?.currencies?.code"
        />

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
