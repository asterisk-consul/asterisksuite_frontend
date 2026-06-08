import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProductTagsService } from '~/modulos/logistica/master-data/product-tags/service/product-tags.service'

import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'

import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'
import { useTagsStore } from '~/modulos/almacen/tags/store/tags.store'

export const useProductTagsStore = defineStore('productTags', () => {
  const service = useProductTagsService()

  const items = ref<ProductTag[]>([])

  const loading = ref(false)

  // =========================
  // COMPUTEDS
  // =========================

  const tags = computed(() => items.value.map((i) => i.tags))

  const tagIds = computed(() => items.value.map((i) => i.tag_id))

  // =========================
  // LOAD PRODUCT TAGS
  // =========================

  const fetchByProduct = async (productId: string) => {
    try {
      loading.value = true

      items.value = await service.getProductTags(productId)

      return items.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // ASSIGN
  // =========================

  const assign = async (productId: string, tagId: string) => {
    const created = await service.assign(productId, tagId)

    const productsStore = useProductsStore()
    const tagsStore = useTagsStore()

    const tagData = tagsStore.items.find((t) => t.id === tagId)

    if (tagData) {
      const currentTags = productsStore.current?.product_tags ?? []
      productsStore.patchTags([...currentTags, { ...created, tags: tagData }])
    }

    return created
  }

  // =========================
  // REMOVE
  // =========================

  const remove = async (productId: string, tagId: string) => {
    await service.remove(productId, tagId)
    console.log('items antes del patch:', JSON.stringify(items.value))
    const productsStore = useProductsStore()
    const currentTags = productsStore.current?.product_tags ?? []
    productsStore.patchTags(currentTags.filter((t) => !(t.product_id === productId && t.tag_id === tagId)))
  }

  return {
    // state
    items,
    loading,

    // computed
    tags,
    tagIds,

    // actions
    fetchByProduct,
    assign,
    remove
  }
})
