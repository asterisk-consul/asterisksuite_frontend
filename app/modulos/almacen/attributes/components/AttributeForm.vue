<script setup lang="ts">
import * as z from 'zod'

import type { FormSubmitEvent } from '@nuxt/ui'

import {
  AttributeType,
  type CreateAttributeInput
} from '~/modulos/almacen/attributes/types/attributes.types'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    initialValues?: Partial<CreateAttributeInput>
  }>(),
  {
    loading: false,
    initialValues: () => ({
      name: '',
      code: '',
      type: AttributeType.TEXT,
      active: true
    })
  }
)

const emit = defineEmits<{
  submit: [data: CreateAttributeInput]
}>()

const attributeTypes = [
  {
    label: 'Texto',
    value: AttributeType.TEXT
  },
  {
    label: 'Número',
    value: AttributeType.NUMBER
  },
  {
    label: 'Booleano',
    value: AttributeType.BOOLEAN
  }
]

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),

  code: z.string().min(1, 'El código es requerido'),

  type: z.nativeEnum(AttributeType),

  active: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: props.initialValues.name ?? '',
  code: props.initialValues.code ?? '',
  type: props.initialValues.type ?? AttributeType.TEXT,
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
      <UInput v-model="state.name" class="w-full" placeholder="Ej: Color" />
    </UFormField>

    <UFormField label="Código" name="code">
      <UInput v-model="state.code" class="w-full" placeholder="Ej: CL" />
    </UFormField>

    <UFormField label="Tipo" name="type">
      <USelectMenu
        v-model="state.type"
        class="w-full"
        value-key="value"
        :items="attributeTypes"
      />
    </UFormField>

    <UFormField name="active">
      <UCheckbox v-model="state.active" label="Activo" />
    </UFormField>

    <div class="flex justify-end">
      <UButton type="submit" :loading="loading">Guardar</UButton>
    </div>
  </UForm>
</template>
