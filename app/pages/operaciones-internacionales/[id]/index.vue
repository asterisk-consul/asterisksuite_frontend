<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AssociateDocumentModal from '~/components/international-operations/AssociateDocumentModal.vue'
import AssociateQuoteModal from '~/components/international-operations/AssociateQuoteModal.vue'
import CreateQuoteModal from '~/components/international-operations/CreateQuoteModal.vue'
import ConvertQuoteModal from '~/components/international-operations/ConvertQuoteModal.vue'
import { summarizeTransitMerchandise } from '~/modulos/international-operations/utils/transit-merchandise'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type {
  OperationStatus,
  InternationalExpenseType,
  ContainerStatus,
  ContainerType,
  OperationQuoteRelation
} from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
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
  expenseTypeOptions,
  expenseTypeLabel,
  formatCurrency,
  formatDate,
  removeContainer
} = useInternationalOperations()

useBreadcrumbEntityLabel(
  `/operaciones-internacionales/${id}`,
  computed(() => operation.value?.id === id ? operation.value.number : null)
)

const showDocumentModal = ref(false)
const showQuoteModal = ref(false)
const showCreateQuoteModal = ref(false)
const showConvertQuoteModal = ref(false)
const convertingQuote = ref<OperationQuoteRelation | null>(null)
const refreshingQuoteDocuments = ref(false)
const hasContainers = computed(() => !!operation.value?.containers?.length)
const hasOperationInformation = computed(() => [
  operation.value?.origin_country,
  operation.value?.destination_country,
  operation.value?.estimated_arrival_date,
  operation.value?.actual_arrival_date,
  operation.value?.customs_broker_op_number,
  operation.value?.sim_number,
  operation.value?.supplier_purchase_order,
  operation.value?.notes
].some(value => String(value ?? '').trim().length > 0))
const expenseTypeIcons: Record<InternationalExpenseType, string> = {
  MERCHANDISE: 'i-lucide-box',
  INTERNATIONAL_FREIGHT: 'i-lucide-ship',
  INSURANCE: 'i-lucide-shield-check',
  CUSTOMS_BROKER: 'i-lucide-file-check-2',
  COMMERCIAL_AGENT: 'i-lucide-handshake',
  PORT_EXPENSE: 'i-lucide-anchor',
  STORAGE: 'i-lucide-warehouse',
  LOCAL_TRANSPORT: 'i-lucide-truck',
  CUSTOMS_DUTIES: 'i-lucide-landmark',
  NACIONALIZACION: 'i-lucide-stamp',
  OTHER: 'i-lucide-ellipsis'
}
const quoteGroups = computed(() => {
  const groups = new Map<string, { key: string; category: InternationalExpenseType; label: string; quotes: OperationQuoteRelation[] }>()
  for (const quote of operation.value?.operation_quotes ?? []) {
    const category = quote.expense_type ?? 'MERCHANDISE'
    const key = [quote.container_id ?? '', category, quote.custom_expense_description ?? ''].join(':')
    const container = quote.container?.container_number ?? operation.value?.containers?.find(item => item.id === quote.container_id)?.container_number ?? 'Sin contenedor asignado'
    const detail = category === 'OTHER' && quote.custom_expense_description ? ` · ${quote.custom_expense_description}` : ''
    const group = groups.get(key) ?? { key, category, label: `${container}${detail}`, quotes: [] }
    group.quotes.push(quote)
    groups.set(key, group)
  }
  return [...groups.values()]
})
const quoteCategoryTabs = computed(() => {
  const counts = new Map<InternationalExpenseType, number>()
  for (const group of quoteGroups.value) {
    counts.set(group.category, (counts.get(group.category) ?? 0) + group.quotes.length)
  }
  const totalQuotes = [...counts.values()].reduce((total, count) => total + count, 0)
  return [
    { value: 'ALL', label: 'Todos', icon: 'i-lucide-files', badge: totalQuotes },
    ...[...counts.entries()].map(([value, count]) => ({
      value,
      label: expenseTypeLabel(value),
      icon: expenseTypeIcons[value],
      badge: count
    }))
  ]
})
const activeQuoteCategory = ref<string>('ALL')
const activeQuoteGroups = computed(() => activeQuoteCategory.value === 'ALL'
  ? quoteGroups.value
  : quoteGroups.value.filter(group => group.category === activeQuoteCategory.value))
watch(quoteCategoryTabs, (tabs) => {
  if (!tabs.some(tab => tab.value === activeQuoteCategory.value)) activeQuoteCategory.value = 'ALL'
}, { immediate: true })
const documentCategoryTabs = computed(() => {
  const groups = summary.value?.expenseGroups ?? []
  const totalDocuments = groups.reduce((total, group) => total + group.documentCount, 0)
  return [
    { value: 'ALL', label: 'Todos', icon: 'i-lucide-files', badge: totalDocuments },
    ...groups.map(group => ({
      value: group.type,
      label: group.label,
      icon: expenseTypeIcons[group.type as InternationalExpenseType] ?? 'i-lucide-file-text',
      badge: group.documentCount
    }))
  ]
})
const activeDocumentCategory = ref('ALL')
const visibleDocumentGroups = computed(() => {
  const groups = summary.value?.expenseGroups ?? []
  return activeDocumentCategory.value === 'ALL'
    ? groups
    : groups.filter(group => group.type === activeDocumentCategory.value)
})
watch(documentCategoryTabs, (tabs) => {
  if (!tabs.some(tab => tab.value === activeDocumentCategory.value)) activeDocumentCategory.value = 'ALL'
}, { immediate: true })
const showCreateInvoiceModal = ref(false)
const invoiceContainerId = ref('')
const invoiceExpenseType = ref<InternationalExpenseType>('MERCHANDISE')
const invoiceCustomExpenseDescription = ref('')
const showStatusChangeModal = ref(false)
const statusChangeSaving = ref(false)
const pendingStatusChange = ref<{
  scope: 'operation' | 'container'
  current: OperationStatus | ContainerStatus
  next: OperationStatus | ContainerStatus
  containerId?: string
  containerNumber?: string
} | null>(null)

const invoiceContainerOptions = computed(() =>
  (operation.value?.containers ?? []).map((container: any) => ({
    label: `${container.container_number} · ${containerStatusLabel(container.status)}`,
    value: container.id,
    description: container.container_type
      ? containerTypeLabel(container.container_type as ContainerType)
      : undefined
  }))
)

const selectedInvoiceContainer = computed(() =>
  (operation.value?.containers ?? []).find((container: any) => container.id === invoiceContainerId.value)
)

const canContinueInvoiceCreation = computed(() => {
  if (!invoiceExpenseType.value) return false
  if (!invoiceContainerId.value) return false
  if (invoiceExpenseType.value === 'OTHER' && !invoiceCustomExpenseDescription.value.trim()) return false
  return true
})

function openCreateInvoiceModal() {
  const containers = operation.value?.containers ?? []
  invoiceContainerId.value = containers.length === 1 ? containers[0].id : ''
  invoiceExpenseType.value = 'MERCHANDISE'
  invoiceCustomExpenseDescription.value = ''
  showCreateInvoiceModal.value = true
}

async function continueInvoiceCreation() {
  if (!canContinueInvoiceCreation.value) return
  showCreateInvoiceModal.value = false
  await router.push({
    path: '/erp/purchases/purchases-documents/new',
    query: {
      category: 'INVOICE',
      international_operation_id: id,
      operation_currency_code: operation.value?.currency_code || 'USD',
      expense_type: invoiceExpenseType.value,
      expense_label: expenseTypeLabel(invoiceExpenseType.value),
      custom_expense_description: invoiceExpenseType.value === 'OTHER'
        ? invoiceCustomExpenseDescription.value.trim()
        : undefined,
      container_id: invoiceContainerId.value || undefined,
      container_number: selectedInvoiceContainer.value?.container_number
    }
  })
}

const quoteStatusColor = (status: string): any =>
  status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning'
const quoteStatusLabel = (status: string) =>
  status === 'ACCEPTED' ? 'Aceptado' : status === 'REJECTED' ? 'Rechazado' : 'Pendiente'

const onResize = () => updateStickyOffsets()

