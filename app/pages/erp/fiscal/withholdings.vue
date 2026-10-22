<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { formatDate } from '~/utils/dates'

definePageMeta({ layout: 'default', middleware: ['auth'] })

interface WithholdingRow {
  id: string
  direction: 'PRACTICADA' | 'SUFRIDA'
  tax_type: string
  withheld_amount: string | number
  base_amount: string | number
  rate: string | number | null
  currency_code: string
  date: string
  status: string
  certificate_number: string | null
  business_party?: { id: string; name: string; tax_id: string | null } | null
  jurisdiction?: { id: string; code: string; name: string } | null
  payment?: { id: string; number: number; type: string; date: string } | null
  remittance?: { id: string; vep_number: string; tax_regime_code: string | null; period_key: string; status: string; vep_amount: string | number; currency_code: string; due_date: string | null; paid_at: string | null } | null
  tax_applications?: WithholdingTaxApplication[]
}

interface WithholdingTaxApplication {
  id: string
  tax_type: string
  tax_period: string
  application_date: string
  amount: string | number
  declaration_reference: string | null
  notes: string | null
  status: 'APPLIED' | 'REVERSED'
  reversed_at: string | null
  reversal_reason: string | null
}

interface WithholdingTableRow extends Record<string, any> {
  id: string
  date: string
  date_display: string
  party_display: string
  tax_type: string
  jurisdiction_display: string
  base_display: string
  rate_display: string
  amount_display: string
  certificate_number: string
  payment_display: string
  status_display: string
  period_display: string
  count: number
  vep_status: string
  vep_action: string
}

interface WithholdingGroupRow extends Record<string, any> {
  id: string
  tax_type: string
  jurisdiction_display: string
  period_display: string
  count: number
  amount_display: string
  vep_status: string
}

const route = useRoute()
const toast = useToast()
const activeView = ref<'payable' | 'paid' | 'suffered'>(route.query.view === 'suffered' ? 'suffered' : route.query.view === 'paid' ? 'paid' : 'payable')
const items = ref<WithholdingRow[]>([])
const loading = ref(false)
const remittanceModalOpen = ref(false)
const savingRemittance = ref(false)
const selectedIds = ref<string[]>([])
const vepNumber = ref('')
const vepAmount = ref(0)
const vepAmountEdited = ref(false)
const regimeCode = ref('')
const dueDate = ref('')
const taxApplicationModalOpen = ref(false)
const savingTaxApplication = ref(false)
const selectedWithholding = ref<WithholdingRow | null>(null)
const taxApplicationAmount = ref<number | null>(null)
const taxApplicationPeriod = ref('')
const taxApplicationDate = ref('')
const taxApplicationReference = ref('')
const taxApplicationNotes = ref('')
const reverseApplicationModalOpen = ref(false)
const savingReverseApplication = ref(false)
const applicationToReverse = ref<WithholdingTaxApplication | null>(null)
const reversalReason = ref('')
const tabs = [
  { label: 'A depositar', value: 'payable', icon: 'i-lucide-landmark' },
  { label: 'VEP pagados', value: 'paid', icon: 'i-lucide-circle-check' },
  { label: 'Sufridas', value: 'suffered', icon: 'i-lucide-hand-coins' },
]
const taxTypeOptions = ['GANANCIAS', 'IIBB', 'SUSS', 'IVA']
const UBadgeComponent = resolveComponent('UBadge')
const UButtonComponent = resolveComponent('UButton')

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const n = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n)
  } catch {
    return `${currency} ${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  }
}

const periodKey = (date: string) => String(date).slice(0, 7)
const periodLabel = (key: string) => {
  if (!/^\d{4}-\d{2}$/.test(key)) return key || 'Sin período'
  const date = new Date(`${key}-01T00:00:00Z`)
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

const fetchWithholdings = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ items: WithholdingRow[] }>('/api/backend/fiscal/withholdings')
    items.value = res.items
  } catch (e: any) {
    console.error('Error cargando retenciones:', e)
    toast.add({ title: 'Error cargando retenciones', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const payableItems = computed(() => items.value.filter(item =>
  item.direction === 'PRACTICADA' && ['APPLIED', 'CERTIFIED'].includes(item.status) && item.remittance?.status !== 'PAID'
))
const paidItems = computed(() => items.value.filter(item => item.direction === 'PRACTICADA' && item.remittance?.status === 'PAID'))
const eligibleItems = computed(() => payableItems.value.filter(item => !item.remittance))
const sufferedItems = computed(() => items.value.filter(item =>
  item.direction === 'SUFRIDA' && ['APPLIED', 'CERTIFIED'].includes(item.status)
))

const toDetailRow = (item: WithholdingRow): WithholdingTableRow => ({
  id: item.id,
  date: item.date,
  date_display: formatDate(item.date),
  party_display: item.business_party?.name ?? '—',
  tax_type: item.tax_type,
  jurisdiction_display: item.jurisdiction?.name ?? 'Nacional / sin jurisdicción',
  base_display: formatCurrency(item.base_amount, item.currency_code),
  rate_display: item.rate == null ? '—' : `${Number(item.rate)}%`,
  amount_display: formatCurrency(item.withheld_amount, item.currency_code),
  certificate_number: item.certificate_number ?? '—',
  payment_display: item.payment ? `Pago #${item.payment.number}` : '—',
  status_display: item.status === 'CERTIFIED' ? 'Certificada' : 'Aplicada',
  period_display: periodLabel(periodKey(item.date)),
  count: 1,
  vep_status: item.remittance ? `VEP ${item.remittance.vep_number} · ${item.remittance.status === 'PAID' ? 'Pagado' : 'Pendiente de pago'}` : 'Pendiente de asociar VEP',
  vep_action: item.remittance?.status === 'REGISTERED' ? item.remittance.id : '',
})

