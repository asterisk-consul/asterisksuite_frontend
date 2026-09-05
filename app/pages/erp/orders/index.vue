<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'

const router = useRouter()
const store = useDocumentsSalesStore()

const statusFilter = ref<number | undefined>(undefined)
const documents = computed(() => store.items ?? [])
const loading = computed(() => store.loading)

const refresh = () => store.fetchAll({ status: statusFilter.value, category: 'ORDER' })

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

function openDocument(row: any) {
  router.push(`/erp/sales/${row.id}`)
}

const columns = createSalesColumns({ onOpen: openDocument })

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
            <p class="text-xs text-muted">Pendientes</p>
            <p class="text-2xl font-semibold text-warning-500">{{ stats.pendiente }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Confirmadas</p>
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
