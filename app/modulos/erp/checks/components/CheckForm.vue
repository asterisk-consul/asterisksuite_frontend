<script setup lang="ts">
import { reactive, watch } from 'vue'

export interface CheckFormData {
  id?: string
  check_number: string
  bank_name: string
  bank_branch: string
  account_number: string
  bank_account_id: string
  issuer_name: string
  issuer_id: string
  amount: number
  currency_code: string
  issue_date: string
  due_date: string
  is_own: boolean
  notes: string
}

export interface BankAccountItem {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  modelValue?: CheckFormData
  loading?: boolean
  bankAccountItems?: BankAccountItem[]
  currencyItems?: BankAccountItem[]
  forcedType?: 'OWN' | 'THIRD_PARTY'
}>(), {
  bankAccountItems: () => [],
  currencyItems: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [CheckFormData]
  submit: [CheckFormData]
  cancel: []
}>()

const defaultForm: CheckFormData = {
  check_number: '',
  bank_name: '',
  bank_branch: '',
  account_number: '',
  bank_account_id: '',
  issuer_name: '',
  issuer_id: '',
  amount: 0,
  currency_code: 'ARS',
  issue_date: today(),
  due_date: '',
  is_own: false,
  notes: '',
}

const form = reactive<CheckFormData>({ ...defaultForm })

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      Object.assign(form, { ...defaultForm })
      return
    }
    Object.assign(form, val)
  },
  { immediate: true }
)

watch(
  form,
  (val) => {
    emit('update:modelValue', { ...val })
  },
  { deep: true }
)

