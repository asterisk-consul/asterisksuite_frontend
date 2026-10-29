<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import { isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'

const router = useRouter()
const store = useDocumentsSalesStore()
useDocumentFormPreload('/erp/sales/new?category=QUOTE')

const statusFilter = ref<number | undefined>(undefined)
const showCancelled = ref(false)
const documents = computed(() => store.items ?? [])
const visibleDocuments = computed(() => showCancelled.value
  ? documents.value
  : documents.value.filter(document => !isDocumentCancelled('QUOTE', document.status)))
const loading = computed(() => store.loading)

const refresh = () => store.fetchAll({ status: statusFilter.value, category: 'QUOTE', excludeCancelled: !showCancelled.value })

onMounted(() => refresh())
watch(statusFilter, (status) => {
  if (status === 6 && !showCancelled.value) {
    showCancelled.value = true
    return
  }
  void refresh()
})
watch(showCancelled, (show) => {
  if (!show && statusFilter.value === 6) {
    statusFilter.value = undefined
    return
  }
  void refresh()
})

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
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Borradores</p>
            <p class="text-2xl font-semibold text-neutral-500">{{ stats.borrador }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Pendientes</p>
            <p class="text-2xl font-semibold text-warning-500">{{ stats.pendiente }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Confirmados</p>
            <p class="text-2xl font-semibold text-success-500">{{ stats.confirmado }}</p>
            <p class="text-xs text-muted">{{ fmt(stats.totalConfirmado) }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Total</p>
            <p class="text-2xl font-semibold">{{ stats.total }}</p>
          </div>
        </UPageCard>
      </div>

      <div class="flex gap-2 flex-wrap">
        <UButton v-for="opt in statusOptions" :key="String(opt.value)" :variant="statusFilter === opt.value ? 'solid' : 'ghost'" color="neutral" size="sm" :label="opt.label" @click="statusFilter = opt.value" />
      </div>

      <div class="flex items-center justify-between gap-4 rounded-xl border border-default bg-elevated/40 px-4 py-3">
        <div>
          <p class="text-sm font-medium">Visibilidad de presupuestos</p>
          <p class="text-xs text-muted">Podés incluir los presupuestos cancelados en este listado.</p>
        </div>
        <label class="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span>Mostrar cancelados</span>
          <USwitch v-model="showCancelled" aria-label="Mostrar presupuestos cancelados" />
        </label>
      </div>

      <LogisticaTable
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
