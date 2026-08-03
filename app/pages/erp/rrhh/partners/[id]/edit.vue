<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { usePartnersStore } from '~/modulos/erp/partners/store/partners.store'
import { mapPartnerToForm, mapFormToPartnerDto } from '~/modulos/erp/partners/mapper/partner.mapper'

const route = useRoute()
const router = useRouter()
const store = usePartnersStore()

const id = route.params.id as string
const saving = ref(false)
const loading = ref(true)
const formData = ref<FormType | null>(null)

const extraTabs = [
  { label: 'Participación', slot: 'partnerData' }
]

onMounted(async () => {
  try {
    const data = await store.fetchOne(id)
    formData.value = mapPartnerToForm(data)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async (form: FormType) => {
  try {
    saving.value = true
    const payload = mapFormToPartnerDto(form)
    await store.update(id, payload)
    await router.push('/erp/rrhh/partners')
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div v-if="loading" class="text-center py-8">Cargando...</div>

    <BusinessPartyForm
      v-else-if="formData"
      :model-value="formData"
      :loading="saving"
      :extra-tabs="extraTabs"
      header-title="Editar Socio"
      @submit="handleSubmit"
    >
      <template #partnerData="{ form }">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Participación</h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="% Participación" name="share_percentage">
                <UInput v-model="form.share_percentage" placeholder="0.00" type="number" class="w-full" />
              </UFormField>

              <UFormField label="Capital Aportado" name="capital_contributed">
                <UInput v-model="form.capital_contributed" placeholder="0.00" type="number" class="w-full" />
              </UFormField>
            </div>
          </div>
        </UCard>
      </template>
    </BusinessPartyForm>
  </div>
</template>