const payableGroups = computed<WithholdingGroupRow[]>(() => {
  const groups = new Map<string, { tax_type: string; jurisdiction: string; period: string; currency: string; count: number; amount: number }>()
  for (const item of eligibleItems.value) {
    const period = periodKey(item.date)
    const jurisdiction = item.jurisdiction?.name ?? 'Nacional / sin jurisdicción'
    const currency = item.currency_code || 'ARS'
    const key = [item.tax_type, jurisdiction, period, currency].join('|')
    const group = groups.get(key) ?? { tax_type: item.tax_type, jurisdiction, period, currency, count: 0, amount: 0 }
    group.count += 1
    group.amount += Number(item.withheld_amount || 0)
    groups.set(key, group)
  }
  return [...groups.entries()].map(([id, group]) => ({
    id,
    tax_type: group.tax_type,
    jurisdiction_display: group.jurisdiction,
    period_display: periodLabel(group.period),
    count: group.count,
    amount_display: formatCurrency(group.amount, group.currency),
    vep_status: 'Pendiente de asociar VEP',
  })).sort((a, b) => a.period_display.localeCompare(b.period_display) || a.tax_type.localeCompare(b.tax_type))
})

const payableTotal = computed(() => {
  const remittances = new Map<string, number>()
  let unassociated = 0
  for (const item of payableItems.value) {
    if (item.remittance) remittances.set(item.remittance.id, Number(item.remittance.vep_amount))
    else unassociated += Number(item.withheld_amount || 0)
  }
  return [...remittances.values()].reduce((sum, amount) => sum + amount, unassociated)
})
const sufferedTotal = computed(() => sufferedItems.value.reduce((sum, item) => sum + Number(item.withheld_amount || 0), 0))
const taxAppliedTotal = (item: WithholdingRow) => (item.tax_applications ?? [])
  .filter(application => application.status === 'APPLIED')
  .reduce((sum, application) => sum + Number(application.amount || 0), 0)
const taxCreditAvailable = (item: WithholdingRow) => Math.max(0, Number(item.withheld_amount || 0) - taxAppliedTotal(item))
const sufferedAppliedTotal = computed(() => sufferedItems.value.reduce((sum, item) => sum + taxAppliedTotal(item), 0))
const sufferedAvailableTotal = computed(() => sufferedItems.value.reduce((sum, item) => sum + taxCreditAvailable(item), 0))
const taxApplicationCanSubmit = computed(() => {
  const item = selectedWithholding.value
  const amount = Number(taxApplicationAmount.value)
  return Boolean(item && Number.isFinite(amount) && amount > 0 && amount <= taxCreditAvailable(item) + 0.001 && taxApplicationPeriod.value && taxApplicationDate.value)
})

