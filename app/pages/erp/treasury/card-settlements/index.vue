<script setup lang="ts">
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'

definePageMeta({ middleware: ['auth'] })

type SettlementTab = 'PENDING' | 'HISTORY'
const service = useCreditCardsService()
const { bankAccounts, init: initBanks } = useBankAccounts()
const toast = useToast()
const loading = ref(true)
const rows = ref<any[]>([])
const batches = ref<any[]>([])
const historyTotal = ref(0)
const pendingTotal = ref(0)
const pendingPage = ref(1)
const historyPage = ref(1)
const tab = ref<SettlementTab>('PENDING')
const modalOpen = ref(false)
const selectedIds = ref<string[]>([])
const selectedRows = ref<any[]>([])
const saving = ref(false)
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const form = reactive({ bank_account_id: '', date: today(), commission_amount: 0, tax_amount: 0, withholding_amount: 0, other_deductions: 0, net_amount: 0, reference: '', notes: '' })

const gross = computed(() => selectedRows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0))
const deductions = computed(() => Number(form.commission_amount || 0) + Number(form.tax_amount || 0) + Number(form.withholding_amount || 0) + Number(form.other_deductions || 0))
const calculatedNet = computed(() => Math.round((gross.value - deductions.value + Number.EPSILON) * 100) / 100)
const selectedCurrency = computed(() => selectedRows.value[0]?.currency_code || 'ARS')
const selectedChannel = computed(() => selectedRows.value[0]?.credit_card)
const bankOptions = computed(() => bankAccounts.value
  .filter((account: any) => account.active && account.currency_code === selectedCurrency.value)
  .map((account: any) => ({ label: `${account.account_type === 'VIRTUAL_WALLET' ? 'Billetera' : 'Banco'} · ${account.bank_name} · ${account.name}`, value: account.id })))
const tabs = computed(() => [
  { label: `Pendientes (${pendingTotal.value})`, value: 'PENDING', icon: 'i-lucide-clock-3' },
  { label: `Historial (${historyTotal.value})`, value: 'HISTORY', icon: 'i-lucide-history' },
])
const sameSelectionGroup = (row: any) => !selectedRows.value.length || (
  row.credit_card_id === selectedRows.value[0].credit_card_id && row.currency_code === selectedRows.value[0].currency_code
)

