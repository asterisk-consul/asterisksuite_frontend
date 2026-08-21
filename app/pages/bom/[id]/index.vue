<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import BomSidebar from '~/modulos/logistica/master-data/product/components/ProductSidebar.vue'
import BomTabsCard from '~/modulos/logistica/master-data/product/costing/components/BomTabsCard.vue'

import EngineeringSection from '~/modulos/logistica/master-data/product/engineering/sections/EngineeringSection.vue'
import CostingSection from '~/modulos/logistica/master-data/product/costing/sections/CostingSection.vue'
import GeneralSection from '~/modulos/logistica/master-data/product/components/sections/GeneralSection.vue'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'
import { useCosting } from '~/modulos/logistica/master-data/product/costing/composables/useCosting'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

import {
  createDefaultProductForm,
  toUpdateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

definePageMeta({
  middleware: ['auth'],
})

const toast = useToast()

const route = useRoute()

const { moduleCollapsed } = useModuleSidebarState()

const mobileOpen = ref(false)

watch(moduleCollapsed, (collapsed) => {
  if (!collapsed && window.innerWidth < 1024) {
    mobileOpen.value = true
    moduleCollapsed.value = true
  }
})

watch(mobileOpen, (open) => {
  if (!open) {
    moduleCollapsed.value = true
  }
})

const productId = route.params.id as string

const { current, loading, loadOne, update } = useProducts()
const engineering = useEngineering(productId)
const { baseCurrency, init: initCurrencies } = useCurrencies()

onMounted(async () => {
  await Promise.all([loadOne(productId), initCurrencies()])
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

const activeTab = ref('general')

const saving = ref(false)
const calculating = ref(false)

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
    if (['BOM', 'ENGINEERING', 'PURCHASE'].includes(form.cost_source)) {
      await engineering.calculate()
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
    await costing.calculate(true, effectiveCurrencyId)

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

const pageUi = computed(() => ({
  root: moduleCollapsed.value ? 'flex flex-col' : 'flex flex-col lg:grid lg:grid-cols-[200px_1fr] lg:gap-2',
  left: 'lg:col-start-1',
  center: moduleCollapsed.value ? '' : 'lg:col-start-2'
}))

const links = computed(() => [
  {
    label: 'Guardar',
    icon: 'i-lucide-save',
    loading: saving.value,
    onClick: handleSave
  }
])
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader
      :title="product?.name ?? 'BOM'"
      :description="product?.sku ?? ''"
      :loading="loading"
      show-module-toggle
      :links="links"
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    >
      <template #right>
        <div class="flex items-center gap-2">
          <UButton
            label="Calcular costo"
            icon="i-lucide-calculator"
            variant="soft"
            color="primary"
            :loading="calculating"
            @click="handleCalculateCost"
          />

          <UButton label="Guardar" icon="i-lucide-save" :loading="saving" @click="handleSave" />
        </div>
      </template>
    </AppPageHeader>

    <UPage :ui="pageUi">
      <template v-if="!moduleCollapsed" #left>
        <BomSidebar :product="product ?? null" :mobile-open="mobileOpen" @update:mobile-open="mobileOpen = $event" />
      </template>

      <UPageBody>
        <BomTabsCard v-model:active-tab="activeTab">
          <template #default="{ activeTab }">
            <EngineeringSection
              v-if="activeTab === 'ingenieria'"
              :product-id="productId"
              :form="form"
              :exclude-sources="['MANUAL']"
              @update:cost-source="form.cost_source = $event"
            />

            <CostingSection
              v-else-if="activeTab === 'costos'"
              :product-id="productId"
              :form="form"
              :currency-id="currencyId"
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
  </div>
</template>
