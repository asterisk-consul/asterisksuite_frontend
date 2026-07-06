import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCompaniesService } from '~/modulos/companies/service/company.service'
import type {
  Company,
  CompanyUser,
  CreateCompanyInput,
  UpdateCompanyInput
} from '~/modulos/companies/types/company.types'

export const useCompaniesStore = defineStore('companies', () => {
  const service = useCompaniesService()

  // =========================
  // STATE
  // =========================

  const items = ref<Company[]>([])
  const current = ref<Company | null>(null)
  const users = ref<CompanyUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // COMPANY CRUD
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true
      error.value = null
      items.value = await service.findAll()
      return items.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar companies'
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
      error.value = err?.data?.message || 'Error al cargar company'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateCompanyInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(payload)
      items.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear company'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdateCompanyInput) => {
    try {
      loading.value = true
      error.value = null
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
      error.value = err?.data?.message || 'Error al actualizar company'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deactivate = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await service.deactivate(id)

      items.value = items.value.filter((i) => i.id !== id)

      if (current.value?.id === id) {
        current.value = null
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al desactivar company'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // COMPANY USERS
  // =========================

  const fetchUsers = async (companyId: string) => {
    try {
      loading.value = true
      error.value = null
      users.value = await service.listUsers(companyId)
      return users.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar usuarios'
      throw err
    } finally {
      loading.value = false
    }
  }

  const addUser = async (companyId: string, email: string, role: string) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.addUser(companyId, email, role)
      users.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al agregar usuario'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createUser = async (companyId: string, data: { name: string; email: string; password: string; role: string }) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.createUser(companyId, data)
      users.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear usuario'
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeUser = async (companyId: string, userId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.removeUser(companyId, userId)
      users.value = users.value.filter((u) => u.user_id !== userId)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar usuario'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    current,
    users,
    loading,
    error,
    fetchAll,
    fetchOne,
    create,
    update,
    deactivate,
    fetchUsers,
    addUser,
    createUser,
    removeUser
  }
})
