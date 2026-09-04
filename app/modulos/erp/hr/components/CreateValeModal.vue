<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  success: []
}>()

const hrStore = useHrStore()
const toast = useToast()
const saving = ref(false)
const confirmAutomatically = ref(true)
const alertDismissed = ref(false)

const createForm = ref({
  party_id: '',
  party_type: 'EMPLOYEE',
  type: 'SUELDO',
  amount: 0,
  currency_code: 'ARS',
  exchange_rate: null as number | null,
  date: today(),
  description: ''
})

const people = ref<Array<{ id: string; name: string; type: string }>>([])

const partyTypeOptions = [
  { label: 'Empleado', value: 'EMPLOYEE' },
  { label: 'Socio', value: 'PARTNER' }
]

const valeTypeOptions: Record<string, { label: string; value: string; icon: string; description: string }[]> = {
  EMPLOYEE: [
    { label: 'Sueldo', value: 'SUELDO', icon: 'i-lucide-banknote', description: 'Pago de sueldo regular' },
    { label: 'Adelanto', value: 'ADELANTO', icon: 'i-lucide-hand-coins', description: 'Adelanto de sueldo' },
    { label: 'Extras', value: 'EXTRAS', icon: 'i-lucide-gift', description: 'Bonuses, horas extras, comisiones' }
  ],
  PARTNER: [
    { label: 'Retiro', value: 'RETIRO', icon: 'i-lucide-arrow-up-right', description: 'El socio retira dinero' },
    { label: 'Aporte', value: 'APORTE', icon: 'i-lucide-arrow-down-left', description: 'Aporte de capital del socio' },
    { label: 'Reembolso', value: 'REEMBOLSO', icon: 'i-lucide-receipt', description: 'Reembolso de gastos' },
    { label: 'Préstamo', value: 'PRESTAMO', icon: 'i-lucide-hand-coins', description: 'Préstamo de la empresa' }
  ]
}

const currencyOptions = [
  { label: 'Peso Argentino (ARS)', value: 'ARS' },
  { label: 'Dólar (USD)', value: 'USD' }
]

const availableTypeOptions = computed(() =>
  valeTypeOptions[createForm.value.party_type] || []
)

const filteredPeople = computed(() =>
  people.value
    .filter(p => p.type === createForm.value.party_type)
    .map(p => ({ label: p.name, value: p.id }))
)

const alertTitle = computed(() =>
  confirmAutomatically.value
    ? 'El vale se creará y confirmará automáticamente'
    : 'El vale se creará como borrador'
)

const alertDescription = computed(() =>
  confirmAutomatically.value
    ? 'Una vez confirmado, generará un documento VALE y impactará la cuenta corriente. Aparecerá en documentos pendientes de pago.'
    : 'Podés confirmarlo después desde la lista de vales.'
)

// ═══════════════════════════════════════════
// TIPO DE CAMBIO
// ═══════════════════════════════════════════

const convertedAmount = computed(() => {
  if (!createForm.value.exchange_rate || createForm.value.amount <= 0) return null
  return createForm.value.amount * createForm.value.exchange_rate
})

const inverseConvertedAmount = computed(() => {
  if (!createForm.value.exchange_rate || createForm.value.amount <= 0 || createForm.value.exchange_rate === 0) return null
  return createForm.value.amount / createForm.value.exchange_rate
})

const convertedCurrencyLabel = computed(() =>
  createForm.value.currency_code === 'USD' ? 'ARS' : 'USD'
)

const convertedPreviewText = computed(() => {
  if (!convertedAmount.value) return null
  const fromCurrency = createForm.value.currency_code
  const toCurrency = convertedCurrencyLabel.value
  const fromFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: fromCurrency, maximumFractionDigits: 2 }).format(createForm.value.amount)
  const toFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: toCurrency, maximumFractionDigits: 2 }).format(convertedAmount.value)
  return `${fromFmt} ≈ ${toFmt}`
})

async function loadPeople() {
  try {
    const [employees, partners] = await Promise.all([
      $fetch<any[]>('/api/erp/employees'),
      $fetch<any[]>('/api/erp/partners')
    ])
    people.value = [
      ...employees.map((e: any) => ({
        id: e.party_id ?? e.id,
        name: `${e.first_name} ${e.last_name}`,
        type: 'EMPLOYEE'
      })),
      ...partners.map((p: any) => ({
        id: p.party_id ?? p.id,
        name: `${p.first_name} ${p.last_name}`,
        type: 'PARTNER'
      }))
    ]
  } catch (e) {
    console.error(e)
  }
}

function resetForm() {
  createForm.value = {
    party_id: '',
    party_type: 'EMPLOYEE',
    type: 'SUELDO',
    amount: 0,
    currency_code: 'ARS',
    exchange_rate: null,
    date: today(),
    description: ''
  }
}

