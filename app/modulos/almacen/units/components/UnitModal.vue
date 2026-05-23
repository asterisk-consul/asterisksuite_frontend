<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  CreateUnitInput,
  Unit
} from '~/modulos/almacen/units/types/units.types'

import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'

import UnitForm from './UnitForm.vue'

interface Props {
  open: boolean
  unit?: Unit | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()

const unitsStore = useUnitsStore()

const loading = ref(false)

const isEdit = computed(() => !!props.unit)

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

async function handleSubmit(data: CreateUnitInput) {
  try {
    loading.value = true

    if (isEdit.value && props.unit) {
      await unitsStore.update(props.unit.id, data)

      toast.add({
        title: 'Unidad actualizada',
        color: 'success'
      })
    } else {
      await unitsStore.create({
        ...data,
        active: true
      })

      toast.add({
        title: 'Unidad creada',
        color: 'success'
      })
    }

    isOpen.value = false
  } catch (err: any) {
    console.error(err)

    toast.add({
      title:
        unitsStore.error ||
        err?.data?.message ||
        err?.message ||
        (isEdit.value ? 'Error al actualizar unidad' : 'Error al crear unidad'),

      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? 'Editar unidad' : 'Crear unidad'"
  >
    <template #body>
      <div class="p-6">
        <UnitForm
          :loading="loading"
          :initial-values="unit ?? undefined"
          @submit="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
