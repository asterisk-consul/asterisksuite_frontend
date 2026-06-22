<script setup lang="ts">
import { reactive, computed, watch, onMounted, toRef } from 'vue'

import { useEngineering } from '../composables/useEngineering'
import type { CreateEngineeringComponentDto, EngineeringTreeNode } from '../types/engineering.types'

import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useProductVariants } from '~/modulos/logistica/master-data/product-variants/composable/useVariants'

const props = defineProps<{
  productId: string
  component?: EngineeringTreeNode
  parentId?: string | null
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const toast = useToast()
const isEditing = computed(() => !!props.component)
const { addComponent, updateComponent, loading } = useEngineering(props.productId)

const { init, selectItems: productOptions } = useProducts()

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

const { selectItems: variantOptions, loadByProduct: initVariants } = useProductVariants()

watch(
  () => props.component,
  (component) => {
    form.child_product_id = component?.child_product_id ?? ''
    form.child_variant_id = component?.child_variant_id
    form.quantity = component?.quantity ?? 1
    form.unit_id = component?.unit_id
    form.length_mm = component?.length_mm ?? undefined
    form.width_mm = component?.width_mm ?? undefined
    form.height_mm = component?.height_mm ?? undefined
    form.waste_percentage = component?.waste_percentage ?? undefined
  },
  { immediate: true }
)

watch(
  () => form.child_product_id,
  async (productId) => {
    form.child_variant_id = undefined
    if (!productId) return
    await initVariants(form.child_product_id)
  }
)

const handleSubmit = async () => {
  try {
    if (isEditing.value) {
      await updateComponent(props.component!.id, form)
      toast.add({
        title: 'Componente actualizado',
        description: 'Los cambios fueron guardados correctamente.',
        color: 'success'
      })
    } else {
      await addComponent(form, props.parentId ?? null)
      toast.add({
        title: 'Componente agregado',
        description: 'El componente fue agregado al árbol de ingeniería.',
        color: 'success'
      })
    }
    emit('saved')
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description:
        err?.data?.message ??
        (isEditing.value ? 'No se pudo actualizar el componente.' : 'No se pudo agregar el componente.'),
      color: 'error'
    })
  }
}

onMounted(async () => {
  await init()
  if (form.child_product_id) await initVariants(form.child_product_id)
})
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Producto hijo" required>
      <USelectMenu
        v-model="form.child_product_id"
        :items="productOptions"
        value-key="value"
        placeholder="Seleccionar producto"
        class="w-full"
        searchable
      />
    </UFormField>

    <UFormField label="Variante (opcional)">
      <USelectMenu
        v-model="form.child_variant_id"
        :items="variantOptions"
        value-key="value"
        placeholder="Seleccionar variante"
        class="w-full"
        searchable
        :disabled="!form.child_product_id"
      />
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
        {{ isEditing ? 'Guardar cambios' : 'Agregar componente' }}
      </UButton>
    </div>
  </div>
</template>
