<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import { orderColumns } from '~/modulos/logistica/maintenance/columns/orders.columns'
import type { MaintenanceOrder } from '~/modulos/logistica/maintenance/types/maintenance.types'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import type { ButtonProps } from '@nuxt/ui'

const router = useRouter()
const store = useMaintenanceStore()
const { orders, loading } = storeToRefs(store)

const sorting = ref<SortingState>([])

function openCreate() {
  router.push('/logistica/mantenimiento/nueva')
}

function goToDetail(row: MaintenanceOrder) {
  router.push(`/logistica/mantenimiento/${row.id}`)
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

const columns = orderColumns({
  onEdit: goToDetail,
  onSortFieldSelect
})

const links = ref<ButtonProps[]>([
  {
    label: 'Nueva Orden',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])

const filterFields: FilterField[] = [
  { id: 'status', label: 'Estado...', class: 'w-48' },
  { id: 'priority', label: 'Prioridad...', class: 'w-48' },
  { id: 'category', label: 'Categoría...', class: 'w-48' },
  { id: 'vehicle', label: 'Vehículo...', class: 'w-40' }
]

const sortFields: SortField[] = [
  { label: 'Número', value: 'number' },
  { label: 'Título', value: 'title' },
  { label: 'Estado', value: 'status' },
  { label: 'Prioridad', value: 'priority' },
  { label: 'Categoría', value: 'category' },
  { label: 'Programada', value: 'scheduled_at' },
  { label: 'Costo', value: 'actual_cost' }
]

onMounted(async () => {
  await store.fetchOrders()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Órdenes de Mantenimiento"
      description="Listado de órdenes de mantenimiento"
      :links="links"
    />
    <LogisticaTable
      :loading="loading"
      :data="orders"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
