<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'

const route = useRoute()

const {
  create,
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

const router = useRouter()
const toast = useToast()
const intakeId = ref<string | undefined>(route.query.intakeId as string | undefined)
const quickCaptureLoading = ref(false)
const quickCaptureActive = ref(Boolean(intakeId.value))
const hasUploadedFile = ref(Boolean(intakeId.value))
const showAssignment = ref(false)
const users = ref<Array<{ id: string; name: string; email: string }>>([])
const assignedTo = ref('')
const sendingCapture = ref(false)

const partyId = computed(() => (route.query.party_id as string) || undefined)
const documentId = computed(() => (route.query.document_id as string) || undefined)
const paymentType = computed(() => (route.query.type as 'PAYMENT' | 'COLLECTION') || 'PAYMENT')

const initialValues = ref<PaymentFormData | undefined>(
  partyId.value
    ? {
        type: paymentType.value,
        payment_mode: 'NORMAL',
        date: today(),
        payment_method: 'CASH',
        amount: 0,
        currency_code: 'ARS',
        description: '',
        reference: '',
        party_id: partyId.value,
        bank_account_id: '',
        cash_box_id: '',
        account_id: '',
        check_ids: [],
        documents: documentId.value ? [{ document_id: documentId.value, amount_applied: 0 }] : undefined
      }
    : undefined
)

onMounted(async () => {
  const [, , , , companyUsers] = await Promise.all([
    fetchPendingSalesDocuments(),
    fetchPendingPurchaseDocuments(),
    fetchAvailableOwnChecks(),
    fetchAvailableCustomerChecks(),
    $fetch<Array<{ id: string; name: string; email: string }>>('/api/access-control/users/all')
  ])
  users.value = companyUsers

  // Auto-seleccionar factura con el monto correcto después de cargar pending docs
  if (documentId.value && initialValues.value) {
    const allPending = [...pendingSalesDocuments.value, ...pendingPurchaseDocuments.value]
    const doc = allPending.find(d => d.id === documentId.value)
    if (doc) {
      initialValues.value = {
        ...initialValues.value,
        documents: [{ document_id: documentId.value, amount_applied: doc.pending_amount }]
      }
    }
  }
})

const enableQuickCapture = async () => {
  if (intakeId.value) {
    quickCaptureActive.value = true
    return
  }
  quickCaptureLoading.value = true
  try {
    const capture = await $fetch<{ id: string }>('/api/intake-records', {
      method: 'POST',
      body: { title: 'Comprobante de pago pendiente de carga', suggested_type: 'PAYMENT' }
    })
    intakeId.value = capture.id
    quickCaptureActive.value = true
  } catch (error: any) {
    toast.add({ title: 'No se pudo iniciar la carga rápida', description: error?.data?.message, color: 'error' })
  } finally {
    quickCaptureLoading.value = false
  }
}

const sendQuickCapture = async () => {
  if (!intakeId.value || !assignedTo.value) return
  sendingCapture.value = true
  try {
    await $fetch(`/api/intake-records/${intakeId.value}/send`, {
      method: 'POST', body: { assigned_to: assignedTo.value }
    })
    toast.add({ title: 'Comprobante enviado', description: 'El usuario lo encontrará en Capturas pendientes.', color: 'success' })
    await router.push('/erp/treasury/intake')
  } catch (error: any) {
    toast.add({ title: 'No se pudo enviar', description: error?.data?.message, color: 'error' })
  } finally {
    sendingCapture.value = false
  }
}

const handleSubmit = async (formData: PaymentFormData) => {
  try {
    const apiPayload = {
      type: formData.type,
      payment_mode: formData.payment_mode as any,
      date: formData.date,
      payment_method: formData.payment_method as any,
      amount: formData.amount,
      currency_code: formData.currency_code,
      description: formData.description || undefined,
      reference: formData.reference || undefined,
      party_id: formData.party_id || undefined,
      party_type: formData.party_type || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      cash_box_id: formData.cash_box_id || undefined,
      account_id: formData.account_id || undefined,
      check_ids: formData.check_ids?.length ? formData.check_ids : undefined,
      documents: formData.documents?.length ? formData.documents : undefined,
    }
    const created = await create(apiPayload)
    if (created?.id) {
      if (intakeId.value) {
        await $fetch(`/api/intake-records/${intakeId.value}/complete`, {
          method: 'POST', body: { target_type: 'PAYMENT', target_id: created.id }
        })
      }
      router.push(`/erp/treasury/payments/${created.id}`)
    } else {
      router.push('/erp/treasury/payments')
    }
  } catch (error: any) {
    toast.add({
      title: 'Error al crear pago',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Nuevo pago / cobro"
      description="Crear un nuevo pago o cobro"
    />

    <UCard class="max-w-5xl">
      <div v-if="!quickCaptureActive" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p class="font-medium">Adjuntos del pago (opcional)</p>
          <p class="text-sm text-muted">Podés agregar una foto o PDF para que quede guardado junto con este pago/cobro.</p>
        </div>
        <UButton
          label="Adjuntar archivo"
          icon="i-lucide-paperclip"
          variant="outline"
          :loading="quickCaptureLoading"
          @click="enableQuickCapture"
        />
      </div>
      <div v-else-if="intakeId" class="space-y-4">
        <div>
          <p class="font-medium">Adjuntos del pago</p>
          <p class="text-sm text-muted">Estos archivos acompañarán al pago cuando lo guardes.</p>
        </div>
        <UiAttachmentManager entity-type="intake" :entity-id="intakeId" @uploaded="hasUploadedFile = true" />

        <div v-if="!showAssignment" class="flex justify-end border-t border-default pt-4">
          <UButton
            label="Enviar a otro usuario para completar"
            icon="i-lucide-send"
            variant="outline"
            :disabled="!hasUploadedFile"
            @click="showAssignment = true"
          />
        </div>

        <div v-else class="rounded-lg border border-default p-4 space-y-3">
          <div>
            <p class="text-sm font-medium">Enviar para completar</p>
            <p class="text-xs text-muted">El pago no se creará todavía. El usuario elegido recibirá el archivo y completará los datos.</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <USelect
              v-model="assignedTo"
              :items="users.map(user => ({ label: `${user.name} · ${user.email}`, value: user.id }))"
              placeholder="Seleccionar responsable"
              class="flex-1"
            />
            <UButton
              label="Enviar para completar"
              icon="i-lucide-send"
              :disabled="!assignedTo"
              :loading="sendingCapture"
              @click="sendQuickCapture"
            />
            <UButton label="Cancelar envío" variant="ghost" @click="showAssignment = false" />
          </div>
        </div>
      </div>
    </UCard>

    <div class="max-w-5xl">
      <PaymentForm
        v-model="initialValues"
        :pending-sales-documents="pendingSalesDocuments"
        :pending-purchase-documents="pendingPurchaseDocuments"
        :available-own-checks="availableOwnChecks"
        :available-customer-checks="availableCustomerChecks"
        :loading="loading"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/payments')"
      />
    </div>
  </UPage>
</template>
