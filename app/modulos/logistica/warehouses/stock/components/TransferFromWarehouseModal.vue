<script setup lang="ts">
import type { WarehouseStockItem } from '~/modulos/logistica/warehouses/stock/stock.types'

const props = defineProps<{
  warehouseId: string
  warehouseName: string
  warehouseSymbol?: string
  stock: WarehouseStockItem[]
  warehouses: Array<{
    id: string
    name: string
    code?: string | null
    active: boolean
    units?: { id: string; name: string; symbol: string } | null
  }>
}>()

const emit = defineEmits<{
  submit: [data: { from_warehouse_id: string; to_warehouse_id: string; product_id: string; quantity: string }]
}>()

const open = defineModel<boolean>('open', { default: false })

const selectedDestWarehouseId = ref('')
const selectedProductId = ref('')
const quantity = ref('')

const destWarehouseOptions = computed(() =>
  props.warehouses
    .filter((w) => w.id !== props.warehouseId && w.active)
    .map((w) => ({
      label: `${w.name}${w.code ? ` (${w.code})` : ''}${w.units ? ` - ${w.units.symbol}` : ''}`,
      value: w.id
    }))
)

const productOptions = computed(() =>
  props.stock.map((item) => ({
    label: `${item.products.name}${item.products.sku ? ` (${item.products.sku})` : ''} — Disp: ${parseFloat(item.quantity).toFixed(2)}`,
    value: item.product_id
  }))
)

const selectedProductStock = computed(() =>
  props.stock.find((s) => s.product_id === selectedProductId.value)
)

const maxQuantity = computed(() => {
  if (!selectedProductStock.value) return 0
  return parseFloat(selectedProductStock.value.quantity)
})

const handleSubmit = () => {
  if (selectedDestWarehouseId.value && selectedProductId.value && quantity.value) {
    emit('submit', {
      from_warehouse_id: props.warehouseId,
      to_warehouse_id: selectedDestWarehouseId.value,
      product_id: selectedProductId.value,
      quantity: quantity.value
    })
    selectedDestWarehouseId.value = ''
    selectedProductId.value = ''
    quantity.value = ''
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Transferir a otro depósito">
    <template #body>
      <div class="space-y-4">
        <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div class="text-sm text-muted">Origen</div>
          <div class="font-medium">{{ warehouseName }}</div>
        </div>

        <UFormField label="Producto" required>
          <USelect
            v-model="selectedProductId"
            :items="productOptions"
            placeholder="Seleccionar producto"
            searchable
            class="w-full"
          />
        </UFormField>

        <UFormField label="Depósito destino" required>
          <USelect
            v-model="selectedDestWarehouseId"
            :items="destWarehouseOptions"
            placeholder="Seleccionar destino"
            class="w-full"
          />
        </UFormField>

        <UFormField v-if="selectedProductId" label="Cantidad a transferir" required>
          <UInput
            v-model="quantity"
            type="text"
            inputmode="decimal"
            placeholder="0.00"
          />
          <p class="text-xs text-muted mt-1">
            Máximo disponible: {{ maxQuantity.toFixed(2) }}
          </p>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" @click="open = false">
          Cancelar
        </UButton>
        <UButton
          :disabled="!selectedDestWarehouseId || !selectedProductId || !quantity"
          @click="handleSubmit"
        >
          Transferir
        </UButton>
      </div>
    </template>
  </UModal>
</template>
