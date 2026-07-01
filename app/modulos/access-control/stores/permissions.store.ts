import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePermissionsService } from '~/modulos/access-control/services/permissions.service'
import type { Permission } from '~/modulos/access-control/types/roles.types'

export const usePermissionsStore = defineStore('permissions', () => {
  const service = usePermissionsService()

  // =========================
  // STATE
  // =========================

  const items = ref<Permission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // FIND ALL
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true
      error.value = null
      items.value = await service.findAll()
      return items.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar permisos'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // FIND BY CODE
  // =========================

  const findByCode = async (code: string) => {
    try {
      loading.value = true
      error.value = null
      return await service.findByCode(code)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al buscar permiso'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    fetchAll,
    findByCode
  }
})
