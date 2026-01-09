<script setup lang="ts">
import { h, resolveComponent, computed, ref, watch } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { tableRenderers } from '@/utils/tableRenderers'

import type { TableColumn } from '@nuxt/ui'
import type { CellContext } from '@tanstack/vue-table'
import type { CellRenderer } from '@/utils/tableRenderers'
import type { ColumnConfig } from '@/utils/tableTypes'

const UCheckbox = resolveComponent('UCheckbox')

/**
 * Props
 */
const props = defineProps<{
  data: {
    cols: string[]
    rows: Record<string, any>[]
    total: number
  } | null
  loading?: boolean
  selectable?: boolean
  columnConfig?: Record<string, ColumnConfig>
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'selection-change', rows: any[]): void
}>()

/**
 * Refs
 */
const tableRef = ref<HTMLElement | null>(null)
const rowSelection = ref<Record<string, boolean>>({})
const pagination = ref({
  pageIndex: 0,
  pageSize: 5
})

// Estados para el checkbox de selección múltiple
const allSelected = ref(false)
const indeterminate = ref(false)

/**
 * Utils
 */
const humanize = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/id$/i, '')
    .replace(/\b\w/g, (l) => l.toUpperCase())

/**
 * Columnas base sin la columna de selección
 */
const baseColumns = computed<TableColumn<any>[]>(() => {
  if (!props.data?.cols) return []

  return props.data.cols.map((col) => {
    const config = props.columnConfig?.[col]
    const renderer: CellRenderer = tableRenderers[config?.renderer ?? 'text']

    return {
      id: col,
      accessorKey: col,
      header: config?.label || humanize(col),
      cell: ({ row }: CellContext<any, unknown>) =>
        h(
          'div',
          {
            class: [
              config?.align === 'right' && 'text-right',
              config?.align === 'center' && 'text-center'
            ]
          },
          renderer(row.getValue(col), row.original)
        )
    }
  })
})

/**
 * Columnas completas (con selección si está habilitado)
 */
const columns = computed<TableColumn<any>[]>(() => {
  if (!props.selectable) return baseColumns.value

  const selectColumn: TableColumn<any> = {
    id: 'select',
    header: () =>
      h(UCheckbox, {
        modelValue: indeterminate.value ? 'indeterminate' : allSelected.value,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          const isChecked = value === true

          // Actualizar el estado
          allSelected.value = isChecked
          indeterminate.value = false

          // Actualizar todas las filas
          const currentRows = props.data?.rows || []
          const newSelection: Record<string, boolean> = {}

          if (isChecked) {
            currentRows.forEach((_, index) => {
              newSelection[index.toString()] = true
            })
          }

          rowSelection.value = newSelection
        }
      }),
    cell: ({ row }: CellContext<any, unknown>) => {
      const rowIndex = row.index.toString()
      const isSelected = !!rowSelection.value[rowIndex]

      return h(UCheckbox, {
        modelValue: isSelected,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          const newSelection = { ...rowSelection.value }

          if (value === true) {
            newSelection[rowIndex] = true
          } else {
            delete newSelection[rowIndex]
          }

          rowSelection.value = newSelection
        }
      })
    }
  }

  return [selectColumn, ...baseColumns.value]
})

/**
 * Filas seleccionadas
 */
const selectedRows = computed(() => {
  if (!props.selectable || !props.data?.rows) return []

  const selectedIndices = Object.keys(rowSelection.value)
  return props.data.rows.filter(
    (_, index) => rowSelection.value[index.toString()]
  )
})

/**
 * Contador de filas seleccionadas
 */
const selectedCount = computed(() => {
  return Object.keys(rowSelection.value).length
})

/**
 * Watchers
 */
watch(
  rowSelection,
  () => {
    const totalRows = props.data?.rows?.length || 0
    const currentSelectedCount = selectedCount.value

    // Actualizar estados del checkbox de cabecera
    allSelected.value = currentSelectedCount === totalRows && totalRows > 0
    indeterminate.value =
      currentSelectedCount > 0 && currentSelectedCount < totalRows

    // Emitir evento
    emit('selection-change', selectedRows.value)
  },
  { deep: true }
)

// Resetear selección cuando cambian los datos
watch(
  () => props.data?.rows,
  () => {
    rowSelection.value = {}
    allSelected.value = false
    indeterminate.value = false
  }
)

/**
 * Manejo de paginación
 */
const handlePageChange = (page: number) => {
  const tableApi = (tableRef.value as any)?.tableApi
  if (tableApi) {
    tableApi.setPageIndex(page - 1)
  }
}

// Información de paginación actual
const currentPage = computed(() => {
  const tableApi = (tableRef.value as any)?.tableApi
  return (tableApi?.getState().pagination.pageIndex || 0) + 1
})

const currentPageSize = computed(() => {
  const tableApi = (tableRef.value as any)?.tableApi
  return tableApi?.getState().pagination.pageSize || 5
})
</script>

<template>
  <div class="flex-1 w-full">
    <UTable
      ref="tableRef"
      v-model:pagination="pagination"
      :data="data?.rows || []"
      :columns="columns"
      :loading="loading"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel()
      }"
      sticky
    />

    <div
      class="flex justify-between items-center border-t border-default py-4 px-4"
    >
      <div v-if="selectable" class="text-sm text-muted">
        {{ selectedCount }} fila(s) seleccionadas
      </div>

      <UPagination
        v-if="data?.total"
        :page="currentPage"
        :items-per-page="currentPageSize"
        :total="data.total"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>
