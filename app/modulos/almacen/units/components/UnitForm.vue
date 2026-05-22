<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

import { UnitType } from '~/modulos/almacen/units/types/units.types'

import { useUnits } from '../composable/useUnits'

const { unitTypes } = useUnits()

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),

  symbol: z.string().min(1, 'El símbolo es requerido'),

  unit_type: z.nativeEnum(UnitType)
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  symbol: '',
  unit_type: UnitType.QUANTITY
})

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({
    title: 'Success',
    description: 'The form has been submitted.',
    color: 'success'
  })

  console.log(event.data)
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <UFormField label="Nombre" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <UFormField label="Símbolo" name="symbol">
      <UInput v-model="state.symbol" />
    </UFormField>

    <UFormField label="Tipo de unidad" name="unit_type">
      <USelectMenu
        v-model="state.unit_type"
        value-key="value"
        :items="unitTypes"
      />
    </UFormField>

    <UButton type="submit">Guardar</UButton>
  </UForm>
</template>
