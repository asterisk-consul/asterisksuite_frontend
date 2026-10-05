<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { bomColumns } from '~/modulos/logistica/master-data/product/costing/columns/BomColumns'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import TableToolbar from '~/components/Tablas/TableToolbar.vue'

const { init, products, loading } = useProducts()
const bomProducts = computed(() => products.value.filter(product => ['BOM', 'ENGINEERING'].includes(product.cost_source)))

const sorting = ref<SortingState>([])
const tableRef = ref()

const router = useRouter()

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
const openEdit = (row: any) => {
  router.push(`/bom/${row.id}`)
}

const columns = bomColumns({ onSortFieldSelect, onEdit: openEdit })

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
    <UTable ref="tableRef" :data="bomProducts" :columns="columns" :loading="loading" :sorting="sorting">
      <template #empty>
        <div class="flex flex-col items-center gap-3 py-12 text-center">
          <div class="rounded-full bg-elevated p-3"><UIcon name="i-lucide-git-branch" class="size-6 text-muted" /></div>
          <div>
            <p class="font-medium">Todavía no hay estructuras BOM</p>
            <p class="text-sm text-muted">Creá un producto terminado y definí los materiales necesarios para fabricarlo.</p>
          </div>
          <UButton label="Crear BOM" icon="i-lucide-plus" to="/bom/create" />
        </div>
      </template>
    </UTable>
  </div>
</template>
