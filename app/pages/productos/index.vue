<script setup lang="ts">
definePageMeta({
  layout: 'modulofabricacion',
  middleware: ['auth'],
  breadcrumb: [{ label: 'Stock', to: '/stock' }, { label: 'Productos' }]
})
import type { ButtonProps } from '@nuxt/ui'

import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { productColumns } from '~/modulos/logistica/master-data/product/columns'
import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const { init, products, create, loading } = useProducts()
const form = reactive(createDefaultProductForm())

const sorting = ref<SortingState>([])
const open = ref(false)
const router = useRouter()

const openCreate = () => {
  open.value = true
}
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
  await init()
})
const saveLocation = async () => {
  await create(toCreateProductPayload(form))
  open.value = false
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
      :data="products"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
  <ProductModalForm v-model:open="open" v-model:form="form" @submit="saveLocation" />
</template>
