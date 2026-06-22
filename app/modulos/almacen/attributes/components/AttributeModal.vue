<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  Attribute,
  CreateAttributeInput
} from '~/modulos/almacen/attributes/types/attributes.types'

import { useAttributesStore } from '~/modulos/almacen/attributes/store/attributes.store'

import AttributeForm from './AttributeForm.vue'

interface Props {
  open: boolean
  attribute?: Attribute | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()

const attributesStore = useAttributesStore()

const loading = ref(false)

const isEdit = computed(() => !!props.attribute)

const isOpen = computed({
  get: () => props.open,

  set: (value: boolean) => emit('update:open', value)
})

async function handleSubmit(data: CreateAttributeInput) {
  try {
    loading.value = true

    if (isEdit.value && props.attribute) {
      await attributesStore.update(props.attribute.id, data)

      toast.add({
        title: 'Atributo actualizado',
        color: 'success'
      })
    } else {
      await attributesStore.create({
        ...data,
        active: true
      })

      toast.add({
        title: 'Atributo creado',
        color: 'success'
      })
    }

    isOpen.value = false
  } catch (err: any) {
    console.error(err)

    toast.add({
      title:
        attributesStore.error ||
        err?.data?.message ||
        err?.message ||
        (isEdit.value
          ? 'Error al actualizar atributo'
          : 'Error al crear atributo'),

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
    :title="isEdit ? 'Editar atributo' : 'Crear atributo'"
  >
    <template #body>
      <div class="p-6">
        <AttributeForm
          :loading="loading"
          :initial-values="attribute ?? undefined"
          @submit="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
