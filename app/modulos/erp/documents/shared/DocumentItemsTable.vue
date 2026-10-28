<script setup lang="ts">
import { getDocumentLineAmounts, getItemDiscountAmount, getItemDiscountPercentage, hasLegacyGrossLinePrices } from './document-line-values'

const props = withDefaults(defineProps<{
  items: any[]
  documentSubtotal?: number | string | null
  currency?: string
  showTracking?: boolean
  showAmounts?: boolean
  quantityLabel?: string
  title?: string
  showWarehouse?: boolean
  warehouseLabel?: string
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

const hasDiscounts = computed(() => props.items.some(item => {
  return getItemDiscountPercentage(item) > 0
}))

const legacyGrossPrices = computed(() => hasLegacyGrossLinePrices(props.documentSubtotal, props.items))

const columns = computed(() => {
  const cols = [
    { id: 'product', header: 'Producto' },
    { id: 'quantity', header: props.quantityLabel ?? 'Cantidad' },
  ]

  if (props.showAmounts !== false) {
    cols.push({ id: 'unit_price', header: 'P. Unitario' })
    if (hasDiscounts.value) cols.push({ id: 'discount', header: 'Bonificación' })
    cols.push({ id: 'subtotal', header: 'Subtotal' })
    cols.push({ id: 'taxes', header: 'Impuestos' })
    cols.push({ id: 'total', header: 'Total' })
  }

  if (props.showWarehouse) {
    cols.splice(2, 0, { id: 'warehouse', header: props.warehouseLabel ?? 'Depósito de salida' })
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

function lineTaxes(item: any) {
  return getDocumentLineAmounts(item, legacyGrossPrices.value).taxes
}

function lineSubtotal(item: any) {
  return getDocumentLineAmounts(item, legacyGrossPrices.value).subtotal
}

function lineTotal(item: any) {
  return lineSubtotal(item) + lineTaxes(item)
}

const subtotal = computed(() => props.items.reduce((sum, item) => sum + lineSubtotal(item), 0))

function discountPercentage(item: any) {
  return getItemDiscountPercentage(item)
}

function discountAmount(item: any) {
  return getItemDiscountAmount(item, lineSubtotal(item))
}
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
          <p v-if="row.original.product_variants?.name" class="text-xs font-medium text-primary">
            Variante: {{ row.original.product_variants.name }}<template v-if="row.original.product_variants.sku"> · {{ row.original.product_variants.sku }}</template>
          </p>
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
        <div class="text-right">
          <span>{{ fmt(Number(row.original.original_unit_price ?? row.original.unit_price)) }}</span>
          <span v-if="discountPercentage(row.original) > 0" class="block text-xs text-muted">
            Neto: {{ fmt(Number(row.original.unit_price)) }}
          </span>
        </div>
      </template>

      <template #discount-cell="{ row }">
        <div v-if="discountPercentage(row.original) > 0" class="text-sm" :title="`Bonificación de ${fmt(discountAmount(row.original))} sobre el renglón`">
          <span class="font-medium text-success">{{ discountPercentage(row.original).toLocaleString('es-AR', { maximumFractionDigits: 2 }) }}%</span>
          <span v-if="discountAmount(row.original) > 0" class="block text-xs text-muted">− {{ fmt(discountAmount(row.original)) }}</span>
        </div>
        <span v-else class="text-muted">—</span>
      </template>

      <template #warehouse-cell="{ row }">
        <UBadge v-if="row.original.warehouse?.name" color="neutral" variant="subtle">
          {{ row.original.warehouse.name }}
        </UBadge>
        <span v-else class="font-medium text-warning">Sin depósito</span>
      </template>

      <template #subtotal-cell="{ row }">
        {{ fmt(lineSubtotal(row.original)) }}
      </template>

      <template #taxes-cell="{ row }">
        <div v-if="row.original.document_item_taxes?.length" class="text-right text-xs text-muted">
          <div v-for="tax in row.original.document_item_taxes" :key="tax.id ?? tax.tax_id">
            {{ tax.taxes?.name ?? tax.taxes?.code ?? 'Impuesto' }}: {{ fmt(Number(tax.tax_amount ?? 0)) }}
          </div>
        </div>
        <span v-else class="text-muted">—</span>
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
        <span class="font-medium">{{ fmt(lineTotal(row.original)) }}</span>
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
