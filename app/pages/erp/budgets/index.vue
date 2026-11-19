<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import DocumentStatusVisibilityPopover from '~/components/erp/documents/DocumentStatusVisibilityPopover.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { getCategoryStatuses } from '~/modulos/erp/documents/types/document-statuses'

const router = useRouter()
const store = useDocumentsSalesStore()
useDocumentFormPreload('/erp/sales/new?category=QUOTE')

const filters = ref<any[]>([])
const hiddenStatusKeys = ref<string[]>([])
const statusVisibilityGroups = computed(() => [{
  category: 'QUOTE',
  direction: 1 as const,
  label: 'Presupuestos',
  options: getCategoryStatuses('QUOTE'),
}])
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => documents.value.filter(document =>
  !hiddenStatusKeys.value.includes(`QUOTE:${document.status}`),
))
const loading = computed(() => store.loading)

const refresh = () => store.fetchAll({
  category: 'QUOTE',
  excludeStatuses: hiddenStatusKeys.value.join(',') || undefined,
})

onMounted(() => refresh())
watch(hiddenStatusKeys, () => {
  void refresh()
}, { deep: true })
watch(filters, (currentFilters) => {
  const selectedStatuses = currentFilters
    .filter(filter => filter.column === 'status' && /^\d+$/.test(String(filter.value)))
    .map(filter => `QUOTE:${Number(filter.value)}`)
  if (selectedStatuses.some(key => hiddenStatusKeys.value.includes(key))) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(key => !selectedStatuses.includes(key))
  }
}, { deep: true })

const stats = computed(() => {
  const docs = documents.value
  return {
    total: docs.length,
    borrador: docs.filter(d => d.status === 0).length,
    pendiente: docs.filter(d => d.status === 1).length,
    confirmado: docs.filter(d => d.status === 2).length,
    totalConfirmado: docs.filter(d => d.status === 2).reduce((a, d) => a + Number(d.total), 0),
  }
})

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function openDocument(row: any) {
  router.push(`/erp/sales/${row.id}`)
}

const statusOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 0 },
  { label: 'Enviado', value: 1 },
  { label: 'Aprobado', value: 2 },
  { label: 'Rechazado', value: 3 },
  { label: 'Vencido', value: 4 },
  { label: 'Convertido', value: 5 },
  { label: 'Cancelado', value: 6 }
]

const columns = createSalesColumns({
  onOpen: openDocument,
  statusFilterOptions: statusOptions.filter((option): option is { label: string; value: number } => option.value !== undefined)
})

const filterFields = [
  { id: 'number', label: 'Buscar por N°...' },
  { id: 'client', label: 'Buscar por cliente...' },
  { id: 'descrip', label: 'Buscar por descripción...' }
]

const sortFields = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Cliente', value: 'client' },
  { label: 'Total', value: 'total' }
]

</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Presupuestos">
      <template #links>
        <CreateDocumentMenu direction="sales" />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Borradores</p>
            <p class="text-xl font-semibold leading-6 text-neutral-500">{{ stats.borrador }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Pendientes</p>
            <p class="text-xl font-semibold leading-6 text-warning-500">{{ stats.pendiente }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Confirmados</p>
            <p class="text-xl font-semibold leading-6 text-success-500">{{ stats.confirmado }}</p>
            <p class="text-xs text-muted">{{ fmt(stats.totalConfirmado) }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Total</p>
            <p class="text-xl font-semibold leading-6">{{ stats.total }}</p>
          </div>
        </UPageCard>
      </div>

      <div class="flex justify-end">
        <DocumentStatusVisibilityPopover v-model:hidden-status-keys="hiddenStatusKeys" :groups="statusVisibilityGroups" />
      </div>

      <LogisticaTable
        v-model:filters="filters"
        :data="visibleDocuments"
        :columns="columns"
        :loading="loading"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
        :on-row-click="openDocument"
      />
    </div>
  </UPage>
</template>
