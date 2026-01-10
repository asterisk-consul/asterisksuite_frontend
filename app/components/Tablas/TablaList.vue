<script setup lang="ts">
import { h, resolveComponent, computed, ref, onMounted } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'

const UCheckbox = resolveComponent('UCheckbox')
const UButton = resolveComponent('UButton')
const UKbd = resolveComponent('UKbd')

/**
 * Props
 */
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

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'selection-change', rows: any[]): void
  (e: 'delete-selected', rows: any[]): void
}>()

/**
 * Refs
 */
const tableRef = ref<any>(null)
const rowSelection = ref({})
const pagination = ref({
  pageIndex: 0,
  pageSize: props.pageSize || 10
})

/**
 * =========================
 * COLUMNAS FIJAS DEL SISTEMA
 * =========================
 */
const DATA_COLUMNS: TableColumn<any>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    cell: ({ row }) =>
      row.original.fecha
        ? new Date(row.original.fecha).toLocaleDateString('es-AR')
        : '-'
  },
  { accessorKey: 'clientname', header: 'Cliente' },
  { accessorKey: 'referenciatexto', header: 'Referencia' },
  {
    accessorKey: 'totalprecio',
    header: 'Precio',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        row.original.totalprecio != null
          ? `$ ${row.original.totalprecio.toLocaleString('es-AR')}`
          : '-'
      )
  },
  {
    accessorKey: 'totalimpuestos',
    header: 'Impuestos',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        row.original.totalimpuestos != null
          ? `$ ${row.original.totalimpuestos.toLocaleString('es-AR')}`
          : '-'
      )
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right font-medium' },
        row.original.total != null
          ? `$ ${row.original.total.toLocaleString('es-AR')}`
          : '-'
      )
  },
  { accessorKey: 'vendedorid', header: 'Vendedor' }
]

/**
 * Columna de selección (AISLADA)
 */
const SELECT_COLUMN: TableColumn<any> = {
  id: 'select',
  header: ({ table }) =>
    h(UCheckbox, {
      modelValue: table.getIsSomePageRowsSelected()
        ? 'indeterminate'
        : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (v: boolean | 'indeterminate') =>
        table.toggleAllPageRowsSelected(!!v),
      ariaLabel: 'Select all'
    }),
  cell: ({ row }) =>
    h(UCheckbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (v: boolean | 'indeterminate') =>
        row.toggleSelected(!!v),
      ariaLabel: 'Select row'
    })
}

/**
 * Columnas finales (UN SOLO ARMADO)
 */
const columns = computed<TableColumn<any>[]>(() =>
  props.selectable ? [SELECT_COLUMN, ...DATA_COLUMNS] : DATA_COLUMNS
)

/**
 * =========================
 * SELECCIÓN (SIN COMPUTEDS)
 * =========================
 */
const getSelectedRows = () => {
  const model = tableRef.value?.tableApi?.getFilteredSelectedRowModel()
  return model?.rows?.map((r: any) => r.original) ?? []
}

const selectedCount = computed(() => getSelectedRows().length)

/**
 * Eliminación
 */
const handleDeleteConfirm = () => {
  const rows = getSelectedRows()
  if (!rows.length) return
  emit('delete-selected', rows)
  rowSelection.value = {}
}

/**
 * =========================
 * VISIBILIDAD DE COLUMNAS
 * (SIN WATCHERS)
 * =========================
 */
const STORAGE_KEY = `table-columns-${props.tableKey}`

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved || !tableRef.value?.tableApi) return

  const visibility = JSON.parse(saved)
  Object.entries(visibility).forEach(([id, visible]) => {
    tableRef.value.tableApi.getColumn(id)?.toggleVisibility(!!visible)
  })
})

const persistColumnVisibility = () => {
  const visibility: Record<string, boolean> = {}
  tableRef.value?.tableApi?.getAllColumns().forEach((c: any) => {
    visibility[c.id] = c.getIsVisible()
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
}

const getColumnItems = () =>
  tableRef.value?.tableApi
    ?.getAllColumns()
    .filter((c: any) => c.getCanHide())
    .map((c: any) => ({
      label: upperFirst(c.id),
      type: 'checkbox' as const,
      checked: c.getIsVisible(),
      onUpdateChecked(v: boolean) {
        c.toggleVisibility(!!v)
        persistColumnVisibility()
      },
      onSelect(e?: Event) {
        e?.preventDefault()
      }
    })) ?? []

const getPaginationInfo = () => {
  const api = tableRef.value?.tableApi
  if (!api) return { page: 1, size: 5, total: 0 }
  return {
    page: api.getState().pagination.pageIndex + 1,
    size: api.getState().pagination.pageSize,
    total: api.getFilteredRowModel()?.rows?.length ?? 0
  }
}
</script>

<template>
  <div class="flex items-center justify-end gap-4">
    <TablasDeleteModal
      v-if="deletable && selectable"
      :count="selectedCount"
      @confirm="handleDeleteConfirm"
    >
      <UButton
        v-if="selectedCount"
        label="Delete"
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

  <UTable
    ref="tableRef"
    v-model:row-selection="rowSelection"
    v-model:pagination="pagination"
    :data="data?.rows || []"
    :columns="columns"
    :loading="loading"
    :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
    sticky
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
</template>
