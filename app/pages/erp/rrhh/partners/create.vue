<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import { useRouter } from 'vue-router'
import { usePartnersStore } from '~/modulos/erp/partners/store/partners.store'
import type { CreatePartnerInput } from '~/modulos/erp/partners/types/partners.types'

const router = useRouter()
const store = usePartnersStore()

const saving = ref(false)

const form = reactive<CreatePartnerInput>({
  first_name: '',
  last_name: '',
  document_type: '',
  document_number: '',
  share_percentage: '',
  capital_contributed: '',
  is_active: true
})

const documentTypeOptions = [
  { label: 'DNI', value: 'DNI' },
  { label: 'CUIT', value: 'CUIT' },
  { label: 'LE', value: 'LE' },
  { label: 'LC', value: 'LC' },
  { label: 'Pasaporte', value: 'PASAPORTE' }
]

const handleSubmit = async () => {
  try {
    saving.value = true
    await store.create(form)
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
    <h1 class="text-xl font-semibold mb-4">Nuevo Socio</h1>

    <UCard>
      <UForm :state="form" class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Nombre" required>
            <UInput v-model="form.first_name" placeholder="Nombre" />
          </UFormField>

          <UFormField label="Apellido" required>
            <UInput v-model="form.last_name" placeholder="Apellido" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Tipo Documento">
            <USelect v-model="form.document_type" :items="documentTypeOptions" placeholder="Seleccionar" />
          </UFormField>

          <UFormField label="Número Documento">
            <UInput v-model="form.document_number" placeholder="Número" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="% Participación">
            <UInput v-model="form.share_percentage" placeholder="0.00" type="number" />
          </UFormField>

          <UFormField label="Capital Aportado">
            <UInput v-model="form.capital_contributed" placeholder="0.00" type="number" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="router.back()">Cancelar</UButton>
          <UButton type="submit" :loading="saving">Guardar</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
