<script setup lang="ts">
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import DataPicker from '~/components/ui/DataPicker.vue'
import type { PendingDocument, AvailableCheck } from '~/modulos/erp/payments/service/payments.service'
import type { CheckFormData } from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckForm from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckModal from '~/modulos/erp/checks/components/CheckModal.vue'
import PendingDocumentsList from '~/modulos/erp/payments/components/PendingDocumentsList.vue'
import CreateInvoiceModal from '~/modulos/erp/payments/components/CreateInvoiceModal.vue'
import CreateValeModal from '~/modulos/erp/hr/components/CreateValeModal.vue'
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type { WithholdingProposal, PaymentWithholdingPayload } from '~/modulos/erp/fiscal/types/fiscal.types'

export interface PaymentFormData {
  type: 'PAYMENT' | 'COLLECTION'
  payment_mode: 'NORMAL' | 'ADVANCE'
  date: string
  payment_method: string
  amount: number
  currency_code: string
  exchange_rate?: number | null
  rate_type?: string
  converted_amount?: number | null
  description: string
  reference: string
  party_id: string
  bank_account_id: string
  cash_box_id: string
  check_ids: string[]
  documents?: { document_id: string; amount_applied: number }[]
}

const props = defineProps<{
  modelValue?: PaymentFormData
  pendingSalesDocuments?: PendingDocument[]
  pendingPurchaseDocuments?: PendingDocument[]
  availableOwnChecks?: AvailableCheck[]
  availableCustomerChecks?: AvailableCheck[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [PaymentFormData]
  submit: [PaymentFormData]
  cancel: []
}>()

const { cashBoxes, init: initCashBoxes, openSession, getSessions } = useCashBoxes()
const { bankAccounts, selectItems: bankAccountItems, init: initBankAccounts } = useBankAccounts()
const { createLightCheck, fetchAvailableOwnChecks, fetchAvailableCustomerChecks, fetchPendingSalesDocuments, fetchPendingPurchaseDocuments } = usePayments()
const { init: initCurrencies, codeSelectItems: currencyOptions, baseCurrency } = useCurrencies()
const {
  exchangeRate: resolvedRate,
  isBaseCurrency,
  autoResolve,
  setManualRate,
  convertAmount,
} = useExchangeRate()
const partiesService = useBusinessPartiesService()
const fiscalService = useFiscalService()
const toast = useToast()

// ─── Retenciones (motor fiscal) ──────────────────────────────
const withholdings = ref<WithholdingProposal[]>([])
const withholdingSkipped = ref<{ tax_type: string; reason: string }[]>([])
const retentionLoading = ref(false)

const totalWithheld = computed(() =>
  withholdings.value.reduce((s, w) => s + (Number(w.withheld_amount) || 0), 0)
)

const removeWithholding = (index: number) => {
  withholdings.value.splice(index, 1)
}

const addManualWithholding = () => {
  withholdings.value.push({
    tax_type: 'GANANCIAS',
    jurisdiction_id: null,
    jurisdiction_name: null,
    withholding_concept_id: null,
    tax_rule_id: null,
    rule_name: 'Manual',
    base_amount: 0,
    prorrate_percentage: null,
    rate: 0,
    withheld_amount: 0,
    automatic_amount: null,
    reason: 'Carga manual'
  })
}

const calculateSuggestedWithholdings = async (baseAmount: number) => {
  if (!form.party_id || baseAmount <= 0) return
  retentionLoading.value = true
  try {
    const preview = await fiscalService.previewWithholdings({
      party_id: form.party_id,
      base_amount: baseAmount,
      date: form.date,
      operation_type: form.type === 'PAYMENT' ? 'PURCHASE' : 'SALE'
    })
    withholdings.value = preview.proposals
    withholdingSkipped.value = preview.skipped
    if (preview.proposals.length > 0) {
      toast.add({
        title: `Se sugirieron ${preview.proposals.length} retención(es) por ${formatCurrency(preview.total_withheld, form.currency_code)}`,
        color: 'info',
        duration: 4000
      })
    }
  } catch (e: any) {
    console.error('Error calculando retenciones:', e)
    toast.add({
      title: 'No se pudieron calcular retenciones',
      description: e?.data?.message ?? 'Verifique la configuración fiscal',
      color: 'warning',
      duration: 4000
    })
  } finally {
    retentionLoading.value = false
  }
}

// Parties for ADVANCE mode selector
const allParties = ref<Array<{ id: string; name: string; tax_id?: string; type: string }>>([])
const partySearch = ref('')

const filteredParties = computed(() => {
  const partyType = isPayment.value ? 'SUPPLIER' : 'CUSTOMER'
  const q = partySearch.value.toLowerCase().trim()
  let filtered = allParties.value.filter(p => p.type === partyType)
  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tax_id && p.tax_id.includes(q))
    )
  }
  return filtered.map(p => ({
    label: p.tax_id ? `${p.name} (${p.tax_id})` : p.name,
    value: p.id
  }))
})

