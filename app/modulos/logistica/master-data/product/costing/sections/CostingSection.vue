<script setup lang="ts">
import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'

import CostTemplateSelectorModal from '~/modulos/logistica/master-data/product/cost-templates/modal/CostTemplateSelectorModal.vue'
import CostSummaryCard from '~/modulos/logistica/master-data/product/costing/components/CostSummaryCard.vue'
import CostingHistoryTable from '~/modulos/logistica/master-data/product/costing/components/CostingHistoryTable.vue'
import CostingParetoTable from '~/modulos/logistica/master-data/product/costing/components/CostingParetoTable.vue'
const props = defineProps<{
  productId: string
  currencyId: string
}>()

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

const showTemplateModal = ref(false)

const costingTabs = [
  { label: 'Historial', slot: 'history', value: 'history' },
  { label: 'Pareto', slot: 'pareto', value: 'pareto' }
]

const activeTab = ref('history')

const handleCalculate = async () => {
  await calculate()
}
const handleAssigned = async () => await init()

onMounted(async () => await init())
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <div class="flex items-center justify-between gap-2">
        <UButton
          label="Actualizar"
          variant="soft"
          color="neutral"
          :loading="calculating"
          class="cursor-pointer"
          @click="handleCalculate"
        />
        <UButton
          label="Cambiar template"
          icon="i-lucide-settings"
          class="cursor-pointer"
          @click="showTemplateModal = true"
        />
      </div>
    </div>

    <UTabs v-model="activeTab" :items="costingTabs" variant="link">
      <template #history>
        <CostSummaryCard
          :total-cost="latestCost"
          :material-cost="latestMaterialCost"
          :labor-cost="latestLaborCost"
          :overhead-cost="latestOverheadCost"
          currency-symbol="$"
        />
        <CostingHistoryTable :product-id="productId" :currency-id="currencyId" />
      </template>

      <template #pareto>
        <CostingParetoTable :product-id="productId" :currency-id="currencyId" />
      </template>
    </UTabs>

    <CostTemplateSelectorModal
      v-model:open="showTemplateModal"
      :product-id="productId"
      :current-template-id="latestSnapshot?.cost_template_id ?? null"
      @assigned="handleAssigned"
    />
  </div>
</template>
