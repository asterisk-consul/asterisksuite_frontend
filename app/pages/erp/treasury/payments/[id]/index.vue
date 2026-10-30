<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import PaymentApplyAdvanceModal from '~/modulos/erp/payments/components/PaymentApplyAdvanceModal.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const paymentId = route.params.id as string

const {
  current,
  fetchOne,
  update,
  updateFinalizedFinancialDetails,
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
  availableCustomerChecks
} = usePayments()

const paymentData = ref<PaymentFormData | null>(null)
const currentPayment = ref<Payment | null>(null)
const isInitialLoading = ref(true)
const savedDate = ref('')
const editingDate = ref('')
const initialWithholdings = ref<any[]>([])
const isProcessing = ref(false)
const isSaving = ref(false)
const actionModalOpen = ref(false)
const actionType = ref<'confirm' | 'pay' | 'reject' | 'reverse'>('confirm')
const checkAction = ref<'RETURN_TO_PORTFOLIO' | 'CANCEL'>('RETURN_TO_PORTFOLIO')

useBreadcrumbEntityLabel(
  `/erp/treasury/payments/${paymentId}`,
  computed(() => currentPayment.value?.number ? `Pago / cobro #${currentPayment.value.number}` : null)
)

const actionLabels: Record<string, { title: string; button: string; color: string; description: string }> = {
  confirm: { title: 'Confirmar pago', button: 'Confirmar', color: 'info', description: 'Se aplicarán los datos guardados: documentos, caja/banco y cuenta corriente. Si cambiaste la fecha, primero guardá el borrador.' },
  pay: { title: 'Marcar como pagado', button: 'Marcar pagado', color: 'success', description: 'El pago pasará a estado Pagado.' },
  reject: { title: 'Rechazar pago', button: 'Rechazar', color: 'warning', description: 'Se revertirán todos los efectos (documentos, caja/banco, cuenta corriente).' },
  reverse: { title: 'Anular pago', button: 'Anular', color: 'error', description: 'Se revertirán todos los efectos y el pago quedará anulado.' }
}

const isDraft = computed(() => currentPayment.value?.status === 'DRAFT')
const isConfirmed = computed(() => currentPayment.value?.status === 'CONFIRMED')
const isPaid = computed(() => currentPayment.value?.status === 'PAID')
const can = (permission: string) => authStore.selectedCompany?.role === 'OWNER' || hasPermission(permission)
const canConfirmPayment = computed(() => can('payments.confirm'))
const canMarkAsPaid = computed(() => can('payments.mark_as_paid'))
const canRejectPayment = computed(() => can('payments.reject'))
const canReversePayment = computed(() => can('payments.reverse'))
const canEditFinalizedFinancialDetails = computed(() =>
  (isConfirmed.value || isPaid.value)
  && (['OWNER', 'ADMIN'].includes(String(authStore.selectedCompany?.role)) || hasPermission('payments.update'))
  && ['CASH', 'BANK_TRANSFER'].includes(String(currentPayment.value?.payment_method))
  && currentPayment.value?.payment_mode !== 'ADVANCE'
  && (currentPayment.value?.type === 'EXPENSE' || Boolean(currentPayment.value?.party_id && currentPayment.value?.documents?.length))
)
const isAdvance = computed(() => currentPayment.value?.payment_mode === 'ADVANCE')
const hasUnsavedDateChange = computed(() => isDraft.value && editingDate.value !== savedDate.value)

const availableBalance = computed(() => {
  if (!currentPayment.value) return 0
  const applied = currentPayment.value.documents?.reduce(
    (sum: number, d: any) => sum + Number(d.amount_applied), 0
  ) ?? 0
  return Number(currentPayment.value.amount) - applied
})

const advanceModalOpen = ref(false)

