<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import GenerateFromTripsModal from '~/components/sales/GenerateFromTripsModal.vue'

// ─── Store ──────────────────────────────────────────────────────────────────
const documentsSalesStore = useDocumentsSalesStore()
const router = useRouter()

const documents = computed(() => documentsSalesStore.items)
const pending = computed(() => documentsSalesStore.loading)
const error = computed(() => documentsSalesStore.error)

// ─── Filtros ──────────────────────────────────────────────────────────────────
const statusFilter = ref<number | undefined>(undefined)
const generateResult = ref<{ total_trips: number; results: any[] } | null>(null)
const showGenerateModal = ref(false)

const refresh = () => documentsSalesStore.fetchAll({ status: statusFilter.value })

onMounted(async () => {
  await documentsSalesStore.fetchAll({ status: statusFilter.value })
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
  router.push(`/erp/sales/${row.id}`)
}

async function onGenerateSaved() {
  await refresh()
}

// ─── Columnas ─────────────────────────────────────────────────────────────────
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
    <AppPageHeader title="Comprobantes de venta" description="Gestión de documentos de venta">
      <template #links>
        <UButton
          label="Crear Factura"
          icon="i-lucide-file-plus"
          color="primary"
          @click="navigateTo('/erp/sales/new?category=INVOICE')"
        />
        <UButton
          icon="i-lucide-file-plus"
          label="Generar desde viajes"
          @click="showGenerateModal = true"
        />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <!-- Resultado de generación -->
      <UAlert
        v-if="generateResult"
        color="success"
        variant="subtle"
        icon="i-lucide-check-circle"
        :title="`Generados: ${generateResult.results.reduce((a, r) => a + r.created, 0)} — Existentes: ${generateResult.results.reduce((a, r) => a + r.skipped, 0)}`"
        closable
        @close="generateResult = null"
      />

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

  <GenerateFromTripsModal
    v-model="showGenerateModal"
    @saved="onGenerateSaved"
  />
</template>