const selectedParty = computed({
  get: () => {
    const party = allParties.value.find(p => p.id === form.party_id)
    if (!party) return null
    return {
      label: party.tax_id ? `${party.name} (${party.tax_id})` : party.name,
      value: party.id
    }
  },
  set: (val: any) => {
    form.party_id = val?.value ?? ''
    form.party_type = isPayment.value ? 'SUPPLIER' : 'CUSTOMER'
  }
})

const defaultForm: PaymentFormData = {
  type: 'PAYMENT',
  payment_mode: 'NORMAL',
  date: today(),
  payment_method: 'CASH',
  amount: 0,
  currency_code: 'ARS',
  exchange_rate: null,
  rate_type: 'OFFICIAL',
  description: '',
  reference: '',
  party_id: '',
  bank_account_id: '',
  cash_box_id: '',
  check_ids: [],
}

const form = reactive<PaymentFormData>({ ...defaultForm })

const selectedDocs = ref<Map<string, { doc: PendingDocument; amount: number }>>(new Map())
const selectedChecks = ref<Map<string, AvailableCheck>>(new Map())
const docSearch = ref('')
const checkModalOpen = ref(false)

// Session open modal
const openSessionModalOpen = ref(false)
const openingBox = ref<any>(null)
const openingBalance = ref(0)
const openingSaving = ref(false)

// Create invoice modal
const invoiceModalOpen = ref(false)
const invoiceModuleCode = ref<'SALES' | 'PURCHASES'>('SALES')

const openInvoiceModal = (moduleCode: 'SALES' | 'PURCHASES') => {
  invoiceModuleCode.value = moduleCode
  invoiceModalOpen.value = true
}

const handleInvoiceCreated = async () => {
  await Promise.all([
    fetchPendingSalesDocuments(),
    fetchPendingPurchaseDocuments()
  ])
}

// Create vale modal
const valeModalOpen = ref(false)

const openValeModal = () => {
  valeModalOpen.value = true
}

const handleValeCreated = async () => {
  await Promise.all([
    fetchPendingSalesDocuments(),
    fetchPendingPurchaseDocuments()
  ])
}

onMounted(async () => {
  initCurrencies()
  try {
    allParties.value = await partiesService.findAll()
  } catch (e) {
    console.error('Error loading parties:', e)
  }
})

watch(
  () => props.modelValue,
  (val) => {
    console.log('[PaymentForm] modelValue changed:', val)
    console.log('[PaymentForm] documents:', val?.documents)
    if (!val) {
      Object.assign(form, { ...defaultForm })
      selectedDocs.value.clear()
      return
    }
    Object.assign(form, val)

    // Poblar selectedDocs desde los documentos del pago
    if (val.documents && val.documents.length > 0) {
      const allPending = [...(props.pendingPurchaseDocuments ?? []), ...(props.pendingSalesDocuments ?? [])]
      selectedDocs.value.clear()
      for (const docData of val.documents) {
        const pendingDoc = allPending.find(d => d.id === docData.document_id)
        if (pendingDoc) {
          selectedDocs.value.set(docData.document_id, {
            doc: pendingDoc,
            amount: docData.amount_applied ?? pendingDoc.pending_amount
          })
        }
      }
      form.amount = Array.from(selectedDocs.value.values()).reduce((sum, entry) => sum + entry.amount, 0)
    }
  },
  { immediate: true }
)

watch(
  form,
  (val) => {
    emit('update:modelValue', { ...val })
  },
  { deep: true }
)

const paymentMethods = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Cheque', value: 'CHECK' },
  { label: 'Transferencia bancaria', value: 'BANK_TRANSFER' },
  { label: 'Tarjeta de crédito', value: 'CREDIT_CARD' },
  { label: 'Tarjeta de débito', value: 'DEBIT_CARD' },
  { label: 'Billetera virtual', value: 'VIRTUAL_WALLET' }
]

