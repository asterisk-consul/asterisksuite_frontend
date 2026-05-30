<script setup lang="ts">
import { useEngineering } from '../composables/useEngineering'
import type { CreateEngineeringComponentDto } from '../types/engineering.types'

const props = defineProps<{
  productId: string
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const toast = useToast()
const { addComponent, loading } = useEngineering(props.productId)

const form = reactive<Omit<CreateEngineeringComponentDto, 'parent_product_id'>>({
  child_product_id: '',
  child_variant_id: undefined,
  quantity: 1,
  unit_id: undefined,
  length_mm: undefined,
  width_mm: undefined,
  height_mm: undefined,
  waste_percentage: undefined
})

const handleSubmit = async () => {
  try {
    await addComponent(form)
    toast.add({
      title: 'Componente agregado',
      description: 'El componente fue agregado al árbol de ingeniería.',
      color: 'success'
    })
    emit('saved')
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo agregar el componente.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Producto hijo" required>
      <UInput v-model="form.child_product_id" placeholder="ID del producto componente" />
    </UFormField>

    <UFormField label="Variante (opcional)">
      <UInput v-model="form.child_variant_id" placeholder="ID de la variante" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Cantidad" required>
        <UInput v-model.number="form.quantity" type="number" step="0.001" min="0" placeholder="1" />
      </UFormField>

      <UFormField label="% Desperdicio">
        <UInput v-model.number="form.waste_percentage" type="number" step="0.01" min="0" max="100" placeholder="0" />
      </UFormField>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <UFormField label="Largo (mm)">
        <UInput v-model.number="form.length_mm" type="number" placeholder="0" />
      </UFormField>
      <UFormField label="Ancho (mm)">
        <UInput v-model.number="form.width_mm" type="number" placeholder="0" />
      </UFormField>
      <UFormField label="Alto (mm)">
        <UInput v-model.number="form.height_mm" type="number" placeholder="0" />
      </UFormField>
    </div>

    <div class="flex justify-end gap-2 pt-2 border-t border-default">
      <UButton variant="ghost" color="neutral" @click="emit('cancelled')">Cancelar</UButton>
      <UButton :loading="loading" :disabled="!form.child_product_id || !form.quantity" @click="handleSubmit">
        Agregar componente
      </UButton>
    </div>
  </div>
</template>
