<script setup lang="ts">
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({ middleware: ['auth'] })

type CardsTab = 'SUMMARIES' | 'COMPANY' | 'CUSTOMER'

const service = useCreditCardsService()
const toast = useToast()
const loading = ref(true)
const loadingMore = ref(false)
const generating = ref(false)
const savingCard = ref(false)
const payingSummary = ref(false)
const reversingSummary = ref(false)
const items = ref<any[]>([])
const summaries = ref<any[]>([])
const summaryTotal = ref(0)
const summaryPage = ref(1)
const modalOpen = ref(false)
const paymentOpen = ref(false)
const reversePaymentOpen = ref(false)
const editing = ref<any>(null)
const selectedSummary = ref<any>(null)
const selectedReversalSummary = ref<any>(null)
const { bankAccounts, init: loadBanks } = useBankAccounts()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const tab = ref<CardsTab>('SUMMARIES')
const summaryStatus = ref('ALL')
const summaryCardId = ref('ALL')

const emptyForm = () => ({
  name: '', type: tab.value === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY', brand: 'VISA', channel_type: 'APP', last_four: '',
  bank_name: '', holder_name: '', holder_id: '', credit_limit: null as number | null,
  currency_code: 'ARS', commission_rate: null as number | null, clearing_days: null as number | null,
  closing_day: null as number | null, due_day: null as number | null, active: true,
})
const form = reactive(emptyForm())
const cardTab = computed(() => tab.value === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY')
const filteredCards = computed(() => items.value.filter(item => item.type === cardTab.value))
const cardTitle = computed(() => cardTab.value === 'COMPANY' ? 'Tarjetas corporativas' : 'Canales de cobro')
const channelTypes = [
  { label: 'POS / terminal', value: 'POS' },
  { label: 'Aplicación', value: 'APP' },
  { label: 'QR', value: 'QR' },
  { label: 'Link de pago', value: 'PAYMENT_LINK' },
  { label: 'E-commerce', value: 'ECOMMERCE' },
  { label: 'Otro', value: 'OTHER' },
]
const channelTypeLabel = (value?: string) => channelTypes.find(item => item.value === value)?.label || 'Canal'
const availableSummaryCards = computed(() => items.value.filter(item => item.type === 'COMPANY'))
const filteredSummaries = computed(() => summaries.value.filter(row => summaryCardId.value === 'ALL' || row.credit_card_id === summaryCardId.value))
const pendingSummaries = computed(() => filteredSummaries.value.filter(row => row.status?.toLowerCase() === 'pending'))
const pendingTotalsLabel = computed(() => {
  const totals = new Map<string, number>()
  for (const summary of pendingSummaries.value) {
    totals.set(summary.currency_code, (totals.get(summary.currency_code) || 0) + Number(summary.balance || 0))
  }
  return totals.size ? [...totals].map(([currency, amount]) => money(amount, currency)).join(' · ') : money(0, 'ARS')
})
const canManageCards = computed(() => isOwnerOrAdmin.value || hasPermission('card_settings.manage'))
const canPaySummary = computed(() => isOwnerOrAdmin.value || hasPermission('credit_cards.company.pay_statement'))
const canReverseSummaryPayment = computed(() => isOwnerOrAdmin.value || hasPermission('credit_cards.company.reverse'))
const canReadSummaries = computed(() => isOwnerOrAdmin.value || hasPermission('credit_cards.company.read'))
const canViewCompanyCards = computed(() => canReadSummaries.value || hasPermission('card_settings.read'))
const canViewCustomerChannels = computed(() => isOwnerOrAdmin.value || hasPermission('card_collections.read') || hasPermission('card_settings.read'))
const visibleTabs = computed(() => [
  ...(canReadSummaries.value ? [{ label: 'Resúmenes', value: 'SUMMARIES', icon: 'i-lucide-receipt-text' }] : []),
  ...(canViewCompanyCards.value ? [{ label: 'Tarjetas corporativas', value: 'COMPANY', icon: 'i-lucide-credit-card' }] : []),
  ...(canViewCustomerChannels.value ? [{ label: 'Canales de cobro', value: 'CUSTOMER', icon: 'i-lucide-badge-dollar-sign' }] : []),
])
const selectedBankOptions = computed(() => bankAccounts.value
  .filter((bank: any) => bank.active !== false && bank.currency_code === selectedSummary.value?.currency_code)
  .map((bank: any) => ({ label: `${bank.bank_name} · ${bank.name} · Disponible ${money(bank.balance, bank.currency_code)}`, value: bank.id })))

const summaryFilters = computed(() => ({
  ...(summaryStatus.value !== 'ALL' ? { status: summaryStatus.value } : {}),
  ...(summaryCardId.value !== 'ALL' ? { card_id: summaryCardId.value } : {}),
}))
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

const load = async (page = 1, append = false) => {
  if (append) loadingMore.value = true
  else loading.value = true
  try {
    const [cards, statements] = await Promise.all([
      service.findAll(),
      canReadSummaries.value
        ? service.summaries({ ...summaryFilters.value, page: String(page) })
        : Promise.resolve({ items: [], total: 0, page: 1, page_size: 100 }),
    ])
    items.value = cards.filter(card => card.type === 'COMPANY' ? canViewCompanyCards.value : canViewCustomerChannels.value)
    summaries.value = append ? [...summaries.value, ...statements.items] : statements.items
    summaryTotal.value = statements.total
    summaryPage.value = statements.page
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar las tarjetas', description: error?.data?.message, color: 'error' })
  } finally {
    if (append) loadingMore.value = false
    else loading.value = false
  }
}

const loadMoreSummaries = () => load(summaryPage.value + 1, true)
watch([summaryStatus, summaryCardId], () => load(1))

const openCreate = () => {
  editing.value = null
  Object.assign(form, emptyForm())
  modalOpen.value = true
}

const closeCardModal = () => {
  if (!savingCard.value) modalOpen.value = false
}

const openEdit = (item: any) => {
  editing.value = item
  Object.assign(form, {
    name: item.name ?? '', type: item.type, brand: item.brand ?? 'OTHER', channel_type: item.channel_type ?? 'OTHER', last_four: item.last_four ?? '',
    bank_name: item.bank_name ?? '', holder_name: item.holder_name ?? '', holder_id: item.holder_id ?? '',
    credit_limit: item.credit_limit == null ? null : Number(item.credit_limit), currency_code: item.currency_code ?? 'ARS',
    commission_rate: item.commission_rate == null ? null : Number(item.commission_rate), clearing_days: item.clearing_days ?? null,
    closing_day: item.closing_day ?? null, due_day: item.due_day ?? null, active: item.active !== false,
  })
  modalOpen.value = true
}

const saveCard = async () => {
  if (savingCard.value) return
  savingCard.value = true
  try {
    const payload = {
      ...form,
      type: cardTab.value,
      brand: cardTab.value === 'COMPANY' ? form.brand : 'OTHER',
      channel_type: cardTab.value === 'CUSTOMER' ? form.channel_type : null,
      last_four: cardTab.value === 'COMPANY' ? form.last_four : null,
      holder_name: cardTab.value === 'COMPANY' ? form.holder_name : null,
      bank_name: form.bank_name || form.name,
    }
    if (editing.value) await service.update(editing.value.id, payload)
    else await service.create(payload)
    toast.add({ title: editing.value ? 'Configuración actualizada' : 'Configuración creada', color: 'success' })
    modalOpen.value = false
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' })
  } finally {
    savingCard.value = false
  }
}

const generateSummaries = async () => {
  if (generating.value) return
  generating.value = true
  let processed = 0
  let created = 0
  let unconfigured = 0
  let hasMore = false
  try {
    // Backfill historic confirmed purchases in bounded API batches.
    for (let batch = 0; batch < 10; batch += 1) {
      const result = await service.generateSummaries()
      processed += result.processed
      created += result.summary_items_created
      unconfigured = result.unconfigured_transactions
      hasMore = result.has_more
      if (!hasMore || result.processed === 0) break
    }
    await load()
    const details = [
      `${created} cuota(s) incorporadas a resúmenes`,
      hasMore ? 'Quedan consumos históricos; volvé a actualizar para continuar.' : '',
      unconfigured ? `${unconfigured} consumo(s) no se procesaron porque falta configurar cierre y vencimiento.` : '',
    ].filter(Boolean).join(' ')
    toast.add({ title: `${processed} consumo(s) revisados`, description: details, color: unconfigured ? 'warning' : 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudieron generar los resúmenes', description: error?.data?.message, color: 'error' })
  } finally {
    generating.value = false
  }
}

const openPaySummary = (summary: any) => {
  if (payingSummary.value || generating.value) return
  selectedSummary.value = summary
  Object.assign(paymentForm, { bank_account_id: '', date: todayIso(), reference: '', notes: '' })
  paymentOpen.value = true
}

const closePaymentModal = () => {
  if (!payingSummary.value) paymentOpen.value = false
}

const paymentForm = reactive({ bank_account_id: '', date: todayIso(), reference: '', notes: '' })

const paySummary = async () => {
  if (payingSummary.value || !selectedSummary.value || !paymentForm.bank_account_id) return
  payingSummary.value = true
  try {
    await service.paySummary(selectedSummary.value.id, { ...paymentForm })
    toast.add({ title: 'Resumen pagado', description: 'Se registró un único débito por el total en la cuenta bancaria.', color: 'success' })
    paymentOpen.value = false
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo pagar el resumen', description: error?.data?.message, color: 'error' })
  } finally {
    payingSummary.value = false
  }
}

const openReverseSummaryPayment = (summary: any) => {
  if (reversingSummary.value || payingSummary.value || generating.value) return
  selectedReversalSummary.value = summary
  reversePaymentOpen.value = true
}

const closeReversePaymentModal = () => {
  if (!reversingSummary.value) reversePaymentOpen.value = false
}

const reverseSummaryPayment = async () => {
  if (reversingSummary.value || !selectedReversalSummary.value) return
  reversingSummary.value = true
  try {
    await service.reverseSummaryPayment(selectedReversalSummary.value.id)
    toast.add({ title: 'Pago revertido', description: 'Se anuló el débito bancario y las cuotas volvieron a quedar pendientes.', color: 'success' })
    reversePaymentOpen.value = false
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo revertir el pago', description: error?.data?.message, color: 'error' })
  } finally {
    reversingSummary.value = false
  }
}

const money = (amount: number | string, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(amount || 0))
const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date)) : 'Sin fecha'
const summaryIsOverdue = (row: any) => row.status?.toLowerCase() === 'pending' && row.due_date && row.due_date.slice(0, 10) < todayIso()
const summaryStatusLabel = (row: any) => row.status?.toLowerCase() === 'paid' ? 'Pagado' : row.status?.toLowerCase() === 'cancelled' ? 'Anulado' : summaryIsOverdue(row) ? 'Vencido' : 'Pendiente'
const summaryStatusColor = (row: any) => row.status?.toLowerCase() === 'paid' ? 'success' : row.status?.toLowerCase() === 'cancelled' ? 'neutral' : summaryIsOverdue(row) ? 'error' : 'warning'

onMounted(() => {
  if (!canReadSummaries.value) tab.value = canViewCompanyCards.value ? 'COMPANY' : 'CUSTOMER'
  return Promise.all([load(), loadBanks()])
})
</script>

<template>
  <UPage class="space-y-5">
    <AppPageHeader title="Tarjetas" description="Consultá resúmenes corporativos, administrá tarjetas y configurá canales de cobro.">
      <template #links>
        <UButton v-if="tab !== 'SUMMARIES' && canManageCards" label="Nueva configuración" icon="i-lucide-plus" :disabled="savingCard" @click="openCreate" />
        <UButton v-else-if="tab === 'SUMMARIES' && canPaySummary" label="Generar resúmenes pendientes" icon="i-lucide-refresh-cw" variant="soft" :loading="generating" :disabled="generating || payingSummary" @click="generateSummaries" />
      </template>
    </AppPageHeader>

    <UTabs
      v-model="tab"
      :items="visibleTabs"
    />

    <template v-if="tab === 'SUMMARIES'">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <UPageCard title="Pendiente de pago" :description="pendingTotalsLabel">
          <p class="text-sm text-muted">{{ pendingSummaries.length }} resumen(es) pendientes o vencidos</p>
        </UPageCard>
        <UPageCard title="Historial disponible" :description="`${filteredSummaries.length} de ${summaryTotal} resumen(es)`">
          <p class="text-sm text-muted">Los pagados conservan su detalle y el movimiento bancario asociado.</p>
        </UPageCard>
        <UPageCard title="Cómo se calcula" description="Cierre y vencimiento por tarjeta">
          <p class="text-sm text-muted">Las cuotas se agrupan por cierre y se pagan juntas desde el banco.</p>
        </UPageCard>
      </div>

      <UCard>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">Resúmenes mensuales de compras con tarjeta corporativa.</p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <USelect v-model="summaryCardId" :items="[{ label: 'Todas las tarjetas', value: 'ALL' }, ...availableSummaryCards.map(card => ({ label: card.name, value: card.id }))]" class="min-w-52" />
            <USelect v-model="summaryStatus" :items="[{ label: 'Todos los estados', value: 'ALL' }, { label: 'Pendientes', value: 'pending' }, { label: 'Pagados', value: 'paid' }, { label: 'Anulados', value: 'cancelled' }]" class="min-w-44" />
          </div>
        </div>
      </UCard>

      <div v-if="loading" class="space-y-3"><USkeleton v-for="n in 3" :key="n" class="h-36" /></div>
      <div v-else-if="filteredSummaries.length" class="space-y-3">
        <UCard v-for="summary in filteredSummaries" :key="summary.id">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-semibold">{{ summary.credit_card.name }} · Resumen {{ String(summary.month).padStart(2, '0') }}/{{ summary.year }}</h2>
                <UBadge :label="summaryStatusLabel(summary)" :color="summaryStatusColor(summary)" />
              </div>
              <p class="mt-1 text-sm text-muted">Cierre {{ dateLabel(summary.closing_date) }} · Vencimiento {{ dateLabel(summary.due_date) }} · {{ summary.items.length }} cuota(s)</p>
              <p v-if="summary.payment_operation" class="mt-1 text-sm text-muted">
                Pagado desde {{ summary.payment_operation.bank_account?.bank_name }} · {{ summary.payment_operation.bank_account?.name }} · {{ dateLabel(summary.payment_operation.date) }}
                <span v-if="summary.payment_operation.reference">· {{ summary.payment_operation.reference }}</span>
              </p>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
              <div class="text-right">
                <p class="text-xs text-muted">{{ summary.status?.toLowerCase() === 'paid' ? 'Pagado' : 'Saldo a pagar' }}</p>
                <strong class="text-lg">{{ money(summary.status?.toLowerCase() === 'paid' ? summary.total_payments : summary.balance, summary.currency_code) }}</strong>
              </div>
              <UButton v-if="summary.status?.toLowerCase() === 'pending' && canPaySummary" label="Pagar resumen" icon="i-lucide-landmark" :disabled="payingSummary || generating" @click="openPaySummary(summary)" />
              <UButton v-if="summary.status?.toLowerCase() === 'paid' && canReverseSummaryPayment" label="Revertir pago" icon="i-lucide-undo-2" variant="soft" color="warning" :disabled="reversingSummary || payingSummary || generating" @click="openReverseSummaryPayment(summary)" />
            </div>
          </div>
          <details v-if="summary.items.length" class="mt-4 border-t border-default pt-3">
            <summary class="cursor-pointer text-sm font-medium">Ver consumos y cuotas del período</summary>
            <div class="mt-3 divide-y divide-default">
              <div v-for="item in summary.items" :key="item.id" class="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-sm">{{ item.transaction.description || item.transaction.payment?.description || `Pago #${item.transaction.payment?.number ?? '—'}` }}</p>
                  <p class="text-xs text-muted">Pago #{{ item.transaction.payment?.number ?? '—' }} · Cuota {{ item.installment_number }} · autorización {{ item.transaction.authorization || 'sin informar' }}</p>
                </div>
                <strong class="text-sm">{{ money(item.amount, item.currency_code) }}</strong>
              </div>
            </div>
          </details>
        </UCard>
        <div v-if="summaries.length < summaryTotal" class="flex justify-center py-2">
          <UButton label="Cargar más historial" icon="i-lucide-chevron-down" variant="soft" :loading="loadingMore" :disabled="loadingMore" @click="loadMoreSummaries" />
        </div>
      </div>
      <UAlert v-else-if="!loading" color="neutral" variant="subtle" icon="i-lucide-receipt-text" title="Todavía no hay resúmenes para estos filtros" description="Los nuevos consumos confirmados generan sus resúmenes automáticamente. Para consumos anteriores, usá “Generar resúmenes pendientes”." />
      <UAlert v-if="availableSummaryCards.some(card => !card.closing_day || !card.due_day)" color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="Hay tarjetas sin cierre o vencimiento configurado" description="Editá esas tarjetas para indicar ambos días; sin esos datos no se pueden calcular ni generar resúmenes." />
    </template>

    <template v-else>
      <UAlert v-if="cardTab === 'CUSTOMER'" color="info" variant="subtle" icon="i-lucide-info" title="Canales donde cobrás" description="Configurá el medio de cobro (POS, app, QR, link o e-commerce), no la marca de la tarjeta del cliente. Las acreditaciones reales se agrupan después en Liquidaciones de tarjeta." />
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><USkeleton v-for="n in 3" :key="n" class="h-40" /></div>
      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UPageCard v-for="item in filteredCards" :key="item.id" :title="item.name" :description="`${cardTab === 'COMPANY' ? item.brand : channelTypeLabel(item.channel_type)} · ${item.currency_code}`">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-muted">{{ cardTab === 'COMPANY' ? 'Terminación' : 'Comisión estimada' }}</span><strong>{{ cardTab === 'COMPANY' ? `•••• ${item.last_four}` : `${Number(item.commission_rate || 0)}%` }}</strong></div>
            <div class="flex justify-between"><span class="text-muted">{{ cardTab === 'COMPANY' ? 'Cierre / vencimiento' : 'Acreditación' }}</span><span>{{ cardTab === 'COMPANY' ? `${item.closing_day || '—'} / ${item.due_day || '—'}` : `${item.clearing_days || 0} días` }}</span></div>
            <div class="flex justify-between"><span class="text-muted">Operaciones</span><span>{{ item._count?.transactions || 0 }}</span></div>
            <UBadge v-if="cardTab === 'COMPANY' && (!item.closing_day || !item.due_day)" label="Completar cierre y vencimiento" color="warning" />
          </div>
          <template #footer><UButton v-if="canManageCards" label="Editar configuración" icon="i-lucide-pencil" variant="soft" block @click="openEdit(item)" /></template>
        </UPageCard>
        <UAlert v-if="!filteredCards.length" class="md:col-span-2 xl:col-span-3" color="neutral" variant="subtle" :title="`No hay ${cardTitle.toLowerCase()} configurados`" />
      </div>
    </template>

    <UModal v-model:open="modalOpen" :title="editing ? `Editar ${cardTitle.toLowerCase()}` : `Nueva configuración · ${cardTitle.toLowerCase()}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="cardTab === 'COMPANY' ? 'Nombre de la tarjeta' : 'Nombre del canal'" required><UInput v-model="form.name" class="w-full" /></UFormField>
          <UFormField v-if="cardTab === 'COMPANY'" label="Marca" required><USelect v-model="form.brand" :items="['VISA','MASTERCARD','AMEX','NARANJA','CABAL','OTHER']" class="w-full" /></UFormField>
          <UFormField v-else label="Canal de cobro" required><USelect v-model="form.channel_type" :items="channelTypes" class="w-full" /></UFormField>
          <UFormField :label="cardTab === 'COMPANY' ? 'Banco emisor' : 'Plataforma / adquirente'" required :description="cardTab === 'CUSTOMER' ? 'Ej.: Mercado Pago, Getnet o Payway.' : undefined"><UInput v-model="form.bank_name" class="w-full" :placeholder="cardTab === 'CUSTOMER' ? 'Mercado Pago' : 'Banco emisor'" /></UFormField>
          <UFormField label="Moneda" required><USelect v-model="form.currency_code" :items="['ARS','USD','EUR']" class="w-full" /></UFormField>
          <template v-if="cardTab === 'COMPANY'">
            <UFormField label="Titular" required><UInput v-model="form.holder_name" class="w-full" /></UFormField>
            <UFormField label="Últimos 4 dígitos" required><UInput v-model="form.last_four" maxlength="4" class="w-full" /></UFormField>
            <UFormField label="Límite"><UInput v-model.number="form.credit_limit" type="number" min="0" step="0.01" class="w-full" /></UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Día de cierre" required description="Día del mes en que cierra el resumen."><UInput v-model.number="form.closing_day" type="number" min="1" max="31" /></UFormField>
              <UFormField label="Día de vencimiento" required description="Se aplica al mes siguiente del cierre."><UInput v-model.number="form.due_day" type="number" min="1" max="31" /></UFormField>
            </div>
            <UAlert class="sm:col-span-2" color="info" variant="subtle" title="El pago se registra por resumen" description="Los consumos confirmados se agrupan por cierre. Al pagar, se debita el total del resumen desde una cuenta bancaria y se saldan juntas sus cuotas." />
          </template>
          <template v-else>
            <UFormField label="Comisión estimada %"><UInput v-model.number="form.commission_rate" type="number" min="0" step="0.01" class="w-full" /></UFormField>
            <UFormField label="Días para acreditar"><UInput v-model.number="form.clearing_days" type="number" min="0" class="w-full" /></UFormField>
          </template>
        </div>
        <div class="flex justify-end gap-2 pt-6">
          <UButton label="Cancelar" variant="ghost" :disabled="savingCard" @click="closeCardModal" />
          <UButton :label="editing ? 'Guardar cambios' : 'Crear configuración'" :loading="savingCard" :disabled="savingCard || !form.name || !form.bank_name || (cardTab === 'COMPANY' && (!form.holder_name || !form.last_four || !form.closing_day || !form.due_day))" @click="saveCard" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="paymentOpen" title="Pagar resumen de tarjeta" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="space-y-4">
          <UAlert
            v-if="selectedSummary"
            color="info"
            variant="subtle"
            :title="`${selectedSummary.credit_card.name} · ${String(selectedSummary.month).padStart(2, '0')}/${selectedSummary.year}`"
            :description="`Se registrará un único débito por ${money(selectedSummary.balance, selectedSummary.currency_code)}. Las ${selectedSummary.items.length} cuotas incluidas quedarán saldadas juntas.`"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Cuenta bancaria" required><USelectMenu v-model="paymentForm.bank_account_id" :items="selectedBankOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Fecha del pago" required><UInput v-model="paymentForm.date" type="date" class="w-full" /></UFormField>
            <UFormField label="Referencia bancaria"><UInput v-model="paymentForm.reference" class="w-full" /></UFormField>
            <UFormField label="Observaciones"><UInput v-model="paymentForm.notes" class="w-full" /></UFormField>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="Cancelar" variant="ghost" :disabled="payingSummary" @click="closePaymentModal" />
            <UButton label="Confirmar pago total" icon="i-lucide-landmark" :loading="payingSummary" :disabled="payingSummary || !paymentForm.bank_account_id" @click="paySummary" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="reversePaymentOpen" title="Revertir pago del resumen" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UAlert
            v-if="selectedReversalSummary"
            color="warning"
            variant="subtle"
            title="Se desharán los efectos del pago"
            :description="`Se anulará el débito de ${money(selectedReversalSummary.total_payments, selectedReversalSummary.currency_code)} en el banco y las cuotas de ${selectedReversalSummary.credit_card.name} · ${String(selectedReversalSummary.month).padStart(2, '0')}/${selectedReversalSummary.year} volverán a quedar pendientes.`"
          />
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="No, volver" variant="ghost" :disabled="reversingSummary" @click="closeReversePaymentModal" />
            <UButton label="Confirmar reversión" icon="i-lucide-undo-2" color="warning" :loading="reversingSummary" :disabled="reversingSummary" @click="reverseSummaryPayment" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
