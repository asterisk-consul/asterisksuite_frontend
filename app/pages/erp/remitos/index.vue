<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { useServerTable } from '~/composables/table/useServerTable'
import { isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'

const router = useRouter()
const store = useDocumentsSalesStore()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=REMITO')

const showCancelled = ref(false)
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => showCancelled.value
  ? documents.value
  : documents.value.filter(document => !isDocumentCancelled('REMITO', document.status)))
const loading = computed(() => store.loading)
const serverTable = useServerTable((query) => store.fetchPage({ ...query, category: 'REMITO', excludeCancelled: !showCancelled.value }))
const { page, pageSize, search, sorting, filters, refresh } = serverTable
const cancelledStatusFilterActive = computed(() => filters.value.some((filter) =>
  filter.column === 'status' && Number(filter.value) === 3
))
watch(showCancelled, (show) => {
  if (!show && cancelledStatusFilterActive.value) {
    filters.value = filters.value.filter((filter) => !(filter.column === 'status' && Number(filter.value) === 3))
    return
  }
  page.value = 1
  refresh()
})
watch(cancelledStatusFilterActive, (active) => {
  if (active && !showCancelled.value) showCancelled.value = true
}, { immediate: true })

const stats = computed(() => {
  const docs = documents.value
  return {
    total: docs.length,
    borrador: docs.filter((d) => d.status === 0).length,
    pendiente: docs.filter((d) => d.status === 1).length,
    confirmado: docs.filter((d) => d.status === 2).length,
    unidadesPendientes: docs
      .filter((doc) => doc.status === 0 || doc.status === 1)
      .reduce(
        (total, doc) =>
          total + (doc.document_items ?? []).reduce((sum: number, item: any) => sum + Number(item.quantity ?? 0), 0),
        0
      )
  }
})

function openDocument(row: any) {
  router.push(`/erp/remitos/${row.id}`)
}

const columns = computed(() =>
  createSalesColumns({
    onOpen: openDocument,
    showAmounts: false,
    showCreator: isOwnerOrAdmin.value,
    statusFilterOptions: statusOptions.filter((option): option is { label: string; value: number } => option.value !== undefined)
  })
)

const filterFields = [
  { id: 'number', label: 'Buscar por N°...' },
  { id: 'client', label: 'Buscar por cliente...' },
  { id: 'descrip', label: 'Buscar por descripción...' }
]

const sortFields = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Cliente', value: 'client' }
]

const statusOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 0 },
  { label: 'Pendiente', value: 1 },
  { label: 'Confirmado', value: 2 },
  { label: 'Anulado', value: 3 }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Remitos">
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
            <p class="text-xs text-muted">Remitos completados</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Unidades a entregar</p>
            <p class="text-xl font-semibold leading-6">{{ stats.unidadesPendientes }}</p>
          </div>
        </UPageCard>
      </div>

      <div class="flex items-center justify-between gap-4 rounded-xl border border-default bg-elevated/40 px-4 py-3">
        <div>
          <p class="text-sm font-medium">Visibilidad de remitos</p>
          <p class="text-xs text-muted">Podés incluir los remitos cancelados en este listado.</p>
        </div>
        <label class="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span>Mostrar cancelados</span>
          <USwitch v-model="showCancelled" aria-label="Mostrar remitos cancelados" />
        </label>
      </div>

      <LogisticaTable
        v-model:page="page"
        v-model:search="search"
        v-model:filters="filters"
        v-model:sorting="sorting"
        :data="visibleDocuments"
        :columns="columns"
        :loading="loading"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
        server-side
        :page-size="pageSize"
        :total-rows="store.pagination.total"
        :on-row-click="openDocument"
      />
    </div>
  </UPage>
</template>
