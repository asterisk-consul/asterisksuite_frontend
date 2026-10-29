<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { canSettleDocument } from '~/modulos/erp/documents/utils/document-payment-status'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import { useServerTable } from '~/composables/table/useServerTable'
import { isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'

const router = useRouter()
const store = useDocumentsSalesStore()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=ORDER')

const statusFilter = ref<number | undefined>(undefined)
const showCancelled = ref(false)
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => showCancelled.value
  ? documents.value
  : documents.value.filter(document => !isDocumentCancelled('ORDER', document.status)))
const loading = computed(() => store.loading)
const serverTable = useServerTable((query) => store.fetchPage({ ...query, status: statusFilter.value, category: 'ORDER', excludeCancelled: !showCancelled.value }))
const { page, pageSize, search, sorting, filters, refresh } = serverTable
watch(statusFilter, (status) => {
  if (status === 8 && !showCancelled.value) {
    showCancelled.value = true
    return
  }
  page.value = 1
  refresh()
})
watch(showCancelled, (show) => {
  if (!show && statusFilter.value === 8) {
    statusFilter.value = undefined
    return
  }
  page.value = 1
  refresh()
})

const stats = computed(() => {
  const docs = documents.value
  return {
    borrador: docs.filter((d) => d.status === 0).length,
    preparacion: docs.filter((d) => d.commercial_operation?.delivery_status === 'PENDING').length,
    listas: docs.filter((d) => d.commercial_operation?.delivery_status === 'ELIGIBLE').length,
    remitosPendientes: docs.filter((d) => d.commercial_operation?.delivery_status === 'DRAFT_CREATED').length
  }
})

function openDocument(row: any) {
  router.push(`/erp/sales/${row.id}`)
}

function duplicateDocument(row: any) {
  if (!canDocument('sales', 'ORDER', 'create')) return
  router.push({ path: '/erp/sales/new', query: { category: 'ORDER', duplicate_id: row.id } })
}

function collectDocument(row: any) {
  if (!canSettleDocument(row) || !row.party_id) {
    openDocument(row)
    return
  }
  router.push({
    path: '/erp/treasury/payments/create',
    query: {
      type: 'COLLECTION',
      party_id: row.party_id,
      document_id: row.id
    }
  })
}

const statusOptions = [
  { label: 'Borrador', value: 0 },
  { label: 'Aprobada', value: 1 },
  { label: 'En preparación', value: 2 },
  { label: 'Lista para despacho', value: 3 },
  { label: 'Parcialmente entregada', value: 4 },
  { label: 'Entregada', value: 5 },
  { label: 'Facturada', value: 6 },
  { label: 'Cerrada', value: 7 },
  { label: 'Cancelada', value: 8 }
]

const columns = computed(() =>
  createSalesColumns({
    onOpen: openDocument,
    onCollect: collectDocument,
    onDuplicate: duplicateDocument,
    canDuplicate: () => canDocument('sales', 'ORDER', 'create'),
    showCreator: isOwnerOrAdmin.value,
    statusFilterOptions: statusOptions
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
  { label: 'Cliente', value: 'client' },
  { label: 'Estado', value: 'status' }
]

const statusButtons = [{ label: 'Todos', value: undefined }, ...statusOptions]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Órdenes de Venta">
      <template #links>
        <CreateDocumentMenu direction="sales" />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Borradores</p>
            <p class="text-2xl font-semibold text-neutral-500">{{ stats.borrador }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">En preparación</p>
            <p class="text-2xl font-semibold text-warning-500">{{ stats.preparacion }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Listas para despacho</p>
            <p class="text-2xl font-semibold text-success-500">{{ stats.listas }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Remitos pendientes</p>
            <p class="text-2xl font-semibold text-info-500">{{ stats.remitosPendientes }}</p>
          </div>
        </UPageCard>
      </div>

      <div class="flex gap-2 flex-wrap">
        <UButton
          v-for="opt in statusButtons"
          :key="String(opt.value)"
          :variant="statusFilter === opt.value ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          :label="opt.label"
          @click="statusFilter = opt.value"
        />
      </div>

      <div class="flex items-center justify-between gap-4 rounded-xl border border-default bg-elevated/40 px-4 py-3">
        <div>
          <p class="text-sm font-medium">Visibilidad de órdenes</p>
          <p class="text-xs text-muted">Podés incluir las órdenes de venta canceladas en este listado.</p>
        </div>
        <label class="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span>Mostrar canceladas</span>
          <USwitch v-model="showCancelled" aria-label="Mostrar órdenes de venta canceladas" />
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
