<script setup lang="ts">
const props = defineProps<{
  productId: string
  availableWarehouses: Array<{
    id: string
    name: string
    code?: string | null
    units?: { symbol: string } | null
  }>
}>()

const emit = defineEmits<{
  submit: [warehouseId: string, quantity: string]
}>()

const open = defineModel<boolean>('open', { default: false })

const selectedWarehouseId = ref('')
const quantity = ref('')

const warehouseOptions = computed(() =>
  props.availableWarehouses.map((w) => ({
    label: `${w.name}${w.code ? ` (${w.code})` : ''}${w.units ? ` - ${w.units.symbol}` : ''}`,
    value: w.id
  }))
)

const handleSubmit = () => {
  if (selectedWarehouseId.value && quantity.value) {
    emit('submit', selectedWarehouseId.value, quantity.value)
    selectedWarehouseId.value = ''
    quantity.value = ''
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Agregar stock a depósito">
    <template #body>
      <div class="space-y-4">
        <div v-if="availableWarehouses.length === 0" class="text-center py-4 text-muted">
          No hay depósitos disponibles para agregar stock.
        </div>

        <template v-else>
          <UFormField label="Depósito" required>
            <USelect
              v-model="selectedWarehouseId"
              :items="warehouseOptions"
              placeholder="Seleccionar depósito"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Cantidad" required>
            <UInput
              v-model="quantity"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
            />
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
          :disabled="!selectedWarehouseId || !quantity"
          @click="handleSubmit"
        >
          Agregar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