onMounted(async () => {
  await fetchOne(id)
  await fetchSummary(id)
  await nextTick()
  updateStickyOffsets()
  setupObserver()
  window.addEventListener('resize', onResize)
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

const handleStatusChange = (status: OperationStatus) => {
  const current = operation.value?.status
  if (!current || current === status) return
  pendingStatusChange.value = { scope: 'operation', current, next: status }
  showStatusChangeModal.value = true
}

const operationStatusItems = computed(() =>
  statusOptions.value.map((s) => ({
    label: s.value === operation.value?.status ? `${s.label} (actual)` : s.label,
    icon: statusIcons[s.value as OperationStatus],
    disabled: s.value === operation.value?.status,
    onSelect: () => handleStatusChange(s.value as OperationStatus)
  }))
)

const getContainerStatusItems = (container: any) =>
  containerStatusOptions.value
    .filter(s => !['RECEIVING', 'DELIVERED'].includes(s.value))
    .map((s) => ({
    label: s.value === container.status ? `${s.label} (actual)` : s.label,
    disabled: s.value === container.status,
    onSelect: () => handleContainerStatusChange(container.id, s.value as ContainerStatus)
  }))

const handleContainerStatusChange = (containerId: string, status: ContainerStatus) => {
  const container = operation.value?.containers?.find((item: any) => item.id === containerId)
  if (!container || container.status === status) return
  pendingStatusChange.value = {
    scope: 'container',
    current: container.status,
    next: status,
    containerId,
    containerNumber: container.container_number
  }
  showStatusChangeModal.value = true
}

const pendingStatusMeta = computed(() => {
  const change = pendingStatusChange.value
  if (!change) return null
  const operationScope = change.scope === 'operation'
  const current = operationScope
    ? statusLabel(change.current as OperationStatus)
    : containerStatusLabel(change.current as ContainerStatus)
  const next = operationScope
    ? statusLabel(change.next as OperationStatus)
    : containerStatusLabel(change.next as ContainerStatus)
  const color = operationScope
    ? statusColor(change.next as OperationStatus)
    : containerStatusColor(change.next as ContainerStatus)
  const currentColor = operationScope
    ? statusColor(change.current as OperationStatus)
    : containerStatusColor(change.current as ContainerStatus)
  const descriptions = operationScope ? statusDescriptions : containerStatusDescriptions
  return {
    title: operationScope ? 'Cambiar estado de la operación' : 'Cambiar estado del contenedor',
    subject: operationScope
      ? (operation.value?.customs_broker_op_number || operation.value?.number)
      : change.containerNumber,
    current,
    next,
    color,
    currentColor,
    description: (descriptions as Record<string, { label: string; description: string }>)[String(change.next)]?.description
  }
})

async function confirmStatusChange() {
  const change = pendingStatusChange.value
  if (!change) return
  statusChangeSaving.value = true
  try {
    if (change.scope === 'operation') {
      await updateStatus(id, change.next as OperationStatus)
    } else if (change.containerId) {
      await updateContainer(change.containerId, { status: change.next as ContainerStatus })
      await fetchOne(id)
    }
    await fetchSummary(id)
    showStatusChangeModal.value = false
    pendingStatusChange.value = null
    toast.add({ title: 'Estado actualizado', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo cambiar el estado',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  } finally {
    statusChangeSaving.value = false
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
  convertingQuote.value = quote
  showConvertQuoteModal.value = true
}

const handleQuoteConverted = async () => {
  refreshingQuoteDocuments.value = true
  try {
    const results = await Promise.allSettled([fetchOne(id), fetchSummary(id)])
    const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failed) {
      toast.add({
        title: 'El comprobante se creó, pero no se pudo actualizar la operación',
        description: 'Volvé a cargar la operación para ver el documento generado.',
        color: 'warning'
      })
    }
  } finally {
    refreshingQuoteDocuments.value = false
    showConvertQuoteModal.value = false
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
  const paid = getDocumentPaid(doc)
  const total = doc.total ?? 0
  if (getDocumentUnconvertedPaymentCount(doc) > 0) {
    return { label: 'Pago sin cotización', color: 'warning' }
  }
  if (paid >= total && total > 0) return { label: 'Pagado', color: 'success' }
  if (paid > 0) return { label: 'Parcialmente pagado', color: 'warning' }
  return { label: 'Pendiente', color: 'error' }
}

const getDocumentPaid = (doc: any) => (doc?.payment_documents ?? []).reduce((sum: number, relation: any) => {
  if (!['CONFIRMED', 'PAID'].includes(String(relation.payment?.status))) return sum
  const amount = paymentAppliedInCurrency(relation, doc?.currency_code)
  return sum + (amount ?? 0)
}, 0)

const getDocumentUnconvertedPaymentCount = (doc: any) =>
  (doc?.payment_documents ?? []).filter((relation: any) =>
    ['CONFIRMED', 'PAID'].includes(String(relation.payment?.status)) &&
    paymentAppliedInCurrency(relation, doc?.currency_code) == null
  ).length

const getDocumentPending = (doc: any) =>
  Math.max(0, Number(doc?.total ?? 0) - getDocumentPaid(doc))

const associatedDocumentRoute = (doc: any) => {
  const direction = doc?.document_types?.direction
  const category = doc?.document_types?.category
  const documentId = doc?.id

  if (direction === -1 || direction === 'PURCHASE') {
    if (category === 'ORDER') return `/erp/purchases/orders/${documentId}`
    if (category === 'REMITO') return `/erp/purchases/remitos/${documentId}`
    return `/erp/purchases/purchases-documents/${documentId}`
  }

  if (category === 'REMITO') return `/erp/remitos/${documentId}`
  return `/erp/sales/${documentId}`
}

const editAssociatedDocument = (doc: any) => {
  const direction = doc?.document_types?.direction
  const category = doc?.document_types?.category
  if (direction === -1 || direction === 'PURCHASE') {
    if (category === 'ORDER') return router.push(`/erp/purchases/orders/${doc.id}/edit`)
    if (category === 'REMITO') return router.push(`/erp/purchases/remitos/${doc.id}/edit`)
    return router.push(`/erp/purchases/purchases-documents/${doc.id}/edit`)
  }
  return router.push(`/erp/sales/${doc.id}/edit`)
}

const payAssociatedDocument = (doc: any) => {
  router.push({
    path: '/erp/treasury/payments/create',
    query: {
      type: 'PAYMENT',
      party_id: doc.party_id,
      document_id: doc.id
    }
  })
}

const documentAssociatedIds = computed(() => operation.value?.operation_documents?.map((d) => d.document_id) ?? [])

const containerDocuments = (containerId: string) =>
  (operation.value?.operation_documents ?? []).filter((d: any) => d.container_id === containerId)

const containerMerchandiseItems = (containerId: string) => {
  const grouped = new Map<string, { id: string; name: string; sku?: string; quantity: number; documents: number }>()
  for (const item of summarizeTransitMerchandise(containerDocuments(containerId))) {
      const key = item.productId
      const current = grouped.get(key)
      if (current) {
        current.quantity += item.quantity
        current.documents += item.documents
      } else {
        grouped.set(key, {
          id: key,
          name: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          documents: item.documents
        })
      }
  }
  return Array.from(grouped.values())
}

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
  const rate = normalizeMarketRate(
    rel.exchange_rate ? Number(rel.exchange_rate) : null,
    docCurrency,
    opCurrency
  )
  const converted = convertWithMarketRate(total, docCurrency, opCurrency, rate)
  return { total, rate, converted, docCurrency, opCurrency }
}

const dualCurrencyAmount = (kind: 'total' | 'paid' | 'pending', currency: 'USD' | 'ARS') =>
  summary.value?.financialDualCurrency?.[currency]?.[kind] ?? null

const dualCurrencyMissingCount = (kind: 'total' | 'paid', currency: 'USD' | 'ARS') => {
  const values = summary.value?.financialDualCurrency?.[currency]
  if (!values) return 0
  return kind === 'total' ? values.totalMissing : values.paidMissing
}

const dualCurrencyLabel = (kind: 'total' | 'paid' | 'pending', currency: 'USD' | 'ARS') => {
  const amount = dualCurrencyAmount(kind, currency)
  if (amount == null) return 'Sin cotización'
  const missingCount = kind === 'pending' ? 0 : dualCurrencyMissingCount(kind, currency)
  const formatted = formatCurrency(amount, currency)
  return missingCount > 0 ? `Parcial · ${formatted}` : formatted
}

const operationFinancialLabel = (amount: number) => {
  const formatted = fmtMoney(amount, summary.value?.financial.currency ?? operation.value?.currency_code)
  return (summary.value?.financial.unconverted?.count ?? 0) > 0 ? `Parcial · ${formatted}` : formatted
}

const operationBaseCurrency = computed(() =>
  String(summary.value?.financial.currency ?? operation.value?.currency_code ?? 'USD').toUpperCase()
)

const rateTypeLabel = (type?: string | null) => {
  const labels: Record<string, string> = {
    OFFICIAL: 'Oficial',
    BLUE: 'Blue',
    MEP: 'MEP',
    CCL: 'CCL',
    WHOLESALE: 'Mayorista',
    CRYPTO: 'Cripto',
    CARD: 'Tarjeta'
  }
  return type ? labels[type] ?? type : null
}

const savedDocumentRateLabel = (rel: any) => {
  const document = rel?.document
  if (!document) return null
  const currency = String(document.currency_code ?? '').toUpperCase()
  const rate = Number(document.exchange_rate ?? 0)
  const operationCurrency = String(operation.value?.currency_code ?? '').toUpperCase()
  const documentTotal = Number(document.total ?? 0)
  const impliedRate = currency === 'USD' && document.converted_total != null && documentTotal > 0
    ? Number(document.converted_total) / documentTotal
    : 0
  const purchaseRate = rate > 0 && rate !== 1 ? rate : impliedRate
  if (purchaseRate > 0 && purchaseRate !== 1 && currency === 'USD') {
    const kind = rateTypeLabel(document.rate_type)
    const marketRate = normalizeMarketRate(purchaseRate, currency, 'ARS')
    const source = rate > 0 && rate !== 1 ? 'TC compra' : 'TC compra implícita'
    return `${source}: 1 ${currency} = ${formatCurrency(marketRate ?? purchaseRate, 'ARS')}${kind ? ` · ${kind}` : ''}`
  }
  if (rate > 0 && rate !== 1 && currency !== 'ARS' && currency !== 'USD') {
    return `TC compra guardada: ${rate.toLocaleString('es-AR', { maximumFractionDigits: 6 })}`
  }
  const operationRate = Number(rel.exchange_rate ?? 0)
  if (operationRate > 0 && currency !== operationCurrency && (currency === 'ARS' || operationCurrency === 'ARS')) {
    return `TC operación: ${formatCurrency(operationRate, 'ARS')} / USD`
  }
  return null
}

const paymentAppliedArs = (allocation: any) => {
  const payment = allocation?.payment
  const amount = Number(allocation?.amount_applied ?? 0)
  const currency = String(payment?.currency_code ?? '').toUpperCase()
  if (currency === 'ARS') return amount
  const rate = Number(payment?.exchange_rate ?? 0)
  if (rate > 0 && rate !== 1) return convertWithMarketRate(amount, currency, 'ARS', rate)
  const paymentAmount = Number(payment?.amount ?? 0)
  if (payment?.converted_amount != null && paymentAmount > 0) {
    return Number(payment.converted_amount) * amount / paymentAmount
  }
  return null
}

const paymentAppliedArsLabel = (allocation: any) => {
  const amount = paymentAppliedArs(allocation)
  return amount == null ? null : formatCurrency(amount, 'ARS')
}

const paymentAppliedInCurrency = (allocation: any, targetCurrency: string) => {
  const payment = allocation?.payment
  const amount = Number(allocation?.amount_applied ?? 0)
  const sourceCurrency = String(payment?.currency_code ?? '').toUpperCase()
  const target = String(targetCurrency).toUpperCase()
  if (sourceCurrency === target) return amount
  if (target === 'ARS') return paymentAppliedArs(allocation)
  const rate = Number(payment?.exchange_rate ?? 0)
  if (sourceCurrency === 'ARS' && target === 'USD' && rate > 0 && rate !== 1) {
    return convertWithMarketRate(amount, 'ARS', 'USD', rate)
  }
  return null
}

const paymentAppliedDocumentLabel = (allocation: any, documentCurrency?: string | null) => {
  const targetCurrency = String(documentCurrency ?? '').toUpperCase()
  const paymentCurrency = String(allocation?.payment?.currency_code ?? '').toUpperCase()
  if (!targetCurrency || targetCurrency === paymentCurrency) return null
  const amount = paymentAppliedInCurrency(allocation, targetCurrency)
  return amount == null ? null : formatCurrency(amount, targetCurrency)
}

const paymentRateLabel = (payment: any) => {
  const rate = Number(payment?.exchange_rate ?? 0)
  const currency = String(payment?.currency_code ?? '').toUpperCase()
  const paymentAmount = Number(payment?.amount ?? 0)
  const impliedRate = currency === 'USD' && payment?.converted_amount != null && paymentAmount > 0
    ? Number(payment.converted_amount) / paymentAmount
    : 0
  const savedRate = rate > 0 && rate !== 1 ? rate : impliedRate
  if (!savedRate || savedRate === 1) return null
  const kind = rateTypeLabel(payment?.rate_type)
  if (currency === 'USD' || currency === 'ARS') {
    const marketRate = normalizeMarketRate(savedRate, currency, currency === 'USD' ? 'ARS' : 'USD')
    const source = rate > 0 && rate !== 1 ? 'TC pago' : 'TC pago implícita'
    return `${source}: 1 USD = ${formatCurrency(marketRate ?? savedRate, 'ARS')}${kind ? ` · ${kind}` : ''}`
  }
  return `TC pago: ${savedRate.toLocaleString('es-AR', { maximumFractionDigits: 6 })}`
}

type VisibleExchangeRate = { rate: number; date?: string | null; rateType?: string | null }

const latestOperationExchangeRates = computed(() => {
  const purchaseRates: VisibleExchangeRate[] = []
  const paymentRates: VisibleExchangeRate[] = []
  const operationCurrency = String(operation.value?.currency_code ?? '').toUpperCase()

  for (const relation of operation.value?.operation_documents ?? []) {
    const document = relation.document as any
    if (!document) continue
    const currency = String(document.currency_code ?? '').toUpperCase()
    let rate = Number(document.exchange_rate ?? 0)

    if (currency === 'USD' && (!rate || rate === 1)) {
      const total = Number(document.total ?? 0)
      if (document.converted_total != null && total > 0) rate = Number(document.converted_total) / total
    } else if (currency === 'ARS' && operationCurrency === 'USD') {
      rate = Number(relation.exchange_rate ?? 0)
    } else if (currency !== 'USD') {
      continue
    }

    const marketRate = rate > 0 && rate !== 1
      ? currency === 'ARS' ? rate : normalizeMarketRate(rate, 'USD', 'ARS')
      : null
    if (marketRate && Number.isFinite(marketRate)) {
      purchaseRates.push({ rate: marketRate, date: document.date, rateType: document.rate_type })
    }
  }

  const seenPayments = new Set<string>()
  const addPaymentRate = (payment: any) => {
    if (!payment || (payment.id && seenPayments.has(payment.id))) return
    if (payment.id) seenPayments.add(payment.id)
    const currency = String(payment.currency_code ?? '').toUpperCase()
    let rate = Number(payment.exchange_rate ?? 0)
    if (currency === 'USD' && (!rate || rate === 1)) {
      const amount = Number(payment.amount ?? 0)
      if (payment.converted_amount != null && amount > 0) rate = Number(payment.converted_amount) / amount
    }
    if (!rate || rate === 1 || !['USD', 'ARS'].includes(currency)) return
    const marketRate = normalizeMarketRate(rate, currency, currency === 'USD' ? 'ARS' : 'USD')
    if (!marketRate || !Number.isFinite(marketRate)) return
    paymentRates.push({ rate: marketRate, date: payment.date, rateType: payment.rate_type })
  }

  for (const relation of operation.value?.operation_documents ?? []) {
    for (const allocation of relation.document?.payment_documents ?? []) addPaymentRate(allocation.payment)
  }
  for (const relation of operation.value?.operation_payments ?? []) addPaymentRate(relation.payment)

  const latest = (rates: VisibleExchangeRate[]) => rates.sort((a, b) =>
    new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
  )[0] ?? null

  return { purchase: latest(purchaseRates), payment: latest(paymentRates) }
})

type PaymentCurrencyBreakdown = {
  currency: string
  original: number
  usd: number
  ars: number
  usdMissing: number
  arsMissing: number
}

const operationPaymentCurrencyBreakdown = computed<PaymentCurrencyBreakdown[]>(() => {
  const payments = new Map<string, { payment: any; amount: number }>()
  const operationDocumentPaymentIds = new Set<string>()

  for (const relation of operation.value?.operation_documents ?? []) {
    for (const allocation of relation.document?.payment_documents ?? []) {
      const payment = allocation.payment
      if (!payment?.id || !['CONFIRMED', 'PAID'].includes(String(payment.status))) continue
      const id = String(payment.id)
      operationDocumentPaymentIds.add(id)
      const existing = payments.get(id)
      payments.set(id, {
        payment,
        amount: (existing?.amount ?? 0) + Number(allocation.amount_applied ?? 0)
      })
    }
  }

  for (const relation of operation.value?.operation_payments ?? []) {
    const payment = relation.payment
    if (!payment?.id || operationDocumentPaymentIds.has(String(payment.id))) continue
    if (!['CONFIRMED', 'PAID'].includes(String(payment.status))) continue
    const id = String(payment.id)
    payments.set(id, { payment, amount: Number(payment.amount ?? 0) })
  }

  const grouped = new Map<string, PaymentCurrencyBreakdown>()
  for (const { payment, amount } of payments.values()) {
    const currency = String(payment.currency_code ?? operationBaseCurrency.value).toUpperCase()
    const row = grouped.get(currency) ?? {
      currency,
      original: 0,
      usd: 0,
      ars: 0,
      usdMissing: 0,
      arsMissing: 0
    }
    row.original += amount

    const allocation = { amount_applied: amount, payment }
    const usd = paymentAppliedInCurrency(allocation, 'USD')
    const ars = paymentAppliedInCurrency(allocation, 'ARS')
    if (usd == null) row.usdMissing += 1
    else row.usd += usd
    if (ars == null) row.arsMissing += 1
    else row.ars += ars
    grouped.set(currency, row)
  }

  return [...grouped.values()].sort((a, b) => a.currency.localeCompare(b.currency))
})

const paymentCurrencyEquivalentLabel = (row: PaymentCurrencyBreakdown, currency: 'USD' | 'ARS') => {
  const amount = currency === 'USD' ? row.usd : row.ars
  const missing = currency === 'USD' ? row.usdMissing : row.arsMissing
  if (missing > 0) return amount > 0 ? `Parcial · ${formatCurrency(amount, currency)}` : 'Sin cotización'
  return formatCurrency(amount, currency)
}

const containerExpenseTotal = (
  containerId: string
): {
  total: number
  paid: number
  pending: number
  currency: string
  unconvertedCount: number
  unconvertedAmount: number
} | null => {
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
    const rate = d.exchange_rate ? Number(d.exchange_rate) : null
    const convertedTotal = convertWithMarketRate(docTotal, docCurrency, opCurrency, rate)
    if (convertedTotal != null) {
      total += convertedTotal
      for (const allocation of d.document?.payment_documents ?? []) {
        if (!['CONFIRMED', 'PAID'].includes(String(allocation.payment?.status))) continue
        const convertedPaid = paymentAppliedInCurrency(allocation, opCurrency)
        if (convertedPaid == null) {
          unconvertedCount += 1
          unconvertedAmount += Number(allocation.amount_applied ?? 0)
        } else {
          paid += convertedPaid
        }
      }
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
    fields.push({
      icon: 'i-lucide-map-pin',
      label: 'Ruta',
      value: `${container.origin_port ?? '—'} → ${container.destination_port ?? '—'}`
    })
  if (container.estimated_departure_date)
    fields.push({
      icon: 'i-lucide-calendar',
      label: 'Salida est.',
      value: formatDate(container.estimated_departure_date)
    })
  if (container.estimated_arrival_date)
    fields.push({
      icon: 'i-lucide-calendar-check',
      label: 'Arribo est. (ETA)',
      value: formatDate(container.estimated_arrival_date)
    })
  if (container.actual_departure_date)
    fields.push({
      icon: 'i-lucide-calendar-check-2',
      label: 'Salida real',
      value: formatDate(container.actual_departure_date)
    })
  if (container.actual_arrival_date)
    fields.push({
      icon: 'i-lucide-calendar-check-2',
      label: 'Arribo real',
      value: formatDate(container.actual_arrival_date)
    })
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
  { id: 'presupuestos', label: 'Presupuestos', icon: 'i-lucide-file-chart-column' },
  { id: 'documentos', label: 'Documentos', icon: 'i-lucide-file-text' }
]

const sectionCounts = computed(() => ({
  contenedores: operation.value?.containers?.length ?? 0,
  presupuestos: operation.value?.operation_quotes?.length ?? 0,
  documentos: summary.value?.stats.documentCount ?? 0
}))

const activeSection = ref('resumen')
let observer: IntersectionObserver | null = null

// Sólo la navegación de secciones permanece sticky. El encabezado completo
// fluye con la página para no ocupar gran parte de la pantalla al desplazarse.
const heroRef = ref<HTMLElement | null>(null)
const subnavRef = ref<HTMLElement | null>(null)
const subnavH = ref(0)
const sectionScrollMt = computed(() => subnavH.value + 12)

const updateStickyOffsets = () => {
  subnavH.value = subnavRef.value?.offsetHeight ?? 0
}

const setupObserver = () => {
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeSection.value = entry.target.id
      }
    },
    { rootMargin: `-${subnavH.value + 8}px 0px -70% 0px` }
  )
  for (const s of sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
}

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', onResize)
})

const scrollTo = (sectionId: string) => {
  activeSection.value = sectionId
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <UPage class="-mt-4 sm:-mt-6 pb-8">
    <div v-if="loading && !operation" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-32 w-full" />
    </div>

    <template v-if="operation">
      <!-- ═══════════════ HERO ═══════════════ -->
      <div
        ref="heroRef"
        class="-mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 border-b border-default bg-gradient-to-b from-primary/5 to-transparent"
      >
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
              <h1 class="text-2xl font-bold font-mono tracking-tight">
                {{ operation.customs_broker_op_number || operation.number }}
              </h1>
              <UBadge
                :label="statusLabel(operation.status)"
                :color="statusColor(operation.status) as any"
                size="xl"
                icon=""
                class="px-4 py-1.5 text-sm font-semibold shadow-sm"
              />
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
          <UBadge
            :label="
              operation.operation_type === 'IMPORT'
                ? 'Importación'
                : operation.operation_type === 'EXPORT'
                  ? 'Exportación'
                  : 'Otro'
            "
            color="primary"
            variant="subtle"
            size="sm"
          />
          <UBadge
            v-if="operation.transport_type"
            :label="transportLabels[operation.transport_type] ?? operation.transport_type"
            color="neutral"
            variant="outline"
            size="sm"
            :icon="transportIcons[operation.transport_type]"
          />
          <UBadge v-if="operation.incoterm" :label="operation.incoterm" color="neutral" variant="outline" size="sm" />
          <span v-if="operation.currency_code" class="text-xs text-muted font-medium">
            en {{ operation.currency_code }}
          </span>
          <span v-if="operation.primary_supplier" class="text-xs text-muted flex items-center gap-1">
            <UIcon name="i-lucide-building-2" class="size-3.5" />
            {{ operation.primary_supplier.name }}
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
      <div
        ref="subnavRef"
        class="sticky -top-4 sm:-top-6 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-default/95 backdrop-blur border-b border-default shadow-sm"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center gap-2 shrink-0 pr-3 border-r border-default min-w-0">
            <span class="font-mono text-sm font-bold max-w-28 sm:max-w-48 truncate" title="Número de operación">
              {{ operation.customs_broker_op_number || operation.number }}
            </span>
            <UBadge
              :label="statusLabel(operation.status)"
              :color="statusColor(operation.status) as any"
              size="sm"
              variant="subtle"
              class="hidden px-2.5 py-1 font-semibold sm:inline-flex"
            />
          </div>
          <div class="flex items-center gap-1 overflow-x-auto min-w-0 scrollbar-none">
            <button
              v-for="s in sections"
              :key="s.id"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              :class="
                activeSection === s.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted/50 hover:text-default'
              "
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
      <div id="resumen" :style="{ scrollMarginTop: sectionScrollMt + 'px' }" class="mt-6 space-y-6">
        <div class="flex flex-col gap-4">
          <!-- FINANCIERO -->
          <div class="rounded-xl border border-default p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3 mb-3">
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-wallet" class="size-4 text-muted" />
                Situación Financiera
              </h2>
              <span class="hidden sm:inline text-[10px] text-muted">
                TC guardado por comprobante y por pago
              </span>
            </div>
            <div v-if="summary" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                  <p class="text-[10px] text-muted font-medium uppercase tracking-wide">
                    Total operación
                  </p>
                  <p class="text-xl font-bold sm:text-2xl">
                    {{ operationFinancialLabel(summary.financial.total.amount) }}
                  </p>
                  <div class="mt-2 grid gap-2 border-t border-primary/15 pt-1.5 text-xs" :class="operationBaseCurrency === 'USD' || operationBaseCurrency === 'ARS' ? 'grid-cols-1' : 'grid-cols-2'">
                    <span v-if="operationBaseCurrency !== 'USD'"><span class="text-muted">Equiv. USD</span> · {{ dualCurrencyLabel('total', 'USD') }}</span>
                    <span v-if="operationBaseCurrency !== 'ARS'"><span class="text-muted">Equiv. ARS</span> · {{ dualCurrencyLabel('total', 'ARS') }}</span>
                  </div>
                </div>
                <div class="rounded-xl border border-success/30 bg-success/5 p-4 sm:p-5">
                  <p class="text-[10px] text-muted font-medium uppercase tracking-wide">Pagado</p>
                  <p class="text-xl font-bold text-success-500 sm:text-2xl">
                    {{ operationFinancialLabel(summary.financial.paid.amount) }}
                  </p>
                  <div class="mt-2 grid gap-2 border-t border-success/15 pt-1.5 text-xs" :class="operationBaseCurrency === 'USD' || operationBaseCurrency === 'ARS' ? 'grid-cols-1' : 'grid-cols-2'">
                    <span v-if="operationBaseCurrency !== 'USD'"><span class="text-muted">Equiv. USD</span> · {{ dualCurrencyLabel('paid', 'USD') }}</span>
                    <span v-if="operationBaseCurrency !== 'ARS'"><span class="text-muted">Equiv. ARS</span> · {{ dualCurrencyLabel('paid', 'ARS') }}</span>
                  </div>
                </div>
                <div class="rounded-xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
                  <p class="text-[10px] text-muted font-medium uppercase tracking-wide">Pendiente</p>
                  <p class="text-xl font-bold text-warning-500 sm:text-2xl">
                    {{ operationFinancialLabel(summary.financial.pending.amount) }}
                  </p>
                  <div class="mt-2 grid gap-2 border-t border-warning/15 pt-1.5 text-xs" :class="operationBaseCurrency === 'USD' || operationBaseCurrency === 'ARS' ? 'grid-cols-1' : 'grid-cols-2'">
                    <span v-if="operationBaseCurrency !== 'USD'"><span class="text-muted">Equiv. USD</span> · {{ dualCurrencyLabel('pending', 'USD') }}</span>
                    <span v-if="operationBaseCurrency !== 'ARS'"><span class="text-muted">Equiv. ARS</span> · {{ dualCurrencyLabel('pending', 'ARS') }}</span>
                  </div>
                </div>
              </div>

              <p
                v-if="(summary.financialDualCurrency?.USD.totalMissing ?? 0) + (summary.financialDualCurrency?.ARS.totalMissing ?? 0) + (summary.financialDualCurrency?.USD.paidMissing ?? 0) + (summary.financialDualCurrency?.ARS.paidMissing ?? 0) > 0"
                class="text-[10px] text-warning-500"
              >
                Hay equivalentes incompletos porque faltan cotizaciones guardadas. Revisá cada comprobante o pago.
              </p>

              <UAlert
                v-if="(summary.financial.unconverted?.count ?? 0) > 0"
                color="warning"
                variant="soft"
                icon="i-lucide-alert-triangle"
                class="text-xs"
                :title="`${summary.financial.unconverted!.count} comprobante(s) o pago(s) sin conversión disponible`"
                :description="`${fmtMoney(summary.financial.unconverted!.amount, '—')} no se incluyen en el equivalente consolidado. Revisá la cotización guardada en cada movimiento.`"
              />

              <div class="rounded-xl border border-default p-4">
                <div class="mb-3">
                  <h3 class="text-sm font-semibold">Detalle por moneda de pagos</h3>
                  <p class="text-xs text-muted">Suma aplicada según la moneda original y la cotización guardada en cada pago.</p>
                </div>
                <div v-if="operationPaymentCurrencyBreakdown.length" class="overflow-x-auto">
                  <div class="min-w-[620px]">
                    <div class="grid grid-cols-[minmax(190px,1.4fr)_repeat(3,minmax(135px,1fr))] border-b border-default px-2 py-2 text-xs font-medium text-muted">
                      <span>Moneda de pago</span>
                      <span class="text-right">Monto original</span>
                      <span class="text-right">Equivalente en USD</span>
                      <span class="text-right">Equivalente en ARS</span>
                    </div>
                    <div
                      v-for="row in operationPaymentCurrencyBreakdown"
                      :key="row.currency"
                      class="grid grid-cols-[minmax(190px,1.4fr)_repeat(3,minmax(135px,1fr))] items-center border-b border-default/60 px-2 py-2.5 text-sm last:border-b-0"
                    >
                      <span class="font-medium">
                        {{ row.currency === 'ARS' ? 'Pesos argentinos (ARS)' : row.currency === 'USD' ? 'Dólares (USD)' : row.currency }}
                      </span>
                      <span class="text-right">{{ formatCurrency(row.original, row.currency) }}</span>
                      <span class="text-right" :class="row.usdMissing ? 'text-warning-500' : ''">
                        {{ paymentCurrencyEquivalentLabel(row, 'USD') }}
                      </span>
                      <span class="text-right" :class="row.arsMissing ? 'text-warning-500' : ''">
                        {{ paymentCurrencyEquivalentLabel(row, 'ARS') }}
                      </span>
                    </div>
                  </div>
                </div>
                <p v-else class="rounded-lg bg-muted/20 px-3 py-4 text-center text-sm text-muted">
                  Todavía no hay pagos confirmados asociados a esta operación.
                </p>
              </div>

            </div>
          </div>

          <!-- INDICADORES SECUNDARIOS + INFORMACIÓN -->
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                class="min-w-0 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
                @click="scrollTo('documentos')"
              >
                <div class="flex items-center gap-2 text-xs font-medium text-muted">
                  <UIcon name="i-lucide-arrow-left-right" class="size-4 text-primary" />
                  Tipo de cambio
                </div>
                <div class="mt-3 grid grid-cols-2 gap-3">
                  <div class="min-w-0">
                    <p class="text-[10px] uppercase tracking-wide text-muted">Última compra</p>
                    <p class="truncate text-sm font-semibold">
                      {{ latestOperationExchangeRates.purchase ? `1 USD = ${formatCurrency(latestOperationExchangeRates.purchase.rate, 'ARS')}` : 'Sin dato' }}
                    </p>
                    <p v-if="latestOperationExchangeRates.purchase" class="truncate text-[10px] text-muted">
                      {{ formatDate(latestOperationExchangeRates.purchase.date) }}{{ rateTypeLabel(latestOperationExchangeRates.purchase.rateType) ? ` · ${rateTypeLabel(latestOperationExchangeRates.purchase.rateType)}` : '' }}
                    </p>
                  </div>
                  <div class="min-w-0 border-l border-primary/20 pl-3">
                    <p class="text-[10px] uppercase tracking-wide text-muted">Último pago</p>
                    <p class="truncate text-sm font-semibold">
                      {{ latestOperationExchangeRates.payment ? `1 USD = ${formatCurrency(latestOperationExchangeRates.payment.rate, 'ARS')}` : 'Sin dato' }}
                    </p>
                    <p v-if="latestOperationExchangeRates.payment" class="truncate text-[10px] text-muted">
                      {{ formatDate(latestOperationExchangeRates.payment.date) }}{{ rateTypeLabel(latestOperationExchangeRates.payment.rateType) ? ` · ${rateTypeLabel(latestOperationExchangeRates.payment.rateType)}` : '' }}
                    </p>
                  </div>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-default p-4 text-left transition-colors hover:border-info/40 hover:bg-info/5"
                @click="scrollTo('documentos')"
              >
                <div class="size-10 shrink-0 rounded-lg bg-info/10 flex items-center justify-center">
                  <UIcon name="i-lucide-receipt-text" class="size-5 text-info" />
                </div>
                <div>
                  <p class="text-xs font-medium text-muted">Comprobantes</p>
                  <p class="text-xl font-bold">{{ summary?.stats.documentCount ?? 0 }}</p>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-default p-4 text-left transition-colors hover:border-success/40 hover:bg-success/5"
                @click="scrollTo('documentos')"
              >
                <div class="size-10 shrink-0 rounded-lg bg-success/10 flex items-center justify-center">
                  <UIcon name="i-lucide-credit-card" class="size-5 text-success" />
                </div>
                <div>
                  <p class="text-xs font-medium text-muted">Pagos</p>
                  <p class="text-xl font-bold">{{ summary?.stats.paymentCount ?? 0 }}</p>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-default p-4 text-left transition-colors hover:border-warning/40 hover:bg-warning/5"
                @click="scrollTo('presupuestos')"
              >
                <div class="size-10 shrink-0 rounded-lg bg-warning/10 flex items-center justify-center">
                  <UIcon name="i-lucide-file-chart-column" class="size-5 text-warning" />
                </div>
                <div>
                  <p class="text-xs font-medium text-muted">Presupuestos</p>
                  <p class="text-xl font-bold">{{ operation.operation_quotes?.length ?? 0 }}</p>
                </div>
              </button>
            </div>

            <div v-if="hasOperationInformation" class="rounded-xl border border-default p-5">
              <h2 class="font-semibold flex items-center gap-2 mb-4">
                <UIcon name="i-lucide-info" class="size-4 text-muted" />
                Información
              </h2>
              <div class="space-y-3 text-sm">
                <div v-if="operation.origin_country?.trim()" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-map-pin" class="size-3.5" />
                    Origen
                  </span>
                  <span class="font-medium">{{ operation.origin_country ?? '—' }}</span>
                </div>
                <div v-if="operation.destination_country?.trim()" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-flag" class="size-3.5" />
                    Destino
                  </span>
                  <span class="font-medium">{{ operation.destination_country ?? '—' }}</span>
                </div>
                <div v-if="operation.estimated_arrival_date" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-check" class="size-3.5" />
                    ETA
                  </span>
                  <span class="font-medium">{{ formatDate(operation.estimated_arrival_date) }}</span>
                </div>
                <div v-if="operation.actual_arrival_date" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5" />
                    Llegada real
                  </span>
                  <span class="font-medium">{{ formatDate(operation.actual_arrival_date) }}</span>
                </div>
                <div v-if="operation.customs_broker_op_number?.trim()" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-file-badge" class="size-3.5" />
                    N° OP Despachante
                  </span>
                  <span class="font-medium">{{ operation.customs_broker_op_number }}</span>
                </div>
                <div v-if="operation.sim_number?.trim()" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-file-check" class="size-3.5" />
                    SIM
                  </span>
                  <span class="font-medium">{{ operation.sim_number }}</span>
                </div>
                <div v-if="operation.supplier_purchase_order?.trim()" class="flex items-center justify-between gap-3">
                  <span class="text-muted flex items-center gap-1.5">
                    <UIcon name="i-lucide-shopping-cart" class="size-3.5" />
                    OC Proveedor
                  </span>
                  <span class="font-medium">{{ operation.supplier_purchase_order }}</span>
                </div>
                <div v-if="operation.notes?.trim()" class="pt-3 border-t border-default">
                  <p class="text-muted flex items-center gap-1.5 mb-1">
                    <UIcon name="i-lucide-sticky-note" class="size-3.5" />
                    Notas
                  </p>
                  <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ operation.notes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ CONTENEDORES ═══════════════ -->
      <div id="contenedores" :style="{ scrollMarginTop: sectionScrollMt + 'px' }" class="mt-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <UIcon name="i-lucide-container" class="size-4 text-muted" />
            Contenedores
            <UBadge :label="`${operation.containers?.length ?? 0}`" color="neutral" variant="outline" size="xs" />
          </h2>
          <UButton
            label="Nuevo contenedor"
            icon="i-lucide-plus"
            size="xs"
            variant="outline"
            :to="`/operaciones-internacionales/${id}/containers/create`"
          />
        </div>

        <div v-if="operation.containers?.length" class="space-y-4">
          <div
            v-for="container in operation.containers"
            :key="container.id"
            class="rounded-xl border border-default overflow-hidden bg-default hover:shadow-sm transition-shadow"
          >
            <!-- Header compacto -->
            <div
              class="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-default bg-muted/30"
            >
              <div class="flex items-center gap-3 min-w-0">
                <UIcon name="i-lucide-container" class="size-4 text-muted shrink-0" />
                <span class="font-mono font-bold">{{ container.container_number }}</span>
                <UBadge
                  :label="containerStatusLabel(container.status)"
                  :color="containerStatusColor(container.status) as any"
                  size="lg"
                  variant="subtle"
                  class="px-3 py-1 text-sm font-semibold shadow-sm"
                />
                <span class="text-xs text-muted">
                  {{ containerTypeLabel(container.container_type as ContainerType) }}
                </span>
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
              <div
                class="flex items-center justify-between flex-wrap gap-2 px-4 py-2 bg-muted/20 border-b border-default"
              >
                <span class="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                  <UIcon name="i-lucide-receipt" class="size-3.5" />
                  Gastos
                </span>
                <div class="flex items-center gap-3" v-if="containerExpenseTotal(container.id)">
                  <span class="text-xs">
                    <span class="text-muted">Total:</span>
                    <span class="font-bold">
                      {{
                        fmtMoney(
                          containerExpenseTotal(container.id)!.total,
                          containerExpenseTotal(container.id)!.currency
                        )
                      }}
                    </span>
                  </span>
                  <span
                    v-if="containerExpenseTotal(container.id)!.paid > 0"
                    class="text-xs text-success-500 font-medium"
                  >
                    Pagado:
                    {{
                      fmtMoney(containerExpenseTotal(container.id)!.paid, containerExpenseTotal(container.id)!.currency)
                    }}
                  </span>
                  <span
                    v-if="containerExpenseTotal(container.id)!.pending > 0"
                    class="text-xs text-warning-500 font-medium"
                  >
                    Pendiente:
                    {{
                      fmtMoney(
                        containerExpenseTotal(container.id)!.pending,
                        containerExpenseTotal(container.id)!.currency
                      )
                    }}
                  </span>
                  <span
                    v-if="containerExpenseTotal(container.id)!.unconvertedCount > 0"
                    class="text-xs text-error-500 font-medium"
                    :title="`${containerExpenseTotal(container.id)!.unconvertedCount} importe(s) sin cotización compatible`"
                  >
                    · {{ containerExpenseTotal(container.id)!.unconvertedCount }} sin TC
                  </span>
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
                      <NuxtLink
                        v-if="rel.document"
                        :to="associatedDocumentRoute(rel.document)"
                        class="inline-flex items-center gap-1.5 text-primary hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span>{{ rel.document.document_types?.code }} Nº {{ rel.document.number }}</span>
                        <UIcon name="i-lucide-arrow-up-right" class="size-3.5" />
                      </NuxtLink>
                    </td>
                    <td class="px-4 py-2 text-muted text-xs min-w-0">
                      <span class="truncate block">
                        {{ expenseTypeLabel(rel.expense_type as InternationalExpenseType) }}
                        <span v-if="rel.document?.business_parties">— {{ rel.document.business_parties.name }}</span>
                      </span>
                    </td>
                    <td class="px-4 py-2 text-right whitespace-nowrap">
                      <div v-if="docCurrencyInfo(rel)">
                        <p class="font-medium">
                          {{ formatCurrency(docCurrencyInfo(rel)!.total, docCurrencyInfo(rel)!.docCurrency) }}
                        </p>
                        <p class="text-[10px] text-muted">
                          TC {{ docCurrencyInfo(rel)!.rate ?? '—' }} · =
                          <span v-if="docCurrencyInfo(rel)!.converted != null">
                            {{ fmtMoney(docCurrencyInfo(rel)!.converted, docCurrencyInfo(rel)!.opCurrency) }}
                          </span>
                          <span v-else class="text-warning-500">sin TC</span>
                        </p>
                      </div>
                      <span v-else class="font-medium">
                        {{ formatCurrency(Number(rel.document?.total ?? 0), rel.document?.currency_code) }}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <UPopover v-if="getDocumentPending(rel.document) > 0">
                        <UButton
                          :label="getPaymentStatus(rel.document).label"
                          :color="getPaymentStatus(rel.document).color"
                          size="xs"
                          variant="soft"
                          trailing-icon="i-lucide-chevron-down"
                        />
                        <template #content>
                          <div class="w-64 p-3 space-y-3 text-left">
                            <div>
                              <p class="text-sm font-semibold">Documento pendiente</p>
                              <p class="text-xs text-muted mt-0.5">
                                Restan {{ formatCurrency(getDocumentPending(rel.document), rel.document?.currency_code) }}
                              </p>
                            </div>
                            <div class="grid gap-1">
                              <UButton label="Editar documento" icon="i-lucide-pencil" variant="ghost" block @click="editAssociatedDocument(rel.document)" />
                              <UButton label="Registrar pago" icon="i-lucide-hand-coins" block @click="payAssociatedDocument(rel.document)" />
                            </div>
                          </div>
                        </template>
                      </UPopover>
                      <UBadge v-else label="Pagado" color="success" size="xs" variant="subtle" />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="containerMerchandiseItems(container.id).length" class="border-t border-default p-4">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                    <UIcon name="i-lucide-package-open" class="size-3.5" />
                    Mercadería del contenedor
                  </span>
                  <UBadge
                    :label="`${containerMerchandiseItems(container.id).length} producto(s)`"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  <div
                    v-for="item in containerMerchandiseItems(container.id)"
                    :key="item.id"
                    class="flex items-center justify-between gap-3 rounded-lg border border-default bg-muted/10 px-3 py-2"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ item.name }}</p>
                      <p class="text-xs text-muted">
                        <span v-if="item.sku">SKU: {{ item.sku }}</span>
                        <span v-if="item.sku && item.documents > 1"> · </span>
                        <span v-if="item.documents > 1">{{ item.documents }} comprobantes · sin duplicar OC/factura</span>
                      </p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-xs text-muted">Cantidad</p>
                      <p class="font-bold text-primary">{{ item.quantity.toLocaleString('es-AR') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-default text-center py-10">
          <UIcon name="i-lucide-container" class="size-8 text-muted mx-auto mb-2" />
          <p class="text-muted text-sm">No hay contenedores asociados.</p>
          <UButton
            label="Agregar contenedor"
            variant="soft"
            size="xs"
            class="mt-3"
            icon="i-lucide-plus"
            :to="`/operaciones-internacionales/${id}/containers/create`"
          />
        </div>
      </div>

      <!-- ═══════════════ PRESUPUESTOS ═══════════════ -->
      <section id="presupuestos" :style="{ scrollMarginTop: sectionScrollMt + 'px' }" class="mt-8 overflow-hidden rounded-2xl border border-default bg-muted/5 shadow-sm">
        <header class="flex items-center justify-between gap-4 flex-wrap border-b border-default bg-muted/20 px-4 py-4 sm:px-5">
          <div class="flex items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-file-chart-column" class="size-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-semibold text-base">Presupuestos</h2>
                <UBadge :label="`${operation.operation_quotes?.length ?? 0}`" color="neutral" variant="outline" size="xs" />
              </div>
              <p class="mt-0.5 text-xs text-muted">Compará propuestas por categoría y contenedor. No se suman a los totales.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <UButton
              label="Crear"
              icon="i-lucide-file-plus"
              :disabled="!hasContainers"
              size="xs"
              variant="outline"
              @click="
                () => {
                  showCreateQuoteModal = true
                }
              "
            />
            <UButton
              label="Asociar"
              icon="i-lucide-plus"
              :disabled="!hasContainers"
              size="xs"
              variant="outline"
              @click="
                () => {
                  showQuoteModal = true
                }
              "
            />
          </div>
        </header>

        <div class="flex flex-col gap-4 p-4 sm:p-5">
        <UAlert v-if="!hasContainers" title="Primero creá un contenedor" description="Los presupuestos y comprobantes deben asociarse a un contenedor y una categoría de esta operación." color="info" variant="subtle">
          <template #actions><UButton label="Crear contenedor" icon="i-lucide-container" :to="`/operaciones-internacionales/${id}/containers/create`" /></template>
        </UAlert>
        <div v-if="operation.operation_quotes?.length" class="flex flex-col gap-4">
          <div class="overflow-x-auto overflow-y-hidden rounded-lg border border-default bg-default px-3 pt-1 pb-1">
            <UTabs
              v-model="activeQuoteCategory"
              :items="quoteCategoryTabs"
              :content="false"
              variant="link"
              color="primary"
              :ui="{ trigger: 'cursor-pointer transition-colors hover:bg-muted/20 hover:text-primary rounded-t-md' }"
              class="min-w-max"
            />
          </div>
          <div class="flex flex-col gap-5">
            <section v-for="group in activeQuoteGroups" :key="group.key" class="flex flex-col gap-3">
              <h3 class="flex items-center gap-2 rounded-lg border border-default bg-muted/20 px-3 py-2 text-sm font-semibold">
                <UIcon name="i-lucide-container" class="size-4 text-muted" />
                {{ group.label }}
                <UBadge :label="`${group.quotes.length} propuesta(s)`" color="neutral" variant="outline" size="xs" />
              </h3>
              <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div
            v-for="quote in group.quotes"
            :key="quote.id"
            class="rounded-xl border bg-default p-4 shadow-sm transition-colors"
            :class="quote.status === 'ACCEPTED' ? 'border-success/50 bg-success/5' : 'border-default'"
          >
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-mono font-bold text-sm">
                    {{ quote.document?.document_types?.code }} Nº
                    {{ String(quote.document?.number ?? '').padStart(8, '0') }}
                  </span>
                  <UBadge
                    :label="quoteStatusLabel(quote.status)"
                    :color="quoteStatusColor(quote.status)"
                    size="xs"
                    variant="subtle"
                  />
                </div>
                <div class="flex items-center gap-3 text-xs text-muted flex-wrap">
                  <span class="font-medium text-default flex items-center gap-1">
                    <UIcon name="i-lucide-building-2" class="size-3" />
                    {{ quote.document?.business_parties?.name ?? '—' }}
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
                <span class="font-medium text-default">
                  {{ formatCurrency(Number(item.price), quote.document?.currency_code) }}
                </span>
              </span>
            </div>

            <div class="flex items-center justify-end gap-1 mt-2.5 pt-2.5 border-t border-default">
              <UButton
                v-if="!quote.converted_document_id && quote.status !== 'REJECTED'"
                label="Elegir y transformar"
                :disabled="!hasContainers"
                icon="i-lucide-check"
                color="success"
                variant="soft"
                size="xs"
                @click="handleAcceptQuote(quote)"
              />
              <UButton
                v-if="quote.status === 'PENDING' && !quote.converted_document_id"
                label="Rechazar"
                icon="i-lucide-x"
                color="error"
                variant="ghost"
                size="xs"
                @click="handleRejectQuote(quote)"
              />
              <UButton
                v-if="quote.status !== 'PENDING' && !quote.converted_document_id"
                label="Marcar pendiente"
                icon="i-lucide-rotate-ccw"
                variant="ghost"
                size="xs"
                @click="handleResetQuote(quote)"
              />
              <UButton v-if="quote.converted_document" :label="`${quote.converted_document.document_types?.code ?? 'Comprobante'} #${quote.converted_document.number} · ${quote.converted_document.status === 0 ? 'Borrador' : quote.converted_document.status === 2 ? 'Confirmado' : 'Ver estado'}`" icon="i-lucide-external-link" variant="soft" size="xs" :to="`/erp/purchases/purchases-documents/${quote.converted_document.id}`" />
              <UButton v-if="!quote.converted_document_id" icon="i-lucide-unlink" variant="ghost" size="xs" @click="handleDisassociateQuote(quote)" />
            </div>
          </div>
              </div>
            </section>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-default text-center py-10">
          <UIcon name="i-lucide-file-chart-column" class="size-8 text-muted mx-auto mb-2" />
          <p class="text-muted text-sm">No hay presupuestos asociados.</p>
          <p class="text-xs text-muted mb-3">
            Creá uno rápido o asociá una cotización existente del módulo de compras.
          </p>
          <div class="flex justify-center gap-2">
            <UButton
              label="Crear presupuesto"
              :disabled="!hasContainers"
              variant="soft"
              size="xs"
              icon="i-lucide-file-plus"
              @click="
                () => {
                  showCreateQuoteModal = true
                }
              "
            />
            <UButton
              label="Asociar existente"
              :disabled="!hasContainers"
              variant="outline"
              size="xs"
              icon="i-lucide-plus"
              @click="
                () => {
                  showQuoteModal = true
                }
              "
            />
          </div>
        </div>
        </div>
      </section>

      <!-- ═══════════════ DOCUMENTOS ═══════════════ -->
      <section id="documentos" :style="{ scrollMarginTop: sectionScrollMt + 'px' }" class="mt-8 overflow-hidden rounded-2xl border border-default bg-muted/5 shadow-sm">
        <header class="flex items-center justify-between gap-4 flex-wrap border-b border-default bg-muted/20 px-4 py-4 sm:px-5">
          <div class="flex items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-files" class="size-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-semibold text-base">Documentos</h2>
                <UBadge :label="`${summary?.stats.documentCount ?? 0}`" color="neutral" variant="outline" size="xs" />
              </div>
              <p class="mt-0.5 text-xs text-muted">Órdenes, facturas y pagos asociados a la operación.</p>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap justify-end">
            <UButton
              label="Nueva factura de compra"
              icon="i-lucide-file-plus-2"
              size="xs"
              color="primary"
              @click="openCreateInvoiceModal"
            />
            <UButton
              label="Asociar documento"
              :disabled="!hasContainers"
              icon="i-lucide-plus"
              size="xs"
              variant="outline"
              @click="
                () => {
                  showDocumentModal = true
                }
              "
            />
          </div>
        </header>

        <div class="flex flex-col gap-4 p-4 sm:p-5">
        <div
          v-if="refreshingQuoteDocuments"
          role="status"
          aria-live="polite"
          class="mb-3 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
        >
          <UIcon name="i-lucide-loader-circle" class="size-5 shrink-0 animate-spin text-primary" />
          <div>
            <p class="text-sm font-medium">Actualizando documentos de la operación…</p>
            <p class="text-xs text-muted">El comprobante ya se generó desde el presupuesto; estamos actualizando el listado para mostrarlo acá.</p>
          </div>
        </div>

        <div v-if="summary?.expenseGroups?.length" class="flex flex-col gap-4">
          <div class="overflow-x-auto overflow-y-hidden rounded-lg border border-default bg-default px-3 pt-1 pb-1">
            <UTabs
              v-model="activeDocumentCategory"
              :items="documentCategoryTabs"
              :content="false"
              variant="link"
              color="primary"
              :ui="{ trigger: 'cursor-pointer transition-colors hover:bg-muted/20 hover:text-primary rounded-t-md' }"
              class="min-w-max"
            />
          </div>
          <div class="space-y-4">
          <div
            v-for="group in visibleDocumentGroups"
            :key="group.type"
            class="overflow-hidden rounded-xl border border-default bg-default shadow-sm"
          >
            <!-- Header de grupo -->
            <div
              class="flex items-center justify-between gap-3 flex-wrap border-b border-default bg-muted/30 px-4 py-3"
            >
              <div class="flex items-center gap-2">
                <span class="font-semibold text-sm">{{ group.label }}</span>
                <UBadge :label="`${group.documentCount} docs`" color="neutral" variant="outline" size="xs" />
              </div>
              <div class="flex items-center gap-4 text-xs">
                <span>
                  <span class="text-muted">Total:</span>
                  <span class="font-bold">
                    {{ formatCurrency(group.total, group.currency ?? operation.currency_code) }}
                  </span>
                </span>
                <span v-if="group.paid > 0" class="text-success-500 font-medium">
                  Pagado: {{ formatCurrency(group.paid, group.currency ?? operation.currency_code) }}
                </span>
                <span v-if="group.pending > 0" class="text-warning-500 font-medium">
                  Pendiente: {{ formatCurrency(group.pending, group.currency ?? operation.currency_code) }}
                </span>
                <span
                  v-if="(group.unconvertedCount ?? 0) > 0"
                  class="text-error-500 font-medium"
                  :title="`${group.unconvertedCount} documento(s) sin tipo de cambio`"
                >
                  · {{ group.unconvertedCount }} sin TC
                </span>
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
                      <NuxtLink
                        v-if="rel.document"
                        :to="associatedDocumentRoute(rel.document)"
                        class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-primary hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span>{{ rel.document.document_types?.code }} Nº {{ rel.document.number }}</span>
                        <UIcon name="i-lucide-arrow-up-right" class="size-3.5" />
                      </NuxtLink>
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
                        <UIcon name="i-lucide-building-2" class="size-3" />
                        {{ rel.document.business_parties.name }}
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
                      <p class="font-bold">
                        {{ formatCurrency(docCurrencyInfo(rel)!.total, docCurrencyInfo(rel)!.docCurrency) }}
                      </p>
                      <p class="text-[10px] text-muted">
                        TC operación {{ docCurrencyInfo(rel)!.rate ?? '—' }} · =
                        <span v-if="docCurrencyInfo(rel)!.converted != null">
                          {{ fmtMoney(docCurrencyInfo(rel)!.converted, docCurrencyInfo(rel)!.opCurrency) }}
                        </span>
                        <span v-else class="text-warning-500">sin TC</span>
                      </p>
                      <p v-if="savedDocumentRateLabel(rel)" class="text-[10px] text-muted">
                        {{ savedDocumentRateLabel(rel) }}
                      </p>
                    </div>
                    <div v-else>
                      <p class="font-bold">
                        {{ formatCurrency(Number(rel.document?.total ?? 0), rel.document?.currency_code) }}
                      </p>
                      <p v-if="savedDocumentRateLabel(rel)" class="text-[10px] text-muted">
                        {{ savedDocumentRateLabel(rel) }}
                      </p>
                    </div>
                    <UPopover v-if="getDocumentPending(rel.document) > 0">
                      <UButton
                        :label="getPaymentStatus(rel.document).label"
                        :color="getPaymentStatus(rel.document).color"
                        size="xs"
                        variant="soft"
                        trailing-icon="i-lucide-chevron-down"
                      />
                      <template #content>
                        <div class="w-64 p-3 space-y-3 text-left">
                          <div>
                            <p class="text-sm font-semibold">{{ getPaymentStatus(rel.document).label }}</p>
                            <p v-if="getDocumentUnconvertedPaymentCount(rel.document) > 0" class="text-xs text-warning-500 mt-0.5">
                              No se puede calcular el saldo en la moneda del comprobante: falta la cotización propia de uno o más pagos.
                            </p>
                            <p v-else class="text-xs text-muted mt-0.5">
                              Restan {{ formatCurrency(getDocumentPending(rel.document), rel.document?.currency_code) }}
                            </p>
                          </div>
                          <div class="grid gap-1">
                            <UButton label="Editar documento" icon="i-lucide-pencil" variant="ghost" block @click="editAssociatedDocument(rel.document)" />
                            <UButton label="Registrar pago" icon="i-lucide-hand-coins" block @click="payAssociatedDocument(rel.document)" />
                          </div>
                        </div>
                      </template>
                    </UPopover>
                    <UBadge v-else label="Pagado" color="success" size="xs" variant="subtle" />
                    <UDropdownMenu
                      :items="[
                        {
                          label: 'Desasociar documento',
                          icon: 'i-lucide-unlink',
                          onSelect: () => handleDisassociateDocument(rel.document_id)
                        }
                      ]"
                    >
                      <UButton icon="i-lucide-more-horizontal" variant="ghost" size="xs" />
                    </UDropdownMenu>
                  </div>
                </div>

                <!-- Pagos colapsables -->
                <div
                  v-if="expandedDocs.has(rel.document_id) && rel.document?.payment_documents?.length"
                  class="mt-3 ml-2 pl-4 border-l-2 border-primary/40 space-y-2"
                >
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
                      <span class="text-xs text-muted">
                        {{ formatDate(pd.payment?.date) }} · {{ pd.payment?.payment_method }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <div class="text-right">
                        <p class="text-xs font-medium">
                          {{ formatCurrency(Number(pd.amount_applied ?? 0), pd.payment?.currency_code) }}
                        </p>
                        <p v-if="paymentAppliedDocumentLabel(pd, rel.document?.currency_code)" class="text-[10px] text-muted">
                          Equiv. comprobante: {{ paymentAppliedDocumentLabel(pd, rel.document?.currency_code) }}
                        </p>
                        <p
                          v-else-if="pd.payment?.currency_code?.toUpperCase() !== rel.document?.currency_code?.toUpperCase()"
                          class="text-[10px] text-warning-500"
                        >
                          Sin TC para convertir al comprobante
                        </p>
                        <p v-if="paymentRateLabel(pd.payment)" class="text-[10px] text-muted" :title="pd.payment?.exchange_note || undefined">
                          {{ paymentRateLabel(pd.payment) }}
                        </p>
                        <p v-if="paymentAppliedArsLabel(pd) && pd.payment?.currency_code !== 'ARS'" class="text-[10px] text-muted">
                          ≈ {{ paymentAppliedArsLabel(pd) }}
                        </p>
                        <p v-else-if="pd.payment?.currency_code !== 'ARS'" class="text-[10px] text-warning-500">
                          Sin cotización del pago
                        </p>
                      </div>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        <div v-else-if="!refreshingQuoteDocuments" class="rounded-xl border border-dashed border-default text-center py-10">
          <UIcon name="i-lucide-file-text" class="size-8 text-muted mx-auto mb-2" />
          <p class="text-muted text-sm">No hay documentos asociados.</p>
          <UButton
            label="Asociar documento"
            :disabled="!hasContainers"
            variant="soft"
            size="xs"
            class="mt-3"
            icon="i-lucide-plus"
            @click="
              () => {
                showDocumentModal = true
              }
            "
          />
        </div>
      </div>
      </section>

      <!-- MODALS -->
      <UModal
        v-model:open="showStatusChangeModal"
        :title="pendingStatusMeta?.title"
        description="Revisá el cambio antes de actualizar el seguimiento."
        :dismissible="!statusChangeSaving"
      >
        <template #body>
          <div v-if="pendingStatusMeta" class="space-y-5">
            <div class="flex items-start gap-3 rounded-xl border border-default bg-muted/20 p-4">
              <div class="rounded-lg bg-primary/10 p-2 text-primary">
                <UIcon
                  :name="pendingStatusChange?.scope === 'operation' ? 'i-lucide-route' : 'i-lucide-container'"
                  class="size-5"
                />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  {{ pendingStatusChange?.scope === 'operation' ? 'Operación' : 'Contenedor' }}
                </p>
                <p class="truncate font-mono text-base font-semibold">{{ pendingStatusMeta.subject }}</p>
              </div>
            </div>

            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div class="rounded-xl border border-default p-4 text-center">
                <p class="mb-2 text-xs font-medium text-muted">Estado actual</p>
                <UBadge
                  :label="pendingStatusMeta.current"
                  :color="pendingStatusMeta.currentColor as any"
                  variant="subtle"
                  size="lg"
                />
              </div>
              <UIcon name="i-lucide-arrow-right" class="size-5 text-muted" />
              <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <p class="mb-2 text-xs font-medium text-muted">Nuevo estado</p>
                <UBadge
                  :label="pendingStatusMeta.next"
                  :color="pendingStatusMeta.color as any"
                  size="lg"
                  class="font-semibold"
                />
              </div>
            </div>

            <UAlert
              v-if="pendingStatusMeta.description"
              color="neutral"
              variant="subtle"
              icon="i-lucide-info"
              title="Qué significa este estado"
              :description="pendingStatusMeta.description"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              :disabled="statusChangeSaving"
              @click="showStatusChangeModal = false"
            />
            <UButton
              label="Confirmar cambio"
              icon="i-lucide-check"
              :color="pendingStatusMeta?.color as any"
              :loading="statusChangeSaving"
              @click="confirmStatusChange"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="showCreateInvoiceModal"
        title="Crear factura para la operación"
        description="Indicá qué concepto representa y, cuando corresponda, a qué contenedor pertenece."
      >
        <template #body>
          <div class="space-y-4">
            <UFormField
              label="Concepto de la factura"
              required
              help="Define cómo se agrupará el costo dentro de la operación."
            >
              <USelectMenu
                v-model="invoiceExpenseType"
                :items="expenseTypeOptions"
                value-key="value"
                placeholder="Seleccionar mercadería, flete, seguro…"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="invoiceExpenseType === 'OTHER'"
              label="Descripción del gasto"
              required
            >
              <UInput
                v-model="invoiceCustomExpenseDescription"
                placeholder="Indicá qué gasto representa la factura"
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="!invoiceContainerOptions.length"
              color="warning"
              variant="subtle"
              icon="i-lucide-container"
              title="La operación todavía no tiene contenedores"
              description="Creá el contenedor antes de generar la factura para que la asociación quede completa."
            />

            <template v-else-if="invoiceContainerOptions.length">
              <UFormField
                label="Contenedor"
                required
                help="El documento conservará este contenedor y la categoría elegida."
              >
                <USelectMenu
                  v-model="invoiceContainerId"
                  :items="invoiceContainerOptions"
                  value-key="value"
                  searchable
                  clear
                  placeholder="Seleccionar contenedor"
                  class="w-full"
                />
              </UFormField>

              <div
                v-if="selectedInvoiceContainer"
                class="rounded-xl border border-primary/25 bg-primary/5 p-4"
              >
                <div class="flex items-center gap-3">
                  <div class="rounded-lg bg-primary/10 p-2 text-primary">
                    <UIcon name="i-lucide-container" class="size-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-mono font-semibold">{{ selectedInvoiceContainer.container_number }}</p>
                    <p v-if="selectedInvoiceContainer.container_type" class="text-sm text-muted">
                      {{ containerTypeLabel(selectedInvoiceContainer.container_type as ContainerType) }}
                    </p>
                  </div>
                  <UBadge
                    :label="containerStatusLabel(selectedInvoiceContainer.status)"
                    :color="containerStatusColor(selectedInvoiceContainer.status) as any"
                    variant="subtle"
                    class="ml-auto"
                  />
                </div>
              </div>
            </template>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <UButton
              v-if="!invoiceContainerOptions.length"
              label="Crear contenedor"
              icon="i-lucide-container"
              :to="`/operaciones-internacionales/${id}/containers/create`"
              @click="showCreateInvoiceModal = false"
            />
            <span v-else />
            <div class="flex justify-end gap-2">
              <UButton label="Cancelar" color="neutral" variant="ghost" @click="showCreateInvoiceModal = false" />
              <UButton
                v-if="invoiceContainerOptions.length"
                label="Continuar con la factura"
                icon="i-lucide-arrow-right"
                :disabled="!canContinueInvoiceCreation"
                @click="continueInvoiceCreation"
              />
            </div>
          </div>
        </template>
      </UModal>

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
        :containers="operation.containers"
        :operation-currency-code="operation.currency_code ?? 'USD'"
        @associated="() => fetchOne(id)"
      />

      <CreateQuoteModal
        v-model:open="showCreateQuoteModal"
        :operation-id="id"
        :operation-currency-code="operation.currency_code ?? 'USD'"
        :containers="operation.containers"
        @created="() => fetchOne(id)"
      />
      <ConvertQuoteModal v-model:open="showConvertQuoteModal" :quote="convertingQuote" :operation-id="id" :operation-currency-code="operation.currency_code ?? 'USD'" :containers="operation.containers ?? []" :refreshing="refreshingQuoteDocuments" @converted="handleQuoteConverted" />
    </template>
  </UPage>
</template>
