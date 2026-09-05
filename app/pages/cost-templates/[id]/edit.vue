<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

import { useCostTemplates } from '~/modulos/logistica/master-data/product/cost-templates/composables/useCostTemplates'
import type {
  CostComponent,
  CostComponentType,
  CostValueType,
  CreateCostComponentDto,
  UpdateTemplateComponentDto
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'

import {
  COST_COMPONENT_TYPE_LABELS,
  COST_VALUE_TYPE_LABELS,
  COST_COMPONENT_TYPE_COLORS
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'

useHead({ title: 'Editar template de costo' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const templateId = route.params.id as string

const {
  init,
  components,
  loading,
  getTemplateById,
  updateTemplate,
  createComponent,
  addComponentToTemplate,
  updateComponentInTemplate,
  removeComponentFromTemplate,
  getTypeColor,
  formatComponentValue
} = useCostTemplates()

onMounted(() => init())

const template = computed(() => getTemplateById(templateId))

// =========================
// TEMPLATE INFO FORM
// =========================

const infoForm = reactive({
  name: '',
  description: '',
  is_default: false
})

const savingInfo = ref(false)

// Sync cuando carga el template
watch(
  template,
  (t) => {
    if (!t) return
    infoForm.name = t.name
    infoForm.description = t.description ?? ''
    infoForm.is_default = t.is_default
  },
  { immediate: true }
)

const handleSaveInfo = async () => {
  try {
    savingInfo.value = true
    await updateTemplate(templateId, {
      name: infoForm.name,
      description: infoForm.description || undefined,
      is_default: infoForm.is_default
    })
    toast.add({ title: 'Template actualizado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error al guardar', description: err?.data?.message, color: 'error' })
  } finally {
    savingInfo.value = false
  }
}

// =========================
// COMPONENTES DEL TEMPLATE
// =========================

const savingOverride = ref<string | null>(null)

const handleUpdateOverride = async (componentId: string, dto: UpdateTemplateComponentDto) => {
  try {
    savingOverride.value = componentId
    await updateComponentInTemplate(templateId, componentId, dto)
    toast.add({ title: 'Override actualizado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.message, color: 'error' })
  } finally {
    savingOverride.value = null
  }
}

const removingComponent = ref<string | null>(null)

const handleRemoveComponent = async (componentId: string) => {
  try {
    removingComponent.value = componentId
    await removeComponentFromTemplate(templateId, componentId)
    toast.add({ title: 'Componente quitado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.message, color: 'error' })
  } finally {
    removingComponent.value = null
  }
}

// =========================
// AGREGAR COMPONENTE EXISTENTE
// =========================

const addingComponent = ref(false)

const availableComponentOptions = computed(() => {
  const assigned = new Set(template.value?.components.map((c) => c.cost_component_id) ?? [])
  return components.value.filter((c) => !assigned.has(c.id)).map((c) => ({ label: c.name, value: c.id }))
})

const handleAddExisting = async (componentId: string) => {
  if (!componentId) return
  try {
    addingComponent.value = true
    await addComponentToTemplate(templateId, {
      cost_component_id: componentId,
      order: (template.value?.components.length ?? 0) + 1
    })
    toast.add({ title: 'Componente agregado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.message, color: 'error' })
  } finally {
    addingComponent.value = false
  }
}

// =========================
// CREAR COMPONENTE INLINE
// =========================

const showNewComponentForm = ref(false)
const savingNewComponent = ref(false)

const newComponentForm = reactive({
  name: '',
  type: 'MATERIAL' as CostComponentType,
  value_type: 'FROM_BOM' as CostValueType,
  value: null as number | null,
  order: 0
})

const typeOptions = Object.entries(COST_COMPONENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const valueTypeOptions = Object.entries(COST_VALUE_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const showValueInput = computed(() => newComponentForm.value_type !== 'FROM_BOM')
const valueLabel = computed(() => {
  switch (newComponentForm.value_type) {
    case 'PERCENTAGE_OF_MATERIAL':
    case 'PERCENTAGE_OF_TOTAL':
      return 'Porcentaje (ej: 0.15 = 15%)'
    case 'FIXED_PER_UNIT':
      return 'Monto fijo por unidad'
    default:
      return 'Valor'
  }
})

const handleCreateAndAdd = async () => {
  if (!newComponentForm.name) return
  try {
    savingNewComponent.value = true
    const dto: CreateCostComponentDto = {
      name: newComponentForm.name,
      type: newComponentForm.type,
      value_type: newComponentForm.value_type,
      value: newComponentForm.value ?? undefined,
      order: newComponentForm.order
    }
    const created = await createComponent(dto)
    await addComponentToTemplate(templateId, {
      cost_component_id: created.id,
      order: (template.value?.components.length ?? 0) + 1
    })
    newComponentForm.name = ''
    newComponentForm.type = 'MATERIAL'
    newComponentForm.value_type = 'FROM_BOM'
    newComponentForm.value = null
    showNewComponentForm.value = false
    toast.add({ title: 'Componente creado y agregado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.message, color: 'error' })
  } finally {
    savingNewComponent.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4 space-y-6">
    <!-- HEADER -->
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="router.back()" />
      <div>
        <h1 class="text-xl font-semibold">Editar template</h1>
        <p class="text-sm text-gray-500">{{ template?.name }}</p>
      </div>
    </div>

    <!-- SKELETON -->
    <template v-if="loading && !template">
      <UCard><div class="h-32 animate-pulse bg-gray-100 rounded" /></UCard>
      <UCard><div class="h-48 animate-pulse bg-gray-100 rounded" /></UCard>
    </template>

    <template v-else-if="template">
      <!-- INFO -->
      <UCard>
        <template #header>
          <p class="text-sm font-medium">Información del template</p>
        </template>

        <div class="space-y-4">
          <UFormField label="Nombre" required>
            <UInput v-model="infoForm.name" class="w-full" />
          </UFormField>

          <UFormField label="Descripción">
            <UTextarea v-model="infoForm.description" :rows="2" class="w-full" />
          </UFormField>

          <UCheckbox v-model="infoForm.is_default" label="Usar como template predeterminado" />
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton :loading="savingInfo" :disabled="!infoForm.name" icon="i-lucide-save" @click="handleSaveInfo">
              Guardar cambios
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- COMPONENTES -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Componentes</p>
            <UBadge :label="`${template.components.length} componentes`" color="neutral" variant="soft" size="sm" />
          </div>
        </template>

        <!-- Lista -->
        <div class="space-y-2">
          <div v-if="!template.components.length" class="py-6 text-center text-sm text-gray-400">
            Este template no tiene componentes aún.
          </div>

          <div
            v-for="tc in template.components"
            :key="tc.id"
            class="flex items-center justify-between rounded-lg border border-default px-3 py-2.5 gap-3"
          >
            <div class="flex items-center gap-2 min-w-0">
              <UBadge
                :label="COST_COMPONENT_TYPE_LABELS[tc.component.type]"
                :color="getTypeColor(tc.component.type)"
                variant="soft"
                size="xs"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ tc.component.name }}</p>
                <p class="text-xs text-gray-400">{{ COST_VALUE_TYPE_LABELS[tc.component.value_type] }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <UInputNumber
                :model-value="tc.value_override"
                size="xs"
                placeholder="Override"
                class="w-28"
                :min="0"
                @update:model-value="handleUpdateOverride(tc.id, { value_override: $event })"
              />
              <UBadge v-if="tc.value_override !== null" label="Override" color="warning" variant="soft" size="xs" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-lucide-x"
                :loading="removingComponent === tc.id"
                @click="handleRemoveComponent(tc.id)"
              />
            </div>
          </div>
        </div>

        <!-- Agregar existente -->
        <div v-if="availableComponentOptions.length" class="mt-3 pt-3 border-t border-default">
          <USelect
            :items="availableComponentOptions"
            placeholder="Agregar componente existente..."
            size="sm"
            class="w-full"
            :loading="addingComponent"
            @update:model-value="handleAddExisting($event)"
          />
        </div>

        <!-- Crear nuevo inline -->
        <div class="mt-2">
          <UButton
            v-if="!showNewComponentForm"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-plus"
            @click="showNewComponentForm = true"
          >
            Crear nuevo componente
          </UButton>

          <div v-else class="mt-3 pt-3 border-t border-default space-y-3">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Nuevo componente</p>

            <UFormField label="Nombre" required>
              <UInput v-model="newComponentForm.name" placeholder="Ej: Mano de obra directa" class="w-full" />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Tipo">
                <USelect v-model="newComponentForm.type" :items="typeOptions" class="w-full" />
              </UFormField>
              <UFormField label="Cálculo">
                <USelect v-model="newComponentForm.value_type" :items="valueTypeOptions" class="w-full" />
              </UFormField>
            </div>

            <UFormField v-if="showValueInput" :label="valueLabel">
              <UInputNumber v-model="newComponentForm.value" placeholder="0.00" :min="0" class="w-full" />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton size="sm" variant="ghost" color="neutral" @click="showNewComponentForm = false">
                Cancelar
              </UButton>
              <UButton
                size="sm"
                :loading="savingNewComponent"
                :disabled="!newComponentForm.name"
                @click="handleCreateAndAdd"
              >
                Crear y agregar
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <!-- NOT FOUND -->
    <UCard v-else>
      <div class="py-10 text-center space-y-2">
        <UIcon name="i-lucide-alert-circle" class="h-8 w-8 text-gray-400 mx-auto" />
        <p class="text-sm text-gray-500">Template no encontrado.</p>
        <UButton variant="ghost" color="neutral" @click="router.back()">Volver</UButton>
      </div>
    </UCard>
  </div>
</template>
