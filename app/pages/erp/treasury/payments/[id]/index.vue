<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import PaymentApplyAdvanceModal from '~/modulos/erp/payments/components/PaymentApplyAdvanceModal.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const paymentId = route.params.id as string

const {
  current,
  fetchOne,
  update,
  confirm: confirmPayment,
  markAsPaid,
  reject,
  reverse,
  applyAdvance,
  removeAdvanceApplication,
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
const initialWithholdings = ref<any[]>([])
const isProcessing = ref(false)
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
const isAdvance = computed(() => currentPayment.value?.payment_mode === 'ADVANCE')

const availableBalance = computed(() => {
  if (!currentPayment.value) return 0
  const applied = currentPayment.value.documents?.reduce(
    (sum: number, d: any) => sum + Number(d.amount_applied), 0
  ) ?? 0
  return Number(currentPayment.value.amount) - applied
})

const advanceModalOpen = ref(false)

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
    console.log('[PaymentDetail] payment:', payment)
    console.log('[PaymentDetail] payment.documents:', (payment as any).documents)
    console.log('[PaymentDetail] payment.cash_box_id:', payment.cash_box_id)
    paymentData.value = {
      type: payment.type as 'PAYMENT' | 'COLLECTION',
      payment_mode: (payment.payment_mode as 'NORMAL' | 'ADVANCE') ?? 'NORMAL',
      date: payment.date?.split('T')[0] ?? today(),
      payment_method: payment.payment_method ?? 'CASH',
      amount: Number(payment.amount),
      currency_code: payment.currency_code ?? 'ARS',
      description: payment.description ?? '',
      reference: payment.reference ?? '',
      party_id: payment.party_id ?? '',
      bank_account_id: payment.bank_account_id ?? '',
      cash_box_id: payment.cash_box_id ?? '',
      account_id: payment.account_id ?? '',
      check_ids: [],
      documents: (payment as any).documents?.map((d: any) => ({
        document_id: d.document_id,
        amount_applied: Number(d.amount_applied),
      })) ?? [],
    }
    console.log('[PaymentDetail] paymentData:', paymentData.value)

    // Precargar retenciones guardadas
    const rawWithholdings = (payment as any).withholdings
    if (rawWithholdings && rawWithholdings.length > 0) {
      initialWithholdings.value = rawWithholdings.map((w: any) => ({
        tax_type: w.tax_type,
        jurisdiction_id: w.jurisdiction_id ?? null,
        jurisdiction_name: w.jurisdiction?.name ?? w.jurisdiction_name ?? null,
        withholding_concept_id: w.withholding_concept_id ?? null,
        tax_rule_id: w.tax_rule_id ?? null,
        rule_name: w.rule_name ?? 'Guardada',
        base_amount: Number(w.base_amount),
        prorrate_percentage: w.prorrate_percentage ? Number(w.prorrate_percentage) : null,
        rate: w.rate ? Number(w.rate) : 0,
        withheld_amount: Number(w.withheld_amount),
        automatic_amount: w.automatic_amount ? Number(w.automatic_amount) : null,
        reason: w.reason ?? w.observations ?? 'Carga guardada'
      }))
    }
  }
})