onMounted(async () => {
  void fetchMyPermissionsIfNeeded(authStore.selectedCompany?.id, authStore.user?.id).catch(() => undefined)
  try {
    const payment = await fetchOne(paymentId)

    if (payment) {
      currentPayment.value = payment as Payment
      savedDate.value = payment.date?.split('T')[0] ?? ''
      editingDate.value = savedDate.value
      paymentData.value = {
        type: payment.type as 'PAYMENT' | 'COLLECTION' | 'EXPENSE',
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
        credit_card_id: (payment as any).credit_card_transactions?.[0]?.credit_card_id ?? '',
        installments_total: (payment as any).credit_card_transactions?.[0]?.installments_total ?? 1,
        card_authorization: (payment as any).credit_card_transactions?.[0]?.authorization ?? '',
        expected_clearing_date: (payment as any).credit_card_transactions?.[0]?.expected_clearing_date?.split('T')[0] ?? '',
        check_ids: ((payment as any).payment_allocations ?? [])
          .map((allocation: any) => allocation.check_id ?? allocation.check?.id)
          .filter(Boolean),
        documents: (payment as any).documents?.map((d: any) => ({
          document_id: d.document_id,
          amount_applied: Number(d.amount_applied),
          document: d.document,
        })) ?? [],
        obligations: (payment as any).obligations?.map((obligation: any) => ({
          obligation_id: obligation.id,
          amount_applied: Number(obligation.amount ?? obligation.estimated_amount),
          obligation,
        })) ?? [],
        bank_account: (payment as any).bank_account,
        cash_box: (payment as any).cash_box,
        account: (payment as any).account,
        payment_allocations: (payment as any).payment_allocations ?? [],
      }

      // Solo fetchear documentos pendientes si el pago es editable (DRAFT)
      if (payment.status === 'DRAFT') {
        await Promise.all([
          fetchPendingSalesDocuments(),
          fetchPendingPurchaseDocuments(),
          fetchAvailableOwnChecks(),
          fetchAvailableCustomerChecks()
        ])
      }

      // Precargar retenciones guardadas
      const rawWithholdings = (payment as any).withholdings
      if (rawWithholdings && rawWithholdings.length > 0) {
        initialWithholdings.value = rawWithholdings.map((w: any) => ({
          is_manual: !w.tax_rule_id && !w.withholding_concept_id,
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
          reason: w.reason ?? w.observations ?? 'Carga guardada',
          is_locked: Boolean(w.certificate_number || w.remittance_id)
        }))
      }
    }
  } catch (error: any) {
    toast.add({
      title: 'No se pudo completar la carga',
      description: error?.data?.message || error?.message || 'Revisá tus permisos y volvé a intentar.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isInitialLoading.value = false
  }
})

const handleSubmit = async (formData: PaymentFormData) => {
  if (isSaving.value || !isDraft.value) return
  isSaving.value = true
  try {
    const updated = await update(paymentId, {
      date: formData.date,
      payment_method: formData.payment_method as any,
      credit_card_id:
        formData.payment_method === 'CREDIT_CARD' ? formData.credit_card_id || undefined : undefined,
      installments_total:
        formData.payment_method === 'CREDIT_CARD' ? formData.installments_total ?? 1 : undefined,
      card_authorization:
        formData.payment_method === 'CREDIT_CARD' ? formData.card_authorization || undefined : undefined,
      expected_clearing_date:
        formData.payment_method === 'CREDIT_CARD' ? formData.expected_clearing_date || undefined : undefined,
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
      documents: formData.documents ?? [],
      obligations: formData.obligations ?? [],
      withholdings: formData.withholdings ?? [],
    })
    currentPayment.value = updated as Payment
    savedDate.value = updated.date?.split('T')[0] ?? formData.date
    toast.add({ title: 'Pago actualizado', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'Error al guardar',
      description: error?.data?.message || error?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isSaving.value = false
  }
}

const handleFinalizedDetailsSave = async (payload: { account_id: string | null; party_id?: string | null; withholdings: any[] }) => {
  if (isSaving.value || !canEditFinalizedFinancialDetails.value) return
  isSaving.value = true
  try {
    const updated = await updateFinalizedFinancialDetails(paymentId, payload)
    currentPayment.value = updated as Payment
    if (paymentData.value) paymentData.value = {
      ...paymentData.value,
      amount: Number(updated.amount),
      converted_amount: updated.converted_amount == null ? null : Number(updated.converted_amount),
      account_id: updated.account_id ?? '',
      account: (updated as any).account,
      party_id: updated.party_id ?? '',
    }
    const rows = (updated as any).withholdings ?? []
    initialWithholdings.value = rows.map((w: any) => ({
      is_manual: !w.tax_rule_id && !w.withholding_concept_id,
      tax_type: w.tax_type,
      jurisdiction_id: w.jurisdiction_id ?? null,
      jurisdiction_name: w.jurisdiction?.name ?? null,
      withholding_concept_id: w.withholding_concept_id ?? null,
      tax_rule_id: w.tax_rule_id ?? null,
      rule_name: w.rule_name ?? 'Guardada',
      base_amount: Number(w.base_amount),
      prorrate_percentage: w.prorrate_percentage == null ? null : Number(w.prorrate_percentage),
      rate: w.rate == null ? 0 : Number(w.rate),
      withheld_amount: Number(w.withheld_amount),
      automatic_amount: w.automatic_amount == null ? null : Number(w.automatic_amount),
      reason: w.observations ?? 'Carga guardada',
      certificate_number: w.certificate_number ?? undefined,
      certificate_date: w.certificate_date?.split('T')[0] ?? undefined,
      is_locked: Boolean(w.certificate_number || w.remittance_id),
    }))
    toast.add({ title: 'Cambios financieros guardados', description: 'Se actualizó el importe del pago y se recalcularon los saldos de caja/banco y cuenta corriente. El bruto aplicado a las facturas se conservó.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudieron guardar los cambios', description: error?.data?.message || error?.message || 'Revisá las retenciones y la cuenta seleccionada.', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    isSaving.value = false
  }
}

const openAction = (type: typeof actionType.value) => {
  if (type === 'confirm' && hasUnsavedDateChange.value) {
    toast.add({
      title: 'Primero guardá la fecha',
      description: 'Usá “Guardar borrador” antes de confirmar el pago o cobro.',
      color: 'warning',
      icon: 'i-lucide-save'
    })
    return
  }
  actionType.value = type
  checkAction.value = 'RETURN_TO_PORTFOLIO'
  actionModalOpen.value = true
}

const handleFormModelUpdate = (value: PaymentFormData) => {
  editingDate.value = value.date ?? ''
}

const handleAction = async () => {
  if (isProcessing.value) return
  if (!currentPayment.value) return
  if (actionType.value === 'confirm' && hasUnsavedDateChange.value) {
    toast.add({
      title: 'Primero guardá la fecha',
      description: 'Usá “Guardar borrador” antes de confirmar el pago o cobro.',
      color: 'warning',
      icon: 'i-lucide-save'
    })
    return
  }

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
        await reverse(paymentId, currentPayment.value.payment_method === 'CHECK' ? checkAction.value : undefined)
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
  <UPage class="flex w-full min-w-0 flex-col gap-4">
    <AppPageHeader
      :title="isDraft ? (isAdvance ? 'Editar anticipo' : 'Editar pago / cobro') : (isAdvance ? 'Detalle del anticipo' : 'Detalle de pago / cobro')"
      :description="isDraft ? (isAdvance ? 'Anticipo a proveedor o cliente' : 'Modificar pago o cobro en borrador') : 'Solo se pueden editar operaciones en borrador. Esta operación ya no admite cambios.'"
    >
      <template #footer>
        <div id="payment-form-actions" class="w-full pt-5 pb-3" />
      </template>
    </AppPageHeader>

    <div v-if="isInitialLoading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <template v-else-if="paymentData && currentPayment">
      <div class="flex w-full min-w-0 flex-col gap-4">
        <!-- STATUS BAR -->
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div class="flex flex-wrap items-center gap-2">
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
          <div class="flex flex-wrap items-center gap-2">
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
            <UButton v-if="isDraft && canConfirmPayment" label="Confirmar" icon="i-lucide-check-circle" size="sm" color="info" :loading="isProcessing" :disabled="isProcessing || hasUnsavedDateChange" @click="openAction('confirm')" />
            <UButton v-if="isConfirmed && canMarkAsPaid" label="Marcar pagado" icon="i-lucide-check" size="sm" color="success" :loading="isProcessing" :disabled="isProcessing" @click="openAction('pay')" />
            <UButton v-if="isConfirmed && canRejectPayment" label="Rechazar" icon="i-lucide-x-circle" size="sm" color="warning" :loading="isProcessing" :disabled="isProcessing" @click="openAction('reject')" />
            <UButton v-if="(isConfirmed || isPaid) && canReversePayment" label="Anular" icon="i-lucide-undo-2" size="sm" color="error" :loading="isProcessing" :disabled="isProcessing" @click="openAction('reverse')" />
            <UButton v-if="(isConfirmed || isPaid) && currentPayment?.party_id" label="Cuenta corriente" icon="i-lucide-arrow-right-circle" size="sm" color="primary" variant="outline" @click="router.push(`/erp/treasury/current-accounts/${currentPayment!.party_id}?currency=${currentPayment!.currency_code ?? 'ARS'}`)" />
          </div>
        </div>

        <UAlert
          v-if="isDraft && hasUnsavedDateChange"
          color="warning"
          variant="subtle"
          icon="i-lucide-save"
          title="Tenés una fecha sin guardar"
          description="La fecha todavía no se aplicó al pago o cobro. Hacé clic en “Guardar borrador” al inicio del formulario; después vas a poder confirmarlo."
        />

        <UAlert
          v-if="!isDraft"
          color="warning"
          variant="subtle"
          icon="i-lucide-lock-keyhole"
          title="Operación de solo lectura"
          description="La fecha, el medio y las facturas aplicadas se bloquean al confirmar. Con permiso, podés ajustar retenciones y cuenta contable; el importe del pago y el saldo de caja o banco se recalculan sobre el movimiento original."
        />

        <!-- FORM (readonly when not DRAFT) -->
        <div class="flex w-full min-w-0 flex-col gap-4">
          <PaymentForm
            :model-value="paymentData"
            action-bar-target="#payment-form-actions"
            :readonly="!isDraft"
            :pending-sales-documents="pendingSalesDocuments"
            :pending-purchase-documents="pendingPurchaseDocuments"
            :available-own-checks="availableOwnChecks"
            :available-customer-checks="availableCustomerChecks"
            :initial-withholdings="initialWithholdings"
            :allow-finalized-financial-edit="canEditFinalizedFinancialDetails"
            :saving-financial-details="isSaving"
            :local-draft-enabled="false"
            :loading="isSaving"
            submit-label="Guardar borrador"
            @update:model-value="handleFormModelUpdate"
            @submit="handleSubmit"
            @save-finalized-details="handleFinalizedDetailsSave"
            @cancel="router.push('/erp/treasury/payments')"
          />
          <UiAttachmentManager
            entity-type="payment"
            :entity-id="paymentId"
            :readonly="!isDraft"
          />
        </div>
      </div>
    </template>

    <!-- ACTION MODAL -->
    <UModal v-model:open="actionModalOpen" :title="actionLabels[actionType]?.title">
      <template #body>
        <p>{{ actionLabels[actionType]?.description }}</p>
        <UAlert
          v-if="actionType === 'confirm' && hasUnsavedDateChange"
          class="mt-3"
          color="warning"
          variant="subtle"
          icon="i-lucide-save"
          title="La fecha todavía no está guardada"
          description="Cerrá este cuadro y usá “Guardar borrador” antes de confirmar."
        />
        <div v-if="actionType === 'reverse' && currentPayment?.payment_method === 'CHECK'" class="mt-4 space-y-2">
          <p class="text-sm font-medium">¿Qué debe ocurrir con el cheque?</p>
          <URadioGroup
            v-model="checkAction"
            :items="[
              { label: 'Devolverlo a cartera', description: 'El cheque vuelve a quedar pendiente y disponible para utilizarse.', value: 'RETURN_TO_PORTFOLIO' },
              { label: 'Cancelar también el cheque', description: 'El cheque queda cancelado y no podrá volver a utilizarse.', value: 'CANCEL' }
            ]"
            variant="card"
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="actionModalOpen = false" />
          <UButton
            :label="actionLabels[actionType]?.button"
            :color="(actionLabels[actionType]?.color as any)"
            :loading="isProcessing"
            :disabled="isProcessing || (actionType === 'confirm' && hasUnsavedDateChange)"
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
