<script setup lang="ts">
import { useBankConcepts } from '~/modulos/erp/bank-concepts/composable/useBankConcepts'
import { useBankAccounts } from '../composables/useBankAccounts'

const props = defineProps<{
  open: boolean
  accountId: string
  currencyCode: string
  currentBalance: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const toast = useToast()
const bankConcepts = useBankConcepts()
const { createMovement } = useBankAccounts()

const saving = ref(false)

const form = reactive({
  nature: 'DEBIT' as 'DEBIT' | 'CREDIT',
  bank_concept_id: '',
  date: today(),
  amount: null as number | null,
  base_amount: null as number | null,
  currency_code: props.currencyCode,
  exchange_rate: null as number | null,
  reference: '',
  description: ''
})

const selectedConcept = computed(() =>
  bankConcepts.activeConcepts.value.find(c => c.id === form.bank_concept_id) ?? null
)

const manualConcepts = computed(() =>
  bankConcepts.activeConcepts.value.filter(c => c.available_manual !== false)
)

const conceptOptions = computed(() =>
  manualConcepts.value.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id }))
)

const calculatesIva = computed(() => Boolean(selectedConcept.value?.calculates_iva))
const ivaRate = computed(() => Number(selectedConcept.value?.iva_rate ?? 0))
const computedTax = computed(() =>
  calculatesIva.value ? Number(((Number(form.base_amount ?? 0) * ivaRate.value) / 100).toFixed(2)) : 0
)
const totalAmount = computed(() => {
  if (calculatesIva.value) return Number((Number(form.base_amount ?? 0) + computedTax.value).toFixed(2))
  return Number(form.amount ?? 0)
})
const balanceResult = computed(() =>
  form.nature === 'DEBIT'
    ? Number(props.currentBalance) - totalAmount.value
    : Number(props.currentBalance) + totalAmount.value
)

const requiresReceipt = computed(() => Boolean(selectedConcept.value?.requires_receipt))

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: form.currency_code || 'ARS',
    maximumFractionDigits: 2
  }).format(Number(value) || 0)

function reset() {
  Object.assign(form, {
    nature: 'DEBIT',
    bank_concept_id: '',
    date: today(),
    amount: null,
    base_amount: null,
    currency_code: props.currencyCode,
    exchange_rate: null,
    reference: '',
    description: ''
  })
}

watch(() => props.open, async (value) => {
  if (value) {
    form.currency_code = props.currencyCode
    if (!bankConcepts.concepts.value.length) await bankConcepts.init()
  }
})

