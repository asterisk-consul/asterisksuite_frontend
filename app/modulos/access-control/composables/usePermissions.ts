import { computed } from 'vue'
import { usePermissionsStore } from '../stores/permissions.store'
import type { Permission } from '~/modulos/access-control/types/roles.types'

export interface PermissionSelectItem {
  label: string
  value: string
  module?: string
}

export interface PermissionModuleGroup {
  label: string
  icon: string
  permissions: Permission[]
}

const MODULE_META: Record<string, { label: string; icon: string; order: number }> = {
  roles: { label: 'Roles y Acceso', icon: 'i-lucide-shield', order: 0 },
  users: { label: 'Usuarios', icon: 'i-lucide-users', order: 1 },
  permissions: { label: 'Permisos', icon: 'i-lucide-key', order: 2 },
  products: { label: 'Productos', icon: 'i-lucide-package', order: 10 },
  documents: { label: 'Documentos', icon: 'i-lucide-file-text', order: 20 },
  currencies: { label: 'Monedas', icon: 'i-lucide-banknote', order: 21 },
  taxes: { label: 'Impuestos', icon: 'i-lucide-percent', order: 22 },
  accounts: { label: 'Cuentas Contables', icon: 'i-lucide-calculator', order: 23 },
  units: { label: 'Unidades de Medida', icon: 'i-lucide-ruler', order: 30 },
  categories: { label: 'Categorías', icon: 'i-lucide-tags', order: 31 },
  warehouses: { label: 'Almacenes', icon: 'i-lucide-warehouse', order: 40 },
  trips: { label: 'Viajes', icon: 'i-lucide-route', order: 41 },
  companies: { label: 'Empresas', icon: 'i-lucide-building-2', order: 50 },
}

const DEFAULT_META = { label: '', icon: 'i-lucide-puzzle', order: 99 }

function extractModule(code: string): string {
  const parts = code.split('.')
  return parts.length > 1 ? parts[0] : 'general'
}

function getModuleMeta(module: string) {
  return MODULE_META[module] || { ...DEFAULT_META, label: module }
}

export function usePermissions() {
  const store = usePermissionsStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // ACTIONS
  // =========================

  const findByCode = async (code: string) => store.findByCode(code)

  // =========================
  // COMPUTED
  // =========================

  const items = computed<PermissionSelectItem[]>(() =>
    store.items.map((perm) => ({
      label: perm.name,
      value: perm.code,
      module: extractModule(perm.code)
    }))
  )

  const groupedByModule = computed<PermissionModuleGroup[]>(() => {
    const map = new Map<string, Permission[]>()

    for (const perm of store.items) {
      const mod = extractModule(perm.code)
      if (!map.has(mod)) map.set(mod, [])
      map.get(mod)!.push(perm)
    }

    const groups: PermissionModuleGroup[] = []
    for (const [mod, perms] of map) {
      const meta = getModuleMeta(mod)
      groups.push({
        label: meta.label || mod,
        icon: meta.icon,
        permissions: perms.sort((a, b) => a.code.localeCompare(b.code))
      })
    }

    groups.sort((a, b) => {
      const aOrder = MODULE_META[extractModule(a.permissions[0]?.code)]?.order ?? 99
      const bOrder = MODULE_META[extractModule(b.permissions[0]?.code)]?.order ?? 99
      return aOrder - bOrder
    })

    return groups
  })

  // =========================
  // HELPERS
  // =========================

  const findByCodeSync = (code: string) =>
    store.items.find((p) => p.code === code)

  const exists = (code: string) =>
    store.items.some((p) => p.code === code)

  // =========================
  // RETURN
  // =========================

  return {
    // state
    permissions: computed(() => store.items),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),

    // computed
    items,
    groupedByModule,

    // helpers
    findByCode,
    findByCodeSync,
    exists,

    // actions
    init
  }
}
