<script setup lang="ts">
const props = defineProps<{
  stockItem: {
    warehouse_id: string
    quantity: string
    reserved_quantity: string
    warehouse?: { name: string; units?: { symbol: string } | null }
  } | null
}>()

const emit = defineEmits<{
  confirm: []
}>()

const open = defineModel<boolean>('open', { default: false })

const hasStock = computed(() => {
  if (!props.stockItem) return false
  return parseFloat(props.stockItem.quantity) > 0
})

const hasReserved = computed(() => {
  if (!props.stockItem) return false
  return parseFloat(props.stockItem.reserved_quantity) > 0
})
</script>

<template>
  <UModal v-model:open="open" title="Eliminar stock del depósito">
    <template #body>
      <div class="space-y-4">
        <div v-if="!stockItem" class="text-center py-4 text-muted">
          No hay depósito seleccionado.
        </div>

        <template v-else>
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div class="text-sm text-muted">Depósito</div>
            <div class="font-medium">
              {{ stockItem.warehouse?.name || 'Depósito' }}
            </div>
          </div>

          <div v-if="hasStock" class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-alert-triangle" class="text-amber-600 mt-0.5" />
              <div>
                <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Este depósito tiene stock
                </p>
                <p class="text-sm text-amber-700 dark:text-amber-300">
                  Stock actual: {{ parseFloat(stockItem.quantity).toFixed(2) }}
                  {{ stockItem.warehouse?.units?.symbol || '' }}
                </p>
                <p v-if="hasReserved" class="text-sm text-amber-700 dark:text-amber-300">
                  Reservado: {{ parseFloat(stockItem.reserved_quantity).toFixed(2) }}
                  {{ stockItem.warehouse?.units?.symbol || '' }}
                </p>
              </div>
            </div>
          </div>

          <p class="text-sm text-muted">
            Al eliminar, el stock se dará de baja y se registrará un movimiento de salida.
          </p>
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
          color="error"
          :disabled="!stockItem"
          @click="emit('confirm')"
        >
          Eliminar stock
        </UButton>
      </div>
    </template>
  </UModal>
</template>