const handleSubmit = async (formData: PaymentFormData) => {
  try {
    const updated = await update(paymentId, {
      date: formData.date,
      payment_method: formData.payment_method as any,
      payment_mode: formData.payment_mode as any,
      amount: formData.amount,
      currency_code: formData.currency_code,
      description: formData.description || undefined,
      reference: formData.reference || undefined,
      party_id: formData.party_id || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      cash_box_id: formData.cash_box_id || undefined,
      account_id: formData.account_id || null,
      check_ids: formData.check_ids?.length ? formData.check_ids : undefined,
      documents: formData.documents?.length ? formData.documents : undefined,
    })
    currentPayment.value = updated as Payment
    toast.add({ title: 'Pago actualizado', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'Error al guardar',
      description: error?.data?.message || error?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

const openAction = (type: typeof actionType.value) => {
  actionType.value = type
  actionModalOpen.value = true
}

const handleAction = async () => {
  if (isProcessing.value) return
  if (!currentPayment.value) return

  isProcessing.value = true
  try {
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

    toast.add({
      title: actionLabels[actionType.value]?.title ?? 'Acción completada',
      color: 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isProcessing.value = false
  }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'neutral' },
  CONFIRMED: { label: 'Confirmado', color: 'info' },
  PAID: { label: 'Pagado', color: 'success' },
  REVERSED: { label: 'Rechazado', color: 'warning' },
  CANCELLED: { label: 'Anulado', color: 'error' }
}

const handleAdvanceSuccess = async () => {
  const updated = await fetchOne(paymentId)
  if (updated) currentPayment.value = updated as Payment
  toast.add({ title: 'Anticipo aplicado correctamente', color: 'success' })
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      :title="isAdvance ? 'Editar anticipo' : 'Editar pago / cobro'"
      :description="isAdvance ? 'Anticipo a proveedor o cliente' : 'Modificar pago o cobro existente'"
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
          <UPopover mode="hover" :open-delay="300" :close-delay="300">
            <UButton icon="i-lucide-help-circle" color="neutral" variant="ghost" size="xs" class="px-1" />
            <template #content>
              <div class="p-3 max-w-xs space-y-2 text-sm">
                <p class="font-medium">Estados del pago</p>
                <div class="space-y-1.5 text-xs">
                  <p class="flex items-start gap-1.5">
                    <UBadge label="Borrador" color="neutral" size="xs" class="mt-0.5 shrink-0" />
                    <span>Pago creado, editable. Aún no se aplicaron efectos.</span>
                  </p>
                  <p class="flex items-start gap-1.5">
                    <UBadge label="Confirmado" color="info" size="xs" class="mt-0.5 shrink-0" />
                    <span>Efectos aplicados: documentos saldados, caja/banco movido, cuenta corriente actualizada.</span>
                  </p>
                  <p class="flex items-start gap-1.5">
                    <UBadge label="Pagado" color="success" size="xs" class="mt-0.5 shrink-0" />
                    <span>Confirmación de que el dinero fue efectivamente entregado/recibido.</span>
                  </p>
                  <p class="flex items-start gap-1.5">
                    <UBadge label="Rechazado" color="warning" size="xs" class="mt-0.5 shrink-0" />
                    <span>Se revertirán todos los efectos aplicados.</span>
                  </p>
                  <p class="flex items-start gap-1.5">
                    <UBadge label="Anulado" color="error" size="xs" class="mt-0.5 shrink-0" />
                    <span>Pago cancelado definitivamente. Todos los efectos revertidos.</span>
                  </p>
                </div>
              </div>
            </template>
          </UPopover>
          <span v-if="currentPayment.confirmed_at" class="text-xs text-muted">
            Confirmado el {{ new Date(currentPayment.confirmed_at).toLocaleDateString('es-AR') }}
          </span>
          <span v-if="currentPayment.payment_date" class="text-xs text-muted">
            Pagado el {{ new Date(currentPayment.payment_date).toLocaleDateString('es-AR') }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <template v-if="isAdvance && availableBalance > 0 && (isConfirmed || isPaid)">
            <UBadge label="Pendiente de asociar documento" color="warning" variant="subtle" />
            <UBadge
              :label="`Disponible: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: currentPayment?.currency_code || 'ARS' }).format(availableBalance)}`"
              color="info"
              variant="subtle"
            />
            <UButton label="Aplicar a factura" icon="i-lucide-link" size="sm" color="info" variant="outline" @click="advanceModalOpen = true" />
          </template>
          <template v-if="isAdvance && availableBalance <= 0 && (isConfirmed || isPaid)">
            <UBadge label="Saldado" color="success" variant="subtle" />
          </template>
          <UButton v-if="isDraft" label="Confirmar" icon="i-lucide-check-circle" size="sm" color="info" :loading="isProcessing" :disabled="isProcessing" @click="openAction('confirm')" />
          <UButton v-if="isConfirmed" label="Marcar pagado" icon="i-lucide-check" size="sm" color="success" :loading="isProcessing" :disabled="isProcessing" @click="openAction('pay')" />
          <UButton v-if="isConfirmed" label="Rechazar" icon="i-lucide-x-circle" size="sm" color="warning" :loading="isProcessing" :disabled="isProcessing" @click="openAction('reject')" />
          <UButton v-if="isConfirmed || isPaid" label="Anular" icon="i-lucide-undo-2" size="sm" color="error" :loading="isProcessing" :disabled="isProcessing" @click="openAction('reverse')" />
          <UButton v-if="(isConfirmed || isPaid) && currentPayment?.party_id" label="Cuenta corriente" icon="i-lucide-arrow-right-circle" size="sm" color="primary" variant="outline" @click="router.push(`/erp/treasury/current-accounts/${currentPayment!.party_id}?currency=${currentPayment!.currency_code ?? 'ARS'}`)" />
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
          :initial-withholdings="initialWithholdings"
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
            :loading="isProcessing"
            :disabled="isProcessing"
            @click="handleAction"
          />
        </div>
      </template>
    </UModal>

    <!-- ADVANCE APPLICATION MODAL -->
    <PaymentApplyAdvanceModal
      v-if="isAdvance && currentPayment"
      v-model:open="advanceModalOpen"
      :payment-id="paymentId"
      :payment-type="currentPayment.type"
      :available-balance="availableBalance"
      :currency-code="currentPayment.currency_code || 'ARS'"
      :party-id="currentPayment.party_id || undefined"
      @success="handleAdvanceSuccess"
    />
  </UPage>
</template>
