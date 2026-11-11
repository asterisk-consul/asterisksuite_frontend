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

const selectedDocId = ref<string>('')
const amount = ref<number>(0)
const submitting = ref(false)
const loadingDocuments = ref(false)
const documentsLoadError = ref<string | null>(null)

const isCollection = computed(() => props.paymentType === 'COLLECTION')

// Ventas ya devuelve el documento elegible según la base configurada en el
// circuito (OV o factura). Compras permite aplicar anticipos solo a facturas.
const filteredDocs = computed(() => {
  if (loadingDocuments.value || documentsLoadError.value) return []
  const docs = isCollection.value
    ? (pendingSalesDocuments.value ?? [])
    : (pendingPurchaseDocuments.value ?? [])
  return docs.filter(d => (isCollection.value
    ? ['ORDER', 'INVOICE'].includes(d.document_type_category ?? '')
    : d.document_type_category === 'INVOICE')
    && d.source_type !== 'TREASURY_OBLIGATION'
    && (!props.partyId || d.party_id === props.partyId))
})

const selectedDoc = computed(() => {
  return filteredDocs.value.find(d => d.id === selectedDocId.value) ?? null
})

const docLabel = computed(() => isCollection.value ? 'Documento de venta' : 'Factura de compra')
const emptyDocumentsMessage = computed(() => isCollection.value
  ? `No hay comprobantes de venta elegibles con saldo pendiente${props.partyName ? ` para ${props.partyName}` : ''}. Solo se pueden asociar documentos del mismo cliente. El circuito de ventas define si corresponde una OV o una factura.`
  : `No hay facturas de compra confirmadas con saldo pendiente${props.partyName ? ` para ${props.partyName}` : ''}. Solo se pueden asociar facturas del mismo proveedor.`)
const flowLabel = computed(() => isCollection.value ? 'Cobro anticipado · Ventas' : 'Pago anticipado · Compras')
const flowDescription = computed(() => isCollection.value
  ? `El circuito de ventas define si corresponde cobrar sobre la OV o sobre la factura. Elegí el documento pendiente${props.partyName ? ` de ${props.partyName}` : ''} y definí cuánto aplicar.`
  : `Seleccioná un comprobante de compra pendiente${props.partyName ? ` de ${props.partyName}` : ''} y definí cuánto del anticipo querés aplicar.`)
