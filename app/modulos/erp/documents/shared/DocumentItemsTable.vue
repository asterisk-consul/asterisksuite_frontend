<script setup lang="ts">
const props = withDefaults(defineProps<{
  items: any[]
  currency?: string
  showTracking?: boolean
  showAmounts?: boolean
  quantityLabel?: string
  title?: string
  showWarehouse?: boolean
  editable?: boolean
}>(), {
  showAmounts: true
})

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
    { id: 'quantity', header: props.quantityLabel ?? 'Cantidad' },
  ]

  if (props.showAmounts !== false) {
    cols.push({ id: 'unit_price', header: 'P. Unitario' }, { id: 'total', header: 'Total' })
  }

  if (props.showWarehouse) {
    cols.splice(2, 0, { id: 'warehouse', header: 'Depósito de salida' })
  }

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
        <div>
          <h3 class="font-semibold">{{ title ?? 'Ítems' }}</h3>
          <p v-if="showAmounts === false" class="text-xs text-muted mt-0.5">{{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }}</p>
        </div>
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

      <template #warehouse-cell="{ row }">
        <UBadge v-if="row.original.warehouse?.name" color="neutral" variant="subtle">
          {{ row.original.warehouse.name }}
        </UBadge>
        <span v-else class="font-medium text-warning">Sin depósito</span>
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

    <div v-if="showAmounts !== false" class="flex justify-end pt-4 border-t">
      <div class="text-right space-y-1">
        <p class="text-sm text-muted">Subtotal: <span class="font-medium text-default">{{ fmt(subtotal) }}</span></p>
      </div>
    </div>
  </UCard>
</template>