const load = async (preserveSelection = false) => {
  loading.value = true
  try {
    const [pending, history] = await Promise.all([
      service.pendingCollections(String(pendingPage.value)),
      service.settlements(String(historyPage.value)),
    ])
    rows.value = pending.items
    pendingTotal.value = pending.total
    batches.value = history.items
    historyTotal.value = history.total
    if (!preserveSelection) {
      selectedIds.value = []
      selectedRows.value = []
    }
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar las liquidaciones', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const loadPendingPage = async (page: number) => {
  if (page < 1 || page > Math.ceil(pendingTotal.value / 100)) return
  pendingPage.value = page
  await load(true)
}

const loadHistoryPage = async (page: number) => {
  if (page < 1 || page > Math.ceil(historyTotal.value / 100)) return
  historyPage.value = page
  await load(true)
}

const toggleRow = (row: any, checked: boolean) => {
  if (saving.value || (!sameSelectionGroup(row) && checked)) return
  if (checked) {
    if (selectedIds.value.length >= 500) {
      toast.add({ title: 'Máximo de cobros por liquidación', description: 'Una liquidación puede incluir hasta 500 cobros. Registrá el resto en otro lote.', color: 'warning' })
      return
    }
    selectedIds.value = [...selectedIds.value, row.id]
    selectedRows.value = [...selectedRows.value, row]
  } else {
    selectedIds.value = selectedIds.value.filter(id => id !== row.id)
    selectedRows.value = selectedRows.value.filter(item => item.id !== row.id)
  }
}

const commissionEstimate = (row: any) => row.commission_amount != null
  ? Number(row.commission_amount)
  : Math.round(Number(row.amount || 0) * Number(row.commission_rate ?? row.credit_card?.commission_rate ?? 0)) / 100

const openSettle = () => {
  if (saving.value || !selectedRows.value.length) return
  const commission = selectedRows.value.reduce((sum, row) => sum + commissionEstimate(row), 0)
  Object.assign(form, {
    bank_account_id: '',
    date: today(),
    commission_amount: Number(commission.toFixed(2)),
    tax_amount: 0,
    withholding_amount: 0,
    other_deductions: 0,
    net_amount: 0,
    reference: '',
    notes: '',
  })
  form.net_amount = calculatedNet.value
  modalOpen.value = true
}

watch(calculatedNet, value => {
  if (modalOpen.value) form.net_amount = value
})

const settle = async () => {
  if (saving.value || !selectedIds.value.length || !form.bank_account_id || form.net_amount < 0) return
  saving.value = true
  try {
    await service.settleBatch({ transaction_ids: [...selectedIds.value], ...form })
    toast.add({ title: 'Liquidación registrada', description: `${selectedIds.value.length} cobro(s) agrupados en un movimiento neto de ${money(form.net_amount, selectedCurrency.value)}.`, color: 'success' })
    modalOpen.value = false
    tab.value = 'HISTORY'
    pendingPage.value = 1
    historyPage.value = 1
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo registrar la liquidación', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const closeModal = () => {
  if (!saving.value) modalOpen.value = false
}

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin fecha'
const money = (value: any, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0))
const channelLabel = (row: any) => ({ POS: 'POS', APP: 'App', QR: 'QR', PAYMENT_LINK: 'Link de pago', ECOMMERCE: 'E-commerce', OTHER: 'Otro' } as Record<string, string>)[row?.channel_type] || 'Canal'

onMounted(async () => { await Promise.all([load(), initBanks()]) })
</script>

<template>
  <UPage class="space-y-5">
    <AppPageHeader title="Liquidaciones de cobros" description="Agrupá las ventas que el mismo canal te deposita juntas y conciliá el neto recibido." />
    <UAlert color="info" variant="subtle" icon="i-lucide-wallet-cards" title="El canal y el destino son cosas distintas" description="Mercado Pago, POS, app o QR identifica cómo cobraste; la cuenta de destino indica dónde quedó el dinero. Primero conciliás la liquidación y, si quedó en una billetera, después la transferís al banco." />

    <UCard class="overflow-hidden">
      <UTabs v-model="tab" :items="tabs" />
      <div v-if="tab === 'PENDING'" class="space-y-4 pt-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">Seleccioná cobros del mismo canal y moneda que aparezcan en una misma liquidación del procesador.</p>
          <div class="flex items-center gap-3">
            <UBadge v-if="selectedRows.length" :label="`${selectedRows.length} seleccionados · ${money(gross, selectedCurrency)} bruto`" color="primary" variant="subtle" />
            <UButton label="Registrar liquidación" icon="i-lucide-landmark" :disabled="saving || !selectedRows.length" @click="openSettle" />
          </div>
        </div>
        <div v-if="loading" class="space-y-3"><USkeleton v-for="n in 4" :key="n" class="h-20" /></div>
        <div v-else class="space-y-3">
          <UCard v-for="row in rows" :key="row.id" :ui="{ body: 'p-4 sm:p-4' }">
            <div class="grid items-center gap-4 md:grid-cols-[auto_minmax(0,1.5fr)_repeat(3,minmax(100px,.7fr))]">
              <UCheckbox :model-value="selectedIds.includes(row.id)" :disabled="saving || (!sameSelectionGroup(row) && !selectedIds.includes(row.id))" @update:model-value="toggleRow(row, Boolean($event))" />
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><strong>{{ row.credit_card.name }}</strong><UBadge :label="channelLabel(row.credit_card)" color="neutral" variant="subtle" /></div>
                <p class="truncate text-sm text-muted">{{ row.payment?.party?.name || 'Cliente' }} · {{ row.description || `Cobro #${row.payment?.number ?? '—'}` }}</p>
                <p class="text-xs text-muted">Cobrado {{ dateLabel(row.date) }}<span v-if="row.authorization"> · autorización {{ row.authorization }}</span></p>
              </div>
              <div><p class="text-xs text-muted">Acreditación estimada</p><strong>{{ dateLabel(row.expected_clearing_date) }}</strong></div>
              <div><p class="text-xs text-muted">Bruto</p><strong>{{ money(row.amount, row.currency_code) }}</strong></div>
              <div><p class="text-xs text-muted">Neto estimado</p><strong>{{ money(row.net_amount ?? (Number(row.amount) - commissionEstimate(row)), row.currency_code) }}</strong></div>
            </div>
          </UCard>
          <UAlert v-if="!rows.length" color="neutral" variant="subtle" title="No hay cobros pendientes de liquidación" description="Los cobros con tarjeta aparecerán aquí hasta registrar el depósito del canal." />
          <div v-if="pendingTotal > 100" class="flex items-center justify-between border-t border-default pt-4">
            <p class="text-sm text-muted">Página {{ pendingPage }} de {{ Math.ceil(pendingTotal / 100) }} · {{ pendingTotal }} cobros pendientes</p>
            <div class="flex gap-2">
              <UButton label="Anterior" icon="i-lucide-chevron-left" variant="soft" :disabled="loading || pendingPage <= 1" @click="loadPendingPage(pendingPage - 1)" />
              <UButton label="Siguiente" trailing-icon="i-lucide-chevron-right" variant="soft" :disabled="loading || pendingPage >= Math.ceil(pendingTotal / 100)" @click="loadPendingPage(pendingPage + 1)" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-4 pt-5">
        <p class="text-sm text-muted">Cada registro representa un depósito del procesador e incluye los cobros agrupados y sus descuentos.</p>
        <div v-if="loading" class="space-y-3"><USkeleton v-for="n in 3" :key="n" class="h-24" /></div>
        <div v-else class="space-y-3">
          <UCard v-for="batch in batches" :key="batch.id">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2"><strong>{{ batch.credit_card.name }}</strong><UBadge :label="channelLabel(batch.credit_card)" color="neutral" variant="subtle" /><UBadge :label="`${batch.transaction_count} cobro(s)`" color="primary" variant="subtle" /></div>
                <p class="text-sm text-muted">Acreditado en {{ batch.bank_account.bank_name }} · {{ batch.bank_account.name }} · {{ dateLabel(batch.date) }}</p>
                <p v-if="batch.reference" class="text-xs text-muted">Referencia: {{ batch.reference }}</p>
              </div>
              <div class="grid grid-cols-3 gap-4 text-right">
                <div><p class="text-xs text-muted">Bruto</p><strong>{{ money(batch.gross_amount, batch.currency_code) }}</strong></div>
                <div><p class="text-xs text-muted">Descuentos</p><strong>{{ money(Number(batch.commission_amount) + Number(batch.tax_amount) + Number(batch.withholding_amount) + Number(batch.other_deductions), batch.currency_code) }}</strong></div>
                <div><p class="text-xs text-muted">Neto ingresado</p><strong class="text-success">{{ money(batch.net_amount, batch.currency_code) }}</strong></div>
              </div>
            </div>
            <details class="mt-4 border-t border-default pt-3">
              <summary class="cursor-pointer text-sm font-medium">Ver cobros incluidos ({{ batch.transactions.length }})</summary>
              <div class="mt-2 divide-y divide-default">
                <div v-for="item in batch.transactions" :key="item.id" class="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>{{ item.description || `Pago #${item.payment?.number ?? '—'}` }} · {{ item.payment?.party?.name || 'Cliente' }}</span>
                  <span class="text-muted">Bruto {{ money(item.amount, batch.currency_code) }} · neto {{ money(item.net_amount, batch.currency_code) }}</span>
                </div>
              </div>
            </details>
          </UCard>
          <UAlert v-if="!batches.length" color="neutral" variant="subtle" title="Todavía no hay liquidaciones registradas" />
          <div v-if="historyTotal > 100" class="flex items-center justify-between border-t border-default pt-4">
            <p class="text-sm text-muted">Página {{ historyPage }} de {{ Math.ceil(historyTotal / 100) }} · {{ historyTotal }} liquidaciones</p>
            <div class="flex gap-2">
              <UButton label="Anterior" icon="i-lucide-chevron-left" variant="soft" :disabled="loading || historyPage <= 1" @click="loadHistoryPage(historyPage - 1)" />
              <UButton label="Siguiente" trailing-icon="i-lucide-chevron-right" variant="soft" :disabled="loading || historyPage >= Math.ceil(historyTotal / 100)" @click="loadHistoryPage(historyPage + 1)" />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="modalOpen" title="Conciliar liquidación del canal" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="space-y-5">
          <UAlert v-if="selectedChannel" color="info" variant="subtle" icon="i-lucide-list-checks" :title="`${selectedChannel.name} · ${channelLabel(selectedChannel)} · ${selectedRows.length} cobro(s)`" :description="`Importe bruto agrupado: ${money(gross, selectedCurrency)}. Registrá lo que efectivamente informó y depositó el procesador.`" />
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Destino del dinero" required description="Puede ser la billetera virtual o una cuenta bancaria."><USelectMenu v-model="form.bank_account_id" :items="bankOptions" value-key="value" class="w-full" placeholder="Seleccionar banco o billetera" /></UFormField>
            <UFormField label="Fecha de acreditación" required><UInput v-model="form.date" type="date" class="w-full" /></UFormField>
            <UFormField label="Comisión del procesador"><UInput v-model.number="form.commission_amount" type="number" min="0" step="0.01" class="w-full" /></UFormField>
            <UFormField label="Impuestos de la comisión"><UInput v-model.number="form.tax_amount" type="number" min="0" step="0.01" class="w-full" /></UFormField>
            <UFormField label="Retenciones aplicadas por el canal"><UInput v-model.number="form.withholding_amount" type="number" min="0" step="0.01" class="w-full" /></UFormField>
            <UFormField label="Otros descuentos / ajuste"><UInput v-model.number="form.other_deductions" type="number" min="0" step="0.01" class="w-full" /></UFormField>
            <UFormField label="Referencia de la liquidación" description="Por ejemplo, el ID de depósito que muestra Mercado Pago."><UInput v-model="form.reference" class="w-full" /></UFormField>
            <UFormField label="Observaciones"><UInput v-model="form.notes" class="w-full" /></UFormField>
          </div>
          <div class="grid gap-3 rounded-xl bg-elevated p-4 sm:grid-cols-3">
            <div><p class="text-xs text-muted">Total cobrado (bruto)</p><strong>{{ money(gross, selectedCurrency) }}</strong></div>
            <div><p class="text-xs text-muted">Comisiones, impuestos y retenciones</p><strong>{{ money(deductions, selectedCurrency) }}</strong></div>
            <div><p class="text-xs text-muted">Neto que ingresará a la cuenta elegida</p><strong class="text-lg text-success">{{ money(calculatedNet, selectedCurrency) }}</strong></div>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="Cancelar" variant="ghost" :disabled="saving" @click="closeModal" />
            <UButton label="Confirmar liquidación" icon="i-lucide-landmark" :loading="saving" :disabled="saving || !form.bank_account_id || calculatedNet < 0" @click="settle" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
