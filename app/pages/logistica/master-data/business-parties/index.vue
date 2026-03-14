<script setup lang="ts">
definePageMeta({
  layout: 'logistica',
  middleware: ['auth']
})
import { useBusinessPartiesStore } from '@/stores/logistica/meta-data/bussines-parties.store'
import { businessPartyFormFields } from '~/form/businessPartyFormFields'
import { columns } from './columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const store = useBusinessPartiesStore()

const { items } = storeToRefs(store)
const open = ref(false)
const loading = ref(true)

onMounted(async () => {
  await store.fetchAll('c07cff19-1412-4d12-8ee0-089d2ccac729')
  console.log(store.items)
  loading.value = store.loading
})

const saveLocation = async (data: any) => {
  console.log(data)
  const payload = {
    company_id: 'a12364b6-c47b-4baa-b4a1-4188b8003433',
    type: data.type,
    name: data.name,
    tax_id: data.tax_id,
    phone: String(data.phone),
    email: data.email,
    active: true
  }
  console.log(payload)
  await store.create(payload)
  open.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Partes Interesadas</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Crear Parte Interesada
      </UButton>
    </div>

    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="businessPartyFormFields"
    title="Nueva Locacion"
    @submit="saveLocation"
  />
</template>
