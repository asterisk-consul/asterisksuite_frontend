import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useTagsService } from '~/modulos/almacen/tags/service/tags.service'

import type {
  Tag,
  CreateTagInput,
  UpdateTagInput
} from '~/modulos/almacen/tags/types/tags.types'

export const useTagsStore = defineStore(
  'tags',
  () => {
    const service = useTagsService()

    const items = ref<Tag[]>([])
    const current = ref<Tag | null>(null)

    const loading = ref(false)

    // =========================
    // COMPUTEDS
    // =========================

    const activeItems = computed(() =>
      items.value.filter((i) => i.active !== false)
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
      payload: CreateTagInput
    ) => {
      const created = await service.create(
        payload
      )

      items.value.push(created)

      items.value.sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      return created
    }

    // =========================
    // UPDATE
    // =========================

    const update = async (
      id: string,
      payload: UpdateTagInput
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

      items.value.sort((a, b) =>
        a.name.localeCompare(b.name)
      )

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
      current,
      loading,

      // computed
      activeItems,

      // actions
      fetchAll,
      fetchOne,
      create,
      update,
      remove
    }
  }
)
