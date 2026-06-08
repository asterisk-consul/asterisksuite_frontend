<script setup lang="ts">
definePageMeta({ layout: 'erp', middleware: ['auth'] })

import { useBusinessPartiesByType } from '~/modulos/logistica/master-data/bussiness-parties/composable/useBusinessPartiesByType'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'

const { initialForm, loading, error, errors, handleCreate } =
  useBusinessPartiesByType('supplier', '/erp/purchases/suppliers')

const saving = ref(false)

const onSubmit = async (form) => {
  try {
    saving.value = true
    await handleCreate(form)
  } catch {
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 max-w-3xl mx-auto">
    <h1 class="text-xl font-semibold mb-4">Nuevo Cliente</h1>
    <BusinessPartyForm
      :model-value="initialForm"
      :loading="saving"
      :error="error"
      :errors="errors"
      lock-type
      @submit="onSubmit"
    />
  </div>
</template>
