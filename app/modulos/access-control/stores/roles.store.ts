import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRolesService } from '~/modulos/access-control/services/roles.service'
import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  EffectivePermissions
} from '~/modulos/access-control/types/roles.types'

export const useRolesStore = defineStore('roles', () => {
  const service = useRolesService()

  // =========================
  // STATE
  // =========================

  const items = ref<Role[]>([])
  const current = ref<Role | null>(null)
  const myPermissions = ref<EffectivePermissions | null>(null)
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
      error.value = err?.data?.message || 'Error al cargar roles'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // FIND ONE
  // =========================

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.findOne(id)
      current.value = data
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar rol'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateRoleDto) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(payload)
      items.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear rol'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateRoleDto) => {
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
      error.value = err?.data?.message || 'Error al actualizar rol'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATE PERMISSIONS
  // =========================

  const updatePermissions = async (id: string, permissions: string[]) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.updatePermissions(id, permissions)

      const index = items.value.findIndex((i) => i.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }

      if (current.value?.id === id) {
        current.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar permisos'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // DELETE
  // =========================

  const remove = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await service.remove(id)

      items.value = items.value.filter((i) => i.id !== id)

      if (current.value?.id === id) {
        current.value = null
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar rol'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // USER ROLES
  // =========================

  const fetchUserRoles = async (userId: string) => {
    try {
      loading.value = true
      error.value = null
      return await service.getUserRoles(userId)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar roles del usuario'
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignRoles = async (userId: string, roleIds: string[]) => {
    try {
      loading.value = true
      error.value = null
      await service.assignRoles(userId, roleIds)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al asignar roles'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // MY PERMISSIONS
  // =========================

  const fetchMyPermissions = async () => {
    try {
      loading.value = true
      error.value = null
      myPermissions.value = await service.getMyPermissions()
      return myPermissions.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar mis permisos'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    current,
    myPermissions,
    loading,
    error,
    fetchAll,
    fetchOne,
    create,
    update,
    updatePermissions,
    remove,
    fetchUserRoles,
    assignRoles,
    fetchMyPermissions
  }
})
