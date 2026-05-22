import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProductCategoriesService } from '~/modulos/logistica/master-data/product-categories/service/product-categories.service'

import type {
  ProductCategory,
  AssignProductCategoryInput,
  BulkAssignProductCategoriesInput
} from '~/modulos/logistica/master-data/product-categories/types/product-categories.types'

export const useProductCategoriesStore =
  defineStore(
    'productCategories',
    () => {
      const service =
        useProductCategoriesService()

      const items = ref<
        ProductCategory[]
      >([])

      const loading = ref(false)

      // =========================
      // COMPUTEDS
      // =========================

      const categoryIds = computed(() =>
        items.value.map(
          (i) => i.category_id
        )
      )

      // =========================
      // LOAD PRODUCT CATEGORIES
      // =========================

      const fetchByProduct = async (
        productId: string
      ) => {
        try {
          loading.value = true

          items.value =
            await service.getProductCategories(
              productId
            )

          return items.value
        } finally {
          loading.value = false
        }
      }

      // =========================
      // ASSIGN
      // =========================

      const assign = async (
        payload: AssignProductCategoryInput
      ) => {
        const created =
          await service.assign(payload)

        items.value.push(created)

        return created
      }

      // =========================
      // BULK ASSIGN
      // =========================

      const bulkAssign = async (
        payload: BulkAssignProductCategoriesInput
      ) => {
        const created =
          await service.bulkAssign(
            payload
          )

        items.value = created

        return created
      }

      // =========================
      // REMOVE
      // =========================

      const remove = async (
        productId: string,
        categoryId: string
      ) => {
        await service.remove(
          productId,
          categoryId
        )

        items.value =
          items.value.filter(
            (i) =>
              !(
                i.product_id ===
                  productId &&
                i.category_id ===
                  categoryId
              )
          )
      }

      return {
        // state
        items,
        loading,

        // computed
        categoryIds,

        // actions
        fetchByProduct,
        assign,
        bulkAssign,
        remove
      }
    }
  )
