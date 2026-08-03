<script setup lang="ts">
const props = defineProps<{
  document: any
}>()

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.document?.currency_code ?? 'ARS' }).format(n ?? 0)
}
</script>

<template>
  <UCard v-if="document">
    <template #header>
      <h3 class="font-semibold">Totales</h3>
    </template>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-muted">Subtotal</span>
        <span class="font-medium">{{ fmt(Number(document.subtotal)) }}</span>
      </div>

      <div v-if="Number(document.exempt_amount) > 0" class="flex justify-between">
        <span class="text-muted">Exento</span>
        <span class="font-medium">{{ fmt(Number(document.exempt_amount)) }}</span>
      </div>

      <div v-if="Number(document.total_taxes) > 0" class="flex justify-between">
        <span class="text-muted">Impuestos</span>
        <span class="font-medium">{{ fmt(Number(document.total_taxes)) }}</span>
      </div>

      <div v-if="document.document_taxes?.length" class="pl-4 space-y-1">
        <div v-for="dt in document.document_taxes" :key="dt.id" class="flex justify-between text-xs text-muted">
          <span>{{ dt.taxes?.name }} ({{ dt.tax_rate }}%)</span>
          <span>{{ fmt(Number(dt.tax_amount)) }}</span>
        </div>
      </div>

      <div class="flex justify-between border-t pt-2 text-base font-bold">
        <span>Total</span>
        <span>{{ fmt(Number(document.total)) }}</span>
      </div>

      <div v-if="Number(document.paid_amount) > 0" class="flex justify-between text-sm">
        <span class="text-muted">Pagado</span>
        <span class="text-success-500 font-medium">{{ fmt(Number(document.paid_amount)) }}</span>
      </div>

      <div v-if="Number(document.total) - Number(document.paid_amount) > 0" class="flex justify-between text-sm">
        <span class="text-muted">Pendiente</span>
        <span class="text-warning-500 font-medium">{{ fmt(Number(document.total) - Number(document.paid_amount)) }}</span>
      </div>
    </div>
  </UCard>
</template>
