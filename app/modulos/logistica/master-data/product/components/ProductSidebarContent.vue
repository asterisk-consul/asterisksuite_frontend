<script setup lang="ts">
import type { Product, ProductType } from '~/modulos/logistica/master-data/product/types/product.types'
import ProductTagsSelect from '~/modulos/logistica/master-data/product-tags/components/ProductTagSelect.vue'
import ProductCategorySelect from '~/modulos/logistica/master-data/product-categories/components/ProductCategorySelect.vue'
import { PRODUCT_TYPE_LABELS } from '~/modulos/logistica/master-data/product/composable/product-labels'

import { useProductTagsStore } from '~/modulos/logistica/master-data/product-tags/store/product-tags.store'
import { useProductCategoriesStore } from '~/modulos/logistica/master-data/product-categories/store/product-categories.store'

const toast = useToast()
const productTagsStore = useProductTagsStore()
const productCategoriesStore = useProductCategoriesStore()
const addingTag = ref(false)
const addingCategory = ref(false)

defineProps<{
  product: Product | null
}>()

const selectCategory = () => {
  toast.add({
    title: 'Categorías modificadas',
    description: 'Se actualizaron las categorías del producto.',
    color: 'success'
  })
  addingCategory.value = false
}

const selectTag = () => {
  toast.add({
    title: 'Etiquetas modificadas',
    description: 'Se actualizaron las etiquetas del producto.',
    color: 'success'
  })
  addingTag.value = false
}
const handleRemoveCategory = (categoryId: string, productId: string, categoryName?: string) => {
  try {
    productCategoriesStore.remove(productId, categoryId)

    toast.add({
      title: 'Categoría eliminada',
      description: `"${categoryName}" fue removida correctamente.`,
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Error',
      description: `No se pudo eliminar "${categoryName}".`,
      color: 'error'
    })
  }
}
const handleRemoveTag = async (tagId: string, productId: string, tagName?: string) => {
  try {
    productTagsStore.remove(productId, tagId)

    toast.add({
      title: 'Etiqueta eliminada',
      description: `"${tagName}" fue removida correctamente.`,
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Error',
      description: `No se pudo eliminar "${tagName}".`,
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-5 w-full">
    <!-- Imagen -->
    <div class="aspect-square rounded-xl border border-default overflow-hidden bg-elevated">
      <img
        v-if="(product as any)?.image"
        :src="(product as any).image"
        :alt="product?.name"
        class="h-full w-full object-cover"
      />
      <div v-else class="h-full flex items-center justify-center">
        <UIcon name="i-lucide-package" class="size-12 text-muted" />
      </div>
    </div>

    <!-- Datos -->
    <div class="space-y-3">
      <div>
        <p class="text-xs text-muted">SKU</p>
        <p class="text-sm font-medium">{{ product?.sku }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Tipo</p>
        <p class="text-sm font-medium">
          {{ PRODUCT_TYPE_LABELS[(product as any)?.product_type as ProductType] }}
        </p>
      </div>
    </div>

    <USeparator />

    <!-- Categorías -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Categorías</span>
        <UButton v-if="!addingCategory" size="xs" variant="ghost" icon="i-lucide-plus" @click="addingCategory = true" />
      </div>
      <div class="flex flex-wrap gap-1 mb-2">
        <UBadge
          class="font-bold rounded-full"
          v-for="cat in product?.product_categories ?? []"
          :key="cat.category_id"
          :label="cat.categories?.name"
          size="sm"
          variant="subtle"
          color="neutral"
        >
          <template #trailing>
            <span
              class="ml-1 cursor-pointer opacity-50 hover:opacity-100 leading-none"
              @click="handleRemoveCategory(cat.category_id, product!.id, cat.categories?.name)"
            >
              ×
            </span>
          </template>
        </UBadge>
      </div>
      <ProductCategorySelect
        v-if="addingCategory"
        :productId="product?.id"
        :productCategories="product?.product_categories ?? []"
        @selected="selectCategory"
        @cancel="addingCategory = false"
      />
    </div>

    <USeparator />

    <!-- Tags -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Etiquetas</span>
        <UButton v-if="!addingTag" size="xs" variant="ghost" icon="i-lucide-plus" @click="addingTag = true" />
      </div>
      <div class="flex flex-wrap gap-1 mb-2">
        <UBadge
          v-for="tag in product?.product_tags ?? []"
          :key="tag.tag_id"
          :label="tag.tags?.name"
          size="sm"
          variant="subtle"
        >
          <template #trailing>
            <span
              class="ml-1 cursor-pointer opacity-50 hover:opacity-100 leading-none"
              @click="handleRemoveTag(tag.tag_id, product!.id, tag.tags?.name)"
            >
              ×
            </span>
          </template>
        </UBadge>
      </div>
      <ProductTagsSelect
        v-if="addingTag"
        :productId="product?.id"
        :tags="product?.product_tags ?? []"
        @selected="selectTag"
        @cancel="addingTag = false"
      />
    </div>
  </div>
</template>
