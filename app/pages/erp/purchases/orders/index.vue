<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { createPurchasesColumns } from '~/modulos/erp/purchases/columns'
import { useServerTable } from '~/composables/table/useServerTable'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import { isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'

const router = useRouter()
const store = useDocumentsPurchasesStore()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/purchases/orders/new')

const showCancelled = ref(false)
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => showCancelled.value
  ? documents.value
  : documents.value.filter(document => !isDocumentCancelled('ORDER', document.status, -1)))
const loading = computed(() => store.loading)
const serverTable = useServerTable((query) => store.fetchPage({ ...query, category: 'ORDER', direction: -1, excludeCancelled: !showCancelled.value }))
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
    totalConfirmado: docs.filter((d) => d.status === 2).reduce((a, d) => a + Number(d.total), 0)
  }
})

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function openDocument(row: any) {
  router.push(`/erp/purchases/orders/${row.id}`)
}

function duplicateDocument(row: any) {
  if (!canDocument('purchases', 'ORDER', 'create')) return
  router.push({ path: '/erp/purchases/orders/new', query: { duplicate_id: row.id } })
}

const statusFilterOptions = [
  { label: 'Borrador', value: 0 },
  { label: 'Pendiente', value: 1 },
  { label: 'Confirmada', value: 2 },
  { label: 'Anulada', value: 3 }
]

const columns = computed(() => createPurchasesColumns({
  onOpen: openDocument,
  onDuplicate: duplicateDocument,
  canDuplicate: () => canDocument('purchases', 'ORDER', 'create'),
  showCreator: isOwnerOrAdmin.value,
  statusFilterOptions
}))

const filterFields = [
  { id: 'number', label: 'Buscar por N°...' },
  { id: 'client', label: 'Buscar por proveedor...' },
  { id: 'descrip', label: 'Buscar por descripción...' }
]

const sortFields = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Proveedor', value: 'client' },
  { label: 'Total', value: 'total' }
]

</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Órdenes de Compra">
      <template #links>
        <CreateDocumentMenu direction="purchases" />
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
            <p class="text-xs text-muted">Confirmadas</p>
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

      <div class="flex items-center justify-between gap-4 rounded-xl border border-default bg-elevated/40 px-4 py-3">
        <div>
          <p class="text-sm font-medium">Visibilidad de órdenes</p>
          <p class="text-xs text-muted">Podés incluir las órdenes de compra anuladas en este listado.</p>
        </div>
        <label class="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span>Mostrar anuladas</span>
          <USwitch v-model="showCancelled" aria-label="Mostrar órdenes de compra anuladas" />
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
