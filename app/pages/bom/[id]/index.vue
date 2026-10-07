<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import ProductSidebarContent from '~/modulos/logistica/master-data/product/components/ProductSidebarContent.vue'
import BomTabsCard from '~/modulos/logistica/master-data/product/costing/components/BomTabsCard.vue'

import EngineeringSection from '~/modulos/logistica/master-data/product/engineering/sections/EngineeringSection.vue'
import CostingSection from '~/modulos/logistica/master-data/product/costing/sections/CostingSection.vue'
import GeneralSection from '~/modulos/logistica/master-data/product/components/sections/GeneralSection.vue'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'
import { useEngineeringService } from '~/modulos/logistica/master-data/product/engineering/service/engineering.service'
import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import ProductionModal from '~/modulos/logistica/master-data/product/engineering/components/ProductionModal.vue'
import ProductVariantModal from '~/modulos/logistica/master-data/product-variants/components/ProductVariantModal.vue'
import { useProductVariants } from '~/modulos/logistica/master-data/product-variants/composable/useVariants'

import {
  createDefaultProductForm,
  toUpdateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

definePageMeta({
  middleware: ['auth'],
})

const toast = useToast()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canProduce = computed(() => isOwnerOrAdmin.value || hasPermission('production.execute') || hasPermission('stock.create'))

const route = useRoute()

const productId = route.params.id as string

const { current, loading, loadOne, update } = useProducts()
const engineering = useEngineering(productId)
const variantsApi = useProductVariants()
const rootVariants = ref<any[]>([])
const selectedVariantId = ref('__BASE__')
const showVariantModal = ref(false)
const savingVariant = ref(false)
const structureRevision = ref(0)
const variantOptions = computed(() => [
  { label: 'BOM base · compartido', value: '__BASE__' },
  ...rootVariants.value.map(variant => ({ label: variant.name || variant.sku || 'Variante', value: variant.id }))
])
const productionVariantId = computed(() => (selectedVariantId.value === '__BASE__' ? undefined : selectedVariantId.value))
const productionVariantName = computed(() => {
  if (selectedVariantId.value === '__BASE__') return undefined
  const variant = rootVariants.value.find(item => item.id === selectedVariantId.value)
  return variant?.name || variant?.sku || undefined
})
const { baseCurrency, init: initCurrencies } = useCurrencies()

onMounted(async () => {
  await Promise.all([
    loadOne(productId),
    initCurrencies(),
    fetchMyPermissionsIfNeeded()
  ])
  await variantsApi.loadByProduct(productId)
  rootVariants.value = [...variantsApi.items.value]
})

const createVariant = async (payload: any) => {
  savingVariant.value = true
  try {
    const created = await variantsApi.create(payload)
    await variantsApi.loadByProduct(productId)
    rootVariants.value = [...variantsApi.items.value]
    selectedVariantId.value = created.id
    showVariantModal.value = false
    toast.add({ title: 'Variante creada', description: 'Ya podés calcular y administrar su costo desde este BOM.', color: 'success' })
  } finally {
    savingVariant.value = false
  }
}

watch(selectedVariantId, async (variantId) => {
  if (variantId === '__BASE__') return
  try {
    await useEngineeringService().customizeVariantStructure(productId, variantId)
    structureRevision.value += 1
  } catch (err: any) {
    toast.add({ title: 'No se pudo preparar la variante', description: err?.data?.message || 'Intentá nuevamente.', color: 'error' })
  }
})

const product = current

useHead({
  title: computed(() => product.value?.name ?? 'BOM')
})

watch(
  product,
  (value) => {
    if (!value) return

    route.meta.breadcrumb = [
      {
        label: 'Fabricación',
        to: '/fabricacion'
      },
      {
        label: 'BOM',
        to: '/bom'
      },
      {
        label: value.name,
        to: `/bom/${value.id}`
      }
    ]
  },
  {
    immediate: true
  }
)

const form = reactive(createDefaultProductForm())

const allowedTabs = new Set(['general', 'ingenieria', 'costos'])
const requestedTab = String(route.query.tab ?? '')
const activeTab = ref(allowedTabs.has(requestedTab) ? requestedTab : 'ingenieria')

watch(activeTab, tab => {
  navigateTo({ query: { ...route.query, tab } }, { replace: true })
})

const saving = ref(false)
const calculating = ref(false)
const showProductionModal = ref(false)

// Moneda local (no se guarda en el producto, se carga de product_costs)
const currencyId = ref<string>('')

watch(
  product,
  (p) => {
    if (!p) return
    Object.assign(form, p)
    // Cargar moneda del último product_costs, o dejar vacío para que el costing section lo resuelva
    currencyId.value = (p as any).product_costs?.[0]?.currency_id ?? ''
  },
  { immediate: true }
)

// Si no hay moneda del snapshot, intentar cargar la base del sistema
watch(currencyId, async (id) => {
  if (!id && baseCurrency.value) {
    currencyId.value = baseCurrency.value.id
  }
}, { immediate: true })

// =========================
// BOTÓN UNIFICADO: CALCULAR COSTO
// =========================

const handleCalculateCost = async () => {
  calculating.value = true
  try {
    // 1. Recalcular ingeniería (si aplica)
    if (form.cost_source && ['BOM', 'ENGINEERING', 'PURCHASE'].includes(form.cost_source)) {
      await useEngineeringService().calculate(productId, selectedVariantId.value === '__BASE__' ? undefined : selectedVariantId.value)
    }

    // 2. Determinar moneda: usar la del producto o la base del sistema
    let effectiveCurrencyId = currencyId.value
    if (!effectiveCurrencyId && baseCurrency.value) {
      effectiveCurrencyId = baseCurrency.value.id
      currencyId.value = effectiveCurrencyId
    }

    if (!effectiveCurrencyId) {
      toast.add({
        title: 'Error',
        description: 'No hay moneda configurada. Seleccioná una moneda en la pestaña de Costos.',
        color: 'error'
      })
      return
    }

    // 3. Calcular costo final (genera snapshot)
    const costing = useCosting(productId, effectiveCurrencyId)
    await costing.calculate(true, effectiveCurrencyId, selectedVariantId.value === '__BASE__' ? undefined : selectedVariantId.value)

    // 4. Refrescar historial
    await costing.init()

    toast.add({
      title: 'Costo calculado',
      description: 'El costo fue recalculado y guardado correctamente.',
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'Error al calcular',
      description: err?.data?.message || 'No se pudo calcular el costo.',
      color: 'error'
    })
  } finally {
    calculating.value = false
  }
}

// =========================
// SAVE
// =========================

async function handleSave() {
  try {
    saving.value = true

    const payload = toUpdateProductPayload(form)
    await update(productId, payload)

    toast.add({ title: 'BOM actualizado', color: 'success' })
  } catch (err: unknown) {
    let message = 'Error desconocido'

    if (typeof err === 'object' && err !== null && 'data' in err) {
      const data = (err as any).data

      message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || message
    }

    toast.add({
      title: 'Error al actualizar BOM',
      color: 'error',
      description: message,
      icon: 'i-lucide-alert-circle'
    })

    throw err
  } finally {
    saving.value = false
  }
}

const productActions = computed(() => [[
  {
    label: 'Editar producto',
    icon: 'i-lucide-pencil',
    to: `/productos/${productId}/edit`
  },
  {
    label: 'Ver disponibilidad',
    icon: 'i-lucide-chart-no-axes-combined',
    to: `/stock/disponibilidad?search=${encodeURIComponent(product.value?.sku || product.value?.name || '')}`
  }
]])

</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader
      :title="product?.name ?? 'BOM'"
      :description="product?.sku ?? ''"
      :loading="loading"
      show-module-toggle
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    >
      <template #right>
        <div class="flex items-center gap-2">
          <UButton
            v-if="canProduce"
            label="Fabricar"
            icon="i-lucide-factory"
            color="success"
            variant="soft"
            @click="() => { showProductionModal = true }"
          />
          <UButton
            label="Calcular costo"
            icon="i-lucide-calculator"
            variant="soft"
            color="primary"
            :loading="calculating"
            @click="handleCalculateCost"
          />

          <UDropdownMenu :items="productActions" :content="{ align: 'end' }">
            <UButton label="Más" icon="i-lucide-ellipsis" color="neutral" variant="ghost" trailing-icon="i-lucide-chevron-down" />
          </UDropdownMenu>

          <UButton label="Guardar" icon="i-lucide-save" :loading="saving" @click="handleSave" />
        </div>
      </template>
    </AppPageHeader>

    <div class="flex flex-wrap items-center gap-3 border-b border-default bg-elevated/40 px-4 py-3">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-muted">Estructura del producto</p>
        <USelect v-model="selectedVariantId" :items="variantOptions" class="mt-1 w-full max-w-md" />
        <p class="mt-1 text-xs text-muted">El BOM base se comparte. Al elegir una variante se crea una copia independiente para modificar solo lo que cambia.</p>
      </div>
      <UButton label="Nueva variante" icon="i-lucide-plus" variant="outline" @click="() => { showVariantModal = true }" />
    </div>

    <UPage>
      <UPageBody>
        <ProductSidebarContent :product="product ?? null" />
        <BomTabsCard v-model:active-tab="activeTab">
          <template #default="{ activeTab }">
            <EngineeringSection
              :key="`engineering-${selectedVariantId}-${structureRevision}`"
              v-if="activeTab === 'ingenieria'"
              :product-id="productId"
              :form="form"
              :exclude-sources="['MANUAL']"
              :structure-variant-id="selectedVariantId === '__BASE__' ? undefined : selectedVariantId"
              :currency-id="currencyId"
              @update:cost-source="form.cost_source = $event"
            />

            <CostingSection
              :key="`costing-${selectedVariantId}`"
              v-else-if="activeTab === 'costos'"
              :product-id="productId"
              :form="form"
              :currency-id="currencyId"
              :variant-id="selectedVariantId === '__BASE__' ? undefined : selectedVariantId"
              @update:currency-id="currencyId = $event"
              @update:auto-calculate="form.auto_calculate_cost = $event"
            />
            <div v-else>
              <GeneralSection :form="form" />
            </div>
          </template>
        </BomTabsCard>
      </UPageBody>
    </UPage>

    <ProductionModal
      v-model:open="showProductionModal"
      :product-id="productId"
      :product-name="product?.name"
      :variant-id="productionVariantId"
      :variant-name="productionVariantName"
    />
    <ProductVariantModal
      v-model:open="showVariantModal"
      :product-id="productId"
      :loading="savingVariant"
      @submit="createVariant"
    />
  </div>
</template>
