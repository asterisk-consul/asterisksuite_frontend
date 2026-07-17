<script setup lang="ts">
import type { PaymentFormData } from './PaymentForm.vue'
import PaymentForm from './PaymentForm.vue'
import type { PendingDocument, AvailableCheck } from '~/modulos/erp/payments/service/payments.service'

const props = defineProps<{
  payment?: PaymentFormData
  pendingDocuments?: PendingDocument[]
  availableChecks?: AvailableCheck[]
  loading?: boolean
}>()

const emit = defineEmits<{
  success: [payment: PaymentFormData]
}>()

const open = defineModel<boolean>('open', { default: false })

const handleSubmit = (form: PaymentFormData) => {
  emit('success', form)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="payment?.check_ids?.length ? 'Editar pago / cobro' : 'Nuevo pago / cobro'" :ui="{ width: 'max-w-4xl' }">
    <template #body>
      <PaymentForm
        :model-value="payment"
        :pending-documents="pendingDocuments"
        :available-checks="availableChecks"
        :loading="loading"
        @submit="handleSubmit"
        @cancel="open = false"
      />
    </template>
  </UModal>
</template>
