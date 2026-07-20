<script setup lang="ts">
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
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

const { cashBoxes, init: initCashBoxes } = useCashBoxes()
const { bankAccounts, selectItems: bankAccountItems, init: initBankAccounts } = useBankAccounts()
const { createLightCheck, fetchAvailableOwnChecks, fetchAvailableCustomerChecks } = usePayments()

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
  return isCollection.value
    ? (props.availableCustomerChecks ?? [])
    : (props.availableOwnChecks ?? [])
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
  form.cash_box_id = id
}

const getCashBoxBalance = (cb: any): number => {
  if (!cb.balances || cb.balances.length === 0) return 0
  return cb.balances.reduce((sum: number, b: any) => sum + Number(b.balance), 0)
}

const selectBankAccount = (id: string) => {
  form.bank_account_id = id
}

const toggleDoc = (doc: PendingDocument) => {
  if (selectedDocs.value.has(doc.id)) {
    selectedDocs.value.delete(doc.id)
  } else {
    selectedDocs.value.set(doc.id, { doc, amount: doc.pending_amount })
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

  emit('submit', {
    ...form,
    amount: paymentAmount,
    check_ids: form.check_ids.length > 0 ? form.check_ids : undefined,
    retentions: retentions.length > 0 ? retentions : undefined,
    total_retentions: totalRetentions,
    net_amount: netAmount
  } as any)
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
        <UInput v-model="form.date" type="date" />
      </UFormField>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Método de pago" name="payment_method" required>
        <USelectMenu v-model="selectedPaymentMethod" :items="paymentMethods" />
      </UFormField>
      <UFormField label="Moneda" name="currency_code">
        <UInput v-model="form.currency_code" />
      </UFormField>
    </div>

    <!-- SELECTOR DE CAJA (EFECTIVO) -->
    <div v-if="selectedPaymentMethod?.value === 'CASH'" class="border border-default rounded-lg p-4 space-y-3">
      <h4 class="text-sm font-medium">Seleccionar caja</h4>
      <div v-if="cashBoxes.length === 0" class="text-center py-4 text-muted text-sm">
        No hay cajas disponibles
      </div>
      <div v-else class="max-h-48 overflow-y-auto space-y-2">
        <div
          v-for="cb in cashBoxes"
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
            </div>
            <div class="text-xs text-muted mt-1">
              Saldo: <span class="font-semibold text-primary">{{ formatCurrency(getCashBoxBalance(cb), form.currency_code) }}</span>
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
        No hay cheques disponibles. Cree uno nuevo con el botón de arriba.
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
      <div v-if="bankAccounts.length === 0" class="text-center py-4 text-muted text-sm">
        No hay cuentas bancarias disponibles
      </div>
      <div v-else class="max-h-48 overflow-y-auto space-y-2">
        <div
          v-for="ba in bankAccounts"
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
  </form>
</template>