const documentKindLabel = (document: PendingDocument) => {
  if (document.document_type_category === 'ORDER') return 'Orden de venta'
  if (document.document_type_category === 'INVOICE') return isCollection.value ? 'Factura de venta' : 'Factura de compra'
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
const applicableExchangeRate = computed(() => {
  const candidates = [props.exchangeRate, selectedDoc.value?.exchange_rate]
    .map(value => value == null ? null : Number(value))
  return candidates.find(rate => rate != null && Number.isFinite(rate) && rate > 0) ?? null
})
const paymentCurrency = computed(() => (props.currencyCode || 'ARS').toUpperCase())
const documentCurrency = computed(() => (selectedDoc.value?.currency_code || paymentCurrency.value).toUpperCase())
const needsCurrencyConversion = computed(() => Boolean(selectedDoc.value && documentCurrency.value !== paymentCurrency.value))
const supportedCurrencyPair = computed(() => ['USD', 'ARS'].includes(documentCurrency.value)
  && ['USD', 'ARS'].includes(paymentCurrency.value))
const currencyConversionError = computed(() => {
  if (!needsCurrencyConversion.value) return null
  if (!supportedCurrencyPair.value) {
    return `No hay una conversión configurada entre ${documentCurrency.value} y ${paymentCurrency.value}.`
  }
  if (!applicableExchangeRate.value) {
    return 'Falta una cotización válida en el anticipo o en la factura. No se aplicará el saldo usando una relación 1 a 1.'
  }
  return null
})
const pendingAmountInPaymentCurrency = computed(() => {
  if (!selectedDoc.value) return 0
  const value = Number(selectedDoc.value.pending_amount)
  const from = documentCurrency.value
  const to = paymentCurrency.value
  const rate = applicableExchangeRate.value
  if (from === to) return Number(value.toFixed(2))
  if (!rate || !supportedCurrencyPair.value) return 0
  if (from === 'USD' && to === 'ARS') return Number((value * rate).toFixed(2))
  if (from === 'ARS' && to === 'USD') return Number((value / rate).toFixed(2))
  return 0
})
const maxApplicableAmount = computed(() => selectedDoc.value
  ? Math.min(props.availableBalance, pendingAmountInPaymentCurrency.value)
  : 0)
const currencyConversionHint = computed(() => {
  if (!needsCurrencyConversion.value || currencyConversionError.value || !applicableExchangeRate.value) return null
  return `El saldo en ${documentCurrency.value} se convierte a ${paymentCurrency.value} con la cotización ${applicableExchangeRate.value.toLocaleString('es-AR')}.`
})
const canSubmit = computed(() => Boolean(
  selectedDoc.value
  && amount.value > 0
  && amount.value <= maxApplicableAmount.value + 0.001
  && !currencyConversionError.value
  && !loadingDocuments.value
  && !documentsLoadError.value
  && !submitting.value,
))

// Default amount to min of available balance and doc pending
watch(selectedDocId, () => {
  if (selectedDoc.value) {
    amount.value = maxApplicableAmount.value
  }
})

const loadPendingDocuments = async () => {
  loadingDocuments.value = true
  documentsLoadError.value = null
  selectedDocId.value = ''
  amount.value = 0
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
  if (!canSubmit.value || !selectedDoc.value) return

  submitting.value = true
  try {
    await applyAdvance(props.paymentId, {
      document_id: selectedDocId.value,
      amount: amount.value,
    })
    emit('success')
    emit('update:open', false)
    selectedDocId.value = ''
    amount.value = 0
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
    description="Asociá el saldo disponible con un comprobante pendiente del mismo tercero."
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

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default p-4">
            <div>
              <p class="text-xs text-muted">Disponible del anticipo</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatCurrency(availableBalance) }}</p>
            </div>
            <UBadge :label="currencyCode || 'ARS'" color="neutral" variant="subtle" />
          </div>
          <div class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default p-4">
            <div>
              <p class="text-xs text-muted">{{ isCollection ? 'Documentos de venta elegibles' : 'Facturas con saldo' }}</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">{{ loadingDocuments ? '…' : filteredDocs.length }}</p>
            </div>
            <UIcon name="i-lucide-files" class="size-5 text-muted" />
          </div>
        </div>

        <UFormField :label="docLabel" name="document_id" required :hint="partyName || undefined">
          <USelectMenu
            v-model="selectedDocId"
            value-key="value"
            :items="documentOptions"
            :placeholder="loadingDocuments ? 'Buscando comprobantes…' : 'Buscar por número o referencia'"
            searchable
            :loading="loadingDocuments"
            :disabled="loadingDocuments || Boolean(documentsLoadError) || filteredDocs.length === 0"
            class="w-full"
          />
        </UFormField>

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

        <div v-if="selectedDoc" class="flex flex-col gap-4 rounded-xl border border-default p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs text-muted">{{ documentKindLabel(selectedDoc) }} seleccionado</p>
              <p class="mt-1 font-semibold">{{ selectedDoc.document_type_code || 'Documento' }} #{{ selectedDoc.number }}</p>
              <p v-if="selectedDoc.reference" class="mt-1 text-sm text-muted">{{ selectedDoc.reference }}</p>
            </div>
            <UBadge :label="formatDate(selectedDoc.date)" color="neutral" variant="subtle" />
          </div>

          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs text-muted">Total</p>
              <p class="mt-1 font-medium tabular-nums">{{ formatCurrency(selectedDoc.total, selectedDoc.currency_code) }}</p>
            </div>
            <div class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs text-muted">Ya aplicado</p>
              <p class="mt-1 font-medium tabular-nums">{{ formatCurrency(selectedDoc.paid_amount, selectedDoc.currency_code) }}</p>
            </div>
            <div class="rounded-lg border border-warning/25 bg-warning/5 p-3">
              <p class="text-xs text-muted">Saldo pendiente</p>
              <p class="mt-1 font-semibold tabular-nums">{{ formatCurrency(selectedDoc.pending_amount, selectedDoc.currency_code) }}</p>
            </div>
          </div>

          <UAlert
            v-if="currencyConversionError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="No se puede aplicar con la cotización actual"
            :description="currencyConversionError"
          />

          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <UFormField label="Importe a aplicar" name="amount" required class="min-w-0 flex-1">
              <UInput
                v-model.number="amount"
                type="number"
                :min="0.01"
                :max="maxApplicableAmount"
                :step="0.01"
                :disabled="loadingDocuments || submitting || Boolean(currencyConversionError)"
                class="w-full"
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
              :disabled="maxApplicableAmount <= 0 || submitting"
              @click="amount = maxApplicableAmount"
            />
          </div>
          <p v-if="currencyConversionHint" class="text-xs text-muted">{{ currencyConversionHint }}</p>
          <p v-else class="text-xs text-muted">El máximo considera el saldo disponible del anticipo y el saldo pendiente del comprobante.</p>
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
