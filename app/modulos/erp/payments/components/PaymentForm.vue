<script setup lang="ts">
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import DataPicker from '~/components/ui/DataPicker.vue'
import type { PendingDocument, AvailableCheck } from '~/modulos/erp/payments/service/payments.service'
import type { CheckFormData } from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckForm from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckModal from '~/modulos/erp/checks/components/CheckModal.vue'
import { calculateRetentions, calculateTotalRetentions, calculateNetAmount } from '~/modulos/erp/payments/utils/retentionLogic'

export interface PaymentFormData {
  type: 'PAYMENT' | 'COLLECTION'
  date: string
  payment_method: string
  amount: number
  currency_code: string
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
const { createLightCheck, fetchAvailableOwnChecks, fetchAvailableCustomerChecks } = usePayments()
const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()
const toast = useToast()

const defaultForm: PaymentFormData = {
  type: 'PAYMENT',
  date: new Date().toISOString().split('T')[0],
  payment_method: 'CASH',
  amount: 0,
  currency_code: 'ARS',
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

onMounted(() => {
  initCurrencies()
})

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      Object.assign(form, { ...defaultForm })
      return
    }
    Object.assign(form, val)
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

const selectedType = computed({
  get: () => typeOptions.find(o => o.value === form.type) ?? typeOptions[0],
  set: (val: any) => {
    form.type = val?.value ?? 'PAYMENT'
    selectedDocs.value.clear()
    form.amount = 0
  }
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
    selectedDocs.value.set(doc.id, { doc, amount: doc.pending_amount })
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

const isDocSelected = (docId: string) => selectedDocs.value.has(docId)

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
    party_id: form.party_id || undefined,
    party_type: isOwn ? 'SUPPLIER' : 'CUSTOMER',
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
  
  // Calculate retentions if it's a payment to a supplier
  let retentions: { code: string; name: string; amount: number }[] = []
  if (form.type === 'PAYMENT' && form.party_id) {
    try {
      // Fetch supplier info for retention calculation
      const supplier = await $fetch<any>(`/api/logistica/master-data/business-parties/${form.party_id}`)
      if (supplier?.retention_agent) {
        retentions = calculateRetentions(paymentAmount, {
          retention_agent: supplier.retention_agent || false,
          iibb_registered: supplier.iibb_registered || false,
          province: supplier.province,
          operation_type: supplier.operation_type
        })
      }
    } catch (e) {
      console.error('Error fetching supplier for retentions:', e)
    }
  }

  const totalRetentions = calculateTotalRetentions(retentions)
  const netAmount = calculateNetAmount(paymentAmount, totalRetentions)

  const documentsData = Array.from(selectedDocs.value.values()).map(d => ({
    document_id: d.doc.id,
    amount_applied: d.amount
  }))

  console.log('[PaymentForm] documentsData:', documentsData)

  const payload = {
    ...form,
    amount: paymentAmount,
    check_ids: form.check_ids.length > 0 ? form.check_ids : undefined,
    retentions: retentions.length > 0 ? retentions : undefined,
    total_retentions: totalRetentions,
    net_amount: netAmount,
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
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Tipo" name="type" required>
        <USelectMenu v-model="selectedType" :items="typeOptions" />
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

    <!-- DOCUMENTOS PENDIENTES -->
    <div class="border border-default rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium">
          {{ isCollection ? 'Facturas de venta' : 'Facturas de compra' }} con saldo pendiente
          <span class="text-muted">({{ filteredDocs.length }})</span>
        </h4>
        <div v-if="selectedDocs.size > 0" class="text-sm font-semibold text-primary">
          Total a aplicar: {{ formatCurrency(totalApplied, form.currency_code) }}
        </div>
      </div>

      <UInput
        v-model="docSearch"
        placeholder="Buscar por N°, proveedor/cliente o tipo..."
        icon="i-heroicons-magnifying-glass"
        class="w-full"
      />

      <div class="max-h-64 overflow-y-auto space-y-2">
        <div
          v-for="doc in filteredDocs"
          :key="doc.id"
          class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
          :class="isDocSelected(doc.id) ? 'border-primary bg-primary/5' : 'border-default'"
        >
          <UCheckbox
            :model-value="isDocSelected(doc.id)"
            @update:model-value="toggleDoc(doc)"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ doc.document_type_description || doc.document_type_code }} #{{ doc.number }}</span>
              <span class="text-xs text-muted">{{ doc.party_name }}</span>
            </div>
            <div class="flex items-center gap-4 text-xs text-muted mt-1">
              <span>Fecha: {{ doc.date }}</span>
              <span>Total: {{ formatCurrency(doc.total, doc.currency_code) }}</span>
              <span>Pagado: {{ formatCurrency(doc.paid_amount, doc.currency_code) }}</span>
              <span class="font-semibold text-warning">Pendiente: {{ formatCurrency(doc.pending_amount, doc.currency_code) }}</span>
            </div>
          </div>
          <div v-if="isDocSelected(doc.id)" class="w-28">
            <UInput
              :model-value="selectedDocs.get(doc.id)?.amount ?? 0"
              type="number"
              :max="doc.pending_amount"
              :step="0.01"
              size="xs"
              @update:model-value="(v: string) => updateDocAmount(doc.id, Number(v))"
            />
          </div>
        </div>
        <div v-if="filteredDocs.length === 0" class="text-center py-4 text-muted text-sm">
          No se encontraron documentos
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
