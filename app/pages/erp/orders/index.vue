<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import DocumentStatusVisibilityPopover from '~/components/erp/documents/DocumentStatusVisibilityPopover.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { canSettleDocument } from '~/modulos/erp/documents/utils/document-payment-status'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import { useServerTable } from '~/composables/table/useServerTable'
import { getCategoryStatuses, isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'
import { DocumentsSalesService, type SalespersonOption } from '~/modulos/erp/sales/services/sales.service'

const router = useRouter()
const toast = useToast()
const store = useDocumentsSalesStore()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=ORDER')

const salespeople = ref<SalespersonOption[]>([])
const hiddenStatusKeys = ref<string[]>([])
const statusVisibilityGroups = computed(() => [{
  category: 'ORDER',
  direction: 1 as const,
  label: 'Órdenes de venta',
  options: getCategoryStatuses('ORDER'),
}])
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => documents.value.filter(document =>
  !hiddenStatusKeys.value.includes(`ORDER:${document.status}`),
))
const loading = computed(() => store.loading)
const sellerFilterOptions = computed(() => [
  { value: '__NO_SELLER__', label: 'Sin vendedor' },
  ...salespeople.value.map(seller => ({
    value: `${seller.seller_type}:${seller.id}`,
    label: `${seller.first_name} ${seller.last_name}`.trim() + (seller.seller_type === 'PARTNER' ? ' · Socio' : ' · Empleado')
  }))
])
const cancelTarget = ref<any | null>(null)
const cancelModalOpen = ref(false)
const cancelProcessing = ref(false)

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
    excludeStatuses: hiddenStatusKeys.value.join(',') || undefined
  })
})
const { page, pageSize, search, sorting, filters, refresh } = serverTable
watch(hiddenStatusKeys, () => {
  page.value = 1
  void refresh()
}, { deep: true })
watch(filters, (currentFilters) => {
  const selectedStatuses = currentFilters
    .filter(filter => filter.column === 'status' && /^\d+$/.test(String(filter.value)))
    .map(filter => `ORDER:${Number(filter.value)}`)
  if (selectedStatuses.some(key => hiddenStatusKeys.value.includes(key))) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(key => !selectedStatuses.includes(key))
  }
}, { deep: true })

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

function editDocument(row: any) {
  router.push(`/erp/sales/${row.id}/edit`)
}

function canCancelOrder(row: any) {
  const status = Number(row.status)
  const cancellable = status === 0 || (status >= 2 && status < 7 && !isDocumentCancelled('ORDER', status))
  return cancellable && canDocument('sales', 'ORDER', 'cancel')
}

function openCancelModal(row: any) {
  cancelTarget.value = row
  cancelModalOpen.value = true
}

async function confirmCancelOrder() {
  if (!cancelTarget.value || cancelProcessing.value) return
  cancelProcessing.value = true
  try {
    await store.cancel(cancelTarget.value.id)
    await refresh()
    toast.add({ title: 'Orden de venta anulada', color: 'success' })
    cancelModalOpen.value = false
    cancelTarget.value = null
  } catch (error: any) {
    toast.add({
      title: 'No se pudo anular la orden',
      description: error?.data?.message || error?.message || 'Revisá los efectos operativos asociados.',
      color: 'error'
    })
  } finally {
    cancelProcessing.value = false
  }
}

function getOrderRowActions(row: any) {
  const status = Number(row.status)
  const groups: any[][] = []

  if (canDocument('sales', 'ORDER', 'create')) {
    groups.push([{
      label: 'Duplicar como borrador',
      icon: 'i-lucide-copy',
      onSelect: () => duplicateDocument(row)
    }])
  }

  const actions: any[] = []
  if ([0, 1].includes(status) && row.amounts_visible !== false && canDocument('sales', 'ORDER', 'update')) {
    actions.push({ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => editDocument(row) })
  }
  if (status >= 2 && status < 7) {
    const operation = row.commercial_operation
    if (operation?.delivery_note_id) {
      actions.push({
        label: operation.delivery_status === 'DRAFT_CREATED' ? 'Completar remito' : 'Ver remito',
        icon: 'i-lucide-truck',
        onSelect: () => router.push(`/erp/remitos/${operation.delivery_note_id}`)
      })
    } else if ((!operation || operation.delivery_status === 'ELIGIBLE') && canDocument('sales', 'REMITO', 'create')) {
      actions.push({ label: 'Abrir OV para crear remito', icon: 'i-lucide-truck', onSelect: () => openDocument(row) })
    }
    if (canDocument('sales', 'INVOICE', 'create')) {
      actions.push({
        label: 'Crear factura',
        icon: 'i-lucide-file-text',
        onSelect: () => router.push(`/erp/sales/new?category=INVOICE&parent_order_id=${row.id}`)
      })
    }
    if (canSettleDocument(row) && row.party_id) {
      actions.push({ label: 'Registrar cobro', icon: 'i-lucide-hand-coins', onSelect: () => collectDocument(row) })
    }
  }
  if (canCancelOrder(row)) {
    actions.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onSelect: () => openCancelModal(row) })
  }
  if (actions.length) groups.push(actions)
  groups.push([{ label: 'Abrir orden', icon: 'i-lucide-arrow-up-right', onSelect: () => openDocument(row) }])
  return groups
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
    getRowActions: getOrderRowActions,
    actionsFirst: true,
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

      <div class="flex justify-end">
        <DocumentStatusVisibilityPopover v-model:hidden-status-keys="hiddenStatusKeys" :groups="statusVisibilityGroups" />
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

    <UModal v-model:open="cancelModalOpen" title="Anular orden de venta" :dismissible="!cancelProcessing">
      <template #body>
        <p v-if="cancelTarget">¿Anular la orden de venta <strong>#{{ cancelTarget.number }}</strong>?</p>
        <p class="mt-2 text-sm text-muted">Se validarán los pagos y efectos operativos asociados antes de anularla.</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" :disabled="cancelProcessing" @click="cancelModalOpen = false" />
          <UButton label="Anular" color="error" :loading="cancelProcessing" @click="confirmCancelOrder" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