const handleSubmit = () => {
  // Validación real: los "required" visuales no bloquean el submit
  const missing: string[] = []
  if (!form.check_number?.trim()) missing.push('N° Cheque')
  if (!form.bank_name?.trim()) missing.push('Banco')
  if (!form.issuer_name?.trim()) missing.push('Emisor')
  if (!form.amount || Number(form.amount) <= 0) missing.push('Monto')
  if (!form.issue_date) missing.push('Fecha emisión')
  if (!form.due_date) missing.push('Vencimiento')
  if (!form.bank_account_id) missing.push(form.is_own ? 'Cuenta bancaria a debitar' : 'Cuenta bancaria de depósito')
  if (missing.length > 0) {
    const toast = useToast()
    toast.add({
      title: 'Faltan campos obligatorios',
      description: missing.join(', '),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return
  }
  if (form.issue_date && form.due_date && form.due_date < form.issue_date) {
    useToast().add({
      title: 'Revisá las fechas',
      description: 'El vencimiento no puede ser anterior a la fecha de emisión.',
      color: 'error',
      icon: 'i-lucide-calendar-x'
    })
    return
  }
  emit('submit', { ...form })
}

const onBankAccountSelect = (bankId: string) => {
  const item = props.bankAccountItems.find(b => b.value === bankId)
  if (item) {
    form.bank_account_id = bankId
    if (form.is_own && !form.bank_name.trim()) {
      form.bank_name = item.label.split(' - ')[0] ?? ''
    }
  }
}

const knownBanks = [
  'Banco Nación', 'Banco Provincia', 'Banco Ciudad', 'Banco Galicia',
  'Santander', 'BBVA', 'Banco Macro', 'Banco Credicoop', 'Banco Supervielle',
  'Banco Patagonia', 'ICBC', 'Banco Hipotecario', 'Banco Comafi', 'BIND',
  'Galicia Más (ex HSBC)', 'Brubank', 'Banco del Sol'
]

const customBanks = ref<string[]>([])

const bankOptions = computed(() => [...new Set([
  ...knownBanks,
  ...customBanks.value,
  ...props.bankAccountItems.map(item => item.label.split(' - ')[0]?.trim()).filter(Boolean) as string[]
])].sort((a, b) => a.localeCompare(b, 'es')))

const createBank = (value: string) => {
  const bank = value.trim()
  if (!bank) return
  if (!bankOptions.value.some(item => item.toLocaleLowerCase('es') === bank.toLocaleLowerCase('es'))) {
    customBanks.value.push(bank)
  }
  form.bank_name = bank
}

watch(
  () => props.forcedType,
  (value) => {
    if (value !== undefined) form.is_own = value === 'OWN'
  },
  { immediate: true }
)
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <section class="rounded-xl border border-default bg-elevated/40 p-4 space-y-4">
      <div class="flex items-start gap-3">
        <div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-landmark" class="size-5" /></div>
        <div><h3 class="font-semibold">Origen del cheque</h3><p class="text-sm text-muted">Indicá si sale de una cuenta propia o si fue recibido de un tercero.</p></div>
      </div>

      <UAlert
        v-if="forcedType !== undefined"
        :color="forcedType === 'OWN' ? 'primary' : 'info'"
        variant="subtle"
        :icon="forcedType === 'OWN' ? 'i-lucide-building-2' : 'i-lucide-hand-coins'"
        :title="forcedType === 'OWN' ? 'Cheque propio' : 'Cheque recibido de un tercero'"
        :description="forcedType === 'OWN' ? 'Se utilizará para registrar este pago.' : 'Ingresará a la cartera de cheques con este cobro.'"
      />
      <div v-else class="grid gap-3 sm:grid-cols-2">
        <button type="button" class="rounded-xl border p-4 text-left transition-colors" :class="!form.is_own ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default hover:bg-muted/50'" @click="form.is_own = false">
          <div class="flex items-center gap-2 font-medium"><UIcon name="i-lucide-hand-coins" class="size-5" /> De terceros</div>
          <p class="mt-1 text-xs text-muted">Recibido de un cliente u otra persona.</p>
        </button>
        <button type="button" class="rounded-xl border p-4 text-left transition-colors" :class="form.is_own ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default hover:bg-muted/50'" @click="form.is_own = true">
          <div class="flex items-center gap-2 font-medium"><UIcon name="i-lucide-building-2" class="size-5" /> Propio</div>
          <p class="mt-1 text-xs text-muted">Emitido desde una cuenta de la empresa.</p>
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-default p-4 space-y-4">
      <div><h3 class="font-semibold">Datos del cheque</h3><p class="text-sm text-muted">Identificación bancaria que figura en el comprobante.</p></div>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Número de cheque" name="check_number" required><UInput v-model="form.check_number" class="w-full" placeholder="Ej. 00001234" icon="i-lucide-hash" /></UFormField>
        <UFormField label="Banco emisor del cheque" name="bank_name" required>
          <USelectMenu
            v-model="form.bank_name"
            class="w-full"
            :items="bankOptions"
            placeholder="Seleccionar o escribir el banco emisor"
            :search-input="{ placeholder: 'Buscar o escribir otro banco...' }"
            create-item="always"
            icon="i-lucide-landmark"
            @create="createBank"
          >
            <template #create-item-label="{ item }">
              Usar “{{ item }}” como nombre del banco
            </template>
          </USelectMenu>
          <p class="mt-1.5 text-xs text-muted">Elegí un banco frecuente o escribí el nombre que figura en el cheque.</p>
        </UFormField>
        <UFormField label="Sucursal" name="bank_branch"><UInput v-model="form.bank_branch" class="w-full" placeholder="Nombre o número de sucursal" /></UFormField>
        <UFormField label="Número de cuenta" name="account_number"><UInput v-model="form.account_number" class="w-full" placeholder="Cuenta informada en el cheque" /></UFormField>
      </div>
    </section>

    <section class="rounded-xl border border-default p-4 space-y-4">
      <div><h3 class="font-semibold">Importe y fechas</h3><p class="text-sm text-muted">Monto, moneda y período de validez.</p></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UFormField label="Monto" name="amount" required><UInput v-model.number="form.amount" class="w-full" type="number" :min="0.01" :step="0.01" icon="i-lucide-banknote" /></UFormField>
        <UFormField label="Moneda" name="currency_code" required><USelect v-model="form.currency_code" class="w-full" :items="currencyItems" placeholder="Seleccionar" /></UFormField>
        <UFormField label="Fecha de emisión" name="issue_date" required><UInput v-model="form.issue_date" class="w-full" type="date" /></UFormField>
        <UFormField label="Fecha de vencimiento" name="due_date" required><UInput v-model="form.due_date" class="w-full" type="date" :min="form.issue_date" /></UFormField>
      </div>
    </section>

    <section class="rounded-xl border border-default p-4 space-y-4">
      <div><h3 class="font-semibold">Emisor y registro</h3><p class="text-sm text-muted">Persona o empresa firmante y datos internos opcionales.</p></div>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Nombre o razón social del emisor" name="issuer_name" required><UInput v-model="form.issuer_name" class="w-full" placeholder="Quién emite el cheque" icon="i-lucide-user-round" /></UFormField>
        <UFormField label="DNI o CUIT del emisor" name="issuer_id"><UInput v-model="form.issuer_id" class="w-full" placeholder="Opcional" /></UFormField>
        <UFormField
          :label="form.is_own ? 'Cuenta bancaria a debitar' : 'Cuenta bancaria de depósito'"
          name="bank_account_id"
          :description="form.is_own ? 'El importe se descontará de esta cuenta cuando se cobre el cheque.' : 'El importe se acreditará en esta cuenta al depositar o cobrar el cheque.'"
          required
        >
          <USelect v-model="form.bank_account_id" class="w-full" :items="bankAccountItems" :placeholder="form.is_own ? 'Seleccionar cuenta de débito' : 'Seleccionar cuenta de depósito'" @update:model-value="onBankAccountSelect" />
        </UFormField>
        <UFormField label="Notas internas" name="notes"><UTextarea v-model="form.notes" class="w-full" :rows="3" placeholder="Información adicional para identificar el cheque" /></UFormField>
      </div>
    </section>

    <div class="flex justify-end gap-2 border-t border-default pt-4">
      <UButton label="Cancelar" variant="ghost" @click="emit('cancel')" />
      <UButton :label="modelValue?.id ? 'Guardar cambios' : 'Crear cheque'" icon="i-lucide-check" type="submit" :loading="loading" />
    </div>
  </form>
</template>
