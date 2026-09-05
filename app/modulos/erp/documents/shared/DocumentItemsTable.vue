<script setup lang="ts">
const props = defineProps<{
  items: any[]
  currency?: string
  showTracking?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:quantity': [index: number, quantity: number]
  'remove': [index: number]
  'add': []
}>()

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.currency ?? 'ARS' }).format(n ?? 0)
}

const columns = computed(() => {
  const cols = [
    { id: 'product', header: 'Producto' },
    { id: 'quantity', header: 'Cantidad' },
    { id: 'unit_price', header: 'P. Unitario' },
    { id: 'total', header: 'Total' },
  ]

  if (props.showTracking) {
    cols.splice(3, 0, { id: 'delivered', header: 'Entregado' })
    cols.splice(5, 0, { id: 'invoiced', header: 'Facturado' })
  }

  if (props.editable) {
    cols.push({ id: 'actions', header: '' })
  }

  return cols
})

const subtotal = computed(() => props.items.reduce((sum, item) => sum + Number(item.price ?? 0), 0))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Ítems</h3>
        <UButton v-if="editable" size="sm" icon="i-heroicons-plus" @click="emit('add')">Agregar</UButton>
      </div>
    </template>

    <UTable :data="items" :columns="columns">
      <template #product-cell="{ row }">
        <div>
          <p class="font-medium">{{ row.original.products?.name ?? 'Producto libre' }}</p>
          <p v-if="row.original.products?.sku" class="text-xs text-muted">SKU: {{ row.original.products.sku }}</p>
        </div>
      </template>

      <template #quantity-cell="{ row }">
        <template v-if="editable">
          <UInput
            :model-value="row.original.quantity"
            type="number"
            min="0"
            class="w-24"
            @update:model-value="emit('update:quantity', row.index, Number($event))"
          />
        </template>
        <template v-else>
          {{ row.original.quantity }}
        </template>
      </template>

      <template #unit_price-cell="{ row }">
        {{ fmt(Number(row.original.unit_price)) }}
      </template>

      <template #delivered-cell="{ row }">
        <div class="text-sm">
          <span class="font-medium">{{ row.original.quantity_delivered ?? 0 }}</span>
          <span class="text-muted"> / {{ row.original.quantity }}</span>
        </div>
      </template>

      <template #invoiced-cell="{ row }">
        <div class="text-sm">
          <span class="font-medium">{{ row.original.quantity_invoiced ?? 0 }}</span>
          <span class="text-muted"> / {{ row.original.quantity }}</span>
        </div>
      </template>

      <template #total-cell="{ row }">
        <span class="font-medium">{{ fmt(Number(row.original.price)) }}</span>
      </template>

      <template #actions-cell="{ row }">
        <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="emit('remove', row.index)" />
      </template>
    </UTable>

    <div class="flex justify-end pt-4 border-t">
      <div class="text-right space-y-1">
        <p class="text-sm text-muted">Subtotal: <span class="font-medium text-default">{{ fmt(subtotal) }}</span></p>
      </div>
    </div>
  </UCard>
</template>
