<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import { tireColumns } from '~/modulos/logistica/maintenance/columns/tires.columns'
import type { Tire } from '~/modulos/logistica/maintenance/types/maintenance.types'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import type { ButtonProps } from '@nuxt/ui'

const router = useRouter()
const store = useMaintenanceStore()
const { tires, loading } = storeToRefs(store)

const sorting = ref<SortingState>([])

function openCreate() {
  router.push('/logistica/mantenimiento/cubiertas/nueva')
}

function goToDetail(row: Tire) {
  router.push(`/logistica/mantenimiento/cubiertas/${row.id}`)
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

const columns = tireColumns({
  onEdit: goToDetail,
  onSortFieldSelect
})

const links = ref<ButtonProps[]>([
  {
    label: 'Nueva Cubierta',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])

const filterFields: FilterField[] = [
  { id: 'status', label: 'Estado...', class: 'w-48' },
  { id: 'vehicle', label: 'Vehículo...', class: 'w-40' },
  { id: 'warehouse', label: 'Depósito...', class: 'w-40' },
  { id: 'serial_number', label: 'Serial...', class: 'w-40' }
]

const sortFields: SortField[] = [
  { label: 'Serial', value: 'serial_number' },
  { label: 'Producto', value: 'product' },
  { label: 'Estado', value: 'status' },
  { label: 'Km Acumulados', value: 'accumulated_km' },
  { label: 'Días en Uso', value: 'days_in_use' },
  { label: 'Fecha Alta', value: 'created_at' }
]

onMounted(async () => {
  await store.fetchTires()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Cubiertas"
      description="Listado de cubiertas"
      :links="links"
    />
    <LogisticaTable
      :loading="loading"
      :data="tires"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