const detailColumns: ExtendedColumn<WithholdingTableRow>[] = [
  { accessorKey: 'date', header: 'Fecha', meta: { label: 'Fecha', filter: { type: 'date-range', operators: ['between'] } }, cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'party_display', header: 'Tercero', meta: { label: 'Tercero', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'tax_type', header: 'Impuesto', meta: { label: 'Impuesto', filter: { type: 'select', options: taxTypeOptions.map(value => ({ label: value, value })) } } },
  { accessorKey: 'jurisdiction_display', header: 'Jurisdicción', meta: { label: 'Jurisdicción', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'base_display', header: 'Base', meta: { label: 'Base', filter: false } },
  { accessorKey: 'rate_display', header: 'Alícuota', meta: { label: 'Alícuota', filter: false } },
  { accessorKey: 'amount_display', header: 'Retención', meta: { label: 'Retención', filter: false } },
  { accessorKey: 'certificate_number', header: 'Certificado', meta: { label: 'Certificado', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'payment_display', header: 'Pago / cobro', meta: { label: 'Pago / cobro', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  {
    accessorKey: 'status_display', header: 'Estado', meta: { label: 'Estado', filter: { type: 'select', options: ['Aplicada', 'Certificada'].map(value => ({ label: value, value })) } },
    cell: ({ row }) => h(UBadgeComponent, { label: row.original.status_display, color: row.original.status_display === 'Certificada' ? 'success' : 'neutral', variant: 'subtle', size: 'xs' }),
  },
  {
    accessorKey: 'vep_status', header: 'VEP', meta: { label: 'VEP', filter: { type: 'text', operators: ['contains', 'equals'] } },
    cell: ({ row }) => h(UBadgeComponent, { label: row.original.vep_status, color: row.original.vep_status.includes('Pagado') ? 'success' : row.original.vep_status.includes('Pendiente de pago') ? 'warning' : 'neutral', variant: 'subtle', size: 'xs' }),
  },
  {
    accessorKey: 'vep_action', header: 'Acción', meta: { label: 'Acción', filter: false },
    cell: ({ row }) => row.original.vep_action ? h(resolveComponent('NuxtLink'), {
      to: { path: '/erp/treasury/payments/create', query: { type: 'PAYMENT', withholding_remittance_id: row.original.vep_action,
        amount: String(Number(items.value.find(item => item.remittance?.id === row.original.vep_action)?.remittance?.vep_amount ?? 0)),
        currency: items.value.find(item => item.remittance?.id === row.original.vep_action)?.remittance?.currency_code ?? 'ARS',
        description: `Pago VEP ${items.value.find(item => item.remittance?.id === row.original.vep_action)?.remittance?.vep_number ?? ''}` } },
      class: 'text-primary hover:underline',
    }, 'Pagar VEP') : '—',
  },
]

const groupColumns: ExtendedColumn<WithholdingGroupRow>[] = [
  { accessorKey: 'tax_type', header: 'Impuesto', meta: { label: 'Impuesto', filter: { type: 'select', options: taxTypeOptions.map(value => ({ label: value, value })) } } },
  { accessorKey: 'jurisdiction_display', header: 'Jurisdicción', meta: { label: 'Jurisdicción', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'period_display', header: 'Período', meta: { label: 'Período', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'count', header: 'Retenciones', meta: { label: 'Retenciones', filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } } },
  { accessorKey: 'amount_display', header: 'Total', meta: { label: 'Total', filter: false } },
  {
    accessorKey: 'vep_status', header: 'VEP', meta: { label: 'VEP', filter: { type: 'text', operators: ['contains', 'equals'] } },
    cell: ({ row }) => h(UBadgeComponent, { label: row.original.vep_status, color: 'warning', variant: 'subtle', size: 'xs' }),
  },
]

const detailFilterFields: FilterField[] = [
  { id: 'party_display', label: 'Tercero' },
  { id: 'tax_type', label: 'Impuesto' },
  { id: 'jurisdiction_display', label: 'Jurisdicción' },
  { id: 'payment_display', label: 'Pago o cobro' },
]
const detailSortFields: SortField[] = [
  { label: 'Fecha', value: 'date' },
  { label: 'Tercero', value: 'party_display' },
  { label: 'Importe', value: 'amount_display' },
]

const sufferedRows = computed(() => sufferedItems.value.map(item => ({
  ...toDetailRow(item),
  applied_display: formatCurrency(taxAppliedTotal(item), item.currency_code),
  available_display: formatCurrency(taxCreditAvailable(item), item.currency_code),
  available_amount: taxCreditAvailable(item),
  applications_display: (item.tax_applications ?? []).length
    ? (item.tax_applications ?? []).map(application => `${application.tax_period} · ${formatCurrency(application.amount, item.currency_code)} · ${application.status === 'APPLIED' ? 'Imputada' : 'Revertida'}${application.declaration_reference ? ` · ${application.declaration_reference}` : ''}`).join(' | ')
    : 'Sin imputaciones',
})))
const sufferedColumns: ExtendedColumn<WithholdingTableRow>[] = [
  ...detailColumns.slice(0, 9),
  { accessorKey: 'applied_display', header: 'Imputado', meta: { label: 'Imputado', filter: false } },
  { accessorKey: 'available_display', header: 'Disponible', meta: { label: 'Disponible', filter: false } },
  { accessorKey: 'applications_display', header: 'Imputaciones', meta: { label: 'Imputaciones', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  {
    accessorKey: 'action', header: 'Acción', meta: { label: 'Acción', filter: false },
    cell: ({ row }) => h(UButtonComponent, {
      label: row.original.available_amount > 0 ? 'Imputar' : 'Ver',
      icon: 'i-lucide-clipboard-check', size: 'xs', variant: 'outline',
      onClick: () => openTaxApplicationModal(sufferedItems.value.find(item => item.id === row.original.id)),
    }),
  },
]

watch(activeView, view => {
  void navigateTo({ query: { ...route.query, view: view === 'payable' ? undefined : view } }, { replace: true })
})

// UCheckbox is a single boolean control; keep the collection ourselves instead
// of binding an array to its v-model (which can replace the array with a boolean).
const selectedIdSet = computed(() => new Set(Array.isArray(selectedIds.value) ? selectedIds.value : []))
const selectedItems = computed(() => eligibleItems.value.filter(item => selectedIdSet.value.has(item.id)))
const selectedTotal = computed(() => selectedItems.value.reduce((sum, item) => sum + Number(item.withheld_amount || 0), 0))
const selectedCurrency = computed(() => selectedItems.value[0]?.currency_code ?? 'ARS')
const firstSelected = computed(() => selectedItems.value[0])
const selectableItems = computed(() => {
  const first = firstSelected.value
  if (!first) return eligibleItems.value
  return eligibleItems.value.filter(item => item.tax_type === first.tax_type && item.jurisdiction?.id === first.jurisdiction?.id && item.currency_code === first.currency_code && periodKey(item.date) === periodKey(first.date))
})
const toggleSelected = (id: string, checked: boolean | 'indeterminate') => {
  const ids = Array.isArray(selectedIds.value) ? selectedIds.value : []
  selectedIds.value = checked === true
    ? [...new Set([...ids, id])]
    : ids.filter(selectedId => selectedId !== id)
}
const vepAdditionalAmount = computed(() => Math.max(0, Number(vepAmount.value || 0) - selectedTotal.value))
watch(selectedTotal, total => { if (!vepAmountEdited.value) vepAmount.value = Number(total.toFixed(2)) })
const openRemittanceModal = () => {
  selectedIds.value = []
  vepNumber.value = ''
  regimeCode.value = ''
  dueDate.value = ''
  vepAmount.value = 0
  vepAmountEdited.value = false
  remittanceModalOpen.value = true
}
const closeRemittanceModal = () => { remittanceModalOpen.value = false }
const markVepAmountEdited = () => { vepAmountEdited.value = true }
const createRemittance = async () => {
  if (!selectedIds.value.length || !vepNumber.value.trim()) return
  savingRemittance.value = true
  try {
    await $fetch('/api/backend/fiscal/withholdings/remittances', { method: 'POST', body: {
      withholding_ids: selectedIds.value, vep_number: vepNumber.value.trim(), vep_amount: Number(vepAmount.value.toFixed(2)),
      currency_code: selectedCurrency.value, tax_regime_code: regimeCode.value.trim() || undefined, due_date: dueDate.value || undefined,
    } })
    toast.add({ title: 'VEP asociado', description: 'Ahora podés registrarlo como un pago bancario.', color: 'success' })
    remittanceModalOpen.value = false
    selectedIds.value = []
    vepNumber.value = ''
    vepAmount.value = 0
    vepAmountEdited.value = false
    await fetchWithholdings()
  } catch (e: any) {
    toast.add({ title: 'No se pudo asociar el VEP', description: e?.data?.message, color: 'error' })
  } finally { savingRemittance.value = false }
}

const todayLocal = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}
const openTaxApplicationModal = (item?: WithholdingRow) => {
  if (!item) return
  selectedWithholding.value = item
  taxApplicationAmount.value = Number(taxCreditAvailable(item).toFixed(2))
  taxApplicationPeriod.value = periodKey(item.date)
  taxApplicationDate.value = todayLocal()
  taxApplicationReference.value = ''
  taxApplicationNotes.value = ''
  taxApplicationModalOpen.value = true
}
const closeTaxApplicationModal = () => { taxApplicationModalOpen.value = false }
const createTaxApplication = async () => {
  const item = selectedWithholding.value
  const amount = Number(taxApplicationAmount.value)
  if (!item || !Number.isFinite(amount) || amount <= 0 || amount > taxCreditAvailable(item) + 0.001 || !taxApplicationPeriod.value || !taxApplicationDate.value) return
  savingTaxApplication.value = true
  try {
    await $fetch(`/api/backend/fiscal/withholdings/${item.id}/tax-applications`, { method: 'POST', body: {
      tax_period: taxApplicationPeriod.value,
      application_date: taxApplicationDate.value,
      amount,
      declaration_reference: taxApplicationReference.value.trim() || undefined,
      notes: taxApplicationNotes.value.trim() || undefined,
    } })
    toast.add({ title: 'Imputación registrada', description: 'El crédito disponible se actualizó; la retención y su certificado se conservaron.', color: 'success' })
    await fetchWithholdings()
    selectedWithholding.value = items.value.find(current => current.id === item.id) ?? null
    if (selectedWithholding.value) taxApplicationAmount.value = Number(taxCreditAvailable(selectedWithholding.value).toFixed(2))
    taxApplicationReference.value = ''
    taxApplicationNotes.value = ''
  } catch (e: any) {
    toast.add({ title: 'No se pudo imputar el crédito', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally { savingTaxApplication.value = false }
}
const openReverseApplicationModal = (application: WithholdingTaxApplication) => {
  applicationToReverse.value = application
  reversalReason.value = ''
  reverseApplicationModalOpen.value = true
}
const reverseTaxApplication = async () => {
  if (!applicationToReverse.value || !reversalReason.value.trim()) return
  savingReverseApplication.value = true
  try {
    await $fetch(`/api/backend/fiscal/withholding-tax-applications/${applicationToReverse.value.id}/reverse`, {
      method: 'POST', body: { reason: reversalReason.value.trim() },
    })
    toast.add({ title: 'Imputación revertida', description: 'El importe volvió a estar disponible y el movimiento quedó en el historial.', color: 'success' })
    reverseApplicationModalOpen.value = false
    await fetchWithholdings()
    selectedWithholding.value = items.value.find(item => item.id === selectedWithholding.value?.id) ?? null
    if (selectedWithholding.value) taxApplicationAmount.value = Number(taxCreditAvailable(selectedWithholding.value).toFixed(2))
  } catch (e: any) {
    toast.add({ title: 'No se pudo revertir la imputación', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally { savingReverseApplication.value = false }
}

onMounted(fetchWithholdings)
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <AppPageHeader title="Retenciones" description="Consultá lo retenido a terceros y las retenciones que te practicaron." />

    <UTabs v-model="activeView" :items="tabs" :content="false" variant="link" class="w-full" />

    <div class="grid gap-4 sm:grid-cols-2">
      <UPageCard variant="subtle" :class="activeView === 'payable' ? 'border-warning/40' : ''">
        <p class="text-xs font-semibold uppercase text-muted">A depositar</p>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(payableTotal) }}</p>
        <p class="text-xs text-muted">{{ payableItems.length }} retenciones practicadas sin VEP pagado</p>
      </UPageCard>
      <UPageCard variant="subtle" :class="activeView === 'suffered' ? 'border-primary/40' : ''">
        <p class="text-xs font-semibold uppercase text-muted">Sufridas</p>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(sufferedTotal) }}</p>
        <p class="text-xs text-muted">{{ sufferedItems.length }} retenciones · {{ formatCurrency(sufferedAvailableTotal) }} disponible · {{ formatCurrency(sufferedAppliedTotal) }} imputado</p>
      </UPageCard>
    </div>

    <template v-if="activeView === 'payable'">
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
        title="Retenciones practicadas pendientes de ingreso"
        description="Elegí las retenciones que forman parte de cada VEP. Al asociarlo, todas las seleccionadas quedan agrupadas bajo ese VEP; al pagar el importe total del VEP desde Tesorería, se marcan juntas como pagadas."
      />
      <div class="flex justify-end"><UButton label="Registrar VEP de ARCA" icon="i-lucide-file-plus-2" :disabled="!eligibleItems.length" @click="openRemittanceModal" /></div>
      <UPageCard variant="subtle" class="overflow-hidden">
        <template #header><div><p class="font-semibold">Resumen por impuesto, jurisdicción y período</p><p class="text-xs text-muted">El período se toma de la fecha del pago asociado.</p></div></template>
        <div v-if="loading" class="py-8 text-center text-sm text-muted">Cargando…</div>
        <div v-else-if="!payableGroups.length" class="py-8 text-center text-sm text-muted">No hay retenciones practicadas en pagos confirmados con estos filtros.</div>
        <AsteriskTable v-else compact storage-key="treasury-withholding-payable-groups" :data="payableGroups" :columns="groupColumns" :filter-fields="[{ id: 'tax_type', label: 'Impuesto' }, { id: 'jurisdiction_display', label: 'Jurisdicción' }, { id: 'period_display', label: 'Período' }]" :sort-fields="[{ label: 'Período', value: 'period_display' }, { label: 'Impuesto', value: 'tax_type' }, { label: 'Total', value: 'amount_display' }]" search-placeholder="Buscar impuesto o jurisdicción..." />
      </UPageCard>
      <UPageCard variant="subtle" class="overflow-hidden">
        <template #header><p class="font-semibold">Detalle</p></template>
        <div v-if="payableItems.length" class="overflow-x-auto"><AsteriskTable compact storage-key="treasury-withholding-payable-detail" :data="payableItems.map(toDetailRow)" :columns="detailColumns" :filter-fields="detailFilterFields" :sort-fields="detailSortFields" search-placeholder="Buscar tercero, impuesto o pago..." /></div>
        <p v-else class="py-6 text-center text-sm text-muted">Todavía no hay retenciones para depositar.</p>
      </UPageCard>
    </template>

    <UPageCard v-else-if="activeView === 'paid'" variant="subtle" class="overflow-hidden">
      <template #header><div><p class="font-semibold">VEP pagados</p><p class="text-xs text-muted">Retenciones cuyo pago bancario quedó confirmado.</p></div></template>
      <AsteriskTable v-if="paidItems.length" compact storage-key="treasury-withholding-vep-paid" :data="paidItems.map(toDetailRow)" :columns="detailColumns" :filter-fields="detailFilterFields" :sort-fields="detailSortFields" search-placeholder="Buscar VEP, impuesto o período..." />
      <p v-else class="py-6 text-center text-sm text-muted">Todavía no hay VEP pagados.</p>
    </UPageCard>

    <UPageCard v-else variant="subtle" class="overflow-hidden">
      <template #header><div><p class="font-semibold">Retenciones sufridas</p><p class="text-xs text-muted">Importes que clientes u otros terceros retuvieron a la empresa.</p></div></template>
      <UAlert class="mx-4 mb-4" color="primary" variant="subtle" icon="i-lucide-badge-info" title="Es un crédito fiscal, no un cobro pendiente" description="Tu cliente ya descontó este importe al pagarte. Guardá y conciliá el certificado; cuando lo computás en una declaración, registrá acá la imputación. Podés aplicarlo total o parcialmente y el saldo disponible se actualiza sin borrar la retención." />
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Cargando…</div>
      <div v-else-if="!sufferedItems.length" class="py-8 text-center text-sm text-muted">No hay retenciones sufridas en cobros confirmados con estos filtros.</div>
      <AsteriskTable v-else compact storage-key="treasury-withholding-suffered" :data="sufferedRows" :columns="sufferedColumns" :filter-fields="detailFilterFields" :sort-fields="detailSortFields" search-placeholder="Buscar cliente, impuesto o certificado..." />
    </UPageCard>
  </div>
  <UModal v-model:open="remittanceModalOpen" title="Registrar VEP de ARCA" description="Asociá el VEP con las retenciones practicadas que incluye." :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="space-y-6">
        <UAlert color="primary" variant="subtle" icon="i-lucide-info" title="Un VEP puede incluir varias retenciones" description="Todas las casillas que marques se asociarán al mismo VEP. Después, al confirmar en Tesorería un único pago por el total del VEP, todas esas retenciones pasarán juntas a pagadas. Si ARCA emitió VEP separados, registralos por separado." />

        <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
          <div><h3 class="font-semibold">Datos del VEP</h3><p class="mt-1 text-sm text-muted">Identificación e importe de la obligación generada en ARCA.</p></div>
          <UFormField label="Número de VEP" description="Copialo de la constancia emitida por ARCA." required>
            <UInput v-model="vepNumber" size="lg" placeholder="Ej.: 123456789012" class="w-full" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Régimen / impuesto ARCA" description="Opcional: código o nombre del régimen.">
              <UInput v-model="regimeCode" size="lg" placeholder="Ej.: SICORE — Ganancias" class="w-full" />
            </UFormField>
            <UFormField label="Fecha de vencimiento" description="Si figura en el VEP.">
              <UInput v-model="dueDate" size="lg" type="date" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Importe total del VEP" description="Usá el total exacto de ARCA. Puede superar las retenciones si incluye intereses." required>
            <UInput v-model.number="vepAmount" size="lg" type="number" min="0.01" step="0.01" @update:model-value="markVepAmountEdited" />
          </UFormField>
        </section>

        <section class="space-y-3">
          <div class="flex flex-wrap items-end justify-between gap-2">
          <div><h3 class="font-semibold">Retenciones incluidas en este VEP</h3><p class="mt-1 text-sm text-muted">Seleccioná todas las que aparecen dentro de este VEP. Sólo se pueden combinar impuesto, jurisdicción, período y moneda iguales.</p></div>
            <UBadge v-if="selectedItems.length" color="primary" variant="subtle">{{ selectedItems.length }} seleccionada{{ selectedItems.length === 1 ? '' : 's' }}</UBadge>
          </div>
          <div class="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-default p-3 sm:p-4">
            <label v-for="item in selectableItems" :key="item.id" class="flex cursor-pointer items-start gap-3 rounded-lg border border-default p-3 transition hover:bg-elevated/50 sm:p-4" :class="selectedIdSet.has(item.id) ? 'border-primary/50 bg-primary/5' : ''">
              <UCheckbox :model-value="selectedIdSet.has(item.id)" class="mt-0.5" @update:model-value="toggleSelected(item.id, $event)" />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium"><span>{{ item.tax_type }}</span><span class="text-muted">· {{ item.jurisdiction?.name ?? 'Nacional / sin jurisdicción' }}</span></span>
                <span class="mt-1 block text-sm text-muted">{{ periodLabel(periodKey(item.date)) }} · {{ formatDate(item.date) }}<template v-if="item.payment"> · Pago #{{ item.payment.number }}</template></span>
                <span class="mt-1 block text-xs text-muted">Base {{ formatCurrency(item.base_amount, item.currency_code) }}<template v-if="item.rate != null"> · Alícuota {{ Number(item.rate) }}%</template><template v-if="item.certificate_number"> · Cert. {{ item.certificate_number }}</template></span>
              </span>
              <span class="shrink-0 text-right font-semibold">{{ formatCurrency(item.withheld_amount, item.currency_code) }}<span class="block text-xs font-normal text-muted">retención</span></span>
            </label>
            <p v-if="!selectableItems.length" class="py-6 text-center text-sm text-muted">No hay retenciones compatibles para asociar. Primero seleccioná una retención disponible.</p>
          </div>
        </section>

        <div class="grid gap-3 rounded-xl bg-elevated/30 p-4 sm:grid-cols-3 sm:p-5">
          <div><p class="text-xs font-medium uppercase text-muted">Retenciones seleccionadas</p><p class="mt-1 text-lg font-semibold">{{ formatCurrency(selectedTotal, selectedCurrency) }}</p></div>
          <div><p class="text-xs font-medium uppercase text-muted">Intereses / adicionales</p><p class="mt-1 text-lg font-semibold">{{ formatCurrency(vepAdditionalAmount, selectedCurrency) }}</p></div>
          <div><p class="text-xs font-medium uppercase text-muted">Total del VEP</p><p class="mt-1 text-xl font-bold text-primary">{{ formatCurrency(vepAmount, selectedCurrency) }}</p></div>
          <p class="text-xs text-muted sm:col-span-3">El VEP debe ser igual o mayor a las retenciones seleccionadas. La diferencia se considera un adicional del VEP; no se distribuye entre las retenciones.</p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><p class="text-xs text-muted">Este registro agrupa; el pago posterior cancela el VEP completo.</p><div class="flex justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeRemittanceModal" /><UButton label="Asociar VEP" icon="i-lucide-link" :loading="savingRemittance" :disabled="!vepNumber.trim() || !selectedIds.length || vepAmount < selectedTotal" @click="createRemittance" /></div></div>
    </template>
  </UModal>
  <UModal v-model:open="taxApplicationModalOpen" title="Imputar retención sufrida" description="Registrá el uso de este crédito fiscal en una declaración; no genera un movimiento de caja o banco." :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div v-if="selectedWithholding" class="space-y-5">
        <div class="grid gap-3 rounded-xl bg-elevated/30 p-4 sm:grid-cols-3">
          <div><p class="text-xs font-medium uppercase text-muted">Retención</p><p class="mt-1 font-semibold">{{ selectedWithholding.tax_type }}</p></div>
          <div><p class="text-xs font-medium uppercase text-muted">Importe original</p><p class="mt-1 font-semibold">{{ formatCurrency(selectedWithholding.withheld_amount, selectedWithholding.currency_code) }}</p></div>
          <div><p class="text-xs font-medium uppercase text-muted">Crédito disponible</p><p class="mt-1 text-lg font-bold text-primary">{{ formatCurrency(taxCreditAvailable(selectedWithholding), selectedWithholding.currency_code) }}</p></div>
        </div>
        <UAlert color="warning" variant="subtle" icon="i-lucide-shield-alert" title="Verificá el certificado y el período" description="La imputación es manual y queda registrada para control. Confirmá con tu contador que corresponda computarla en ese impuesto y período." />
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Período fiscal computado" description="Usá AAAA-MM para un período mensual o AAAA para uno anual." required>
            <UInput v-model="taxApplicationPeriod" size="lg" placeholder="2026-10 o 2026" class="w-full" />
          </UFormField>
          <UFormField label="Fecha de imputación" description="Fecha en que lo registraste en la declaración." required>
            <UInput v-model="taxApplicationDate" type="date" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Importe imputado" :description="`Máximo disponible: ${formatCurrency(taxCreditAvailable(selectedWithholding), selectedWithholding.currency_code)}`" required>
            <UInput v-model.number="taxApplicationAmount" type="number" min="0.01" :max="taxCreditAvailable(selectedWithholding)" step="0.01" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Referencia de declaración / presentación" description="Opcional; por ejemplo, número de presentación o acuse.">
            <UInput v-model="taxApplicationReference" size="lg" placeholder="N° de presentación, DDJJ, etc." class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Notas" description="Dato de control adicional (opcional).">
          <UTextarea v-model="taxApplicationNotes" :rows="2" class="w-full" placeholder="Observaciones de la imputación" />
        </UFormField>

        <section class="space-y-2 border-t border-default pt-4">
          <div class="flex items-center justify-between"><h3 class="font-semibold">Historial de imputaciones</h3><span class="text-xs text-muted">No se borra; las correcciones se revierten.</span></div>
          <div v-if="selectedWithholding.tax_applications?.length" class="max-h-52 space-y-2 overflow-y-auto">
            <div v-for="application in selectedWithholding.tax_applications" :key="application.id" class="flex flex-wrap items-center gap-3 rounded-lg border border-default p-3">
              <div class="min-w-0 flex-1"><p class="font-medium">{{ application.tax_type }} · {{ periodLabel(application.tax_period) }}</p><p class="text-sm text-muted">{{ formatCurrency(application.amount, selectedWithholding.currency_code) }} · {{ formatDate(application.application_date) }}<template v-if="application.declaration_reference"> · {{ application.declaration_reference }}</template></p><p v-if="application.status === 'REVERSED'" class="text-xs text-warning">Revertida<template v-if="application.reversal_reason">: {{ application.reversal_reason }}</template></p></div>
              <UBadge :color="application.status === 'APPLIED' ? 'success' : 'neutral'" variant="subtle">{{ application.status === 'APPLIED' ? 'Imputada' : 'Revertida' }}</UBadge>
              <UButton v-if="application.status === 'APPLIED'" label="Revertir" size="xs" color="error" variant="ghost" @click="openReverseApplicationModal(application)" />
            </div>
          </div>
          <p v-else class="rounded-lg border border-dashed border-default p-4 text-center text-sm text-muted">Todavía no se imputó este crédito.</p>
        </section>
      </div>
    </template>
    <template #footer>
      <div class="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><p class="text-xs text-muted">No modifica el pago ni elimina el certificado.</p><div class="flex justify-end gap-2"><UButton label="Cerrar" color="neutral" variant="outline" @click="closeTaxApplicationModal" /><UButton label="Registrar imputación" icon="i-lucide-clipboard-check" :loading="savingTaxApplication" :disabled="!taxApplicationCanSubmit" @click="createTaxApplication" /></div></div>
    </template>
  </UModal>
  <UModal v-model:open="reverseApplicationModalOpen" title="Revertir imputación" description="El importe volverá al crédito disponible; la imputación original quedará en el historial." :ui="{ content: 'sm:max-w-lg' }">
    <template #body>
      <div class="space-y-4">
        <UAlert color="warning" variant="subtle" icon="i-lucide-undo-2" :title="applicationToReverse ? `${formatCurrency(applicationToReverse.amount, selectedWithholding?.currency_code)} · ${applicationToReverse.tax_type} · ${periodLabel(applicationToReverse.tax_period)}` : 'Revisá la imputación'" description="Esta acción no borra el registro original. Indicá el motivo para dejar trazabilidad." />
        <UFormField label="Motivo de reversión" required><UTextarea v-model="reversalReason" :rows="3" class="w-full" placeholder="Ej.: período incorrecto o importe duplicado" /></UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="reverseApplicationModalOpen = false" /><UButton label="Revertir y liberar saldo" color="error" icon="i-lucide-undo-2" :loading="savingReverseApplication" :disabled="!reversalReason.trim()" @click="reverseTaxApplication" /></div>
    </template>
  </UModal>
</template>
