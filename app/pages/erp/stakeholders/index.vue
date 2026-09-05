<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'
import { stakeholdersColumns } from './columns'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { usePartiesImportExport } from '~/modulos/logistica/master-data/bussiness-parties/composable/usePartiesImportExport'

const router = useRouter()
const store = useBusinessPartiesStore()
const { items: parties, loading } = storeToRefs(store)
const { importOpen, dataActions } = usePartiesImportExport()

const sorting = ref<SortingState>([])

onMounted(() => store.fetchAll())

const openEdit = (row: any) => router.push(`/erp/stakeholders/${row.id}/edit`)
const openCreate = () => router.push('/erp/stakeholders/create')

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = stakeholdersColumns({ onEdit: openEdit, onSortFieldSelect })

const filterFields: FilterField[] = [
  { id: 'name', label: 'Filtrar por Razón Social...', class: 'w-40' },
  { id: 'tax_id', label: 'Filtrar por CUIT...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { value: 'name', label: 'Razón Social' },
  { value: 'tax_id', label: 'CUIT' },
  { value: 'type', label: 'Tipo' },
  { value: 'created_at', label: 'Fecha Creación' }
]

const importColumns = [
  { key: 'id', label: 'id', required: false },
  { key: 'tipo', label: 'tipo', required: true },
  { key: 'razon_social', label: 'razon_social', required: true },
  { key: 'nombre_fantasia', label: 'nombre_fantasia', required: false },
  { key: 'tipo_documento', label: 'tipo_documento', required: false },
  { key: 'CUIT', label: 'CUIT', required: false },
  { key: 'email', label: 'email', required: false },
  { key: 'condicion_iva', label: 'condicion_iva', required: false },
  { key: 'tasa_exencion', label: 'tasa_exencion', required: false },
  { key: 'contacto_nombre', label: 'contacto_nombre', required: false },
  { key: 'contacto_apellido', label: 'contacto_apellido', required: false },
  { key: 'contacto_cargo', label: 'contacto_cargo', required: false },
  { key: 'contacto_telefono', label: 'contacto_telefono', required: false },
  { key: 'contacto_email', label: 'contacto_email', required: false },
  { key: 'cuenta_bancaria_cbu', label: 'cuenta_bancaria_cbu', required: false },
  { key: 'cuenta_bancaria_alias', label: 'cuenta_bancaria_alias', required: false },
  { key: 'cuenta_bancaria_banco', label: 'cuenta_bancaria_banco', required: false },
  { key: 'cuenta_bancaria_tipo', label: 'cuenta_bancaria_tipo', required: false },
  { key: 'cuenta_bancaria_moneda', label: 'cuenta_bancaria_moneda', required: false },
  { key: 'cuenta_bancaria_titular', label: 'cuenta_bancaria_titular', required: false },
  { key: 'cuenta_bancaria_descripcion', label: 'cuenta_bancaria_descripcion', required: false },
  { key: 'cuenta_bancaria_principal', label: 'cuenta_bancaria_principal', required: false },
  { key: 'activo', label: 'activo', required: false }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Partes interesadas" description="Clientes, proveedores, entes reguladores y más">
      <template #links>
        <UFieldGroup>
          <UButton color="neutral" variant="subtle" label="Importar / Exportar" icon="i-lucide-database" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
        <UButton label="Nueva parte interesada" icon="i-heroicons-plus" color="primary" variant="solid" @click="openCreate" />
      </template>
    </AppPageHeader>

    <LogisticaTable
      :loading="loading"
      :data="parties"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>

  <ExcelImportDialog
    v-model:open="importOpen"
    title="Importar Partes Interesadas"
    description="Selecciona un archivo Excel con las partes interesadas a importar. Se pueden incluir contactos y cuentas bancarias en la misma fila."
    :columns="importColumns"
    endpoint="/api/master-data/business-parties/import"
    @success="store.fetchAll"
  />
</template>
