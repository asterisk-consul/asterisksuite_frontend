<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import { useAuthStore } from '~/modulos/auth/auth.store'

const authStore = useAuthStore()
const toast = useToast()

const companyId = computed(() => authStore.selectedCompany?.id ?? '')

interface TaxSettings {
  id: string
  company_id: string
  fiscal_mode: string
  prices_include_tax: boolean
  show_tax_breakdown: boolean
  country: string
}

const settings = ref<TaxSettings | null>(null)
const loading = ref(true)
const saving = ref(false)

const fiscalModeOptions = [
  { label: 'Simples', value: 'SIMPLE', description: 'Sin discriminación de impuestos. Precio final.' },
  { label: 'Completos', value: 'COMPLETE', description: 'Motor fiscal completo: IVA, percepciones, retenciones.' }
]

async function fetchSettings() {
  if (!companyId.value) return

  loading.value = true
  try {
    settings.value = await $fetch<TaxSettings>('/api/erp/tax-engine/company-settings', {
      query: { company_id: companyId.value }
    })
  } catch (e) {
    console.error('Error fetching tax settings:', e)
    toast.add({ title: 'Error al cargar configuración', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!companyId.value || !settings.value) return

  saving.value = true
  try {
    await $fetch('/api/erp/tax-engine/company-settings', {
      method: 'PATCH',
      body: {
        company_id: companyId.value,
        fiscal_mode: settings.value.fiscal_mode,
        prices_include_tax: settings.value.prices_include_tax,
        show_tax_breakdown: settings.value.show_tax_breakdown,
        country: settings.value.country
      }
    })
    toast.add({ title: 'Configuración guardada', color: 'success' })
  } catch (e) {
    console.error('Error saving tax settings:', e)
    toast.add({ title: 'Error al guardar configuración', color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">Configuración Fiscal</h1>

    <div v-if="loading" class="text-center py-8 text-muted">
      Cargando configuración...
    </div>

    <div v-else-if="settings" class="space-y-6">
      <!-- Modo Fiscal -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Modo Fiscal</h2>
        </template>

        <p class="text-sm text-muted mb-4">
          Seleccioná cómo funciona el motor de impuestos en tu empresa.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="mode in fiscalModeOptions"
            :key="mode.value"
            class="border rounded-lg p-4 cursor-pointer transition-all"
            :class="settings.fiscal_mode === mode.value
              ? 'border-primary bg-primary/5'
              : 'border-default hover:border-primary/50'"
            @click="settings.fiscal_mode = mode.value"
          >
            <div class="flex items-center gap-2 mb-2">
              <URadio
                :model-value="settings.fiscal_mode"
                :value="mode.value"
              />
              <span class="font-medium">{{ mode.label }}</span>
            </div>
            <p class="text-sm text-muted">{{ mode.description }}</p>
          </div>
        </div>
      </UCard>

      <!-- Opciones Adicionales -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Opciones</h2>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Precios incluyen impuesto</p>
              <p class="text-sm text-muted">Los precios ingresados ya incluyen IVA</p>
            </div>
            <USwitch v-model="settings.prices_include_tax" />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Mostrar desglose de impuestos</p>
              <p class="text-sm text-muted">Mostrar IVA separado en facturas</p>
            </div>
            <USwitch v-model="settings.show_tax_breakdown" />
          </div>
        </div>
      </UCard>

      <!-- País -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">País</h2>
        </template>

        <USelect
          v-model="settings.country"
          :items="[
            { label: 'Argentina', value: 'AR' },
            { label: 'Uruguay', value: 'UY' },
            { label: 'Paraguay', value: 'PY' },
            { label: 'Chile', value: 'CL' }
          ]"
          class="w-full"
        />
      </UCard>

      <!-- Guardar -->
      <div class="flex justify-end">
        <UButton
          label="Guardar configuración"
          color="primary"
          :loading="saving"
          @click="saveSettings"
        />
      </div>
    </div>
  </div>
</template>
