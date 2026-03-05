<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDocumentTypesStore } from '~/stores/logistica/documents/document-types.store'
import { documentTypeFormFields } from '~/form/documentTypeFormFields'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

import ModalForm from '~/components/ModalForm.vue'
import { columns } from './columns'

definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const store = useDocumentTypesStore()
const { items } = storeToRefs(store)

const open = ref(false)

onMounted(async () => {
  await store.fetchAll()
  loading.value = store.loading
})

function saveDriver(data: any) {
  const { id, ...payload } = data
  store.create(payload)
  open.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Docuementos de Transporte</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nuevo Documentos
      </UButton>
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="documentTypeFormFields"
    title="Nuevo Chofer"
    @submit="saveDriver"
  />
</template>
