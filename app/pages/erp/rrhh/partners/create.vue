<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { usePartnersStore } from '~/modulos/erp/partners/store/partners.store'
import { mapFormToPartnerDto } from '~/modulos/erp/partners/mapper/partner.mapper'

const router = useRouter()
const store = usePartnersStore()

const saving = ref(false)

// Check for pending user data from settings redirect
const pendingUser = ref<{ name: string; email: string; password: string } | null>(null)

onMounted(() => {
  const stored = localStorage.getItem('pendingUser')
  if (stored) {
    try {
      pendingUser.value = JSON.parse(stored)
      localStorage.removeItem('pendingUser')
    } catch {
      localStorage.removeItem('pendingUser')
    }
  }
})

const initialForm = computed(() => {
  const base: any = { type: 'PARTNER' }

  if (pendingUser.value) {
    const nameParts = pendingUser.value.name.split(' ')
    base.first_name = nameParts[0] || ''
    base.last_name = nameParts.slice(1).join(' ') || ''
    base.createUser = true
    base.user_name = pendingUser.value.name
    base.user_email = pendingUser.value.email
    base.user_password = pendingUser.value.password
  }

  return base
})

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
      :model-value="initialForm"
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
