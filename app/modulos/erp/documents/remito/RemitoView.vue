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
    <UCard>
      <template #header>
        <h3 class="font-semibold">Datos del remito</h3>
      </template>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div v-if="document.delivery_date">
          <p class="text-muted">Fecha de entrega</p>
          <p class="font-medium">{{ fmtDate(document.delivery_date) }}</p>
        </div>
        <div v-if="document.descrip">
          <p class="text-muted">Descripción</p>
          <p class="font-medium">{{ document.descrip }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>
