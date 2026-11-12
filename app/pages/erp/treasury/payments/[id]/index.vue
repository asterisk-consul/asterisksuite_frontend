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
  reopenAsDraft,
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
const actionType = ref<'confirm' | 'pay' | 'reject' | 'reverse' | 'reopen'>('confirm')
const checkAction = ref<'RETURN_TO_PORTFOLIO' | 'CANCEL'>('RETURN_TO_PORTFOLIO')
const unsavedChangeSections = ref<string[]>([])
const saveRevision = ref(0)

useBreadcrumbEntityLabel(
  `/erp/treasury/payments/${paymentId}`,
  computed(() => currentPayment.value?.number ? `Pago / cobro #${currentPayment.value.number}` : null)
)

const actionLabels: Record<string, { title: string; button: string; color: string; description: string }> = {
  confirm: { title: 'Confirmar pago', button: 'Confirmar', color: 'info', description: 'Se aplicarán los datos guardados: documentos, caja/banco y cuenta corriente. Si cambiaste la fecha, primero guardá el borrador.' },
  pay: { title: 'Marcar como pagado', button: 'Marcar pagado', color: 'success', description: 'El pago pasará a estado Pagado.' },
  reject: { title: 'Rechazar pago', button: 'Rechazar', color: 'warning', description: 'Se revertirán todos los efectos (documentos, caja/banco, cuenta corriente).' },
  reverse: { title: 'Anular pago', button: 'Anular', color: 'error', description: 'Se revertirán todos los efectos y el pago quedará anulado.' },
  reopen: { title: 'Volver a borrador', button: 'Volver a borrador', color: 'warning', description: 'El pago o cobro volverá a ser editable. Se conservarán las reversiones de caja, banco y cuenta corriente; los cheques asociados se liberarán para que puedas seleccionarlos de nuevo. Los cheques cancelados seguirán cancelados. No habrá nuevos efectos hasta que confirmes el borrador.' }
}