const typeOptions = [
  { label: 'Pago (a proveedor)', value: 'PAYMENT' },
  { label: 'Cobro (de cliente)', value: 'COLLECTION' }
]

const paymentModeOptions = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'A cuenta (anticipo)', value: 'ADVANCE' }
]

const selectedType = computed({
  get: () => typeOptions.find(o => o.value === form.type) ?? typeOptions[0],
  set: (val: any) => {
    form.type = val?.value ?? 'PAYMENT'
    selectedDocs.value.clear()
    form.amount = 0
  }
})

const selectedPaymentMode = computed({
  get: () => paymentModeOptions.find(o => o.value === form.payment_mode) ?? paymentModeOptions[0],
  set: (val: any) => { form.payment_mode = val?.value ?? 'NORMAL' }
})

const selectedPaymentMethod = computed({
  get: () => paymentMethods.find(o => o.value === form.payment_method) ?? paymentMethods[0],
  set: (val: any) => { form.payment_method = val?.value ?? 'CASH' }
})

const selectedCurrency = computed({
  get: () => currencyOptions.value.find(o => o.value === form.currency_code) ?? currencyOptions.value[0],
  set: (val: any) => { form.currency_code = val?.value ?? 'ARS' }
})

const isCollection = computed(() => form.type === 'COLLECTION')
const isPayment = computed(() => form.type === 'PAYMENT')
const isCheck = computed(() => form.payment_method === 'CHECK')
const isCollectingCheck = computed(() => isCollection.value && isCheck.value)
const isPayingWithCheck = computed(() => isPayment.value && isCheck.value)

const filteredDocs = computed(() => {
  const docs = isCollection.value
    ? (props.pendingSalesDocuments ?? [])
    : (props.pendingPurchaseDocuments ?? [])
  const q = docSearch.value.toLowerCase().trim()
  if (!q) return docs
  return docs.filter(
    (d) =>
      d.number?.toString().includes(q) ||
      d.party_name?.toLowerCase().includes(q) ||
      d.document_type_code?.toLowerCase().includes(q) ||
      d.document_type_description?.toLowerCase().includes(q)
  )
})

const availableChecks = computed(() => {
  const checks = isCollection.value
    ? (props.availableCustomerChecks ?? [])
    : (props.availableOwnChecks ?? [])
  if (!form.currency_code) return checks
  return checks.filter(c => c.currency_code === form.currency_code)
})

const filteredCashBoxes = computed(() => {
  if (!form.currency_code) return cashBoxes.value
  return cashBoxes.value.filter(cb =>
    cb.balances?.some(b => b.currency_code === form.currency_code)
  )
})

const filteredBankAccounts = computed(() => {
  if (!form.currency_code) return bankAccounts.value
  return bankAccounts.value.filter(ba => ba.currency_code === form.currency_code)
})

const totalApplied = computed(() => {
  let total = 0
  for (const entry of selectedDocs.value.values()) {
    total += entry.amount
  }
  return Math.round(total * 100) / 100
})

const totalChecksAmount = computed(() => {
  let total = 0
  for (const check of selectedChecks.value.values()) {
    total += Number(check.amount)
  }
  return Math.round(total * 100) / 100
})

watch(selectedPaymentMethod, async (val) => {
  if (val?.value === 'CHECK') {
    if (isCollection.value) {
      await fetchAvailableCustomerChecks()
    } else {
      await fetchAvailableOwnChecks()
    }
  } else {
    selectedChecks.value.clear()
    form.check_ids = []
  }
  if (val?.value === 'CASH') {
    await initCashBoxes()
  }
  if (val?.value === 'BANK_TRANSFER') {
    await initBankAccounts()
  }
  form.cash_box_id = ''
  form.bank_account_id = ''
})

watch(() => form.currency_code, () => {
  form.cash_box_id = ''
  form.bank_account_id = ''
  selectedChecks.value.clear()
  form.check_ids = []
})

// Recalcular montos de documentos cuando cambia la cotización
watch(resolvedRate, (newRate) => {
  if (!newRate || selectedDocs.value.size === 0) return
  const payCurrency = form.currency_code?.toUpperCase()
  for (const [, entry] of selectedDocs.value.entries()) {
    const docCurrency = entry.doc.currency_code?.toUpperCase()
    if (docCurrency !== payCurrency) {
      // Preferir el exchange_rate de la factura
      const rate = entry.doc.exchange_rate ?? newRate
      entry.amount = Number((entry.doc.pending_amount * rate).toFixed(2))
    }
  }
  form.amount = totalApplied.value
})

