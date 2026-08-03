<script setup lang="ts">
const props = defineProps<{
  document: any
}>()

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}

const priorityColors: Record<string, string> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  URGENTE: 'error',
}
</script>

<template>
  <div v-if="document?.orden_venta_doc" class="space-y-6">
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
      </div>
      <div v-if="document.orden_venta_doc.delivery_instructions" class="mt-4 text-sm">
        <p class="text-muted font-medium">Instrucciones:</p>
        <p class="whitespace-pre-wrap">{{ document.orden_venta_doc.delivery_instructions }}</p>
      </div>
    </UCard>
  </div>
</template>
