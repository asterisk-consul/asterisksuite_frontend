<script setup lang="ts">
definePageMeta({
  layout: 'modulofabricacion',
  middleware: ['auth'],
  breadcrumb: [{ label: 'Stock', to: '/stock' }, { label: 'Productos' }]
})
import type { ButtonProps } from '@nuxt/ui'
import * as XLSX from 'xlsx'

import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { productColumns } from '~/modulos/logistica/master-data/product/columns'
import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'
import { useExcelExport } from '~/composables/useExcelExport'

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const { init, products, create, loading } = useProducts()
const { exportToExcel } = useExcelExport()
const form = reactive(createDefaultProductForm())

const sorting = ref<SortingState>([])
const open = ref(false)
const importOpen = ref(false)
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

const handleExportExcel = async () => {
  const allProducts = await $fetch<any[]>('/api/logistica/master-data/products')
  exportToExcel({
    filename: 'productos',
    sheetName: 'Productos',
    columns: [
      { key: 'id', label: 'ID', width: 36 },
      { key: 'sku', label: 'SKU', width: 15 },
      { key: 'name', label: 'Nombre', width: 30 },
      { key: 'product_type', label: 'Tipo', width: 22 },
      { key: 'active', label: 'Activo', width: 10, format: (v) => v ? 'Si' : 'No' },
      { key: 'manages_stock', label: 'Maneja stock', width: 15, format: (v) => v ? 'Si' : 'No' },
      { key: 'requires_refrigeration', label: 'Refrigeracion', width: 15, format: (v) => v ? 'Si' : 'No' },
      { key: 'price_enabled', label: 'Precio', width: 10, format: (v) => v ? 'Si' : 'No' },
      { key: 'is_composed', label: 'Compuesto', width: 12, format: (v) => v ? 'Si' : 'No' },
      { key: 'has_engineering', label: 'Ingenieria', width: 12, format: (v) => v ? 'Si' : 'No' },
      { key: 'cost_source', label: 'Fuente costo', width: 15 },
      { key: 'current_cost', label: 'Costo actual', width: 15 },
      { key: 'created_at', label: 'Creacion', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('es-AR') : '' }
    ],
    data: allProducts
  })
}

const handleExportCSV = async () => {
  const allProducts = await $fetch<any[]>('/api/logistica/master-data/products')
  const headers = ['ID', 'SKU', 'Nombre', 'Tipo', 'Activo', 'Maneja stock', 'Refrigeracion', 'Precio', 'Compuesto', 'Ingenieria', 'Fuente costo', 'Costo actual']
  const rows = allProducts.map(p => [
    p.id || '', p.sku || '', p.name || '', p.product_type || '',
    p.active ? 'Si' : 'No', p.manages_stock ? 'Si' : 'No',
    p.requires_refrigeration ? 'Si' : 'No', p.price_enabled ? 'Si' : 'No',
    p.is_composed ? 'Si' : 'No', p.has_engineering ? 'Si' : 'No',
    p.cost_source || '', p.current_cost || ''
  ])
  const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'productos.csv'
  link.click()
}

const downloadTemplate = () => {
  const columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Nombre *', key: 'name', width: 35 },
    { header: 'Tipo de producto', key: 'product_type', width: 22 },
    { header: 'Activo (SI/NO)', key: 'active', width: 15 },
    { header: 'Maneja stock (SI/NO)', key: 'manages_stock', width: 18 },
    { header: 'Refrigeracion (SI/NO)', key: 'requires_refrigeration', width: 25 },
    { header: 'Tiene precio (SI/NO)', key: 'price_enabled', width: 18 },
    { header: 'Compuesto (SI/NO)', key: 'is_composed', width: 18 },
    { header: 'Ingenieria (SI/NO)', key: 'has_engineering', width: 20 },
    { header: 'Tipo calculo', key: 'calculation_type', width: 20 },
    { header: 'Fuente costo', key: 'cost_source', width: 20 }
  ]

  const exampleRow = {
    sku: 'PROD-001',
    name: 'Producto de ejemplo',
    product_type: 'FINISHED_PRODUCT',
    active: 'SI',
    manages_stock: 'SI',
    requires_refrigeration: 'NO',
    price_enabled: 'SI',
    is_composed: 'NO',
    has_engineering: 'NO',
    calculation_type: 'UNIT',
    cost_source: 'MANUAL'
  }

  const types = [
    'RAW_MATERIAL = Materia Prima',
    'FINISHED_PRODUCT = Producto Terminado',
    'SEMI_FINISHED = Producto Intermedio',
    'SERVICE = Servicio',
    'RATES = Tarifa'
  ]

  const costSources = [
    'MANUAL = Manual',
    'PURCHASE = Compra',
    'ENGINEERING = Ingenieria',
    'BOM = Lista de materiales',
    'RATE = Tarifa'
  ]

  const calcTypes = [
    'UNIT = Unitario',
    'SURFASE = Superficie',
    'VOLUME = Volumen',
    'LINEAR = Lineal'
  ]

  const wsData = [
    columns.map(c => c.header),
    Object.values(exampleRow),
    [],
    ['LISTA DE TIPOS VALIDOS:'],
    ...types.map(t => [t]),
    [],
    ['LISTA DE FUENTES DE COSTO:'],
    ...costSources.map(t => [t]),
    [],
    ['LISTA DE TIPOS DE CALCULO:'],
    ...calcTypes.map(t => [t]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = columns.map(c => ({ wch: c.width }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Productos')
  XLSX.writeFile(wb, 'plantilla_productos.xlsx')
}

const importColumns = [
  { key: 'sku', label: 'SKU', required: false },
  { key: 'name', label: 'Nombre', required: true },
  { key: 'product_type', label: 'Tipo', required: false },
  { key: 'active', label: 'Activo', type: 'boolean' as const }
]

const dataActions = [
  { label: 'Exportar Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel },
  { label: 'Exportar CSV', icon: 'i-lucide-file-text', onSelect: handleExportCSV },
  { label: 'Descargar plantilla Excel', icon: 'i-lucide-file-down', onSelect: downloadTemplate },
  { label: 'Importar datos', icon: 'i-lucide-upload', onSelect: () => { importOpen.value = true } }
]

const links: ButtonProps[] = [
  {
    label: 'Nuevo Producto',
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
  { label: 'Ultimo Calculo', value: 'last_cost_calculated_at' },
  { label: 'Fecha Creacion', value: 'created_at' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Productos" description="Listado de Productos">
      <template #links>
        <UFieldGroup>
          <UButton color="neutral" variant="subtle" label="Importar / Exportar" icon="i-lucide-database" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
        <UButton label="Nuevo Producto" icon="i-heroicons-plus" color="primary" variant="solid" @click="openCreate" />
      </template>
    </AppPageHeader>
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
  <ExcelImportDialog
    v-model:open="importOpen"
    title="Importar Productos"
    description="Selecciona un archivo Excel con los productos a importar"
    :columns="importColumns"
    endpoint="/api/data-import/products"
  />
</template>
