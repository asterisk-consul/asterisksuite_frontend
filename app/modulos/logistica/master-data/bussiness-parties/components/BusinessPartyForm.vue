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
  type: 'CUSTOMER',
  name: '',
  business_names: '',
  document_type: '',
  vat_condition: '',
  tax_id: '',
  exemption_rate: 0,
  email: '',
  locations: [],
  contacts: [],
  bank_accounts: [],
  active: true
})

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return
    if ('locations' in val) {
      Object.assign(form, val)
    } else {
      Object.assign(form, mapBusinessPartyToForm(val))
    }
  },
  { immediate: true }
)

const typeOptions: SelectMenuItem[] = [
  { label: 'Cliente', value: 'CUSTOMER' },
  { label: 'Proveedor', value: 'SUPPLIER' },
  { label: 'Empleado', value: 'EMPLOYEE' },
  { label: 'Socio', value: 'PARTNER' },
  { label: 'Ente Impositivo', value: 'TAX_AUTHORITY' },
  { label: 'Servicio Público', value: 'UTILITY' },
  { label: 'Entidad Financiera', value: 'FINANCIAL' },
  { label: 'Proveedor de Servicios', value: 'SERVICE_PROVIDER' }
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

const addLocation = () => {
  form.locations.push({ location_id: '', label: '' })
}

const removeLocation = (i: number) => {
  form.locations.splice(i, 1)
}

const addContact = () => {
  form.contacts.push({ first_name: '', last_name: '', role: '', phone: '', email: '' })
}

const removeContact = (i: number) => {
  form.contacts.splice(i, 1)
}

const addBankAccount = () => {
  form.bank_accounts.push({
    cbu: '', alias: '', bank_name: '', account_type: '',
    currency: '', description: '', holder_name: '', is_default: false
  })
}

const removeBankAccount = (i: number) => {
  form.bank_accounts.splice(i, 1)
}

const submit = () => {
  emit('submit', { ...form })
}

const cancel = () => {
  emit('cancel')
}

const tabs = [
  { label: 'Impuestos', slot: 'taxes' },
  { label: 'Direcciones', slot: 'locations' },
  { label: 'Contactos', slot: 'contacts' },
  { label: 'Cuentas Bancarias', slot: 'bankAccounts' }
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
          <UFormField label="Tipo" name="type">
            <USelectMenu
              v-model="form.type"
              :items="typeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Razón Social" name="name" :error="props.errors?.name">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>

          <UFormField label="Nombre Fantasía" name="business_names">
            <UInput v-model="form.business_names" class="w-full" />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput v-model="form.email" type="email" class="w-full" />
          </UFormField>

          <UFormField label="Tipo Documento" name="document_type">
            <USelectMenu
              v-model="form.document_type"
              :items="documentTypeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="CUIT" name="tax_id" :error="props.errors?.tax_id">
            <UInput v-model="form.tax_id" class="w-full" />
          </UFormField>

          <UFormField label="Activo" name="active">
            <USwitch v-model="form.active" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- TABS -->
    <UTabs :items="tabs" variant="link" class="w-full">
      <!-- TAXES -->
      <template #taxes>
        <UCard>
          <template #header>
            <h3 class="font-semibold">Impuestos</h3>
          </template>

          <div class="space-y-4">
            <UAlert
              color="info"
              variant="soft"
              title="La jurisdicción de IIBB se obtiene de las direcciones vinculadas"
              description="La provincia para Ingresos Brutos se toma automáticamente de la ubicación asociada a esta parte interesada."
            />

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Condición IVA" name="vat_condition">
                <USelectMenu
                  v-model="form.vat_condition"
                  :items="vatConditionOptions"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Porcentaje Exención" name="exemption_rate">
                <UInput
                  v-model="form.exemption_rate"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UCard>
      </template>

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

      <!-- BANK ACCOUNTS -->
      <template #bankAccounts>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Cuentas Bancarias</h3>
              <UButton size="sm" icon="i-heroicons-plus" @click="addBankAccount">
                Agregar
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div
              v-for="(b, i) in form.bank_accounts"
              :key="i"
              class="space-y-3 rounded-lg border p-4"
            >
              <div class="grid grid-cols-2 gap-3">
                <UInput v-model="b.cbu" placeholder="CBU" />
                <UInput v-model="b.alias" placeholder="Alias" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <UInput v-model="b.bank_name" placeholder="Banco" />
                <USelectMenu
                  v-model="b.account_type"
                  :items="[
                    { label: 'Cuenta Corriente', value: 'CUENTA_CORRIENTE' },
                    { label: 'Caja de Ahorro', value: 'CAJA_AHORRO' }
                  ]"
                  value-key="value"
                  placeholder="Tipo de cuenta"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <USelectMenu
                  v-model="b.currency"
                  :items="[
                    { label: 'Pesos (ARS)', value: 'ARS' },
                    { label: 'Dólares (USD)', value: 'USD' }
                  ]"
                  value-key="value"
                  placeholder="Moneda"
                />
                <UInput v-model="b.holder_name" placeholder="Nombre titular" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <UInput v-model="b.description" placeholder="Descripción" />
                <UCheckbox v-model="b.is_default" label="Cuenta principal" />
              </div>
              <div class="flex justify-end">
                <UButton
                  size="xs"
                  color="error"
                  variant="soft"
                  icon="i-heroicons-trash"
                  @click="removeBankAccount(i)"
                >
                  Eliminar
                </UButton>
              </div>
            </div>

            <UAlert
              v-if="!form.bank_accounts.length"
              color="neutral"
              variant="soft"
              title="Sin cuentas bancarias"
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
