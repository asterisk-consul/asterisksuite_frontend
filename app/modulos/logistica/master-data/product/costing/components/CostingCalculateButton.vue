<script setup lang="ts">
import { useCosting } from '../composables/useCosting'

const props = defineProps<{
  productId: string
  currencyId: string
}>()

const emit = defineEmits<{
  calculated: []
}>()

const toast = useToast()
const { calculate, calculating } = useCosting(props.productId, props.currencyId)

const handleCalculate = async () => {
  try {
    await calculate()
    toast.add({
      title: 'Costo calculado',
      description: 'El costo fue recalculado y guardado correctamente.',
      color: 'success'
    })
    emit('calculated')
  } catch (err: any) {
    toast.add({
      title: 'Error al calcular',
      description: err?.data?.message ?? 'Ocurrió un error inesperado.',
      color: 'error'
    })
  }
}
</script>

<template>
  <UButton
    icon="i-heroicons-calculator"
    :loading="calculating"
    :disabled="calculating"
    color="primary"
    @click="handleCalculate"
  >
    Recalcular costo
  </UButton>
</template>
