<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { canSettleDocument } from '~/modulos/erp/documents/utils/document-payment-status'

const router = useRouter()
const store = useDocumentsSalesStore()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=ORDER')

const statusFilter = ref<number | undefined>(undefined)
const documents = computed(() => store.items ?? [])
const loading = computed(() => store.loading)

const refresh = () => store.fetchAll({ status: statusFilter.value, category: 'ORDER' })

onMounted(() => refresh())
watch(statusFilter, () => refresh())

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

const columns = computed(() =>
  createSalesColumns({ onOpen: openDocument, onCollect: collectDocument, showCreator: isOwnerOrAdmin.value })
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

const statusOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 0 },
  { label: 'Pendiente', value: 1 },
  { label: 'Confirmado', value: 2 },
  { label: 'Entregada', value: 5 },
  { label: 'Anulado', value: 3 }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Órdenes de Venta">
      <template #links>
        <UButton icon="i-lucide-file-plus" label="Nueva OV" :to="`/erp/sales/new?category=ORDER`" />
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
          v-for="opt in statusOptions"
          :key="String(opt.value)"
          :variant="statusFilter === opt.value ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          :label="opt.label"
          @click="statusFilter = opt.value"
        />
      </div>

      <LogisticaTable
        :data="documents"
        :columns="columns"
        :loading="loading"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
      />
    </div>
  </UPage>
</template>
