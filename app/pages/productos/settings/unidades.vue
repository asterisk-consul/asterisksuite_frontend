<script lang="ts" setup>
import UnitList from '~/modulos/almacen/units/components/UnitsList.vue'
import UnitModal from '~/modulos/almacen/units/components/UnitModal.vue'

import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'

import type { Unit } from '~/modulos/almacen/units/types/units.types'

definePageMeta({
  middleware: ['auth']
})

useSeoMeta({
  title: 'Unidades de Medida'
})

const toast = useToast()
const unitsStore = useUnitsStore()

const loading = computed(() => unitsStore.loading)
const units = computed(() => unitsStore.items)

const openModal = ref(false)

const selectedUnit = ref<Unit | null>(null)

const unitCreate = () => {
  selectedUnit.value = null
  openModal.value = true
}

const editUnit = (unit: Unit) => {
  selectedUnit.value = unit
  openModal.value = true
}
const toggleUnit = async (unit: Unit) => {
  try {
    await unitsStore.update(unit.id, {
      active: !unit.active
    })

    toast.add({
      title: unit.active ? 'Unidad desactivada' : 'Unidad activada',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Error al actualizar estado',
      color: 'error'
    })
  }
}
onMounted(async () => {
  await unitsStore.fetchAll()
})
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
    <UnitList
      :units="units"
      :loading="loading"
      @edit="editUnit"
      @toggle="toggleUnit"
    />
  </UPageCard>

  <UnitModal v-model:open="openModal" :unit="selectedUnit" />
</template>
