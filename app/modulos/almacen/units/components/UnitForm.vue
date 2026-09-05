<script setup lang="ts">
import * as z from 'zod'

import type { FormSubmitEvent } from '@nuxt/ui'

import { UnitType } from '~/modulos/almacen/units/types/units.types'

import { useUnits } from '../composable/useUnits'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    initialValues?: Partial<Schema>
  }>(),
  {
    loading: false,
    initialValues: () => ({
      name: '',
      symbol: '',
      unit_type: UnitType.UNIT
    })
  }
)

const emit = defineEmits<{
  submit: [data: Schema]
}>()

const { unitTypes } = useUnits()

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),

  symbol: z.string().min(1, 'El símbolo es requerido'),

  unit_type: z.nativeEnum(UnitType)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: props.initialValues.name ?? '',
  symbol: props.initialValues.symbol ?? '',
  unit_type: props.initialValues.unit_type ?? UnitType.UNIT
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
      <UInput v-model="state.name" class="w-full" />
    </UFormField>

    <UFormField label="Símbolo" name="symbol">
      <UInput v-model="state.symbol" class="w-full" />
    </UFormField>

    <UFormField label="Tipo de unidad" name="unit_type">
      <USelectMenu
        v-model="state.unit_type"
        class="w-full"
        value-key="value"
        :items="unitTypes"
      />
    </UFormField>

    <div class="flex justify-end">
      <UButton type="submit" :loading="loading">Guardar</UButton>
    </div>
  </UForm>
</template>
