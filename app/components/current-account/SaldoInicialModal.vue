<script setup lang="ts">
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const toast = useToast()
const router = useRouter()
const partiesService = useBusinessPartiesService()
const { baseCurrency, activeCurrencies, codeSelectItems, init: initCurrencies } = useCurrencies()
const {
  autoResolve: resolveExchangeRate,
  isAutoResolved,
  loading: loadingExchangeRate,
  setManualRate,
} = useExchangeRate()
const { addEntry, fetchActive, fetchAll } = useCurrentAccounts()

const loading = ref(false)
const allParties = ref<Array<{ id: string; name: string; tax_id?: string; type: string }>>([])

const form = reactive({
  party_type: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER',
  party_id: '',
  amount: 0,
  balance_effect: 'INCREASE' as 'INCREASE' | 'DECREASE',
  currency_code: 'ARS',
  exchange_rate: null as number | null,
  rate_type: 'OFFICIAL',
  date: today(),
  description: 'Saldo inicial',
})

const partyTypeOptions = [
  { label: 'Cliente', value: 'CUSTOMER' },
  { label: 'Proveedor', value: 'SUPPLIER' },
]

const balanceNatureOptions = computed(() => form.party_type === 'CUSTOMER'
  ? [
      { label: 'El cliente nos debe', description: 'Quedará como deuda a cobrar', value: 'INCREASE' },
      { label: 'El cliente tiene saldo a favor', description: 'Quedará como saldo a favor del cliente', value: 'DECREASE' },
    ]
  : [
      { label: 'Le debemos al proveedor', description: 'Quedará como deuda a pagar', value: 'INCREASE' },
      { label: 'Tenemos saldo a favor', description: 'Quedará como crédito a nuestro favor', value: 'DECREASE' },
    ])

const resultingAmount = computed(() => {
  const amount = convertedAmount.value ?? form.amount
  return form.balance_effect === 'DECREASE' ? -amount : amount
})

const selectedPartyType = computed({
  get: () => partyTypeOptions.find(o => o.value === form.party_type) ?? null,
  set: (val) => {
    form.party_type = (val?.value as 'CUSTOMER' | 'SUPPLIER') ?? 'CUSTOMER'
    form.party_id = ''
    form.balance_effect = 'INCREASE'
    partySearch.value = ''
  },
})

const partySearch = ref('')

const filteredParties = computed(() => {
  const q = partySearch.value.toLowerCase().trim()
  let filtered = allParties.value.filter(p => p.type === form.party_type)
  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tax_id && p.tax_id.includes(q))
    )
  }
  return filtered.map(p => ({
    label: p.tax_id ? `${p.name} (${p.tax_id})` : p.name,
    value: p.id
  }))
})

const selectedParty = computed({
  get: () => {
    const party = allParties.value.find(p => p.id === form.party_id)
    if (!party) return null
    return { label: party.tax_id ? `${party.name} (${party.tax_id})` : party.name, value: party.id }
  },
  set: (val) => { form.party_id = val?.value ?? '' },
})

const selectedCurrency = computed(() =>
  activeCurrencies.value.find(currency => currency.code === form.currency_code) ?? null
)

const baseCurrencyCode = computed(() => baseCurrency.value?.code ?? 'ARS')
const isForeignCurrency = computed(() =>
  form.currency_code.toUpperCase() !== baseCurrencyCode.value.toUpperCase()
)
const convertedAmount = computed(() => {
  if (!isForeignCurrency.value) return form.amount
  if (!form.exchange_rate || form.amount <= 0) return null
  return Number((form.amount * form.exchange_rate).toFixed(2))
})

function formatAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

async function loadLatestExchangeRate() {
  if (!isForeignCurrency.value) {
    form.exchange_rate = null
    return
  }
  const rate = await resolveExchangeRate(form.currency_code, baseCurrencyCode.value, form.rate_type)
  form.exchange_rate = rate ? Number(rate) : null
}

function markExchangeRateAsManual(value: number | string) {
  const rate = Number(value)
  form.exchange_rate = rate > 0 ? rate : null
  if (rate > 0) setManualRate(rate)
}

onMounted(async () => {
  try {
    const [parties] = await Promise.all([partiesService.findAll(), initCurrencies()])
    allParties.value = parties as any
    form.currency_code = baseCurrencyCode.value
  } catch (e) {
    console.error('Error loading parties:', e)
  }
})

watch(() => form.currency_code, () => {
  form.exchange_rate = null
  if (isForeignCurrency.value) loadLatestExchangeRate()
})

function close() {
  emit('update:open', false)
  form.party_id = ''
  form.amount = 0
  form.balance_effect = 'INCREASE'
  partySearch.value = ''
  form.currency_code = baseCurrencyCode.value
  form.exchange_rate = null
  form.rate_type = 'OFFICIAL'
  form.date = today()
  form.description = 'Saldo inicial'
}

