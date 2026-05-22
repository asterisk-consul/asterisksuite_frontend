import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useAttributesService } from '~/modulos/almacen/attributes/service/attributes.service'

import type {
  Attribute,
  CreateAttributeInput,
  UpdateAttributeInput,
  AttributeType
} from '~/modulos/almacen/attributes/types/attributes.types'

export const useAttributesStore = defineStore(
  'attributes',
  () => {
    const service = useAttributesService()

    const items = ref<Attribute[]>([])
    const current = ref<Attribute | null>(null)

    const loading = ref(false)

    // =========================
    // COMPUTEDS
    // =========================

    const activeItems = computed(() =>
      items.value.filter((i) => i.active !== false)
    )

    const textAttributes = computed(() =>
      items.value.filter(
        (i) => i.type === 'TEXT'
      )
    )

    const numericAttributes = computed(() =>
      items.value.filter(
        (i) => i.type === 'NUMBER'
      )
    )

    const booleanAttributes = computed(() =>
      items.value.filter(
        (i) => i.type === 'BOOLEAN'
      )
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
      payload: CreateAttributeInput
    ) => {
      const created = await service.create(payload)

      items.value.unshift(created)

      return created
    }

    // =========================
    // UPDATE
    // =========================

    const update = async (
      id: string,
      payload: UpdateAttributeInput
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
      current,
      loading,

      // computed
      activeItems,
      textAttributes,
      numericAttributes,
      booleanAttributes,

      // actions
      fetchAll,
      fetchOne,
      create,
      update,
      remove
    }
  }
)
