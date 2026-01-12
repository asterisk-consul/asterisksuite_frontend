//HOLA
<script setup lang="ts">
import {
  h,
  resolveComponent,
  computed,
  ref,
  onMounted,
  watch,
  nextTick,
  shallowRef
} from 'vue'
import {
  getPaginationRowModel,
  getFilteredRowModel,
  type FilterFn
} from '@tanstack/vue-table'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { useDraggable } from 'vue-draggable-plus'
import FiltroDateCompras from '../compras/FiltroDateCompras.vue'
import { sub } from 'date-fns'

/* UI */
const UCheckbox = resolveComponent('UCheckbox')
const UButton = resolveComponent('UButton')
const UKbd = resolveComponent('UKbd')
const UIcon = resolveComponent('UIcon')
const UInput = resolveComponent('UInput')
const USelectMenu = resolveComponent('USelectMenu')

/* PROPS */
const props = defineProps<{
  data: {
    rows: Record<string, any>[]
    total: number
  } | null
  loading?: boolean
  selectable?: boolean
  deletable?: boolean
  tableKey: string
  pageSize?: number
}>()

/* EMITS */
const emit = defineEmits<{
  (e: 'delete-selected', rows: any[]): void
  (e: 'reorder', rows: any[]): void
}>()

/* ESTADO */
const tableRef = ref<any>(null)
const rowSelection = ref({})
const pagination = ref({
  pageIndex: 0,
  pageSize: props.pageSize || 10
})

/* RANGO DE FECHAS */
const range = shallowRef<DateRange>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

/* COLUMNA DE FECHA A FILTRAR */
const dateColumn = ref<{ label: string; value: string }>({
  label: 'Sin Filtro',
  value: 'sinFiltro'
})

const dateColumns = [
  { label: 'Sin Filtro', value: 'sinFiltro' },
  { label: 'Fecha', value: 'fecha' },
  { label: 'Fecha compromiso', value: 'fechacompromiso' },
  { label: 'Fecha vencimiento', value: 'fechavencimiento' },
  { label: 'Creación', value: 'creationdate' }
]

/* BÚSQUEDA */
const searchScopes = ref<string[]>([])
const searchQuery = ref('')

const searchColumns = [
  { label: 'ID', value: 'id' },
  { label: 'Cliente', value: 'clientname' },
  { label: 'Referencia', value: 'referenciatexto' },
  { label: 'Total', value: 'total' }
]
const useGlobalSearch = computed(() => {
  return searchScopes.value.length === 0
})

/* FILTRO FECHA (TanStack) */
const dateRangeFilter: FilterFn<any> = (row, columnId, value) => {
  if (!value?.start || !value?.end) return true
  const raw = row.getValue(columnId)
  if (!raw) return false
  const d = new Date(raw)
  return d >= value.start && d <= value.end
}

/* FILTROS DERIVADOS */
const globalFilter = computed(() =>
  useGlobalSearch.value ? searchQuery.value : ''
)
const columnFilters = computed(() => {
  const filters: { id: string; value: unknown }[] = []

  // 🔹 Filtro de fecha
  if (
    dateColumn.value.value !== 'sinFiltro' &&
    range.value?.start &&
    range.value?.end
  ) {
    filters.push({
      id: dateColumn.value.value,
      value: range.value
    })
  }

  // 🔹 Búsqueda avanzada OR
  if (
    !useGlobalSearch.value &&
    searchQuery.value &&
    searchScopes.value.length
  ) {
    filters.push({
      id: 'multiSearch',
      value: {
        query: searchQuery.value,
        scopes: searchScopes.value
      }
    })
  }

  return filters
})

/* DATA LOCAL (para drag) */
const tableData = ref([...(props.data?.rows || [])])

watch(
  () => props.data?.rows,
  (rows) => {
    tableData.value = [...(rows || [])]
  },
  { deep: true }
)

/* COLUMNAS */
const DRAG_COLUMN: TableColumn<any> = {
  id: 'drag',
  header: '',
  cell: () =>
    h('div', { class: 'drag-handle cursor-grab flex justify-center' }, [
      h(UIcon, {
        name: 'i-lucide-grip-vertical',
        class: 'w-5 h-5 text-gray-400'
      })
    ])
}

const SELECT_COLUMN: TableColumn<any> = {
  id: 'select',
  header: ({ table }) =>
    h(UCheckbox, {
      modelValue: table.getIsSomePageRowsSelected()
        ? 'indeterminate'
        : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (v) => table.toggleAllPageRowsSelected(!!v)
    }),
  cell: ({ row }) =>
    h(UCheckbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (v) => row.toggleSelected(!!v)
    })
}

const DATA_COLUMNS: TableColumn<any>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    filterFn: dateRangeFilter
  },
  {
    accessorKey: 'fechacompromiso',
    header: 'Fecha compromiso',
    filterFn: dateRangeFilter
  },
  {
    accessorKey: 'fechavencimiento',
    header: 'Fecha vencimiento',
    filterFn: dateRangeFilter
  },
  {
    accessorKey: 'creationdate',
    header: 'Creación',
    filterFn: dateRangeFilter
  },
  { accessorKey: 'clientname', header: 'Cliente' },
  { accessorKey: 'referenciatexto', header: 'Referencia' },
  { accessorKey: 'total', header: 'Total' }
]

