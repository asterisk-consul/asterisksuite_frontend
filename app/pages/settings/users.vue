<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useEmployeesService } from '~/modulos/erp/employees/service/employees.service'
import { usePartnersService } from '~/modulos/erp/partners/service/partners.service'
import type { Employee } from '~/modulos/erp/employees/types/employees.types'
import type { Partner } from '~/modulos/erp/partners/types/partners.types'

const router = useRouter()
const toast = useToast()
const { isOwnerOrAdmin } = useCompanyRole()
const { items: roles, init: initRoles, assignRoles, getUserRoles } = useRoles()
const employeesService = useEmployeesService()
const partnersService = usePartnersService()

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

// Create user modal
const showCreateModal = ref(false)
const creating = ref(false)
const newUser = ref({
  name: '',
  email: '',
  password: '',
  linkType: 'none' as 'none' | 'existing_employee' | 'existing_partner' | 'new_employee' | 'new_partner',
})
const selectedEmployeeId = ref('')
const selectedPartnerId = ref('')

const employees = ref<Employee[]>([])
const partners = ref<Partner[]>([])

// Edit user modal
const showEditModal = ref(false)
const editing = ref(false)
const editUser = ref({ name: '', email: '' })

// Password modal
const showPasswordModal = ref(false)
const changingPassword = ref(false)
const newPassword = ref('')

// Link employee/partner modal
const showLinkModal = ref(false)
const linking = ref(false)
const linkType = ref<'existing_employee' | 'existing_partner'>('existing_employee')
const linkSelectedId = ref('')

const linkTypeOptions = [
  { label: 'No vincular', value: 'none' },
  { label: 'Empleado existente', value: 'existing_employee' },
  { label: 'Socio existente', value: 'existing_partner' },
  { label: 'Crear nuevo empleado', value: 'new_employee' },
  { label: 'Crear nuevo socio', value: 'new_partner' },
]

const employeeOptions = computed(() =>
  employees.value
    .filter(e => !e.user_id)
    .map(e => ({ label: `${e.first_name} ${e.last_name}`, value: e.id }))
)

const partnerOptions = computed(() =>
  partners.value
    .filter(p => !p.user_id)
    .map(p => ({ label: `${p.first_name} ${p.last_name}`, value: p.id }))
)

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

const loadEmployeesAndPartners = async () => {
  try {
    const [emps, parts] = await Promise.all([
      employeesService.findAll(),
      partnersService.findAll(),
    ])
    employees.value = emps
    partners.value = parts
  } catch (e) {
    console.error('Error loading employees/partners:', e)
  }
}

// ─── Edit User ──────────────────────────────────────
const openEditModal = (user: CompanyUser) => {
  selectedUser.value = user
  editUser.value = { name: user.name || '', email: user.email || '' }
  showEditModal.value = true
}

