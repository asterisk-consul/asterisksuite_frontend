<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import { useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { usePartnersStore } from '~/modulos/erp/partners/store/partners.store'
import { mapFormToPartnerDto } from '~/modulos/erp/partners/mapper/partner.mapper'

const router = useRouter()
const store = usePartnersStore()

const saving = ref(false)

const extraTabs = [
  { label: 'Participación', slot: 'partnerData' }
]

const handleSubmit = async (formData: FormType) => {
  try {
    saving.value = true
    const payload = mapFormToPartnerDto(formData)
    await store.create(payload)
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
    <BusinessPartyForm
      :model-value="{ type: 'PARTNER' } as any"
      :loading="saving"
      :extra-tabs="extraTabs"
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
