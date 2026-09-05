<script setup lang="ts">
import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'
import { useCostTemplates } from '~/modulos/logistica/master-data/product/cost-templates/composables/useCostTemplates'
import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'

//components
import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'
import CostingHistoryTable from '~/modulos/logistica/master-data/product/costing/components/CostingHistoryTable.vue'
import CostingParetoTable from '~/modulos/logistica/master-data/product/costing/components/CostingParetoTable.vue'
import CostTemplateSelector from '~/modulos/logistica/master-data/product/cost-templates/components/CostTemplateSelector.vue'
import ProductStockTab from '~/modulos/logistica/master-data/product/stock/components/ProductStockTab.vue'

const route = useRoute()
const productId = computed(() => route.params.id as string)

// Por ahora hardcodeado, después viene del producto o del usuario
const currencyId = '839c208c-744d-4321-a375-2a747c911fa2'

const costing = useCosting(productId.value, currencyId)
const templates = useCostTemplates()
const engineering = useEngineering(productId.value)

// =========================
// TABS
// =========================

const tabs = [
  { label: 'General', icon: 'i-heroicons-information-circle', slot: 'general' },
  { label: 'Ingeniería', icon: 'i-heroicons-circle-stack', slot: 'engineering' },
  { label: 'Costos', icon: 'i-heroicons-calculator', slot: 'costing' },
  { label: 'Depósitos', icon: 'i-lucide-warehouse', slot: 'stock' }
]

const activeTab = ref('general')

// =========================
// INIT
// =========================

onMounted(async () => {
  await Promise.all([costing.init(), templates.init(), engineering.init()])

  // Si viene con hash #stock, abrir tab de depósitos
  if (route.hash === '#stock') {
    activeTab.value = 'stock'
  }
})

// =========================
// HANDLERS
// =========================

const handleCalculated = async () => {
  await costing.init()
}

const handleTemplateAssigned = async () => {
  showTemplateSelector.value = false
  await Promise.all([costing.init(), templates.init()])
}

const handleTemplateRemoved = async () => {
  await Promise.all([costing.init(), templates.init()])
}

// =========================
// MODALS
// =========================

const showTemplateSelector = ref(false)
const showAddComponent = ref(false)
const showDeleteModal = ref(false)

const paretoMode = ref<'materials' | 'full'>('materials')

const costingTabs = [
  { label: 'Historial', slot: 'history' },
  { label: 'Pareto', slot: 'pareto' }
]

const activeCostingTab = ref('history')

// =========================
// ENGINEERING HANDLERS
// =========================

const handleDeleteComponent = (node: any) => {
  // TODO: implementar delete desde el árbol
}

const handleComponentSaved = async () => {
  // refresh tree if needed
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/productos"
          size="sm"
        />
        <div>
          <h1 class="text-xl font-bold">Detalle del producto</h1>
          <p class="text-sm text-muted">{{ productId }}</p>
        </div>
      </div>
    </div>

    <!-- Tabs principales -->
    <UTabs v-model="activeTab" :items="tabs">
      <!-- ─── TAB GENERAL ─────────────────────────────────────── -->
      <template #general>
        <UCard class="mt-4">
          <p class="text-sm text-muted">Información general del producto (próximamente)</p>
        </UCard>
      </template>

      <!-- ─── TAB INGENIERÍA ─────────────────────────────────── -->
      <template #engineering>
        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">Árbol de ingeniería</h2>
            <UButton size="sm" variant="outline" icon="i-heroicons-plus" @click="showAddComponent = true">
              Agregar componente
            </UButton>
          </div>

          <UCard>
            <EngineeringTree
              :product-id="productId"
              @delete-node="handleDeleteComponent"
            />
          </UCard>
        </div>
      </template>

      <!-- ─── TAB COSTOS ─────────────────────────────────────── -->
      <template #costing>
        <div class="mt-4 space-y-4">
          <!-- Template asignado -->
          <CostTemplateCard
            :product-id="productId"
            :template-id="costing.latestSnapshot.value?.cost_template_id ?? null"
            @change="showTemplateSelector = true"
            @removed="handleTemplateRemoved"
          />

          <!-- Botón calcular -->
          <div class="flex justify-end">
            <CostingCalculateButton :product-id="productId" :currency-id="currencyId" @calculated="handleCalculated" />
          </div>

          <!-- Summary cards -->
          <CostingSummaryCards :product-id="productId" :currency-id="currencyId" />

          <!-- Tabs historial / pareto -->
          <UTabs v-model="activeCostingTab" :items="costingTabs">
            <template #history>
              <div class="mt-3">
                <CostingHistoryTable :product-id="productId" :currency-id="currencyId" />
              </div>
            </template>

            <template #pareto>
              <div class="mt-3">
                <CostingParetoTable :product-id="productId" :currency-id="currencyId" />
              </div>
            </template>
          </UTabs>
        </div>
      </template>

      <!-- ─── TAB DEPÓSITOS ──────────────────────────────────── -->
      <template #stock>
        <div class="mt-4">
          <ProductStockTab :product-id="productId" />
        </div>
      </template>
    </UTabs>

    <!-- ─── MODAL TEMPLATE SELECTOR ───────────────────────────── -->
    <UModal v-model:open="showTemplateSelector" title="Seleccionar template de costo">
      <template #body>
        <CostTemplateSelector
          :product-id="productId"
          :current-template-id="costing.latestSnapshot.value?.cost_template_id ?? null"
          @assigned="handleTemplateAssigned"
          @closed="showTemplateSelector = false"
        />
      </template>
    </UModal>
  </div>
</template>
