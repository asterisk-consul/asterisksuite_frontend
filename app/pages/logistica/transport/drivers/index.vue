<script setup lang="ts">
import type { CreateDriverInput } from '@/types/logistica/transport/drivers'
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

import { useDocumentTypesStore } from '~/stores/logistica/documents/document-types.store'
import { useChoferesStore } from '@/stores/logistica/transport/choferes.store'
//composable
import { useDocuments } from '~/composables/logistica/useDocuments'
import { useDriverMetrics } from '~/composables/logistica/useDriverMetrics'
//form
import { driverFormFields } from '~/form/driverFormFields'
import ModalForm from '~/components/ModalForm.vue'
//tabla
import { columns } from './columns'

definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const open = ref(false)

const store = useChoferesStore()
const documentStore = useDocumentTypesStore()
const { drivers } = storeToRefs(store)
const { items: documentTypes } = storeToRefs(documentStore)

const { driverItems } = useDocuments(documentTypes)
const metrics = useDriverMetrics(drivers)

onMounted(async () => {
  await store.fetchAll('a060f7ff-0281-4df4-b5b3-cbdf940be31e')
  await documentStore.fetchAll()
  loading.value = store.loading
})

const fields = computed(() =>
  driverFormFields.map((field) => {
    if (
      field.name === 'doc1Type' ||
      field.name === 'doc2Type' ||
      field.name === 'doc3Type' ||
      field.name === 'doc4Type'
    ) {
      return {
        ...field,
        options: driverItems.value,
        disabled: driverItems.value.length === 0
      }
    }

    return field
  })
)

function saveDriver(data: any) {
  const payload: CreateDriverInput = {
    company_id: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e',
    first_name: data.first_name,
    last_name: data.last_name,
    document: data.document,
    phone: data.phone,
    active: data.active,
    documents: buildDriverDocuments(data)
  }

  store.create(payload)
  open.value = false
}
function buildDriverDocuments(form: any) {
  const docs = []

  for (let i = 1; i <= 4; i++) {
    const type = form[`doc${i}Type`]
    const expiration = form[`doc${i}Expiration`]

    if (type) {
      docs.push({
        document_type_id: type,
        expiration_date: expiration || null
      })
    }
  }

  return docs
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Choferes</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nuevo Chofer
      </UButton>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-xs text-gray-500">Total Choferes</p>
          <p class="text-2xl font-bold">{{ metrics.total }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-xs text-gray-500">Activos</p>
          <p class="text-2xl font-bold text-green-600">
            {{ metrics.active }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-xs text-gray-500">Inactivos</p>
          <p class="text-2xl font-bold text-gray-500">
            {{ metrics.inactive }}
          </p>
        </div>
      </UCard>
    </div>
    <LogisticaTable :loading="loading" :data="drivers" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="fields"
    title="Nuevo Chofer"
    @submit="saveDriver"
  />
</template>
