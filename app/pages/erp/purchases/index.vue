<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { createPurchasesColumns } from '~/modulos/erp/purchases/columns'

// ─── Store ──────────────────────────────────────────────────────────────────
const documentsPurchasesStore = useDocumentsPurchasesStore()
const router = useRouter()

const documents = computed(() => documentsPurchasesStore.items)
const pending = computed(() => documentsPurchasesStore.loading)
const error = computed(() => documentsPurchasesStore.error)

// ─── Filtros ──────────────────────────────────────────────────────────────────
const statusFilter = ref<number | undefined>(undefined)

const refresh = () => documentsPurchasesStore.fetchAll({ status: statusFilter.value })

onMounted(async () => {
  await documentsPurchasesStore.fetchAll({ status: statusFilter.value })
})

watch(statusFilter, () => refresh())

// ─── Estadísticas ─────────────────────────────────────────────────────────────
const stats = computed(() => {
  const docs = documents.value ?? []
  return {
    total: docs.length,
    pendiente: docs.filter((d) => d.status === 1).length,
    confirmado: docs.filter((d) => d.status === 2).length,
    anulado: docs.filter((d) => d.status === 3).length,
    totalPendiente: docs.filter((d) => d.status === 1).reduce((a, d) => a + Number(d.total), 0),
    totalConfirmado: docs.filter((d) => d.status === 2).reduce((a, d) => a + Number(d.total), 0)
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function openDocument(row: any) {
  router.push(`/erp/purchases/purchases-documents/${row.id}`)
}

// ─── Columnas ─────────────────────────────────────────────────────────────────
const columns = createPurchasesColumns({ onOpen: openDocument })

const filterFields = [
  { id: 'number', label: 'Buscar por N°...' },
  { id: 'supplier', label: 'Buscar por proveedor...' },
  { id: 'descrip', label: 'Buscar por descripción...' }
]

const sortFields = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Proveedor', value: 'supplier' },
  { label: 'Total', value: 'total' }
]

// ─── Filtros de estado ───────────────────────────────────────────────────────
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
    <AppPageHeader title="Comprobantes de compra" description="Gestión de documentos de compra">
      <template #links>
        <UButton
          icon="i-lucide-plus"
          label="Nueva factura"
          to="/erp/purchases/purchases-documents/new"
        />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Error al cargar documentos"
      />

      <!-- Estadísticas -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Pendientes</p>
            <p class="text-2xl font-semibold text-warning-500">{{ stats.pendiente }}</p>
            <p class="text-xs text-muted">{{ fmt(stats.totalPendiente) }}</p>
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
            <p class="text-xs text-muted">Anulados</p>
            <p class="text-2xl font-semibold text-error-500">{{ stats.anulado }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Total documentos</p>
            <p class="text-2xl font-semibold">{{ stats.total }}</p>
          </div>
        </UPageCard>
      </div>

      <!-- Filtro por estado -->
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

      <!-- Tabla -->
      <LogisticaTable
        :data="documents ?? []"
        :columns="columns"
        :loading="pending"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
      />
    </div>
  </UPage>
</template>
