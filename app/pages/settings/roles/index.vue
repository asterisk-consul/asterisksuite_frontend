<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const toast = useToast()
const router = useRouter()
const { isOwnerOrAdmin } = useCompanyRole()
const { roles, loading: rolesLoading, init: initRoles, create, update, remove } = useRoles()

const search = ref('')

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

const roleName = ref('')
const roleCode = ref('')
const roleDescription = ref('')
const editingRole = ref<any>(null)
const deletingRole = ref<any>(null)
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

const openPermissions = (role: any) => {
  router.push(`/settings/roles/${role.id}/permissions`)
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
  await initRoles()
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
