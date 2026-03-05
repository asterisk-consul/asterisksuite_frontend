<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

//stores
import { useDepositosStore } from '@/stores/logistica/warehouse/depositos.store'
import { useLocationsStore } from '~/stores/logistica/meta-data/locations.store'
//form
import { warehouseFormFields } from '~/form/warehouseFormFields'
import ModalForm from '~/components/ModalForm.vue'
//composables
import { useLocations } from '~/composables/logistica/useLocations'
//types
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput
} from '~/types/logistica/warehouses/warehouse'
//columns
import { columns } from './columns'
//pages
definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const store = useDepositosStore()
const locationsStore = useLocationsStore()
const { warehouses } = storeToRefs(store)
const { items: locations } = storeToRefs(locationsStore)

const { items } = useLocations(locations)

const fields = computed(() =>
  warehouseFormFields.map((field) => {
    if (field.name === 'locationId') {
      return {
        ...field,
        options: items.value,
        disabled: items.value.length === 0
      }
    }

    return field
  })
)

const open = ref(false)

onMounted(async () => {
  await store.fetchAll()
  if (locations.value.length === 0) await locationsStore.fetchAll()
  loading.value = store.loading
})

function saveDriver(data: any) {
  const payload: CreateWarehouseInput = {
    companyId: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e',
    name: data.name,
    locationId: data.locationId,
    code: data.code,
    active: true
  }
  store.createWarehouse(payload)
  open.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Depositos</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nuevo Deposito
      </UButton>
    </div>
    <LogisticaTable :loading="loading" :data="warehouses" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="fields"
    title="Nuevo Deposito"
    @submit="saveDriver"
  />
</template>
