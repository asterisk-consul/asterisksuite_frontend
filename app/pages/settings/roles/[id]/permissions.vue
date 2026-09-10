<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { usePermissions } from '~/modulos/access-control/composables/usePermissions'
import { useCompanyRole } from '~/composables/useCompanyRole'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { isOwnerOrAdmin } = useCompanyRole()
const { groupedByModule, total: totalPermissions, init: initPermissions } = usePermissions()
const { updatePermissions: updateRolePermissions } = useRoles()

const roleId = route.params.id as string
const roleName = ref('')
const saving = ref(false)
const permSearch = ref('')
const collapsedModules = ref<Set<string>>(new Set())
const collapsedSubgroups = ref<Set<string>>(new Set())
const selectedPermissionCodes = ref<string[]>([])
const initialPermissionCodes = ref<string[]>([])

const hasUnsavedChanges = computed(() => {
  const sortedSelected = [...selectedPermissionCodes.value].sort()
  const sortedInitial = [...initialPermissionCodes.value].sort()
  return JSON.stringify(sortedSelected) !== JSON.stringify(sortedInitial)
})

const selectedCount = computed(() => selectedPermissionCodes.value.length)

const GENERAL_DOCUMENT_PERMISSIONS = /^(documents|documents-purchases|sales|purchases)\.(read|create|update|confirm|cancel|delete)$/
const generalDocumentPermissions = computed(() =>
  selectedPermissionCodes.value.filter(code => GENERAL_DOCUMENT_PERMISSIONS.test(code))
)

const permissionActionLabels: Record<string, string> = {
  read: 'ver', create: 'crear', update: 'editar', confirm: 'confirmar', cancel: 'anular', delete: 'eliminar'
}

const formatGeneralPermission = (code: string) => {
  const [scope, action] = code.split('.')
  const scopeLabel = scope === 'documents' ? 'Ventas y compras' : scope === 'documents-purchases' || scope === 'purchases' ? 'Compras' : 'Ventas'
  return `${scopeLabel}: ${permissionActionLabels[action || ''] || action}`
}

const removeGeneralDocumentPermissions = () => {
  selectedPermissionCodes.value = selectedPermissionCodes.value.filter(code => !GENERAL_DOCUMENT_PERMISSIONS.test(code))
}

const removeConflictingGeneralPermissions = (code: string) => {
  const parts = code.split('.')
  if (parts.length !== 3 || !['sales', 'purchases'].includes(parts[0] || '')) return
  const [scope, , action] = parts
  const conflicts = scope === 'sales'
    ? [`sales.${action}`, `documents.${action}`]
    : [`purchases.${action}`, `documents-purchases.${action}`, `documents.${action}`]
  selectedPermissionCodes.value = selectedPermissionCodes.value.filter(selected => !conflicts.includes(selected))
}

onMounted(async () => {
  try {
    await initPermissions()
    const data = await $fetch<any>(`/api/access-control/roles/${roleId}`)
    roleName.value = data.name || ''
    const codes = (data.permissions || []).map((p: any) => p.permission?.code).filter(Boolean)
    selectedPermissionCodes.value = codes
    initialPermissionCodes.value = [...codes]
  } catch {
    toast.add({ title: 'Error al cargar permisos', color: 'error' })
  }
})

onBeforeUnmount(() => {
  if (hasUnsavedChanges.value) {
    if (!confirm('Tenés cambios sin guardar. ¿Salir de todos modos?')) {
      // No se puede cancelar el unmount, pero al menos avisamos
    }
  }
})

const toggleModuleCollapse = (moduleLabel: string) => {
  if (collapsedModules.value.has(moduleLabel)) {
    collapsedModules.value.delete(moduleLabel)
  } else {
    collapsedModules.value.add(moduleLabel)
  }
}

const toggleSubgroupCollapse = (key: string) => {
  if (collapsedSubgroups.value.has(key)) {
    collapsedSubgroups.value.delete(key)
  } else {
    collapsedSubgroups.value.add(key)
  }
}

const documentSubgroupLevel = (label: string) => {
  if (label.startsWith('Todos los documentos')) return 0
  if (label.endsWith('Todos los tipos') || label.startsWith('Configuración')) return 1
  return 2
}

const documentSubgroupHelp = (label: string) => {
  if (label.startsWith('Todos los documentos')) return 'Cada acción seleccionada se aplica a ventas y compras.'
  if (label === 'Ventas · Todos los tipos') return 'Cada acción seleccionada se aplica a presupuestos, órdenes, facturas, remitos y notas de venta.'
  if (label === 'Compras · Todos los tipos') return 'Cada acción seleccionada se aplica a todos los comprobantes de compra.'
  return ''
}

