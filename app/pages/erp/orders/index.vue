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
import { DocumentsSalesService, type SalespersonOption } from '~/modulos/erp/sales/services/sales.service'

const router = useRouter()
const store = useDocumentsSalesStore()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=ORDER')

const salespeople = ref<SalespersonOption[]>([])
const showCancelled = ref(false)
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => showCancelled.value
  ? documents.value
  : documents.value.filter(document => !isDocumentCancelled('ORDER', document.status)))
const loading = computed(() => store.loading)
const sellerFilterOptions = computed(() => [
  { value: '__NO_SELLER__', label: 'Sin vendedor' },
  ...salespeople.value.map(seller => ({
    value: `${seller.seller_type}:${seller.id}`,
    label: `${seller.first_name} ${seller.last_name}`.trim() + (seller.seller_type === 'PARTNER' ? ' · Socio' : ' · Empleado')
  }))
])

onMounted(async () => {
  try {
    salespeople.value = await DocumentsSalesService.getSalespeople()
  } catch {
    // El filtro es complementario; el listado de OV sigue disponible si falla.
  }
})

const serverTable = useServerTable((query) => {
  return store.fetchPage({
    ...query,
    category: 'ORDER',
    excludeCancelled: !showCancelled.value
  })
})
const { page, pageSize, search, sorting, filters, refresh } = serverTable
const cancelledStatusFilterActive = computed(() => filters.value.some((filter) =>
  filter.column === 'status' && Number(filter.value) === 8
))
watch(showCancelled, (show) => {
  if (!show && cancelledStatusFilterActive.value) {
    filters.value = filters.value.filter((filter) => !(filter.column === 'status' && Number(filter.value) === 8))
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
  { label: 'En preparación', value: 'order-flow:PENDING' },
  { label: 'Lista para despacho', value: 'order-flow:ELIGIBLE' },
  { label: 'Remito pendiente', value: 'order-flow:DRAFT_CREATED' },
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
    showSeller: true,
    sellerFilterOptions: sellerFilterOptions.value,
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

</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Órdenes de Venta">
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
            <p class="text-xs text-muted">En preparación</p>
            <p class="text-xl font-semibold leading-6 text-warning-500">{{ stats.preparacion }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Listas para despacho</p>
            <p class="text-xl font-semibold leading-6 text-success-500">{{ stats.listas }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="space-y-0.5">
            <p class="text-xs text-muted">Remitos pendientes</p>
            <p class="text-xl font-semibold leading-6 text-info-500">{{ stats.remitosPendientes }}</p>
          </div>
        </UPageCard>
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
