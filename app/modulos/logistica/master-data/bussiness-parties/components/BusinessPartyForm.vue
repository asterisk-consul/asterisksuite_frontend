<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SelectMenuItem } from '@nuxt/ui'

import type { BusinessPartyForm } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

import { mapBusinessPartyToForm } from '~/modulos/logistica/master-data/bussiness-parties/mapper/mapFormToBusines'

const props = defineProps<{
  modelValue?: BusinessPartyForm
  loading?: boolean
  error?: string | null
  errors?: Record<string, string>
}>()

const emit = defineEmits<{
  submit: [BusinessPartyForm]
  cancel: []
}>()

const form = reactive<BusinessPartyForm>({
  id: undefined,

  type: 'client',

  name: '',
  business_names: '',

  document_type: '',
  document_number: '',

  address: '',

  vat_condition: '',

  alias: '',

  tax_id: '',

  exemption_rate: 0,

  email: '',

  cbu: '',

  locations: [],

  contacts: [],

  active: true
})

/*
name: string
businness_names?: string
document_type?: string
document_number?: string
address?: string
tax_id?: string
vat_condition: string
exemption_rate: number
email?: string
alias: string
cbu: string
*/

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return

    // 🔥 detectar si ya es form
    if ('locations' in val) {
      Object.assign(form, val)
    } else {
      Object.assign(form, mapBusinessPartyToForm(val))
    }
  },
  { immediate: true }
)

const typeOptions: SelectMenuItem[] = [
  { label: 'Cliente', value: 'client' },
  { label: 'Proveedor', value: 'supplier' }
]

const documentTypeOptions: SelectMenuItem[] = [
  { label: 'CUIT', value: 'CUIT' },
  { label: 'DNI', value: 'DNI' },
  { label: 'CUIL', value: 'CUIL' }
]

const vatConditionOptions: SelectMenuItem[] = [
  { label: 'Responsable Inscripto', value: 'RI' },
  { label: 'Monotributista', value: 'MONO' },
  { label: 'Consumidor Final', value: 'CF' },
  { label: 'Exento', value: 'EX' }
]

// 🔥 helpers dinámicos
const addLocation = () => {
  form.locations.push({
    location_id: '',
    label: ''
  })
}

const removeLocation = (i: number) => {
  form.locations.splice(i, 1)
}

const addContact = () => {
  form.contacts.push({
    first_name: '',
    last_name: '',
    role: '',
    phone: '',
    email: ''
  })
}

const removeContact = (i: number) => {
  form.contacts.splice(i, 1)
}

const submit = () => {
  emit('submit', { ...form })
}

const cancel = () => {
  emit('cancel')
}

const tabs = [
  {
    label: 'Direcciones',
    slot: 'locations'
  },
  {
    label: 'Contactos',
    slot: 'contacts'
  }
]
</script>

