<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePartnersStore } from '~/modulos/erp/partners/store/partners.store'
import type { UpdatePartnerInput } from '~/modulos/erp/partners/types/partners.types'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()

const store = usePartnersStore()
const { loading } = storeToRefs(store)

const id = route.params.id as string

const saving = ref(false)
const form = ref<UpdatePartnerInput | null>(null)

const documentTypeOptions = [
  { label: 'DNI', value: 'DNI' },
  { label: 'CUIT', value: 'CUIT' },
  { label: 'LE', value: 'LE' },
  { label: 'LC', value: 'LC' },
  { label: 'Pasaporte', value: 'PASAPORTE' }
]

onMounted(async () => {
  const data = await store.fetchOne(id)
  form.value = {
    first_name: data.first_name,
    last_name: data.last_name,
    document_type: data.document_type ?? '',
    document_number: data.document_number ?? '',
    share_percentage: data.share_percentage ?? '',
    capital_contributed: data.capital_contributed ?? '',
    is_active: data.is_active
  }
})

const handleSubmit = async () => {
  if (!form.value) return
  try {
    saving.value = true
    await store.update(id, form.value)
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
    <h1 class="text-xl font-semibold mb-4">Editar Socio</h1>

    <div v-if="loading">Cargando...</div>

    <UCard v-else-if="form">
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

        <UFormField label="Estado">
          <USwitch v-model="form.is_active" label="Activo" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="router.back()">Cancelar</UButton>
          <UButton type="submit" :loading="saving">Guardar</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
