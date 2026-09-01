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
  emit('submit', { ...form })
}

const onBankAccountSelect = (bankId: string) => {
  const item = props.bankAccountItems.find(b => b.value === bankId)
  if (item) {
    form.bank_account_id = bankId
    form.bank_name = item.label.split(' - ')[0]
  }
}

const bankOptions = [
  'Galicia', 'Santander', 'Nación', 'BBVA', 'Macro', 'HSBC',
  'Supervielle', 'Credicoop', 'Patagonia', 'Itaú', 'Banco Do Brasil'
]
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="N° Cheque" name="check_number" required>
        <UInput v-model="form.check_number" placeholder="Número de cheque" />
      </UFormField>
      <UFormField label="Banco" name="bank_name" required>
        <USelectMenu
          v-model="form.bank_name"
          :items="bankOptions"
          placeholder="Seleccionar banco"
          create
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Sucursal" name="bank_branch">
        <UInput v-model="form.bank_branch" placeholder="Sucursal (opcional)" />
      </UFormField>
      <UFormField label="N° Cuenta" name="account_number">
        <UInput v-model="form.account_number" placeholder="N° de cuenta (opcional)" />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Emisor" name="issuer_name" required>
        <UInput v-model="form.issuer_name" placeholder="Nombre del emisor" />
      </UFormField>
      <UFormField label="DNI/CUIT Emisor" name="issuer_id">
        <UInput v-model="form.issuer_id" placeholder="DNI o CUIT (opcional)" />
      </UFormField>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <UFormField label="Monto" name="amount" required>
        <UInput v-model.number="form.amount" type="number" :min="0.01" :step="0.01" />
      </UFormField>
      <UFormField label="Moneda" name="currency_code">
        <USelect
          v-model="form.currency_code"
          :items="currencyItems"
          placeholder="Seleccionar moneda"
        />
      </UFormField>
      <UFormField label="Fecha emisión" name="issue_date" required>
        <UInput v-model="form.issue_date" type="date" />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Vencimiento" name="due_date" required>
        <UInput v-model="form.due_date" type="date" />
      </UFormField>
      <UFormField label="Cuenta bancaria" name="bank_account_id">
        <USelect
          v-model="form.bank_account_id"
          :items="bankAccountItems"
          placeholder="Seleccionar cuenta bancaria"
          @update:model-value="onBankAccountSelect"
        />
      </UFormField>
    </div>

    <div class="flex items-center gap-4">
      <UCheckbox v-model="form.is_own" label="Cheque propio" />
      <div class="flex-1" />
      <UFormField label="Notas" name="notes" class="flex-1">
        <UInput v-model="form.notes" placeholder="Notas (opcional)" />
      </UFormField>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancelar" variant="ghost" @click="emit('cancel')" />
      <UButton label="Guardar" type="submit" :loading="loading" />
    </div>
  </form>
</template>
