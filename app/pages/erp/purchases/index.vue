<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { createPurchasesColumns } from '~/modulos/erp/purchases/columns'
import { CATEGORY_LABELS, getCategoryStatuses, getStatusColor } from '~/modulos/erp/documents/types/document-statuses'

// ─── Store ──────────────────────────────────────────────────────────────────
const documentsPurchasesStore = useDocumentsPurchasesStore()
const router = useRouter()
const toast = useToast()

const documents = computed(() => documentsPurchasesStore.items)
const pending = computed(() => documentsPurchasesStore.loading)
const error = computed(() => documentsPurchasesStore.error)

// ─── Filtros ──────────────────────────────────────────────────────────────────
const categoryFilter = ref<string | undefined>(undefined)
const statusFilter = ref<number | undefined>(undefined)

const refresh = () =>
  documentsPurchasesStore.fetchAll({
    status: statusFilter.value,
    category: categoryFilter.value
  })

onMounted(async () => {
  await refresh()
})

watch(categoryFilter, () => {
  statusFilter.value = undefined
  refresh()
})

watch(statusFilter, () => refresh())

// ─── Filtros de categoría ─────────────────────────────────────────────────────
const PURCHASE_CATEGORIES = ['ORDER', 'REMITO', 'INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE'] as const

const categoryOptions = computed(() => [
  { label: 'Todos', value: undefined },
  ...PURCHASE_CATEGORIES.map((cat) => ({
    label: CATEGORY_LABELS[cat] ?? cat,
    value: cat
  }))
])

// ─── Filtros de estado (según categoría) ─────────────────────────────────────
const statusOptions = computed(() =>
  categoryFilter.value ? getCategoryStatuses(categoryFilter.value) : []
)

// ─── Estadísticas ─────────────────────────────────────────────────────────────
const stats = computed(() => {
  const docs = documents.value ?? []
  if (categoryFilter.value) {
    const statuses = getCategoryStatuses(categoryFilter.value)
    return {
      byCategory: [],
      byStatus: statuses.map((s) => {
        const matching = docs.filter((d) => d.status === s.value)
        return {
          label: s.label,
          count: matching.length,
          total: matching.reduce((a, d) => a + Number(d.total), 0),
          color: getStatusColor(categoryFilter.value, s.value)
        }
      })
    }
  }
  return {
    byCategory: PURCHASE_CATEGORIES.map((cat) => ({
      label: CATEGORY_LABELS[cat] ?? cat,
      count: docs.filter((d) => d.document_types?.category === cat).length
    })),
    byStatus: []
  }
})

const STATUS_TEXT_CLASSES: Record<string, string> = {
  primary: 'text-primary-500',
  neutral: 'text-muted',
  secondary: 'text-secondary-500',
  success: 'text-success-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  error: 'text-error-500'
}

const statusTextClass = (color: string) => STATUS_TEXT_CLASSES[color] ?? 'text-muted'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function openDocument(row: any) {
  router.push(`/erp/purchases/purchases-documents/${row.id}`)
}

async function deleteDrafts(rows: any[]) {
  const drafts = rows.filter(row => row.status === 0)
  if (drafts.length !== rows.length) {
    toast.add({ title: 'Solo se pueden eliminar documentos en borrador', color: 'warning' })
    return
  }
  try {
    for (const document of drafts) await documentsPurchasesStore.remove(document.id)
    toast.add({ title: `${drafts.length} borrador${drafts.length === 1 ? '' : 'es'} eliminado${drafts.length === 1 ? '' : 's'}`, color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudieron eliminar todos los borradores', description: e?.data?.message || e?.message, color: 'error' })
    await refresh()
  }
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
        <template v-if="categoryFilter">
          <UPageCard
            v-for="s in stats.byStatus"
            :key="s.label"
            variant="subtle"
          >
            <div class="space-y-1">
              <p class="text-xs text-muted">{{ s.label }}</p>
              <p class="text-2xl font-semibold" :class="statusTextClass(s.color)">{{ s.count }}</p>
              <p class="text-xs text-muted">{{ fmt(s.total) }}</p>
            </div>
          </UPageCard>
        </template>
        <template v-else>
          <UPageCard variant="subtle">
            <div class="space-y-1">
              <p class="text-xs text-muted">Total documentos</p>
              <p class="text-2xl font-semibold">{{ (documents ?? []).length }}</p>
            </div>
          </UPageCard>
          <UPageCard
            v-for="c in stats.byCategory"
            :key="c.label"
            variant="subtle"
          >
            <div class="space-y-1">
              <p class="text-xs text-muted">{{ c.label }}</p>
              <p class="text-2xl font-semibold">{{ c.count }}</p>
            </div>
          </UPageCard>
        </template>
      </div>

      <!-- Filtro por categoría -->
      <div class="flex gap-2 flex-wrap">
        <UButton
          v-for="opt in categoryOptions"
          :key="opt.label"
          :variant="categoryFilter === opt.value ? 'solid' : 'ghost'"
          color="primary"
          size="sm"
          :label="opt.label"
          @click="() => { categoryFilter = opt.value }"
        />
      </div>

      <!-- Filtro por estado (solo con categoría seleccionada) -->
      <div v-if="categoryFilter" class="flex gap-2 flex-wrap">
        <UButton
          :variant="statusFilter === undefined ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          label="Todos los estados"
          @click="() => { statusFilter = undefined }"
        />
        <UButton
          v-for="opt in statusOptions"
          :key="opt.value"
          :variant="statusFilter === opt.value ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          :label="opt.label"
          @click="() => { statusFilter = opt.value }"
        />
      </div>

      <!-- Tabla -->
      <LogisticaTable
        :data="documents ?? []"
        :columns="columns"
        :loading="pending"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
        :on-delete="deleteDrafts"
        selectable
        :can-select-row="row => row.status === 0"
        delete-permanently
      />
    </div>
  </UPage>
</template>
