<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { employeeColumns } from './columns'
import { useEmployeesStore } from '~/modulos/erp/employees/store/employees.store'

const router = useRouter()
const store = useEmployeesStore()
const { items: employees, loading } = storeToRefs(store)

const sorting = ref<SortingState>([])

onMounted(() => store.fetchAll())

const openEdit = (row: any) => router.push(`/erp/rrhh/employees/${row.id}/edit`)
const openCreate = () => router.push('/erp/rrhh/employees/create')

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = employeeColumns({ onEdit: openEdit, onSortFieldSelect })

const filterFields: FilterField[] = [
  { id: 'first_name', label: 'Filtrar por Nombre...', class: 'w-40' },
  { id: 'last_name', label: 'Filtrar por Apellido...', class: 'w-40' },
  { id: 'document_number', label: 'Filtrar por Documento...', class: 'w-40' }
]

const sortFields: SortField[] = [
  { value: 'first_name', label: 'Nombre' },
  { value: 'last_name', label: 'Apellido' },
  { value: 'position', label: 'Cargo' },
  { value: 'department', label: 'Departamento' },
  { value: 'created_at', label: 'Fecha Creación' }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Empleados" description="Gestión de empleados y sueldos">
      <template #links>
        <UButton label="Nuevo empleado" icon="i-heroicons-plus" color="primary" @click="openCreate" />
      </template>
    </AppPageHeader>

    <LogisticaTable
      :loading="loading"
      :data="employees"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
