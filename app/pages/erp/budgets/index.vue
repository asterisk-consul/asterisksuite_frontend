<script setup lang="ts">
definePageMeta({ layout: 'erp', middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { STATUS_LABELS, STATUS_COLORS } from '~/modulos/erp/sales/types/sales.types'

const router = useRouter()
const store = useDocumentsSalesStore()

const statusFilter = ref<number | undefined>(undefined)

const documents = computed(() => store.items ?? [])
const loading = computed(() => store.loading)

const refresh = () => store.fetchAll({ status: statusFilter.value, category: 'QUOTE' })

onMounted(() => refresh())
watch(statusFilter, () => refresh())

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

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}

const columns = [
  { id: 'number', header: 'Nº' },
  { id: 'date', header: 'Fecha' },
  { id: 'client', header: 'Cliente' },
  { id: 'descrip', header: 'Descripción' },
  { id: 'total', header: 'Total' },
  { id: 'status', header: 'Estado' },
  { id: 'actions', header: '' }
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Presupuestos">
        <template #trailing>
          <UButton icon="i-lucide-file-plus" label="Nuevo presupuesto" :to="`/erp/sales/new?category=QUOTE`" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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

        <UPageCard variant="subtle">
          <UTable :data="documents" :columns="columns" :loading="loading">
            <template #number-cell="{ row }">
              <span class="font-mono font-medium">{{ row.original.document_types?.code }}-{{ String(row.original.number).padStart(8, '0') }}</span>
            </template>
            <template #date-cell="{ row }">{{ fmtDate(row.original.date) }}</template>
            <template #client-cell="{ row }">{{ row.original.business_parties?.name ?? '-' }}</template>
            <template #descrip-cell="{ row }"><span class="text-muted text-xs">{{ row.original.descrip ?? '-' }}</span></template>
            <template #total-cell="{ row }"><span class="font-medium">{{ fmt(Number(row.original.total)) }}</span></template>
            <template #status-cell="{ row }">
              <UBadge :label="STATUS_LABELS[row.original.status]" :color="STATUS_COLORS[row.original.status] as any" variant="subtle" />
            </template>
            <template #actions-cell="{ row }">
              <UButton icon="i-lucide-eye" variant="ghost" color="neutral" size="sm" :to="`/erp/sales/${row.original.id}`" />
            </template>
          </UTable>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
