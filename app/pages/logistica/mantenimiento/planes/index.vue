<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import { planColumns } from '~/modulos/logistica/maintenance/columns/plans.columns'
import type { MaintenancePlan } from '~/modulos/logistica/maintenance/types/maintenance.types'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import type { ButtonProps } from '@nuxt/ui'

const router = useRouter()
const store = useMaintenanceStore()
const { plans, loading } = storeToRefs(store)

const sorting = ref<SortingState>([])

function openCreate() {
  router.push('/logistica/mantenimiento/planes/nuevo')
}

function goToDetail(row: MaintenancePlan) {
  router.push(`/logistica/mantenimiento/planes/${row.id}`)
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

const columns = planColumns({
  onEdit: goToDetail,
  onSortFieldSelect
})

const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo Plan',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])

const filterFields: FilterField[] = [
  { id: 'asset_type', label: 'Tipo Activo...', class: 'w-48' },
  { id: 'category', label: 'Categoría...', class: 'w-48' },
  { id: 'active', label: 'Activo...', class: 'w-32' }
]

const sortFields: SortField[] = [
  { label: 'Nombre', value: 'name' },
  { label: 'Tipo Activo', value: 'asset_type' },
  { label: 'Categoría', value: 'category' },
  { label: 'Prioridad', value: 'priority' },
  { label: 'Costo Estimado', value: 'estimated_cost' }
]

onMounted(async () => {
  await store.fetchPlans()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Planes de Mantenimiento"
      description="Listado de planes preventivos y predictivos"
      :links="links"
    />
    <LogisticaTable
      :loading="loading"
      :data="plans"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
