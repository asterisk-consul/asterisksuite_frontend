<script setup lang="ts">
import { useCurrentAccountsService } from '~/modulos/erp/current-accounts/service/current-accounts.service'
import { usePaymentsService, type PendingDocument } from '~/modulos/erp/payments/service/payments.service'
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import type { WithholdingProposal } from '~/modulos/erp/fiscal/types/fiscal.types'

const props = defineProps<{ open: boolean; account: CurrentAccount; balance: number }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

type WithholdingForm = WithholdingProposal & {
  is_manual?: boolean
  calculation_mode?: 'RATE' | 'AMOUNT'
}

const toast = useToast()
const accountService = useCurrentAccountsService()
const paymentsService = usePaymentsService()
const fiscalService = useFiscalService()
const { init: initCurrencies, codeSelectItems: currencyOptions, baseCurrency } = useCurrencies()
const { rateType, loading: rateLoading, autoResolve, setManualRate } = useExchangeRate()

const saving = ref(false)
const loadingDocuments = ref(false)
const calculating = ref(false)
const date = ref('')
const currencyCode = ref('ARS')
const exchangeRateInput = ref<number | null>(null)
const baseAmount = ref(0)
const description = ref('')
const openingBalanceDocumentId = ref<string | undefined>()
const openingBalanceDocuments = ref<PendingDocument[]>([])
const withholdings = ref<WithholdingForm[]>([])
const skipped = ref<{ tax_type: string; reason: string }[]>([])
const taxTypes = ['GANANCIAS', 'IIBB', 'SUSS', 'IVA']

const openingBalanceOptions = computed(() => openingBalanceDocuments.value.map(document => ({
  label: `${document.document_type_code ?? 'Saldo inicial'} #${document.number} · Pendiente ${formatCurrency(document.pending_amount, document.currency_code)}`,
  value: document.id,
})))
const selectedOpeningBalance = computed(() => openingBalanceDocuments.value.find(document => document.id === openingBalanceDocumentId.value) ?? null)
const totalWithheld = computed(() => withholdings.value.reduce((sum, withholding) => sum + (Number(withholding.withheld_amount) || 0), 0))

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatCurrency(amount: number | string | null | undefined, currency = 'ARS') {
  const value = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  }
}

