<script setup lang="ts">
import { useCostTemplates } from '../composables/useCostTemplates'

const props = defineProps<{
  productId: string
  currentTemplateId: string | null
}>()

const emit = defineEmits<{
  assigned: [templateId: string]
  closed: []
}>()

const toast = useToast()
const { activeTemplates, loading, assignTemplateToProduct, getTypeLabel, getTypeColor, formatComponentValue } =
  useCostTemplates()

const selected = ref<string | null>(props.currentTemplateId)

const handleAssign = async () => {
  if (!selected.value) return

  try {
    await assignTemplateToProduct(selected.value, props.productId)
    toast.add({
      title: 'Template asignado',
      description: 'El template fue asignado correctamente al producto.',
      color: 'success'
    })
    emit('assigned', selected.value)
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo asignar el template.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Lista de templates -->
    <div class="space-y-2">
      <div
        v-for="template in activeTemplates"
        :key="template.id"
        class="cursor-pointer rounded-lg border-2 p-4 transition-colors"
        :class="
          selected === template.id
            ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20'
            : 'border-default hover:border-accented'
        "
        @click="selected = template.id"
      >
        <!-- Header template -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <UIcon
              :name="selected === template.id ? 'i-heroicons-check-circle-solid' : 'i-heroicons-circle'"
              class="size-4"
              :class="selected === template.id ? 'text-primary-500' : 'text-muted'"
            />
            <span class="font-medium">{{ template.name }}</span>
            <UBadge v-if="template.is_default" label="Default" color="primary" variant="subtle" size="xs" />
          </div>
        </div>

        <p v-if="template.description" class="text-xs text-muted mb-3 ml-6">
          {{ template.description }}
        </p>

        <!-- Componentes -->
        <div class="ml-6 space-y-1">
          <div v-for="tc in template.components" :key="tc.id" class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <UBadge
                :label="getTypeLabel(tc.component.type)"
                :color="getTypeColor(tc.component.type)"
                variant="subtle"
                size="xs"
              />
              <span class="text-muted">{{ tc.component.name }}</span>
            </div>
            <span class="font-medium tabular-nums">
              {{ formatComponentValue(tc.component.value_type, tc.component.value, tc.value_override) }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="!activeTemplates.length" class="text-center text-sm text-muted py-6">
        No hay templates disponibles. Creá uno en Configuración.
      </p>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 pt-2 border-t border-default">
      <UButton variant="ghost" color="neutral" @click="emit('closed')">Cancelar</UButton>
      <UButton :disabled="!selected || selected === currentTemplateId" :loading="loading" @click="handleAssign">
        Asignar template
      </UButton>
    </div>
  </div>
</template>
