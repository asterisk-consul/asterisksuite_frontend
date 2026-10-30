<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import PaymentStatusIndicator from '~/modulos/erp/payments/components/PaymentStatusIndicator.vue'
import PaymentApplyAdvanceModal from '~/modulos/erp/payments/components/PaymentApplyAdvanceModal.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useDocumentDetailShortcuts } from '~/modulos/erp/documents/composables/useDocumentDetailShortcuts'

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
        tenders: ((payment as any).tenders ?? []).map((tender: any) => ({
          method: tender.method,
          amount: Number(tender.amount),
          cash_box_id: tender.cash_box_id ?? tender.cash_box?.id ?? undefined,
          bank_account_id: tender.bank_account_id ?? tender.bank_account?.id ?? undefined,
        })),
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
      tenders: formData.payment_method === 'MIXED' ? formData.tenders : [],
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
      bank_account_id: formData.payment_method === 'MIXED' ? undefined : formData.bank_account_id || undefined,
      cash_box_id: formData.payment_method === 'MIXED' ? undefined : formData.cash_box_id || undefined,
      account_id: formData.account_id || null,
      check_ids: formData.check_ids?.length ? formData.check_ids : undefined,
      checks: formData.checks ?? [],
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
  if (type === 'confirm' && (isSaving.value || hasUnsavedDateChange.value)) {
    toast.add({
      title: 'Primero guardá el borrador',
      description: 'Esperá a que termine el guardado y guardá los cambios antes de confirmar el pago o cobro.',
      color: 'warning',
      icon: 'i-lucide-save'
    })
    return
  }
  actionType.value = type
  checkAction.value = 'RETURN_TO_PORTFOLIO'
  actionModalOpen.value = true
}

const paymentShortcutActions = computed(() => {
  const actions: Array<{ label: string; disabled?: boolean; onClick: () => void }> = []
  if (isDraft.value && canConfirmPayment.value) {
    actions.push({
      label: 'Confirmar',
      disabled: isProcessing.value || isSaving.value || hasUnsavedDateChange.value,
      onClick: () => openAction('confirm'),
    })
  }
  if (isConfirmed.value && canMarkAsPaid.value) {
    actions.push({ label: 'Marcar pagado', disabled: isProcessing.value, onClick: () => openAction('pay') })
  }
  if (isConfirmed.value && canRejectPayment.value) {
    actions.push({ label: 'Rechazar', disabled: isProcessing.value, onClick: () => openAction('reject') })
  }
  if ((isConfirmed.value || isPaid.value) && canReversePayment.value) {
    actions.push({ label: 'Anular', disabled: isProcessing.value, onClick: () => openAction('reverse') })
  }
  return actions
})

const { shortcutKeys: paymentShortcutKeys } = useDocumentDetailShortcuts(paymentShortcutActions, [actionModalOpen, advanceModalOpen])
const shortcutKeyText = (label: string) => paymentShortcutKeys(label)?.join(' + ')
const shortcutAriaValue = (label: string) => paymentShortcutKeys(label)?.join('+')

const handleFormModelUpdate = (value: PaymentFormData) => {
  editingDate.value = value.date ?? ''
}

