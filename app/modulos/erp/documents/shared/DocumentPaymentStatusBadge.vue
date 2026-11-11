<script setup lang="ts">
import { getDocumentPaymentSummary } from '~/modulos/erp/documents/utils/document-payment-status'

const props = defineProps<{ document: any }>()

const status = computed(() => {
  const category = props.document?.document_types?.category
  const isSale = Number(props.document?.document_types?.direction) === 1
  if (category !== 'INVOICE' && !(isSale && category === 'ORDER')) return null
  const documentStatus = Number(props.document?.status)
  if (documentStatus !== 2 && !(isSale && category === 'ORDER' && documentStatus === 5)) return null

  const summary = getDocumentPaymentSummary(props.document)
  if (!summary.applies || summary.total <= 0) return null

  if (summary.state === 'PAID') {
    return { label: isSale ? 'Cobrado' : 'Pagada', color: 'success' as const }
  }
  if (summary.state === 'SETTLED_BY_CREDIT_NOTE') {
    return { label: 'Saldada por NC', color: 'success' as const }
  }
  if (summary.state === 'PARTIAL') {
    return { label: isSale ? 'Cobro parcial' : 'Pago parcial', color: 'warning' as const }
  }
  return { label: isSale ? 'Pendiente de cobro' : 'Pendiente de pago', color: 'neutral' as const }
})
</script>

<template>
  <UBadge v-if="status" :label="status.label" :color="status.color" variant="subtle" size="sm" />
</template>