// ─── Exchange Rate: auto-resolve on currency change ─────────
const isForeignCurrency = computed(() => {
  if (!baseCurrency.value) return false
  return form.currency_code.toUpperCase() !== baseCurrency.value.code.toUpperCase()
})

watch(
  () => form.currency_code,
  async (newCode) => {
    if (!newCode || !isForeignCurrency.value) {
      form.exchange_rate = null
      form.converted_amount = null
      return
    }
    await autoResolve(newCode, baseCurrency.value?.code ?? 'ARS', form.rate_type)
    form.exchange_rate = resolvedRate.value
    if (form.exchange_rate && form.amount) {
      form.converted_amount = convertAmount(form.amount)
    }
  },
  { immediate: true },
)

watch(resolvedRate, (rate) => {
  if (rate) {
    form.exchange_rate = rate
    if (form.amount) {
      form.converted_amount = convertAmount(form.amount)
    }
  }
})

watch(() => form.amount, (amount) => {
  if (form.exchange_rate && amount) {
    form.converted_amount = convertAmount(amount)
  }
})

watch(selectedType, async (val) => {
  selectedDocs.value.clear()
  docSearch.value = ''
  form.amount = 0
  selectedChecks.value.clear()
  form.check_ids = []

  if (isCheck.value) {
    if (val?.value === 'COLLECTION') {
      await fetchAvailableCustomerChecks()
    } else {
      await fetchAvailableOwnChecks()
    }
  }
})

const selectCheck = (check: AvailableCheck) => {
  if (selectedChecks.value.has(check.id)) {
    selectedChecks.value.delete(check.id)
  } else {
    selectedChecks.value.set(check.id, check)
  }
  form.check_ids = Array.from(selectedChecks.value.keys())
  form.amount = totalChecksAmount.value
}

const isCheckSelected = (id: string) => selectedChecks.value.has(id)

const selectCashBox = (id: string) => {
  const box = cashBoxes.value.find(b => b.id === id)
  if (box?.status === 'CLOSED') return
  form.cash_box_id = id
}

const openBoxSession = async (box: any) => {
  openingBox.value = box
  try {
    const sessions = await getSessions(box.id)
    const lastSession = sessions.length > 0 ? sessions[0] : null
    openingBalance.value = lastSession?.closing_balance ?? 0
  } catch {
    openingBalance.value = 0
  }
  openSessionModalOpen.value = true
}

const handleOpenSession = async () => {
  if (!openingBox.value) return
  openingSaving.value = true
  try {
    await openSession(openingBox.value.id, { opening_balance: openingBalance.value })
    toast.add({ title: 'Sesión abierta', color: 'success' })
    await initCashBoxes()
    openSessionModalOpen.value = false
    form.cash_box_id = openingBox.value.id
  } catch (e: any) {
    toast.add({
      title: 'Error al abrir sesión',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    openingSaving.value = false
  }
}

const getCashBoxBalances = (cb: any): { currency_code: string; balance: number }[] => {
  if (!cb.balances || cb.balances.length === 0) return []
  return cb.balances.map((b: any) => ({
    currency_code: b.currency_code,
    balance: Number(b.balance)
  }))
}

const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    ARS: '$', USD: 'US$', EUR: '€', BRL: 'R$', CLP: '$', UYU: '$U'
  }
  return symbols[code] ?? code
}

const selectBankAccount = (id: string) => {
  form.bank_account_id = id
}

const toggleDoc = (doc: PendingDocument) => {
  if (selectedDocs.value.has(doc.id)) {
    selectedDocs.value.delete(doc.id)
  } else {
    // Validar: no mezclar documentos de diferentes partes
    if (selectedDocs.value.size > 0) {
      const firstDoc = selectedDocs.value.values().next().value?.doc
      if (firstDoc?.party_id && doc.party_id && firstDoc.party_id !== doc.party_id) {
        return
      }
    }
    const docCurrency = doc.currency_code?.toUpperCase()
    const payCurrency = form.currency_code?.toUpperCase()
    let amountToApply = doc.pending_amount

    if (docCurrency !== payCurrency) {
      // Usar el exchange_rate de la factura (no el del mercado)
      const rate = doc.exchange_rate ?? resolvedRate.value
      if (rate) {
        amountToApply = Number((doc.pending_amount * rate).toFixed(2))
      }
    }

    selectedDocs.value.set(doc.id, { doc, amount: amountToApply })
  }

  // Auto-set party_id del primer documento seleccionado
  if (selectedDocs.value.size > 0) {
    const firstDoc = selectedDocs.value.values().next().value?.doc
    if (firstDoc?.party_id) {
      form.party_id = firstDoc.party_id
      form.party_type = isPayment.value ? 'SUPPLIER' : 'CUSTOMER'
    }
  } else {
    form.party_id = ''
  }

  form.amount = totalApplied.value
}

