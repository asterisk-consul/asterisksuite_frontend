<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { storeToRefs } from 'pinia'
import { mapBusinessPartyToForm, mapFormToBusinessPartyDto } from '~/modulos/logistica/master-data/bussiness-parties/mapper/mapFormToBusines'

const route = useRoute()
const router = useRouter()

const store = useBusinessPartiesStore()
const { loading } = storeToRefs(store)

const id = route.params.id as string

const saving = ref(false)
const formData = ref<FormType | null>(null)

onMounted(async () => {
  const data = await store.fetchOne(id)
  formData.value = mapBusinessPartyToForm(data)
})

const handleSubmit = async (form: FormType) => {
  try {
    saving.value = true
    const payload = mapFormToBusinessPartyDto(form)
    await store.update(id, payload)
    await router.push('/erp/sales/customers')
  } catch (error) {
    console.error(error)
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
      @submit="handleSubmit"
    />
  </div>
</template>
