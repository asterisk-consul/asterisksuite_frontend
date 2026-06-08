<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth'] })

import { useBusinessPartiesByType } from '~/modulos/logistica/master-data/bussiness-parties/composable/useBusinessPartiesByType'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'

const route = useRoute()
const id = route.params.id as string

const { loading, error, errors, fetchOne, handleUpdate } =
  useBusinessPartiesByType('supplier', '/erp/purchases/suppliers')

const saving = ref(false)
const formData = ref(null)

onMounted(async () => {
  formData.value = await fetchOne(id)
})

const onSubmit = async (form) => {
  try {
    saving.value = true
    await handleUpdate(id, form)
  } catch (err) {
    console.error(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 max-w-3xl mx-auto">
    <h1 class="text-xl font-semibold mb-4">Editar Cliente</h1>
    <div v-if="loading">Cargando...</div>
    <BusinessPartyForm
      v-else-if="formData"
      :model-value="formData"
      :loading="saving"
      :error="error"
      :errors="errors"
      lock-type
      @submit="onSubmit"
    />
  </div>
</template>
