<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useTrashStore } from '~/modulos/trash/store/trash.store'
import { TRASH_TABLES } from '~/modulos/trash/types/trash.types'

const store = useTrashStore()
const toast = useToast()

const search = ref('')
const filterTable = ref<string | undefined>(undefined)
const filterDays = ref<number>(30)
const selectedIds = ref<string[]>([])
const showDetailModal = ref(false)
const showHardDeleteModal = ref(false)
const selectedItem = ref<any>(null)
const actionLoading = ref(false)

const DAY_OPTIONS = [
  { label: 'Últimos 7 días', value: 7 },
  { label: 'Últimos 15 días', value: 15 },
  { label: 'Últimos 30 días', value: 30 },
  { label: 'Últimos 60 días', value: 60 },
  { label: 'Últimos 90 días', value: 90 },
  { label: 'Todos', value: 0 }
]

const TABLE_LABELS: Record<string, string> = {
  users: 'Usuarios',
  business_parties: 'Partes interesadas',
  companies: 'Empresas',
  delivery_notes: 'Remitos',
  drivers: 'Choferes',
  entity_photos: 'Fotos de entidades',
  files: 'Archivos',
  locations: 'Locaciones',
  pallets: 'Pallets',
  party_locations: 'Locaciones de partes',
  party_contacts: 'Contactos de partes',
  picking_orders: 'Órdenes de picking',
  products: 'Productos',
  trips: 'Viajes',
  trip_stops: 'Paradas de viaje',
  trip_stop_orders: 'Órdenes de parada',
  corridors: 'Corredores',
  corridor_stops: 'Paradas de corredor',
  vehicles: 'Vehículos',
  vehicle_combinations: 'Combinaciones vehiculares',
  warehouses: 'Depósitos',
  document_sequences: 'Secuencias de documento',
  transport_document_types: 'Tipos de doc. transporte',
  documents_vehicle: 'Documentos vehículo',
  documents_driver: 'Documentos chofer',
  transfer_rates: 'Tarifas de transferencia',
  dispatch_rates: 'Tarifas de despacho',
  document_item_taxes: 'Impuestos de ítems',
  document_items: 'Ítems de documento',
  document_taxes: 'Impuestos de documento',
  document_types: 'Tipos de documento',
  documents: 'Documentos',
  product_taxes: 'Impuestos de producto',
  taxes: 'Impuestos',
  product_price: 'Precios de producto',
  accounts: 'Cuentas contables',
  product_attribute_values: 'Valores de atributos',
  attributes: 'Atributos',
  tags: 'Tags',
  categories: 'Categorías',
  product_components: 'Componentes de producto',
  product_variants: 'Variantes de producto',
  units: 'Unidades',
  currency_rates: 'Tasas de cambio',
  currencies: 'Monedas'
}

const TABLE_OPTIONS = TRASH_TABLES.map(t => ({ label: TABLE_LABELS[t] || t, value: t }))

const columns = [
  { id: 'select', header: '' },
  { id: 'table', header: 'Tabla' },
  { id: 'id', header: 'ID' },
  { id: 'deletedAt', header: 'Eliminado el' },
  { id: 'deletedBy', header: 'Eliminado por' },
  { id: 'actions', header: '' }
]

const filteredItems = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.items
  return store.items.filter(item =>
    item.id.toLowerCase().includes(q) ||
    (TABLE_LABELS[item.table] || item.table).toLowerCase().includes(q)
  )
})

const allSelected = computed(() => {
  if (filteredItems.value.length === 0) return false
  return filteredItems.value.every(item => selectedIds.value.includes(item.table + ':' + item.id))
})

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredItems.value.map(item => item.table + ':' + item.id)
  }
}

