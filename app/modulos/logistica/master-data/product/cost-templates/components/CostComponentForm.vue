<script setup lang="ts">
import { useCostTemplates } from '../composables/useCostTemplates'
import type { CostComponent, CostComponentType, CostValueType } from '../types/cost-template.types'
import { COST_COMPONENT_TYPE_LABELS, COST_VALUE_TYPE_LABELS } from '../types/cost-template.types'
import type { CreateCostComponentDto } from '../types/cost-template.types'

const props = defineProps<{
  component?: CostComponent
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const toast = useToast()
const { createComponent, updateComponent, loading, costComponentTypeItems, costValueTypeItems } = useCostTemplates()

const form = reactive({
  name: props.component?.name ?? '',
  type: (props.component?.type ?? 'MATERIAL') as CostComponentType,
  value_type: (props.component?.value_type ?? 'FROM_BOM') as CostValueType,
  value: props.component?.value ?? (null as number | null),
  order: props.component?.order ?? 0
})

const isEditing = computed(() => !!props.component)

const showValueInput = computed(() => form.value_type !== 'FROM_BOM')

const valueLabel = computed(() => {
  switch (form.value_type) {
    case 'PERCENTAGE_OF_MATERIAL':
    case 'PERCENTAGE_OF_TOTAL':
      return 'Porcentaje (ej: 0.15 = 15%)'
    case 'FIXED_PER_UNIT':
      return 'Monto fijo por unidad'
    default:
      return 'Valor'
  }
})

const handleSubmit = async () => {
  try {
    const payload: CreateCostComponentDto = {
      name: form.name,
      type: (form.type as any)?.value ?? form.type,
      value_type: (form.value_type as any)?.value ?? form.value_type,
      value: form.value ?? undefined,
      order: form.order || 0
    }

    if (isEditing.value && props.component) {
      await updateComponent(props.component.id, payload)
    } else {
      await createComponent(payload)
    }

    toast.add({
      title: isEditing.value ? 'Componente actualizado' : 'Componente creado',
      color: 'success'
    })

    emit('saved')
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo guardar el componente.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Nombre" required>
      <UInput v-model="form.name" placeholder="Ej: Mano de obra directa" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Tipo" required>
        <USelectMenu
          v-model="form.type"
          :items="costComponentTypeItems"
          value-key="value"
          value-attribute="value"
          option-attribute="label"
          class="w-full"
          clear
          search
        />
      </UFormField>

      <UFormField label="Forma de cálculo" required>
        <USelectMenu
          v-model="form.value_type"
          :items="costValueTypeItems"
          value-key="value"
          value-attribute="value"
          option-attribute="label"
          class="w-full"
          clear
          search
        />
      </UFormField>
    </div>

    <UFormField v-if="showValueInput" :label="valueLabel" required>
      <UInput v-model.number="form.value" type="number" placeholder="0.00" class="w-full" />
    </UFormField>

    <UFormField label="Orden">
      <UInput v-model.number="form.order" type="number" placeholder="0" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2 border-t border-default">
      <UButton variant="ghost" color="neutral" @click="emit('cancelled')">Cancelar</UButton>
      <UButton :loading="loading" :disabled="!form.name" @click="handleSubmit">
        {{ isEditing ? 'Guardar cambios' : 'Crear componente' }}
      </UButton>
    </div>
  </div>
</template>
