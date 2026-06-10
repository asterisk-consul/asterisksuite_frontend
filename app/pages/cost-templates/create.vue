<script setup lang="ts">
import { useCostTemplates } from '~/modulos/logistica/master-data/product/cost-templates/composables/useCostTemplates'
import type {
  CostComponent,
  CostComponentType,
  CostValueType,
  CreateCostComponentDto
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'
import {
  COST_COMPONENT_TYPE_LABELS,
  COST_VALUE_TYPE_LABELS,
  COST_COMPONENT_TYPE_COLORS
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
})

useHead({ title: 'Nuevo template de costo' })

const toast = useToast()
const router = useRouter()

const { components, loading, init, createTemplate, createComponent } = useCostTemplates()

onMounted(() => init())

// =========================
// STEP
// =========================

const step = ref<1 | 2>(1)

// =========================
// STEP 1: TEMPLATE INFO
// =========================

const templateForm = reactive({
  name: '',
  description: '',
  is_default: false
})

// =========================
// STEP 2: COMPONENTS
// =========================

// Componentes seleccionados para el template
const selectedComponents = ref<
  {
    cost_component_id: string
    value_override: number | null
    order: number
    component: CostComponent
  }[]
>([])

const addComponent = (componentId: string) => {
  if (selectedComponents.value.find((c) => c.cost_component_id === componentId)) return
  const component = components.value.find((c) => c.id === componentId)
  if (!component) return
  selectedComponents.value.push({
    cost_component_id: componentId,
    value_override: null,
    order: selectedComponents.value.length + 1,
    component
  })
}

const removeComponent = (componentId: string) => {
  selectedComponents.value = selectedComponents.value.filter((c) => c.cost_component_id !== componentId)
}

// Opciones para el select de componentes disponibles
const availableComponentOptions = computed(() =>
  components.value
    .filter((c) => !selectedComponents.value.find((s) => s.cost_component_id === c.id))
    .map((c) => ({ label: c.name, value: c.id }))
)

const getTypeColor = (type: CostComponentType) => COST_COMPONENT_TYPE_COLORS[type] ?? 'neutral'

const formatValueType = (vt: CostValueType) => COST_VALUE_TYPE_LABELS[vt] ?? vt

// =========================
// NUEVO COMPONENTE (inline)
// =========================

const showNewComponentForm = ref(false)

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

const savingComponent = ref(false)

const handleCreateComponent = async () => {
  if (!newComponentForm.name) return
  try {
    savingComponent.value = true
    const dto: CreateCostComponentDto = {
      name: newComponentForm.name,
      type: newComponentForm.type,
      value_type: newComponentForm.value_type,
      value: newComponentForm.value ?? undefined,
      order: newComponentForm.order
    }
    const created = await createComponent(dto)
    // Agregarlo directo a seleccionados
    selectedComponents.value.push({
      cost_component_id: created.id,
      value_override: null,
      order: selectedComponents.value.length + 1,
      component: created
    })
    // Reset
    newComponentForm.name = ''
    newComponentForm.type = 'MATERIAL'
    newComponentForm.value_type = 'FROM_BOM'
    newComponentForm.value = null
    newComponentForm.order = 0
    showNewComponentForm.value = false
    toast.add({ title: 'Componente creado y agregado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error al crear componente', description: err?.data?.message, color: 'error' })
  } finally {
    savingComponent.value = false
  }
}

// =========================
// SUBMIT FINAL
// =========================

const saving = ref(false)

const canSubmit = computed(() => templateForm.name.trim() !== '' && selectedComponents.value.length > 0)

