<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const toast = useToast()
const { isOwnerOrAdmin } = useCompanyRole()
const { items: roles, init: initRoles, assignRoles, getUserRoles } = useRoles()

interface CompanyUser {
  id: string
  name: string
  email: string
}

interface UserRole {
  id: string
  user_id: string
  role_id: string
  role: { id: string; name: string; code: string }
}

const users = ref<CompanyUser[]>([])
const loading = ref(false)
const search = ref('')

const selectedUser = ref<CompanyUser | null>(null)
const showAssignModal = ref(false)
const userRoles = ref<UserRole[]>([])
const selectedRoleIds = ref<string[]>([])
const savingRoles = ref(false)

const loadUsers = async () => {
  loading.value = true
  try {
    users.value = await $fetch<CompanyUser[]>('/api/access-control/users/all')
  } catch (e) {
    toast.add({ title: 'Error al cargar usuarios', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loading.value = false
  }
}

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return users.value
  return users.value.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
})

const openAssignModal = async (user: CompanyUser) => {
  selectedUser.value = user
  showAssignModal.value = true

  try {
    const roles = await getUserRoles(user.id)
    userRoles.value = roles as any
    selectedRoleIds.value = (roles as any).map((r: any) => r.role_id)
  } catch {
    userRoles.value = []
    selectedRoleIds.value = []
  }
}

const toggleRole = (roleId: string) => {
  const idx = selectedRoleIds.value.indexOf(roleId)
  if (idx === -1) {
    selectedRoleIds.value.push(roleId)
  } else {
    selectedRoleIds.value.splice(idx, 1)
  }
}

const saveRoles = async () => {
  if (!selectedUser.value) return
  savingRoles.value = true
  try {
    await assignRoles(selectedUser.value.id, selectedRoleIds.value)
    toast.add({ title: 'Roles actualizados', color: 'success' })
    showAssignModal.value = false
    selectedUser.value = null
  } catch (e: any) {
    toast.add({
      title: 'Error al guardar roles',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    savingRoles.value = false
  }
}

const getUserRoleNames = async (userId: string) => {
  try {
    const roles = await getUserRoles(userId)
    return (roles as any).map((r: any) => r.role?.name).filter(Boolean)
  } catch {
    return []
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), initRoles()])
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Usuarios" description="Gestionar usuarios de la empresa y asignarles roles" />

    <UAlert
      v-if="!isOwnerOrAdmin"
      color="warning"
      icon="i-lucide-shield-alert"
      title="Sin permisos"
      description="Solo los usuarios con rol OWNER o ADMIN pueden gestionar usuarios y asignar roles."
    />

    <UPageCard variant="subtle" :ui="{ container: 'p-0 sm:p-0 gap-y-0', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <div class="flex items-center gap-3 py-4">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar por nombre o email..." class="flex-1" />
          <UButton label="Actualizar" variant="ghost" icon="i-lucide-refresh-cw" @click="loadUsers" />
        </div>
      </template>

      <div v-if="loading" class="flex justify-center py-8">
        <ULoader />
      </div>

      <div v-else-if="filteredUsers.length === 0" class="py-8 text-center text-sm text-muted">
        No se encontraron usuarios
      </div>

      <div v-else>
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="flex items-center gap-4 p-4 border-b border-default last:border-b-0 hover:bg-muted/50"
        >
          <UAvatar :alt="user.name || user.email" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ user.name || user.email }}</p>
            <p class="text-xs text-muted truncate">{{ user.email }}</p>
          </div>
          <UButton
            v-if="isOwnerOrAdmin"
            label="Asignar roles"
            variant="outline"
            size="xs"
            icon="i-lucide-shield"
            @click="openAssignModal(user)"
          />
        </div>
      </div>
    </UPageCard>

    <UModal v-model:open="showAssignModal" title="Asignar roles" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <div v-if="selectedUser" class="space-y-4">
          <p class="text-sm text-muted">
            Selecciona los roles para
            <strong>{{ selectedUser.name || selectedUser.email }}</strong>
          </p>

          <div v-if="roles.length === 0" class="text-sm text-muted py-4 text-center">
            No hay roles creados. Creá uno desde
            <NuxtLink to="/settings/roles" class="text-primary underline">Gestión de roles</NuxtLink>
            .
          </div>

          <div v-else class="space-y-2">
            <label
              v-for="role in roles"
              :key="role.value"
              class="flex items-center gap-3 p-3 rounded border border-default cursor-pointer hover:bg-muted/50"
              :class="{ 'border-primary bg-primary/5': selectedRoleIds.includes(role.value) }"
            >
              <UCheckbox
                :model-value="selectedRoleIds.includes(role.value)"
                @update:model-value="toggleRole(role.value)"
              />
              <span class="text-sm font-medium">{{ role.label }}</span>
            </label>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showAssignModal = false" />
          <UButton label="Guardar" :loading="savingRoles" :disabled="roles.length === 0" @click="saveRoles" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
