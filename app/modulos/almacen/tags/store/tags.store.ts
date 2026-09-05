import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useTagsService } from '~/modulos/almacen/tags/service/tags.service'

import type {
  Tag,
  CreateTagInput,
  UpdateTagInput
} from '~/modulos/almacen/tags/types/tags.types'

export const useTagsStore = defineStore('tags', () => {
  const service = useTagsService()

  const items = ref<Tag[]>([])
  const current = ref<Tag | null>(null)

  const loading = ref(false)

  const error = ref<string | null>(null)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
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

  const create = async (payload: CreateTagInput) => {
    try {
      loading.value = true

      clearError()

      const created = await service.create(payload)

      items.value.push(created)

      items.value.sort((a, b) => a.name.localeCompare(b.name))

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

  const update = async (id: string, payload: UpdateTagInput) => {
    try {
      loading.value = true

      clearError()

      const updated = await service.update(id, payload)

      const index = items.value.findIndex((i) => i.id === id)

      if (index !== -1) {
        items.value[index] = updated
      }

      items.value.sort((a, b) => a.name.localeCompare(b.name))

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
