<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
})

import BomSidebar from '~/modulos/logistica/master-data/product/components/ProductSidebar.vue'
import ProductForm from '~/modulos/logistica/master-data/product/components/ProductForm.vue'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import type { ProductVariant } from '~/modulos/logistica/master-data/product/types/product.types'
import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

const productsStore = useProductsStore()
const { moduleCollapsed } = useModuleSidebarState()
const toast = useToast()
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

const { create, loading } = useProducts()
const saving = ref(false)
const form = reactive(createDefaultProductForm())
const route = useRoute()

// Pre-llenar desde el modal rápido de creación
if (route.query.name) form.name = String(route.query.name)
if (route.query.sku) form.sku = String(route.query.sku)
if (route.query.product_type) form.product_type = String(route.query.product_type) as any
if (route.query.usage_type) form.usage_type = String(route.query.usage_type) as any
if (route.query.calculation_type) form.calculation_type = String(route.query.calculation_type) as any
if (route.query.tax_category_id) form.tax_category_id = String(route.query.tax_category_id)

useHead({ title: 'Nuevo producto' })

const onVariantCreated = (variant: ProductVariant) => {
  if (!productsStore.current) return
  productsStore.current = {
    ...productsStore.current,
    product_variants: [variant, ...(productsStore.current.product_variants ?? [])]
  }
}

async function handleSave() {
  try {
    saving.value = true
    const payload = toCreateProductPayload(form)
    const created = await create(payload)
    productsStore.current = created
    toast.add({ title: 'Producto creado', color: 'success' })
    await navigateTo(`/productos/${created.id}/edit`)
  } catch (err: unknown) {
    const msg = productsStore.error || 'Error al crear producto'
    toast.add({
      title: 'Error al crear Producto',
      color: 'error',
      description: msg,
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}
const links = computed(() => [
  {
    label: 'Guardar',
    icon: 'i-lucide-save',
    loading: saving.value,
    onClick: handleSave
  }
])

const pageUi = computed(() => ({
  root: moduleCollapsed.value ? 'flex flex-col' : 'flex flex-col lg:grid lg:grid-cols-[200px_1fr] lg:gap-2',
  left: 'lg:col-start-1',
  center: moduleCollapsed.value ? '' : 'lg:col-start-2'
}))
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader
      title="Nuevo producto"
      :loading="loading"
      show-module-toggle
      :links="links"
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    />
    <UPage :ui="pageUi">
      <template v-if="!moduleCollapsed" #left>
        <BomSidebar :product="null" :mobile-open="mobileOpen" @update:mobile-open="mobileOpen = $event" />
      </template>

      <UPageBody>
        <ProductForm v-model="form" mode="create" :loading="loading" @variant-created="onVariantCreated" />
      </UPageBody>
    </UPage>
  </div>
</template>
