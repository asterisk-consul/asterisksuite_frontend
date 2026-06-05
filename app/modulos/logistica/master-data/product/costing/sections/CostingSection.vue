<script setup lang="ts">
import { useCosting } from '../composables/useCosting'

import CostTemplateSelectorModal from '~/modulos/logistica/master-data/product/cost-templates/modal/CostTemplateSelectorModal.vue'

import CostingHistoryTable from '~/modulos/logistica/master-data/product/costing/components/CostingHistoryTable.vue'
import CostingParetoTable from '~/modulos/logistica/master-data/product/costing/components/CostingParetoTable.vue'

const props = defineProps<{
  productId: string
  currencyId: string
}>()

const costing = useCosting(props.productId, props.currencyId)

const showTemplateModal = ref(false)

const costingTabs = [
  {
    label: 'Historial',
    slot: 'history'
  },
  {
    label: 'Pareto',
    slot: 'pareto'
  }
]

const activeTab = ref('history')

const handleAssigned = async () => {
  await costing.init()
}

onMounted(async () => {
  await costing.init()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <UButton label="Cambiar template" icon="i-lucide-settings" @click="showTemplateModal = true" />
    </div>

    <UTabs v-model="activeTab" :items="costingTabs">
      <template #history>
        <CostingHistoryTable :product-id="productId" :currency-id="currencyId" />
      </template>

      <template #pareto>
        <CostingParetoTable :product-id="productId" :currency-id="currencyId" />
      </template>
    </UTabs>

    <CostTemplateSelectorModal
      v-model:open="showTemplateModal"
      :product-id="productId"
      :current-template-id="costing.latestSnapshot.value?.cost_template_id ?? null"
      @assigned="handleAssigned"
    />
  </div>
</template>
