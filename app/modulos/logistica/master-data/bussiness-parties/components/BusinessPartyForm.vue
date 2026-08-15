<script setup lang="ts">
import { reactive, watch, computed, onMounted, nextTick } from 'vue'
import type { SelectMenuItem } from '@nuxt/ui'

import type { BusinessPartyForm } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'

import { mapBusinessPartyToForm } from '~/modulos/logistica/master-data/bussiness-parties/mapper/mapFormToBusines'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { useLocations } from '~/modulos/logistica/master-data/locations/composables/useLocations'
import LocationModal from '~/modulos/logistica/master-data/locations/components/LocationModal.vue'
import EmployeeLaborData from '~/modulos/erp/employees/components/EmployeeLaborData.vue'

export interface ExtraTab {
  label: string
  slot: string
}

const props = defineProps<{
  modelValue?: BusinessPartyForm
  loading?: boolean
  error?: string | null
  errors?: Record<string, string>
  extraTabs?: ExtraTab[]
  headerTitle?: string
}>()

const emit = defineEmits<{
  submit: [BusinessPartyForm]
  cancel: []
}>()

const form = reactive<BusinessPartyForm & { createUser?: boolean; user_name?: string; user_email?: string; user_password?: string }>({
  id: undefined,
  type: 'CUSTOMER',
  name: '',
  first_name: '',
  last_name: '',
  business_names: '',
  document_type: '',
  vat_condition: '',
  tax_id: '',
  exemption_rate: 0,
  email: '',
  locations: [],
  contacts: [],
  bank_accounts: [],
  active: true,
  position: '',
  department: '',
  hire_date: '',
  salary: '',
  currency_code: 'ARS',
  default_commission_rate: 0,
  share_percentage: '',
  capital_contributed: '',
  createUser: false,
  user_name: '',
  user_email: '',
  user_password: ''
})

// Expose form state to slot content via slot props
// (provide/inject doesn't work parent→child, only ancestor→descendant)

const isPerson = computed(() => form.type === 'EMPLOYEE' || form.type === 'PARTNER')

// Sync name ↔ first_name/last_name for person types
watch(() => form.type, (newType, oldType) => {
  const becamePerson = newType === 'EMPLOYEE' || newType === 'PARTNER'
  const wasPerson = oldType === 'EMPLOYEE' || oldType === 'PARTNER'

  // When switching TO person type, split name into first/last
  if (becamePerson && !wasPerson && form.name && !form.first_name) {
    const parts = form.name.split(' ')
    form.first_name = parts[0] || ''
    form.last_name = parts.slice(1).join(' ')
  }

  // When switching FROM person type, merge first/last into name
  if (!becamePerson && wasPerson && form.first_name) {
    form.name = [form.first_name, form.last_name].filter(Boolean).join(' ')
  }

  // Default document type for person types
  if (becamePerson && !form.document_type) {
    form.document_type = 'DNI'
  }
})

