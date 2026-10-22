<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
definePageMeta({ middleware: ['auth'] })

import { useTreasuryObligationsService, type ObligationTemplate, type TreasuryObligation } from '~/modulos/erp/treasury-obligations/treasury-obligations.service'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useAccountsStore } from '~/modulos/contabilidad/store/accounts.store'
import { useAuthStore } from '~/modulos/auth/auth.store'

type View = 'upcoming' | 'obligations' | 'recurring' | 'reports'
type WithholdingRemittance = {
  id: string; vep_number: string; tax_type: string; tax_regime_code: string | null; period_key: string
  status: 'REGISTERED' | 'PAID'; vep_amount: number | string; currency_code: string; due_date: string | null
  paid_at: string | null; created_at: string; notes: string | null
  jurisdiction: { id: string; code: string; name: string } | null
  withholdings_count: number
  withholdings?: Array<{ id: string; date: string; tax_type: string; withheld_amount: number | string; currency_code: string; business_party: { id: string; name: string; tax_id: string | null } | null }>
  payments: Array<{ id: string; number: number; status: string; date: string }>
}
const service = useTreasuryObligationsService()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const UButtonComponent = resolveComponent('UButton')
const UBadgeComponent = resolveComponent('UBadge')
const authStore = useAuthStore()
const productsStore = useProductsStore()
const accountsStore = useAccountsStore()
const activeView = ref<View>((route.query.view as View) || 'upcoming')
const loading = ref(false)
const saving = ref(false)
const rows = ref<TreasuryObligation[]>([])
const remittances = ref<WithholdingRemittance[]>([])
const selectedRemittance = ref<WithholdingRemittance | null>(null)
const remittanceDetailOpen = ref(false)
const remittanceDetailLoading = ref(false)
const templates = ref<ObligationTemplate[]>([])
const parties = ref<any[]>([])
const summary = ref({ pending_amount: 0, pending_by_currency: {} as Record<string, number>, overdue: 0, due_soon: 0, requires_review: 0, notifications_today: 0 })
const obligationSearch = ref('')
const remittanceSearch = ref('')
const statusFilter = ref('ALL')
const categoryFilter = ref('ALL')
const modalOpen = ref(false)
const editing = ref<TreasuryObligation | null>(null)
const recurring = ref(false)
const confirmCancelOpen = ref(false)
const cancelling = ref<TreasuryObligation | null>(null)
const partyTypeByCategory: Record<string, string[]> = {
  TAX: ['TAX_AUTHORITY'],
  UTILITY: ['UTILITY'],
  SERVICE: ['SERVICE_PROVIDER'],
  FINANCIAL: ['FINANCIAL'],
  OTHER: ['TAX_AUTHORITY', 'UTILITY', 'SERVICE_PROVIDER', 'FINANCIAL']
}

