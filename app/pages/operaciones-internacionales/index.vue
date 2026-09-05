<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { operationColumns } from './columns'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const router = useRouter()

const {
  items,
  loading,
  init,
  remove
} = useInternationalOperations()

const sorting = ref<SortingState>([])

onMounted(() => init())

const openDetail = (row: any) => router.push(`/operaciones-internacionales/${row.id}`)

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = operationColumns({ onOpen: openDetail, onSortFieldSelect })

const filterFields: FilterField[] = [
  { id: 'number', label: 'Filtrar por Nº...', class: 'w-40' },
  { id: 'primary_supplier', label: 'Filtrar por proveedor...', class: 'w-48' },
  { id: 'origin_country', label: 'Filtrar por país origen...', class: 'w-40' },
  { id: 'destination_country', label: 'Filtrar por país destino...', class: 'w-40' }
]

const sortFields: SortField[] = [
  { label: 'Nº', value: 'number' },
  { label: 'Estado', value: 'status' },
  { label: 'ETA', value: 'estimated_arrival_date' },
  { label: 'Proveedor', value: 'primary_supplier' },
  { label: 'Origen', value: 'origin_country' },
  { label: 'Destino', value: 'destination_country' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Operaciones Internacionales" description="Gestión de importaciones y operaciones de comercio exterior">
      <template #links>
        <UButton label="Nueva operación" icon="i-lucide-plus" color="primary" to="/operaciones-internacionales/create" />
      </template>
    </AppPageHeader>

    <LogisticaTable
      :loading="loading"
      :data="items"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