async function handleSubmit() {
  if (!form.bank_concept_id) {
    toast.add({ title: 'Seleccioná un concepto', color: 'warning' })
    return
  }
  if (calculatesIva.value && !form.base_amount) {
    toast.add({ title: 'Ingresá la base imponible', color: 'warning' })
    return
  }
  if (!calculatesIva.value && !form.amount) {
    toast.add({ title: 'Ingresá el importe', color: 'warning' })
    return
  }

  saving.value = true
  try {
    await createMovement(props.accountId, {
      nature: form.nature,
      bank_concept_id: form.bank_concept_id,
      amount: totalAmount.value,
      ...(calculatesIva.value
        ? {
            base_amount: Number(form.base_amount),
            tax_amount: computedTax.value,
            total_amount: totalAmount.value
          }
        : {}),
      currency_code: form.currency_code,
      exchange_rate: form.exchange_rate ?? undefined,
      reference: form.reference || undefined,
      description: form.description || undefined,
      date: form.date
    })
    toast.add({ title: 'Movimiento registrado', color: 'success' })
    emit('saved')
    emit('update:open', false)
    reset()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="Registrar movimiento bancario"
    description="Registrá débitos, créditos, comisiones, impuestos o ajustes que figuran en la cuenta bancaria."
    :ui="{ content: 'sm:max-w-4xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UForm :state="form" class="space-y-6" @submit="handleSubmit">
        <!-- 1. Movimiento -->
        <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
          <div><p class="font-medium">Movimiento</p><p class="text-sm text-muted">Indicá si el movimiento aumenta o reduce el saldo y cuándo ocurrió.</p></div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Impacto en el banco" name="nature" required>
              <USelectMenu
                v-model="form.nature"
                :items="[
                  { label: 'Débito (resta saldo)', value: 'DEBIT' },
                  { label: 'Crédito (suma saldo)', value: 'CREDIT' }
                ]"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Fecha" name="date" required>
              <UInput v-model="form.date" type="date" class="w-full" />
            </UFormField>
          </div>
        </section>

        <!-- 2. Concepto e impuestos -->
        <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
          <div><p class="font-medium">Concepto e impuestos</p><p class="text-sm text-muted">El concepto clasifica el movimiento para reportes y define si corresponde calcular IVA.</p></div>
          <UFormField label="Concepto bancario" name="bank_concept_id" required description="Buscá por código o nombre del concepto">
            <USelectMenu
              v-model="form.bank_concept_id"
              :items="conceptOptions"
              value-key="value"
              placeholder="Seleccioná un concepto"
              searchable
              class="w-full"
              :ui="{ content: 'min-w-[var(--reka-popper-anchor-width)] sm:min-w-[32rem]' }"
            />
          </UFormField>
          <div v-if="selectedConcept" class="flex flex-wrap gap-2">
            <UBadge v-if="selectedConcept.accounting_account" color="neutral" variant="subtle" :label="`Cuenta ${selectedConcept.accounting_account}`" />
            <UBadge v-if="calculatesIva" color="success" variant="subtle" :label="`Calcula IVA ${ivaRate}%`" />
            <UBadge v-if="requiresReceipt" color="warning" variant="subtle" label="Requiere comprobante" />
          </div>
        </section>

        <!-- 3. Importe y moneda -->
        <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
          <div><p class="font-medium">Importe</p><p class="text-sm text-muted">Ingresá el importe en la moneda propia de esta cuenta bancaria.</p></div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UFormField v-if="calculatesIva" label="Base imponible" name="base_amount" required>
              <UInput v-model.number="form.base_amount" type="number" step="0.01" min="0" class="w-full" />
            </UFormField>
            <UFormField v-else label="Importe" name="amount" required>
              <UInput v-model.number="form.amount" type="number" step="0.01" min="0" class="w-full" />
            </UFormField>
            <UFormField label="Moneda" name="currency_code">
              <UInput v-model="form.currency_code" disabled class="w-full" />
            </UFormField>
            <UFormField label="Tipo de cambio" name="exchange_rate" description="Opcional si la operación está expresada en otra moneda">
              <UInput v-model.number="form.exchange_rate" type="number" step="0.000001" placeholder="Ej. 1450,50" class="w-full" />
            </UFormField>
          </div>
          <div v-if="calculatesIva" class="grid gap-3 rounded-lg bg-elevated p-3 text-sm sm:grid-cols-2">
            <span class="flex justify-between gap-3"><span class="text-muted">IVA ({{ ivaRate }}%)</span><strong>{{ formatCurrency(computedTax) }}</strong></span>
            <span class="flex justify-between gap-3"><span class="text-muted">Total bancario</span><strong>{{ formatCurrency(totalAmount) }}</strong></span>
          </div>
        </section>

        <!-- 4. Referencia y descripción -->
        <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
          <div><p class="font-medium">Referencia y detalle</p><p class="text-sm text-muted">Estos datos facilitan la conciliación con el resumen bancario.</p></div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Referencia / N° operación" name="reference">
              <UInput v-model="form.reference" placeholder="Ej. 0001234" class="w-full" />
            </UFormField>
            <UFormField label="Descripción" name="description" class="sm:col-span-2">
              <UTextarea v-model="form.description" placeholder="Detalle del movimiento y cualquier información necesaria para identificarlo" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </section>

        <!-- 5. Vista previa -->
        <div class="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2 text-sm sm:p-5">
          <p class="font-medium mb-2">Vista previa del impacto</p>
          <div class="flex justify-between">
            <span class="text-muted">Saldo actual</span>
            <span>{{ formatCurrency(currentBalance) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">{{ form.nature === 'DEBIT' ? 'Débito bancario' : 'Crédito bancario' }}</span>
            <span :class="form.nature === 'DEBIT' ? 'text-error' : 'text-success'">
              {{ form.nature === 'DEBIT' ? '-' : '+' }} {{ formatCurrency(totalAmount) }}
            </span>
          </div>
          <div class="flex justify-between border-t border-default pt-2 font-semibold">
            <span>Saldo resultante</span>
            <span :class="balanceResult >= 0 ? 'text-foreground' : 'text-error'">
              {{ formatCurrency(balanceResult) }}
            </span>
          </div>
        </div>

        <div class="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-default bg-default/95 px-6 py-4 backdrop-blur">
          <UButton label="Cancelar" variant="ghost" @click="emit('update:open', false)" />
          <UButton label="Registrar movimiento" type="submit" :loading="saving" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
