import { defineStore } from 'pinia'

import { computed, ref } from 'vue'

import { useUnitsService } from '~/modulos/almacen/units/service/units.service'

import type {
  Unit,
  CreateUnitInput,
  UpdateUnitInput
} from '~/modulos/almacen/units/types/units.types'

export const useUnitsStore = defineStore('units', () => {
  const service = useUnitsService()

  // =========================
  // STATE
  // =========================

  const items = ref<Unit[]>([])

  const current = ref<Unit | null>(null)

  const loading = ref(false)

  const error = ref<string | null>(null)

  // =========================
  // HELPERS
  // =========================

  const clearError = () => {
    error.value = null
  }

  const parseError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message
    }

    return 'Ocurrió un error inesperado'
  }

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const weightUnits = computed(() =>
    items.value.filter((i) => i.unit_type === 'WEIGHT')
  )

  const lengthUnits = computed(() =>
    items.value.filter((i) => i.unit_type === 'LENGTH')
  )

  const volumeUnits = computed(() =>
    items.value.filter((i) => i.unit_type === 'VOLUME')
  )

  const quantityUnits = computed(() =>
    items.value.filter((i) => i.unit_type === 'UNIT')
  )

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async () => {
    try {
      clearError()

      loading.value = true

      items.value = await service.findAll()

      return items.value
    } catch (err) {
      error.value = parseError(err)

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOAD ONE
  // =========================

  const fetchOne = async (id: string) => {
    try {
      clearError()

      loading.value = true

      const data = await service.findOne(id)

      current.value = data

      return data
    } catch (err) {
      error.value = parseError(err)

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateUnitInput) => {
    try {
      clearError()

      const created = await service.create(payload)
      items.value.push(created)

      items.value.sort((a, b) => a.name.localeCompare(b.name))

      return created
    } catch (err) {
      error.value = parseError(err)

      console.error('CREATE UNIT ERROR', err)

      throw err
    }
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateUnitInput) => {
    try {
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
      error.value = parseError(err)

      console.error('UPDATE UNIT ERROR', err)

      throw err
    }
  }

  // =========================
  // DELETE
  // =========================

  const remove = async (id: string) => {
    try {
      clearError()

      await service.remove(id)

      items.value = items.value.filter((i) => i.id !== id)

      if (current.value?.id === id) {
        current.value = null
      }
    } catch (err) {
      error.value = parseError(err)

      console.error('DELETE UNIT ERROR', err)

      throw err
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
    weightUnits,
    lengthUnits,
    volumeUnits,
    quantityUnits,

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