async function handleCreate() {
  try {
    saving.value = true
    const vale = await hrStore.createVale({
      ...createForm.value,
      rate_type: 'OFFICIAL',
      converted_amount: convertedAmount.value ?? createForm.value.amount,
    })
    if (confirmAutomatically.value) {
      await hrStore.confirmVale(vale.id)
      toast.add({ title: 'Vale creado y confirmado', color: 'success' })
    } else {
      toast.add({ title: 'Vale creado como borrador', color: 'success' })
    }
    open.value = false
    resetForm()
    emit('success')
  } catch (e: any) {
    toast.add({
      title: 'Error al crear vale',
      description: e?.data?.message || e?.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val && people.value.length === 0) {
    loadPeople()
  }
  if (!val) {
    resetForm()
    alertDismissed.value = false
    confirmAutomatically.value = true
  }
})
</script>

<template>
  <UModal v-model:open="open" title="Nuevo vale" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <UAlert
        v-if="!alertDismissed"
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="alertTitle"
        :description="alertDescription"
        close
        class="mb-4"
        @update:open="alertDismissed = true"
      />

      <div class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <USwitch
          v-model="confirmAutomatically"
          label="Confirmar automáticamente"
          description="Si está activado, el vale se confirmará al crearlo."
        />
      </div>

      <!-- Tipo de persona -->
      <UFormField label="Tipo de persona" required>
          <div class="flex gap-2">
            <button
              v-for="pt in partyTypeOptions"
              :key="pt.value"
              type="button"
              class="flex-1 px-4 py-3 rounded-lg border-2 text-center transition-colors"
              :class="createForm.party_type === pt.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                : 'border-default hover:border-accented'"
              @click="createForm.party_type = pt.value; createForm.party_id = ''; createForm.type = availableTypeOptions[0]?.value ?? 'SUELDO'"
            >
              <UIcon
                :name="pt.value === 'EMPLOYEE' ? 'i-lucide-user' : 'i-lucide-users'"
                class="size-5 mx-auto mb-1"
                :class="createForm.party_type === pt.value ? 'text-primary-600' : 'text-muted'"
              />
              <p class="text-sm font-medium" :class="createForm.party_type === pt.value ? 'text-primary-700' : 'text-gray-700'">
                {{ pt.label }}
              </p>
            </button>
          </div>
        </UFormField>

        <!-- Persona filtrada -->
        <UFormField label="Persona" required>
          <USelect
            v-model="createForm.party_id"
            :items="filteredPeople"
            :placeholder="filteredPeople.length ? 'Seleccionar persona...' : 'No hay personas de este tipo'"
            :disabled="!filteredPeople.length"
          />
        </UFormField>

        <!-- Tipo de vale (cards) -->
        <UFormField label="Tipo de vale" required>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              v-for="opt in availableTypeOptions"
              :key="opt.value"
              type="button"
              class="flex flex-col items-center p-3 rounded-lg border-2 text-center transition-colors"
              :class="createForm.type === opt.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                : 'border-default hover:border-accented'"
              @click="createForm.type = opt.value"
            >
              <UIcon
                :name="opt.icon"
                class="size-5 mb-1"
                :class="createForm.type === opt.value ? 'text-primary-600' : 'text-muted'"
              />
              <p class="text-sm font-medium" :class="createForm.type === opt.value ? 'text-primary-700' : 'text-gray-700'">
                {{ opt.label }}
              </p>
              <p class="text-xs text-muted mt-0.5">{{ opt.description }}</p>
            </button>
          </div>
        </UFormField>

        <!-- Monto + Moneda -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Monto" required>
            <UInput v-model.number="createForm.amount" type="number" placeholder="0.00" :min="0" />
          </UFormField>
          <UFormField label="Moneda" required>
            <USelect v-model="createForm.currency_code" :items="currencyOptions" />
          </UFormField>
        </div>

        <!-- Tipo de cambio -->
        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Tipo de cambio" required>
              <UInput
                v-model.number="createForm.exchange_rate"
                type="number"
                placeholder="Ej: 1200"
                :min="0"
                :step="0.01"
              />
            </UFormField>
            <div v-if="convertedPreviewText" class="flex items-end pb-1">
              <p class="text-sm font-medium text-muted">
                {{ convertedPreviewText }}
              </p>
            </div>
          </div>
          <p v-if="createForm.exchange_rate && createForm.amount > 0" class="text-xs text-muted">
            Equivalente en {{ convertedCurrencyLabel }}: {{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: convertedCurrencyLabel, maximumFractionDigits: 2 }).format(convertedAmount ?? 0) }}
          </p>
        </div>

        <!-- Fecha -->
        <UFormField label="Fecha" required>
          <UInput v-model="createForm.date" type="date" />
        </UFormField>

        <!-- Descripción -->
        <UFormField label="Descripción">
          <UTextarea v-model="createForm.description" placeholder="Motivo del vale (sueldo, adelanto, etc.)" :rows="2" />
        </UFormField>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" @click="open = false" />
        <UButton
          v-if="!confirmAutomatically"
          label="Crear borrador"
          variant="outline"
          :loading="saving"
          :disabled="!createForm.party_id || createForm.amount <= 0 || !createForm.exchange_rate"
          @click="handleCreate"
        />
        <UButton
          label="Crear y confirmar"
          color="success"
          icon="i-lucide-check"
          :loading="saving"
          :disabled="!createForm.party_id || createForm.amount <= 0 || !createForm.exchange_rate"
          @click="handleCreate"
        />
      </div>
    </template>
  </UModal>
</template>
