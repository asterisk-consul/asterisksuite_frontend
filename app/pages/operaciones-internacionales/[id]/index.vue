<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AssociateDocumentModal from '~/components/international-operations/AssociateDocumentModal.vue'
import AssociateQuoteModal from '~/components/international-operations/AssociateQuoteModal.vue'
import CreateQuoteModal from '~/components/international-operations/CreateQuoteModal.vue'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type {
  OperationStatus,
  InternationalExpenseType,
  ContainerStatus,
  ContainerType
} from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const id = route.params.id as string

const {
  current: operation,
  summary,
  loading,
  fetchOne,
  fetchSummary,
  updateStatus,
  updateContainer,
  disassociateDocument,
  updateQuoteStatus,
  disassociateQuote,
  statusColor,
  statusLabel,
  statusOptions,
  statusDescriptions,
  containerStatusColor,
  containerStatusLabel,
  containerStatusOptions,
  containerStatusDescriptions,
  containerTypeLabel,
  expenseTypeLabel,
  formatCurrency,
  formatDate,
  removeContainer
} = useInternationalOperations()

const showDocumentModal = ref(false)
const showQuoteModal = ref(false)
const showCreateQuoteModal = ref(false)

const quoteStatusColor = (status: string): any =>
  status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning'
const quoteStatusLabel = (status: string) =>
  status === 'ACCEPTED' ? 'Aceptado' : status === 'REJECTED' ? 'Rechazado' : 'Pendiente'

onMounted(async () => {
  await fetchOne(id)
  await fetchSummary(id)
  setupObserver()
})

const statusIcons: Record<OperationStatus, string> = {
  PLANNED: 'i-lucide-calendar-clock',
  IN_PREPARATION: 'i-lucide-package',
  SHIPPED: 'i-lucide-ship',
  IN_TRANSIT: 'i-lucide-route',
  ARRIVED: 'i-lucide-anchor',
  CUSTOMS: 'i-lucide-landmark',
  RELEASED: 'i-lucide-stamp',
  DELIVERED: 'i-lucide-check-circle',
  CLOSED: 'i-lucide-lock',
  CANCELLED: 'i-lucide-ban'
}

const transportIcons: Record<string, string> = {
  MARITIME: 'i-lucide-ship',
  AIR: 'i-lucide-plane',
  LAND: 'i-lucide-truck',
  MULTIMODAL: 'i-lucide-shuffle',
  OTHER: 'i-lucide-box'
}

const transportLabels: Record<string, string> = {
  MARITIME: 'Marítimo',
  AIR: 'Aéreo',
  LAND: 'Terrestre',
  MULTIMODAL: 'Multimodal',
  OTHER: 'Otro'
}

const handleStatusChange = async (status: OperationStatus) => {
  const current = operation.value?.status
  if (current && current !== status && confirm(`¿Cambiar estado de "${statusLabel(current)}" a "${statusLabel(status)}"?`)) {
    await updateStatus(id, status)
    await fetchSummary(id)
  }
}

const operationStatusItems = computed(() =>
  statusOptions.map((s) => ({
    label: s.value === operation.value?.status ? `${s.label} (actual)` : s.label,
    icon: statusIcons[s.value as OperationStatus],
    disabled: s.value === operation.value?.status,
    onSelect: () => handleStatusChange(s.value as OperationStatus)
  }))
)

const getContainerStatusItems = (container: any) =>
  containerStatusOptions.map((s) => ({
    label: s.value === container.status ? `${s.label} (actual)` : s.label,
    disabled: s.value === container.status,
    onSelect: () => handleContainerStatusChange(container.id, s.value as ContainerStatus)
  }))

const handleContainerStatusChange = async (containerId: string, status: ContainerStatus) => {
  if (confirm(`¿Cambiar estado del contenedor a "${containerStatusLabel(status)}"?`)) {
    await updateContainer(containerId, { status })
    await fetchOne(id)
    await fetchSummary(id)
  }
}

const handleRemoveContainer = async (containerId: string) => {
  if (confirm('¿Eliminar este contenedor?')) {
    await removeContainer(containerId).catch((e: any) => {
      alert(e?.data?.message ?? 'No se pudo eliminar el contenedor')
    })
    await fetchSummary(id)
  }
}

const handleDisassociateDocument = async (documentId: string) => {
  if (confirm('¿Desasociar este documento de la operación?')) {
    await disassociateDocument(id, documentId)
    await fetchOne(id)
    await fetchSummary(id)
  }
}

const handleAcceptQuote = async (quote: any) => {
  if (confirm('¿Aceptar este presupuesto como ganador? Los demás presupuestos pendientes pasarán a rechazados.')) {
    await updateQuoteStatus(id, quote.id, 'ACCEPTED')
  }
}

const handleRejectQuote = async (quote: any) => {
  if (confirm('¿Rechazar este presupuesto?')) {
    await updateQuoteStatus(id, quote.id, 'REJECTED')
  }
}

const handleResetQuote = async (quote: any) => {
  if (confirm('¿Marcar este presupuesto como pendiente?')) {
    await updateQuoteStatus(id, quote.id, 'PENDING')
  }
}

