<script setup lang="ts">
definePageMeta({
  layout: 'erp',
  middleware: ['auth']
})

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'

const router = useRouter()
const store = useBusinessPartiesStore()

const saving = ref(false)

const handleSubmit = async (form: FormType) => {
  try {
    saving.value = true
    await store.create(form as any)
    await router.push('/erp/stakeholders')
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 max-w-3xl mx-auto">
    <h1 class="text-xl font-semibold mb-4">Nueva parte interesada</h1>

    <BusinessPartyForm
      :model-value="{} as any"
      @submit="handleSubmit"
    />
  </div>
</template>
