<script setup lang="ts">
definePageMeta({
  layout: 'erp',
  middleware: ['auth']
})

import type { SortingState } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import * as XLSX from 'xlsx'
import { useExcelExport } from '~/composables/useExcelExport'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'

const { exportToExcel } = useExcelExport()
const router = useRouter()

const parties = ref<any[]>([])
const loading = ref(false)
const sorting = ref<SortingState>([])
const importOpen = ref(false)

async function loadParties() {
  loading.value = true
  try {
    parties.value = await $fetch<any[]>('/api/logistica/master-data/business-parties')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadParties())

const openEdit = (row: any) => {
  router.push(`/erp/stakeholders/${row.id}/edit`)
}

const openCreate = () => {
  router.push('/erp/stakeholders/create')
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

type Row = any

const build = createTableBuilder<Row>({
  locale: 'es-AR',
  onSortFieldSelect
})

const columns: TableColumn<Row>[] = [
  useSelectColumn(),
  useIdColumn(openEdit),

  ...build([
    {
      key: 'name',
      label: 'Razón Social',
      sortable: true
    },
    {
      key: 'type',
      label: 'Tipo',
      sortable: true,
      badge: {
        resolve: (row) => {
          const map: Record<string, { label: string; color: 'primary' | 'warning' | 'info' | 'success' | 'error' | 'neutral' }> = {
            CUSTOMER: { label: 'Cliente', color: 'success' },
            SUPPLIER: { label: 'Proveedor', color: 'info' },
            EMPLOYEE: { label: 'Empleado', color: 'warning' },
            PARTNER: { label: 'Socio', color: 'primary' },
            TAX_AUTHORITY: { label: 'Ente impositivo', color: 'error' },
            UTILITY: { label: 'Servicio', color: 'neutral' },
            FINANCIAL: { label: 'Financiero', color: 'secondary' },
            SERVICE_PROVIDER: { label: 'Prov. servicios', color: 'secondary' }
          }
          return map[row.type] ?? { label: row.type, color: 'neutral' }
        }
      },
      meta: {
        filter: {
          type: 'select',
          operators: ['equals'],
          options: [
            { label: 'Cliente', value: 'CUSTOMER' },
            { label: 'Proveedor', value: 'SUPPLIER' },
            { label: 'Empleado', value: 'EMPLOYEE' },
            { label: 'Socio', value: 'PARTNER' },
            { label: 'Ente impositivo', value: 'TAX_AUTHORITY' },
            { label: 'Servicio', value: 'UTILITY' }
          ]
        }
      }
    },
    {
      key: 'tax_id',
      label: 'CUIT',
      sortable: true
    },
    {
      key: 'vat_condition',
      label: 'IVA',
      badge: {
        resolve: (row) => {
          const map: Record<string, { label: string; color: 'primary' | 'warning' | 'info' | 'success' | 'error' | 'neutral' }> = {
            RESPONSABLE_INSCRIPTO: { label: 'RI', color: 'info' },
            MONOTRIBUTO: { label: 'Mono', color: 'warning' },
            CONSUMIDOR_FINAL: { label: 'CF', color: 'neutral' },
            EXENTO: { label: 'Exento', color: 'success' }
          }
          return map[row.vat_condition] ?? { label: row.vat_condition ?? '—', color: 'neutral' }
        }
      }
    },
    {
      key: 'province',
      label: 'Provincia',
      sortable: true
    },
    {
      key: 'active',
      label: 'Estado',
      sortable: true,
      badge: {
        resolve: (row) => ({
          label: row.active ? 'Activo' : 'Inactivo',
          color: row.active ? 'success' : 'error'
        })
      },
      meta: {
        filter: {
          type: 'select',
          operators: ['equals'],
          options: [
            { label: 'Activo', value: true },
            { label: 'Inactivo', value: false }
          ]
        }
      }
    }
  ])
]

// ─── Export ──────────────────────────────────────────────
const handleExportExcel = () => {
  exportToExcel({
    filename: 'partes_interesadas',
    sheetName: 'Partes Interesadas',
    columns: [
      { key: 'id', label: 'id', width: 36 },
      { key: 'type', label: 'tipo', width: 20 },
      { key: 'name', label: 'razon_social', width: 30 },
      { key: 'tax_id', label: 'CUIT', width: 15 },
      { key: 'vat_condition', label: 'condicion_iva', width: 25 },
      { key: 'province', label: 'provincia', width: 20 },
      { key: 'exemption_rate', label: 'tasa_exencion', width: 15 },
      { key: 'active', label: 'activo', width: 10, format: (v: boolean) => v ? 'Sí' : 'No' }
    ],
    data: parties.value
  })
}

const handleExportCSV = () => {
  const headers = ['id', 'tipo', 'razon_social', 'CUIT', 'condicion_iva', 'provincia', 'tasa_exencion', 'activo']
  const rows = parties.value.map(p => [
    p.id || '', p.type || '', p.name || '', p.tax_id || '',
    p.vat_condition || '', p.province || '',
    p.exemption_rate || 0, p.active ? 'Sí' : 'No'
  ])
  const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'partes_interesadas.csv'
  link.click()
}

const downloadTemplate = () => {
  const wsData = [
    ['id', 'tipo', 'razon_social', 'CUIT', 'condicion_iva', 'provincia', 'tasa_exencion', 'activo'],
    ['', 'CUSTOMER', 'Mi Empresa SRL', '30-12345678-9', 'RESPONSABLE_INSCRIPTO', 'Córdoba', 0, 'Sí'],
    ['', 'SUPPLIER', 'Proveedor XYZ SA', '30-98765432-1', 'RESPONSABLE_INSCRIPTO', 'Buenos Aires', 0, 'Sí'],
    ['', 'UTILITY', 'EPEC', '30-71234567-8', 'EXENTO', 'Córdoba', 0, 'Sí'],
    [],
    ['TIPOS VÁLIDOS:', 'CUSTOMER, SUPPLIER, EMPLOYEE, PARTNER, TAX_AUTHORITY, UTILITY, FINANCIAL, SERVICE_PROVIDER'],
    ['IVA VÁLIDOS:', 'RESPONSABLE_INSCRIPTO, MONOTRIBUTO, CONSUMIDOR_FINAL, EXENTO'],
    ['ACTIVO:', 'Sí / No'],
    ['NOTA:', 'Si la columna id está vacía se crea un nuevo registro. Si tiene un ID se actualiza el existente.']
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [
    { wch: 36 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
    { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 8 }
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, 'plantilla_partes_interesadas.xlsx')
}

const importColumns = [
  { key: 'id', label: 'id', required: false },
  { key: 'tipo', label: 'tipo', required: true },
  { key: 'razon_social', label: 'razon_social', required: true },
  { key: 'CUIT', label: 'CUIT', required: false },
  { key: 'condicion_iva', label: 'condicion_iva', required: false },
  { key: 'provincia', label: 'provincia', required: false },
  { key: 'tasa_exencion', label: 'tasa_exencion', required: false },
  { key: 'activo', label: 'activo', required: false }
]

const dataActions = [
  { label: 'Exportar Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel },
  { label: 'Exportar CSV', icon: 'i-lucide-file-text', onSelect: handleExportCSV },
  { label: 'Descargar plantilla Excel', icon: 'i-lucide-file-down', onSelect: downloadTemplate },
  { label: 'Importar datos', icon: 'i-lucide-upload', onSelect: () => { importOpen.value = true } }
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
      v-model:sorting="sorting"
    />
  </UPage>

  <ExcelImportDialog
    v-model:open="importOpen"
    title="Importar Partes Interesadas"
    description="Selecciona un archivo Excel con las partes interesadas a importar"
    :columns="importColumns"
    endpoint="/api/master-data/business-parties/import"
    @success="loadParties"
  />
</template>