const handleDisassociateQuote = async (quote: any) => {
  if (confirm('¿Desasociar este presupuesto de la operación?')) {
    await disassociateQuote(id, quote.id)
  }
}

const quoteAssociatedIds = computed(() => operation.value?.operation_quotes?.map((q) => q.document_id) ?? [])

const getPaymentStatus = (doc: any): { label: string; color: any } => {
  const paid = doc.paid_amount ?? 0
  const total = doc.total ?? 0
  if (paid >= total && total > 0) return { label: 'Pagado', color: 'success' }
  if (paid > 0) return { label: 'Parcialmente pagado', color: 'warning' }
  return { label: 'Pendiente', color: 'error' }
}

const documentAssociatedIds = computed(() => operation.value?.operation_documents?.map((d) => d.document_id) ?? [])

const containerDocuments = (containerId: string) =>
  (operation.value?.operation_documents ?? []).filter((d: any) => d.container_id === containerId)

const fmtMoney = (amount: number, currency?: string) => {
  if (!currency || currency === '—') return amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })
  return formatCurrency(amount, currency)
}

// Info de doble moneda: si el documento está en otra moneda que la operación,
// muestra monto original + tipo de cambio + valor convertido (regla de mercado ARS/USD)
const docCurrencyInfo = (rel: any) => {
  const opCurrency = operation.value?.currency_code
  const docCurrency = rel.document?.currency_code
  if (!opCurrency || !docCurrency || docCurrency === opCurrency) return null
  const total = Number(rel.document?.total ?? 0)
  const rate = rel.exchange_rate ? Number(rel.exchange_rate) : null
  const converted = convertWithMarketRate(total, docCurrency, opCurrency, rate)
  return { total, rate, converted, docCurrency, opCurrency }
}

const containerExpenseTotal = (containerId: string): { total: number; paid: number; pending: number; currency: string; unconvertedCount: number; unconvertedAmount: number } | null => {
  const docs = containerDocuments(containerId)
  if (!docs.length) return null
  const opCurrency = operation.value?.currency_code ?? docs[0]!.document?.currency_code ?? 'USD'
  let total = 0
  let paid = 0
  let unconvertedCount = 0
  let unconvertedAmount = 0
  for (const d of docs) {
    const docCurrency = d.document?.currency_code ?? opCurrency
    const docTotal = Number(d.document?.total ?? 0)
    const docPaid = (d.document?.payment_documents ?? []).reduce(
      (sum: number, pd: any) => sum + Number(pd.amount_applied ?? 0), 0
    )
    const rate = d.exchange_rate ? Number(d.exchange_rate) : null
    const convertedTotal = convertWithMarketRate(docTotal, docCurrency, opCurrency, rate)
    const convertedPaid = convertWithMarketRate(docPaid, docCurrency, opCurrency, rate)
    if (convertedTotal != null) {
      total += convertedTotal
      paid += convertedPaid ?? 0
    } else {
      unconvertedCount += 1
      unconvertedAmount += docTotal
    }
  }
  return { total, paid, pending: total - paid, currency: opCurrency, unconvertedCount, unconvertedAmount }
}

const getContainerField = (container: any) => {
  const fields: { icon: string; label: string; value: string }[] = []
  if (container.vessel_name) fields.push({ icon: 'i-lucide-ship', label: 'Buque', value: container.vessel_name })
  if (container.voyage_number) fields.push({ icon: 'i-lucide-hash', label: 'Viaje', value: container.voyage_number })
  if (container.seal_number) fields.push({ icon: 'i-lucide-lock', label: 'Sello', value: container.seal_number })
  if (container.origin_port || container.destination_port)
    fields.push({ icon: 'i-lucide-map-pin', label: 'Ruta', value: `${container.origin_port ?? '—'} → ${container.destination_port ?? '—'}` })
  if (container.estimated_departure_date) fields.push({ icon: 'i-lucide-calendar', label: 'Salida est.', value: formatDate(container.estimated_departure_date) })
  if (container.estimated_arrival_date) fields.push({ icon: 'i-lucide-calendar-check', label: 'Arribo est. (ETA)', value: formatDate(container.estimated_arrival_date) })
  if (container.actual_departure_date) fields.push({ icon: 'i-lucide-calendar-check-2', label: 'Salida real', value: formatDate(container.actual_departure_date) })
  if (container.actual_arrival_date) fields.push({ icon: 'i-lucide-calendar-check-2', label: 'Arribo real', value: formatDate(container.actual_arrival_date) })
  if (container.weight) fields.push({ icon: 'i-lucide-weight', label: 'Peso', value: `${container.weight} kg` })
  if (container.volume) fields.push({ icon: 'i-lucide-box', label: 'Volumen', value: `${container.volume} m³` })
  return fields
}

const getContainerActions = (container: any) => {
  const hasDocs = containerDocuments(container.id).length > 0
  const actions: any[] = []
  if (!hasDocs) {
    actions.push({
      label: 'Eliminar contenedor',
      icon: 'i-lucide-trash',
      onSelect: () => handleRemoveContainer(container.id)
    })
  }
  return actions
}

