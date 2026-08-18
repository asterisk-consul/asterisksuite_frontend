<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import type { TabsItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import TripPlanner from '~/modulos/logistica/transport/trips/planners/TripPlanner.vue'
//stores
import { useTripsStore } from '~/modulos/logistica/transport/trips/trips.store'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'

//types
import type { Trip } from '~/modulos/logistica/transport/trips/types/trips.types'

//tabla columns
import { tripsColumns } from '~/modulos/logistica/transport/trips/columns'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

type EditableField = 'reference_number' | 'kilometers' | 'week'

type EditableValue<K extends EditableField> = Trip[K]

const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
import type { ButtonProps } from '@nuxt/ui'

function toggleModuleSidebar() {
  moduleCollapsed.value = !moduleCollapsed.value
}
const router = useRouter()
const loading = ref(true)
const store = useTripsStore()
const { items } = storeToRefs(store)
const sorting = ref<SortingState>([])

const tableRef = ref<any>(null)

// ─── Modal confirmación completar viaje ──────────────────────────────────────
const showCompleteModal = ref(false)
const pendingTrip = ref<Trip | null>(null)
const pendingValue = ref<Trip['status'] | null>(null)
const generatingInvoice = ref(false)
const generateResult = ref<{ created: number; skipped: number } | null>(null)

async function handleCompleteTrip(generate: boolean) {
  if (!pendingTrip.value || !pendingValue.value) return

  const row = pendingTrip.value
  const prev = row.status
  row.status = pendingValue.value
  generatingInvoice.value = true

  try {
    await store.updateStatus(row.id, pendingValue.value, generate)
    if (generate) {
      const result = await DocumentsSalesService.generateFromTrip(row.id)
      generateResult.value = result
    }
  } catch {
    row.status = prev
  } finally {
    generatingInvoice.value = false
    showCompleteModal.value = false
    pendingTrip.value = null
    pendingValue.value = null
  }
}

function openCreate() {
  router.push('/logistica/viajes/create')
}

function openEdit(row: any) {
  // console.log(row.id)
  router.push(`/logistica/viajes/${row.id}`)
}

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}
const columns = tripsColumns({
  onEdit: openEdit,
  onSortFieldSelect,
  onInlineSave: async <K extends EditableField>(row: Trip, field: K, value: EditableValue<K>) => {
    // ✅ Capturá ANTES de cualquier mutación
    const tableApi = tableRef.value?.table?.tableApi
    const pageIndex = tableApi?.getState().pagination.pageIndex

    const prev = row[field]
    row[field] = value ?? prev

    try {
      await store.update(row.id, { [field]: value ?? undefined })
    } catch {
      row[field] = prev
    } finally {
      nextTick(() => {
        // ✅ Re-accedé al api después del render
        tableRef.value?.table?.tableApi?.setPageIndex(pageIndex ?? 0)
      })
    }
  },
  onToggleStatus: async (row, value) => {
    if (value === 'COMPLETED') {
      pendingTrip.value = row
      pendingValue.value = value
      generateResult.value = null
      showCompleteModal.value = true
      return
    }
    const prev = row.status
    row.status = value
    try {
      await store.updateStatus(row.id, value)
    } catch {
      row.status = prev
    }
  }
})

// ========================================
// ACTIONS
// ========================================

onMounted(async () => {
  await store.fetchAll()
  // console.log(items)
  loading.value = store.loading
})

const activeTab = ref('viajes')

const itemsTabs: TabsItem[] = [
  { label: 'Viajes', value: 'viajes' },
  { label: 'Otro', value: 'otro' }
]

const title = computed(() => (activeTab.value === 'viajes' ? 'Viajes' : 'Otro módulo'))

const description = computed(() => (activeTab.value === 'viajes' ? 'Listado de Viajes' : 'Otra funcionalidad distinta'))

const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo Viaje',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])
const filterFields: FilterField[] = [
  {
    id: 'reference_number',
    label: 'Filtrar por referencia...',
    class: 'w-48'
  },
  {
    id: 'week',
    label: 'Filtrar por semana...',
    class: 'w-32'
  },
  {
    id: 'origin',
    label: 'Filtrar por origen...',
    class: 'w-40'
  },
  {
    id: 'destination',
    label: 'Filtrar por destino...',
    class: 'w-40'
  },
  {
    id: 'orders',
    label: 'Filtrar por orden o cliente...',
    class: 'w-64'
  },
  {
    id: 'vehicle_combination',
    label: 'Filtrar por unidad, patente o chofer...',
    class: 'w-72'
  }
]
const sortFields: SortField[] = [
  {
    label: 'Referencia',
    value: 'reference_number'
  },
  {
    label: 'Semana',
    value: 'week'
  },
  {
    label: 'Estado',
    value: 'status'
  },
  {
    label: 'Origen',
    value: 'origin'
  },
  {
    label: 'Destino',
    value: 'destination'
  },
  {
    label: 'Órdenes / Clientes',
    value: 'orders'
  },
  {
    label: 'Combinación',
    value: 'vehicle_combination'
  },
  {
    label: 'Salida',
    value: 'departure_time'
  },
  {
    label: 'Llegada',
    value: 'arrival_time'
  },
  {
    label: 'Fecha Creación',
    value: 'created_at'
  }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader :title="title" :description="description" :links="links" />

    <!-- 🔥 Contenido dinámico -->
    <LogisticaTable
      v-if="activeTab === 'viajes'"
      ref="tableRef"
      :loading="loading"
      :data="items"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />

    <TripPlanner :tripId="'12'" v-else />
  </UPage>

  <!-- Modal confirmación completar viaje -->
  <UModal v-model:open="showCompleteModal" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div class="p-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold">Completar viaje</h2>
          <p class="text-sm text-muted mt-1">
            El viaje pasará a estado <strong>Completado</strong>.
          </p>
        </div>

        <UAlert
          v-if="generateResult"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle"
          :title="`Generados: ${generateResult.created} — Existentes: ${generateResult.skipped}`"
        />

        <div class="flex justify-end gap-2 pt-2 border-t border-default">
          <UButton
            label="Solo completar"
            variant="ghost"
            color="neutral"
            :disabled="generatingInvoice"
            @click="handleCompleteTrip(false)"
          />
          <UButton
            label="Sí, generar factura"
            icon="i-lucide-file-plus"
            :loading="generatingInvoice"
            @click="handleCompleteTrip(true)"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