const updateDocAmount = (docId: string, amount: number) => {
  const entry = selectedDocs.value.get(docId)
  if (entry) {
    entry.amount = amount
    form.amount = totalApplied.value
  }
}

const handleCheckCreated = async (checkData: CheckFormData) => {
  const isOwn = isPayment.value
  await createLightCheck({
    check_number: checkData.check_number,
    bank_name: checkData.bank_name,
    bank_branch: checkData.bank_branch || undefined,
    account_number: checkData.account_number || undefined,
    bank_account_id: checkData.bank_account_id || undefined,
    issuer_name: checkData.issuer_name,
    issuer_id: checkData.issuer_id || undefined,
    amount: checkData.amount,
    currency_code: checkData.currency_code,
    issue_date: checkData.issue_date,
    due_date: checkData.due_date,
    is_own: isOwn,
    notes: checkData.notes || undefined,
  })
  checkModalOpen.value = false
  if (isCollection.value) {
    await fetchAvailableCustomerChecks()
  } else {
    await fetchAvailableOwnChecks()
  }
}

const handleSubmit = async () => {
  const paymentAmount = totalApplied.value > 0 ? totalApplied.value : totalChecksAmount.value > 0 ? totalChecksAmount.value : form.amount
  console.log('[PaymentForm] paymentAmount:', paymentAmount)
  console.log('[PaymentForm] selectedDocs:', Array.from(selectedDocs.value.entries()))

  // Retenciones: usar las cargadas/confirmadas en el formulario
  const validWithholdings = withholdings.value.filter(w => Number(w.withheld_amount) > 0)
  const totalRetentions = validWithholdings.reduce((s, w) => s + Number(w.withheld_amount), 0)
  // Dinero efectivo = aplicado a documentos − retenciones
  const cashAmount = Math.max(0, Math.round((paymentAmount - totalRetentions) * 100) / 100)

  const documentsData = Array.from(selectedDocs.value.values()).map(d => ({
    document_id: d.doc.id,
    amount_applied: d.amount
  }))

  // Distribuir retenciones proporcionalmente entre documentos aplicados
  const withholdingsPayload: PaymentWithholdingPayload[] = validWithholdings.map(w => {
    let allocations: { document_id: string; allocated_amount: number }[] | undefined
    if (documentsData.length > 0 && paymentAmount > 0) {
      const shares = documentsData.map(d =>
        Math.round(((Number(w.withheld_amount) * d.amount_applied) / paymentAmount) * 100) / 100
      )
      // Ajustar la última para que la suma dé exactamente el importe retenido
      const allocated = shares.slice(0, -1).reduce((s, v) => s + v, 0)
      shares[shares.length - 1] = Math.round((Number(w.withheld_amount) - allocated) * 100) / 100
      allocations = documentsData
        .map((d, i) => ({ document_id: d.document_id, allocated_amount: shares[i] }))
        .filter(a => a.allocated_amount !== 0)
    }
    return {
      tax_type: w.tax_type,
      jurisdiction_id: w.jurisdiction_id ?? undefined,
      withholding_concept_id: w.withholding_concept_id ?? undefined,
      tax_rule_id: w.tax_rule_id ?? undefined,
      base_amount: w.base_amount,
      rate: w.rate ?? undefined,
      withheld_amount: Number(w.withheld_amount),
      observations: w.reason,
      allocations
    }
  })

  console.log('[PaymentForm] documentsData:', documentsData)

  const payload = {
    ...form,
    amount: cashAmount,
    check_ids: form.check_ids.length > 0 ? form.check_ids : undefined,
    withholdings: withholdingsPayload.length > 0 ? withholdingsPayload : undefined,
    documents: documentsData.length > 0 ? documentsData : undefined
  }
  console.log('[PaymentForm] EMIT payload:', payload)

  emit('submit', payload as any)
}

