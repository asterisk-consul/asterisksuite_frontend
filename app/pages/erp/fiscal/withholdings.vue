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
}

interface WithholdingTableRow extends Record<string, any> {
  id: string
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
const activeView = ref<'payable' | 'suffered'>(route.query.view === 'suffered' ? 'suffered' : 'payable')
const items = ref<WithholdingRow[]>([])
const loading = ref(false)
const filters = reactive({ tax_type: '', date_from: '', date_to: '' })
const tabs = [
  { label: 'A depositar', value: 'payable', icon: 'i-lucide-landmark' },
  { label: 'Sufridas', value: 'suffered', icon: 'i-lucide-hand-coins' },
]
const taxTypeOptions = ['GANANCIAS', 'IIBB', 'SUSS', 'IVA']
const UBadgeComponent = resolveComponent('UBadge')

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
    const query: Record<string, string> = {}
    if (filters.tax_type) query.tax_type = filters.tax_type
    if (filters.date_from) query.date_from = filters.date_from
    if (filters.date_to) query.date_to = filters.date_to
    const res = await $fetch<{ items: WithholdingRow[] }>('/api/backend/fiscal/withholdings', { query })
    items.value = res.items
  } catch (e: any) {
    console.error('Error cargando retenciones:', e)
    toast.add({ title: 'Error cargando retenciones', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const payableItems = computed(() => items.value.filter(item =>
  item.direction === 'PRACTICADA' && ['APPLIED', 'CERTIFIED'].includes(item.status)
))
const sufferedItems = computed(() => items.value.filter(item =>
  item.direction === 'SUFRIDA' && ['APPLIED', 'CERTIFIED'].includes(item.status)
))

const toDetailRow = (item: WithholdingRow): WithholdingTableRow => ({
  id: item.id,
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
  vep_status: 'Pendiente de asociar VEP',
})

const payableGroups = computed<WithholdingGroupRow[]>(() => {
  const groups = new Map<string, { tax_type: string; jurisdiction: string; period: string; currency: string; count: number; amount: number }>()
  for (const item of payableItems.value) {
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

const payableTotal = computed(() => payableItems.value.reduce((sum, item) => sum + Number(item.withheld_amount || 0), 0))
const sufferedTotal = computed(() => sufferedItems.value.reduce((sum, item) => sum + Number(item.withheld_amount || 0), 0))

const detailColumns: ExtendedColumn<WithholdingTableRow>[] = [
  { accessorKey: 'date_display', header: 'Fecha', meta: { label: 'Fecha', filter: { type: 'text', operators: ['contains', 'equals'] } } },
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
  { label: 'Fecha', value: 'date_display' },
  { label: 'Tercero', value: 'party_display' },
  { label: 'Importe', value: 'amount_display' },
]

watch(activeView, view => {
  void navigateTo({ query: { ...route.query, view: view === 'suffered' ? 'suffered' : 'payable' } }, { replace: true })
})

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
        <p class="text-xs text-muted">{{ payableItems.length }} retenciones practicadas en pagos confirmados</p>
      </UPageCard>
      <UPageCard variant="subtle" :class="activeView === 'suffered' ? 'border-primary/40' : ''">
        <p class="text-xs font-semibold uppercase text-muted">Sufridas</p>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(sufferedTotal) }}</p>
        <p class="text-xs text-muted">{{ sufferedItems.length }} retenciones recibidas de clientes</p>
      </UPageCard>
    </div>

    <UCard>
      <div class="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <USelectMenu v-model="filters.tax_type" :items="[{ label: 'Todos los impuestos', value: '' }, ...taxTypeOptions.map(value => ({ label: value, value }))]" value-key="value" placeholder="Impuesto" />
        <UInput v-model="filters.date_from" type="date" aria-label="Desde" />
        <UInput v-model="filters.date_to" type="date" aria-label="Hasta" />
        <UButton label="Aplicar filtros" icon="i-lucide-search" :loading="loading" @click="fetchWithholdings" />
      </div>
    </UCard>

    <template v-if="activeView === 'payable'">
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
        title="Retenciones practicadas pendientes de ingreso"
        description="Se agrupan las retenciones aplicadas en pagos confirmados. El VEP y la confirmación del depósito todavía no están vinculados desde el sistema."
      />
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

    <UPageCard v-else variant="subtle" class="overflow-hidden">
      <template #header><div><p class="font-semibold">Retenciones sufridas</p><p class="text-xs text-muted">Importes que clientes u otros terceros retuvieron a la empresa.</p></div></template>
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Cargando…</div>
      <div v-else-if="!sufferedItems.length" class="py-8 text-center text-sm text-muted">No hay retenciones sufridas en cobros confirmados con estos filtros.</div>
      <AsteriskTable v-else compact storage-key="treasury-withholding-suffered" :data="sufferedItems.map(toDetailRow)" :columns="detailColumns" :filter-fields="detailFilterFields" :sort-fields="detailSortFields" search-placeholder="Buscar cliente, impuesto o certificado..." />
    </UPageCard>
  </div>
</template>
