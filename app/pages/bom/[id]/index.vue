<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import BomSidebar from '~/modulos/logistica/master-data/product/components/ProductSidebar.vue'
import BomTabsCard from '~/modulos/logistica/master-data/product/costing/components/BomTabsCard.vue'

import EngineeringSection from '~/modulos/logistica/master-data/product/engineering/sections/EngineeringSection.vue'
import CostingSection from '~/modulos/logistica/master-data/product/costing/sections/CostingSection.vue'
import GeneralSection from '~/modulos/logistica/master-data/product/components/sections/GeneralSection.vue'

import {
  createDefaultProductForm,
  toUpdateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
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

onMounted(async () => {
  await loadOne(productId)
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

// Moneda local (no se guarda en el producto, se carga de product_costs)
const currencyId = ref<string>('')

watch(
  product,
  (p) => {
    if (!p) return
    Object.assign(form, p)
    // Cargar moneda del último product_costs
    currencyId.value = (p as any).product_costs?.[0]?.currency_id ?? ''
  },
  { immediate: true }
)

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
          <UButton label="Actualizar Costos" variant="soft" color="neutral" />

          <UButton label="Ver BOM" variant="soft" color="neutral" />

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
