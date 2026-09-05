import { computed } from 'vue'
import { usePermissionsStore } from '../stores/permissions.store'
import type { Permission } from '~/modulos/access-control/types/roles.types'

export interface PermissionSelectItem {
  label: string
  value: string
  module?: string
}

export interface PermissionSubgroup {
  label: string
  permissions: Permission[]
}

export interface PermissionModuleGroup {
  label: string
  icon: string
  permissions: Permission[]
  subgroups?: PermissionSubgroup[]
}

// Agrupación lógica por módulo de negocio
const MODULE_META: Record<string, { label: string; icon: string; order: number; modules: string[]; subgroups?: Record<string, string> }> = {
  access: { label: 'Acceso', icon: 'i-lucide-shield', order: 0, modules: ['roles', 'users', 'permissions'] },
  documents: {
    label: 'Documentos', icon: 'i-lucide-file-text', order: 10, modules: ['sales', 'purchases', 'documents', 'document_types', 'document_sequences'],
    subgroups: { sales: 'Ventas', purchases: 'Compras', documents: 'General', document_types: 'Tipos de Documento', document_sequences: 'Secuencias' }
  },
  master: {
    label: 'Maestros', icon: 'i-lucide-package', order: 20,
    modules: ['products', 'units', 'categories', 'currencies', 'taxes', 'accounts', 'companies', 'product_variants', 'product_components', 'product_categories', 'product_tags', 'product_attribute_values', 'attributes', 'tags', 'business_parties', 'contacts', 'locations'],
    subgroups: {
      products: 'Productos',
      units: 'Unidades de Medida',
      categories: 'Categorías',
      currencies: 'Monedas',
      taxes: 'Impuestos',
      accounts: 'Cuentas Contables',
      companies: 'Empresas',
      attributes: 'Atributos',
      tags: 'Etiquetas',
      business_parties: 'Terceros',
      contacts: 'Contactos',
      locations: 'Ubicaciones'
    }
  },
  engineering: {
    label: 'Ingeniería y Costos', icon: 'i-lucide-wrench', order: 25,
    modules: ['engineering', 'cost_templates', 'cost_components'],
    subgroups: { engineering: 'Ingeniería', cost_templates: 'Plantillas de Costo', cost_components: 'Componentes de Costo' }
  },
  logistics: {
    label: 'Logística', icon: 'i-lucide-route', order: 30,
    modules: ['trips', 'warehouses', 'drivers', 'vehicles', 'vehicle_combinations', 'corridors', 'transfer_rates', 'dispatch_orders', 'delivery_notes', 'transport_document_types', 'pallets', 'picking', 'stock'],
    subgroups: {
      trips: 'Viajes',
      drivers: 'Choferes',
      vehicles: 'Vehículos',
      vehicle_combinations: 'Combinaciones de Vehículo',
      corridors: 'Corredores',
      transfer_rates: 'Tarifas de Transferencia',
      dispatch_orders: 'Órdenes de Despacho',
      delivery_notes: 'Notas de Entrega',
      transport_document_types: 'Tipos Doc. Transporte',
      warehouses: 'Almacenes',
      pallets: 'Pallets',
      picking: 'Picking',
      stock: 'Stock'
    }
  },
  treasury: {
    label: 'Tesorería', icon: 'i-lucide-wallet', order: 40,
    modules: ['treasury', 'cash_boxes', 'cash_box_movements', 'cash_box_renditions', 'cash_box_transfers', 'bank_accounts', 'payments', 'currency_rates', 'checks'],
    subgroups: {
      payments: 'Pagos',
      cash_boxes: 'Cajas',
      cash_box_movements: 'Movimientos de Caja',
      cash_box_renditions: 'Rendiciones de Caja',
      cash_box_transfers: 'Transferencias entre Cajas',
      bank_accounts: 'Bancos',
      treasury: 'General',
      currency_rates: 'Tipos de Cambio',
      checks: 'Cheques'
    }
  },
  hr: {
    label: 'RRHH', icon: 'i-lucide-users', order: 45,
    modules: ['employees', 'partners', 'vales'],
    subgroups: {
      employees: 'Empleados',
      partners: 'Socios',
      vales: 'Vales'
    }
  },
  system: {
    label: 'Sistema', icon: 'i-lucide-cog', order: 90,
    modules: ['data_import', 'trash', 'media'],
    subgroups: { data_import: 'Importación', trash: 'Papelera', media: 'Archivos' }
  },
}

function extractModule(code: string): string {
  const prefix = code.split('.')[0]
  for (const [groupKey, meta] of Object.entries(MODULE_META)) {
    if (meta.modules.includes(prefix)) return groupKey
  }
  return 'other'
}

function getModuleMeta(module: string) {
  return MODULE_META[module] || { label: module, icon: 'i-lucide-puzzle', order: 99, modules: [], subgroups: undefined }
}

export function usePermissions() {
  const store = usePermissionsStore()

  const init = async () => {
    await store.fetchAll()
  }

  const findByCode = async (code: string) => store.findByCode(code)

  const items = computed(() =>
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
      const group: PermissionModuleGroup = {
        label: meta.label || mod,
        icon: meta.icon,
        permissions: perms.sort((a, b) => a.code.localeCompare(b.code))
      }

      // Crear subgrupos si existen
      if (meta.subgroups) {
        group.subgroups = []
        for (const [prefix, subLabel] of Object.entries(meta.subgroups)) {
          const subPerms = perms.filter(p => p.code.startsWith(prefix + '.'))
          if (subPerms.length > 0) {
            group.subgroups.push({
              label: subLabel,
              permissions: subPerms.sort((a, b) => a.code.localeCompare(b.code))
            })
          }
        }
      }

      groups.push(group)
    }

    groups.sort((a, b) => {
      const aOrder = getModuleMeta(extractModule(a.permissions[0]?.code)).order
      const bOrder = getModuleMeta(extractModule(b.permissions[0]?.code)).order
      return aOrder - bOrder
    })

    return groups
  })

  const findByCodeSync = (code: string) =>
    store.items.find((p) => p.code === code)

  const exists = (code: string) =>
    store.items.some((p) => p.code === code)

  return {
    permissions: computed(() => store.items),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),
    items,
    groupedByModule,
    findByCode,
    findByCodeSync,
    exists,
    init
  }
}