const saveUser = async () => {
  if (!selectedUser.value) return
  const authStore = useAuthStore()
  const companyId = authStore.selectedCompany?.id
  if (!companyId) return

  editing.value = true
  try {
    await $fetch(`/api/access-control/users/${selectedUser.value.id}`, {
      method: 'PATCH',
      body: { company_id: companyId, ...editUser.value },
    })
    toast.add({ title: 'Usuario actualizado', color: 'success' })
    showEditModal.value = false
    await loadUsers()
  } catch (e: any) {
    const data = e?.data?.data || e?.data
    const msg = Array.isArray(data?.message) ? data.message[0] : (data?.message || 'Error')
    toast.add({ title: 'Error al actualizar', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    editing.value = false
  }
}

// ─── Change Password ──────────────────────────────
const openPasswordModal = (user: CompanyUser) => {
  selectedUser.value = user
  newPassword.value = ''
  showPasswordModal.value = true
}

const savePassword = async () => {
  if (!selectedUser.value || !newPassword.value) return
  const authStore = useAuthStore()
  const companyId = authStore.selectedCompany?.id
  if (!companyId) return

  changingPassword.value = true
  try {
    await $fetch(`/api/access-control/users/${selectedUser.value.id}/password`, {
      method: 'PATCH',
      body: { company_id: companyId, newPassword: newPassword.value },
    })
    toast.add({ title: 'Contraseña actualizada', color: 'success' })
    showPasswordModal.value = false
  } catch (e: any) {
    const data = e?.data?.data || e?.data
    const msg = Array.isArray(data?.message) ? data.message[0] : (data?.message || 'Error')
    toast.add({ title: 'Error al cambiar contraseña', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    changingPassword.value = false
  }
}

// ─── Link Employee/Partner ──────────────────────────
const openLinkModal = (user: CompanyUser) => {
  selectedUser.value = user
  linkType.value = 'existing_employee'
  linkSelectedId.value = ''
  showLinkModal.value = true
}

const linkOptions = computed(() => {
  if (linkType.value === 'existing_employee') {
    return employeeOptions.value
  }
  return partnerOptions.value
})

const saveLink = async () => {
  if (!selectedUser.value || !linkSelectedId.value) return

  linking.value = true
  try {
    if (linkType.value === 'existing_employee') {
      await $fetch(`/api/erp/employees/${linkSelectedId.value}/link-user`, {
        method: 'PATCH',
        body: { user_id: selectedUser.value.id },
      })
    } else {
      await $fetch(`/api/erp/partners/${linkSelectedId.value}/link-user`, {
        method: 'PATCH',
        body: { user_id: selectedUser.value.id },
      })
    }
    toast.add({ title: 'Vinculado correctamente', color: 'success' })
    showLinkModal.value = false
    await loadUsers()
  } catch (e: any) {
    const data = e?.data?.data || e?.data
    const msg = Array.isArray(data?.message) ? data.message[0] : (data?.message || 'Error')
    toast.add({ title: 'Error al vincular', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    linking.value = false
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

const openCreateModal = () => {
  newUser.value = {
    name: '',
    email: '',
    password: '',
    linkType: 'none',
  }
  selectedEmployeeId.value = ''
  selectedPartnerId.value = ''
  showCreateModal.value = true
}

const goToCreateEmployee = () => {
  if (!newUser.value.name || !newUser.value.email || !newUser.value.password) {
    toast.add({ title: 'Completá nombre, email y contraseña primero', color: 'warning', icon: 'i-lucide-alert-circle' })
    return
  }
  localStorage.setItem('pendingUser', JSON.stringify({
    name: newUser.value.name,
    email: newUser.value.email,
    password: newUser.value.password,
    type: 'new_employee'
  }))
  showCreateModal.value = false
  router.push('/erp/rrhh/employees/create')
}

const goToCreatePartner = () => {
  if (!newUser.value.name || !newUser.value.email || !newUser.value.password) {
    toast.add({ title: 'Completá nombre, email y contraseña primero', color: 'warning', icon: 'i-lucide-alert-circle' })
    return
  }
  localStorage.setItem('pendingUser', JSON.stringify({
    name: newUser.value.name,
    email: newUser.value.email,
    password: newUser.value.password,
    type: 'new_partner'
  }))
  showCreateModal.value = false
  router.push('/erp/rrhh/partners/create')
}

const createUser = async () => {
  if (!newUser.value.name || !newUser.value.email || !newUser.value.password) {
    toast.add({ title: 'Completá todos los campos', color: 'warning', icon: 'i-lucide-alert-circle' })
    return
  }

  creating.value = true
  try {
    const authStore = useAuthStore()
    const companyId = authStore.selectedCompany?.id

    if (!companyId) {
      toast.add({ title: 'No se pudo determinar la empresa actual', color: 'error', icon: 'i-lucide-alert-circle' })
      return
    }

    const body: any = {
      company_id: companyId,
      name: newUser.value.name,
      email: newUser.value.email,
      password: newUser.value.password,
    }

    if (newUser.value.linkType === 'existing_employee' && selectedEmployeeId.value) {
      body.link_employee_id = selectedEmployeeId.value
    } else if (newUser.value.linkType === 'existing_partner' && selectedPartnerId.value) {
      body.link_partner_id = selectedPartnerId.value
    }

    await $fetch('/api/access-control/users', {
      method: 'POST',
      body,
    })

    const linkMsg = newUser.value.linkType !== 'none' ? ' y vinculado' : ''
    toast.add({ title: `Usuario creado${linkMsg}`, color: 'success' })
    showCreateModal.value = false
    await loadUsers()
  } catch (e: any) {
    console.error('Error creando usuario:', e)
    const data = e?.data?.data || e?.data || e?.response?._data
    const msg = Array.isArray(data?.message) ? data.message[0] : (data?.message || e?.message || 'Error desconocido')
    toast.add({
      title: 'Error al crear usuario',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), initRoles(), loadEmployeesAndPartners()])
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Usuarios" description="Gestionar usuarios de la empresa y asignarles roles">
      <template #links>
        <UButton
          v-if="isOwnerOrAdmin"
          label="Crear usuario"
          icon="i-lucide-plus"
          color="primary"
          @click="openCreateModal"
        />
      </template>
    </AppPageHeader>

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
          <div class="flex items-center gap-1">
            <UTooltip text="Editar nombre y email del usuario">
              <UButton
                v-if="isOwnerOrAdmin"
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="openEditModal(user)"
              />
            </UTooltip>
            <UTooltip text="Cambiar la contraseña del usuario">
              <UButton
                v-if="isOwnerOrAdmin"
                icon="i-lucide-key"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="openPasswordModal(user)"
              />
            </UTooltip>
            <UTooltip text="Vincular con un empleado o socio existente">
              <UButton
                v-if="isOwnerOrAdmin"
                icon="i-lucide-link"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="openLinkModal(user)"
              />
            </UTooltip>
            <UTooltip text="Asignar o quitar roles de acceso">
              <UButton
                v-if="isOwnerOrAdmin"
                label="Asignar roles"
                variant="outline"
                size="xs"
                icon="i-lucide-shield"
                @click="openAssignModal(user)"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </UPageCard>

    <!-- Assign Roles Modal -->
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

    <!-- Create User Modal -->
    <UModal v-model:open="showCreateModal" title="Crear usuario" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nombre" name="name">
            <UInput v-model="newUser.name" placeholder="Nombre completo" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="newUser.email" placeholder="usuario@empresa.com" type="email" />
          </UFormField>
          <UFormField label="Contraseña" name="password">
            <UInput v-model="newUser.password" placeholder="Mínimo 6 caracteres" type="password" />
          </UFormField>

          <UDivider />

          <div class="space-y-2">
            <label class="text-sm font-medium">Vincular a</label>
            <div class="grid grid-cols-2 gap-2">
              <UButton
                v-for="opt in linkTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :color="newUser.linkType === opt.value ? 'primary' : 'neutral'"
                :variant="newUser.linkType === opt.value ? 'solid' : 'outline'"
                size="xs"
                @click="newUser.linkType = opt.value as any"
              />
            </div>
          </div>

          <!-- Existing employee select -->
          <UFormField v-if="newUser.linkType === 'existing_employee'" label="Seleccionar empleado">
            <USelect
              v-model="selectedEmployeeId"
              :items="employeeOptions"
              placeholder="Seleccionar empleado sin usuario"
            />
            <p v-if="employeeOptions.length === 0" class="text-xs text-muted mt-1">
              No hay empleados disponibles sin usuario vinculado
            </p>
          </UFormField>

          <!-- Existing partner select -->
          <UFormField v-if="newUser.linkType === 'existing_partner'" label="Seleccionar socio">
            <USelect
              v-model="selectedPartnerId"
              :items="partnerOptions"
              placeholder="Seleccionar socio sin usuario"
            />
            <p v-if="partnerOptions.length === 0" class="text-xs text-muted mt-1">
              No hay socios disponibles sin usuario vinculado
            </p>
          </UFormField>

          <!-- Redirigir a crear empleado -->
          <div v-if="newUser.linkType === 'new_employee'" class="p-4 rounded-lg bg-muted/30 text-center">
            <p class="text-sm text-muted mb-3">
              Se abrirá el formulario completo de empleados con los datos precargados.
            </p>
            <UButton
              label="Ir a crear empleado →"
              icon="i-lucide-arrow-right"
              color="primary"
              @click="goToCreateEmployee"
            />
          </div>

          <!-- Redirigir a crear socio -->
          <div v-if="newUser.linkType === 'new_partner'" class="p-4 rounded-lg bg-muted/30 text-center">
            <p class="text-sm text-muted mb-3">
              Se abrirá el formulario completo de socios con los datos precargados.
            </p>
            <UButton
              label="Ir a crear socio →"
              icon="i-lucide-arrow-right"
              color="primary"
              @click="goToCreatePartner"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showCreateModal = false" />
          <UButton
            v-if="newUser.linkType !== 'new_employee' && newUser.linkType !== 'new_partner'"
            label="Crear"
            :loading="creating"
            @click="createUser"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit User Modal -->
    <UModal v-model:open="showEditModal" title="Editar usuario" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Editando: <strong>{{ selectedUser?.email }}</strong>
          </p>
          <UFormField label="Nombre" name="name">
            <UInput v-model="editUser.name" placeholder="Nombre completo" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="editUser.email" placeholder="usuario@empresa.com" type="email" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showEditModal = false" />
          <UButton label="Guardar" :loading="editing" @click="saveUser" />
        </div>
      </template>
    </UModal>

    <!-- Change Password Modal -->
    <UModal v-model:open="showPasswordModal" title="Cambiar contraseña" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Cambiar contraseña de <strong>{{ selectedUser?.name || selectedUser?.email }}</strong>
          </p>
          <UFormField label="Nueva contraseña" name="password">
            <UInput v-model="newPassword" placeholder="Mínimo 6 caracteres" type="password" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showPasswordModal = false" />
          <UButton label="Cambiar contraseña" :loading="changingPassword" :disabled="newPassword.length < 6" @click="savePassword" />
        </div>
      </template>
    </UModal>

    <!-- Link Employee/Partner Modal -->
    <UModal v-model:open="showLinkModal" title="Vincular empleado/socio" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Vincular <strong>{{ selectedUser?.name || selectedUser?.email }}</strong> a:
          </p>

          <div class="flex gap-2">
            <UButton
              label="Empleado"
              :color="linkType === 'existing_employee' ? 'primary' : 'neutral'"
              :variant="linkType === 'existing_employee' ? 'solid' : 'outline'"
              size="sm"
              @click="linkType = 'existing_employee'"
            />
            <UButton
              label="Socio"
              :color="linkType === 'existing_partner' ? 'primary' : 'neutral'"
              :variant="linkType === 'existing_partner' ? 'solid' : 'outline'"
              size="sm"
              @click="linkType = 'existing_partner'"
            />
          </div>

          <UFormField :label="linkType === 'existing_employee' ? 'Seleccionar empleado' : 'Seleccionar socio'">
            <USelect
              v-model="linkSelectedId"
              :items="linkOptions"
              :placeholder="linkType === 'existing_employee' ? 'Empleado sin usuario' : 'Socio sin usuario'"
            />
            <p v-if="linkOptions.length === 0" class="text-xs text-muted mt-1">
              No hay {{ linkType === 'existing_employee' ? 'empleados' : 'socios' }} disponibles sin usuario vinculado
            </p>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showLinkModal = false" />
          <UButton label="Vincular" :loading="linking" :disabled="!linkSelectedId" @click="saveLink" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