const isDraft = computed(() => currentPayment.value?.status === 'DRAFT')
const isConfirmed = computed(() => currentPayment.value?.status === 'CONFIRMED')
const isPaid = computed(() => currentPayment.value?.status === 'PAID')
const can = (permission: string) => authStore.selectedCompany?.role === 'OWNER' || hasPermission(permission)
const canConfirmPayment = computed(() => can('payments.confirm'))
const canMarkAsPaid = computed(() => can('payments.mark_as_paid'))
const canRejectPayment = computed(() => can('payments.reject'))
const canReversePayment = computed(() => can('payments.reverse'))
const canReopenAsDraft = computed(() =>
  currentPayment.value?.status === 'CANCELLED'
  && ['PAYMENT', 'COLLECTION'].includes(String(currentPayment.value?.type))
  && (
    ['CASH', 'BANK_TRANSFER', 'CHECK'].includes(String(currentPayment.value?.payment_method))
    || currentPayment.value?.payment_method === 'MIXED'
      && currentPayment.value?.tenders?.some((tender: any) => tender.method === 'CHECK')
  )
  && can('payments.update')
)
const canEditFinalizedFinancialDetails = computed(() =>
  (isConfirmed.value || isPaid.value)
  && (['OWNER', 'ADMIN'].includes(String(authStore.selectedCompany?.role)) || hasPermission('payments.update'))
  && ['CASH', 'BANK_TRANSFER'].includes(String(currentPayment.value?.payment_method))
  && currentPayment.value?.payment_mode !== 'ADVANCE'
  && (currentPayment.value?.type === 'PAYMENT' && !currentPayment.value?.party_id || Boolean(currentPayment.value?.party_id && currentPayment.value?.documents?.length))
)
const canEditFinalizedExchangeRate = computed(() =>
  (isConfirmed.value || isPaid.value)
  && (['OWNER', 'ADMIN'].includes(String(authStore.selectedCompany?.role)) || hasPermission('payments.update'))
  && currentPayment.value?.payment_mode !== 'ADVANCE'
  && currentPayment.value?.currency_code?.toUpperCase() === 'ARS'
  && Boolean(currentPayment.value?.documents?.some((row: any) => row.document?.currency_code?.toUpperCase() === 'USD'))
)
const isAdvance = computed(() => currentPayment.value?.payment_mode === 'ADVANCE')
const hasUnsavedDateChange = computed(() => isDraft.value && editingDate.value !== savedDate.value)
const hasUnsavedChanges = computed(() =>
  isDraft.value && (unsavedChangeSections.value.length > 0 || hasUnsavedDateChange.value)
)
const unsavedChangesDescription = computed(() => {
  const sections = [...unsavedChangeSections.value]
  if (hasUnsavedDateChange.value && !sections.includes('Datos del pago/cobro')) sections.unshift('Fecha')
  return sections.length
    ? `Cambios pendientes: ${sections.join(', ')}. Guardá el borrador antes de confirmar.`
    : 'Hay cambios pendientes. Guardá el borrador antes de confirmar.'
})
const counterpartyLabel = computed(() => currentPayment.value?.type === 'COLLECTION'
  ? 'Cliente'
  : currentPayment.value?.type === 'PAYMENT'
    ? 'Proveedor'
    : 'Tercero')

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
          cash_box_company_id: tender.cash_box_company_id ?? undefined,
          cash_box_external_id: tender.cash_box_external_id ?? undefined,
          bank_account_company_id: tender.bank_account_company_id ?? undefined,
          bank_account_external_id: tender.bank_account_external_id ?? undefined,
        })),
        amount: Number(payment.amount),
        currency_code: payment.currency_code ?? 'ARS',
        exchange_rate: payment.exchange_rate == null ? null : Number(payment.exchange_rate),
        rate_type: payment.rate_type ?? 'OFFICIAL',
        converted_amount: payment.converted_amount == null ? null : Number(payment.converted_amount),
        description: payment.description ?? '',
        reference: payment.reference ?? '',
        party_id: payment.party_id ?? '',
        bank_account_id: payment.bank_account_id ?? '',
        cash_box_id: payment.cash_box_id ?? '',
        bank_account_company_id: payment.bank_account_company_id ?? undefined,
        bank_account_external_id: payment.bank_account_external_id ?? undefined,
        cash_box_company_id: payment.cash_box_company_id ?? undefined,
        cash_box_external_id: payment.cash_box_external_id ?? undefined,
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
      exchange_rate: formData.exchange_rate ?? undefined,
      rate_type: formData.rate_type ?? undefined,
      converted_amount: formData.converted_amount ?? undefined,
      description: formData.description || undefined,
      reference: formData.reference || undefined,
      party_id: formData.party_id || undefined,
      bank_account_id: formData.payment_method === 'MIXED' ? undefined : formData.bank_account_id || undefined,
      cash_box_id: formData.payment_method === 'MIXED' ? undefined : formData.cash_box_id || undefined,
      bank_account_company_id: formData.payment_method === 'MIXED' ? undefined : formData.bank_account_company_id || undefined,
      bank_account_external_id: formData.payment_method === 'MIXED' ? undefined : formData.bank_account_external_id || undefined,
      cash_box_company_id: formData.payment_method === 'MIXED' ? undefined : formData.cash_box_company_id || undefined,
      cash_box_external_id: formData.payment_method === 'MIXED' ? undefined : formData.cash_box_external_id || undefined,
      account_id: formData.account_id || undefined,
      check_ids: formData.check_ids?.length ? formData.check_ids : undefined,
      checks: formData.checks ?? [],
      documents: formData.documents ?? [],
      obligations: formData.obligations ?? [],
      withholdings: formData.withholdings ?? [],
    })
    currentPayment.value = updated as Payment
    savedDate.value = updated.date?.split('T')[0] ?? formData.date
    saveRevision.value += 1
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

