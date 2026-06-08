import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useAttributesService } from '~/modulos/almacen/attributes/service/attributes.service'

import type {
  Attribute,
  CreateAttributeInput,
  UpdateAttributeInput
} from '~/modulos/almacen/attributes/types/attributes.types'

import { AttributeType } from '~/modulos/almacen/attributes/types/attributes.types'

export const useAttributesStore = defineStore('attributes', () => {
  const service = useAttributesService()

  const items = ref<Attribute[]>([])
  const current = ref<Attribute | null>(null)

  const loading = ref(false)

  const error = ref<string | null>(null)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const textAttributes = computed(() =>
    items.value.filter((i) => i.type === AttributeType.TEXT)
  )

  const numericAttributes = computed(() =>
    items.value.filter((i) => i.type === AttributeType.NUMBER)
  )

  const booleanAttributes = computed(() =>
    items.value.filter((i) => i.type === AttributeType.BOOLEAN)
  )

  // =========================
  // HELPERS
  // =========================

  const handleError = (err: any) => {
    console.error(err)

    error.value =
      err?.data?.message || err?.message || 'Ocurrió un error inesperado'

    throw err
  }

  const clearError = () => {
    error.value = null
  }

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true

      clearError()

      items.value = await service.findAll()

      return items.value
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOAD ONE
  // =========================

  const fetchOne = async (id: string) => {
    try {
      loading.value = true

      clearError()

      const data = await service.findOne(id)

      current.value = data

      return data
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateAttributeInput) => {
    try {
      loading.value = true

      clearError()

      const created = await service.create(payload)

      items.value.unshift(created)

      return created
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateAttributeInput) => {
    try {
      loading.value = true

      clearError()

      const updated = await service.update(id, payload)

      const index = items.value.findIndex((i) => i.id === id)

      if (index !== -1) {
        items.value[index] = updated
      }

      if (current.value?.id === id) {
        current.value = updated
      }

      return updated
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // DELETE
  // =========================

  const remove = async (id: string) => {
    try {
      loading.value = true

      clearError()

      await service.remove(id)

      items.value = items.value.filter((i) => i.id !== id)

      if (current.value?.id === id) {
        current.value = null
      }
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    items,
    current,
    loading,
    error,

    // computed
    activeItems,
    textAttributes,
    numericAttributes,
    booleanAttributes,

    // helpers
    clearError,

    // actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove
  }
})
