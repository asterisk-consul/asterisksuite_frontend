<script setup lang="ts">
const props = defineProps<{
  document: any
  showAmounts?: boolean
}>()

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.document?.currency_code ?? 'ARS' }).format(n ?? 0)
}

const priorityColors: Record<string, string> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  URGENTE: 'error',
}

const sellerName = computed(() => {
  const seller = props.document?.orden_venta_doc?.seller
  if (!seller) return null
  return `${seller.first_name} ${seller.last_name}`
})

const commissionAmount = computed(() => {
  const ov = props.document?.orden_venta_doc
  if (!ov?.commission_rate || !props.document?.subtotal) return null
  const operation = props.document?.commercial_operation
  const subtotal = Number(props.document.subtotal)
  const total = Number(operation?.ordered_total ?? props.document.total ?? 0)
  const accruedGross = ov.commission_base === 'PAID'
    ? Number(operation?.paid_total ?? props.document.paid_amount ?? 0)
    : Number(operation?.invoiced_total ?? 0)
  const baseAmount = total > 0 ? subtotal * Math.min(accruedGross / total, 1) : 0
  return baseAmount * Number(ov.commission_rate) / 100
})

const operation = computed(() => props.document?.commercial_operation)
const deliveryStatus = computed(() => operation.value?.delivery_status)
const deliveryNoteId = computed(() => operation.value?.delivery_note_id)
const orderedTotal = computed(() => Number(operation.value?.ordered_total ?? props.document?.total ?? 0))
const paidTotal = computed(() => Number(operation.value?.paid_total ?? props.document?.paid_amount ?? 0))
const requiredPaymentPercentage = computed(() => Number(operation.value?.delivery_payment_percentage ?? 0))
const paidPercentage = computed(() => {
  const securedPercentage = props.document?.monetary_visibility?.paid_percentage
  if (securedPercentage != null) return Number(securedPercentage)
  return orderedTotal.value > 0 ? Math.min((paidTotal.value / orderedTotal.value) * 100, 100) : 0
})
const missingPaymentPercentage = computed(() => Math.max(0, requiredPaymentPercentage.value - paidPercentage.value))
const fmtPercentage = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)

const deliveryFlow = computed(() => {
  if (!operation.value || Number(props.document?.status) === 0) return null
  if (deliveryStatus.value === 'DRAFT_CREATED') {
    return {
      title: 'Remito pendiente de completar',
      description: 'El remito ya fue generado. Revisá el depósito y las cantidades antes de confirmarlo.',
      color: 'info',
      icon: 'i-lucide-clipboard-check',
    }
  }
  if (deliveryStatus.value === 'DELIVERED') {
    return {
      title: 'Entrega confirmada',
      description: 'La entrega fue registrada mediante el remito confirmado.',
      color: 'success',
      icon: 'i-lucide-circle-check',
    }
  }
  if (deliveryStatus.value === 'ELIGIBLE') {
    return {
      title: 'Lista para despacho',
      description: operation.value.auto_create_delivery_note
        ? 'Se cumplieron las condiciones de entrega. Si el remito automático todavía no aparece, podés generarlo desde el menú Más.'
        : 'Se cumplieron las condiciones de entrega. Ya podés crear el remito desde el menú Más.',
      color: 'success',
      icon: 'i-lucide-truck',
    }
  }

  const pending: string[] = []
  if (operation.value.require_payment_for_delivery && missingPaymentPercentage.value > 0.01) {
    pending.push(`Falta cobrar el ${fmtPercentage(missingPaymentPercentage.value)}% para alcanzar el ${fmtPercentage(requiredPaymentPercentage.value)}% requerido.`)
  }
  if (operation.value.require_invoice_for_delivery && Number(operation.value.invoiced_total ?? 0) <= 0) {
    pending.push('Falta confirmar una factura vinculada.')
  }
  return {
    title: 'En preparación',
    description: pending.join(' ') || 'La orden todavía no está habilitada para despacho.',
    color: 'warning',
    icon: 'i-lucide-clock-3',
  }
})
</script>

