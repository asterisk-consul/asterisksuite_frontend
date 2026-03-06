<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

//stores
import { useTransferRatesStore } from '~/stores/logistica/transfer-rates/transfer-rates.store'
//form
import { transferRatesFormFields } from '~/form/transfer-rates.form'
import ModalForm from '~/components/ModalForm.vue'
import { columns } from './columns'
//page meta
definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const open = ref(false)

const store = useTransferRatesStore()
const { items } = storeToRefs(store)

onMounted(async () => {
  const companyId = 'a060f7ff-0281-4df4-b5b3-cbdf940be31e'
  await store.fetchAll(companyId)
  loading.value = store.loading
})

function saveDriver(data: any) {
  const payload = {
    company_id: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e', // override final
    name: data.name,
    rate_type: data.rate_type,
    description: data.description
  }

  store.create(payload)
  open.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Tarifas de Transporte</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nueva Tarifa
      </UButton>
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="transferRatesFormFields"
    title="Nueva Tarifa"
    @submit="saveDriver"
  />
</template>
