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
const toast = useToast()
const store = useDocumentsPurchasesStore()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/purchases/orders/new')

const showCancelled = ref(false)
const cancelTarget = ref<any | null>(null)
const cancelModalOpen = ref(false)
const cancelProcessing = ref(false)
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

function editDocument(row: any) {
  router.push(`/erp/purchases/orders/${row.id}/edit`)
}

function canCancelOrder(row: any) {
  const status = Number(row.status)
  const cancellable = status === 0 || (status >= 2 && status < 7 && !isDocumentCancelled('ORDER', status, -1))
  return cancellable && canDocument('purchases', 'ORDER', 'cancel')
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
    toast.add({ title: 'Orden de compra anulada', color: 'success' })
    cancelModalOpen.value = false
    cancelTarget.value = null
  } catch (error: any) {
    toast.add({
      title: 'No se pudo anular la orden',
      description: error?.data?.message || error?.message || 'Revisá los pagos y efectos asociados.',
      color: 'error'
    })
  } finally {
    cancelProcessing.value = false
  }
}

function getOrderRowActions(row: any) {
  const status = Number(row.status)
  const groups: any[][] = []

  if (canDocument('purchases', 'ORDER', 'create')) {
    groups.push([{
      label: 'Duplicar como borrador',
      icon: 'i-lucide-copy',
      onSelect: () => duplicateDocument(row)
    }])
  }

  const actions: any[] = []
  if ([0, 1].includes(status) && row.amounts_visible !== false && canDocument('purchases', 'ORDER', 'update')) {
    actions.push({ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => editDocument(row) })
  }
  if (status === 2 && canDocument('purchases', 'INVOICE', 'create')) {
    actions.push({
      label: 'Crear factura',
      icon: 'i-lucide-file-text',
      onSelect: () => router.push(`/erp/purchases/purchases-documents/new?parent_order_id=${row.id}`)
    })
  }
  if (canCancelOrder(row)) {
    actions.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onSelect: () => openCancelModal(row) })
  }
  if (actions.length) groups.push(actions)
  groups.push([{ label: 'Abrir orden', icon: 'i-lucide-arrow-up-right', onSelect: () => openDocument(row) }])
  return groups
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
  getRowActions: getOrderRowActions,
  actionsFirst: true,
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

    <UModal v-model:open="cancelModalOpen" title="Anular orden de compra" :dismissible="!cancelProcessing">
      <template #body>
        <p v-if="cancelTarget">¿Anular la orden de compra <strong>#{{ cancelTarget.number }}</strong>?</p>
        <p class="mt-2 text-sm text-muted">Se validarán los pagos y efectos operativos asociados antes de anularla.</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" :disabled="cancelProcessing" @click="cancelModalOpen = false" />
          <UButton label="Anular" color="error" :loading="cancelProcessing" @click="confirmCancelOrder" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
