<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  Tag,
  CreateTagInput
} from '~/modulos/almacen/tags/types/tags.types'

import { useTagsStore } from '~/modulos/almacen/tags/store/tags.store'

import TagForm from './TagForm.vue'

interface Props {
  open: boolean
  tag?: Tag | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()

const tagsStore = useTagsStore()

const loading = ref(false)

const isEdit = computed(() => !!props.tag)

const isOpen = computed({
  get: () => props.open,

  set: (value: boolean) => emit('update:open', value)
})

async function handleSubmit(data: CreateTagInput) {
  try {
    loading.value = true

    if (isEdit.value && props.tag) {
      await tagsStore.update(props.tag.id, data)

      toast.add({
        title: 'Tag actualizado',

        color: 'success'
      })
    } else {
      await tagsStore.create({
        ...data,
        active: true
      })

      toast.add({
        title: 'Tag creado',

        color: 'success'
      })
    }

    isOpen.value = false
  } catch (err: any) {
    console.error(err)

    toast.add({
      title:
        tagsStore.error ||
        err?.data?.message ||
        err?.message ||
        (isEdit.value ? 'Error al actualizar tag' : 'Error al crear tag'),

      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="isEdit ? 'Editar tag' : 'Crear tag'">
    <template #body>
      <div class="p-6">
        <TagForm
          :loading="loading"
          :initial-values="tag ?? undefined"
          @submit="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