function rounded(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function convertAmount(amount: number, fromCurrency: string, toCurrency: string) {
  const from = fromCurrency.toUpperCase()
  const to = toCurrency.toUpperCase()
  if (from === to) return rounded(amount)
  const rate = Number(exchangeRateInput.value ?? selectedOpeningBalance.value?.exchange_rate)
  if (!Number.isFinite(rate) || rate <= 0 || !['ARS', 'USD'].includes(from) || !['ARS', 'USD'].includes(to)) return null
  return from === 'USD' && to === 'ARS' ? rounded(amount * rate) : rounded(amount / rate)
}

const documentAmountApplied = computed(() => {
  if (!selectedOpeningBalance.value) return 0
  return convertAmount(totalWithheld.value, currencyCode.value, selectedOpeningBalance.value.currency_code) ?? 0
})
const documentPendingAfter = computed(() => selectedOpeningBalance.value
  ? Math.max(0, Number(selectedOpeningBalance.value.pending_amount) - documentAmountApplied.value)
  : null)

function recalculateManualWithholding(withholding: WithholdingForm) {
  if (!withholding.is_manual) return
  withholding.withheld_amount = rounded((Number(withholding.base_amount) * Number(withholding.rate) || 0) / 100)
}

function addManualWithholding() {
  withholdings.value.push({
    is_manual: true,
    tax_type: 'GANANCIAS',
    jurisdiction_id: null,
    jurisdiction_name: null,
    withholding_concept_id: null,
    tax_rule_id: null,
    rule_name: 'Manual',
    base_amount: baseAmount.value,
    prorrate_percentage: null,
    rate: 0,
    withheld_amount: 0,
    automatic_amount: 0,
    reason: 'Carga manual',
    calculation_mode: 'RATE',
  })
}

async function loadOpeningBalances() {
  loadingDocuments.value = true
  try {
    const pending = props.account.party_type === 'CUSTOMER'
      ? await paymentsService.findPendingSalesDocuments(props.account.party_id)
      : await paymentsService.findPendingPurchaseDocuments(props.account.party_id)
    openingBalanceDocuments.value = pending.filter(document =>
      document.document_type_category === 'OPENING_BALANCE' && document.pending_amount > 0,
    )
  } catch (error: any) {
    openingBalanceDocuments.value = []
    toast.add({ title: 'No se pudo consultar el saldo inicial pendiente', description: error?.data?.message ?? error.message, color: 'warning' })
  } finally {
    loadingDocuments.value = false
  }
}

async function resolveRateForCurrency() {
  const base = baseCurrency.value?.code ?? 'ARS'
  if (currencyCode.value.toUpperCase() === base.toUpperCase()) {
    exchangeRateInput.value = null
    if (selectedOpeningBalance.value) {
      const converted = convertAmount(Number(selectedOpeningBalance.value.pending_amount), selectedOpeningBalance.value.currency_code, currencyCode.value)
      if (converted != null) baseAmount.value = converted
    } else {
      baseAmount.value = Math.abs(Number(props.balance))
    }
    return
  }
  const requestedCurrency = currencyCode.value
  const rate = await autoResolve(requestedCurrency, base, rateType.value)
  if (currencyCode.value !== requestedCurrency) return
  exchangeRateInput.value = rate
  if (selectedOpeningBalance.value) {
    const converted = convertAmount(Number(selectedOpeningBalance.value.pending_amount), selectedOpeningBalance.value.currency_code, currencyCode.value)
    if (converted != null) baseAmount.value = converted
  } else if (rate && base.toUpperCase() === 'ARS' && currencyCode.value.toUpperCase() === 'USD') {
    baseAmount.value = rounded(Math.abs(Number(props.balance)) / rate)
  }
}

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  withholdings.value = []
  skipped.value = []
  description.value = ''
  openingBalanceDocumentId.value = undefined
  date.value = todayLocal()
  await initCurrencies()
  currencyCode.value = baseCurrency.value?.code ?? props.account.currency_code ?? 'ARS'
  baseAmount.value = Math.abs(Number(props.balance))
  await Promise.all([loadOpeningBalances(), resolveRateForCurrency()])
}, { immediate: true })

watch(currencyCode, async () => {
  if (props.open) await resolveRateForCurrency()
})

watch(openingBalanceDocumentId, (documentId) => {
  const document = openingBalanceDocuments.value.find(item => item.id === documentId)
  if (!document) return
  const converted = convertAmount(Number(document.pending_amount), document.currency_code, currencyCode.value)
  if (converted != null) baseAmount.value = converted
})

async function calculateSuggested() {
  if (!baseAmount.value || baseAmount.value <= 0) return
  calculating.value = true
  try {
    const preview = await fiscalService.previewWithholdings({
      party_id: props.account.party_id,
      base_amount: Number(baseAmount.value),
      date: date.value,
      operation_type: props.account.party_type === 'CUSTOMER' ? 'SALE' : 'PURCHASE',
    })
    withholdings.value = preview.proposals.map(proposal => ({ ...proposal, is_manual: false }))
    skipped.value = preview.skipped
    if (preview.proposals.length) {
      toast.add({ title: `${preview.proposals.length} retención(es) sugerida(s)`, description: `Total: ${formatCurrency(preview.total_withheld, currencyCode.value)}`, color: 'info' })
    } else {
      toast.add({ title: 'No hay retenciones sugeridas para este tercero', color: 'info' })
    }
  } catch (error: any) {
    toast.add({ title: 'No se pudieron calcular retenciones', description: error?.data?.message ?? error.message, color: 'warning' })
  } finally {
    calculating.value = false
  }
}