// Merge first_name/last_name into name before submit for person types
const mergePersonName = () => {
  if (isPerson.value && form.first_name) {
    form.name = [form.first_name, form.last_name].filter(Boolean).join(' ')
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return
    if ('locations' in val) {
      Object.assign(form, val)
    } else {
      Object.assign(form, mapBusinessPartyToForm(val))
    }
    // If loading a person type, split name into first/last
    if (isPerson.value && form.name && !form.first_name) {
      const parts = form.name.split(' ')
      form.first_name = parts[0] || ''
      form.last_name = parts.slice(1).join(' ')
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
  { label: 'CUIL', value: 'CUIL' },
  { label: 'LE', value: 'LE' },
  { label: 'LC', value: 'LC' },
  { label: 'Pasaporte', value: 'PASAPORTE' }
]

// ─── Document validation ──────────────────────────────────
const toast = useToast()

const documentPattern: Record<string, { regex: RegExp; length: string; placeholder: string }> = {
  CUIT:      { regex: /^\d{11}$/,  length: '11 dígitos',  placeholder: '20123456789' },
  CUIL:      { regex: /^\d{11}$/,  length: '11 dígitos',  placeholder: '20123456789' },
  DNI:       { regex: /^\d{7,8}$/, length: '7 u 8 dígitos', placeholder: '12345678' },
  LE:        { regex: /^\d{7,8}$/, length: '7 u 8 dígitos', placeholder: '12345678' },
  LC:        { regex: /^\d{7,8}$/, length: '7 u 8 dígitos', placeholder: '12345678' },
  PASAPORTE: { regex: /^[A-Za-z0-9]{5,20}$/, length: '5-20 caracteres', placeholder: 'AB123456' }
}

const docPlaceholder = computed(() => {
  const rule = documentPattern[form.document_type]
  return rule?.placeholder || '20123456789'
})

const docMaxLength = computed(() => {
  const rule = documentPattern[form.document_type]
  if (!rule) return 20
  if (rule.length.includes('11')) return 11
  if (rule.length.includes('8')) return 8
  return 20
})

const isPassport = computed(() => form.document_type === 'PASAPORTE')

function sanitizeDocumentInput(e: Event) {
  if (isPassport.value) return // Allow alphanumeric for passport
  const input = e.target as HTMLInputElement
  input.value = input.value.replace(/\D/g, '')
  form.tax_id = input.value
}

function validateDocument(): boolean {
  if (!form.document_type) {
    toast.add({ title: 'Seleccioná un tipo de documento primero', color: 'warning', icon: 'i-lucide-alert-circle' })
    return false
  }
  if (!form.tax_id) return true // Optional field, skip if empty
  const rule = documentPattern[form.document_type]
  if (!rule) return true
  if (!rule.regex.test(form.tax_id)) {
    toast.add({
      title: `El ${form.document_type} debe tener ${rule.length}`,
      description: `Ejemplo: ${rule.placeholder}`,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return false
  }
  return true
}

const vatConditionOptions: SelectMenuItem[] = [
  { label: 'Responsable Inscripto', value: 'RI' },
  { label: 'Monotributista', value: 'MONO' },
  { label: 'Consumidor Final', value: 'CF' },
  { label: 'Exento', value: 'EX' }
]

// ─── Locations ──────────────────────────────────────────
const locationsStore = useLocationsStore()
const showLocationModal = ref(false)

onMounted(async () => {
  await locationsStore.fetchAll()
})

const { items: locationOptions } = useLocations(computed(() => locationsStore.items))

function onLocationCreated(location: Location) {
  // Esperar a que el store actualice locationOptions antes de crear la entrada
  nextTick(() => {
    form.locations.push({
      location_id: location.id,
      label: [location.address, location.city].filter(Boolean).join(' - ')
    })
  })
}

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
  mergePersonName()
  if (!validateDocument()) return

  // Build submit data with create_user if enabled
  const submitData: any = { ...form }

  if (form.createUser && form.user_name && form.user_email && form.user_password) {
    submitData.create_user = {
      name: form.user_name,
      email: form.user_email,
      password: form.user_password
    }
  }

  // Remove internal UI fields
  delete submitData.createUser
  delete submitData.user_name
  delete submitData.user_email
  delete submitData.user_password

  emit('submit', submitData)
}

const cancel = () => {
  emit('cancel')
}

const baseTabs = [
  { label: 'Impuestos', slot: 'taxes' },
  { label: 'Direcciones', slot: 'locations' },
  { label: 'Contactos', slot: 'contacts' },
  { label: 'Cuentas Bancarias', slot: 'bankAccounts' }
]

// Tabs internos según el tipo seleccionado
const internalExtraTabs = computed(() => {
  if (form.type === 'EMPLOYEE') {
    return [{ label: 'Datos Laborales', slot: 'employeeData' }]
  }
  if (form.type === 'PARTNER') {
    return [{ label: 'Participación', slot: 'partnerData' }]
  }
  return []
})

// Combinar tabs internos + tabs del padre (backward compat)
const allExtraTabs = computed(() => [
  ...internalExtraTabs.value,
  ...(props.extraTabs || [])
])

const tabs = computed(() => {
  const hideTaxes = form.type === 'EMPLOYEE' || form.type === 'PARTNER'
  const filtered = hideTaxes ? baseTabs.filter(t => t.slot !== 'taxes') : baseTabs
  const createUserTab = (form.type === 'EMPLOYEE' || form.type === 'PARTNER')
    ? [{ label: 'Usuario de Acceso', slot: 'createUser' }]
    : []
  return [...filtered, ...allExtraTabs.value, ...createUserTab]
})

const displayTitle = computed(() => {
  if (props.headerTitle) return props.headerTitle
  const typeLabels: Record<string, string> = {
    CUSTOMER: 'Cliente',
    SUPPLIER: 'Proveedor',
    EMPLOYEE: 'Empleado',
    PARTNER: 'Socio',
    TAX_AUTHORITY: 'Ente Impositivo',
    UTILITY: 'Servicio Público',
    FINANCIAL: 'Entidad Financiera',
    SERVICE_PROVIDER: 'Proveedor de Servicios'
  }
  return `Nuevo ${typeLabels[form.type] || 'Registro'}`
})
</script>

<template>
  <UForm :state="form" class="mx-auto space-y-6" @submit="submit">
    <!-- HEADER -->
    <div>
      <h2 class="text-2xl font-semibold">{{ displayTitle }}</h2>
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

          <!-- Person type: Nombre + Apellido -->
          <template v-if="isPerson">
            <UFormField label="Nombre" name="first_name">
              <UInput v-model="form.first_name" class="w-full" />
            </UFormField>

            <UFormField label="Apellido" name="last_name">
              <UInput v-model="form.last_name" class="w-full" />
            </UFormField>
          </template>

          <!-- Company type: Razón Social -->
          <template v-else>
            <UFormField label="Razón Social" name="name" :error="props.errors?.name">
              <UInput v-model="form.name" class="w-full" />
            </UFormField>

            <UFormField label="Nombre Fantasía" name="business_names">
              <UInput v-model="form.business_names" class="w-full" />
            </UFormField>
          </template>

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

          <UFormField label="Número de Documento" name="tax_id">
            <UInput
              v-model="form.tax_id"
              :placeholder="docPlaceholder"
              :maxlength="docMaxLength"
              class="w-full"
              @input="sanitizeDocumentInput"
            />
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
              <div class="flex gap-2">
                <UButton size="sm" icon="i-heroicons-plus" @click="addLocation">
                  Agregar
                </UButton>
                <UButton size="sm" icon="i-lucide-map-pin-plus" variant="outline" @click="showLocationModal = true">
                  Crear nueva
                </UButton>
              </div>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="(l, i) in form.locations"
              :key="i"
              class="flex items-center gap-3"
            >
              <USelectMenu
                v-model="l.location_id"
                :items="locationOptions"
                value-key="value"
                placeholder="Seleccionar ubicación"
                searchable
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
              description="Aggregá una ubicación existente o creá una nueva"
            />
          </div>
        </UCard>

        <LocationModal v-model:open="showLocationModal" @success="onLocationCreated" />
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

      <!-- INTERNAL TABS: Employee -->
      <template v-if="form.type === 'EMPLOYEE'" #employeeData>
        <EmployeeLaborData :form="form" />
      </template>

      <!-- INTERNAL TABS: Partner -->
      <template v-if="form.type === 'PARTNER'" #partnerData>
        <UCard>
          <template #header>
            <h3 class="font-semibold">Participación</h3>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="% Participación" name="share_percentage">
                <UInput v-model="form.share_percentage" placeholder="0.00" type="number" class="w-full" />
              </UFormField>
              <UFormField label="Capital Aportado" name="capital_contributed">
                <UInput v-model="form.capital_contributed" placeholder="0.00" type="number" class="w-full" />
              </UFormField>
            </div>
          </div>
        </UCard>
      </template>

      <!-- CREATE USER (Employee/Partner only) -->
      <template v-if="form.type === 'EMPLOYEE' || form.type === 'PARTNER'" #createUser>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Usuario de Acceso</h3>
              <UToggle v-model="form.createUser" label="Crear usuario" />
            </div>
          </template>
          <div v-if="form.createUser" class="space-y-4">
            <UFormField label="Nombre del usuario" name="user_name">
              <UInput v-model="form.user_name" placeholder="Nombre completo" class="w-full" />
            </UFormField>
            <UFormField label="Email" name="user_email">
              <UInput v-model="form.user_email" placeholder="usuario@empresa.com" type="email" class="w-full" />
            </UFormField>
            <UFormField label="Contraseña" name="user_password">
              <UInput v-model="form.user_password" placeholder="Mínimo 6 caracteres" type="password" class="w-full" />
            </UFormField>
          </div>
          <div v-else class="text-center py-4 text-muted text-sm">
            Activa esta opción para crear un usuario de acceso vinculado a este {{ form.type === 'EMPLOYEE' ? 'empleado' : 'socio' }}
          </div>
        </UCard>
      </template>

      <!-- EXTRA TABS (injected by parent) -->
      <template v-for="tab in extraTabs" #[tab.slot]="slotProps">
        <slot :name="tab.slot" :form="form" v-bind="slotProps" />
      </template>
    </UTabs>

    <!-- ACTIONS -->
    <div class="flex justify-end gap-3">
      <UButton variant="soft" @click="cancel">Cancelar</UButton>
      <UButton type="submit" color="primary">Guardar</UButton>
    </div>
  </UForm>
</template>