// Pagos colapsables por documento
const expandedDocs = ref<Set<string>>(new Set())
const toggleDocPayments = (docId: string) => {
  if (expandedDocs.value.has(docId)) expandedDocs.value.delete(docId)
  else expandedDocs.value.add(docId)
}

// Sub-navegación sticky con sección activa
const sections = [
  { id: 'resumen', label: 'Resumen', icon: 'i-lucide-layout-dashboard' },
  { id: 'contenedores', label: 'Contenedores', icon: 'i-lucide-container' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'i-lucide-file-chart' },
  { id: 'documentos', label: 'Documentos', icon: 'i-lucide-file-text' }
]

const sectionCounts = computed(() => ({
  contenedores: operation.value?.containers?.length ?? 0,
  presupuestos: operation.value?.operation_quotes?.length ?? 0,
  documentos: summary.value?.stats.documentCount ?? 0
}))

const activeSection = ref('resumen')
let observer: IntersectionObserver | null = null

const setupObserver = () => {
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeSection.value = entry.target.id
      }
    },
    { rootMargin: '-96px 0px -70% 0px' }
  )
  for (const s of sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
}

onBeforeUnmount(() => observer?.disconnect())

const scrollTo = (sectionId: string) => {
  activeSection.value = sectionId
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <UPage class="pb-8">
    <div v-if="loading && !operation" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-32 w-full" />
    </div>

    <template v-if="operation">
      <!-- ═══════════════ HERO ═══════════════ -->
      <div class="mb-4">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="min-w-0">
            <UButton
              label="Operaciones Internacionales"
              variant="ghost"
              icon="i-lucide-arrow-left"
              size="xs"
              class="-ml-2 mb-2"
              to="/operaciones-internacionales"
            />
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-2xl font-bold font-mono tracking-tight">{{ operation.number }}</h1>
              <UBadge :label="statusLabel(operation.status)" :color="statusColor(operation.status) as any" size="lg" icon="" />
            </div>
            <p v-if="operation.name" class="text-muted mt-1">{{ operation.name }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              label="Editar"
              variant="outline"
              size="sm"
              icon="i-lucide-pencil"
              :to="`/operaciones-internacionales/${id}/edit`"
            />
          </div>
        </div>

        <!-- Chips: tipo / transporte / incoterm / proveedor -->
        <div class="flex items-center gap-2 flex-wrap mt-3">
          <UBadge :label="operation.operation_type === 'IMPORT' ? 'Importación' : operation.operation_type === 'EXPORT' ? 'Exportación' : 'Otro'" color="primary" variant="subtle" size="sm" />
          <UBadge
            v-if="operation.transport_type"
            :label="transportLabels[operation.transport_type] ?? operation.transport_type"
            color="neutral"
            variant="outline"
            size="sm"
            :icon="transportIcons[operation.transport_type]"
          />
          <UBadge v-if="operation.incoterm" :label="operation.incoterm" color="neutral" variant="outline" size="sm" />
          <span v-if="operation.currency_code" class="text-xs text-muted font-medium">en {{ operation.currency_code }}</span>
          <span v-if="operation.primary_supplier" class="text-xs text-muted flex items-center gap-1">
            <UIcon name="i-lucide-building-2" class="size-3.5" /> {{ operation.primary_supplier.name }}
          </span>
        </div>

        <!-- Cambio de estado libre + ayuda -->
        <div class="flex items-center gap-1 flex-wrap mt-3">
          <UDropdownMenu :items="operationStatusItems">
            <UButton label="Cambiar estado" icon="i-lucide-refresh-cw" size="xs" variant="outline" />
          </UDropdownMenu>
          <UPopover>
            <UButton icon="i-lucide-help-circle" size="xs" variant="ghost" aria-label="Estados" />
            <template #content>
              <div class="p-4 w-80 space-y-2.5">
                <p class="text-xs font-semibold text-muted uppercase tracking-wide">Estados de la operación</p>
                <div v-for="(d, key) in statusDescriptions" :key="key" class="flex gap-2.5">
                  <UIcon :name="statusIcons[key as OperationStatus]" class="size-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <p class="text-xs font-medium">{{ d.label }}</p>
                    <p class="text-xs text-muted">{{ d.description }}</p>
                  </div>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>

      <!-- ═══════════════ SUB-NAV STICKY ═══════════════ -->
      <div class="sticky top-0 z-20 -mx-4 px-4 py-2 bg-default/90 backdrop-blur border-b border-default">
        <div class="flex items-center gap-1 overflow-x-auto">
          <button
            v-for="s in sections"
            :key="s.id"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            :class="activeSection === s.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted/50 hover:text-default'"
            @click="scrollTo(s.id)"
          >
            <UIcon :name="s.icon" class="size-4" />
            {{ s.label }}
            <span
              v-if="sectionCounts[s.id as keyof typeof sectionCounts]"
              class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              :class="activeSection === s.id ? 'bg-primary/20 text-primary' : 'bg-muted/60 text-muted'"
            >
              {{ sectionCounts[s.id as keyof typeof sectionCounts] }}
            </span>
          </button>
        </div>
      </div>

      <!-- ALERTS -->
      <UAlert
        v-if="summary?.alerts.etaOverdue"
        color="error"
        variant="soft"
        icon="i-lucide-alert-triangle"
        title="ETA vencida"
        description="La fecha estimada de arribo ya pasó."
        class="mt-4"
      />
      <UAlert
        v-else-if="summary?.alerts.etaApproaching"
        color="warning"
        variant="soft"
        icon="i-lucide-calendar-clock"
        title="ETA próxima"
        description="El arribo estimado es en menos de 3 días."
        class="mt-4"
      />

      <!-- ═══════════════ RESUMEN ═══════════════ -->
      <div id="resumen" class="scroll-mt-20 mt-6 space-y-6">
        <!-- STATS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            class="flex items-center gap-3 rounded-xl border border-default p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
            @click="scrollTo('contenedores')"
          >
            <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-container" class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xs text-muted font-medium">Contenedores</p>
              <p class="text-xl font-bold">{{ summary?.stats.containerCount ?? 0 }}</p>
            </div>
          </button>
          <button
            class="flex items-center gap-3 rounded-xl border border-default p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
            @click="scrollTo('documentos')"
          >
            <div class="size-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-receipt-text" class="size-5 text-info" />
            </div>
            <div>
              <p class="text-xs text-muted font-medium">Facturas</p>
              <p class="text-xl font-bold">{{ summary?.stats.documentCount ?? 0 }}</p>
            </div>
          </button>
          <button
            class="flex items-center gap-3 rounded-xl border border-default p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
            @click="scrollTo('documentos')"
          >
            <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-credit-card" class="size-5 text-success" />
            </div>
            <div>
              <p class="text-xs text-muted font-medium">Pagos</p>
              <p class="text-xl font-bold">{{ summary?.stats.paymentCount ?? 0 }}</p>
            </div>
          </button>
          <button
            class="flex items-center gap-3 rounded-xl border border-default p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
            @click="scrollTo('presupuestos')"
          >
            <div class="size-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-file-chart" class="size-5 text-warning" />
            </div>
            <div>
              <p class="text-xs text-muted font-medium">Presupuestos</p>
              <p class="text-xl font-bold">{{ operation.operation_quotes?.length ?? 0 }}</p>
            </div>
          </button>
        </div>

        <!-- FINANCIERO + INFO -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 rounded-xl border border-default p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-wallet" class="size-4 text-muted" /> Situación Financiera
              </h2>
              <UBadge
                v-if="summary"
                :label="`Total ${fmtMoney(summary.financial.total.amount, summary.financial.currency ?? operation.currency_code)}`"
                color="primary"
                variant="subtle"
                size="sm"
              />
            </div>
            <div v-if="summary" class="space-y-3">
              <!-- Consolidado en moneda de la operación -->
              <div class="grid grid-cols-3 gap-2">
                <div class="text-center rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p class="text-[10px] text-muted font-medium uppercase tracking-wide">Total operación ({{ summary.financial.currency ?? operation.currency_code ?? 'USD' }})</p>
                  <p class="text-lg font-bold">{{ fmtMoney(summary.financial.total.amount, summary.financial.currency ?? operation.currency_code) }}</p>
                </div>
                <div class="text-center rounded-lg border border-success/30 bg-success/5 p-3">
                  <p class="text-[10px] text-muted font-medium uppercase tracking-wide">Pagado</p>
                  <p class="text-lg font-bold text-success-500">{{ fmtMoney(summary.financial.paid.amount, summary.financial.currency ?? operation.currency_code) }}</p>
                </div>
                <div class="text-center rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p class="text-[10px] text-muted font-medium uppercase tracking-wide">Pendiente</p>
                  <p class="text-lg font-bold text-warning-500">{{ fmtMoney(summary.financial.pending.amount, summary.financial.currency ?? operation.currency_code) }}</p>
                </div>
              </div>

              <UAlert
                v-if="(summary.financial.unconverted?.count ?? 0) > 0"
                color="warning"
                variant="soft"
                icon="i-lucide-alert-triangle"
                class="text-xs"
                :title="`${summary.financial.unconverted!.count} documento(s) sin tipo de cambio asignado`"
                :description="`${fmtMoney(summary.financial.unconverted!.amount, '—')} no se incluyen en el total consolidado. Reasocialos con su tipo de cambio para que cuenten.`"
              />

              <!-- Detalle por moneda -->
              <div v-if="summary.financialByCurrency?.length" class="space-y-2">
                <p class="text-[10px] text-muted font-semibold uppercase tracking-wide">Detalle por moneda</p>
                <div
                  v-for="fc in summary.financialByCurrency"
                  :key="fc.currency"
                  class="flex items-center gap-4 rounded-lg border border-default p-3"
                >
                  <span class="font-mono font-bold text-sm w-12 shrink-0">{{ fc.currency }}</span>
                  <div class="flex-1 grid grid-cols-3 gap-2">
                    <div class="text-center rounded-lg bg-muted/40 py-1.5">
                      <p class="text-[10px] text-muted font-medium">Total</p>
                      <p class="text-sm font-bold">{{ formatCurrency(fc.total, fc.currency) }}</p>
                    </div>
                    <div class="text-center rounded-lg bg-success/10 py-1.5">
                      <p class="text-[10px] text-muted font-medium">Pagado</p>
                      <p class="text-sm font-bold text-success-500">{{ formatCurrency(fc.paid, fc.currency) }}</p>
                    </div>
                    <div class="text-center rounded-lg bg-warning/10 py-1.5">
                      <p class="text-[10px] text-muted font-medium">Pendiente</p>
                      <p class="text-sm font-bold text-warning-500">{{ formatCurrency(fc.pending, fc.currency) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-default p-5">
            <h2 class="font-semibold flex items-center gap-2 mb-4">
              <UIcon name="i-lucide-info" class="size-4 text-muted" /> Información
            </h2>
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted flex items-center gap-1.5"><UIcon name="i-lucide-map-pin" class="size-3.5" /> Origen</span>
                <span class="font-medium">{{ operation.origin_country ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted flex items-center gap-1.5"><UIcon name="i-lucide-flag" class="size-3.5" /> Destino</span>
                <span class="font-medium">{{ operation.destination_country ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted flex items-center gap-1.5"><UIcon name="i-lucide-calendar-check" class="size-3.5" /> ETA</span>
                <span class="font-medium">{{ formatDate(operation.estimated_arrival_date) }}</span>
              </div>
              <div v-if="operation.actual_arrival_date" class="flex items-center justify-between gap-3">
                <span class="text-muted flex items-center gap-1.5"><UIcon name="i-lucide-check" class="size-3.5" /> Llegada real</span>
                <span class="font-medium">{{ formatDate(operation.actual_arrival_date) }}</span>
              </div>
              <div v-if="operation.notes" class="pt-3 border-t border-default">
                <p class="text-muted flex items-center gap-1.5 mb-1"><UIcon name="i-lucide-sticky-note" class="size-3.5" /> Notas</p>
                <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ operation.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ CONTENEDORES ═══════════════ -->
      <div id="contenedores" class="scroll-mt-20 mt-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <UIcon name="i-lucide-container" class="size-4 text-muted" /> Contenedores
            <UBadge :label="`${operation.containers?.length ?? 0}`" color="neutral" variant="outline" size="xs" />
          </h2>
          <UButton label="Nuevo contenedor" icon="i-lucide-plus" size="xs" variant="outline" :to="`/operaciones-internacionales/${id}/containers/create`" />
        </div>

        <div v-if="operation.containers?.length" class="space-y-4">
          <div
            v-for="container in operation.containers"
            :key="container.id"
            class="rounded-xl border border-default overflow-hidden bg-default hover:shadow-sm transition-shadow"
          >
            <!-- Header compacto -->
            <div class="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-default bg-muted/30">
              <div class="flex items-center gap-3 min-w-0">
                <UIcon name="i-lucide-container" class="size-4 text-muted shrink-0" />
                <span class="font-mono font-bold">{{ container.container_number }}</span>
                <UBadge :label="containerStatusLabel(container.status)" :color="containerStatusColor(container.status) as any" size="xs" variant="subtle" />
                <span class="text-xs text-muted">{{ containerTypeLabel(container.container_type as ContainerType) }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <UDropdownMenu :items="getContainerStatusItems(container)">
                  <UButton label="Cambiar estado" icon="i-lucide-refresh-cw" size="xs" variant="ghost" />
                </UDropdownMenu>
                <UPopover>
                  <UButton icon="i-lucide-help-circle" size="xs" variant="ghost" aria-label="Estados" />
                  <template #content>
                    <div class="p-4 w-80 space-y-2.5">
                      <p class="text-xs font-semibold text-muted uppercase tracking-wide">Estados del contenedor</p>
                      <div v-for="(d, key) in containerStatusDescriptions" :key="key" class="flex gap-2.5">
                        <div>
                          <p class="text-xs font-medium">{{ d.label }}</p>
                          <p class="text-xs text-muted">{{ d.description }}</p>
                        </div>
                      </div>
                    </div>
                  </template>
                </UPopover>
                <UButton
                  icon="i-lucide-eye"
                  size="xs"
                  variant="ghost"
                  :to="`/operaciones-internacionales/${id}/containers/${container.id}`"
                >
                  Ver detalle
                </UButton>
                <UDropdownMenu v-if="getContainerActions(container).length" :items="getContainerActions(container)">
                  <UButton icon="i-lucide-more-horizontal" size="xs" variant="ghost" />
                </UDropdownMenu>
              </div>
            </div>

            <!-- Detalles con íconos -->
            <div class="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-2">
              <div
                v-for="field in getContainerField(container)"
                :key="field.label"
                class="flex items-center gap-2 min-w-0"
              >
                <UIcon :name="field.icon" class="size-3.5 text-muted shrink-0" />
                <div class="min-w-0">
                  <p class="text-[10px] text-muted leading-tight">{{ field.label }}</p>
                  <p class="text-xs font-medium truncate">{{ field.value }}</p>
                </div>
              </div>
            </div>

            <!-- Gastos del contenedor -->
            <div v-if="containerDocuments(container.id).length" class="border-t border-default">
              <div class="flex items-center justify-between flex-wrap gap-2 px-4 py-2 bg-muted/20 border-b border-default">
                <span class="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                  <UIcon name="i-lucide-receipt" class="size-3.5" /> Gastos
                </span>
                <div class="flex items-center gap-3" v-if="containerExpenseTotal(container.id)">
                  <span class="text-xs"><span class="text-muted">Total:</span> <span class="font-bold">{{ fmtMoney(containerExpenseTotal(container.id)!.total, containerExpenseTotal(container.id)!.currency) }}</span></span>
                  <span v-if="containerExpenseTotal(container.id)!.paid > 0" class="text-xs text-success-500 font-medium">Pagado: {{ fmtMoney(containerExpenseTotal(container.id)!.paid, containerExpenseTotal(container.id)!.currency) }}</span>
                  <span v-if="containerExpenseTotal(container.id)!.pending > 0" class="text-xs text-warning-500 font-medium">Pendiente: {{ fmtMoney(containerExpenseTotal(container.id)!.pending, containerExpenseTotal(container.id)!.currency) }}</span>
                  <span v-if="containerExpenseTotal(container.id)!.unconvertedCount > 0" class="text-xs text-error-500 font-medium" :title="`${containerExpenseTotal(container.id)!.unconvertedCount} documento(s) sin tipo de cambio`">· {{ containerExpenseTotal(container.id)!.unconvertedCount }} sin TC</span>
                </div>
              </div>
              <table class="w-full text-sm">
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="rel in containerDocuments(container.id)"
                    :key="rel.document_id"
                    class="hover:bg-muted/20 transition-colors"
                  >
                    <td class="px-4 py-2 font-medium whitespace-nowrap">
                      {{ rel.document?.document_types?.code }} Nº {{ rel.document?.number }}
                    </td>
                    <td class="px-4 py-2 text-muted text-xs min-w-0">
                      <span class="truncate block">{{ expenseTypeLabel(rel.expense_type as InternationalExpenseType) }}<span v-if="rel.document?.business_parties"> — {{ rel.document.business_parties.name }}</span></span>
                    </td>
                    <td class="px-4 py-2 text-right whitespace-nowrap">
                      <div v-if="docCurrencyInfo(rel)">
                        <p class="font-medium">{{ formatCurrency(docCurrencyInfo(rel)!.total, docCurrencyInfo(rel)!.docCurrency) }}</p>
                        <p class="text-[10px] text-muted">
                          TC {{ docCurrencyInfo(rel)!.rate ?? '—' }} ·
                          = <span v-if="docCurrencyInfo(rel)!.converted != null">{{ fmtMoney(docCurrencyInfo(rel)!.converted, docCurrencyInfo(rel)!.opCurrency) }}</span><span v-else class="text-warning-500">sin TC</span>
                        </p>
                      </div>
                      <span v-else class="font-medium">{{ formatCurrency(Number(rel.document?.total ?? 0), rel.document?.currency_code) }}</span>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <UBadge
                        :label="getPaymentStatus(rel.document).label"
                        :color="getPaymentStatus(rel.document).color"
                        size="xs"
                        variant="subtle"
                      />
                    </td>
                  </tr>                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-default text-center py-10">
          <UIcon name="i-lucide-container" class="size-8 text-muted mx-auto mb-2" />
          <p class="text-muted text-sm">No hay contenedores asociados.</p>
          <UButton label="Agregar contenedor" variant="soft" size="xs" class="mt-3" icon="i-lucide-plus" :to="`/operaciones-internacionales/${id}/containers/create`" />
        </div>
      </div>

      <!-- ═══════════════ PRESUPUESTOS ═══════════════ -->
      <div id="presupuestos" class="scroll-mt-20 mt-8">
        <div class="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <UIcon name="i-lucide-file-chart" class="size-4 text-muted" /> Presupuestos
            <UBadge :label="`${operation.operation_quotes?.length ?? 0}`" color="neutral" variant="outline" size="xs" />
            <span class="text-xs text-muted font-normal hidden sm:inline">— compará cotizaciones y elegí el ganador · no impactan en totales</span>
          </h2>
          <div class="flex gap-2">
            <UButton label="Crear" icon="i-lucide-file-plus" size="xs" variant="outline" @click="() => { showCreateQuoteModal = true }" />
            <UButton label="Asociar" icon="i-lucide-plus" size="xs" variant="outline" @click="() => { showQuoteModal = true }" />
          </div>
        </div>

        <div v-if="operation.operation_quotes?.length" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div
            v-for="quote in operation.operation_quotes"
            :key="quote.id"
            class="rounded-xl border p-4 transition-colors"
            :class="quote.status === 'ACCEPTED' ? 'border-success/50 bg-success/5' : 'border-default'"
          >
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-mono font-bold text-sm">
                    {{ quote.document?.document_types?.code }} Nº {{ String(quote.document?.number ?? '').padStart(8, '0') }}
                  </span>
                  <UBadge :label="quoteStatusLabel(quote.status)" :color="quoteStatusColor(quote.status)" size="xs" variant="subtle" />
                </div>
                <div class="flex items-center gap-3 text-xs text-muted flex-wrap">
                  <span class="font-medium text-default flex items-center gap-1">
                    <UIcon name="i-lucide-building-2" class="size-3" /> {{ quote.document?.business_parties?.name ?? '—' }}
                  </span>
                  <span>{{ formatDate(quote.document?.date) }}</span>
                </div>
              </div>
              <span class="font-bold" :class="quote.status === 'ACCEPTED' ? 'text-success-500' : ''">
                {{ formatCurrency(Number(quote.document?.total ?? 0), quote.document?.currency_code) }}
              </span>
            </div>

            <div
              v-if="quote.document?.document_items?.length"
              class="mt-2.5 pt-2.5 border-t border-default flex flex-wrap gap-x-4 gap-y-1"
            >
              <span v-for="(item, idx) in quote.document.document_items" :key="idx" class="text-xs text-muted">
                {{ item.quantity }} × {{ item.products?.name ?? 'Producto' }}
                <span class="font-medium text-default">{{ formatCurrency(item.quantity * item.price, quote.document?.currency_code) }}</span>
              </span>
            </div>

            <div class="flex items-center justify-end gap-1 mt-2.5 pt-2.5 border-t border-default">
              <UButton
                v-if="quote.status === 'PENDING'"
                label="Aceptar (ganador)"
                icon="i-lucide-check"
                color="success"
                variant="soft"
                size="xs"
                @click="handleAcceptQuote(quote)"
              />
              <UButton
                v-if="quote.status === 'PENDING'"
                label="Rechazar"
                icon="i-lucide-x"
                color="error"
                variant="ghost"
                size="xs"
                @click="handleRejectQuote(quote)"
              />
              <UButton
                v-if="quote.status !== 'PENDING'"
                label="Marcar pendiente"
                icon="i-lucide-rotate-ccw"
                variant="ghost"
                size="xs"
                @click="handleResetQuote(quote)"
              />
              <UButton
                icon="i-lucide-unlink"
                variant="ghost"
                size="xs"
                @click="handleDisassociateQuote(quote)"
              />
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-default text-center py-10">
          <UIcon name="i-lucide-file-chart" class="size-8 text-muted mx-auto mb-2" />
          <p class="text-muted text-sm">No hay presupuestos asociados.</p>
          <p class="text-xs text-muted mb-3">Creá uno rápido o asociá una cotización existente del módulo de compras.</p>
          <div class="flex justify-center gap-2">
            <UButton label="Crear presupuesto" variant="soft" size="xs" icon="i-lucide-file-plus" @click="() => { showCreateQuoteModal = true }" />
            <UButton label="Asociar existente" variant="outline" size="xs" icon="i-lucide-plus" @click="() => { showQuoteModal = true }" />
          </div>
        </div>
      </div>

      <!-- ═══════════════ DOCUMENTOS ═══════════════ -->
      <div id="documentos" class="scroll-mt-20 mt-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-4 text-muted" /> Documentos
            <UBadge :label="`${summary?.stats.documentCount ?? 0}`" color="neutral" variant="outline" size="xs" />
          </h2>
          <div class="flex gap-2">
            <UButton label="Asociar documento" icon="i-lucide-plus" size="xs" variant="outline" @click="() => { showDocumentModal = true }" />
          </div>
        </div>

        <div v-if="summary?.expenseGroups?.length" class="space-y-4">
          <div v-for="group in summary.expenseGroups" :key="group.type" class="rounded-xl border border-default overflow-hidden">
            <!-- Header de grupo -->
            <div class="bg-muted/30 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap border-b border-default">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-sm">{{ group.label }}</span>
                <UBadge :label="`${group.documentCount} docs`" color="neutral" variant="outline" size="xs" />
              </div>
              <div class="flex items-center gap-4 text-xs">
                <span><span class="text-muted">Total:</span> <span class="font-bold">{{ formatCurrency(group.total, group.currency ?? operation.currency_code) }}</span></span>
                <span v-if="group.paid > 0" class="text-success-500 font-medium">Pagado: {{ formatCurrency(group.paid, group.currency ?? operation.currency_code) }}</span>
                <span v-if="group.pending > 0" class="text-warning-500 font-medium">Pendiente: {{ formatCurrency(group.pending, group.currency ?? operation.currency_code) }}</span>
                <span v-if="(group.unconvertedCount ?? 0) > 0" class="text-error-500 font-medium" :title="`${group.unconvertedCount} documento(s) sin tipo de cambio`">· {{ group.unconvertedCount }} sin TC</span>
              </div>
            </div>

            <!-- Filas de documentos -->
            <div class="divide-y divide-default">
              <div
                v-for="rel in group.documents"
                :key="rel.document_id"
                class="px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div class="flex items-start justify-between gap-3 flex-wrap">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono font-bold text-sm">
                        {{ rel.document?.document_types?.code }} Nº {{ rel.document?.number }}
                      </span>
                      <UBadge
                        :label="expenseTypeLabel(rel.expense_type as InternationalExpenseType)"
                        color="neutral"
                        variant="outline"
                        size="xs"
                      />
                      <UBadge
                        v-if="rel.container_id"
                        :label="`📦 ${operation.containers?.find((c) => c.id === rel.container_id)?.container_number ?? rel.container_id}`"
                        color="primary"
                        variant="subtle"
                        size="xs"
                      />
                    </div>
                    <div class="flex items-center gap-3 text-xs text-muted flex-wrap mt-1">
                      <span>{{ formatDate(rel.document?.date) }}</span>
                      <span v-if="rel.document?.business_parties" class="flex items-center gap-1">
                        <UIcon name="i-lucide-building-2" class="size-3" /> {{ rel.document.business_parties.name }}
                      </span>
                      <button
                        v-if="rel.document?.payment_documents?.length"
                        class="text-primary font-medium flex items-center gap-1 hover:underline"
                        @click="toggleDocPayments(rel.document_id)"
                      >
                        <UIcon
                          :name="expandedDocs.has(rel.document_id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                          class="size-3"
                        />
                        {{ rel.document.payment_documents.length }} pago(s)
                      </button>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0 text-right">
                    <div v-if="docCurrencyInfo(rel)">
                      <p class="font-bold">{{ formatCurrency(docCurrencyInfo(rel)!.total, docCurrencyInfo(rel)!.docCurrency) }}</p>
                      <p class="text-[10px] text-muted">
                        TC {{ docCurrencyInfo(rel)!.rate ?? '—' }} ·
                        = <span v-if="docCurrencyInfo(rel)!.converted != null">{{ fmtMoney(docCurrencyInfo(rel)!.converted, docCurrencyInfo(rel)!.opCurrency) }}</span><span v-else class="text-warning-500">sin TC</span>
                      </p>
                    </div>
                    <span v-else class="font-bold">{{ formatCurrency(Number(rel.document?.total ?? 0), rel.document?.currency_code) }}</span>
                    <UBadge
                      :label="getPaymentStatus(rel.document).label"
                      :color="getPaymentStatus(rel.document).color"
                      size="xs"
                      variant="subtle"
                    />
                    <UDropdownMenu :items="[
                      {
                        label: 'Desasociar documento',
                        icon: 'i-lucide-unlink',
                        onSelect: () => handleDisassociateDocument(rel.document_id)
                      }
                    ]">
                      <UButton icon="i-lucide-more-horizontal" variant="ghost" size="xs" />
                    </UDropdownMenu>
                  </div>
                </div>

                <!-- Pagos colapsables -->
                <div v-if="expandedDocs.has(rel.document_id) && rel.document?.payment_documents?.length" class="mt-3 ml-2 pl-4 border-l-2 border-primary/40 space-y-2">
                  <div
                    v-for="pd in rel.document.payment_documents"
                    :key="pd.payment_id"
                    class="flex items-center justify-between gap-3 text-sm bg-muted/20 rounded-lg px-3 py-2"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="font-medium text-xs">Pago Nº {{ pd.payment?.number }}</span>
                      <UBadge
                        :label="pd.payment?.status"
                        :color="pd.payment?.status === 'PAID' ? 'success' : 'warning'"
                        size="xs"
                        variant="subtle"
                      />
                      <span class="text-xs text-muted">{{ formatDate(pd.payment?.date) }} · {{ pd.payment?.payment_method }}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="text-xs font-medium">{{ formatCurrency(Number(pd.amount_applied ?? 0), pd.payment?.currency_code) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-default text-center py-10">
          <UIcon name="i-lucide-file-text" class="size-8 text-muted mx-auto mb-2" />
          <p class="text-muted text-sm">No hay documentos asociados.</p>
          <UButton label="Asociar documento" variant="soft" size="xs" class="mt-3" icon="i-lucide-plus" @click="() => { showDocumentModal = true }" />
        </div>
      </div>

      <!-- MODALS -->
      <AssociateDocumentModal
        v-model:open="showDocumentModal"
        :operation-id="id"
        :operation-currency-code="operation.currency_code ?? 'USD'"
        :containers="operation.containers"
        :exclude-document-ids="documentAssociatedIds"
        @associated="
          () => {
            fetchOne(id)
            fetchSummary(id)
          }
        "
      />

      <AssociateQuoteModal
        v-model:open="showQuoteModal"
        :operation-id="id"
        :exclude-document-ids="quoteAssociatedIds"
        @associated="() => fetchOne(id)"
      />

      <CreateQuoteModal
        v-model:open="showCreateQuoteModal"
        :operation-id="id"
        :operation-currency-code="operation.currency_code ?? 'USD'"
        @created="() => fetchOne(id)"
      />
    </template>
  </UPage>
</template>
