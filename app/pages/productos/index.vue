<script setup lang="ts">
definePageMeta({
  layout: 'modulofabricacion',
  middleware: ['auth'],
  breadcrumb: [{ label: 'Stock', to: '/stock' }, { label: 'Productos' }]
})
import type { ButtonProps } from '@nuxt/ui'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { productColumns } from '~/modulos/logistica/master-data/product/columns'
import {
  createDefaultProductForm,
  toUpdateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'
const form = reactive(createDefaultProductForm())

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const store = useProductsStore()

const sorting = ref<SortingState>([])

const { items } = storeToRefs(store)
const open = ref(false)
const loading = ref(true)
const router = useRouter()

const openEdit = (row: any) => {
  router.push(`/productos/${row.id}/edit`)
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

const columns = productColumns({
  onEdit: openEdit,
  onSortFieldSelect
})

onMounted(async () => {
  await store.fetchAll()
  loading.value = store.loading
})
const saveLocation = async (data: any) => {
  await store.create(data)
  open.value = false
}

const openCreate = () => {
  open.value = true
}
const links: ButtonProps[] = [
  {
    label: 'Nueva Producto',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: openCreate
  }
]

const filterFields: FilterField[] = [
  { id: 'sku', label: 'Filtrar por SKU...', class: 'w-40' },
  { id: 'name', label: 'Filtrar por nombre...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'SKU', value: 'sku' },
  { label: 'Producto', value: 'name' },
  { label: 'Tipo de producto', value: 'product_type' },
  { label: 'Último Cálculo', value: 'last_cost_calculated_at' },
  { label: 'Fecha Creación', value: 'created_at' },
  { label: 'Fecha Eliminación', value: 'deleted_at' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Productos" description="Listado de Productos" :links="links" />
    <LogisticaTable
      :loading="loading"
      :data="items"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
  <ProductModalForm v-model:open="open" v-model:form="form" @submit="saveLocation" />
</template>
