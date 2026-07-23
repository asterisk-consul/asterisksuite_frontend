<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'

const route = useRoute()
const router = useRouter()
const paymentId = route.params.id as string

const {
  current,
  fetchOne,
  update,
  confirm: confirmPayment,
  markAsPaid,
  reject,
  reverse,
  fetchPendingSalesDocuments,
  fetchPendingPurchaseDocuments,
  fetchAvailableOwnChecks,
  fetchAvailableCustomerChecks,
  pendingSalesDocuments,
  pendingPurchaseDocuments,
  availableOwnChecks,
  availableCustomerChecks,
  loading
} = usePayments()

const paymentData = ref<PaymentFormData | null>(null)
const currentPayment = ref<Payment | null>(null)
const actionModalOpen = ref(false)
const actionType = ref<'confirm' | 'pay' | 'reject' | 'reverse'>('confirm')

const actionLabels: Record<string, { title: string; button: string; color: string; description: string }> = {
  confirm: { title: 'Confirmar pago', button: 'Confirmar', color: 'info', description: 'Se aplicarán los efectos: documentos, caja/banco y cuenta corriente.' },
  pay: { title: 'Marcar como pagado', button: 'Marcar pagado', color: 'success', description: 'El pago pasará a estado Pagado.' },
  reject: { title: 'Rechazar pago', button: 'Rechazar', color: 'warning', description: 'Se revertirán todos los efectos (documentos, caja/banco, cuenta corriente).' },
  reverse: { title: 'Anular pago', button: 'Anular', color: 'error', description: 'Se revertirán todos los efectos y el pago quedará anulado.' }
}

const isDraft = computed(() => currentPayment.value?.status === 'DRAFT')
const isConfirmed = computed(() => currentPayment.value?.status === 'CONFIRMED')
const isPaid = computed(() => currentPayment.value?.status === 'PAID')

onMounted(async () => {
  const [payment] = await Promise.all([
    fetchOne(paymentId),
    fetchPendingSalesDocuments(),
    fetchPendingPurchaseDocuments(),
    fetchAvailableOwnChecks(),
    fetchAvailableCustomerChecks()
  ])

  if (payment) {
    currentPayment.value = payment as Payment
    paymentData.value = {
      type: payment.type as 'PAYMENT' | 'COLLECTION',
      date: payment.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      payment_method: payment.payment_method ?? 'CASH',
      amount: Number(payment.amount),
      currency_code: payment.currency_code ?? 'ARS',
      description: payment.description ?? '',
      reference: payment.reference ?? '',
      party_id: payment.party_id ?? '',
      bank_account_id: payment.bank_account_id ?? '',
      cash_box_id: payment.cash_box_id ?? '',
      check_ids: [],
    }
  }
})

const handleSubmit = async (formData: PaymentFormData) => {
  try {
    const updated = await update(paymentId, {
      date: formData.date,
      payment_method: formData.payment_method as any,
      amount: formData.amount,
      currency_code: formData.currency_code,
      description: formData.description || undefined,
      reference: formData.reference || undefined,
      party_id: formData.party_id || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      cash_box_id: formData.cash_box_id || undefined,
      check_ids: formData.check_ids?.length ? formData.check_ids : undefined,
      documents: formData.documents?.length ? formData.documents : undefined,
    })
    currentPayment.value = updated as Payment
  } catch (error) {
    console.error(error)
  }
}

const openAction = (type: typeof actionType.value) => {
  actionType.value = type
  actionModalOpen.value = true
}

const handleAction = async () => {
  if (!currentPayment.value) return

  switch (actionType.value) {
    case 'confirm':
      await confirmPayment(paymentId)
      break
    case 'pay':
      await markAsPaid(paymentId)
      break
    case 'reject':
      await reject(paymentId)
      break
    case 'reverse':
      await reverse(paymentId)
      break
  }

  const updated = await fetchOne(paymentId)
  if (updated) currentPayment.value = updated as Payment
  actionModalOpen.value = false
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'neutral' },
  CONFIRMED: { label: 'Confirmado', color: 'info' },
  PAID: { label: 'Pagado', color: 'success' },
  REVERSED: { label: 'Rechazado', color: 'warning' },
  CANCELLED: { label: 'Anulado', color: 'error' }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Editar pago / cobro"
      description="Modificar pago o cobro existente"
    />

    <div v-if="loading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <template v-else-if="paymentData && currentPayment">
      <!-- STATUS BAR -->
      <div class="flex items-center justify-between border border-default rounded-lg p-4">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium">Estado actual:</span>
          <UBadge
            :label="statusConfig[currentPayment.status]?.label ?? currentPayment.status"
            :color="(statusConfig[currentPayment.status]?.color as any) ?? 'neutral'"
          />
          <span v-if="currentPayment.confirmed_at" class="text-xs text-muted">
            Confirmado el {{ new Date(currentPayment.confirmed_at).toLocaleDateString('es-AR') }}
          </span>
          <span v-if="currentPayment.payment_date" class="text-xs text-muted">
            Pagado el {{ new Date(currentPayment.payment_date).toLocaleDateString('es-AR') }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UButton v-if="isDraft" label="Confirmar" icon="i-lucide-check-circle" size="sm" color="info" @click="openAction('confirm')" />
          <UButton v-if="isConfirmed" label="Marcar pagado" icon="i-lucide-check" size="sm" color="success" @click="openAction('pay')" />
          <UButton v-if="isConfirmed" label="Rechazar" icon="i-lucide-x-circle" size="sm" color="warning" @click="openAction('reject')" />
          <UButton v-if="isConfirmed || isPaid" label="Anular" icon="i-lucide-undo-2" size="sm" color="error" @click="openAction('reverse')" />
        </div>
      </div>

      <!-- FORM (editable only when DRAFT) -->
      <div :class="{ 'max-w-4xl': true, 'opacity-60 pointer-events-none': !isDraft }">
        <PaymentForm
          :model-value="paymentData"
          :pending-sales-documents="pendingSalesDocuments"
          :pending-purchase-documents="pendingPurchaseDocuments"
          :available-own-checks="availableOwnChecks"
          :available-customer-checks="availableCustomerChecks"
          :loading="loading"
          @submit="handleSubmit"
          @cancel="router.push('/erp/treasury/payments')"
        />
      </div>
    </template>

    <!-- ACTION MODAL -->
    <UModal v-model:open="actionModalOpen" :title="actionLabels[actionType]?.title">
      <template #body>
        <p>{{ actionLabels[actionType]?.description }}</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="actionModalOpen = false" />
          <UButton
            :label="actionLabels[actionType]?.button"
            :color="(actionLabels[actionType]?.color as any)"
            @click="handleAction"
          />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
