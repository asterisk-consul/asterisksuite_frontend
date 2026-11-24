<script setup lang="ts">
import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import type { PendingDocument } from '~/modulos/erp/payments/service/payments.service'

const props = defineProps<{
  open: boolean
  paymentId: string
  paymentType: 'PAYMENT' | 'COLLECTION'
  availableBalance: number
  currencyCode: string
  exchangeRate?: number | string | null
  partyId?: string
  partyName?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const {
  applyAdvance,
  fetchPendingPurchaseDocuments,
  fetchPendingSalesDocuments,
  pendingPurchaseDocuments,
  pendingSalesDocuments
} = usePayments()
const toast = useToast()

const selectedDocIds = ref<string[]>([])
const allocations = ref<Record<string, number>>({})
const submitting = ref(false)
const loadingDocuments = ref(false)
const documentsLoadError = ref<string | null>(null)

const isCollection = computed(() => props.paymentType === 'COLLECTION')

// Ventas ya devuelve el documento elegible según la base configurada en el
// circuito (OV o factura). Ambos circuitos también permiten saldos iniciales.
const filteredDocs = computed(() => {
  if (loadingDocuments.value || documentsLoadError.value) return []
  const docs = isCollection.value
    ? (pendingSalesDocuments.value ?? [])
    : (pendingPurchaseDocuments.value ?? [])
  return docs.filter(d => (isCollection.value
    ? ['ORDER', 'INVOICE', 'OPENING_BALANCE'].includes(d.document_type_category ?? '')
    : ['INVOICE', 'OPENING_BALANCE'].includes(d.document_type_category ?? ''))
    && d.source_type !== 'TREASURY_OBLIGATION'
    && (!props.partyId || d.party_id === props.partyId))
})

const docLabel = computed(() => isCollection.value ? 'Documentos de venta' : 'Documentos de compra')
const emptyDocumentsMessage = computed(() => isCollection.value
  ? `No hay comprobantes de venta elegibles con saldo pendiente${props.partyName ? ` para ${props.partyName}` : ''}. Podés asociar documentos del mismo cliente; el circuito define si corresponde una OV o una factura.`
  : `No hay facturas ni saldos iniciales de compra confirmados con saldo pendiente${props.partyName ? ` para ${props.partyName}` : ''}. Solo se pueden asociar documentos del mismo proveedor.`)
const flowLabel = computed(() => isCollection.value ? 'Cobro anticipado · Ventas' : 'Pago anticipado · Compras')
const flowDescription = computed(() => isCollection.value
  ? `Elegí uno o varios documentos pendientes${props.partyName ? ` de ${props.partyName}` : ''} y distribuí el anticipo. El circuito define si el saldo comercial corresponde a la OV o a la factura.`
  : `Elegí una o varias facturas o saldos iniciales pendientes${props.partyName ? ` de ${props.partyName}` : ''} y distribuí el anticipo.`)
const documentKindLabel = (document: PendingDocument) => {
  if (document.document_type_category === 'ORDER') return 'Orden de venta'
  if (document.document_type_category === 'INVOICE') return isCollection.value ? 'Factura de venta' : 'Factura de compra'
  if (document.document_type_category === 'OPENING_BALANCE') return 'Saldo inicial'
  return document.document_type_description || 'Comprobante'
}
const documentOptions = computed(() => filteredDocs.value.map(document => ({
  label: [
    `${documentKindLabel(document)} · ${document.document_type_code || 'Comprobante'} #${document.number}`,
    document.reference,
    formatDate(document.date),
    `Pendiente ${formatCurrency(document.pending_amount, document.currency_code)}`,
  ].filter(Boolean).join(' · '),
  value: document.id,
})))
const applicableExchangeRate = (document: PendingDocument) => {
  const candidates = [props.exchangeRate, document.exchange_rate]
    .map(value => value == null ? null : Number(value))
  return candidates.find(rate => rate != null && Number.isFinite(rate) && rate > 0) ?? null
}
const paymentCurrency = computed(() => (props.currencyCode || 'ARS').toUpperCase())
const documentCurrency = (document: PendingDocument) => (document.currency_code || paymentCurrency.value).toUpperCase()
const needsCurrencyConversion = (document: PendingDocument) => documentCurrency(document) !== paymentCurrency.value
const supportedCurrencyPair = (document: PendingDocument) => ['USD', 'ARS'].includes(documentCurrency(document))
  && ['USD', 'ARS'].includes(paymentCurrency.value)
const currencyConversionError = (document: PendingDocument) => {
  if (!needsCurrencyConversion(document)) return null
  const currency = documentCurrency(document)
  if (!supportedCurrencyPair(document)) {
    return `No hay una conversión configurada entre ${currency} y ${paymentCurrency.value}.`
  }
  if (!applicableExchangeRate(document)) {
    return 'Falta una cotización válida en el anticipo o en el documento. No se aplicará el saldo usando una relación 1 a 1.'
  }
  return null
}
const pendingAmountInPaymentCurrency = (document: PendingDocument) => {
  const value = Number(document.pending_amount)
  const from = documentCurrency(document)
  const to = paymentCurrency.value
  const rate = applicableExchangeRate(document)
  if (from === to) return Number(value.toFixed(2))
  if (!rate || !supportedCurrencyPair(document)) return 0
  if (from === 'USD' && to === 'ARS') return Number((value * rate).toFixed(2))
  if (from === 'ARS' && to === 'USD') return Number((value / rate).toFixed(2))
  return 0
}
const maxApplicableAmount = (document: PendingDocument) => pendingAmountInPaymentCurrency(document)
const currencyConversionHint = (document: PendingDocument) => {
  const rate = applicableExchangeRate(document)
  if (!needsCurrencyConversion(document) || currencyConversionError(document) || !rate) return null
  return `El saldo en ${documentCurrency(document)} se convierte a ${paymentCurrency.value} con la cotización ${rate.toLocaleString('es-AR')}.`
}
const allocationRows = computed(() => selectedDocIds.value
  .map(id => filteredDocs.value.find(document => document.id === id))
  .filter((document): document is PendingDocument => Boolean(document))
  .map(document => ({
    document,
    amount: Number(allocations.value[document.id] ?? 0),
    max: maxApplicableAmount(document),
    conversionError: currencyConversionError(document),
    conversionHint: currencyConversionHint(document),
  })))
const allocatedTotal = computed(() => Number(allocationRows.value.reduce((sum, row) => sum + row.amount, 0).toFixed(2)))
const remainingBalance = computed(() => Number(Math.max(0, props.availableBalance - allocatedTotal.value).toFixed(2)))
const canSubmit = computed(() => Boolean(
  allocationRows.value.some(row => row.amount > 0)
  && allocationRows.value.every(row => row.amount >= 0
    && row.amount <= row.max + 0.001
    && (row.amount <= 0 || !row.conversionError))
  && allocatedTotal.value <= props.availableBalance + 0.001
  && !loadingDocuments.value
  && !documentsLoadError.value
  && !submitting.value,
))

const distributeAvailable = () => {
  const next: Record<string, number> = {}
  let remaining = Math.max(0, Math.floor(props.availableBalance * 100) / 100)
  const rows = allocationRows.value
  rows.forEach((row, index) => {
    const slots = rows.length - index
    const share = Math.floor((remaining / slots) * 100) / 100
    const amount = Math.min(row.max, share)
    next[row.document.id] = Number(amount.toFixed(2))
    remaining = Number((remaining - amount).toFixed(2))
  })
  // Reparte sobrantes cuando algún documento tiene menos saldo que su parte.
  for (const row of rows) {
    if (remaining <= 0) break
    const current = next[row.document.id] ?? 0
    const extra = Math.min(remaining, Math.max(0, row.max - current))
    next[row.document.id] = Number((current + extra).toFixed(2))
    remaining = Number((remaining - extra).toFixed(2))
  }
  allocations.value = next
}

watch(selectedDocIds, () => distributeAvailable(), { deep: true })

const setAllocation = (documentId: string, value: unknown) => {
  const amount = Number(value)
  const row = allocationRows.value.find(item => item.document.id === documentId)
  if (!row) return
  const allocatedToOtherDocs = allocationRows.value.reduce(
    (sum, item) => item.document.id === documentId ? sum : sum + item.amount,
    0,
  )
  const availableForRow = Math.max(0, props.availableBalance - allocatedToOtherDocs)
  const maxAllowed = Math.min(row.max, availableForRow)
  allocations.value = {
    ...allocations.value,
    [documentId]: Number.isFinite(amount)
      ? Number(Math.min(maxAllowed, Math.max(0, amount)).toFixed(2))
      : 0,
  }
}

const applyMaximum = (documentId: string) => {
  const row = allocationRows.value.find(item => item.document.id === documentId)
  if (!row) return
  const availableForRow = Math.max(0, props.availableBalance - allocatedTotal.value + row.amount)
  setAllocation(documentId, Math.min(row.max, availableForRow))
}

const loadPendingDocuments = async () => {
  loadingDocuments.value = true
  documentsLoadError.value = null
  selectedDocIds.value = []
  allocations.value = {}
  try {
    if (isCollection.value) {
      await fetchPendingSalesDocuments(props.partyId)
    } else {
      await fetchPendingPurchaseDocuments(props.partyId)
    }
  } catch (error: any) {
    documentsLoadError.value = error?.data?.message
      || error?.message
      || 'No se pudieron consultar las facturas pendientes.'
  } finally {
    loadingDocuments.value = false
  }
}

watch([() => props.open, () => props.paymentType, () => props.partyId], ([open]) => {
  if (open) void loadPendingDocuments()
}, { immediate: true })

const handleSubmit = async () => {
  if (submitting.value) return
  if (!canSubmit.value) return

  submitting.value = true
  try {
    await applyAdvance(props.paymentId, {
      applications: allocationRows.value
        .filter(row => row.amount > 0)
        .map(row => ({ document_id: row.document.id, amount: row.amount })),
    })
    emit('success')
    emit('update:open', false)
    selectedDocIds.value = []
    allocations.value = {}
  } catch (e: any) {
    toast.add({
      title: 'Error al aplicar anticipo',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    submitting.value = false
  }
}

const formatCurrency = (value: number, currencyCode = props.currencyCode || 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(value)
}

const formatDate = (value: string) => new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${value.slice(0, 10)}T12:00:00`))
</script>

<template>
  <UModal
    :open="open"
    :title="isCollection ? 'Aplicar cobro anticipado' : 'Aplicar pago anticipado'"
    description="Distribuí el saldo disponible entre uno o varios documentos pendientes del mismo tercero."
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon :name="isCollection ? 'i-lucide-hand-coins' : 'i-lucide-wallet-cards'" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium">{{ flowLabel }}</p>
              <UBadge :label="isCollection ? 'Cobro → venta' : 'Pago → compra'" color="primary" variant="subtle" />
            </div>
            <p class="mt-1 text-sm text-muted">{{ flowDescription }}</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default p-4">
            <div>
              <p class="text-xs text-muted">Disponible del anticipo</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatCurrency(availableBalance) }}</p>
            </div>
            <UBadge :label="currencyCode || 'ARS'" color="neutral" variant="subtle" />
          </div>
          <div class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default p-4">
            <div>
              <p class="text-xs text-muted">{{ isCollection ? 'Documentos elegibles' : 'Documentos con saldo' }}</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">{{ loadingDocuments ? '…' : filteredDocs.length }}</p>
            </div>
            <UIcon name="i-lucide-files" class="size-5 text-muted" />
          </div>
          <div class="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div>
              <p class="text-xs text-muted">Saldo a distribuir</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatCurrency(remainingBalance) }}</p>
            </div>
            <UIcon name="i-lucide-wallet" class="size-5 text-primary" />
          </div>
        </div>

        <UFormField :label="docLabel" name="document_ids" required :hint="partyName || undefined">
          <USelectMenu
            v-model="selectedDocIds"
            value-key="value"
            :items="documentOptions"
            :placeholder="loadingDocuments ? 'Buscando comprobantes…' : 'Buscar y seleccionar documentos'"
            searchable
            multiple
            :loading="loadingDocuments"
            :disabled="loadingDocuments || Boolean(documentsLoadError) || filteredDocs.length === 0"
            class="w-full"
          />
        </UFormField>
        <div v-if="allocationRows.length" class="-mt-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-muted">Seleccionados: {{ allocationRows.length }} · Aplicado en este paso: {{ formatCurrency(allocatedTotal) }}</p>
          <UButton
            label="Distribuir disponible"
            icon="i-lucide-split"
            size="xs"
            color="neutral"
            variant="outline"
            :disabled="submitting || availableBalance <= 0"
            @click="distributeAvailable"
          />
        </div>

        <UAlert
          v-if="documentsLoadError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="No se pudieron cargar los comprobantes"
          :description="documentsLoadError"
        />
        <UButton
          v-if="documentsLoadError"
          label="Volver a buscar"
          icon="i-lucide-refresh-cw"
          size="xs"
          variant="link"
          class="-mt-4 self-start px-0"
          :disabled="loadingDocuments"
          @click="loadPendingDocuments"
        />
        <UAlert
          v-if="!documentsLoadError && !loadingDocuments && filteredDocs.length === 0"
          color="warning"
          variant="subtle"
          icon="i-lucide-file-search"
          title="No hay comprobantes disponibles"
          :description="emptyDocumentsMessage"
        />
        <UButton
          v-if="!loadingDocuments && !documentsLoadError && filteredDocs.length === 0"
          label="Actualizar lista"
          icon="i-lucide-refresh-cw"
          size="xs"
          variant="link"
          class="-mt-4 self-start px-0"
          @click="loadPendingDocuments"
        />

        <div v-if="allocationRows.length" class="flex max-h-[45vh] flex-col gap-3 overflow-y-auto pr-1">
          <div v-for="row in allocationRows" :key="row.document.id" class="flex flex-col gap-3 rounded-xl border border-default p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-muted">{{ documentKindLabel(row.document) }}</p>
                <p class="mt-1 font-semibold">{{ row.document.document_type_code || 'Documento' }} #{{ row.document.number }}</p>
                <p v-if="row.document.reference" class="mt-1 text-sm text-muted">{{ row.document.reference }}</p>
              </div>
              <UBadge :label="formatDate(row.document.date)" color="neutral" variant="subtle" />
            </div>

            <div class="grid gap-2 sm:grid-cols-3">
              <div class="rounded-lg bg-muted/30 p-3">
                <p class="text-xs text-muted">Total</p>
                <p class="mt-1 font-medium tabular-nums">{{ formatCurrency(row.document.total, row.document.currency_code) }}</p>
              </div>
              <div class="rounded-lg bg-muted/30 p-3">
                <p class="text-xs text-muted">Ya aplicado</p>
                <p class="mt-1 font-medium tabular-nums">{{ formatCurrency(row.document.paid_amount, row.document.currency_code) }}</p>
              </div>
              <div class="rounded-lg border border-warning/25 bg-warning/5 p-3">
                <p class="text-xs text-muted">Saldo pendiente</p>
                <p class="mt-1 font-semibold tabular-nums">{{ formatCurrency(row.document.pending_amount, row.document.currency_code) }}</p>
              </div>
            </div>

            <UAlert
              v-if="row.conversionError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              title="Este documento necesita una cotización"
              :description="row.conversionError"
            />

            <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
              <UFormField :label="`Importe a aplicar (${paymentCurrency})`" :name="`amount-${row.document.id}`" class="min-w-0 flex-1">
                <UInput
                  :model-value="row.amount"
                  type="number"
                  :min="0"
                  :max="Math.min(row.max, Math.max(0, availableBalance - allocatedTotal + row.amount))"
                  :step="0.01"
                  :disabled="loadingDocuments || submitting || Boolean(row.conversionError)"
                  class="w-full"
                  @update:model-value="setAllocation(row.document.id, $event)"
                >
                  <template #trailing>
                    <span class="text-xs text-muted">{{ currencyCode || 'ARS' }}</span>
                  </template>
                </UInput>
              </UFormField>
              <UButton
                label="Aplicar máximo"
                icon="i-lucide-arrow-down-to-line"
                color="neutral"
                variant="outline"
                :disabled="row.max <= 0 || Boolean(row.conversionError) || submitting"
                @click="applyMaximum(row.document.id)"
              />
            </div>
            <p v-if="row.conversionHint" class="text-xs text-muted">{{ row.conversionHint }}</p>
            <p v-else class="text-xs text-muted">El importe se carga en {{ paymentCurrency }} y queda limitado por el saldo de la factura y el disponible del anticipo.</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" :disabled="submitting" @click="emit('update:open', false)" />
        <UButton
          label="Aplicar"
          color="info"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
