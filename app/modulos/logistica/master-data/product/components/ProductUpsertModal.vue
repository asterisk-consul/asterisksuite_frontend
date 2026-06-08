<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

import ProductForm from './ProductForm.vue'

type Mode = 'create' | 'edit'

const open = defineModel<boolean>('open', {
  default: false
})

const form = defineModel<CreateProductDto>('form', {
  required: true
})

const props = withDefaults(
  defineProps<{
    mode?: Mode
    loading?: boolean
  }>(),
  {
    mode: 'create',
    loading: false
  }
)

const emit = defineEmits<{
  submit: []
  close: []
}>()

const isEdit = computed(() => props.mode === 'edit')

const title = computed(() =>
  isEdit.value ? 'Editar producto' : 'Nuevo producto'
)

function handleClose() {
  open.value = false
  emit('close')
}

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :ui="{
      content: 'max-w-5xl'
    }"
  >
    <template #body>
      <ProductForm
        v-model="form"
        :loading="loading"
        :mode="mode"
        :show-actions="false"
        @submit="handleSubmit"
      />
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          @click="handleClose"
        />

        <UButton
          :label="isEdit ? 'Guardar cambios' : 'Crear producto'"
          :loading="loading"
          :disabled="!form.name?.trim()"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
