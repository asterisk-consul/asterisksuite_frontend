<script setup lang="ts">
definePageMeta({
  layout: 'logistica',
  middleware: ['auth']
})
const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
import type { ButtonProps } from '@nuxt/ui'
import type { EditableField } from '~/modulos/logistica/documents/dispatch-orders/dispatch-order.columns'
import type { EditableValue } from '~/composables/table/useInlineEdit'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import type { DispatchOrder } from '~/modulos/logistica/documents/dispatch-orders/types/dispatch-orders.types'

import { storeToRefs } from 'pinia'
import { useDispatchOrdersStore } from '~/modulos/logistica/documents/dispatch-orders/store/dispatch-orders.store'

import { dispatchOrdersColumns } from '~/modulos/logistica/documents/dispatch-orders/dispatch-order.columns'
//components
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

/* ---------------------------------------
   MODAL CONTROL
--------------------------------------- */
const router = useRouter()
const sorting = ref<SortingState>([])

function openCreate() {
  router.push('/logistica/viajes/dispatch-orders/create')
}

function openEdit(row: any) {
  router.push(`/logistica/viajes/dispatch-orders/${row.id}/edit`)
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

const columns = dispatchOrdersColumns({
  onEdit: openEdit,
  onSortFieldSelect,

  onInlineSave: async (row: DispatchOrder, field: EditableField, value: EditableValue) => {
    const prev = row[field] as EditableField
    row[field] = value ?? ''

    try {
      const normalized = value ?? undefined

      await store.update(row.id, {
        [field]: normalized
      })
    } catch {
      row[field] = prev ?? ''
    }
  }
})

const loading = ref(true)
const store = useDispatchOrdersStore()
const { dispatchOrders } = storeToRefs(store)

/* ---------------------------------------
   LIFECYCLE
--------------------------------------- */

onMounted(async () => {
  await store.fetchAll()
  console.log(store.dispatchOrders)
  loading.value = store.loading
})

/* ---------------------------------------
   SUBMIT HANDLER
--------------------------------------- */

const links = ref<ButtonProps[]>([
  {
    label: 'Nueva Orden de Despacho',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])
const filterFields: FilterField[] = [
  {
    id: 'order_number',
    label: 'Filtrar por orden...',
    class: 'w-40'
  },
  {
    id: 'customer',
    label: 'Filtrar por cliente...',
    class: 'w-56'
  },
  {
    id: 'origin',
    label: 'Filtrar por origen...',
    class: 'w-40'
  },
  {
    id: 'destination',
    label: 'Filtrar por destino...',
    class: 'w-40'
  }
]
const sortFields: SortField[] = [
  {
    label: 'N° Orden',
    value: 'order_number'
  },
  {
    label: 'Estado',
    value: 'status'
  },
  {
    label: 'Cliente',
    value: 'customer'
  },
  {
    label: 'Origen',
    value: 'origin'
  },
  {
    label: 'Destino',
    value: 'destination'
  },
  {
    label: 'Fecha Planificada',
    value: 'planned_date'
  },
  {
    label: 'Stock',
    value: 'requires_stock'
  },
  {
    label: 'Fecha Creación',
    value: 'created_at'
  }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Ordenes de despacho" description="Listado de ordenes de despacho" :links="links" />
    <LogisticaTable
      :loading="loading"
      :data="dispatchOrders"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
