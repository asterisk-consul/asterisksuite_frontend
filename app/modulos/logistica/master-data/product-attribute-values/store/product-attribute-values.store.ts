import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProductAttributeValuesService } from '~/modulos/logistica/master-data/product-attribute-values/service/product-attribute-values.service'

import type {
  ProductAttributeValue,
  CreateProductAttributeValueInput,
  UpdateProductAttributeValueInput
} from '~/modulos/logistica/master-data/product-attribute-values/types/product-attribute-values.types'

export const useProductAttributeValuesStore =
  defineStore(
    'productAttributeValues',
    () => {
      const service =
        useProductAttributeValuesService()

      const items = ref<
        ProductAttributeValue[]
      >([])

      const current =
        ref<ProductAttributeValue | null>(
          null
        )

      const loading = ref(false)

      // =========================
      // COMPUTEDS
      // =========================

      const textValues = computed(() =>
        items.value.filter(
          (i) => i.text_value !== null
        )
      )

      const numberValues = computed(() =>
        items.value.filter(
          (i) => i.number_value !== null
        )
      )

      const booleanValues = computed(() =>
        items.value.filter(
          (i) =>
            i.boolean_value !== null
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
        payload: CreateProductAttributeValueInput
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
        payload: UpdateProductAttributeValueInput
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
        textValues,
        numberValues,
        booleanValues,

        // actions
        fetchAll,
        fetchOne,
        create,
        update,
        remove
      }
    }
  )
