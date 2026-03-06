<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
//stores
import { useVehiclesStore } from '~/stores/logistica/transport/vehicles.store'
import { useDocumentTypesStore } from '~/stores/logistica/documents/document-types.store'
//form
import { vehicleFormFields } from '~/form/vehicleFormFields'
import ModalForm from '~/components/ModalForm.vue'
//composables
import { useDocuments } from '~/composables/logistica/useDocuments'
//tabla columns
import { columns } from './vehicles.columns'
//page meta
definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const open = ref(false)

const documentStore = useDocumentTypesStore()
const store = useVehiclesStore()

const { items } = storeToRefs(store)
const { items: documentTypes } = storeToRefs(documentStore)

const { vehicleItems } = useDocuments(documentTypes)

// ========================================
// COMPUTED
// ========================================
const fields = computed(() =>
  vehicleFormFields.map((field) => {
    if (
      field.name === 'doc1Type' ||
      field.name === 'doc2Type' ||
      field.name === 'doc3Type' ||
      field.name === 'doc4Type'
    ) {
      return {
        ...field,
        options: vehicleItems.value,
        disabled: vehicleItems.value.length === 0
      }
    }

    return field
  })
)

// ========================================
// HOOKS
// ========================================

onMounted(async () => {
  await store.fetchAll('a060f7ff-0281-4df4-b5b3-cbdf940be31e')
  await documentStore.fetchAll()
  loading.value = store.loading
})

// ========================================
// ACTIONS
// ========================================

function saveDriver(data: any) {
  const payload = mapVehiclePayload(data)
  console.log(payload)
  store.create(payload)
  open.value = false
}
// ========================================
// MAP PAYLOAD
// ========================================
function mapVehiclePayload(form: any) {
  const documents = []

  for (let i = 1; i <= 4; i++) {
    const type = form[`doc${i}Type`]
    const expiration = form[`doc${i}Expiration`]

    if (type) {
      documents.push({
        documentTypeId: type,
        expirationDate: expiration || undefined
      })
    }
  }

  return {
    companyId: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e',
    type: form.type,
    plate: form.plate,
    brand: form.brand,
    model: form.model,
    year: Number(form.year),
    maxWeight: Number(form.maxWeight),
    maxVolume: Number(form.maxVolume),
    refrigeration: form.refrigeration,
    documents
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Vehiculos</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nuevo Vehiculo
      </UButton>
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="fields"
    title="Nuevo Chofer"
    @submit="saveDriver"
  />
</template>
