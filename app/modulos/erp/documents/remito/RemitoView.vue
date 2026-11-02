<script setup lang="ts">
const props = defineProps<{
  document: any
  mode?: 'sale' | 'purchase'
}>()

const warehouseLabel = computed(() => props.mode === 'purchase' ? 'Depósito de ingreso' : 'Depósito de salida')

type Warehouse = { id: string; name: string }
const sourceWarehouses = computed<Warehouse[]>(() => {
  const values = (props.document?.document_items ?? [])
    .map((item: any) => item.warehouse as Warehouse | null | undefined)
    .filter((warehouse: Warehouse | null | undefined): warehouse is Warehouse => !!warehouse)
  const documentWarehouse = props.document?.warehouse as Warehouse | undefined
  if (documentWarehouse) values.unshift(documentWarehouse)
  const unique = new Map<string, Warehouse>()
  for (const warehouse of values) unique.set(warehouse.id, warehouse)
  return [...unique.values()]
})

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
        <div v-if="sourceWarehouses.length" class="col-span-2">
          <p class="text-muted">{{ warehouseLabel }}</p>
          <div class="mt-1 flex flex-wrap gap-2">
            <UBadge v-for="warehouse in sourceWarehouses" :key="warehouse.id" color="neutral" variant="subtle">
              {{ warehouse.name }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
