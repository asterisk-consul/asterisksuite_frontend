import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProductTagsService } from '~/modulos/logistica/master-data/product-tags/service/product-tags.service'

import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'

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

    items.value.push(created)

    return created
  }

  // =========================
  // REMOVE
  // =========================

  const remove = async (productId: string, tagId: string) => {
    await service.remove(productId, tagId)

    items.value = items.value.filter(
      (i) => !(i.product_id === productId && i.tag_id === tagId)
    )
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