async function handleSubmit() {
  if (!form.party_id) {
    toast.add({ title: 'Seleccioná un tercero', color: 'error' })
    return
  }
  if (form.amount <= 0) {
    toast.add({ title: 'El monto debe ser mayor a 0', color: 'error' })
    return
  }
  if (isForeignCurrency.value && (!form.exchange_rate || form.exchange_rate <= 0)) {
    toast.add({ title: 'Ingresá un tipo de cambio válido', color: 'error' })
    return
  }

  try {
    loading.value = true

    const partyId = form.party_id
    await addEntry({
      party_id: partyId,
      party_type: form.party_type,
      currency_code: form.currency_code,
      type: 'OPENING_BALANCE',
      amount: form.amount,
      balance_effect: form.balance_effect,
      exchange_rate: isForeignCurrency.value ? form.exchange_rate ?? undefined : undefined,
      rate_type: isForeignCurrency.value ? form.rate_type : undefined,
      date: form.date,
      description: form.description || 'Saldo inicial',
      reference_type: 'opening_balance',
    })

    await Promise.all([fetchActive(), fetchAll()])

    toast.add({ title: 'Saldo inicial registrado', color: 'success' })
    close()
    await router.push(`/erp/treasury/current-accounts/${partyId}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? e.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Nuevo saldo inicial"
    description="Cargá el saldo de apertura para un cliente o proveedor"
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UPageCard variant="subtle" class="space-y-4">
          <div>
            <p class="font-medium">1. Cuenta corriente</p>
            <p class="text-sm text-muted">Elegí si el saldo corresponde a un cliente o proveedor.</p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Tipo de tercero" required>
              <USelectMenu
                v-model="selectedPartyType"
                :items="partyTypeOptions"
                placeholder="Seleccionar tipo"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Tercero" required>
              <USelectMenu
                v-model="selectedParty"
                :items="filteredParties"
                placeholder="Buscar cliente o proveedor..."
                searchable
                size="lg"
                class="w-full"
                @update:search="partySearch = $event"
              />
            </UFormField>
          </div>
        </UPageCard>

        <UPageCard variant="subtle" class="space-y-4">
          <div>
            <p class="font-medium">2. Importe de apertura</p>
            <p class="text-sm text-muted">La cotización queda guardada con el movimiento y no cambia aunque se actualicen los tipos de cambio.</p>
          </div>

          <UFormField label="Naturaleza del saldo" required>
            <URadioGroup
              v-model="form.balance_effect"
              :items="balanceNatureOptions"
              value-key="value"
              label-key="label"
              description-key="description"
              class="grid grid-cols-1 gap-3 md:grid-cols-2"
            />
          </UFormField>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
            <UFormField label="Monto" required>
              <UInput
                v-model.number="form.amount"
                type="number"
                :min="0.01"
                :step="0.01"
                placeholder="0,00"
                size="lg"
                class="w-full"
              >
                <template #leading>
                  <span class="text-sm text-muted">{{ selectedCurrency?.symbol ?? form.currency_code }}</span>
                </template>
              </UInput>
            </UFormField>

            <UFormField label="Moneda" required>
              <USelect
                v-model="form.currency_code"
                :items="codeSelectItems"
                placeholder="Seleccionar moneda"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <div v-if="isForeignCurrency" class="rounded-xl border border-default bg-default p-4">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <UFormField
                label="Tipo de cambio"
                :description="`Valor de 1 ${form.currency_code} expresado en ${baseCurrencyCode}. Podés modificarlo para este saldo.`"
                required
              >
                <UInput
                  :model-value="form.exchange_rate"
                  type="number"
                  :min="0.000001"
                  step="0.000001"
                  placeholder="Ingresar cotización"
                  size="lg"
                  class="w-full"
                  :loading="loadingExchangeRate"
                  @update:model-value="markExchangeRateAsManual"
                />
              </UFormField>

              <UButton
                type="button"
                label="Restaurar última"
                icon="i-lucide-refresh-cw"
                variant="outline"
                :loading="loadingExchangeRate"
                @click="loadLatestExchangeRate"
              />
            </div>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
              <UBadge
                :label="isAutoResolved ? 'Última cotización cargada' : 'Cotización modificada'"
                :color="isAutoResolved ? 'info' : 'warning'"
                variant="subtle"
              />
              <p v-if="convertedAmount !== null && form.amount > 0" class="text-sm font-medium">
                {{ formatAmount(form.amount, form.currency_code) }} ≈
                {{ formatAmount(convertedAmount, baseCurrencyCode) }}
              </p>
            </div>
          </div>

          <div v-if="form.amount > 0" class="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">Saldo resultante</p>
            <p class="mt-1 text-lg font-semibold">{{ formatAmount(resultingAmount, baseCurrencyCode) }}</p>
            <p class="text-sm text-muted">{{ balanceNatureOptions.find(option => option.value === form.balance_effect)?.description }}</p>
          </div>
        </UPageCard>

        <UPageCard variant="subtle" class="space-y-4">
          <div>
            <p class="font-medium">3. Referencia</p>
            <p class="text-sm text-muted">Indicá la fecha de corte y una descripción para reconocer el origen del saldo.</p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <UFormField label="Fecha" required>
              <UInput v-model="form.date" type="date" size="lg" class="w-full" />
            </UFormField>

            <UFormField label="Descripción">
              <UInput v-model="form.description" placeholder="Ej.: saldo anterior a la implementación" size="lg" class="w-full" />
            </UFormField>
          </div>
        </UPageCard>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton label="Cancelar" variant="ghost" @click="close" />
        <UButton
          label="Guardar"
          color="primary"
          :loading="loading"
          :disabled="!form.party_id || form.amount <= 0 || (isForeignCurrency && (!form.exchange_rate || form.exchange_rate <= 0))"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
