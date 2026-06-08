<script lang="ts" setup>
import AttributeList from '~/modulos/almacen/attributes/components/AttributeList.vue'

import AttributeModal from '~/modulos/almacen/attributes/components/AttributeModal.vue'

import { useAttributesStore } from '~/modulos/almacen/attributes/store/attributes.store'

import type { Attribute } from '~/modulos/almacen/attributes/types/attributes.types'

definePageMeta({
  middleware: ['auth']
})

useSeoMeta({
  title: 'Atributos'
})

const toast = useToast()

const attributesStore = useAttributesStore()

const loading = computed(() => attributesStore.loading)

const attributes = computed(() => attributesStore.items)

const openModal = ref(false)

const selectedAttribute = ref<Attribute | null>(null)

const attributeCreate = () => {
  selectedAttribute.value = null

  openModal.value = true
}

const editAttribute = (attribute: Attribute) => {
  selectedAttribute.value = attribute

  openModal.value = true
}

const toggleAttribute = async (attribute: Attribute) => {
  try {
    await attributesStore.update(attribute.id, {
      active: !attribute.active
    })

    toast.add({
      title: attribute.active ? 'Atributo desactivado' : 'Atributo activado',

      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: attributesStore.error || 'Error al actualizar estado',

      color: 'error'
    })
  }
}

onMounted(async () => {
  await attributesStore.fetchAll()
})
</script>

<template>
  <UPageCard
    title="Atributos"
    description="Listado de atributos."
    orientation="horizontal"
    variant="naked"
    class="mb-2 mt-4 w-full lg:max-w-2xl mx-auto"
  >
    <UButton
      icon="i-heroicons-plus"
      label="Nuevo atributo"
      color="neutral"
      class="w-fit lg:ms-auto"
      @click="attributeCreate"
    />
  </UPageCard>

  <UPageCard variant="subtle" class="w-full lg:max-w-2xl mx-auto">
    <AttributeList
      :attributes="attributes"
      :loading="loading"
      @edit="editAttribute"
      @toggle="toggleAttribute"
    />
  </UPageCard>

  <AttributeModal v-model:open="openModal" :attribute="selectedAttribute" />
</template>
