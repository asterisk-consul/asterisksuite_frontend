<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import DocumentStatusVisibilityPopover from '~/components/erp/documents/DocumentStatusVisibilityPopover.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { useServerTable } from '~/composables/table/useServerTable'
import { getCategoryStatuses } from '~/modulos/erp/documents/types/document-statuses'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'

const router = useRouter()
const toast = useToast()
const store = useDocumentsSalesStore()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=REMITO')

const hiddenStatusKeys = ref<string[]>([])
const statusVisibilityGroups = computed(() => [{
  category: 'REMITO',
  direction: 1 as const,
  label: 'Remitos',
  options: getCategoryStatuses('REMITO'),
}])
const cancelTarget = ref<any | null>(null)
const cancelModalOpen = ref(false)
const cancelProcessing = ref(false)
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => documents.value.filter(document =>
  !hiddenStatusKeys.value.includes(`REMITO:${document.status}`),
))
const loading = computed(() => store.loading)
const serverTable = useServerTable((query) => store.fetchPage({
  ...query,
  category: 'REMITO',
  excludeStatuses: hiddenStatusKeys.value.join(',') || undefined,
}))
const { page, pageSize, search, sorting, filters, refresh } = serverTable
watch(hiddenStatusKeys, () => {
  page.value = 1
  void refresh()
}, { deep: true })
watch(filters, (currentFilters) => {
  const selectedStatuses = currentFilters
    .filter(filter => filter.column === 'status' && /^\d+$/.test(String(filter.value)))
    .map(filter => `REMITO:${Number(filter.value)}`)
  if (selectedStatuses.some(key => hiddenStatusKeys.value.includes(key))) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(key => !selectedStatuses.includes(key))
  }
}, { deep: true })

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

function editDocument(row: any) {
  router.push(`/erp/sales/${row.id}/edit`)
}

function openCancelModal(row: any) {
  cancelTarget.value = row
  cancelModalOpen.value = true
}

async function confirmCancelRemito() {
  if (!cancelTarget.value || cancelProcessing.value) return
  cancelProcessing.value = true
  try {
    await store.cancel(cancelTarget.value.id)
    await refresh()
    toast.add({ title: 'Remito anulado', color: 'success' })
    cancelModalOpen.value = false
    cancelTarget.value = null
  } catch (error: any) {
    toast.add({
      title: 'No se pudo anular el remito',
      description: error?.data?.message || error?.message || 'Revisá los efectos operativos asociados.',
      color: 'error'
    })
  } finally {
    cancelProcessing.value = false
  }
}

function getRemitoRowActions(row: any) {
  const status = Number(row.status)
  const actions: any[] = []
  if ([0, 1].includes(status) && row.amounts_visible !== false && canDocument('sales', 'REMITO', 'update')) {
    actions.push({ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => editDocument(row) })
  }
  if (status === 0 && canDocument('sales', 'REMITO', 'cancel')) {
    actions.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onSelect: () => openCancelModal(row) })
  }
  actions.push({ label: 'Abrir remito', icon: 'i-lucide-arrow-up-right', onSelect: () => openDocument(row) })
  return [actions]
}

const columns = computed(() =>
  createSalesColumns({
    onOpen: openDocument,
    getRowActions: getRemitoRowActions,
    actionsFirst: true,
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

    <UModal v-model:open="cancelModalOpen" title="Anular remito" :dismissible="!cancelProcessing">
      <template #body>
        <p v-if="cancelTarget">¿Anular el remito <strong>#{{ cancelTarget.number }}</strong>?</p>
        <p class="mt-2 text-sm text-muted">Se validarán los efectos operativos asociados antes de anularlo.</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" :disabled="cancelProcessing" @click="cancelModalOpen = false" />
          <UButton label="Anular" color="error" :loading="cancelProcessing" @click="confirmCancelRemito" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
