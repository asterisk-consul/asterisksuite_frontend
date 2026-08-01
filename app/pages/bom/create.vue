<script setup lang="ts">
import GeneralSection from '~/modulos/logistica/master-data/product/components/sections/GeneralSection.vue'
import ConfigurationCostForm from '~/modulos/logistica/master-data/product/costing/components/ConfigurationCostForm.vue'
import CostTemplateSelector from '~/modulos/logistica/master-data/product/cost-templates/components/CostTemplateSelector.vue'

import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
})

useHead({ title: 'Nuevo BOM' })

const toast = useToast()
const { moduleCollapsed } = useModuleSidebarState()
const { create } = useProducts()

const form = reactive(createDefaultProductForm())
const saving = ref(false)
const step = ref<1 | 2>(1)
const createdProductId = ref<string | null>(null)

// Default a BOM para BOM create (MANUAL se resuelve en precio)
form.cost_source = 'BOM'
form.auto_calculate_cost = true

// Moneda local (no se guarda en el producto, se usa al calcular costos)
const currencyId = ref('')

// Paso 1 → crea el producto y avanza al paso 2
async function handleSave() {
  try {
    saving.value = true
    const payload = toCreateProductPayload(form)
    const created = await create(payload)
    toast.add({ title: 'BOM creado', color: 'success' })
    createdProductId.value = created.id
    step.value = 2
  } catch (err: unknown) {
    let message = 'Error desconocido'
    if (typeof err === 'object' && err !== null && 'data' in err) {
      const data = (err as any).data
      message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || message
    }
    toast.add({ title: 'Error al crear BOM', color: 'error', description: message, icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

// Paso 2 → template asignado, navega a edición
async function handleTemplateAssigned() {
  await navigateTo(`/bom/${createdProductId.value}`)
}

// Paso 2 → saltear asignación de template
async function handleSkipTemplate() {
  await navigateTo(`/bom/${createdProductId.value}`)
}

const stepLabels = [
  { n: 1, label: 'Datos generales' },
  { n: 2, label: 'Template de costos' },
  { n: 3, label: 'Ingeniería y variantes' }
]

const pageUi = computed(() => ({
  root: moduleCollapsed.value ? 'flex flex-col' : 'flex flex-col lg:grid lg:grid-cols-[200px_1fr] lg:gap-2',
  left: 'lg:col-start-1',
  center: moduleCollapsed.value ? '' : 'lg:col-start-2'
}))
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader
      title="Nuevo BOM"
      show-module-toggle
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    >
      <template #right>
        <div class="flex items-center gap-2">
          <UButton label="Cancelar" variant="ghost" color="neutral" @click="navigateTo('/bom')" />
          <template v-if="step === 1">
            <UButton label="Crear y continuar" icon="i-lucide-arrow-right" :loading="saving" @click="handleSave" />
          </template>
          <template v-else>
            <UButton label="Saltar" variant="ghost" color="neutral" @click="handleSkipTemplate" />
          </template>
        </div>
      </template>
    </AppPageHeader>

    <UPage :ui="pageUi">
      <UPageBody>
        <div class="max-w-2xl mx-auto space-y-6 py-6">
          <!-- Indicador de pasos -->
          <div class="flex items-center gap-3 text-sm text-gray-500">
            <template v-for="(s, i) in stepLabels" :key="s.n">
              <div class="flex items-center gap-1.5" :class="{ 'opacity-40': s.n > step }">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
                  :class="s.n <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'"
                >
                  {{ s.n }}
                </span>
                <span :class="{ 'font-medium': s.n === step }">{{ s.label }}</span>
              </div>
              <UIcon v-if="i < stepLabels.length - 1" name="i-lucide-chevron-right" class="h-4 w-4" />
            </template>
          </div>

          <!-- Paso 1: Datos generales -->
          <template v-if="step === 1">
            <UCard>
              <template #header>
                <p class="text-sm font-medium">Información del producto</p>
              </template>
              <GeneralSection :form="form" />
            </UCard>

            <UCard>
              <template #header>
                <p class="text-sm font-medium">Configuración de costos</p>
              </template>
              <ConfigurationCostForm :form="form" :exclude-sources="['MANUAL']" v-model="currencyId" />
            </UCard>

            <UAlert
              icon="i-lucide-info"
              color="neutral"
              variant="soft"
              title="¿Qué viene después?"
              description="Una vez creado el BOM podrás asignar un template de costos, configurar ingeniería, variantes y precios."
            />

            <div class="flex justify-end">
              <UButton
                label="Crear y continuar"
                icon="i-lucide-arrow-right"
                :loading="saving"
                size="lg"
                @click="handleSave"
              />
            </div>
          </template>

          <!-- Paso 2: Asignar template -->
          <template v-else-if="step === 2">
            <UCard>
              <template #header>
                <p class="text-sm font-medium">Asignar template de costos</p>
              </template>
              <CostTemplateSelector
                :product-id="createdProductId!"
                :current-template-id="null"
                @assigned="handleTemplateAssigned"
                @closed="handleSkipTemplate"
              />
            </UCard>
          </template>
        </div>
      </UPageBody>
    </UPage>
  </div>
</template>
