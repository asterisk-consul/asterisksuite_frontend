<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})
import BomSidebar from '~/modulos/logistica/master-data/product/components/ProductSidebar.vue'
import ProductForm from '~/modulos/logistica/master-data/product/components/ProductForm.vue'

import {
  createDefaultProductForm,
  toUpdateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

import type { ProductVariant } from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'

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

const route = useRoute()
const productId = route.params.id as string
const saving = ref(false)

const { current, loading, loadOne, update } = useProducts()

onMounted(async () => {
  await loadOne(productId)
})

const product = current
const form = reactive(createDefaultProductForm())

watch(
  product,
  (p) => {
    if (!p) return
    Object.assign(form, p)
  },
  { immediate: true }
)

useHead({
  title: computed(() => product.value?.name ?? 'Productos')
})

watch(
  product,
  (value) => {
    if (!value) return

    route.meta.breadcrumb = [
      {
        label: 'Stock',
        to: '/stock'
      },
      {
        label: 'Productos',
        to: '/productos'
      },
      {
        label: value.name,
        to: `/productos/${value.id}/edit`
      }
    ]
  },
  {
    immediate: true
  }
)

const onVariantCreated = (variant: ProductVariant) => {
  if (!productsStore.current) return
  productsStore.current = {
    ...productsStore.current,
    product_variants: [variant, ...(productsStore.current.product_variants ?? [])]
  }
}

const onVariantUpdated = (variant: ProductVariant) => {
  if (!productsStore.current?.product_variants) return
  const idx = productsStore.current.product_variants.findIndex((v) => v.id === variant.id)
  if (idx !== -1) productsStore.current.product_variants[idx] = variant
}

async function handleSave() {
  try {
    saving.value = true

    const payload = toUpdateProductPayload(form)
    await update(productId, payload)

    toast.add({ title: 'Producto actualizado', color: 'success' })
  } catch (err: unknown) {
    let message = 'Error desconocido'

    if (typeof err === 'object' && err !== null && 'data' in err) {
      const data = (err as any).data

      message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || message
    }

    toast.add({
      title: 'Error al actualizar Producto',
      color: 'error',
      description: message,
      icon: 'i-lucide-alert-circle'
    })

    throw err
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
      :title="product?.name ?? 'BOM'"
      :description="product?.sku ?? ''"
      :loading="loading"
      show-module-toggle
      :links="links"
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    />
    <UPage :ui="pageUi">
      <template v-if="!moduleCollapsed" #left>
        <BomSidebar :product="product ?? null" :mobile-open="mobileOpen" @update:mobile-open="mobileOpen = $event" />
      </template>

      <UPageBody>
        <ProductForm
          v-model="form"
          :product="product"
          mode="edit"
          :loading="loading"
          @variant-created="onVariantCreated"
          @variant-updated="onVariantUpdated"
        />
      </UPageBody>
    </UPage>
  </div>
</template>