function toggleItem(key: string) {
  const idx = selectedIds.value.indexOf(key)
  if (idx === -1) {
    selectedIds.value.push(key)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

function isSelected(item: any) {
  return selectedIds.value.includes(item.table + ':' + item.id)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openDetail(item: any) {
  selectedItem.value = item
  showDetailModal.value = true
}

function parseSelection() {
  const result: { table: string; ids: string[] }[] = []
  for (const key of selectedIds.value) {
    const sep = key.indexOf(':')
    const table = key.substring(0, sep)
    const id = key.substring(sep + 1)
    const existing = result.find(r => r.table === table)
    if (existing) {
      existing.ids.push(id)
    } else {
      result.push({ table, ids: [id] })
    }
  }
  return result
}

async function restoreSelected() {
  if (selectedIds.value.length === 0) return
  actionLoading.value = true
  try {
    const groups = parseSelection()
    for (const group of groups) {
      if (group.ids.length === 1) {
        await store.restore(group.table, group.ids[0])
      } else {
        await store.restoreMany(group.table, group.ids)
      }
    }
    toast.add({ title: `${selectedIds.value.length} elemento(s) restaurado(s)`, color: 'success', icon: 'i-lucide-check-circle' })
    selectedIds.value = []
  } catch (e: any) {
    toast.add({ title: 'Error al restaurar', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function restoreOne(item: any) {
  actionLoading.value = true
  try {
    await store.restore(item.table, item.id)
    toast.add({ title: 'Elemento restaurado', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Error al restaurar', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

function confirmHardDelete() {
  if (selectedIds.value.length === 0) return
  showHardDeleteModal.value = true
}

async function hardDeleteSelected() {
  actionLoading.value = true
  try {
    const groups = parseSelection()
    for (const group of groups) {
      await store.hardDeleteMany(group.table, group.ids)
    }
    toast.add({ title: `${selectedIds.value.length} elemento(s) eliminado(s) permanentemente`, color: 'success', icon: 'i-lucide-check-circle' })
    selectedIds.value = []
    showHardDeleteModal.value = false
  } catch (e: any) {
    toast.add({ title: 'Error al eliminar', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function loadData() {
  const params: { days?: number; table?: string } = {}
  if (filterDays.value > 0) params.days = filterDays.value
  if (filterTable.value) params.table = filterTable.value
  await store.fetchAll(params)
}

watch([filterDays, filterTable], () => {
  selectedIds.value = []
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Papelera" description="Elementos eliminados del sistema. Restaurá o eliminá permanentemente." />

    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar por ID o tabla..."
        class="flex-1 min-w-[200px] max-w-sm"
      />
      <USelectMenu
        v-model="filterTable"
        :items="TABLE_OPTIONS"
        value-key="value"
        :search-input="{ placeholder: 'Buscar tabla...', icon: 'i-lucide-search' }"
        clear
        placeholder="Todas las tablas"
        class="w-56"
      />
      <USelect
        v-model="filterDays"
        :items="DAY_OPTIONS"
        placeholder="Período"
        class="w-44"
      />
    </div>

    <div v-if="selectedIds.length > 0" class="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <span class="text-sm font-medium">{{ selectedIds.length }} seleccionado(s)</span>
      <div class="flex gap-2 ms-auto">
        <UButton
          label="Restaurar"
          icon="i-lucide-undo-2"
          color="success"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="restoreSelected"
        />
        <UButton
          label="Eliminar permanentemente"
          icon="i-lucide-trash-2"
          color="error"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="confirmHardDelete"
        />
      </div>
    </div>

    <div v-if="store.loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
    </div>

    <div v-else-if="filteredItems.length === 0" class="py-16 text-center">
      <UIcon name="i-lucide-trash-2" class="mx-auto mb-3 text-4xl text-muted" />
      <p class="text-sm text-muted">No hay elementos en la papelera</p>
    </div>

    <UTable v-else :data="filteredItems" :columns="columns">
      <template #select-header>
        <UCheckbox
          :model-value="allSelected"
          @update:model-value="toggleAll"
        />
      </template>

      <template #select-cell="{ row }">
        <UCheckbox
          :model-value="isSelected(row.original)"
          @update:model-value="toggleItem(row.original.table + ':' + row.original.id)"
        />
      </template>

      <template #table-cell="{ row }">
        <UBadge
          :label="TABLE_LABELS[row.original.table] || row.original.table"
          variant="subtle"
          color="neutral"
        />
      </template>

      <template #id-cell="{ row }">
        <code class="text-xs text-muted">{{ row.original.id.substring(0, 8) }}...</code>
      </template>

      <template #deletedAt-cell="{ row }">
        <span class="text-sm">{{ formatDate(row.original.deletedAt) }}</span>
      </template>

      <template #deletedBy-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.deletedByName || '—' }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton
            icon="i-lucide-eye"
            variant="ghost"
            color="neutral"
            size="xs"
            title="Ver detalle"
            @click="openDetail(row.original)"
          />
          <UButton
            icon="i-lucide-undo-2"
            variant="ghost"
            color="success"
            size="xs"
            title="Restaurar"
            :loading="actionLoading"
            @click="restoreOne(row.original)"
          />
        </div>
      </template>
    </UTable>

    <!-- Detail Modal -->
    <UModal v-model:open="showDetailModal" title="Detalle del elemento">
      <template #body>
        <div v-if="selectedItem" class="space-y-3">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-muted">Tabla:</span>
              <p class="font-medium">{{ TABLE_LABELS[selectedItem.table] || selectedItem.table }}</p>
            </div>
            <div>
              <span class="text-muted">ID:</span>
              <p class="font-mono text-xs">{{ selectedItem.id }}</p>
            </div>
            <div>
              <span class="text-muted">Eliminado el:</span>
              <p>{{ formatDate(selectedItem.deletedAt) }}</p>
            </div>
            <div>
              <span class="text-muted">Eliminado por:</span>
              <p>{{ selectedItem.deletedByName || '—' }}</p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cerrar" variant="ghost" @click="showDetailModal = false" />
          <UButton
            label="Restaurar"
            icon="i-lucide-undo-2"
            color="success"
            :loading="actionLoading"
            @click="restoreOne(selectedItem); showDetailModal = false"
          />
        </div>
      </template>
    </UModal>

    <!-- Hard Delete Confirmation Modal -->
    <UModal v-model:open="showHardDeleteModal" title="Eliminar permanentemente">
      <template #body>
        <p class="text-sm">
          Vas a eliminar <strong>{{ selectedIds.length }} elemento(s)</strong> permanentemente.
          Esta acción <strong class="text-error">no se puede deshacer</strong>.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showHardDeleteModal = false" />
          <UButton
            label="Eliminar permanentemente"
            color="error"
            icon="i-lucide-trash-2"
            :loading="actionLoading"
            @click="hardDeleteSelected"
          />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