const filteredPerms = (perms: any[]) => {
  if (!permSearch.value.trim()) return perms
  const q = permSearch.value.toLowerCase().trim()
  return perms.filter((p) =>
    p.code.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q))
  )
}

watch(permSearch, (val) => {
  if (val.trim()) {
    for (const group of groupedByModule.value) {
      if (filteredPerms(group.permissions).length > 0) {
        collapsedModules.value.delete(group.label)
      }
    }
  }
})

const togglePermission = (code: string) => {
  const idx = selectedPermissionCodes.value.indexOf(code)
  if (idx === -1) {
    removeConflictingGeneralPermissions(code)
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

const selectAll = () => {
  const allCodes: string[] = []
  for (const group of groupedByModule.value) {
    for (const perm of group.permissions) {
      allCodes.push(perm.code)
    }
  }
  selectedPermissionCodes.value = allCodes
}

const clearAll = () => {
  selectedPermissionCodes.value = []
}

const savePermissions = async () => {
  saving.value = true
  try {
    await updateRolePermissions(roleId, selectedPermissionCodes.value)
    initialPermissionCodes.value = [...selectedPermissionCodes.value]
    toast.add({ title: 'Permisos actualizados', color: 'success' })
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
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      :title="`Permisos: ${roleName}`"
      description="Gestiona los permisos asignados a este rol"
    >
      <template #links>
        <div class="flex items-center gap-2">
          <UBadge
            v-if="selectedCount > 0"
            :label="`${selectedCount} de ${totalPermissions} permisos`"
            color="primary"
            variant="soft"
          />
          <UButton
            v-if="!isOwnerOrAdmin"
            label="Volver"
            icon="i-lucide-arrow-left"
            variant="ghost"
            @click="hasUnsavedChanges ? (confirm('Tenés cambios sin guardar. ¿Salir?') && router.push('/settings/roles')) : router.push('/settings/roles')"
          />
          <UButton
            v-else
            label="Volver"
            icon="i-lucide-arrow-left"
            variant="ghost"
            @click="router.push('/settings/roles')"
          />
          <UButton label="Guardar" icon="i-lucide-check" :loading="saving" :disabled="!hasUnsavedChanges" @click="savePermissions" />
        </div>
      </template>
      <template #footer>
        <div class="flex items-center gap-2 pt-3 mt-2">
          <UInput
            v-model="permSearch"
            icon="i-lucide-search"
            placeholder="Buscar permisos... (ej: pagos, vehiculos, documentos)"
            size="sm"
            class="flex-1"
          />
          <UButton
            v-if="isOwnerOrAdmin"
            label="Todos"
            size="xs"
            variant="outline"
            @click="selectAll"
          />
          <UButton
            v-if="isOwnerOrAdmin"
            label="Ninguno"
            size="xs"
            variant="outline"
            color="neutral"
            @click="clearAll"
          />
        </div>
      </template>
    </AppPageHeader>

    <!-- Guard admin -->
    <UAlert
      v-if="!isOwnerOrAdmin"
      color="warning"
      icon="i-lucide-shield-alert"
      title="Solo visualización"
      description="Solo los usuarios con rol OWNER o ADMIN pueden editar permisos."
    />

    <UAlert
      v-if="generalDocumentPermissions.length"
      color="warning"
      variant="soft"
      icon="i-lucide-layers-3"
      title="Este rol todavía tiene permisos generales de documentos"
    >
      <template #description>
        <div class="space-y-3">
          <p>
            Los permisos generales habilitan todos los tipos de documento para esa acción,
            aunque abajo selecciones solamente Presupuestos, Facturas o Remitos.
          </p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="code in generalDocumentPermissions"
              :key="code"
              :label="formatGeneralPermission(code)"
              color="warning"
              variant="subtle"
            />
          </div>
          <UButton
            v-if="isOwnerOrAdmin"
            label="Usar configuración por tipo de documento"
            icon="i-lucide-list-checks"
            color="warning"
            variant="outline"
            size="sm"
            @click="removeGeneralDocumentPermissions"
          />
        </div>
      </template>
    </UAlert>

    <!-- Lista de permisos -->
    <div class="space-y-2 px-4">
      <div
        v-for="group in groupedByModule"
        :key="group.label"
        v-show="filteredPerms(group.permissions).length > 0"
        class="border border-default rounded-lg overflow-hidden"
      >
        <button
          type="button"
          class="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-muted/50 transition-colors"
          @click="toggleModuleCollapse(group.label)"
        >
          <UCheckbox
            :disabled="!isOwnerOrAdmin"
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
          <!-- Sin subgrupos -->
          <div v-if="!group.subgroups?.length" class="grid grid-cols-2 gap-1">
            <label
              v-for="perm in filteredPerms(group.permissions)"
              :key="perm.code"
              class="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
              :title="perm.code"
            >
              <UCheckbox
                :disabled="!isOwnerOrAdmin"
                :model-value="selectedPermissionCodes.includes(perm.code)"
                @update:model-value="togglePermission(perm.code)"
              />
              <span class="min-w-0">
                <span class="block truncate">{{ perm.description || perm.code }}</span>
                <span class="block truncate text-[10px] text-dimmed">{{ perm.code }}</span>
              </span>
            </label>
          </div>

          <!-- Con subgrupos -->
          <div v-else class="space-y-2">
            <div
              v-for="(sub, subIdx) in group.subgroups"
              :key="sub.label"
              class="space-y-1 rounded-lg"
              :class="group.label === 'Documentos' ? [
                documentSubgroupLevel(sub.label) === 0 ? 'border border-warning/40 bg-warning/5 p-2' : '',
                documentSubgroupLevel(sub.label) === 1 ? 'ml-3 border border-default bg-muted/20 p-2' : '',
                documentSubgroupLevel(sub.label) === 2 ? 'ml-8 border-l-2 border-default pl-3' : ''
              ] : ''"
            >
              <button
                type="button"
                class="flex items-center gap-2 w-full px-2 py-1 hover:bg-muted/50 rounded transition-colors"
                @click="toggleSubgroupCollapse(`${group.label}-${subIdx}`)"
              >
                <UCheckbox
                  :disabled="!isOwnerOrAdmin"
                  :model-value="sub.permissions.every((p: any) => selectedPermissionCodes.includes(p.code))"
                  :indeterminate="
                    sub.permissions.some((p: any) => selectedPermissionCodes.includes(p.code)) &&
                    !sub.permissions.every((p: any) => selectedPermissionCodes.includes(p.code))
                  "
                  @update:model-value="toggleModule(sub.permissions)"
                  @click.stop
                />
                <span class="min-w-0 flex-1 text-left">
                  <span class="block text-xs font-semibold" :class="documentSubgroupLevel(sub.label) <= 1 ? 'text-highlighted' : 'text-muted'">
                    {{ sub.label }}
                  </span>
                  <span v-if="group.label === 'Documentos' && documentSubgroupHelp(sub.label)" class="block text-[11px] font-normal text-muted mt-0.5">
                    {{ documentSubgroupHelp(sub.label) }}
                  </span>
                </span>
                <UBadge
                  v-if="group.label === 'Documentos' && documentSubgroupLevel(sub.label) <= 1"
                  label="Permiso general"
                  color="warning"
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  :label="`${sub.permissions.filter((p: any) => selectedPermissionCodes.includes(p.code)).length}/${sub.permissions.length}`"
                  variant="soft"
                  size="xs"
                  color="neutral"
                />
                <UIcon
                  :name="collapsedSubgroups.has(`${group.label}-${subIdx}`) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                  class="size-3 text-muted transition-transform"
                />
              </button>
              <div v-if="!collapsedSubgroups.has(`${group.label}-${subIdx}`)" class="ml-5">
                <div class="grid grid-cols-2 gap-1">
                  <label
                    v-for="perm in filteredPerms(sub.permissions)"
                    :key="perm.code"
                    class="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                    :title="perm.code"
                  >
                    <UCheckbox
                      :disabled="!isOwnerOrAdmin"
                      :model-value="selectedPermissionCodes.includes(perm.code)"
                      @update:model-value="togglePermission(perm.code)"
                    />
                    <span class="min-w-0">
                      <span class="block truncate">{{ perm.description || perm.code }}</span>
                      <span class="block truncate text-[10px] text-dimmed">{{ perm.code }}</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isOwnerOrAdmin"
      class="sticky bottom-3 z-20 mx-4 flex items-center justify-between gap-3 rounded-xl border border-default bg-default/95 px-4 py-3 shadow-lg backdrop-blur"
    >
      <div>
        <p class="text-sm font-medium">{{ hasUnsavedChanges ? 'Hay cambios sin guardar' : 'Permisos guardados' }}</p>
        <p class="text-xs text-muted">{{ selectedCount }} permisos seleccionados</p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="hasUnsavedChanges"
          label="Descartar"
          color="neutral"
          variant="ghost"
          @click="selectedPermissionCodes = [...initialPermissionCodes]"
        />
        <UButton
          label="Guardar cambios"
          icon="i-lucide-check"
          :loading="saving"
          :disabled="!hasUnsavedChanges"
          @click="savePermissions"
        />
      </div>
    </div>
  </UPage>
</template>