const handleFinalizedDetailsSave = async (payload: { rate_only?: boolean; account_id?: string | null; party_id?: string | null; withholdings?: any[]; exchange_rate?: number | null; rate_type?: string | null }) => {
  if (isSaving.value || (!canEditFinalizedFinancialDetails.value && !canEditFinalizedExchangeRate.value)) return
  isSaving.value = true
  try {
    const updated = await updateFinalizedFinancialDetails(paymentId, payload)
    currentPayment.value = updated as Payment
    if (paymentData.value) paymentData.value = {
      ...paymentData.value,
      amount: Number(updated.amount),
      converted_amount: updated.converted_amount == null ? null : Number(updated.converted_amount),
      exchange_rate: updated.exchange_rate == null ? null : Number(updated.exchange_rate),
      rate_type: updated.rate_type ?? 'OFFICIAL',
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
    toast.add({ title: 'Cambios financieros guardados', description: 'La cotización no altera los importes nominales en pesos. Si modificaste retenciones, se recalcularon el movimiento y los saldos; el importe aplicado a las facturas se conserva.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudieron guardar los cambios', description: error?.data?.message || error?.message || 'Revisá las retenciones y la cuenta seleccionada.', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    isSaving.value = false
  }
}

const openAction = (type: typeof actionType.value) => {
  if (type === 'confirm' && (isSaving.value || hasUnsavedChanges.value)) {
    toast.add({
      title: 'Hay cambios sin guardar',
      description: unsavedChangesDescription.value,
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
  if (isDraft.value && canConfirmPayment.value && !hasUnsavedChanges.value) {
    actions.push({
      label: 'Confirmar',
      disabled: isProcessing.value || isSaving.value,
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

const handleFormModelUpdate = (value: PaymentFormData) => {
  editingDate.value = value.date ?? ''
}

const handleDraftDirtyChange = (sections: string[]) => {
  unsavedChangeSections.value = sections
}

const handleAction = async () => {
  if (isProcessing.value) return
  if (!currentPayment.value) return
  if (actionType.value === 'confirm' && (isSaving.value || hasUnsavedChanges.value)) {
    toast.add({
      title: 'Hay cambios sin guardar',
      description: unsavedChangesDescription.value,
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
      case 'reopen':
        await reopenAsDraft(paymentId)
        await Promise.all([
          fetchPendingSalesDocuments(),
          fetchPendingPurchaseDocuments(),
          fetchAvailableOwnChecks(),
          fetchAvailableCustomerChecks()
        ])
        break
    }

    const updated = await fetchOne(paymentId)
    if (updated) {
      currentPayment.value = updated as Payment
      if (actionType.value === 'reopen' && paymentData.value) {
        paymentData.value = {
          ...paymentData.value,
          date: updated.date?.split('T')[0] ?? paymentData.value.date,
          amount: Number(updated.amount),
          currency_code: updated.currency_code ?? paymentData.value.currency_code,
          check_ids: [],
          checks: [],
          payment_allocations: [],
          documents: (updated as any).documents?.map((document: any) => ({
            document_id: document.document_id,
            amount_applied: Number(document.amount_applied),
            document: document.document,
          })) ?? [],
        }
        const rows = (updated as any).withholdings ?? []
        initialWithholdings.value = rows.map((withholding: any) => ({
          is_manual: !withholding.tax_rule_id && !withholding.withholding_concept_id,
          tax_type: withholding.tax_type,
          jurisdiction_id: withholding.jurisdiction_id ?? null,
          jurisdiction_name: withholding.jurisdiction?.name ?? null,
          withholding_concept_id: withholding.withholding_concept_id ?? null,
          tax_rule_id: withholding.tax_rule_id ?? null,
          rule_name: withholding.rule_name ?? 'Guardada',
          base_amount: Number(withholding.base_amount),
          prorrate_percentage: withholding.prorrate_percentage == null ? null : Number(withholding.prorrate_percentage),
          rate: withholding.rate == null ? 0 : Number(withholding.rate),
          withheld_amount: Number(withholding.withheld_amount),
          automatic_amount: withholding.automatic_amount == null ? null : Number(withholding.automatic_amount),
          reason: withholding.observations ?? 'Carga guardada',
          certificate_number: withholding.certificate_number ?? undefined,
          certificate_date: withholding.certificate_date?.split('T')[0] ?? undefined,
          is_locked: Boolean(withholding.certificate_number || withholding.remittance_id),
        }))
      }
    }
    actionModalOpen.value = false

    toast.add({
      title: actionType.value === 'reopen' ? 'Pago o cobro recuperado como borrador' : actionLabels[actionType.value]?.title ?? 'Acción completada',
      ...(actionType.value === 'reopen' ? { description: 'Revisá los comprobantes y las retenciones, y volvé a seleccionar los cheques que correspondan antes de confirmar.' } : {}),
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
  if (updated) {
    currentPayment.value = updated as Payment
    if (paymentData.value) {
      paymentData.value = {
        ...paymentData.value,
        documents: (updated.documents ?? []).map(document => ({
          document_id: document.document_id,
          amount_applied: Number(document.amount_applied),
          document: document.document,
        })),
      }
    }
  }
  toast.add({ title: 'Anticipo aplicado correctamente', color: 'success' })
}
</script>

<template>
  <UPage class="flex w-full min-w-0 flex-col gap-4">
    <AppPageHeader
      :title="isDraft ? (isAdvance ? 'Editar anticipo' : 'Editar pago / cobro') : (isAdvance ? 'Detalle del anticipo' : 'Detalle de pago / cobro')"
      :description="isDraft ? (isAdvance ? 'Anticipo a proveedor o cliente' : 'Modificar pago o cobro en borrador') : 'Solo se pueden editar operaciones en borrador. Esta operación ya no admite cambios.'"
    >
      <template #links>
        <PaymentStatusIndicator
          v-if="currentPayment"
          :status="currentPayment.status"
          :confirmed-at="currentPayment.confirmed_at"
          :payment-date="currentPayment.payment_date"
          stacked
        />
      </template>
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
              label="Aplicar anticipo"
              icon="i-lucide-link"
              size="sm"
              color="info"
              variant="outline"
              @click="() => { advanceModalOpen = true }"
            />
            <UButton
              v-if="(isConfirmed || isPaid) && currentPayment.party_id"
              label="Cuenta corriente"
              icon="i-lucide-arrow-right-circle"
              size="sm"
              color="primary"
              variant="outline"
              @click="() => { void (router.push(`/erp/treasury/current-accounts/${currentPayment!.party_id}?currency=${currentPayment!.currency_code ?? 'ARS'}`)) }"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:justify-end">
            <UButton
              v-if="canReopenAsDraft"
              label="Volver a borrador"
              icon="i-lucide-file-pen-line"
              size="sm"
              color="warning"
              variant="outline"
              :loading="isProcessing"
              :disabled="isProcessing"
              @click="openAction('reopen')"
            />
            <ShortcutButton
              v-if="isConfirmed && canMarkAsPaid"
              label="Marcar pagado"
              :shortcut-keys="paymentShortcutKeys('Marcar pagado') ?? []"
              icon="i-lucide-check"
              size="sm"
              color="success"
              :loading="isProcessing"
              :disabled="isProcessing"
              @click="openAction('pay')"
            />
            <ShortcutButton
              v-if="isConfirmed && canRejectPayment"
              label="Rechazar"
              :shortcut-keys="paymentShortcutKeys('Rechazar') ?? []"
              icon="i-lucide-x-circle"
              size="sm"
              color="warning"
              variant="soft"
              :loading="isProcessing"
              :disabled="isProcessing"
              @click="openAction('reject')"
            />
            <ShortcutButton
              v-if="(isConfirmed || isPaid) && canReversePayment"
              label="Anular"
              :shortcut-keys="paymentShortcutKeys('Anular') ?? []"
              icon="i-lucide-undo-2"
              size="sm"
              color="error"
              variant="outline"
              :loading="isProcessing"
              :disabled="isProcessing"
              @click="openAction('reverse')"
            />
          </div>
        </div>
      </template>
    </AppPageHeader>

    <div v-if="currentPayment" class="flex min-w-0 items-center gap-3 rounded-xl border border-default bg-elevated/40 px-4 py-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon :name="currentPayment.type === 'COLLECTION' ? 'i-lucide-user-round' : 'i-lucide-building-2'" class="size-5" />
      </div>
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ counterpartyLabel }}</p>
        <p class="break-words font-semibold">{{ currentPayment.party?.name || 'Sin tercero asignado' }}</p>
      </div>
    </div>

    <div v-if="isInitialLoading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <template v-else-if="paymentData && currentPayment">
      <div class="flex w-full min-w-0 flex-col gap-4">
        <UAlert
          v-if="isDraft && hasUnsavedChanges"
          color="warning"
          variant="subtle"
          icon="i-lucide-save"
          title="Hay cambios sin guardar"
          :description="unsavedChangesDescription"
        />

        <details v-if="!isDraft" class="group rounded-lg border border-warning/20 bg-warning/5">
          <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
            <UIcon name="i-lucide-lock-keyhole" class="size-4 shrink-0 text-warning" />
            <span class="font-medium">Edición limitada</span>
            <span class="text-muted">· Ver qué se puede modificar</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="ml-auto size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            />
          </summary>
          <p class="border-t border-warning/15 px-3 py-2 pl-9 text-sm leading-relaxed text-muted">
            La fecha, el medio y las facturas aplicadas se bloquean al confirmar. Con permiso, podés ajustar retenciones y cuenta contable; el importe del pago y el saldo de caja o banco se recalculan sobre el movimiento original.
          </p>
        </details>

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
            :allow-finalized-rate-edit="canEditFinalizedExchangeRate"
            :saving-financial-details="isSaving"
            :local-draft-enabled="false"
            :save-only-when-dirty="true"
            :save-revision="saveRevision"
            :loading="isSaving"
            submit-label="Guardar borrador"
            @update:model-value="handleFormModelUpdate"
            @dirty-change="handleDraftDirtyChange"
            @submit="handleSubmit"
            @save-finalized-details="handleFinalizedDetailsSave"
            @cancel="router.push('/erp/treasury/payments')"
          >
            <template #action-bar-actions>
              <ShortcutButton
                v-if="isDraft && canConfirmPayment && !hasUnsavedChanges"
                label="Confirmar"
                :shortcut-keys="paymentShortcutKeys('Confirmar') ?? []"
                icon="i-lucide-check-circle"
                size="sm"
                color="info"
                :loading="isProcessing"
                :disabled="isProcessing || isSaving"
                @click="openAction('confirm')"
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
          v-if="actionType === 'confirm' && hasUnsavedChanges"
          class="mt-3"
          color="warning"
          variant="subtle"
          icon="i-lucide-save"
          title="Hay cambios sin guardar"
          :description="unsavedChangesDescription"
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
          <UButton label="Cancelar" variant="ghost" @click="() => { actionModalOpen = false }" />
          <UButton
            :label="actionLabels[actionType]?.button"
            :color="(actionLabels[actionType]?.color as any)"
            :loading="isProcessing"
            :disabled="isProcessing || (actionType === 'confirm' && hasUnsavedChanges)"
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
      :exchange-rate="currentPayment.exchange_rate"
      :party-id="currentPayment.party_id || undefined"
      :party-name="currentPayment.party?.name"
      @success="handleAdvanceSuccess"
    />
  </UPage>
</template>
