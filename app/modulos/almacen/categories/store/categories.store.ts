import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useCategoriesService } from '~/modulos/almacen/categories/service/categories.service'

import {
  buildCategoryTree,
  flattenCategoryTree
} from '~/modulos/almacen/categories/utils/categories-tree'

import type {
  Category,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput
} from '~/modulos/almacen/categories/types/categories.types'

export const useCategoriesStore = defineStore('categories', () => {
  const service = useCategoriesService()

  const items = ref<Category[]>([])
  const tree = ref<CategoryTreeNode[]>([])
  const current = ref<Category | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const rootCategories = computed(() => items.value.filter((i) => !i.parent_id))

  const flattenedTree = computed(() => flattenCategoryTree(tree.value))

  const localTree = computed(() => buildCategoryTree(items.value))

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
  // LOAD TREE
  // =========================

  const fetchTree = async () => {
    try {
      loading.value = true

      clearError()

      tree.value = await service.findTree()

      return tree.value
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

  const create = async (payload: CreateCategoryInput) => {
    try {
      loading.value = true

      clearError()

      const created = await service.create(payload)

      items.value.push(created)

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

  const update = async (id: string, payload: UpdateCategoryInput) => {
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
  // REORDER (Drag & Drop)
  // =========================

  const reorderCategory = async (payload: {
    id: string
    newParentId: string | null
    newIndex: number
  }) => {
    try {
      loading.value = true
      clearError()

      // Llama a tu API para persistir el cambio
      await service.reorder(payload.id, {
        parent_id: payload.newParentId,
        sort_order: payload.newIndex
      })

      // Refrescar el árbol desde el backend para tener el estado real
      await fetchTree()
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
    tree,
    current,
    loading,
    error,

    // computed
    activeItems,
    rootCategories,
    flattenedTree,
    localTree,

    // helpers
    clearError,

    // actions
    fetchAll,
    fetchTree,
    fetchOne,
    create,
    update,
    reorderCategory,
    remove
  }
})
