<script setup lang="ts">
const props = defineProps<{
  productId: string
  sourceWarehouse: {
    warehouse_id: string
    quantity: string
    warehouse?: { name: string; units?: { symbol: string } | null }
  } | null
  warehouses: Array<{
    id: string
    name: string
    code?: string | null
    active: boolean
    units?: { id: string; name: string; symbol: string } | null
  }>
}>()

const emit = defineEmits<{
  submit: [data: { from_warehouse_id: string; to_warehouse_id: string; quantity: string }]
}>()

const open = defineModel<boolean>('open', { default: false })

const selectedDestWarehouseId = ref('')
const quantity = ref('')

const destWarehouseOptions = computed(() => {
  if (!props.sourceWarehouse) return []
  return props.warehouses
    .filter((w) => w.id !== props.sourceWarehouse!.warehouse_id && w.active)
    .map((w) => ({
      label: `${w.name}${w.code ? ` (${w.code})` : ''}${w.units ? ` - ${w.units.symbol}` : ''}`,
      value: w.id
    }))
})

const maxQuantity = computed(() => {
  if (!props.sourceWarehouse) return 0
  return parseFloat(props.sourceWarehouse.quantity)
})

const handleSubmit = () => {
  if (selectedDestWarehouseId.value && quantity.value) {
    emit('submit', {
      from_warehouse_id: props.sourceWarehouse!.warehouse_id,
      to_warehouse_id: selectedDestWarehouseId.value,
      quantity: quantity.value
    })
    selectedDestWarehouseId.value = ''
    quantity.value = ''
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Transferir stock entre depósitos">
    <template #body>
      <div class="space-y-4">
        <div v-if="!sourceWarehouse" class="text-center py-4 text-muted">
          No hay depósito de origen seleccionado.
        </div>

        <template v-else>
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div class="text-sm text-muted">Origen</div>
            <div class="font-medium">
              {{ sourceWarehouse.warehouse?.name || 'Depósito' }}
              — {{ parseFloat(sourceWarehouse.quantity).toFixed(2) }}
              {{ sourceWarehouse.warehouse?.units?.symbol || '' }}
            </div>
          </div>

          <UFormField label="Depósito destino" required>
            <USelect
              v-model="selectedDestWarehouseId"
              :items="destWarehouseOptions"
              placeholder="Seleccionar destino"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Cantidad a transferir" required>
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
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          @click="open = false"
        >
          Cancelar
        </UButton>
        <UButton
          :disabled="!selectedDestWarehouseId || !quantity"
          @click="handleSubmit"
        >
          Transferir
        </UButton>
      </div>
    </template>
  </UModal>
</template>
