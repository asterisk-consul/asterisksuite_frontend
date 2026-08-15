<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { usePermissions } from '~/modulos/access-control/composables/usePermissions'
import { useCompanyRole } from '~/composables/useCompanyRole'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { isOwnerOrAdmin } = useCompanyRole()
const { groupedByModule, init: initPermissions } = usePermissions()
const { updatePermissions: updateRolePermissions } = useRoles()

const roleId = route.params.id as string
const roleName = ref('')
const saving = ref(false)
const permSearch = ref('')
const collapsedModules = ref<Set<string>>(new Set())
const collapsedSubgroups = ref<Set<string>>(new Set())
const selectedPermissionCodes = ref<string[]>([])

console.log('[PermissionsPage] roleId:', roleId, 'route params:', route.params)

onMounted(async () => {
  console.log('[PermissionsPage] onMounted')
  try {
    await initPermissions()
    console.log('[PermissionsPage] permissions loaded:', groupedByModule.value.length, 'groups')
    const data = await $fetch<any>(`/api/access-control/roles/${roleId}`)
    console.log('[PermissionsPage] role data:', data?.name)
    roleName.value = data.name || ''
    selectedPermissionCodes.value = (data.permissions || []).map((p: any) => p.permission?.code).filter(Boolean)
  } catch (e) {
    console.error('[PermissionsPage] error:', e)
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

const groupHasResults = (perms: any[]) => {
  if (!permSearch.value.trim()) return true
  return filteredPerms(perms).length > 0
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
  saving.value = true
  try {
    await updateRolePermissions(roleId, selectedPermissionCodes.value)
    toast.add({ title: 'Permisos actualizados', color: 'success' })
    router.push('/settings/roles')
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
        <UButton label="Volver" icon="i-lucide-arrow-left" variant="ghost" @click="router.push('/settings/roles')" />
        <UButton label="Guardar" icon="i-lucide-check" :loading="saving" @click="savePermissions" />
      </template>
      <template #footer>
        <div class="pt-3 mt-2">
          <UInput
            v-model="permSearch"
            icon="i-lucide-search"
            placeholder="Buscar permisos... (ej: pagos, vehiculos, documentos)"
            size="sm"
          />
        </div>
      </template>
    </AppPageHeader>

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

          <!-- Con subgrupos -->
          <div v-else class="space-y-2">
            <div v-for="(sub, subIdx) in group.subgroups" :key="sub.label" class="space-y-1">
              <button
                type="button"
                class="flex items-center gap-2 w-full px-2 py-1 hover:bg-muted/50 rounded transition-colors"
                @click="toggleSubgroupCollapse(`${group.label}-${subIdx}`)"
              >
                <UCheckbox
                  :model-value="sub.permissions.every((p: any) => selectedPermissionCodes.includes(p.code))"
                  :indeterminate="
                    sub.permissions.some((p: any) => selectedPermissionCodes.includes(p.code)) &&
                    !sub.permissions.every((p: any) => selectedPermissionCodes.includes(p.code))
                  "
                  @update:model-value="toggleModule(sub.permissions)"
                  @click.stop
                />
                <span class="text-xs font-semibold text-muted flex-1 text-left">{{ sub.label }}</span>
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
      </div>
    </div>
  </UPage>
</template>
