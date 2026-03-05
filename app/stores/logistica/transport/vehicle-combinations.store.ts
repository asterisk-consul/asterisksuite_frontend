import { defineStore } from 'pinia'
import { useVehicleCombinationsService } from '~/services/logistica/transport/vehicles-combnations.service'
import type {
  VehicleCombination,
  CreateVehicleCombinationInput,
  UpdateVehicleCombinationInput
} from '~/types/logistica/transport/vehicles-combinations'

export const useVehicleCombinationsStore = defineStore(
  'vehicleCombinations',
  () => {
    // ================= STATE =================
    const items = ref<VehicleCombination[]>([])
    const current = ref<VehicleCombination | null>(null)

    const loading = ref(false)
    const error = ref<string | null>(null)

    const service = useVehicleCombinationsService()

    // ================= GETTERS =================

    const activeCombinations = computed(() =>
      items.value.filter((c) => !c.valid_until)
    )

    const getById = (id: string) =>
      computed(() => items.value.find((c) => c.id === id) ?? null)

    const activeByTractor = (tractorId: string) =>
      computed(
        () =>
          items.value.find(
            (c) => c.tractor_id === tractorId && !c.valid_until
          ) ?? null
      )

    // ================= ACTIONS =================

    const fetchAll = async (companyId: string) => {
      loading.value = true
      error.value = null

      try {
        items.value = await service.getAll(companyId)
      } catch (err: any) {
        error.value = err?.data?.message || err.message
      } finally {
        loading.value = false
      }
    }

    const fetchOne = async (id: string) => {
      loading.value = true
      error.value = null

      try {
        const combo = await service.getOne(id)
        current.value = combo

        const index = items.value.findIndex((c) => c.id === id)
        if (index !== -1) {
          items.value[index] = combo
        }

        return combo
      } catch (err: any) {
        error.value = err?.data?.message || err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    const create = async (payload: CreateVehicleCombinationInput) => {
      loading.value = true
      error.value = null

      try {
        const created = await service.create(payload)
        items.value.unshift(created)
        return created
      } catch (err: any) {
        error.value = err?.data?.message || err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    const update = async (
      id: string,
      payload: UpdateVehicleCombinationInput
    ) => {
      loading.value = true
      error.value = null

      try {
        const updated = await service.update(id, payload)

        const index = items.value.findIndex((c) => c.id === id)
        if (index !== -1) {
          items.value[index] = updated
        }

        if (current.value?.id === id) {
          current.value = updated
        }

        return updated
      } catch (err: any) {
        error.value = err?.data?.message || err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    const close = async (id: string) => {
      loading.value = true
      error.value = null

      try {
        const closed = await service.close(id)

        const combo = items.value.find((c) => c.id === id)
        if (combo) {
          combo.valid_until = closed.valid_until
        }

        if (current.value?.id === id) {
          current.value.valid_until = closed.valid_until
        }

        return closed
      } catch (err: any) {
        error.value = err?.data?.message || err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    const clearError = () => {
      error.value = null
    }

    return {
      // state
      items,
      current,
      loading,
      error,

      // getters
      activeCombinations,
      getById,
      activeByTractor,

      // actions
      fetchAll,
      fetchOne,
      create,
      update,
      close,
      clearError
    }
  }
)
