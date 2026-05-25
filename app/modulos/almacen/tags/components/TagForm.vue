<script setup lang="ts">
import * as z from 'zod'

import type { FormSubmitEvent } from '@nuxt/ui'

import type { CreateTagInput } from '~/modulos/almacen/tags/types/tags.types'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    initialValues?: Partial<CreateTagInput>
  }>(),
  {
    loading: false,

    initialValues: () => ({
      name: '',
      active: true
    })
  }
)

const emit = defineEmits<{
  submit: [data: CreateTagInput]
}>()

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),

  active: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: props.initialValues.name ?? '',

  active: props.initialValues.active ?? true
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event.data)
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4 w-full mx-auto"
    @submit="onSubmit"
  >
    <UFormField label="Nombre" name="name">
      <UInput v-model="state.name" class="w-full" placeholder="Ej: Fragil" />
    </UFormField>

    <UFormField name="active">
      <UCheckbox v-model="state.active" label="Activo" />
    </UFormField>

    <div class="flex justify-end">
      <UButton type="submit" :loading="loading">Guardar</UButton>
    </div>
  </UForm>
</template>
