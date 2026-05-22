<script lang="ts" setup>
import UnitList from '~/modulos/almacen/units/components/UnitsList.vue'
import UnitModal from '~/modulos/almacen/units/components/UnitModal.vue'
definePageMeta({
  middleware: ['auth']
})

useSeoMeta({
  title: 'Unidades de Medida'
})

const openModal = ref(false)
const unitCreate = () => {
  openModal.value = true
}
const editUnit = () => {}
</script>

<template>
  <UPageCard
    title="Unidades de Medida"
    description="Listado de Unidades de medida."
    orientation="horizontal"
    variant="naked"
    class="mb-2 mt-4 w-full lg:max-w-2xl mx-auto"
  >
    <UButton
      icon="i-heroicons-plus"
      label="Nueva Unidad"
      color="neutral"
      class="w-fit lg:ms-auto"
      @click="unitCreate"
    />
  </UPageCard>

  <UPageCard variant="subtle" class="w-full lg:max-w-2xl mx-auto">
    <UnitList />
  </UPageCard>
  <UnitModal v-model:open="openModal" />
</template>
