<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import BusinessPartyForm from './BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '../types/bussines-parties.types'
import { useBusinessPartiesStore } from '../bussines-parties.store'
import { mapBusinessPartyToForm, mapFormToBusinessPartyDto } from '../mapper/mapFormToBusines'

const props = defineProps<{
  partyType: 'CUSTOMER' | 'SUPPLIER'
  partyId?: string
}>()

const router = useRouter()
const store = useBusinessPartiesStore()
const { loading } = storeToRefs(store)

const saving = ref(false)
const formData = ref<FormType | null>(null)
const isEditing = computed(() => Boolean(props.partyId))
const partyLabel = computed(() => props.partyType === 'CUSTOMER' ? 'Cliente' : 'Proveedor')
const title = computed(() => `${isEditing.value ? 'Editar' : 'Nuevo'} ${partyLabel.value}`)
const initialForm = computed(() => ({ type: props.partyType }) as FormType)
const basePath = computed(() => props.partyType === 'CUSTOMER' ? '/erp/sales/customers' : '/erp/purchases/suppliers')

onMounted(async () => {
  if (!props.partyId) return
  const party = await store.fetchOne(props.partyId)
  formData.value = mapBusinessPartyToForm(party)
})

async function handleSubmit(form: FormType) {
  if (saving.value) return

  try {
    saving.value = true
    const payload = mapFormToBusinessPartyDto(form)

    if (props.partyId) {
      await store.update(props.partyId, payload)
      await router.push(basePath.value)
      return
    }

    const created = await store.create(payload)
    await router.push(`${basePath.value}/${created.id}/edit?section=taxes&created=1`)
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl p-4">
    <h1 class="mb-4 text-xl font-semibold">{{ title }}</h1>

    <div v-if="isEditing && loading">Cargando...</div>

    <BusinessPartyForm
      v-else-if="!isEditing || formData"
      :model-value="formData ?? initialForm"
      :allowed-types="[partyType]"
      :loading="saving"
      :error="store.error"
      @submit="handleSubmit"
    />
  </div>
</template>
