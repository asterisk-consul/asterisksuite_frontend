<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { usePermissions } from '~/modulos/access-control/composables/usePermissions'
import { useCompanyRole } from '~/composables/useCompanyRole'

const toast = useToast()
const { isOwnerOrAdmin } = useCompanyRole()
const {
  roles,
  loading: rolesLoading,
  init: initRoles,
  create,
  update,
  remove,
  updatePermissions: updateRolePermissions
} = useRoles()

const { permissions, groupedByModule, init: initPermissions } = usePermissions()

const search = ref('')

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showPermissionsModal = ref(false)
const showDeleteModal = ref(false)

const collapsedModules = ref<Set<string>>(new Set())

const roleName = ref('')
const roleCode = ref('')
const roleDescription = ref('')
const editingRole = ref<any>(null)
const deletingRole = ref<any>(null)
const permissionsRole = ref<any>(null)
const selectedPermissionCodes = ref<string[]>([])
const saving = ref(false)

const filteredRoles = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return roles.value
  return roles.value.filter((r: any) => r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q))
})

const openCreate = () => {
  roleName.value = ''
  roleCode.value = ''
  roleDescription.value = ''
  showCreateModal.value = true
}

const handleCreate = async () => {
  if (!roleName.value.trim() || !roleCode.value.trim()) {
    toast.add({ title: 'Nombre y código son obligatorios', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  saving.value = true
  try {
    await create({
      name: roleName.value.trim(),
      code: roleCode.value.trim(),
      description: roleDescription.value.trim()
    })
    toast.add({ title: 'Rol creado', color: 'success' })
    showCreateModal.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al crear rol',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

const openEdit = (role: any) => {
  editingRole.value = role
  roleName.value = role.name
  roleCode.value = role.code
  roleDescription.value = role.description || ''
  showEditModal.value = true
}

const handleEdit = async () => {
  if (!roleName.value.trim()) {
    toast.add({ title: 'El nombre es obligatorio', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  saving.value = true
  try {
    await update(editingRole.value.id, {
      name: roleName.value.trim(),
      code: roleCode.value.trim(),
      description: roleDescription.value.trim()
    })
    toast.add({ title: 'Rol actualizado', color: 'success' })
    showEditModal.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al actualizar rol',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

const openPermissions = async (role: any) => {
  permissionsRole.value = role
  showPermissionsModal.value = true
  collapsedModules.value = new Set()

  try {
    const data = await $fetch<any>(`/api/access-control/roles/${role.id}`)
    selectedPermissionCodes.value = (data.permissions || []).map((p: any) => p.permission?.code).filter(Boolean)
  } catch {
    selectedPermissionCodes.value = []
  }
}

const toggleModuleCollapse = (moduleLabel: string) => {
  if (collapsedModules.value.has(moduleLabel)) {
    collapsedModules.value.delete(moduleLabel)
  } else {
    collapsedModules.value.add(moduleLabel)
  }
}

const togglePermission = (code: string) => {
  const idx = selectedPermissionCodes.value.indexOf(code)
  if (idx === -1) {
    selectedPermissionCodes.value.push(code)
  } else {
    selectedPermissionCodes.value.splice(idx, 1)
  }
}

const toggleModule = (modulePerms: any[]) => {
  const codes = modulePerms.map((p) => p.code)
  const allSelected = codes.every((c) => selectedPermissionCodes.value.includes(c))
  if (allSelected) {
    selectedPermissionCodes.value = selectedPermissionCodes.value.filter((c) => !codes.includes(c))
  } else {
    for (const c of codes) {
      if (!selectedPermissionCodes.value.includes(c)) {
        selectedPermissionCodes.value.push(c)
      }
    }
  }
}

const savePermissions = async () => {
  if (!permissionsRole.value) return
  saving.value = true
  try {
    await updateRolePermissions(permissionsRole.value.id, selectedPermissionCodes.value)
    toast.add({ title: 'Permisos actualizados', color: 'success' })
    showPermissionsModal.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al guardar permisos',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (role: any) => {
  deletingRole.value = role
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!deletingRole.value) return
  saving.value = true
  try {
    await remove(deletingRole.value.id)
    toast.add({ title: 'Rol eliminado', color: 'success' })
    showDeleteModal.value = false
    deletingRole.value = null
  } catch (e: any) {
    toast.add({
      title: 'Error al eliminar rol',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([initRoles(), initPermissions()])
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Roles y permisos" description="Gestionar roles de negocio y los permisos asociados" />

    <UAlert
      v-if="!isOwnerOrAdmin"
      color="warning"
      icon="i-lucide-shield-alert"
      title="Sin permisos"
      description="Solo los usuarios con rol OWNER o ADMIN pueden gestionar roles y permisos."
    />

    <div class="flex items-center gap-3 py-4">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar rol..." class="flex-1 max-w-sm" />
      <UButton v-if="isOwnerOrAdmin" label="Nuevo rol" icon="i-lucide-plus" @click="openCreate" />
    </div>

    <div v-if="rolesLoading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <div v-else-if="filteredRoles.length === 0" class="py-8 text-center text-sm text-muted">No hay roles creados</div>

    <div v-else class="space-y-2">
      <div
        v-for="role in filteredRoles"
        :key="role.id"
        class="flex items-center gap-4 p-4 rounded-lg border border-default hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium">{{ role.name }}</p>
          <p class="text-xs text-muted">{{ role.code }}</p>
          <p v-if="role.description" class="text-xs text-muted mt-1">{{ role.description }}</p>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            v-if="isOwnerOrAdmin"
            icon="i-lucide-key-round"
            variant="ghost"
            size="xs"
            title="Permisos"
            class="cursor-pointer"
            @click="openPermissions(role)"
          />
          <UButton
            v-if="isOwnerOrAdmin"
            icon="i-lucide-pencil"
            variant="ghost"
            size="xs"
            title="Editar"
            class="cursor-pointer"
            @click="openEdit(role)"
          />
          <UButton
            v-if="isOwnerOrAdmin && !role.is_system"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            title="Eliminar"
            class="cursor-pointer"
            @click="confirmDelete(role)"
          />
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal" title="Nuevo rol">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nombre" required>
            <UInput v-model="roleName" placeholder="Ej: Administrador" />
          </UFormField>
          <UFormField label="Código" required>
            <UInput v-model="roleCode" placeholder="Ej: admin" />
          </UFormField>
          <UFormField label="Descripción">
            <UInput v-model="roleDescription" placeholder="Descripción del rol..." />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showCreateModal = false" />
          <UButton label="Crear" :loading="saving" @click="handleCreate" />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal" title="Editar rol">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nombre" required>
            <UInput v-model="roleName" />
          </UFormField>
          <UFormField label="Código">
            <UInput v-model="roleCode" :disabled="editingRole?.is_system" />
          </UFormField>
          <UFormField label="Descripción">
            <UInput v-model="roleDescription" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showEditModal = false" />
          <UButton label="Guardar" :loading="saving" @click="handleEdit" />
        </div>
      </template>
    </UModal>

    <!-- Permissions Modal -->
    <UModal v-model:open="showPermissionsModal" title="Permisos del rol" :ui="{ width: 'max-w-2xl' }">
      <template #body>
        <div v-if="permissionsRole" class="space-y-4">
          <p class="text-sm text-muted">
            Permisos asignados a
            <strong>{{ permissionsRole.name }}</strong>
          </p>

          <div v-if="permissions.length === 0" class="text-sm text-muted py-4 text-center">
            No hay permisos disponibles
          </div>

          <div v-else class="space-y-2 max-h-128 overflow-y-auto pr-1">
            <div
              v-for="group in groupedByModule"
              :key="group.label"
              class="border border-default rounded-lg overflow-hidden"
            >
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-muted/50 transition-colors"
                @click="toggleModuleCollapse(group.label)"
              >
                <UCheckbox
                  :model-value="group.permissions.every((p: any) => selectedPermissionCodes.includes(p.code))"
                  :indeterminate="
                    group.permissions.some((p: any) => selectedPermissionCodes.includes(p.code)) &&
                    !group.permissions.every((p: any) => selectedPermissionCodes.includes(p.code))
                  "
                  @update:model-value="toggleModule(group.permissions)"
                  @click.stop
                />
                <UIcon :name="group.icon" class="size-4 text-muted" />
                <span class="text-xs font-semibold uppercase text-muted flex-1 text-left">{{ group.label }}</span>
                <UBadge
                  :label="`${group.permissions.filter((p: any) => selectedPermissionCodes.includes(p.code)).length}/${group.permissions.length}`"
                  variant="soft"
                  size="xs"
                  color="neutral"
                />
                <UIcon
                  :name="collapsedModules.has(group.label) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                  class="size-4 text-muted transition-transform"
                />
              </button>

              <div v-if="!collapsedModules.has(group.label)" class="border-t border-default px-3 py-2">
                <div class="grid grid-cols-2 gap-1">
                  <label
                    v-for="perm in group.permissions"
                    :key="perm.code"
                    class="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                  >
                    <UCheckbox
                      :model-value="selectedPermissionCodes.includes(perm.code)"
                      @update:model-value="togglePermission(perm.code)"
                    />
                    <span class="truncate" :title="perm.description || perm.code">
                      {{ perm.description || perm.code }}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showPermissionsModal = false" />
          <UButton label="Guardar permisos" :loading="saving" @click="savePermissions" />
        </div>
      </template>
    </UModal>

    <!-- Delete Modal -->
    <UModal v-model:open="showDeleteModal" title="Eliminar rol">
      <template #body>
        <p class="text-sm">
          ¿Seguro que querés eliminar el rol
          <strong>{{ deletingRole?.name }}</strong>
          ? Esta acción no se puede deshacer.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showDeleteModal = false" />
          <UButton label="Eliminar" color="error" :loading="saving" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