const formatCurrency = (amount: number, currency: string | null | undefined = 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 2
  }).format(amount)
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-3 gap-4">
      <UFormField label="Tipo" name="type" required>
        <USelectMenu v-model="selectedType" :items="typeOptions" />
      </UFormField>
      <UFormField label="Modo" name="payment_mode">
        <USelectMenu v-model="selectedPaymentMode" :items="paymentModeOptions" />
      </UFormField>
      <UFormField label="Fecha" name="date" required>
        <DataPicker v-model="form.date" />
      </UFormField>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Método de pago" name="payment_method" required>
        <USelectMenu v-model="selectedPaymentMethod" :items="paymentMethods" />
      </UFormField>
      <UFormField label="Moneda" name="currency_code">
        <USelectMenu v-model="selectedCurrency" :items="currencyOptions" placeholder="Seleccionar moneda" />
      </UFormField>
    </div>

    <!-- Exchange Rate (solo si moneda extranjera) -->
    <div v-if="isForeignCurrency" class="grid grid-cols-3 gap-4">
      <UFormField label="Tipo de cambio" name="rate_type">
        <USelect
          v-model="form.rate_type"
          :items="[
            { label: 'Oficial (AFIP)', value: 'OFFICIAL' },
            { label: 'Blue', value: 'BLUE' },
            { label: 'MEP', value: 'MEP' },
            { label: 'CCL', value: 'CCL' },
          ]"
          placeholder="Tipo"
        />
      </UFormField>
      <UFormField label="Cotización" name="exchange_rate">
        <UInput
          v-model.number="form.exchange_rate"
          type="number"
          step="0.000001"
          min="0"
          placeholder="1.000000"
          @input="() => { if (form.exchange_rate) setManualRate(form.exchange_rate) }"
        />
      </UFormField>
      <UFormField v-if="form.exchange_rate && form.amount" label="Equivalente ARS">
        <div class="h-10 flex items-center text-lg font-semibold text-primary">
          {{ formatCurrency(convertAmount(form.amount) ?? 0, 'ARS') }}
        </div>
      </UFormField>
    </div>

    <!-- SELECTOR DE TERCERO (solo para modo ADVANCE — en NORMAL se toma del documento) -->
    <div v-if="form.payment_mode === 'ADVANCE'" class="grid grid-cols-2 gap-4">
      <UFormField :label="isPayment ? 'Proveedor' : 'Cliente'" name="party_id" required>
        <USelectMenu
          v-model="selectedParty"
          :items="filteredParties"
          :placeholder="isPayment ? 'Buscar proveedor...' : 'Buscar cliente...'"
          searchable
          @update:search="partySearch = $event"
        />
      </UFormField>
    </div>

    <!-- SELECTOR DE CAJA (EFECTIVO) -->
    <div v-if="selectedPaymentMethod?.value === 'CASH'" class="border border-default rounded-lg p-4 space-y-3">
      <h4 class="text-sm font-medium">Seleccionar caja</h4>
      <div v-if="filteredCashBoxes.length === 0" class="text-center py-4 text-muted text-sm">
        {{ form.currency_code ? `No hay cajas con saldo en ${form.currency_code}` : 'No hay cajas disponibles' }}
      </div>
      <div v-else class="max-h-48 overflow-y-auto space-y-2">
        <div
          v-for="cb in filteredCashBoxes"
          :key="cb.id"
          class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
          :class="form.cash_box_id === cb.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
          @click="selectCashBox(cb.id)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ cb.name }}</span>
              <UBadge
                :label="cb.is_main ? 'Principal' : 'Secundaria'"
                :color="cb.is_main ? 'primary' : 'gray'"
                size="xs"
              />
              <UBadge
                :label="cb.status === 'OPEN' ? 'Abierta' : 'Cerrada'"
                :color="cb.status === 'OPEN' ? 'success' : 'warning'"
                size="xs"
              />
            </div>
            <div class="text-xs text-muted mt-1">
              <div v-if="getCashBoxBalances(cb).length === 0" class="font-semibold text-primary">
                Sin saldo
              </div>
              <div v-else class="flex flex-wrap gap-x-3 gap-y-0.5">
                <span v-for="bal in getCashBoxBalances(cb)" :key="bal.currency_code" class="inline-flex items-center gap-1.5 font-semibold text-primary">
                  <UBadge :label="bal.currency_code" size="xs" variant="soft" color="info" />
                  {{ formatCurrency(bal.balance, bal.currency_code) }}
                </span>
              </div>
            </div>
            <div v-if="cb.status === 'CLOSED'" class="mt-2">
              <p class="text-xs text-warning mb-1">La caja está cerrada. Debe abrirla antes de usar.</p>
              <UButton
                label="Abrir sesión"
                icon="i-lucide-lock-open"
                color="success"
                variant="outline"
                size="xs"
                @click.stop="openBoxSession(cb)"
              />
            </div>
          </div>
          <div v-if="form.cash_box_id === cb.id" class="text-primary">
            <span class="i-heroicons-check-circle text-lg"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- SELECTOR DE CHEQUES (PAGO y COBRO) -->
    <div v-if="isCheck" class="border border-default rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium">
          {{ isCollection ? 'Seleccionar cheques del cliente' : 'Seleccionar cheques propios' }}
        </h4>
        <div class="flex items-center gap-2">
          <UButton label="Crear cheque" size="xs" variant="outline" @click="checkModalOpen = true" />
          <div v-if="selectedChecks.size > 0" class="text-sm font-semibold text-primary">
            Total: {{ formatCurrency(totalChecksAmount, form.currency_code) }}
          </div>
        </div>
      </div>
      <div v-if="availableChecks.length === 0" class="text-center py-4 text-muted text-sm">
        {{ form.currency_code ? `No hay cheques en ${form.currency_code}. Cree uno nuevo con el botón de arriba.` : 'No hay cheques disponibles. Cree uno nuevo con el botón de arriba.' }}
      </div>
      <div v-else class="max-h-64 overflow-y-auto space-y-2">
        <div
          v-for="check in availableChecks"
          :key="check.id"
          class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
          :class="isCheckSelected(check.id) ? 'border-primary bg-primary/5' : 'border-default'"
          @click="selectCheck(check)"
        >
          <UCheckbox
            :model-value="isCheckSelected(check.id)"
            @update:model-value="selectCheck(check)"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">Cheque #{{ check.check_number }}</span>
              <span class="text-xs text-muted">{{ check.bank_name }}</span>
              <UBadge label="Pendiente" color="warning" size="xs" />
            </div>
            <div class="flex items-center gap-4 text-xs text-muted mt-1">
              <span>Emisor: {{ check.issuer_name }}</span>
              <span>Monto: {{ formatCurrency(Number(check.amount), check.currency_code) }}</span>
              <span>Vence: {{ check.due_date }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SELECTOR DE CUENTA BANCARIA (TRANSFERENCIA) -->
    <div v-if="selectedPaymentMethod?.value === 'BANK_TRANSFER'" class="border border-default rounded-lg p-4 space-y-3">
      <h4 class="text-sm font-medium">Seleccionar cuenta bancaria</h4>
      <div v-if="filteredBankAccounts.length === 0" class="text-center py-4 text-muted text-sm">
        {{ form.currency_code ? `No hay cuentas bancarias en ${form.currency_code}` : 'No hay cuentas bancarias disponibles' }}
      </div>
      <div v-else class="max-h-48 overflow-y-auto space-y-2">
        <div
          v-for="ba in filteredBankAccounts"
          :key="ba.id"
          class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
          :class="form.bank_account_id === ba.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
          @click="selectBankAccount(ba.id)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ ba.bank_name }}</span>
              <span class="text-xs text-muted">{{ ba.account_number || ba.name }}</span>
            </div>
            <div class="flex items-center gap-4 text-xs text-muted mt-1">
              <span>Moneda: {{ ba.currency_code }}</span>
              <span>Tipo: {{ ba.account_type }}</span>
              <span>Saldo: <span class="font-semibold text-primary">{{ formatCurrency(Number(ba.balance), ba.currency_code) }}</span></span>
            </div>
          </div>
          <div v-if="form.bank_account_id === ba.id" class="text-primary">
            <span class="i-heroicons-check-circle text-lg"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- DOCUMENTOS PENDIENTES (oculto en modo ADVANCE — se aplica después) -->
    <PendingDocumentsList
      v-if="form.payment_mode !== 'ADVANCE'"
      :documents="filteredDocs"
      :selected-docs="selectedDocs"
      :currency-code="form.currency_code"
      :exchange-rate="null"
      :resolved-rate="resolvedRate"
      :format-currency="formatCurrency"
      @toggle="toggleDoc"
      @update-amount="updateDocAmount"
      @create-invoice="openInvoiceModal"
      @create-vale="openValeModal"
    />

    <!-- RETENCIONES (motor fiscal) -->
    <div v-if="form.party_id" class="border border-default rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium">Retenciones</h4>
        <div class="flex gap-2">
          <UButton
            label="Calcular sugeridas"
            size="xs"
            variant="outline"
            icon="i-lucide-calculator"
            :loading="retentionLoading"
            :disabled="totalApplied <= 0 && totalChecksAmount <= 0"
            @click="calculateSuggestedWithholdings(totalApplied > 0 ? totalApplied : totalChecksAmount)"
          />
          <UButton
            label="Agregar manual"
            size="xs"
            variant="ghost"
            icon="i-lucide-plus"
            @click="addManualWithholding"
          />
        </div>
      </div>

      <div v-if="withholdings.length === 0" class="text-xs text-muted">
        Sin retenciones. Use "Calcular sugeridas" para que el motor fiscal proponga las retenciones según el perfil del tercero.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(wh, index) in withholdings"
          :key="index"
          class="grid grid-cols-12 gap-2 items-center p-2 rounded border border-default"
        >
          <div class="col-span-3">
            <USelectMenu
              v-model="wh.tax_type"
              :items="['GANANCIAS', 'IIBB', 'SUSS', 'IVA']"
              size="xs"
            />
          </div>
          <div class="col-span-2">
            <UInput v-model.number="wh.base_amount" type="number" size="xs" placeholder="Base" />
          </div>
          <div class="col-span-2">
            <UInput v-model.number="wh.rate" type="number" size="xs" placeholder="Alícuota %" />
          </div>
          <div class="col-span-3">
            <UInput v-model.number="wh.withheld_amount" type="number" size="xs" placeholder="Importe" />
          </div>
          <div class="col-span-1 text-xs text-muted truncate" :title="wh.reason">
            {{ wh.jurisdiction_name || '—' }}
          </div>
          <div class="col-span-1 flex justify-end">
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeWithholding(index)" />
          </div>
        </div>
        <div class="flex justify-between text-sm pt-1 border-t border-default">
          <span class="text-muted">
            Aplicado a facturas: {{ formatCurrency(totalApplied > 0 ? totalApplied : totalChecksAmount, form.currency_code) }}
          </span>
          <span class="font-medium">
            Retenciones: {{ formatCurrency(totalWithheld, form.currency_code) }} ·
            Efectivo: {{ formatCurrency(Math.max(0, (totalApplied > 0 ? totalApplied : totalChecksAmount) - totalWithheld), form.currency_code) }}
          </span>
        </div>
      </div>

      <div v-if="withholdingSkipped.length > 0" class="text-xs text-muted space-y-0.5">
        <div v-for="(s, i) in withholdingSkipped" :key="i">
          {{ s.tax_type }}: {{ s.reason }}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Monto total" name="amount" required>
        <UInput v-model.number="form.amount" type="number" :disabled="selectedDocs.size > 0 || selectedChecks.size > 0" />
      </UFormField>
      <UFormField label="Referencia" name="reference">
        <UInput v-model="form.reference" placeholder="N° de referencia" />
      </UFormField>
    </div>
    <UFormField label="Descripción" name="description">
      <UInput v-model="form.description" placeholder="Descripción del pago/cobro" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-4">
      <UButton label="Cancelar" variant="ghost" @click="emit('cancel')" />
      <UButton label="Guardar" type="submit" :disabled="selectedDocs.size > 0 && totalApplied <= 0" />
    </div>

    <CheckModal
      v-model:open="checkModalOpen"
      :bank-account-items="bankAccountItems"
      @success="handleCheckCreated"
    />

    <CreateInvoiceModal
      v-model:open="invoiceModalOpen"
      :module-code="invoiceModuleCode"
      @success="handleInvoiceCreated"
    />

    <CreateValeModal
      v-model:open="valeModalOpen"
      @success="handleValeCreated"
    />

    <!-- SESSION OPEN MODAL -->
    <UModal v-model:open="openSessionModalOpen" title="Abrir sesión de caja">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Caja: <strong>{{ openingBox?.name }}</strong>
          </p>
          <UFormField label="Saldo de apertura" name="opening_balance" required>
            <UInput v-model.number="openingBalance" type="number" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="openSessionModalOpen = false" />
            <UButton label="Abrir sesión" color="success" :loading="openingSaving" @click="handleOpenSession" />
          </div>
        </div>
      </template>
    </UModal>
  </form>
</template>
