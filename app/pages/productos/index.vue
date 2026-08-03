<script setup lang="ts">
definePageMeta({
  layout: 'modulofabricacion',
  middleware: ['auth'],
  breadcrumb: [{ label: 'Stock', to: '/stock' }, { label: 'Productos' }]
})
import type { ButtonProps } from '@nuxt/ui'
import * as XLSX from 'xlsx'

import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
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
const toast = useToast()

// =========================
// PRODUCT_COLUMNS — Fuente única de verdad
// =========================

const PRODUCT_COLUMNS = [
  { key: 'sku', header: 'SKU', label: 'SKU', width: 15, required: false },
  { key: 'name', header: 'Nombre', label: 'Nombre', width: 35, required: true },
  { key: 'product_type', header: 'Tipo', label: 'Tipo', width: 22, required: false },
  { key: 'active', header: 'Activo', label: 'Activo', width: 10, type: 'boolean' as const },
  { key: 'manages_stock', header: 'Maneja stock', label: 'Maneja stock', width: 15, type: 'boolean' as const },
  { key: 'requires_refrigeration', header: 'Refrigeracion', label: 'Refrigeracion', width: 25, type: 'boolean' as const },
  { key: 'price_enabled', header: 'Precio', label: 'Precio', width: 10, type: 'boolean' as const },
  { key: 'is_composed', header: 'Compuesto', label: 'Compuesto', width: 12, type: 'boolean' as const },
  { key: 'has_engineering', header: 'Ingenieria', label: 'Ingenieria', width: 12, type: 'boolean' as const },
  { key: 'cost_source', header: 'Fuente costo', label: 'Fuente costo', width: 15 },
  { key: 'current_cost', header: 'Costo actual', label: 'Costo actual', width: 15 }
]

// =========================
// Referencias para template
// =========================

const PRODUCT_TYPE_OPTIONS = [
  'RAW_MATERIAL = Materia Prima',
  'FINISHED_PRODUCT = Producto Terminado',
  'SEMI_FINISHED = Producto Intermedio',
  'SERVICE = Servicio',
  'RATES = Tarifa'
]

const COST_SOURCE_OPTIONS = [
  'MANUAL = Manual',
  'PURCHASE = Compra',
  'ENGINEERING = Ingenieria',
  'BOM = Lista de materiales',
  'RATE = Tarifa'
]

const CALC_TYPE_OPTIONS = [
  'UNIT = Unitario',
  'SURFACE = Superficie',
  'VOLUME = Volumen',
  'LINEAR = Lineal'
]

// =========================
// EXPORTAR
// =========================

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
  try {
    await create(toCreateProductPayload(form))
    open.value = false
    Object.assign(form, createDefaultProductForm())
  } catch (e: any) {
    const msg = useProductsStore().error || e?.message || 'Error al crear producto'
    toast.add({
      title: 'Error al crear producto',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

const handleExportExcel = async () => {
  const allProducts = await $fetch<any[]>('/api/logistica/master-data/products')
  exportToExcel({
    filename: 'productos',
    sheetName: 'Productos',
    columns: [
      { key: 'id', label: 'ID', width: 36 },
      ...PRODUCT_COLUMNS.map(c => ({
        key: c.key,
        label: c.header,
        width: c.width,
        format: c.type === 'boolean' ? (v: any) => v ? 'Si' : 'No' : undefined
      })),
      { key: 'created_at', label: 'Creacion', width: 15, format: (v: any) => v ? new Date(v).toLocaleDateString('es-AR') : '' }
    ],
    data: allProducts
  })
}

const handleExportCSV = async () => {
  const allProducts = await $fetch<any[]>('/api/logistica/master-data/products')
  const headers = ['ID', ...PRODUCT_COLUMNS.map(c => c.header), 'Creacion']
  const rows = allProducts.map(p => [
    p.id || '',
    ...PRODUCT_COLUMNS.map(c => {
      const val = p[c.key]
      if (c.type === 'boolean') return val ? 'Si' : 'No'
      return val || ''
    }),
    p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR') : ''
  ])
  const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'productos.csv'
  link.click()
}

// =========================
// DESCARGAR PLANTILLA
// =========================

const downloadTemplate = () => {
  const headers = PRODUCT_COLUMNS.map(c => c.header)
  const exampleRow = PRODUCT_COLUMNS.map(c => {
    if (c.key === 'sku') return 'PROD-001'
    if (c.key === 'name') return 'Producto de ejemplo'
    if (c.key === 'product_type') return 'FINISHED_PRODUCT'
    if (c.key === 'active') return 'Si'
    if (c.key === 'manages_stock') return 'Si'
    if (c.key === 'requires_refrigeration') return 'No'
    if (c.key === 'price_enabled') return 'Si'
    if (c.key === 'is_composed') return 'No'
    if (c.key === 'has_engineering') return 'No'
    if (c.key === 'cost_source') return 'MANUAL'
    return ''
  })

  const wsData = [
    headers,
    exampleRow,
    [],
    ['NOTA: El SKU es el identificador único. Si cambia el SKU de un producto existente, se creará uno nuevo en vez de actualizarlo.'],
    [],
    ['LISTA DE TIPOS VALIDOS:'],
    ...PRODUCT_TYPE_OPTIONS.map(t => [t]),
    [],
    ['LISTA DE FUENTES DE COSTO:'],
    ...COST_SOURCE_OPTIONS.map(t => [t]),
    [],
    ['LISTA DE TIPOS DE CALCULO:'],
    ...CALC_TYPE_OPTIONS.map(t => [t]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = PRODUCT_COLUMNS.map(c => ({ wch: c.width }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Productos')
  XLSX.writeFile(wb, 'plantilla_productos.xlsx')
}

// =========================
// IMPORTAR
// =========================

const importColumns = PRODUCT_COLUMNS.map(c => ({
  key: c.key,
  label: c.label,
  required: c.required,
  type: c.type
}))

// =========================
// ACCIONES
// =========================

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

    <UAlert
      icon="i-lucide-info"
      color="info"
      variant="soft"
      title="Importación de productos"
    >
      <template #description>
        <ul class="list-disc list-inside text-sm mt-1 space-y-1">
          <li><strong>SKU</strong>: Es el identificador único. Si modificás el SKU de un producto existente, se creará uno nuevo.</li>
          <li><strong>Costo actual</strong>: No se importa — el costo se calcula desde la estructura BOM/Ingeniería.</li>
          <li><strong>Nombre</strong>: Es el único campo obligatorio.</li>
        </ul>
      </template>
    </UAlert>

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
    @success="init"
  />
</template>