const tableColumns = ref<TableColumn<any>[]>([])

const multiColumnSearchFilter: FilterFn<any> = (row, _columnId, value) => {
  const { query, scopes } = value || {}
  if (!query || !scopes?.length) return true

  const q = String(query).toLowerCase()

  return scopes.some((scope: any) => {
    const columnId = typeof scope === 'string' ? scope : scope?.value // ← clave real

    if (!columnId) return false

    const cell = row.getValue(columnId)
    return String(cell ?? '')
      .toLowerCase()
      .includes(q)
  })
}

const SEARCH_COLUMN: TableColumn<any> = {
  id: 'multiSearch',
  header: '',
  filterFn: multiColumnSearchFilter
}

const initColumns = () => {
  const cols = [DRAG_COLUMN, SEARCH_COLUMN, ...DATA_COLUMNS]
  if (props.selectable) cols.splice(1, 0, SELECT_COLUMN)
  tableColumns.value = cols
}

initColumns()
watch(() => props.selectable, initColumns)

/* DRAG */
onMounted(async () => {
  await nextTick()
  const tbody = tableRef.value?.$el.querySelector('tbody')
  if (tbody) {
    useDraggable(tbody, tableData, {
      handle: '.drag-handle',
      draggable: 'tr',
      animation: 150,
      onEnd: () => emit('reorder', tableData.value)
    })
  }
})

/* SELECCIÓN */
const selectedCount = computed(() => Object.keys(rowSelection.value).length)

const handleDeleteConfirm = () => {
  const selectedRows =
    tableRef.value?.tableApi
      ?.getSelectedRowModel()
      .rows.map((r: any) => r.original) || []
  emit('delete-selected', selectedRows)
  rowSelection.value = {}
}

/* PAGINACIÓN */
const getPaginationInfo = () => {
  const table = tableRef.value?.tableApi
  if (!table) return { page: 1, size: 10, total: 0 }

  return {
    page: table.getState().pagination.pageIndex + 1,
    size: table.getState().pagination.pageSize,
    total: props.data?.total || 0
  }
}

/* COLUMNAS VISIBLES */
const getColumnItems = () => {
  const table = tableRef.value?.tableApi
  if (!table) return []

  return [
    table
      .getAllColumns()
      .filter((column: any) => column.getCanHide())
      .map((column: any) => ({
        label: column.columnDef.header,
        icon: column.getIsVisible()
          ? 'i-lucide-check-square'
          : 'i-lucide-square',
        click: () => column.toggleVisibility()
      }))
  ]
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end gap-4">
      <TablasDeleteModal
        v-if="deletable && selectable"
        :count="selectedCount"
        @confirm="handleDeleteConfirm"
      >
        <UButton
          v-show="selectedCount > 0"
          label="Eliminar"
          color="error"
          variant="subtle"
          icon="i-lucide-trash"
        >
          <template #trailing>
            <UKbd>{{ selectedCount }}</UKbd>
          </template>
        </UButton>
      </TablasDeleteModal>

      <UDropdownMenu
        :items="getColumnItems()"
        :content="{ align: 'end' }"
        :ui="{ content: 'max-h-64 overflow-y-auto' }"
      >
        <UButton
          label="Columnas"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-columns"
        />
      </UDropdownMenu>
    </div>
    <div>
      <FiltroDateCompras v-model="range" class="-ms-1" />

      <USelectMenu
        v-model="dateColumn"
        :items="dateColumns"
        option-attribute="label"
        value-attribute="value"
        class="w-52"
      />
    </div>

    <div class="flex items-center gap-2 mb-4">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Buscar..."
        class="w-full max-w-sm"
      />
      <USelectMenu
        v-model="searchScopes"
        :items="searchColumns"
        option-attribute="label"
        value-attribute="value"
        multiple
        placeholder="Búsqueda avanzada (opcional)"
        class="w-64"
      />
    </div>

    <UTable
      ref="tableRef"
      v-model:row-selection="rowSelection"
      v-model:pagination="pagination"
      v-model:global-filter="globalFilter"
      v-model:column-filters="columnFilters"
      :data="tableData"
      :columns="tableColumns"
      :loading="loading"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      :get-filtered-row-model="getFilteredRowModel()"
      sticky
      class="border border-default rounded-lg"
    />

    <div
      class="flex justify-between items-center border-t border-default py-4 px-4"
    >
      <div v-if="selectable" class="text-sm text-muted">
        {{ selectedCount }} fila(s) seleccionadas
      </div>

      <UPagination
        :page="getPaginationInfo().page"
        :items-per-page="getPaginationInfo().size"
        :total="getPaginationInfo().total"
        @update:page="(p) => tableRef?.tableApi?.setPageIndex(p - 1)"
      />
    </div>
  </div>
</template>

<style scoped>
/* Estilo para la fila que se está moviendo */
:deep(.sortable-ghost) {
  opacity: 0.4;
  background: rgb(var(--color-primary-500) / 0.1);
}

:deep(.sortable-chosen) {
  background: rgb(var(--color-neutral-100));
}
</style>
