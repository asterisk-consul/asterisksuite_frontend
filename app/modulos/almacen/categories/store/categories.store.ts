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

export const useCategoriesStore = defineStore(
  'categories',
  () => {
    const service = useCategoriesService()

    const items = ref<Category[]>([])
    const tree = ref<CategoryTreeNode[]>([])

    const current = ref<Category | null>(null)

    const loading = ref(false)

    // =========================
    // COMPUTEDS
    // =========================

    const activeItems = computed(() =>
      items.value.filter((i) => i.active !== false)
    )

    const rootCategories = computed(() =>
      items.value.filter((i) => !i.parent_id)
    )

    const flattenedTree = computed(() =>
      flattenCategoryTree(tree.value)
    )

    const localTree = computed(() =>
      buildCategoryTree(items.value)
    )

    // =========================
    // LOAD ALL
    // =========================

    const fetchAll = async () => {
      try {
        loading.value = true

        items.value = await service.findAll()

        return items.value
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

        tree.value = await service.findTree()

        return tree.value
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

        const data = await service.findOne(id)

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
      payload: CreateCategoryInput
    ) => {
      const created = await service.create(
        payload
      )

      items.value.push(created)

      return created
    }

    // =========================
    // UPDATE
    // =========================

    const update = async (
      id: string,
      payload: UpdateCategoryInput
    ) => {
      const updated = await service.update(
        id,
        payload
      )

      const index = items.value.findIndex(
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

    const remove = async (id: string) => {
      await service.remove(id)

      items.value = items.value.filter(
        (i) => i.id !== id
      )

      if (current.value?.id === id) {
        current.value = null
      }
    }

    return {
      // state
      items,
      tree,
      current,
      loading,

      // computed
      activeItems,
      rootCategories,
      flattenedTree,
      localTree,

      // actions
      fetchAll,
      fetchTree,
      fetchOne,
      create,
      update,
      remove
    }
  }
)
