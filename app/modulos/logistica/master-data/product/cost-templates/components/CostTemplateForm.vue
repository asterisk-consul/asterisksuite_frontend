<script setup lang="ts">
import { useCostTemplates } from '../composables/useCostTemplates'
import type { CostTemplate, CreateCostTemplateDto } from '../types/cost-template.types'

const props = defineProps<{
  template?: CostTemplate
}>()

const emit = defineEmits<{
  saved: [template: CostTemplate]
  cancelled: []
}>()

const toast = useToast()
const { components, createTemplate, updateTemplate, loading } = useCostTemplates()

const form = reactive({
  name: props.template?.name ?? '',
  description: props.template?.description ?? '',
  is_default: props.template?.is_default ?? false,
  selectedComponents:
    props.template?.components.map((c) => ({
      cost_component_id: c.cost_component_id,
      value_override: c.value_override,
      order: c.order
    })) ?? []
})

const isEditing = computed(() => !!props.template)

const addComponent = (componentId: string) => {
  if (form.selectedComponents.find((c) => c.cost_component_id === componentId)) return
  form.selectedComponents.push({
    cost_component_id: componentId,
    value_override: null,
    order: form.selectedComponents.length + 1
  })
}

const removeComponent = (componentId: string) => {
  form.selectedComponents = form.selectedComponents.filter((c) => c.cost_component_id !== componentId)
}

const getComponentById = (id: string) => components.value.find((c) => c.id === id)

const handleSubmit = async () => {
  try {
    const dto: CreateCostTemplateDto = {
      name: form.name,
      description: form.description || undefined,
      is_default: form.is_default,
      components: form.selectedComponents.map((c) => ({
        cost_component_id: c.cost_component_id,
        order: c.order,
        value_override: c.value_override ?? undefined
      }))
    }

    let result: CostTemplate

    if (isEditing.value && props.template) {
      result = await updateTemplate(props.template.id, {
        name: dto.name,
        description: dto.description,
        is_default: dto.is_default
      })
    } else {
      result = await createTemplate(dto)
    }

    toast.add({
      title: isEditing.value ? 'Template actualizado' : 'Template creado',
      color: 'success'
    })

    emit('saved', result)
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo guardar el template.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Nombre -->
    <UFormField label="Nombre" required>
      <UInput v-model="form.name" placeholder="Ej: Estándar, Industrial, Servicios" />
    </UFormField>

    <!-- Descripción -->
    <UFormField label="Descripción">
      <UTextarea v-model="form.description" placeholder="Descripción opcional del template" :rows="2" />
    </UFormField>

    <!-- Default -->
    <UFormField>
      <UCheckbox v-model="form.is_default" label="Usar como template predeterminado" />
    </UFormField>

    <!-- Componentes seleccionados -->
    <UFormField label="Componentes de costo">
      <div class="space-y-2">
        <div
          v-for="sc in form.selectedComponents"
          :key="sc.cost_component_id"
          class="flex items-center justify-between rounded-md border border-default px-3 py-2"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">
              {{ getComponentById(sc.cost_component_id)?.name ?? sc.cost_component_id }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <UInput v-model.number="sc.value_override" type="number" size="xs" placeholder="Override" class="w-28" />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-x-mark"
              @click="removeComponent(sc.cost_component_id)"
            />
          </div>
        </div>

        <!-- Agregar componente -->
        <USelectMenu
          :items="
            components
              .filter((c) => !form.selectedComponents.find((s) => s.cost_component_id === c.id))
              .map((c) => ({ label: c.name, value: c.id }))
          "
          label-key="label"
          value-key="value"
          placeholder="Agregar componente..."
          size="sm"
          @update:modelValue="addComponent($event)"
        />
      </div>
    </UFormField>

    <!-- Footer -->
    <div class="flex justify-end gap-2 pt-2 border-t border-default">
      <UButton variant="ghost" color="neutral" @click="emit('cancelled')">Cancelar</UButton>
      <UButton :loading="loading" :disabled="!form.name || !form.selectedComponents.length" @click="handleSubmit">
        {{ isEditing ? 'Guardar cambios' : 'Crear template' }}
      </UButton>
    </div>
  </div>
</template>