const handleSubmit = async () => {
  if (!canSubmit.value) return
  try {
    saving.value = true
    await createTemplate({
      name: templateForm.name,
      description: templateForm.description || undefined,
      is_default: templateForm.is_default,
      components: selectedComponents.value.map((c) => ({
        cost_component_id: c.cost_component_id,
        order: c.order,
        value_override: c.value_override ?? undefined
      }))
    })
    toast.add({ title: 'Template creado', color: 'success' })
    router.back()
  } catch (err: any) {
    toast.add({
      title: 'Error al crear template',
      description: err?.data?.message ?? 'Error desconocido',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4 space-y-6">
    <!-- HEADER -->
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="router.back()" />
      <div>
        <h1 class="text-xl font-semibold">Nuevo template de costo</h1>
        <p class="text-sm text-gray-500">Definí el nombre y los componentes del template</p>
      </div>
    </div>

    <!-- PASOS -->
    <div class="flex items-center gap-2 text-sm">
      <button
        class="flex items-center gap-1.5 font-medium"
        :class="step === 1 ? 'text-primary-500' : 'text-gray-400'"
        @click="step = 1"
      >
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
          :class="step === 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'"
        >
          1
        </span>
        Información
      </button>
      <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-gray-300" />
      <button
        class="flex items-center gap-1.5 font-medium"
        :class="step === 2 ? 'text-primary-500' : 'text-gray-400'"
        :disabled="!templateForm.name"
        @click="templateForm.name && (step = 2)"
      >
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
          :class="step === 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'"
        >
          2
        </span>
        Componentes
      </button>
    </div>

    <!-- ==================== -->
    <!-- PASO 1: INFO         -->
    <!-- ==================== -->
    <UCard v-if="step === 1">
      <template #header>
        <p class="text-sm font-medium">Información del template</p>
      </template>

      <div class="space-y-4">
        <UFormField label="Nombre" required>
          <UInput v-model="templateForm.name" placeholder="Ej: Estándar, Industrial, Servicios" class="w-full" />
        </UFormField>

        <UFormField label="Descripción">
          <UTextarea v-model="templateForm.description" placeholder="Descripción opcional" :rows="2" class="w-full" />
        </UFormField>

        <UCheckbox v-model="templateForm.is_default" label="Usar como template predeterminado" />
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton :disabled="!templateForm.name" icon="i-lucide-arrow-right" trailing @click="step = 2">
            Siguiente
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- ==================== -->
    <!-- PASO 2: COMPONENTES  -->
    <!-- ==================== -->
    <template v-if="step === 2">
      <!-- Componentes seleccionados -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Componentes del template</p>
            <UBadge :label="`${selectedComponents.length} seleccionados`" color="neutral" variant="soft" size="sm" />
          </div>
        </template>

        <!-- Lista -->
        <div class="space-y-2">
          <div v-if="!selectedComponents.length" class="py-6 text-center text-sm text-gray-400">
            Agregá al menos un componente para continuar.
          </div>

          <div
            v-for="sc in selectedComponents"
            :key="sc.cost_component_id"
            class="flex items-center justify-between rounded-lg border border-default px-3 py-2.5 gap-3"
          >
            <div class="flex items-center gap-2 min-w-0">
              <UBadge
                :label="COST_COMPONENT_TYPE_LABELS[sc.component.type]"
                :color="getTypeColor(sc.component.type)"
                variant="soft"
                size="xs"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ sc.component.name }}</p>
                <p class="text-xs text-gray-400">{{ formatValueType(sc.component.value_type) }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <UInputNumber v-model="sc.value_override" size="xs" placeholder="Override" class="w-28" :min="0" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-lucide-x"
                @click="removeComponent(sc.cost_component_id)"
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
            @update:model-value="addComponent($event)"
          />
        </div>

        <!-- Crear nuevo componente inline -->
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
                :loading="savingComponent"
                :disabled="!newComponentForm.name"
                @click="handleCreateComponent"
              >
                Crear y agregar
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- ACCIONES FINALES -->
      <div class="flex items-center justify-between">
        <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" @click="step = 1">Volver</UButton>

        <UButton :loading="saving" :disabled="!canSubmit" icon="i-lucide-check" @click="handleSubmit">
          Crear template
        </UButton>
      </div>
    </template>
  </div>
</template>
