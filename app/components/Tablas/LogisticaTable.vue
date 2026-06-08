<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { SortingState } from '@tanstack/vue-table'

import type { UTableInstance, ExtendedColumn } from './types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useColumnVisibility } from '@/composables/table/useColumnVisibility'

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
}>()
const sorting = defineModel<SortingState>('sorting', {
  default: () => []
})

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

const { columnVisibility, columnVisibilityItems } = useColumnVisibility(table)

/* ========================
   Selección
======================== */

const selectedRows = computed<T[]>(
  () => table.value?.tableApi?.getFilteredSelectedRowModel().rows.map((r) => r.original) ?? []
)
const selectedCount = computed<number>(() => selectedRows.value.length)
const totalCount = computed<number>(() => table.value?.tableApi?.getFilteredRowModel().rows.length ?? 0)

/* ========================
   Pagination
======================== */

const pagination = ref({ pageIndex: 0, pageSize: 15 })

/* ========================
   Acciones
======================== */

function confirmDelete(): void {
  emit('delete:rows', selectedRows.value)
  rowSelection.value = {}
  showDeleteModal.value = false
}
</script>

<template>
  <div class="flex-1 w-full pb-20">
    <!-- ========================
         Toolbar (si hay filterFields o sortFields)
    ========================= -->

    <TableToolbar
      v-if="filterFields?.length || sortFields?.length"
      :table="table"
      :columns="columns"
      v-model:sorting="sorting"
      :filter-fields="filterFields ?? []"
      :sort-fields="sortFields ?? []"
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
      :columns="props.columns"
      :loading="props.loading"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false
      }"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
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
        :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
        :items-per-page="table?.tableApi?.getState().pagination.pageSize"
        :total="totalCount"
        @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
      />
    </div>

    <!-- ========================
         Selection Bar
    ========================= -->

    <TableSelectionBar :count="selectedCount" @open-delete="showDeleteModal = true" />

    <!-- ========================
         Delete Modal
    ========================= -->

    <DeleteConfirmModal
      :open="showDeleteModal"
      :count="selectedCount"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
