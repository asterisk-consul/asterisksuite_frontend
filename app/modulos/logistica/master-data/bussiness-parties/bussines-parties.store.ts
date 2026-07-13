import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import type {
  BusinessParty,
  CreateBusinessPartyInput,
  UpdateBusinessPartyInput
} from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

export const useBusinessPartiesStore = defineStore('businessParties', () => {
  const service = useBusinessPartiesService()

  const items = ref<BusinessParty[]>([])
  const current = ref<BusinessParty | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errors = ref<Record<string, string>>({})

  const currentCompanyId = ref<string | null>(null)

  // =========================
  // COMPUTEDS
  // =========================
  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const clients = computed(() => items.value.filter((i) => i.type === 'CUSTOMER'))

  const suppliers = computed(() =>
    items.value.filter((i) => i.type === 'SUPPLIER')
  )

  // =========================
  // LOAD ALL
  // =========================
  const fetchAll = async () => {
    try {
      loading.value = true
      items.value = await service.findAll()
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
  const create = async (payload: CreateBusinessPartyInput) => {
    try {
      loading.value = true

      error.value = null
      errors.value = {}

      const created = await service.create(payload)

      return created
    } catch (err: any) {
      errors.value = err?.data?.data?.errors || err?.data?.errors || {}

      error.value =
        err?.data?.data?.message ||
        err?.data?.message ||
        err?.response?.data.message ||
        'Error parte interesada'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATEW
  // =========================
  const update = async (id: string, payload: UpdateBusinessPartyInput) => {
    try {
      loading.value = true
      error.value = null
      errors.value = {}

      const updated = await service.update(id, payload)

      const index = items.value.findIndex((i) => i.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }

      if (current.value?.id === id) {
        current.value = updated
      }

      return updated
    } catch (err: any) {
      errors.value = err?.data?.data?.errors || err?.data?.errors || {}

      error.value =
        err?.data?.data?.message ||
        err?.data?.message ||
        err?.response?.data?.message ||
        'Error al actualizar'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // DELETE
  // =========================
  const remove = async (id: string) => {
    await service.remove(id)

    items.value = items.value.filter((i) => i.id !== id)

    if (current.value?.id === id) {
      current.value = null
    }
  }

  return {
    // state
    items,
    current,
    loading,
    error,
    errors,

    // computed
    activeItems,
    clients,
    suppliers,

    // actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove
  }
})