async function submit() {
  if (saving.value) return
  const validWithholdings = withholdings.value.filter(withholding => Number(withholding.withheld_amount) > 0)
  if (!validWithholdings.length || totalWithheld.value <= 0) {
    toast.add({ title: 'Agregá retenciones con un importe mayor a cero', color: 'warning' })
    return
  }
  if (validWithholdings.some(withholding => Number(withholding.base_amount) <= 0)) {
    toast.add({ title: 'Cada retención requiere una base imponible mayor a cero', color: 'warning' })
    return
  }
  if (selectedOpeningBalance.value && documentAmountApplied.value > Number(selectedOpeningBalance.value.pending_amount) + 0.01) {
    toast.add({ title: 'La retención supera el saldo inicial pendiente', color: 'error' })
    return
  }
  saving.value = true
  try {
    await accountService.registerWithholdings(props.account.party_id, {
      party_id: props.account.party_id,
      party_type: props.account.party_type,
      currency_code: currencyCode.value,
      exchange_rate: exchangeRateInput.value ?? undefined,
      rate_type: rateType.value,
      date: date.value,
      description: description.value.trim() || undefined,
      opening_balance_document_id: openingBalanceDocumentId.value,
      withholdings: validWithholdings.map(withholding => ({
        tax_type: withholding.tax_type,
        jurisdiction_id: withholding.jurisdiction_id ?? undefined,
        withholding_concept_id: withholding.withholding_concept_id ?? undefined,
        tax_rule_id: withholding.tax_rule_id ?? undefined,
        base_amount: Number(withholding.base_amount),
        rate: Number(withholding.rate) || undefined,
        withheld_amount: Number(withholding.withheld_amount),
        automatic_amount: withholding.is_manual ? undefined : Number(withholding.automatic_amount ?? withholding.withheld_amount),
        manual_amount: withholding.is_manual ? Number(withholding.withheld_amount) : undefined,
        observations: withholding.reason,
      })),
    })
    toast.add({
      title: 'Retenciones registradas',
      description: `Se aplicaron ${formatCurrency(totalWithheld.value, currencyCode.value)} a la cuenta corriente${selectedOpeningBalance.value ? ` · pendiente del saldo inicial: ${formatCurrency(documentPendingAfter.value, selectedOpeningBalance.value.currency_code)}` : ''}.`,
      color: 'success',
    })
    emit('update:open', false)
    emit('saved')
  } catch (error: any) {
    toast.add({ title: 'No se pudieron registrar las retenciones', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="Registrar retención en cuenta corriente"
    description="Usa las mismas retenciones sugeridas o manuales de pagos y cobros, sin crear un pago ni un movimiento de caja o banco."
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-4xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="rounded-xl border border-info/30 bg-info/5 p-4 text-sm">
          <p class="font-medium">{{ account.party?.name }} · {{ account.party_type === 'CUSTOMER' ? 'Retención sufrida' : 'Retención practicada' }}</p>
          <p class="mt-1 text-muted">La retención reduce el saldo de esta cuenta. Si la vinculás al saldo inicial, también descuenta el pendiente de ese documento.</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UFormField label="Fecha" required><UInput v-model="date" type="date" class="w-full" /></UFormField>
          <UFormField label="Moneda" required>
            <USelectMenu v-model="currencyCode" :items="currencyOptions" value-key="value" class="w-full" />
          </UFormField>
          <UFormField v-if="currencyCode !== (baseCurrency?.code ?? 'ARS')" label="Tipo de cambio" :description="rateLoading ? 'Buscando cotización…' : 'Pesos por unidad de moneda extranjera'" required>
            <UInput v-model.number="exchangeRateInput" type="number" min="0.000001" step="0.000001" class="w-full" @update:model-value="value => setManualRate(Number(value))" />
          </UFormField>
          <UFormField label="Base imponible" required>
            <UInput v-model.number="baseAmount" type="number" min="0.01" step="0.01" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Aplicar al saldo inicial" :description="loadingDocuments ? 'Buscando saldos iniciales…' : 'Opcional. Si no elegís uno, la retención solo afecta la cuenta corriente y los reportes fiscales.'">
          <USelectMenu
            v-model="openingBalanceDocumentId"
            :items="openingBalanceOptions"
            value-key="value"
            :loading="loadingDocuments"
            class="w-full"
            placeholder="Registrar solo en la cuenta corriente"
          />
        </UFormField>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-medium">Retenciones</h3>
          <div class="flex gap-2">
            <UButton label="Calcular sugeridas" size="sm" variant="outline" icon="i-lucide-calculator" :loading="calculating" :disabled="baseAmount <= 0" @click="calculateSuggested" />
            <UButton label="Agregar manual" size="sm" variant="ghost" icon="i-lucide-plus" @click="addManualWithholding" />
          </div>
        </div>

        <p v-if="!withholdings.length" class="text-sm text-muted">Calculá las retenciones sugeridas para este tercero o agregá una manual.</p>
        <div v-else class="flex flex-col gap-2">
          <div class="hidden grid-cols-12 gap-2 px-2 text-[10px] font-medium uppercase tracking-wide text-muted sm:grid">
            <span class="col-span-3">Impuesto</span><span class="col-span-2">Base</span><span class="col-span-2">Alícuota %</span><span class="col-span-3">Importe</span><span class="col-span-1">Jurisd.</span><span class="col-span-1" />
          </div>
          <div v-for="(withholding, index) in withholdings" :key="index" class="grid grid-cols-2 gap-2 rounded-lg border border-default p-3 sm:grid-cols-12 sm:items-center sm:p-2">
            <USelectMenu v-model="withholding.tax_type" :items="taxTypes" size="sm" class="w-full sm:col-span-3" />
            <UInput v-model.number="withholding.base_amount" type="number" min="0.01" step="0.01" size="sm" class="w-full sm:col-span-2" aria-label="Base imponible" @update:model-value="withholding.is_manual && withholding.calculation_mode === 'RATE' ? recalculateManualWithholding(withholding) : undefined" />
            <UInput v-model.number="withholding.rate" type="number" min="0" step="0.0001" size="sm" class="w-full sm:col-span-2" aria-label="Alícuota porcentual" @update:model-value="withholding.is_manual ? (withholding.calculation_mode = 'RATE', recalculateManualWithholding(withholding)) : undefined" />
            <UInput v-model.number="withholding.withheld_amount" type="number" min="0.01" step="0.01" size="sm" class="w-full sm:col-span-3" aria-label="Importe retenido" @update:model-value="withholding.is_manual ? withholding.calculation_mode = 'AMOUNT' : undefined" />
            <span class="truncate text-xs text-muted sm:col-span-1">{{ withholding.jurisdiction_name ?? '—' }}</span>
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" aria-label="Quitar retención" class="justify-self-end sm:col-span-1" @click="withholdings.splice(index, 1)" />
          </div>
          <div class="flex justify-between border-t border-default pt-3 text-sm">
            <span class="text-muted">Total retenciones</span>
            <span class="font-semibold">{{ formatCurrency(totalWithheld, currencyCode) }}</span>
          </div>
          <div v-if="selectedOpeningBalance" class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <p>Pendiente del saldo inicial después de imputar: <strong>{{ formatCurrency(documentPendingAfter, selectedOpeningBalance.currency_code) }}</strong></p>
            <p v-if="currencyCode !== selectedOpeningBalance.currency_code" class="mt-1 text-xs text-muted">Aplicación convertida: {{ formatCurrency(documentAmountApplied, selectedOpeningBalance.currency_code) }} · Cotización {{ exchangeRateInput ?? selectedOpeningBalance.exchange_rate ?? 'sin definir' }}</p>
          </div>
          <div v-if="skipped.length" class="space-y-1 text-xs text-muted">
            <p v-for="(item, index) in skipped" :key="index">{{ item.tax_type }}: {{ item.reason }}</p>
          </div>
        </div>

        <UFormField label="Observaciones"><UInput v-model="description" class="w-full" placeholder="Referencia o motivo de la retención" /></UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" :disabled="saving" @click="emit('update:open', false)" />
        <UButton label="Registrar retenciones" icon="i-lucide-hand-coins" :loading="saving" :disabled="!withholdings.length || totalWithheld <= 0" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