<template>
  <div v-if="document?.orden_venta_doc" class="space-y-6">
    <UAlert
      v-if="deliveryFlow"
      :color="deliveryFlow.color as any"
      variant="soft"
      :icon="deliveryFlow.icon"
      :title="deliveryFlow.title"
      :description="deliveryFlow.description"
    >
      <template v-if="deliveryNoteId" #actions>
        <UButton
          :label="deliveryStatus === 'DRAFT_CREATED' ? 'Completar remito' : 'Ver remito'"
          :to="`/erp/remitos/${deliveryNoteId}`"
          size="xs"
          variant="outline"
        />
      </template>
    </UAlert>

    <UCard>
      <template #header>
        <h3 class="font-semibold">Información de entrega</h3>
      </template>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div v-if="document.orden_venta_doc.priority">
          <p class="text-muted">Prioridad</p>
          <UBadge :label="document.orden_venta_doc.priority" :color="(priorityColors[document.orden_venta_doc.priority] as any) ?? 'neutral'" variant="subtle" />
        </div>
        <div v-if="document.orden_venta_doc.confirmed_delivery_date">
          <p class="text-muted">Fecha comprometida</p>
          <p class="font-medium">{{ fmtDate(document.orden_venta_doc.confirmed_delivery_date) }}</p>
        </div>
        <div v-if="document.orden_venta_doc.delivery_address">
          <p class="text-muted">Dirección</p>
          <p class="font-medium">{{ document.orden_venta_doc.delivery_address }}</p>
        </div>
        <div v-if="document.orden_venta_doc.delivery_contact">
          <p class="text-muted">Contacto</p>
          <p class="font-medium">{{ document.orden_venta_doc.delivery_contact }}</p>
        </div>
        <div v-if="document.orden_venta_doc.delivery_phone">
          <p class="text-muted">Teléfono</p>
          <p class="font-medium">{{ document.orden_venta_doc.delivery_phone }}</p>
        </div>
        <div v-if="document.orden_venta_doc.delivery_time">
          <p class="text-muted">Tiempo de entrega</p>
          <p class="font-medium">{{ document.orden_venta_doc.delivery_time }}</p>
        </div>
        <div v-if="document.orden_venta_doc.transport_provider">
          <p class="text-muted">Transporte</p>
          <p class="font-medium">{{ document.orden_venta_doc.transport_provider }}</p>
        </div>
        <div v-if="sellerName">
          <p class="text-muted">Vendedor</p>
          <p class="font-medium">{{ sellerName }}</p>
        </div>
        <div v-if="showAmounts !== false && document.orden_venta_doc.commission_rate">
          <p class="text-muted">Comisión</p>
          <p class="font-medium">
            {{ document.orden_venta_doc.commission_rate }}%
            <span class="text-xs text-muted">({{ document.orden_venta_doc.commission_base === 'PAID' ? 'sobre cobrado' : 'sobre facturado' }})</span>
            <template v-if="commissionAmount !== null">
              — {{ fmtCurrency(commissionAmount) }}
            </template>
          </p>
        </div>
      </div>
      <div v-if="document.orden_venta_doc.delivery_instructions" class="mt-4 text-sm">
        <p class="text-muted font-medium">Instrucciones:</p>
        <p class="whitespace-pre-wrap">{{ document.orden_venta_doc.delivery_instructions }}</p>
      </div>
      <div v-if="operation?.require_payment_for_delivery" class="mt-4 border-t border-default pt-4 text-sm">
        <div class="flex items-center justify-between gap-4">
          <span class="text-muted">Avance de cobro para despacho</span>
          <strong>{{ paidPercentage.toFixed(1) }}% / {{ requiredPaymentPercentage }}%</strong>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${paidPercentage}%` }" />
        </div>
      </div>
    </UCard>
  </div>
</template>
