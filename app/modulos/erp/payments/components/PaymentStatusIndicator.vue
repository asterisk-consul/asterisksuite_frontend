<script setup lang="ts">
const props = defineProps<{
  status: string
  confirmedAt?: string | null
  paymentDate?: string | null
}>()

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'neutral' },
  CONFIRMED: { label: 'Confirmado', color: 'info' },
  PAID: { label: 'Pagado', color: 'success' },
  REVERSED: { label: 'Rechazado', color: 'warning' },
  CANCELLED: { label: 'Anulado', color: 'error' },
}

const formatDate = (date?: string | null) => date ? new Date(date).toLocaleDateString('es-AR') : ''
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 border-l border-default pl-3">
    <span class="text-xs font-medium text-muted">Estado</span>
    <UBadge
      :label="statusConfig[props.status]?.label ?? props.status"
      :color="(statusConfig[props.status]?.color as any) ?? 'neutral'"
      variant="subtle"
    />
    <UPopover mode="hover" :open-delay="300" :close-delay="300">
      <UButton
        icon="i-lucide-circle-help"
        color="neutral"
        variant="ghost"
        size="xs"
        class="px-1"
        aria-label="Ayuda sobre los estados del pago"
      />
      <template #content>
        <div class="max-w-xs space-y-2 p-3 text-sm">
          <p class="font-medium">Estados del pago</p>
          <div class="space-y-1.5 text-xs">
            <p class="flex items-start gap-1.5">
              <UBadge label="Borrador" color="neutral" size="xs" class="mt-0.5 shrink-0" />
              <span>Pago creado y editable. Aún no se aplicaron efectos.</span>
            </p>
            <p class="flex items-start gap-1.5">
              <UBadge label="Confirmado" color="info" size="xs" class="mt-0.5 shrink-0" />
              <span>Se aplicaron los documentos y movimientos de caja o banco.</span>
            </p>
            <p class="flex items-start gap-1.5">
              <UBadge label="Pagado" color="success" size="xs" class="mt-0.5 shrink-0" />
              <span>Se confirmó la entrega o recepción efectiva del dinero.</span>
            </p>
            <p class="flex items-start gap-1.5">
              <UBadge label="Rechazado" color="warning" size="xs" class="mt-0.5 shrink-0" />
              <span>Se revirtieron los efectos del pago.</span>
            </p>
            <p class="flex items-start gap-1.5">
              <UBadge label="Anulado" color="error" size="xs" class="mt-0.5 shrink-0" />
              <span>La operación quedó cancelada y sus efectos fueron revertidos.</span>
            </p>
          </div>
        </div>
      </template>
    </UPopover>
    <span v-if="props.confirmedAt" class="text-xs text-muted">
      Confirmado el {{ formatDate(props.confirmedAt) }}
    </span>
    <span v-if="props.paymentDate" class="text-xs text-muted">
      Pagado el {{ formatDate(props.paymentDate) }}
    </span>
  </div>
</template>
