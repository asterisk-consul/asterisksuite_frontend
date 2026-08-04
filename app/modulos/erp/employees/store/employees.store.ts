import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useEmployeesService } from '~/modulos/erp/employees/service/employees.service'
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '~/modulos/erp/employees/types/employees.types'

export const useEmployeesStore = defineStore('employees', () => {
  const service = useEmployeesService()

  const items = ref<Employee[]>([])
  const current = ref<Employee | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAll = async () => {
    try {
      loading.value = true
      error.value = null
      items.value = await service.findAll()
      return items.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar empleados'
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
      error.value = err?.data?.message || 'Error al cargar empleado'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateEmployeeInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(payload)
      items.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear empleado'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdateEmployeeInput) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.update(id, payload)
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) items.value[index] = updated
      if (current.value?.id === id) current.value = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar empleado'
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
      error.value = err?.data?.message || 'Error al eliminar empleado'
      throw err
    } finally {
      loading.value = false
    }
  }

  const linkUser = async (id: string, userId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.linkUser(id, userId)
      // Reload to get updated user info
      await fetchAll()
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al vincular usuario'
      throw err
    } finally {
      loading.value = false
    }
  }

  const unlinkUser = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await service.unlinkUser(id)
      // Reload to get updated user info
      await fetchAll()
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al desvincular usuario'
      throw err
    } finally {
      loading.value = false
    }
  }

  return { items, current, loading, error, fetchAll, fetchOne, create, update, remove, linkUser, unlinkUser }
})