const tabs = [
  { label: 'Próximos vencimientos', value: 'upcoming', icon: 'i-lucide-calendar-clock' },
  { label: 'Servicios e impuestos', value: 'obligations', icon: 'i-lucide-receipt-text' },
  { label: 'Recurrentes', value: 'recurring', icon: 'i-lucide-repeat-2' },
  { label: 'Historial y reportes', value: 'reports', icon: 'i-lucide-chart-column' }
]
const categories = [
  { label: 'Impuesto', value: 'TAX' }, { label: 'Servicio público', value: 'UTILITY' },
  { label: 'Servicio', value: 'SERVICE' }, { label: 'Financiero', value: 'FINANCIAL' },
  { label: 'Otro', value: 'OTHER' }
]
const frequencies = [
  { label: 'Mensual', value: 'MONTHLY' }, { label: 'Bimestral', value: 'BIMONTHLY' },
  { label: 'Trimestral', value: 'QUARTERLY' }, { label: 'Semestral', value: 'SEMIANNUAL' },
  { label: 'Anual', value: 'ANNUAL' }, { label: 'Personalizada', value: 'CUSTOM' }
]
const notificationOptions = [
  { label: 'Sin recordatorio', value: 'NONE' },
  { label: '15 días antes', value: '15' },
  { label: '7 días antes', value: '7' },
  { label: '3 días antes', value: '3' },
  { label: '1 día antes', value: '1' },
  { label: 'El día del vencimiento', value: '0' }
]
const treatmentOptions = [
  { label: 'Con factura fiscal', value: 'FISCAL_INVOICE' },
  { label: 'Pago directo sin factura', value: 'DIRECT_EXPENSE' }
]
const statusInfo: Record<string, { label: string; color: any }> = {
  PLANNED: { label: 'Planificada', color: 'neutral' }, REVIEW: { label: 'Revisar', color: 'warning' },
  READY: { label: 'Lista para pagar', color: 'info' }, PAID: { label: 'Pagada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'neutral' }, OVERDUE: { label: 'Vencida', color: 'error' }
}

const emptyForm = () => ({
  party_id: '', category: 'UTILITY', treatment: 'DIRECT_EXPENSE', service_product_id: '', expense_account_id: '', net_amount: null as number | null, description: '', issue_date: '', due_date: today(),
  second_due_date: '', estimated_amount: 0, amount: null as number | null, second_due_amount: null as number | null,
  currency_code: 'ARS', exchange_rate: null as number | null, reference: '', document_id: '', notes: '',
  notification_day: '7',
  name: '', frequency: 'MONTHLY', interval_months: 1, start_date: today(), end_date: '',
  occurrences: 12, due_day: new Date().getDate(), variable_amount: true
})
const form = reactive(emptyForm())
const obligationDraftKey = computed(() => `asterisk:obligation-draft:${authStore.selectedCompany?.id || 'company'}:${authStore.user?.id || 'user'}:${recurring.value ? 'recurring' : 'single'}`)
const {
  availableDraft: obligationDraft,
  restoreDraft: restoreObligationDraft,
  discardDraft: discardObligationDraft,
  completeDraft: completeObligationDraft
} = useLocalFormDraft({
  key: obligationDraftKey,
  enabled: computed(() => modalOpen.value && !editing.value),
  source: () => ({ ...form }),
  restore: draft => Object.assign(form, draft),
  isMeaningful: draft => Boolean(draft.party_id || draft.description || draft.name || Number(draft.amount) > 0)
})
const availableParties = computed(() => {
  const allowedTypes = partyTypeByCategory[form.category] ?? []
  return parties.value.filter(party => allowedTypes.includes(party.type))
})
const serviceProducts = computed(() => productsStore.items
  .filter(product => product.active !== false && product.product_type === 'SERVICE' && !product.manages_stock && ['PURCHASE', 'BOTH'].includes(product.usage_type))
  .map(product => ({ label: `${product.sku ? `${product.sku} · ` : ''}${product.name}`, value: product.id })))
const expenseAccounts = computed(() => accountsStore.activeItems
  .filter(account => account.account_type === 'EXPENSE')
  .map(account => ({ label: `${account.code} · ${account.name}`, value: account.id })))

const filteredRows = computed(() => rows.value.filter(row => {
  return (statusFilter.value === 'ALL' || row.effective_status === statusFilter.value)
    && (categoryFilter.value === 'ALL' || row.category === categoryFilter.value)
}))
const upcomingRows = computed(() => filteredRows.value.filter(row => !['PAID', 'CANCELLED'].includes(row.status)))
const reportRows = computed(() => rows.value.filter(row => row.status === 'PAID'))
const reminderRows = computed(() => rows.value.filter(row => row.should_notify))
const reportTotals = computed(() => reportRows.value.reduce<Record<string, number>>((totals, row) => {
  totals[row.currency_code] = (totals[row.currency_code] ?? 0) + Number(row.amount ?? row.estimated_amount)
  return totals
}, {}))
const filteredRemittances = computed(() => remittances.value.filter(item => {
  const term = remittanceSearch.value.trim().toLowerCase()
  const termMatches = !term || item.vep_number.toLowerCase().includes(term) || item.tax_type.toLowerCase().includes(term)
    || item.period_key.includes(term) || item.jurisdiction?.name.toLowerCase().includes(term)
  const state = item.status === 'PAID' ? 'PAID' : item.due_date && daysUntil(item.due_date) < 0 ? 'OVERDUE' : 'READY'
  return termMatches && (statusFilter.value === 'ALL' || statusFilter.value === state)
    && (categoryFilter.value === 'ALL' || categoryFilter.value === 'TAX')
}))
const payableRemittances = computed(() => filteredRemittances.value.filter(item => item.status !== 'PAID'))
const historicalRemittances = computed(() => filteredRemittances.value.filter(item => item.status === 'PAID'))
const reportTotalsWithRemittances = computed(() => historicalRemittances.value.reduce<Record<string, number>>((totals, item) => {
  totals[item.currency_code] = (totals[item.currency_code] ?? 0) + Number(item.vep_amount)
  return totals
}, { ...reportTotals.value }))
const totalOverdue = computed(() => summary.value.overdue + vepOverdueCount.value)
const pendingByCurrency = computed(() => {
  const totals = { ...summary.value.pending_by_currency }
  for (const item of remittances.value.filter(row => row.status !== 'PAID')) {
    totals[item.currency_code] = (totals[item.currency_code] ?? 0) + Number(item.vep_amount)
  }
  return totals
})
const vepOverdueCount = computed(() => remittances.value.filter(item => item.status !== 'PAID' && item.due_date && daysUntil(item.due_date) < 0).length)
const vepDueSoonCount = computed(() => remittances.value.filter(item => item.status !== 'PAID' && item.due_date && daysUntil(item.due_date) >= 0 && daysUntil(item.due_date) <= 30).length)

const fmt = (amount: number | string, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(amount) || 0)
const fmtDate = (date: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - new Date(today()).getTime()) / 86400000)
const categoryLabel = (value: string) => categories.find(item => item.value === value)?.label ?? value
const tableFilterFields: FilterField[] = [
  { id: 'description', label: 'Concepto' }, { id: 'party_name', label: 'Entidad' },
  { id: 'reference', label: 'Referencia' }, { id: 'period_key', label: 'Período' },
]
const tableSortFields: SortField[] = [
  { label: 'Vencimiento', value: 'due_date' }, { label: 'Concepto', value: 'description' },
  { label: 'Entidad', value: 'party_name' }, { label: 'Importe', value: 'amount' },
]
const remittanceFilterFields: FilterField[] = [
  { id: 'vep_number', label: 'Número de VEP' }, { id: 'tax_type', label: 'Impuesto' },
  { id: 'period_key', label: 'Período' }, { id: 'jurisdiction.name', label: 'Jurisdicción' },
]
const remittanceSortFields: SortField[] = [
  { label: 'Período', value: 'period_key' }, { label: 'Vencimiento', value: 'due_date' },
  { label: 'Importe', value: 'vep_amount' }, { label: 'Número de VEP', value: 'vep_number' },
]
const remittanceColumns: ExtendedColumn<WithholdingRemittance>[] = [
  { accessorKey: 'vep_number', header: 'VEP ARCA', meta: { label: 'VEP ARCA', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'tax_type', header: 'Impuesto', meta: { label: 'Impuesto', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'jurisdiction.name', id: 'jurisdiction.name', header: 'Jurisdicción', meta: { label: 'Jurisdicción', filter: { type: 'text', operators: ['contains', 'equals'] } }, cell: ({ row }) => row.original.jurisdiction?.name ?? 'Nacional' },
  { accessorKey: 'period_key', header: 'Período', meta: { label: 'Período', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'withholdings_count', header: 'Retenciones', meta: { label: 'Retenciones', filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } } },
  { accessorKey: 'vep_amount', header: 'Importe', meta: { label: 'Importe', filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } }, cell: ({ row }) => h('span', { class: 'font-semibold' }, fmt(row.original.vep_amount, row.original.currency_code)) },
  { accessorKey: 'due_date', header: 'Vencimiento / pago', meta: { label: 'Vencimiento / pago', filter: { type: 'date-range', operators: ['between'] } }, cell: ({ row }) => h('div', [h(UBadgeComponent, { label: row.original.status === 'PAID' ? 'Pagado' : row.original.due_date && daysUntil(row.original.due_date) < 0 ? 'Vencido' : 'Pendiente', color: row.original.status === 'PAID' ? 'success' : row.original.due_date && daysUntil(row.original.due_date) < 0 ? 'error' : 'warning', variant: 'subtle', size: 'xs' }), h('p', { class: 'mt-1 text-xs text-muted' }, row.original.status === 'PAID' ? fmtDate(row.original.paid_at || row.original.created_at) : row.original.due_date ? fmtDate(row.original.due_date) : 'Sin vencimiento')]) },
  { id: 'actions', header: 'Acciones', meta: { label: 'Acciones', filter: false, disableColumnVisibility: true }, enableHiding: false, cell: ({ row }) => h('div', { class: 'flex justify-end gap-1' }, [
    h(UButtonComponent, { label: 'Detalle', size: 'xs', variant: 'ghost', onClick: () => openRemittance(row.original) }),
    ...(row.original.status === 'PAID' ? [] : [h(UButtonComponent, { label: 'Pagar VEP', icon: 'i-lucide-hand-coins', size: 'xs', color: 'success', onClick: () => payRemittance(row.original) })]),
    ...(row.original.payments[0]?.id ? [h(UButtonComponent, { label: 'Ver pago', size: 'xs', variant: 'ghost', onClick: () => openPayment(row.original.payments[0].id) })] : []),
  ]) },
]
const obligationColumns: ExtendedColumn<TreasuryObligation>[] = [
  { accessorKey: 'description', header: 'Obligación', meta: { label: 'Obligación', filter: { type: 'text', operators: ['contains', 'equals'] } }, cell: ({ row }) => h('div', { class: 'min-w-48' }, [
    h('p', { class: 'font-medium' }, row.original.description),
    h('p', { class: 'text-xs text-muted' }, `${categoryLabel(row.original.category)} · ${row.original.treatment === 'FISCAL_INVOICE' ? 'Factura fiscal' : 'Pago directo'}${row.original.reference ? ` · ${row.original.reference}` : ''}`),
  ]) },
  { accessorKey: 'effective_status', header: 'Estado', meta: { label: 'Estado', filter: { type: 'select', options: Object.entries(statusInfo).map(([value, item]) => ({ label: item.label, value })) } }, cell: ({ row }) => h(UBadgeComponent, { label: statusInfo[row.original.effective_status]?.label ?? row.original.effective_status, color: statusInfo[row.original.effective_status]?.color ?? 'neutral', variant: 'subtle' }) },
  { accessorKey: 'party.name', id: 'party_name', header: 'Entidad', meta: { label: 'Entidad', filter: { type: 'text', operators: ['contains', 'equals'] } }, cell: ({ row }) => h('div', [h('p', { class: 'font-medium' }, row.original.party?.name ?? '—'), h('p', { class: 'text-xs text-muted' }, row.original.party?.tax_id ?? '')]) },
  { accessorKey: 'period_key', header: 'Período', meta: { label: 'Período', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'amount', header: 'Importe', meta: { label: 'Importe', filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } }, cell: ({ row }) => h('div', { class: 'text-right font-semibold' }, fmt(row.original.amount ?? row.original.estimated_amount, row.original.currency_code)) },
  { accessorKey: 'due_date', header: 'Vencimiento', meta: { label: 'Vencimiento', filter: { type: 'date-range', operators: ['between'] } }, cell: ({ row }) => h('div', [h('p', { class: row.original.effective_status === 'OVERDUE' ? 'font-medium text-error' : 'font-medium' }, fmtDate(row.original.due_date)), h('p', { class: 'text-xs text-muted' }, daysUntil(row.original.due_date) < 0 ? `Venció hace ${Math.abs(daysUntil(row.original.due_date))} días` : `Faltan ${daysUntil(row.original.due_date)} días`)]) },
  { id: 'actions', header: 'Acciones', meta: { label: 'Acciones', filter: false, disableColumnVisibility: true }, enableHiding: false, cell: ({ row }) => {
    const item = row.original
    const actions = []
    if (['PLANNED', 'REVIEW'].includes(item.status)) actions.push(h(UButtonComponent, { label: 'Revisar', size: 'xs', variant: 'soft', onClick: () => openEdit(item) }))
    if (item.treatment === 'FISCAL_INVOICE' && !item.document_id && !['PAID', 'CANCELLED'].includes(item.status)) actions.push(h(UButtonComponent, { label: 'Cargar factura', icon: 'i-lucide-file-plus-2', size: 'xs', variant: 'ghost', onClick: () => createInvoice(item) }))
    if (item.treatment === 'DIRECT_EXPENSE' && ['PLANNED', 'REVIEW'].includes(item.status)) actions.push(h(UButtonComponent, { label: 'Confirmar', size: 'xs', color: 'info', variant: 'ghost', onClick: () => confirm(item) }))
    if (item.treatment === 'DIRECT_EXPENSE' && (item.status === 'READY' || item.effective_status === 'OVERDUE')) actions.push(h(UButtonComponent, { label: 'Pagar', icon: 'i-lucide-hand-coins', size: 'xs', color: 'success', onClick: () => pay(item) }))
    if (item.document_id) actions.push(h(resolveComponent('NuxtLink'), { to: `/erp/purchases/purchases-documents/${item.document_id}`, class: 'text-xs text-primary hover:underline' }, () => 'Ver factura'))
    if (item.payment_id) actions.push(h(UButtonComponent, { label: 'Ver pago', size: 'xs', variant: 'ghost', onClick: () => openPayment(item.payment_id!) }))
    if (!['PAID', 'CANCELLED'].includes(item.status)) actions.push(h(UButtonComponent, { icon: 'i-lucide-pencil', 'aria-label': 'Editar obligación', size: 'xs', color: 'neutral', variant: 'ghost', onClick: () => openEdit(item) }))
    if (!['PAID', 'CANCELLED'].includes(item.status)) actions.push(h(UButtonComponent, { icon: 'i-lucide-ban', 'aria-label': 'Cancelar obligación', size: 'xs', color: 'error', variant: 'ghost', onClick: () => askCancel(item) }))
    return h('div', { class: 'flex min-w-40 flex-wrap justify-end gap-1' }, actions)
  } },
]

async function load() {
  loading.value = true
  try {
    const [obligations, recurringRows, summaryData, partyRows, remittanceRows] = await Promise.all([
      service.findAll(), service.templates(), service.summary(),
      $fetch<any[]>('/api/backend/master-data/business-parties'),
      $fetch<WithholdingRemittance[]>('/api/backend/fiscal/withholdings/remittances'),
      productsStore.fetchAll().catch(() => []), accountsStore.fetchAll().catch(() => [])
    ])
    rows.value = obligations
    templates.value = recurringRows
    summary.value = summaryData
    remittances.value = remittanceRows
    parties.value = partyRows.filter(party => ['TAX_AUTHORITY', 'UTILITY', 'SERVICE_PROVIDER', 'FINANCIAL'].includes(party.type) && party.active)
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar Servicios e impuestos', description: error?.data?.message || error?.message, color: 'error' })
  } finally { loading.value = false }
}

function openCreate(isRecurring = false) {
  editing.value = null
  recurring.value = isRecurring
  Object.assign(form, emptyForm())
  modalOpen.value = true
}
function openEdit(row: TreasuryObligation) {
  editing.value = row
  recurring.value = false
  Object.assign(form, emptyForm(), {
    ...row,
    issue_date: row.issue_date?.slice(0, 10) ?? '',
    due_date: row.due_date.slice(0, 10),
    second_due_date: row.second_due_date?.slice(0, 10) ?? '',
    amount: Number(row.amount ?? row.estimated_amount),
    estimated_amount: Number(row.estimated_amount),
    notification_day: row.notification_days?.length ? String(row.notification_days[0]) : 'NONE'
  })
  modalOpen.value = true
}
async function save() {
  if (!form.party_id || (recurring.value ? !form.name || !form.start_date : !form.description || !form.due_date)) {
    toast.add({ title: 'Completá entidad, descripción y vencimiento', color: 'warning' }); return
  }
  if (form.treatment === 'FISCAL_INVOICE' && !form.service_product_id) {
    toast.add({ title: 'Seleccioná el concepto de servicio', color: 'warning' }); return
  }
  if (form.treatment === 'DIRECT_EXPENSE' && !form.expense_account_id) {
    toast.add({ title: 'Seleccioná la cuenta de gasto', color: 'warning' }); return
  }
  if (!recurring.value && Number(form.amount) <= 0) {
    toast.add({ title: 'Ingresá el monto a pagar', color: 'warning' }); return
  }
  saving.value = true
  try {
    if (recurring.value) {
      await service.createTemplate({
        name: form.name || form.description, party_id: form.party_id, category: form.category,
        frequency: form.frequency, interval_months: Number(form.interval_months),
        start_date: form.start_date, end_date: form.end_date || undefined,
        occurrences: form.end_date ? undefined : Number(form.occurrences), due_day: Number(form.due_day),
        estimated_amount: Number(form.estimated_amount), currency_code: form.currency_code,
        net_amount: form.net_amount == null ? undefined : Number(form.net_amount),
        variable_amount: form.variable_amount, treatment: form.treatment,
        service_product_id: form.treatment === 'FISCAL_INVOICE' ? form.service_product_id : undefined,
        expense_account_id: form.treatment === 'DIRECT_EXPENSE' ? form.expense_account_id : undefined,
        notification_days: form.notification_day === 'NONE' ? [] : [Number(form.notification_day)],
        description: form.notes || undefined
      })
    } else {
      const payload = {
        party_id: form.party_id, category: form.category, treatment: form.treatment,
        service_product_id: form.treatment === 'FISCAL_INVOICE' ? form.service_product_id : undefined,
        expense_account_id: form.treatment === 'DIRECT_EXPENSE' ? form.expense_account_id : undefined,
        net_amount: form.net_amount == null ? undefined : Number(form.net_amount), description: form.description,
        issue_date: form.issue_date || undefined, due_date: form.due_date,
        second_due_date: form.second_due_date || undefined, estimated_amount: Number(form.amount),
        amount: form.amount == null ? undefined : Number(form.amount),
        second_due_amount: form.second_due_amount == null ? undefined : Number(form.second_due_amount),
        currency_code: form.currency_code, exchange_rate: form.exchange_rate || undefined,
        reference: form.reference || undefined, document_id: form.document_id || undefined,
        notes: form.notes || undefined, notification_days: form.notification_day === 'NONE' ? [] : [Number(form.notification_day)]
      }
      editing.value ? await service.update(editing.value.id, payload) : await service.create(payload)
    }
    if (!editing.value) completeObligationDraft()
    modalOpen.value = false
    toast.add({ title: recurring.value ? 'Recurrencia y períodos creados' : 'Obligación guardada', color: 'success' })
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally { saving.value = false }
}
async function confirm(row: TreasuryObligation) {
  try { await service.confirm(row.id); toast.add({ title: 'Obligación lista para pagar', color: 'success' }); await load() }
  catch (error: any) { toast.add({ title: 'No se pudo confirmar', description: error?.data?.message, color: 'error' }) }
}
function pay(row: TreasuryObligation) {
  const amount = Number(row.amount ?? row.estimated_amount)
  router.push({ path: '/erp/treasury/payments/create', query: {
    type: 'PAYMENT', party_id: row.party_id, obligation_id: row.id, amount,
    currency: row.currency_code, description: row.description, account_id: row.expense_account_id || undefined
  } })
}
function payRemittance(row: WithholdingRemittance) {
  remittanceDetailOpen.value = false
  router.push({ path: '/erp/treasury/payments/create', query: {
    type: 'PAYMENT', withholding_remittance_id: row.id, amount: String(Number(row.vep_amount)),
    currency: row.currency_code, description: `Pago VEP ARCA ${row.vep_number}`
  } })
}
async function openRemittance(row: WithholdingRemittance) {
  selectedRemittance.value = row
  remittanceDetailOpen.value = true
  remittanceDetailLoading.value = true
  try {
    selectedRemittance.value = await $fetch<WithholdingRemittance>(`/api/backend/fiscal/withholdings/remittances/${row.id}`)
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar el detalle del VEP', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    remittanceDetailLoading.value = false
  }
}
function createInvoice(row: TreasuryObligation) {
  router.push({ path: '/erp/purchases/purchases-documents/new', query: {
    category: 'INVOICE', party_id: row.party_id, obligation_id: row.id,
    product_id: row.service_product_id || undefined,
    unit_price: row.net_amount ?? row.estimated_amount,
    currency: row.currency_code,
    description: row.description
  } })
}
function openPayment(paymentId: string) { void router.push(`/erp/treasury/payments/${paymentId}`) }
function closeModal() { modalOpen.value = false }
function closeCancelModal() { confirmCancelOpen.value = false }
function askCancel(row: TreasuryObligation) { cancelling.value = row; confirmCancelOpen.value = true }
async function cancel() {
  if (!cancelling.value) return
  await service.cancel(cancelling.value.id)
  confirmCancelOpen.value = false
  await load()
}
async function toggleTemplate(template: ObligationTemplate) {
  await service.toggleTemplate(template.id, !template.active)
  await load()
}

watch(activeView, value => router.replace({ query: { view: value } }))
watch(() => form.category, () => {
  if (form.party_id && !availableParties.value.some(party => party.id === form.party_id)) form.party_id = ''
})
onMounted(load)
</script>

<template>
  <UPage class="space-y-5 px-4 pb-8">
    <AppPageHeader title="Servicios e impuestos" description="Planificá vencimientos, revisá importes y registrá los pagos desde un solo lugar.">
      <template #links>
        <UButton label="Nueva obligación" icon="i-lucide-plus" variant="outline" @click="openCreate(false)" />
        <UButton label="Nueva recurrencia" icon="i-lucide-repeat-2" @click="openCreate(true)" />
      </template>
    </AppPageHeader>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UPageCard variant="subtle"><p class="text-xs text-muted">Pendiente estimado (incluye VEP)</p><div class="mt-1 flex flex-wrap gap-x-3"><p v-for="(amount, currency) in pendingByCurrency" :key="currency" class="text-xl font-semibold">{{ fmt(amount, currency) }}</p><p v-if="!Object.keys(pendingByCurrency).length" class="text-xl font-semibold">{{ fmt(0) }}</p></div></UPageCard>
      <UPageCard variant="subtle"><p class="text-xs text-muted">Vencidas</p><p class="mt-1 text-xl font-semibold text-error">{{ summary.overdue + vepOverdueCount }}</p></UPageCard>
      <UPageCard variant="subtle"><p class="text-xs text-muted">Próximos 30 días</p><p class="mt-1 text-xl font-semibold text-warning">{{ summary.due_soon + vepDueSoonCount }}</p></UPageCard>
      <UPageCard variant="subtle"><p class="text-xs text-muted">Requieren revisión</p><p class="mt-1 text-xl font-semibold text-info">{{ summary.requires_review }}</p></UPageCard>
    </div>

    <UAlert v-if="totalOverdue" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="`${totalOverdue} obligación(es) o VEP vencido(s)`" description="Revisá el importe y registrá el pago o cancelá el período si no corresponde." />
    <UAlert v-else-if="reminderRows.length" color="warning" variant="subtle" icon="i-lucide-bell-ring" :title="`${reminderRows.length} vencimiento(s) requieren atención hoy`" description="Los avisos respetan la anticipación configurada en cada obligación." />
    <UTabs v-model="activeView" :items="tabs" :content="false" variant="link" class="w-full" />

    <template v-if="activeView === 'upcoming' || activeView === 'obligations'">
      <UPageCard>
        <div class="grid gap-3 md:grid-cols-[190px_190px_auto]">
          <USelect v-model="statusFilter" :items="[{ label: 'Todos los estados', value: 'ALL' }, ...Object.entries(statusInfo).map(([value, item]) => ({ label: item.label, value }))]" />
          <USelect v-model="categoryFilter" :items="[{ label: 'Todas las categorías', value: 'ALL' }, ...categories]" />
          <UButton label="Actualizar" icon="i-lucide-refresh-cw" variant="outline" :loading="loading" @click="load" />
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <template #header><div class="flex flex-wrap items-center justify-between gap-2"><div><h3 class="font-semibold">VEP de retenciones</h3><p class="text-sm text-muted">Importes registrados desde Retenciones; se muestran acá sin duplicar la obligación.</p></div><UBadge :label="`${payableRemittances.length} pendiente(s)`" color="warning" variant="subtle" /></div></template>
        <AsteriskTable v-if="payableRemittances.length" v-model:search="remittanceSearch" compact storage-key="treasury-services-vep-pending" :data="payableRemittances" :columns="remittanceColumns" :filter-fields="remittanceFilterFields" :sort-fields="remittanceSortFields" search-placeholder="Buscar VEP, impuesto o período..." />
        <p v-else class="py-5 text-center text-sm text-muted">No hay VEP pendientes para estos filtros.</p>
      </UPageCard>

      <UPageCard variant="subtle" class="min-w-0 overflow-hidden">
        <template #header><div><h3 class="font-semibold">Obligaciones registradas</h3><p class="text-xs text-muted">La tabla permite buscar, ordenar, filtrar columnas, elegir qué datos ver y paginar.</p></div></template>
        <div v-if="loading" class="py-8 text-center"><ULoader /></div>
        <AsteriskTable v-else-if="(activeView === 'upcoming' ? upcomingRows : filteredRows).length" v-model:search="obligationSearch" compact storage-key="treasury-services-obligations" :data="activeView === 'upcoming' ? upcomingRows : filteredRows" :columns="obligationColumns" :filter-fields="tableFilterFields" :sort-fields="tableSortFields" search-placeholder="Buscar entidad, referencia o concepto..." />
        <p v-else class="py-8 text-center text-sm text-muted">No hay obligaciones para mostrar con estos filtros.</p>
      </UPageCard>
    </template>

    <template v-else-if="activeView === 'recurring'">
      <div class="grid gap-4 lg:grid-cols-2">
        <UPageCard v-for="template in templates" :key="template.id" variant="subtle">
          <div class="flex items-start justify-between gap-4"><div><div class="flex items-center gap-2"><h3 class="font-semibold">{{ template.name }}</h3><UBadge :label="template.active ? 'Activa' : 'Pausada'" :color="template.active ? 'success' : 'neutral'" variant="subtle" /></div><p class="mt-1 text-sm text-muted">{{ template.party?.name }} · {{ categoryLabel(template.category) }}</p></div><USwitch :model-value="template.active" @update:model-value="toggleTemplate(template)" /></div>
          <div class="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p class="text-xs text-muted">Frecuencia</p><p class="font-medium">{{ frequencies.find(item => item.value === template.frequency)?.label }}</p></div><div><p class="text-xs text-muted">Importe</p><p class="font-medium">{{ fmt(template.estimated_amount, template.currency_code) }}</p></div><div><p class="text-xs text-muted">Períodos</p><p class="font-medium">{{ template._count?.obligations ?? 0 }}</p></div></div>
          <p v-if="template.variable_amount" class="mt-3 text-xs text-warning">Cada período requiere revisar el importe antes de pagarlo.</p>
        </UPageCard>
        <UButton v-if="!templates.length" label="Crear primera recurrencia" icon="i-lucide-plus" class="w-fit" @click="openCreate(true)" />
      </div>
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-3"><UPageCard variant="subtle"><p class="text-xs text-muted">Total pagado (obligaciones y VEP)</p><div class="flex flex-wrap gap-x-3"><p v-for="(amount, currency) in reportTotalsWithRemittances" :key="currency" class="text-xl font-semibold">{{ fmt(amount, currency) }}</p><p v-if="!Object.keys(reportTotalsWithRemittances).length" class="text-xl font-semibold">{{ fmt(0) }}</p></div></UPageCard><UPageCard variant="subtle"><p class="text-xs text-muted">Pagos registrados</p><p class="text-xl font-semibold">{{ reportRows.length + historicalRemittances.length }}</p></UPageCard><UPageCard variant="subtle"><p class="text-xs text-muted">Recurrentes activas</p><p class="text-xl font-semibold">{{ templates.filter(item => item.active).length }}</p></UPageCard></div>
      <UPageCard><template #header><h3 class="font-semibold">Historial de VEP pagados</h3></template><AsteriskTable v-if="historicalRemittances.length" v-model:search="remittanceSearch" compact storage-key="treasury-services-vep-history" :data="historicalRemittances" :columns="remittanceColumns" :filter-fields="remittanceFilterFields" :sort-fields="remittanceSortFields" search-placeholder="Buscar VEP, impuesto o período..." /><p v-else class="py-6 text-center text-sm text-muted">Todavía no hay VEP pagados.</p></UPageCard>
      <UPageCard><template #header><h3 class="font-semibold">Historial pagado</h3></template><div class="divide-y divide-default"><div v-for="row in reportRows" :key="row.id" class="flex items-center gap-4 py-3"><div class="min-w-0 flex-1"><p class="truncate font-medium">{{ row.description }}</p><p class="text-xs text-muted">{{ row.party?.name }} · {{ fmtDate(row.paid_at || row.due_date) }}</p></div><strong>{{ fmt(row.amount ?? row.estimated_amount, row.currency_code) }}</strong><UButton v-if="row.payment_id" label="Pago" variant="ghost" size="xs" @click="openPayment(row.payment_id)" /></div><p v-if="!reportRows.length" class="py-8 text-center text-sm text-muted">Todavía no hay obligaciones pagadas.</p></div></UPageCard>
    </template>

    <UModal v-model:open="remittanceDetailOpen" :title="selectedRemittance ? `VEP ARCA ${selectedRemittance.vep_number}` : 'Detalle del VEP'" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body><div v-if="selectedRemittance" class="space-y-4"><div class="grid gap-3 sm:grid-cols-3"><div><p class="text-xs text-muted">Impuesto / período</p><p class="font-medium">{{ selectedRemittance.tax_type }} · {{ selectedRemittance.period_key }}</p></div><div><p class="text-xs text-muted">Jurisdicción</p><p class="font-medium">{{ selectedRemittance.jurisdiction?.name || 'Nacional' }}</p></div><div><p class="text-xs text-muted">Importe VEP</p><p class="font-semibold">{{ fmt(selectedRemittance.vep_amount, selectedRemittance.currency_code) }}</p></div></div><div v-if="remittanceDetailLoading" class="py-6 text-center"><ULoader /></div><div v-else class="max-h-96 overflow-y-auto rounded-lg border border-default"><div v-for="withholding in selectedRemittance.withholdings || []" :key="withholding.id" class="flex justify-between gap-4 border-b border-default px-3 py-2 last:border-0"><div><p class="text-sm font-medium">{{ withholding.business_party?.name || 'Sujeto retenido' }}</p><p class="text-xs text-muted">{{ withholding.tax_type }} · {{ fmtDate(withholding.date) }}<span v-if="withholding.business_party?.tax_id"> · CUIT {{ withholding.business_party.tax_id }}</span></p></div><strong class="text-sm">{{ fmt(withholding.withheld_amount, withholding.currency_code) }}</strong></div><p v-if="!selectedRemittance.withholdings?.length" class="p-4 text-center text-sm text-muted">Este VEP no tiene retenciones asociadas.</p></div><div class="flex justify-end gap-2"><UButton label="Cerrar" variant="ghost" @click="remittanceDetailOpen = false" /><UButton v-if="selectedRemittance.status !== 'PAID'" label="Pagar VEP" icon="i-lucide-hand-coins" color="success" @click="payRemittance(selectedRemittance)" /></div></div></template>
    </UModal>

    <UModal v-model:open="modalOpen" :title="recurring ? 'Nueva recurrencia' : editing ? 'Revisar obligación' : 'Nueva obligación'" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body><div class="space-y-5">
        <UAlert v-if="obligationDraft" color="warning" variant="subtle" title="Encontramos una obligación sin terminar" description="Podés recuperar los datos guardados en este dispositivo.">
          <template #actions><div class="flex gap-2"><UButton label="Recuperar" size="xs" @click="restoreObligationDraft" /><UButton label="Descartar" size="xs" color="neutral" variant="outline" @click="discardObligationDraft" /></div></template>
        </UAlert>
        <div class="rounded-xl border border-default bg-elevated/20 p-4 space-y-4">
          <div><p class="font-medium">Datos principales</p><p class="text-xs text-muted">Definí qué obligación vas a registrar y a quién corresponde.</p></div>
          <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Parte interesada" required><USelectMenu v-model="form.party_id" value-key="id" label-key="name" :items="availableParties" searchable class="w-full" placeholder="Seleccionar parte interesada" /></UFormField>
          <UFormField label="Categoría" required><USelect v-model="form.category" :items="categories" class="w-full" /></UFormField>
          </div>
          <UFormField v-if="!recurring" label="Concepto" required><UInput v-model="form.description" placeholder="Ej. Electricidad de octubre" class="w-full" /></UFormField>
        </div>
        <div class="rounded-xl border border-default p-4 space-y-4">
          <div><p class="font-medium">Forma de registración</p><p class="text-xs text-muted">Elegí si existe un comprobante fiscal o si se registra directamente como gasto.</p></div>
          <UFormField label="Tratamiento"><USelect v-model="form.treatment" :items="treatmentOptions" class="w-full" /></UFormField>
          <div v-if="form.treatment === 'FISCAL_INVOICE'" class="grid gap-4 md:grid-cols-2">
            <UFormField label="Concepto de servicio" required description="Solo servicios de compra que no manejan stock."><USelectMenu v-model="form.service_product_id" :items="serviceProducts" value-key="value" searchable class="w-full" placeholder="Seleccionar servicio" /></UFormField>
            <UFormField :label="recurring ? 'Neto estimado' : 'Neto del comprobante'" description="La factura calculará IVA y otros impuestos con el motor fiscal."><UInput v-model.number="form.net_amount" type="number" min="0" step="0.01" class="w-full" /></UFormField>
          </div>
          <UFormField v-else label="Cuenta de gasto" required description="Se usa para el pago directo, que no genera IVA crédito fiscal."><USelectMenu v-model="form.expense_account_id" :items="expenseAccounts" value-key="value" searchable class="w-full" placeholder="Seleccionar cuenta contable" /></UFormField>
        </div>
        <template v-if="recurring">
          <UFormField label="Nombre de la recurrencia" required><UInput v-model="form.name" placeholder="Ej. Municipalidad de Córdoba" class="w-full" /></UFormField>
          <div class="grid gap-4 md:grid-cols-3"><UFormField label="Frecuencia"><USelect v-model="form.frequency" :items="frequencies" class="w-full" /></UFormField><UFormField v-if="form.frequency === 'CUSTOM'" label="Cada cuántos meses"><UInput v-model.number="form.interval_months" type="number" min="1" /></UFormField><UFormField label="Día de vencimiento"><UInput v-model.number="form.due_day" type="number" min="1" max="31" /></UFormField></div>
          <div class="grid gap-4 md:grid-cols-3"><UFormField label="Comienza"><UInput v-model="form.start_date" type="date" class="w-full" /></UFormField><UFormField label="Cantidad de períodos"><UInput v-model.number="form.occurrences" type="number" min="1" max="120" /></UFormField><UFormField label="Finaliza (opcional)"><UInput v-model="form.end_date" type="date" class="w-full" /></UFormField></div>
          <div class="rounded-xl border border-default p-4"><div class="flex items-center justify-between"><div><p class="font-medium">Importe variable</p><p class="text-xs text-muted">Cada período deberá revisarse antes de quedar listo para pagar.</p></div><USwitch v-model="form.variable_amount" /></div></div>
        </template>
        <div class="rounded-xl border border-default p-4 space-y-4">
          <div><p class="font-medium">Importe y vencimiento</p><p class="text-xs text-muted">{{ recurring ? 'Definí el importe de referencia para los períodos futuros.' : 'Ingresá el total que figura en la obligación.' }}</p></div>
          <div class="grid gap-4 md:grid-cols-2"><UFormField v-if="recurring" label="Importe estimado" required><UInput v-model.number="form.estimated_amount" type="number" min="0" step="0.01" class="w-full" /></UFormField><UFormField v-else label="Monto a pagar" required><UInput v-model.number="form.amount" type="number" min="0" step="0.01" class="w-full" /></UFormField><UFormField label="Moneda"><USelect v-model="form.currency_code" :items="[{label:'Peso argentino',value:'ARS'},{label:'Dólar estadounidense',value:'USD'}]" class="w-full" /></UFormField></div>
        <template v-if="!recurring">
          <div class="grid gap-4 md:grid-cols-3"><UFormField label="Emisión"><UInput v-model="form.issue_date" type="date" class="w-full" /></UFormField><UFormField label="Primer vencimiento" required><UInput v-model="form.due_date" type="date" class="w-full" /></UFormField><UFormField label="Segundo vencimiento"><UInput v-model="form.second_due_date" type="date" class="w-full" /></UFormField></div>
          <div class="grid gap-4 md:grid-cols-2"><UFormField label="Referencia / boleta"><UInput v-model="form.reference" class="w-full" /></UFormField><UFormField label="Importe al segundo vencimiento"><UInput v-model.number="form.second_due_amount" type="number" min="0" step="0.01" class="w-full" /></UFormField></div>
        </template>
        </div>
        <UFormField label="Recordatorio" description="Elegí con cuánta anticipación querés recibir el aviso.">
          <USelect
            v-model="form.notification_day"
            :items="notificationOptions"
            class="w-full"
            placeholder="Seleccionar cuándo avisar"
          />
        </UFormField>
        <UFormField label="Observaciones"><UTextarea v-model="form.notes" class="w-full" /></UFormField>
        <div class="flex justify-end gap-2"><UButton label="Cancelar" variant="ghost" @click="closeModal" /><UButton :label="recurring ? 'Crear períodos' : 'Guardar obligación'" :loading="saving" @click="save" /></div>
      </div></template>
    </UModal>

    <UModal v-model:open="confirmCancelOpen" title="Cancelar obligación"><template #body><p>El período quedará cancelado y dejará de aparecer entre los vencimientos pendientes.</p><p class="mt-2 font-medium">{{ cancelling?.description }}</p><div class="flex justify-end gap-2 pt-5"><UButton label="Volver" variant="ghost" @click="closeCancelModal" /><UButton label="Cancelar obligación" color="error" @click="cancel" /></div></template></UModal>
  </UPage>
</template>
