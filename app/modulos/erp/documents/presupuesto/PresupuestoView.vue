<script setup lang="ts">
const props = defineProps<{
  document: any
}>()

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}
</script>

<template>
  <div v-if="document" class="space-y-6">
    <!-- Condiciones comerciales -->
    <UCard v-if="document.presupuesto_doc">
      <template #header>
        <h3 class="font-semibold">Condiciones del presupuesto</h3>
      </template>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div v-if="document.presupuesto_doc.validity_date">
          <p class="text-muted">Válido hasta</p>
          <p class="font-medium">{{ fmtDate(document.presupuesto_doc.validity_date) }}</p>
        </div>
        <div v-if="document.presupuesto_doc.warranty_info">
          <p class="text-muted">Garantía</p>
          <p class="font-medium">{{ document.presupuesto_doc.warranty_info }}</p>
        </div>
      </div>
    </UCard>

    <!-- Observaciones -->
    <UCard v-if="document.presupuesto_doc?.commercial_notes || document.presupuesto_doc?.exclusions">
      <template #header>
        <h3 class="font-semibold">Observaciones</h3>
      </template>
      <div class="space-y-3 text-sm">
        <div v-if="document.presupuesto_doc.commercial_notes">
          <p class="text-muted font-medium">Comerciales:</p>
          <p class="whitespace-pre-wrap">{{ document.presupuesto_doc.commercial_notes }}</p>
        </div>
        <div v-if="document.presupuesto_doc.exclusions">
          <p class="text-muted font-medium">Exclusiones:</p>
          <p class="whitespace-pre-wrap">{{ document.presupuesto_doc.exclusions }}</p>
        </div>
      </div>
    </UCard>

    <!-- Términos y condiciones -->
    <UCard v-if="document.presupuesto_doc?.terms_and_conditions">
      <template #header>
        <h3 class="font-semibold">Términos y condiciones</h3>
      </template>
      <p class="text-sm whitespace-pre-wrap">{{ document.presupuesto_doc.terms_and_conditions }}</p>
    </UCard>

    <!-- Notas internas (solo para vista interna) -->
    <UCard v-if="document.presupuesto_doc?.internal_notes" color="warning" variant="soft">
      <template #header>
        <h3 class="font-semibold text-warning-600">Notas internas (no se imprimen)</h3>
      </template>
      <p class="text-sm whitespace-pre-wrap">{{ document.presupuesto_doc.internal_notes }}</p>
    </UCard>
  </div>
</template>