const handleAction = async () => {
  if (isProcessing.value) return
  if (!currentPayment.value) return
  if (actionType.value === 'confirm' && (isSaving.value || hasUnsavedDateChange.value)) {
    toast.add({
      title: 'Primero guardá el borrador',
      description: 'Esperá a que termine el guardado y guardá los cambios antes de confirmar el pago o cobro.',
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
        <div v-if="isDraft" id="payment-form-actions" class="w-full pt-5 pb-3" />
        <div v-else-if="currentPayment" class="flex w-full flex-col gap-3 pt-5 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge v-if="isAdvance && availableBalance > 0 && (isConfirmed || isPaid)" label="Pendiente de asociar documento" color="warning" variant="subtle" />
            <UBadge
              v-if="isAdvance && availableBalance > 0 && (isConfirmed || isPaid)"
              :label="`Disponible: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: currentPayment.currency_code || 'ARS' }).format(availableBalance)}`"
              color="info"
              variant="subtle"
            />
            <UBadge v-if="isAdvance && availableBalance <= 0 && (isConfirmed || isPaid)" label="Saldado" color="success" variant="subtle" />
            <UButton
              v-if="isAdvance && availableBalance > 0 && (isConfirmed || isPaid)"
              label="Aplicar a factura"
              icon="i-lucide-link"
              size="sm"
              color="info"
              variant="outline"
              @click="advanceModalOpen = true"
            />
            <UButton
              v-if="(isConfirmed || isPaid) && currentPayment.party_id"
              label="Cuenta corriente"
              icon="i-lucide-arrow-right-circle"
              size="sm"
              color="primary"
              variant="outline"
              @click="router.push(`/erp/treasury/current-accounts/${currentPayment!.party_id}?currency=${currentPayment!.currency_code ?? 'ARS'}`)"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:justify-end">
            <UButton
              v-if="isConfirmed && canMarkAsPaid"
              label="Marcar pagado"
              icon="i-lucide-check"
              size="sm"
              color="success"
              :loading="isProcessing"
              :disabled="isProcessing"
              :aria-keyshortcuts="shortcutAriaValue('Marcar pagado')"
              :title="`Marcar pagado (Alt + ${shortcutKeyText('Marcar pagado')?.split(' + ')[1]})`"
              @click="openAction('pay')"
            >
              <template #trailing>
                <KeyboardShortcutHint :keys="paymentShortcutKeys('Marcar pagado') ?? []" size="2xs" />
              </template>
            </UButton>
            <UButton
              v-if="isConfirmed && canRejectPayment"
              label="Rechazar"
              icon="i-lucide-x-circle"
              size="sm"
              color="warning"
              variant="soft"
              :loading="isProcessing"
              :disabled="isProcessing"
              :aria-keyshortcuts="shortcutAriaValue('Rechazar')"
              :title="`Rechazar (Alt + ${shortcutKeyText('Rechazar')?.split(' + ')[1]})`"
              @click="openAction('reject')"
            >
              <template #trailing>
                <KeyboardShortcutHint :keys="paymentShortcutKeys('Rechazar') ?? []" size="2xs" />
              </template>
            </UButton>
            <UButton
              v-if="(isConfirmed || isPaid) && canReversePayment"
              label="Anular"
              icon="i-lucide-undo-2"
              size="sm"
              color="error"
              variant="outline"
              :loading="isProcessing"
              :disabled="isProcessing"
              :aria-keyshortcuts="shortcutAriaValue('Anular')"
              :title="`Anular (Alt + ${shortcutKeyText('Anular')?.split(' + ')[1]})`"
              @click="openAction('reverse')"
            >
              <template #trailing>
                <KeyboardShortcutHint :keys="paymentShortcutKeys('Anular') ?? []" size="2xs" />
              </template>
            </UButton>
            <PaymentStatusIndicator
              :status="currentPayment.status"
              :confirmed-at="currentPayment.confirmed_at"
              :payment-date="currentPayment.payment_date"
            />
          </div>
        </div>
      </template>
    </AppPageHeader>

    <div v-if="isInitialLoading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <template v-else-if="paymentData && currentPayment">
      <div class="flex w-full min-w-0 flex-col gap-4">
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
          >
            <template #action-bar-actions>
              <UButton
                v-if="isDraft && canConfirmPayment"
                label="Confirmar"
                icon="i-lucide-check-circle"
                size="sm"
                color="info"
                :loading="isProcessing"
                :disabled="isProcessing || isSaving || hasUnsavedDateChange"
                :aria-keyshortcuts="shortcutAriaValue('Confirmar')"
                :title="`Confirmar (Alt + ${shortcutKeyText('Confirmar')?.split(' + ')[1]})`"
                @click="openAction('confirm')"
              >
                <template #trailing>
                  <KeyboardShortcutHint :keys="paymentShortcutKeys('Confirmar') ?? []" size="2xs" />
                </template>
              </UButton>
            </template>
            <template #action-bar-status>
              <PaymentStatusIndicator
                v-if="isDraft"
                :status="currentPayment.status"
                :confirmed-at="currentPayment.confirmed_at"
                :payment-date="currentPayment.payment_date"
              />
            </template>
          </PaymentForm>
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
