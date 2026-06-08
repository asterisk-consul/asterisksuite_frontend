<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'logistica'
})

import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { ButtonProps } from '@nuxt/ui'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { corridorsColumns } from '~/modulos/logistica/transport/corridors/corridorsColums'
import { useCorridorsStore } from '~/modulos/logistica/transport/corridors/corridors.store'

import type { CorridorWithRelations } from '~/modulos/logistica/transport/corridors/types/corridors.types'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

/* ---------------------------------------
STORE
--------------------------------------- */

const store = useCorridorsStore()
const { corridors: items, loading } = storeToRefs(store)
const sorting = ref<SortingState>([])

const router = useRouter()

/* ---------------------------------------
ACTIONS
--------------------------------------- */

function openCreate() {
  router.push('/logistica/viajes/corridors/create')
}

function openEdit(row: CorridorWithRelations) {
  router.push(`/logistica/viajes/corridors/${row.id}/edit`)
}

function openDetail(row: CorridorWithRelations) {
  router.push(`/logistica/viajes/corridors/${row.id}`)
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

const columns = corridorsColumns({
  onEdit: openDetail,
  onSortFieldSelect
  // onRowClick: openDetail
})

/* ---------------------------------------
LIFECYCLE
--------------------------------------- */

await store.fetchCorridors()
const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo corredor',
    icon: 'i-heroicons-plus',
    to: '/logistica/viajes/corridors/create',
    color: 'primary',
    variant: 'solid'
  }
])
const filterFields: FilterField[] = [
  {
    id: 'name',
    label: 'Filtrar por corredor...',
    class: 'w-56'
  },
  {
    id: 'route',
    label: 'Filtrar por ruta...',
    class: 'w-56'
  }
]

const sortFields: SortField[] = [
  {
    label: 'Corredor',
    value: 'name'
  },
  {
    label: 'Ruta',
    value: 'route'
  },
  {
    label: 'Paradas',
    value: 'stops'
  },
  {
    label: 'Distancia',
    value: 'distance'
  },
  {
    label: 'Tiempo',
    value: 'time'
  },
  {
    label: 'Tipo',
    value: 'is_template'
  },
  {
    label: 'Fecha Creación',
    value: 'created_at'
  }
]
</script>

<template>
  <UPage class="space-y-4 w-full">
    <AppPageHeader title="Corredores" description="Listado de Corredores" :links="links" />

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
