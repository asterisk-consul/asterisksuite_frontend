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
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { PRODUCT_TYPE_LABELS } from '~/modulos/logistica/master-data/product/composable/product-labels'
import type { UsageType } from '~/modulos/logistica/master-data/product/types/product.types'

const route = useRoute()
const productId = computed(() => route.params.id as string)
const { current: product, loading, loadOne } = useProducts()
const USAGE_TYPE_LABELS: Record<UsageType, string> = {
  SALE: 'Venta',
  PURCHASE: 'Compra',
  BOTH: 'Compra y venta'
}

// Por ahora hardcodeado, después viene del producto o del usuario
const currencyId = '839c208c-744d-4321-a375-2a747c911fa2'

const costing = useCosting(productId.value, currencyId)
const templates = useCostTemplates()
const engineering = useEngineering(productId.value)

// =========================
// TABS
// =========================

const tabs = computed(() => [
  { label: 'General', icon: 'i-heroicons-information-circle', slot: 'general', value: 'general' },
  ...(product.value?.is_composed
    ? [{ label: 'Ingeniería', icon: 'i-heroicons-circle-stack', slot: 'engineering', value: 'engineering' }]
    : []),
  ...(product.value?.cost_template_id || product.value?.product_costs?.length
    ? [{ label: 'Costos', icon: 'i-heroicons-calculator', slot: 'costing', value: 'costing' }]
    : []),
  { label: 'Depósitos', icon: 'i-lucide-warehouse', slot: 'stock', value: 'stock' }
])

const activeTab = ref('general')

// =========================
// INIT
// =========================

onMounted(async () => {
  await loadOne(productId.value)

  // Si viene con hash #stock, abrir tab de depósitos
  if (route.hash === '#stock') {
    activeTab.value = 'stock'
  }
})

watch(activeTab, async (tab) => {
  if (tab === 'engineering') await engineering.init()
  if (tab === 'costing') await Promise.all([costing.init(), templates.init()])
})

useHead({ title: computed(() => product.value?.name ?? 'Producto') })

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
        <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-left" to="/productos" size="sm" />
        <div>
          <h1 class="text-xl font-bold">{{ product?.name ?? 'Detalle del producto' }}</h1>
          <p class="text-sm text-muted">{{ product?.sku ? `SKU ${product.sku}` : 'Sin SKU' }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          label="Ver disponibilidad"
          icon="i-lucide-chart-no-axes-combined"
          color="neutral"
          variant="outline"
          :to="{ path: '/stock/disponibilidad', query: { search: product?.sku || product?.name || undefined } }"
        />
        <UButton label="Editar producto" icon="i-lucide-pencil" :to="`/productos/${productId}/edit`" />
      </div>
    </div>

    <!-- Tabs principales -->
    <UTabs v-model="activeTab" variant="link" :items="tabs">
      <!-- ─── TAB GENERAL ─────────────────────────────────────── -->
      <template #general>
        <UCard class="mt-4" :ui="{ body: 'space-y-5' }">
          <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <USkeleton v-for="index in 4" :key="index" class="h-20" />
          </div>
          <template v-else-if="product">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p class="text-xs text-muted">Tipo</p>
                <p class="font-medium">{{ PRODUCT_TYPE_LABELS[product.product_type] }}</p>
              </div>
              <div>
                <p class="text-xs text-muted">Uso</p>
                <p class="font-medium">{{ USAGE_TYPE_LABELS[product.usage_type] }}</p>
              </div>
              <div>
                <p class="text-xs text-muted">Unidad de stock</p>
                <p class="font-medium">{{ product.unit?.symbol || product.unit?.name || 'Sin unidad' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted">Estado</p>
                <UBadge
                  :label="product.active === false ? 'Inactivo' : 'Activo'"
                  :color="product.active === false ? 'neutral' : 'success'"
                  variant="subtle"
                />
              </div>
            </div>
            <USeparator />
            <div class="flex flex-wrap gap-2">
              <UBadge
                :label="product.manages_stock ? 'Gestiona stock' : 'No gestiona stock'"
                :color="product.manages_stock ? 'primary' : 'neutral'"
                variant="subtle"
              />
              <UBadge
                :label="`${product.product_variants?.length ?? 0} variante${product.product_variants?.length === 1 ? '' : 's'}`"
                color="neutral"
                variant="subtle"
              />
              <UBadge
                :label="`${product.product_categories?.length ?? 0} categoría${product.product_categories?.length === 1 ? '' : 's'}`"
                color="neutral"
                variant="subtle"
              />
            </div>
          </template>
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
            <EngineeringTree :product-id="productId" @delete-node="handleDeleteComponent" />
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
