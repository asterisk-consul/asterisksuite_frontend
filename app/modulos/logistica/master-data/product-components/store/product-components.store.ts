import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProductComponentsService } from '~/modulos/logistica/master-data/products-components/service/product-components.service'

import type {
  ProductComponent,
  CreateProductComponentInput,
  UpdateProductComponentInput
} from '~/modulos/logistica/master-data/products-components/types/product-components.types'

export const useProductComponentsStore =
  defineStore(
    'productComponents',
    () => {
      const service =
        useProductComponentsService()

      const items = ref<
        ProductComponent[]
      >([])

      const current =
        ref<ProductComponent | null>(
          null
        )

      const loading = ref(false)

      // =========================
      // COMPUTEDS
      // =========================

      const activeItems = computed(() =>
        items.value.filter(
          (i) => i.active !== false
        )
      )

      const totalQuantity = computed(() =>
        items.value.reduce(
          (acc, item) =>
            acc + item.quantity,
          0
        )
      )

      // =========================
      // LOAD ALL
      // =========================

      const fetchAll = async () => {
        try {
          loading.value = true

          items.value =
            await service.findAll()

          return items.value
        } finally {
          loading.value = false
        }
      }

      // =========================
      // LOAD ONE
      // =========================

      const fetchOne = async (
        id: string
      ) => {
        try {
          loading.value = true

          const data =
            await service.findOne(id)

          current.value = data

          return data
        } finally {
          loading.value = false
        }
      }

      // =========================
      // CREATE
      // =========================

      const create = async (
        payload: CreateProductComponentInput
      ) => {
        const created =
          await service.create(payload)

        items.value.unshift(created)

        return created
      }

      // =========================
      // UPDATE
      // =========================

      const update = async (
        id: string,
        payload: UpdateProductComponentInput
      ) => {
        const updated =
          await service.update(
            id,
            payload
          )

        const index =
          items.value.findIndex(
            (i) => i.id === id
          )

        if (index !== -1) {
          items.value[index] = updated
        }

        if (current.value?.id === id) {
          current.value = updated
        }

        return updated
      }

      // =========================
      // DELETE
      // =========================

      const remove = async (
        id: string
      ) => {
        await service.remove(id)

        items.value =
          items.value.filter(
            (i) => i.id !== id
          )

        if (current.value?.id === id) {
          current.value = null
        }
      }

      return {
        // state
        items,
        current,
        loading,

        // computed
        activeItems,
        totalQuantity,

        // actions
        fetchAll,
        fetchOne,
        create,
        update,
        remove
      }
    }
  )
