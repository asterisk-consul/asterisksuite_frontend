<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import BomSidebar from '~/modulos/logistica/master-data/product/components/ProductSidebar.vue'
import BomTabsCard from '~/modulos/logistica/master-data/product/costing/components/BomTabsCard.vue'

import EngineeringSection from '~/modulos/logistica/master-data/product/engineering/sections/EngineeringSection.vue'
import CostingSection from '~/modulos/logistica/master-data/product/costing/sections/CostingSection.vue'
import GeneralSection from '~/modulos/logistica/master-data/product/components/sections/GeneralSection.vue'

import { createDefaultProductForm } from '~/modulos/logistica/master-data/product/utils/product-form.utils'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
})

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

const currencyId = '839c208c-744d-4321-a375-2a747c911fa2'

// Cuando carga el producto, llenás el form
watch(
  product,
  (p) => {
    if (!p) return
    Object.assign(form, p)
  },
  { immediate: true }
)

async function handleSave() {
  try {
    saving.value = true

    // CREATE
    // await productsStore.create(form)

    // UPDATE
    // await productsStore.update(productId, form)

    console.log(form)
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
            <EngineeringSection v-if="activeTab === 'ingenieria'" :product-id="productId" />

            <CostingSection v-else-if="activeTab === 'costos'" :product-id="productId" :currency-id="currencyId" />

            <GeneralSection v-else :form="form" />
          </template>
        </BomTabsCard>
      </UPageBody>
    </UPage>
  </div>
</template>
