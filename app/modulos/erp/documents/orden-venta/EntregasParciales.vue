<script setup lang="ts">
const props = defineProps<{
  document: any
}>()

const emit = defineEmits<{
  'partial-deliver': []
  'partial-invoice': []
}>()

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.document?.currency_code ?? 'ARS' }).format(n ?? 0)
}

const items = computed(() => props.document?.document_items ?? [])

const canDeliver = computed(() => {
  return items.value.some((i: any) => {
    const delivered = Number(i.quantity_delivered ?? 0)
    return delivered < Number(i.quantity)
  })
})

const canInvoice = computed(() => {
  return items.value.some((i: any) => {
    const invoiced = Number(i.quantity_invoiced ?? 0)
    return invoiced < Number(i.quantity)
  })
})
</script>

<template>
  <UCard v-if="document">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Tracking de entregas y facturación</h3>
        <div class="flex gap-2">
          <UButton v-if="canDeliver" size="sm" icon="i-lucide-truck" @click="emit('partial-deliver')">Entrega parcial</UButton>
          <UButton v-if="canInvoice" size="sm" icon="i-lucide-file-text" variant="outline" @click="emit('partial-invoice')">Facturar parcial</UButton>
        </div>
      </div>
    </template>

    <UTable :data="items" :columns="[
      { id: 'product', header: 'Producto' },
      { id: 'quantity', header: 'Total' },
      { id: 'delivered', header: 'Entregado' },
      { id: 'pending', header: 'Pendiente' },
      { id: 'invoiced', header: 'Facturado' },
    ]">
      <template #product-cell="{ row }">
        <span class="font-medium">{{ row.original.products?.name ?? 'Producto libre' }}</span>
      </template>

      <template #quantity-cell="{ row }">
        {{ row.original.quantity }}
      </template>

      <template #delivered-cell="{ row }">
        <div class="flex items-center gap-2">
          <UProgress :model-value="Number(row.original.quantity_delivered ?? 0)" :max="Number(row.original.quantity)" size="sm" class="w-20" />
          <span class="text-sm">{{ row.original.quantity_delivered ?? 0 }}</span>
        </div>
      </template>

      <template #pending-cell="{ row }">
        <span class="text-sm text-muted">
          {{ Number(row.original.quantity) - Number(row.original.quantity_delivered ?? 0) }}
        </span>
      </template>

      <template #invoiced-cell="{ row }">
        <div class="flex items-center gap-2">
          <UProgress :model-value="Number(row.original.quantity_invoiced ?? 0)" :max="Number(row.original.quantity)" size="sm" class="w-20" />
          <span class="text-sm">{{ row.original.quantity_invoiced ?? 0 }}</span>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
