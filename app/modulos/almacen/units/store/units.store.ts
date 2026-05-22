import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useUnitsService } from '~/modulos/almacen/units/service/units.service'

import type {
  Unit,
  UnitType,
  CreateUnitInput,
  UpdateUnitInput
} from '~/modulos/almacen/units/types/units.types'

export const useUnitsStore = defineStore(
  'units',
  () => {
    const service = useUnitsService()

    const items = ref<Unit[]>([])
    const current = ref<Unit | null>(null)

    const loading = ref(false)

    // =========================
    // COMPUTEDS
    // =========================

    const activeItems = computed(() =>
      items.value.filter((i) => i.active !== false)
    )

    const weightUnits = computed(() =>
      items.value.filter(
        (i) => i.unit_type === 'WEIGHT'
      )
    )

    const lengthUnits = computed(() =>
      items.value.filter(
        (i) => i.unit_type === 'LENGTH'
      )
    )

    const volumeUnits = computed(() =>
      items.value.filter(
        (i) => i.unit_type === 'VOLUME'
      )
    )

    const quantityUnits = computed(() =>
      items.value.filter(
        (i) => i.unit_type === 'QUANTITY'
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
      payload: CreateUnitInput
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
      payload: UpdateUnitInput
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
      weightUnits,
      lengthUnits,
      volumeUnits,
      quantityUnits,

      // actions
      fetchAll,
      fetchOne,
      create,
      update,
      remove
    }
  }
)
