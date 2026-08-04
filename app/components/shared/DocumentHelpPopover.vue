<script setup lang="ts">
import {
  getStatusLabel,
  getStatusDescription,
  getStatusColor,
  QUOTE_STATUSES,
  QUOTE_STATUS_DESCRIPTIONS,
  ORDER_STATUSES,
  ORDER_STATUS_DESCRIPTIONS,
  REMITO_STATUSES,
  REMITO_STATUS_DESCRIPTIONS,
  INVOICE_STATUSES,
  INVOICE_STATUS_DESCRIPTIONS,
} from '~/modulos/erp/documents/types/document-statuses'

const props = defineProps<{
  category: string
  actions: { icon: string; label: string; help: string }[]
}>()

const statusMaps: Record<string, Record<number, string>> = {
  QUOTE: QUOTE_STATUSES,
  ORDER: ORDER_STATUSES,
  REMITO: REMITO_STATUSES,
  INVOICE: INVOICE_STATUSES,
}

const descriptionMaps: Record<string, Record<number, string>> = {
  QUOTE: QUOTE_STATUS_DESCRIPTIONS,
  ORDER: ORDER_STATUS_DESCRIPTIONS,
  REMITO: REMITO_STATUS_DESCRIPTIONS,
  INVOICE: INVOICE_STATUS_DESCRIPTIONS,
}

const statuses = computed(() => statusMaps[props.category] ?? {})
const statusDescriptions = computed(() => descriptionMaps[props.category] ?? {})

const categoryLabels: Record<string, string> = {
  QUOTE: 'Presupuesto',
  ORDER: 'Orden de Venta',
  REMITO: 'Remito',
  INVOICE: 'Factura',
}
</script>

<template>
  <UPopover :ui="{ content: 'w-96' }">
    <UButton icon="i-lucide-help-circle" variant="ghost" size="sm" color="neutral" label="Ayuda" />
    <template #content>
      <div class="p-4 space-y-4 max-h-96 overflow-y-auto">
        <!-- Acciones -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase mb-2">Acciones</p>
          <div v-for="action in actions" :key="action.label" class="flex items-start gap-2 py-1">
            <UIcon :name="action.icon" class="size-4 mt-0.5 shrink-0 text-muted" />
            <div>
              <p class="text-xs font-medium">{{ action.label }}</p>
              <p class="text-xs text-muted">{{ action.help }}</p>
            </div>
          </div>
        </div>

        <!-- Estados -->
        <div v-if="Object.keys(statuses).length" class="border-t pt-3">
          <p class="text-xs font-semibold text-muted uppercase mb-2">Estados del {{ categoryLabels[category] ?? 'documento' }}</p>
          <div v-for="(label, key) in statuses" :key="key" class="flex items-start gap-2 py-1">
            <UBadge :label="label" :color="getStatusColor(category, Number(key))" variant="soft" size="xs" class="mt-0.5 shrink-0" />
            <p class="text-xs text-muted">{{ statusDescriptions[key] }}</p>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
