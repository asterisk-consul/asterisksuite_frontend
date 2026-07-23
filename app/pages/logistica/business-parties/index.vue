<script setup lang="ts">
definePageMeta({
  layout: 'logistica',
  middleware: ['auth']
})
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { BusinessPartyColumns } from '~/modulos/logistica/master-data/bussiness-parties/columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
import type { ButtonProps } from '@nuxt/ui'

const store = useBusinessPartiesStore()
const router = useRouter()
const { items } = storeToRefs(store)
const sorting = ref<SortingState>([])

const loading = ref(true)

onMounted(async () => {
  await store.fetchAll()
  loading.value = store.loading
})

const openCreate = () => {
  router.push('/logistica/business-parties/create')
}

const openEdit = (row: any) => {
  router.push(`/logistica/business-parties/${row.id}/edit`)
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

const columns = BusinessPartyColumns({
  onEdit: openEdit,
  onSortFieldSelect
})

const links: ButtonProps[] = [
  {
    label: 'Nueva Parte Interesada',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: openCreate
  }
]
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
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Partes Interesadas" description="Listado de Partes Interesadas" :links="links" />

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
