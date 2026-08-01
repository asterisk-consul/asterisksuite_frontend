import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePartnersService } from '~/modulos/erp/partners/service/partners.service'
import type { Partner, CreatePartnerInput, UpdatePartnerInput } from '~/modulos/erp/partners/types/partners.types'

export const usePartnersStore = defineStore('partners', () => {
  const service = usePartnersService()

  const items = ref<Partner[]>([])
  const current = ref<Partner | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAll = async () => {
    try {
      loading.value = true
      error.value = null
      items.value = await service.findAll()
      return items.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar socios'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.findOne(id)
      current.value = data
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar socio'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreatePartnerInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(payload)
      items.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear socio'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdatePartnerInput) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.update(id, payload)
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) items.value[index] = updated
      if (current.value?.id === id) current.value = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar socio'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await service.remove(id)
      items.value = items.value.filter(i => i.id !== id)
      if (current.value?.id === id) current.value = null
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar socio'
      throw err
    } finally {
      loading.value = false
    }
  }

  return { items, current, loading, error, fetchAll, fetchOne, create, update, remove }
})