<template>
  <UForm :state="form" class="mx-auto space-y-6" @submit="submit">
    <!-- HEADER -->
    <div>
      <h2 class="text-2xl font-semibold">Nueva Empresa</h2>

      <p class="text-sm text-gray-500">Completá la información</p>
      <UAlert
        v-if="props.error"
        class="rounded-none"
        color="error"
        variant="soft"
        :title="props.error"
      />
    </div>

    <!-- DATOS BASICOS -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">Datos básicos</h3>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <!-- TIPO -->
          <UFormField label="Tipo" name="type">
            <USelectMenu
              v-model="form.type"
              :items="typeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- RAZON SOCIAL -->
          <UFormField
            label="Razón Social"
            name="name"
            :error="props.errors?.name"
          >
            <UInput v-model="form.name" class="w-full" />
          </UFormField> 

          <!-- NOMBRE FANTASIA -->
          <UFormField label="Nombre Fantasía" name="business_names">
            <UInput v-model="form.business_names" class="w-full" />
          </UFormField>

          <!-- EMAIL -->
          <UFormField label="Email" name="email">
            <UInput v-model="form.email" type="email" class="w-full" />
          </UFormField>

          <!-- TIPO DOCUMENTO -->
          <UFormField label="Tipo Documento" name="document_type">
            <USelectMenu
              v-model="form.document_type"
              :items="documentTypeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- NUMERO DOCUMENTO -->
          <UFormField label="Número Documento" name="document_number">
            <UInput v-model="form.document_number" class="w-full" />
          </UFormField>

          <!-- CUIT -->
          <UFormField label="CUIT" name="tax_id" :error="props.errors?.tax_id">
            <UInput v-model="form.tax_id" class="w-full" />
          </UFormField>

          <!-- IVA -->
          <UFormField label="Condición IVA" name="vat_condition">
            <USelectMenu
              v-model="form.vat_condition"
              :items="vatConditionOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- ALIAS -->
          <UFormField label="Alias" name="alias">
            <UInput v-model="form.alias" class="w-full" />
          </UFormField>

          <!-- CBU -->
          <UFormField label="CBU" name="cbu">
            <UInput v-model="form.cbu" class="w-full" />
          </UFormField>

          <!-- EXENCION -->
          <UFormField label="Porcentaje Exención" name="exemption_rate">
            <UInput
              v-model="form.exemption_rate"
              type="number"
              class="w-full"
            />
          </UFormField>

          <!-- ACTIVO -->
          <UFormField label="Activo" name="active">
            <USwitch v-model="form.active" />
          </UFormField>
        </div>

        <!-- DIRECCION -->
        <UFormField label="Dirección" name="address">
          <UTextarea v-model="form.address" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <!-- TABS -->
    <UTabs :items="tabs" variant="link" class="w-full">
      <!-- LOCATIONS -->
      <template #locations>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Direcciones</h3>

              <UButton size="sm" icon="i-heroicons-plus" @click="addLocation">
                Agregar
              </UButton>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="(l, i) in form.locations"
              :key="i"
              class="flex items-center gap-3"
            >
              <UInput
                v-model="l.location_id"
                placeholder="ID ubicación"
                class="flex-1"
              />

              <UInput v-model="l.label" placeholder="Etiqueta" class="flex-1" />

              <UButton
                icon="i-heroicons-trash"
                color="error"
                variant="soft"
                @click="removeLocation(i)"
              />
            </div>

            <UAlert
              v-if="!form.locations.length"
              color="neutral"
              variant="soft"
              title="Sin direcciones"
            />
          </div>
        </UCard>
      </template>

      <!-- CONTACTS -->
      <template #contacts>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Contactos</h3>

              <UButton size="sm" icon="i-heroicons-plus" @click="addContact">
                Agregar
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div
              v-for="(c, i) in form.contacts"
              :key="i"
              class="space-y-3 rounded-lg border p-4"
            >
              <div class="grid grid-cols-2 gap-3">
                <UInput v-model="c.first_name" placeholder="Nombre" />

                <UInput v-model="c.last_name" placeholder="Apellido" />
              </div>

              <div class="grid grid-cols-3 gap-3">
                <UInput v-model="c.role" placeholder="Cargo" />

                <UInput v-model="c.phone" placeholder="Teléfono" />

                <UInput v-model="c.email" placeholder="Email" />
              </div>

              <div class="flex justify-end">
                <UButton
                  size="xs"
                  color="error"
                  variant="soft"
                  icon="i-heroicons-trash"
                  @click="removeContact(i)"
                >
                  Eliminar
                </UButton>
              </div>
            </div>

            <UAlert
              v-if="!form.contacts.length"
              color="neutral"
              variant="soft"
              title="Sin contactos"
            />
          </div>
        </UCard>
      </template>
    </UTabs>

    <!-- ACTIONS -->
    <div class="flex justify-end gap-3">
      <UButton variant="soft" @click="cancel">Cancelar</UButton>

      <UButton type="submit" color="primary">Guardar</UButton>
    </div>
  </UForm>
</template>
