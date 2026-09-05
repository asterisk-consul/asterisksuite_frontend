<script setup lang="ts">
import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import type { PendingDocument } from '~/modulos/erp/payments/service/payments.service'

const props = defineProps<{
  open: boolean
  paymentId: string
  paymentType: 'PAYMENT' | 'COLLECTION'
  availableBalance: number
  currencyCode: string
  partyId?: string
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

const isCollection = computed(() => props.paymentType === 'COLLECTION')

// Filter pending docs based on payment type
const filteredDocs = computed(() => {
  const docs = isCollection.value
    ? (pendingSalesDocuments.value ?? [])
    : (pendingPurchaseDocuments.value ?? [])
  if (props.partyId) {
    return docs.filter(d => d.party_id === props.partyId)
  }
  return docs
})

const selectedDoc = computed(() => {
  return filteredDocs.value.find(d => d.id === selectedDocId.value) ?? null
})

const docLabel = computed(() => isCollection.value ? 'Factura de venta' : 'Factura de compra')

// Default amount to min of available balance and doc pending
watch(selectedDocId, () => {
  if (selectedDoc.value) {
    amount.value = Math.min(props.availableBalance, selectedDoc.value.pending_amount)
  }
})

onMounted(async () => {
  if (isCollection.value) {
    await fetchPendingSalesDocuments(props.partyId)
  } else {
    await fetchPendingPurchaseDocuments(props.partyId)
  }
})

const handleSubmit = async () => {
  if (!selectedDocId.value || amount.value <= 0) return
  if (amount.value > props.availableBalance) return

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: props.currencyCode || 'ARS',
    maximumFractionDigits: 2
  }).format(value)
}
</script>

<template>
  <UModal
    :open="open"
    title="Aplicar anticipo a factura"
    description="Seleccione una factura y el monto a aplicar del saldo disponible."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Available balance -->
        <div class="flex items-center justify-between p-3 bg-info-50 dark:bg-info-950 rounded-lg">
          <span class="text-sm font-medium">Saldo disponible:</span>
          <span class="text-sm font-bold">{{ formatCurrency(availableBalance) }}</span>
        </div>

        <!-- Document selector -->
        <UFormField :label="docLabel" name="document_id" required>
          <USelectMenu
            v-model="selectedDocId"
            :items="filteredDocs.map(d => ({
              label: `${d.document_type_code || ''} ${d.number} — ${d.party_name || ''} (pendiente: ${formatCurrency(d.pending_amount)})`,
              value: d.id
            }))"
            placeholder="Seleccionar factura"
            searchable
          />
        </UFormField>

        <!-- Amount input -->
        <UFormField label="Monto a aplicar" name="amount" required>
          <UInput
            v-model.number="amount"
            type="number"
            :min="0.01"
            :max="Math.min(availableBalance, selectedDoc?.pending_amount || availableBalance)"
            :step="0.01"
          />
        </UFormField>

        <!-- Info when doc selected -->
        <div v-if="selectedDoc" class="text-xs text-muted space-y-1">
          <p>Total factura: {{ formatCurrency(selectedDoc.total) }}</p>
          <p>Ya pagado: {{ formatCurrency(selectedDoc.paid_amount) }}</p>
          <p>Pendiente: {{ formatCurrency(selectedDoc.pending_amount) }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" @click="emit('update:open', false)" />
        <UButton
          label="Aplicar"
          color="info"
          :loading="submitting"
          :disabled="!selectedDocId || amount <= 0 || submitting"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
