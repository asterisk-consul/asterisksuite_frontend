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
const { init, activeTemplates, loading, assignTemplateToProduct, createTemplate, components, getTypeLabel, getTypeColor, formatComponentValue } =
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

// =========================
// CREAR TEMPLATE RÁPIDO
// =========================

const showCreateModal = ref(false)
const creating = ref(false)

const newTemplate = reactive({
  name: '',
  description: ''
})

const availableComponents = computed(() =>
  components.value.map(c => ({ label: c.name, value: c.id }))
)

const selectedComponents = ref<string[]>([])

const toggleComponent = (id: string) => {
  const idx = selectedComponents.value.indexOf(id)
  if (idx === -1) {
    selectedComponents.value.push(id)
  } else {
    selectedComponents.value.splice(idx, 1)
  }
}

const handleCreateTemplate = async () => {
  if (!newTemplate.name.trim() || selectedComponents.value.length === 0) return

  try {
    creating.value = true
    const created = await createTemplate({
      name: newTemplate.name,
      description: newTemplate.description || undefined,
      is_default: false,
      components: selectedComponents.value.map((id, i) => ({
        cost_component_id: id,
        order: i + 1
      }))
    })

    await init()
    selected.value = created.id

    toast.add({
      title: 'Template creado',
      description: 'El template fue creado y seleccionado automáticamente.',
      color: 'success'
    })

    showCreateModal.value = false
    newTemplate.name = ''
    newTemplate.description = ''
    selectedComponents.value = []
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo crear el template.',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  init()
})
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
        No hay templates disponibles.
      </p>

      <!-- Botón crear template -->
      <div class="flex justify-center pt-2">
        <UButton
          variant="outline"
          size="sm"
          icon="i-lucide-plus"
          label="Crear nuevo template"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 pt-2 border-t border-default">
      <UButton variant="ghost" color="neutral" @click="emit('closed')">Cancelar</UButton>
      <UButton :disabled="!selected || selected === currentTemplateId" :loading="loading" @click="handleAssign">
        Asignar template
      </UButton>
    </div>

    <!-- ========================= -->
    <!-- MODAL: CREAR TEMPLATE     -->
    <!-- ========================= -->
    <UModal v-model:open="showCreateModal" title="Crear nuevo template">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nombre del template" required>
            <UInput v-model="newTemplate.name" placeholder="Ej: Estándar, Industrial" />
          </UFormField>

          <UFormField label="Descripción">
            <UInput v-model="newTemplate.description" placeholder="Descripción opcional" />
          </UFormField>

          <UFormField label="Componentes" required>
            <p class="text-xs text-muted mb-2">Seleccioná los componentes que incluye este template:</p>
            <div class="space-y-1">
              <button
                v-for="comp in availableComponents"
                :key="comp.value"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-colors text-left text-sm"
                :class="selectedComponents.includes(comp.value) ? 'border-primary-500 bg-primary-50/30' : 'border-default hover:border-accented'"
                @click="toggleComponent(comp.value)"
              >
                <UIcon
                  :name="selectedComponents.includes(comp.value) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-circle'"
                  class="size-4 shrink-0"
                  :class="selectedComponents.includes(comp.value) ? 'text-primary-500' : 'text-muted'"
                />
                {{ comp.label }}
              </button>
            </div>
            <p v-if="availableComponents.length === 0" class="text-xs text-muted mt-2">
              No hay componentes disponibles. Creá uno primero en Configuración.
            </p>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showCreateModal = false">Cancelar</UButton>
          <UButton
            :loading="creating"
            :disabled="!newTemplate.name.trim() || selectedComponents.length === 0"
            @click="handleCreateTemplate"
          >
            Crear y seleccionar
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
