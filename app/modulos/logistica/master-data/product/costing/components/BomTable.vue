<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { bomColumns } from '~/modulos/logistica/master-data/product/costing/columns/BomColumns'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import TableToolbar from '~/components/Tablas/TableToolbar.vue'

const { init, withCostTemplate, loading } = useProducts()

const sorting = ref<SortingState>([])
const tableRef = ref()

const filterFields: FilterField[] = [
  { id: 'sku', label: 'Filtrar por SKU...', class: 'w-40' },
  { id: 'name', label: 'Filtrar por nombre...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'SKU', value: 'sku' },
  { label: 'Nombre', value: 'name' },
  { label: 'Costo Actual', value: 'current_cost' },
  { label: 'Tipo de producto', value: 'product_type' },
  { label: 'Último Cálculo', value: 'last_cost_calculated_at' },
  { label: 'Fecha Creación', value: 'created_at' },
  { label: 'Fecha Eliminación', value: 'deleted_at' }
]

// ✅ Callback que recibe el click del header
function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false // toggle si es la misma columna
    }
  ]
}

const columns = bomColumns({ onSortFieldSelect })

onMounted(async () => {
  await init()
})
</script>

<template>
  <div class="border border-default rounded-lg overflow-hidden">
    <TableToolbar
      :table="tableRef"
      :columns="columns"
      v-model:sorting="sorting"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
    />

    <UTable ref="tableRef" :data="withCostTemplate" :columns="columns" :loading="loading" :sorting="sorting" />
  </div>
</template>
