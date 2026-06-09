<script setup lang="ts">
import GeneralSection from '~/modulos/logistica/master-data/product/components/sections/GeneralSection.vue'
import ConfigurationCostForm from '~/modulos/logistica/master-data/product/costing/components/ConfigurationCostForm.vue'

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

// moneda base por defecto
form.cost_currency_id = '839c208c-744d-4321-a375-2a747c911fa2'

async function handleSave() {
  try {
    saving.value = true

    const payload = toCreateProductPayload(form)
    const created = await create(payload)

    toast.add({ title: 'BOM creado', color: 'success' })

    // Una vez creado, ir a la página de edición donde ya tenemos el ID
    await navigateTo(`/bom/${created.id}`)
  } catch (err: unknown) {
    let message = 'Error desconocido'
    if (typeof err === 'object' && err !== null && 'data' in err) {
      const data = (err as any).data
      message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || message
    }
    toast.add({
      title: 'Error al crear BOM',
      color: 'error',
      description: message,
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

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
          <UButton label="Crear y continuar" icon="i-lucide-arrow-right" :loading="saving" @click="handleSave" />
        </div>
      </template>
    </AppPageHeader>

    <UPage :ui="pageUi">
      <UPageBody>
        <div class="max-w-2xl mx-auto space-y-6 py-6">
          <!-- Indicador de pasos -->
          <div class="flex items-center gap-3 text-sm text-gray-500">
            <div class="flex items-center gap-1.5">
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold"
              >
                1
              </span>
              <span class="font-medium text-gray-900">Datos generales</span>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4" />
            <div class="flex items-center gap-1.5 opacity-40">
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 text-xs font-semibold"
              >
                2
              </span>
              <span>Ingeniería, costos y variantes</span>
            </div>
          </div>

          <!-- Formulario general -->
          <UCard>
            <template #header>
              <p class="text-sm font-medium">Información del producto</p>
            </template>
            <GeneralSection :form="form" />
          </UCard>

          <!-- Configuración de costos -->
          <UCard>
            <template #header>
              <p class="text-sm font-medium">Configuración de costos</p>
            </template>
            <ConfigurationCostForm :form="form" />
          </UCard>

          <!-- Aviso -->
          <UAlert
            icon="i-lucide-info"
            color="neutral"
            variant="soft"
            title="¿Qué viene después?"
            description="Una vez creado el BOM podrás configurar ingeniería, variantes, precios y costos."
          />

          <!-- Botón principal -->
          <div class="flex justify-end">
            <UButton
              label="Crear y continuar"
              icon="i-lucide-arrow-right"
              :loading="saving"
              size="lg"
              @click="handleSave"
            />
          </div>
        </div>
      </UPageBody>
    </UPage>
  </div>
</template>
