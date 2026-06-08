<script setup lang="ts">
import CategoryForm from '~/modulos/almacen/categories/components/CategoriesForm.vue'

type Mode = 'create' | 'edit'

const open = defineModel<boolean>('open', {
  default: false
})

const form = defineModel<{
  id?: string
  name: string
  parent_id?: string | null
}>('form', {
  default: () => ({
    name: ''
  })
})

const props = defineProps<{
  loading?: boolean
  mode?: Mode
}>()

const emit = defineEmits<{
  submit: []
}>()

const isEdit = computed(() => props.mode === 'edit')

const title = computed(() => {
  if (isEdit.value) return 'Editar categoría'

  return form.value.parent_id ? 'Nueva subcategoría' : 'Nueva categoría'
})

const description = computed(() => {
  if (isEdit.value) {
    return 'Modificá la categoría seleccionada'
  }

  return form.value.parent_id
    ? 'Se creará como subcategoría'
    : 'Se creará como categoría raíz'
})
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <CategoryForm
        v-model="form"
        :loading="loading"
        @submit="emit('submit')"
      />

      <p class="text-sm text-muted mt-4">
        {{ description }}
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />

        <UButton
          :label="isEdit ? 'Guardar cambios' : 'Crear'"
          :loading="loading"
          :disabled="!form.name.trim()"
          @click="emit('submit')"
        />
      </div>
    </template>
  </UModal>
</template>
