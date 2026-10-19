<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed, h } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { SortingState } from '@tanstack/vue-table'
import type { TableFilter } from './types/tablas.types'
import { UCheckbox } from '#components'

import type { UTableInstance, ExtendedColumn } from './types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useColumnVisibility } from '@/composables/table/useColumnVisibility'
import { useAuthStore } from '~/modulos/auth/auth.store'

import DeleteConfirmModal from './DeleteConfirmModal.vue'
import TableSelectionBar from './TableSelectionBar.vue'
import TableToolbar from '~/components/Tablas/TableToolbar.vue'

/* ========================
   Props / Emits
======================== */

const props = defineProps<{
  data: T[]
  columns: ExtendedColumn<T>[]
  loading?: boolean
  filterFields?: FilterField[]
  sortFields?: SortField[]
  onDelete?: (rows: T[]) => Promise<void>
  deletePermanently?: boolean
  selectable?: boolean
  canSelectRow?: (row: T) => boolean
  serverSide?: boolean
  totalRows?: number
  pageSize?: number
  storageKey?: string
  searchPlaceholder?: string
}>()
const sorting = defineModel<SortingState>('sorting', {
  default: () => []
})
const page = defineModel<number>('page', { default: 1 })
const search = defineModel<string>('search', { default: '' })
const filters = defineModel<TableFilter[]>('filters', { default: () => [] })

const emit = defineEmits<{
  'delete:rows': [rows: T[]]
}>()

/* ========================
   Tabla
======================== */

const table = useTemplateRef<UTableInstance<T>>('table')

defineExpose({ table })

const rowSelection = ref<Record<string, boolean>>({})
const showDeleteModal = ref(false)

const route = useRoute()
const authStore = useAuthStore()
const visibilityStorageKey = computed(() => {
  const companyId = authStore.selectedCompany?.id ?? 'no-company'
  const userId = authStore.user?.id ?? 'anonymous'
  return `${companyId}:${userId}:${props.storageKey ?? route.path}`
})
const { columnVisibility, columnVisibilityItems, resetColumnVisibility } = useColumnVisibility(table, {
  storageKey: visibilityStorageKey
})

const tableColumns = computed<ExtendedColumn<T>[]>(() => {
  if (!props.selectable) return props.columns

  const selectColumn: ExtendedColumn<T> = {
    id: 'select',
    meta: { label: 'Selección', filter: false, disableColumnVisibility: true },
    enableHiding: false,
    header: ({ table: tableApi }: any) => {
      const eligibleRows = tableApi
        .getRowModel()
        .rows.filter((row: any) => props.canSelectRow?.(row.original) ?? true)
      const allSelected = eligibleRows.length > 0 && eligibleRows.every((row: any) => row.getIsSelected())
      const someSelected = eligibleRows.some((row: any) => row.getIsSelected())

      return h(UCheckbox, {
        modelValue: someSelected && !allSelected ? 'indeterminate' : allSelected,
        disabled: eligibleRows.length === 0,
        'aria-label': 'Seleccionar filas permitidas',
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          eligibleRows.forEach((row: any) => row.toggleSelected(!!value))
      })
    },
    cell: ({ row }: any) => {
      const enabled = props.canSelectRow?.(row.original) ?? true
      return h(UCheckbox, {
        modelValue: row.getIsSelected(),
        disabled: !enabled,
        'aria-label': enabled ? 'Seleccionar fila' : 'Esta fila no se puede seleccionar',
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value)
      })
    }
  }

  return [
    selectColumn,
    ...props.columns.filter(column => !('id' in column) || column.id !== 'select')
  ]
})

/* ========================
   Selección
======================== */

const selectedCount = computed<number>(
  () => Object.values(rowSelection.value).filter(Boolean).length
)

const selectedRows = computed<T[]>(() => {
  // La dependencia explícita hace reactiva la consulta al modelo interno de UTable.
  void rowSelection.value
  return table.value?.tableApi?.getFilteredSelectedRowModel().rows.map(row => row.original) ?? []
})
const totalCount = computed<number>(() => props.serverSide
  ? (props.totalRows ?? 0)
  : (table.value?.tableApi?.getFilteredRowModel().rows.length ?? 0))

/* ========================
   Pagination
======================== */

const pagination = ref({ pageIndex: 0, pageSize: props.pageSize ?? 15 })

watch(page, (value) => {
  if (props.serverSide && pagination.value.pageIndex !== value - 1) pagination.value.pageIndex = value - 1
})

watch(() => props.pageSize, (value) => {
  if (value) pagination.value.pageSize = value
})

watch(search, () => {
  if (props.serverSide) page.value = 1
})

/* ========================
   Acciones
======================== */

const deleting = ref(false)

async function confirmDelete(): Promise<void> {
  if (!props.onDelete) return
  deleting.value = true
  try {
    await props.onDelete(selectedRows.value)
    rowSelection.value = {}
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}
</script>

<template>
  <div class="flex-1 w-full pb-20">
    <!-- ========================
         Toolbar (si hay filterFields o sortFields)
    ========================= -->

    <TableToolbar
      v-if="filterFields?.length || sortFields?.length || columns?.length"
      :table="table"
      :columns="tableColumns"
      v-model:sorting="sorting"
      v-model:search="search"
      v-model:filters="filters"
      :server-side="serverSide"
      :search-placeholder="searchPlaceholder"
      :filter-fields="filterFields ?? []"
      :sort-fields="sortFields ?? []"
      :column-visibility-items="columnVisibilityItems"
      @reset-columns="resetColumnVisibility"
    />

    <TableSelectionBar
      v-if="onDelete && selectedCount > 0"
      :count="selectedCount"
      class="mb-2"
      @open-delete="showDeleteModal = true"
    />

    <!-- ========================
         Tabla
    ========================= -->

    <UTable
      ref="table"
      v-model:pagination="pagination"
      v-model:row-selection="rowSelection"
      v-model:column-visibility="columnVisibility"
      v-model:sorting="sorting"
      sticky
      :get-row-id="(row: T) => (row as any).id"
      :data="props.data"
      :columns="tableColumns"
      :loading="props.loading"
      :pagination-options="serverSide
        ? { manualPagination: true, rowCount: totalCount, autoResetPageIndex: false }
        : { getPaginationRowModel: getPaginationRowModel(), autoResetPageIndex: false }"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:transition-colors [&>tr:hover]:bg-elevated/70 [&>tr]:last:[&>td]:border-b-0',
        th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r py-0.5',
        td: 'border-b border-default'
      }"
      :class="['max-h-[75vh] overflow-y-auto', selectedCount > 0 ? 'rounded-b-lg rounded-t-none' : 'rounded-lg']"
    />

    <!-- ========================
         Footer
    ========================= -->

    <div class="flex items-center justify-between border-t border-default bg-muted/30 px-4 py-2">
      <div class="text-xs text-muted">{{ selectedCount }} seleccionadas • {{ totalCount }} totales</div>

      <UPagination
        size="sm"
        :page="serverSide ? page : (table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
        :items-per-page="serverSide ? (pageSize ?? 25) : table?.tableApi?.getState().pagination.pageSize"
        :total="totalCount"
        @update:page="(p) => serverSide ? (page = p) : table?.tableApi?.setPageIndex(p - 1)"
      />
    </div>

    <!-- ========================
         Delete Modal
    ========================= -->

    <DeleteConfirmModal
      v-if="onDelete"
      :open="showDeleteModal"
      :count="selectedCount"
      :loading="deleting"
      :permanent="deletePermanently"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
