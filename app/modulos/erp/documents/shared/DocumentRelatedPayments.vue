<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { usePaymentsService } from '~/modulos/erp/payments/service/payments.service'
import type { RelatedDocumentPayment } from '~/modulos/erp/payments/types/payments.types'

const props = defineProps<{ documentId: string }>()

const auth = useAuthStore()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const paymentsService = usePaymentsService()
const payments = ref<RelatedDocumentPayment[]>([])
const loading = ref(false)
const loadError = ref(false)
let activeRequest = 0

const hasAdminRole = computed(() => ['OWNER', 'ADMIN'].includes(
  String(auth.selectedCompany?.role ?? '').toUpperCase(),
))
const canReadPayments = computed(() => hasAdminRole.value || hasPermission('payments.read'))
const canShowSection = computed(() => loading.value || loadError.value || payments.value.length > 0)

const statusView = (status: RelatedDocumentPayment['status']) => {
  const options: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'neutral' }> = {
    DRAFT: { label: 'Borrador', color: 'warning' },
    CONFIRMED: { label: 'Confirmado', color: 'info' },
    PAID: { label: 'Pagado', color: 'success' },
    REVERSED: { label: 'Revertido', color: 'error' },
    CANCELLED: { label: 'Anulado', color: 'neutral' },
  }
  return options[status] ?? { label: status, color: 'neutral' as const }
}

const paymentTypeLabel = (type: RelatedDocumentPayment['type']) => type === 'PAYMENT' ? 'Pago' : 'Cobro'
const methodLabel = (method: RelatedDocumentPayment['payment_method']) => ({
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  BANK_TRANSFER: 'Transferencia',
  MIXED: 'Medio mixto',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  VIRTUAL_WALLET: 'Billetera virtual',
  PAYROLL_DEDUCTION: 'Descuento de haberes',
}[method] ?? method)

const formatAmount = (amount: number | string, currency: string) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: currency || 'ARS',
  maximumFractionDigits: 2,
}).format(Number(amount) || 0)

const formatDate = (value: string) => {
  const date = String(value ?? '').slice(0, 10)
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}/${month}/${year}` : date
}

const loadPayments = async () => {
  const requestId = ++activeRequest
  loadError.value = false
  payments.value = []
  try {
    await fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id)
  } catch {
    // OWNER/ADMIN pueden consultar aunque no tengan permisos individuales cargados.
  }
  if (requestId !== activeRequest || !canReadPayments.value) return

  loading.value = true
  try {
    const result = await paymentsService.findByDocument(props.documentId)
    if (requestId === activeRequest) payments.value = result
  } catch {
    if (requestId === activeRequest) loadError.value = true
  } finally {
    if (requestId === activeRequest) loading.value = false
  }
}

onMounted(loadPayments)
watch(() => props.documentId, loadPayments)
onBeforeUnmount(() => { activeRequest += 1 })
</script>

<template>
  <UCard v-if="canShowSection" class="mt-4">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-wallet-cards" class="size-5 text-primary" />
        <h3 class="font-semibold">Pagos y cobros asociados</h3>
      </div>
    </template>

    <div v-if="loading" class="py-3 text-sm text-muted">Buscando pagos asociados...</div>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="soft"
      title="No se pudieron cargar los pagos"
      description="Ocurrió un error al consultar los movimientos asociados."
    >
      <template #actions>
        <UButton size="sm" variant="soft" label="Reintentar" @click="loadPayments" />
      </template>
    </UAlert>
    <div v-else class="flex flex-col gap-2">
      <NuxtLink
        v-for="payment in payments"
        :key="payment.id"
        :to="`/erp/treasury/payments/${payment.id}`"
        class="group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default px-4 py-3 transition-colors hover:border-primary/50 hover:bg-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div class="flex min-w-0 items-center gap-3">
          <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-muted transition-colors group-hover:text-primary" />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ paymentTypeLabel(payment.type) }} #{{ payment.number }}</span>
              <UBadge :label="statusView(payment.status).label" :color="statusView(payment.status).color" variant="subtle" />
            </div>
            <p class="text-sm text-muted">{{ formatDate(payment.date) }} · {{ methodLabel(payment.payment_method) }}</p>
            <p v-if="payment.reference || payment.description" class="truncate text-xs text-muted">
              {{ payment.reference || payment.description }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 pl-7 sm:pl-0">
          <span class="text-right">
            <span class="block text-xs text-muted">Aplicado a esta factura</span>
            <strong class="font-semibold tabular-nums">{{ formatAmount(payment.amount_applied, payment.currency_code) }}</strong>
          </span>
          <span class="text-xs text-primary">Ver pago</span>
        </div>
      </NuxtLink>
      <p v-if="!payments.length" class="text-sm text-muted">No hay pagos activos asociados a esta factura.</p>
    </div>
  </UCard>
</template>
