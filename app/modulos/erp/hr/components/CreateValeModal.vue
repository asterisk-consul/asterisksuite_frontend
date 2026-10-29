<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  success: []
}>()

const hrStore = useHrStore()
const toast = useToast()
const {
  autoResolve: resolveExchangeRate,
  isAutoResolved,
  loading: loadingExchangeRate,
  setManualRate
} = useExchangeRate()
const saving = ref(false)
const confirmAutomatically = ref(true)
const alertDismissed = ref(false)
const treasuryTargetType = ref<'CASH_BOX' | 'BANK_ACCOUNT'>('CASH_BOX')
const treasuryTargetId = ref('')
const cashBoxes = ref<any[]>([])
const bankAccounts = ref<any[]>([])
const pendingCreatedValeId = ref<string | null>(null)
const partnerFunds = ref<{ contributions: number; withdrawals: number; balance: number; available: number; remuneration_pending: number } | null>(null)
const loadingFunds = ref(false)
const fundsError = ref(false)
let fundsRequest = 0

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
    { label: 'Extras', value: 'EXTRAS', icon: 'i-lucide-gift', description: 'Bonuses y horas extras' }
  ],
  PARTNER: [
    { label: 'Retirar aportes', value: 'RETIRO', icon: 'i-lucide-arrow-up-right', description: 'Recuperar fondos aportados, hasta el saldo disponible' },
    { label: 'Aportar fondos', value: 'APORTE', icon: 'i-lucide-arrow-down-left', description: 'Ingresar dinero y aumentar los aportes disponibles' },
    { label: 'Remuneración por trabajo', value: 'SUELDO', icon: 'i-lucide-banknote', description: 'Reconocer un importe por su trabajo y pagarlo desde Tesorería' },
    { label: 'Reembolso', value: 'REEMBOLSO', icon: 'i-lucide-receipt', description: 'Reembolso de gastos' },
    { label: 'Préstamo al socio', value: 'PRESTAMO', icon: 'i-lucide-hand-coins', description: 'Dinero que el socio deberá devolver; no consume aportes' }
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
    ? (requiresDirectTreasury.value
        ? 'Al confirmar se registrarán juntos el vale, la cuenta del socio y el ingreso o egreso en Tesorería.'
        : 'Una vez confirmado, generará un documento VALE e impactará la cuenta corriente.')
    : 'Podés confirmarlo después desde la lista de vales.'
)

// ═══════════════════════════════════════════
// TIPO DE CAMBIO
// ═══════════════════════════════════════════

const convertedAmount = computed(() => {
  if (!createForm.value.exchange_rate || createForm.value.amount <= 0) return null
  return createForm.value.currency_code === 'USD'
    ? createForm.value.amount * createForm.value.exchange_rate
    : createForm.value.amount / createForm.value.exchange_rate
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

async function loadLatestExchangeRate() {
  const rate = await resolveExchangeRate('USD', 'ARS', 'OFFICIAL')
  if (rate) createForm.value.exchange_rate = Number(rate)
}

function markExchangeRateAsManual(value: number | string) {
  const rate = Number(value)
  if (rate > 0) setManualRate(rate)
}

async function loadPeople() {
  try {
    const [employees, partners] = await Promise.all([
      $fetch<any[]>('/api/backend/employees'),
      $fetch<any[]>('/api/backend/partners')
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

async function loadTreasuryTargets() {
  try {
    const [boxes, banks] = await Promise.all([
      $fetch<any[]>('/api/backend/cash-boxes'),
      $fetch<any[]>('/api/backend/bank-accounts')
    ])
    cashBoxes.value = boxes
    bankAccounts.value = banks
  } catch (e) {
    console.error(e)
  }
}

const isPartner = computed(() => createForm.value.party_type === 'PARTNER')
const requiresDirectTreasury = computed(() => isPartner.value && createForm.value.type !== 'SUELDO')
const isWithdrawal = computed(() => isPartner.value && createForm.value.type === 'RETIRO')
const withdrawalBlocked = computed(() => isWithdrawal.value && (loadingFunds.value || fundsError.value || !partnerFunds.value || Number(createForm.value.amount) > partnerFunds.value.available))
const formatFunds = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: createForm.value.currency_code }).format(amount)

watch([open, () => createForm.value.party_id, () => createForm.value.party_type, () => createForm.value.currency_code], async () => {
  const request = ++fundsRequest
  partnerFunds.value = null
  fundsError.value = false
  loadingFunds.value = false
  if (!open.value || !isPartner.value || !createForm.value.party_id) return
  loadingFunds.value = true
  try {
    const funds = await $fetch<NonNullable<typeof partnerFunds.value>>(`/api/backend/hr/partners/${createForm.value.party_id}/funds`, { query: { currency_code: createForm.value.currency_code } })
    if (request === fundsRequest) partnerFunds.value = funds
  } catch {
    if (request === fundsRequest) fundsError.value = true
  } finally {
    if (request === fundsRequest) loadingFunds.value = false
  }
})
const treasuryTargetOptions = computed(() => {
  const currency = createForm.value.currency_code
  if (treasuryTargetType.value === 'CASH_BOX') {
    return cashBoxes.value
      .filter(box => box.active && box.currency_code === currency && box.current_session_id)
      .map(box => ({ label: `${box.name} · ${currency} · caja abierta`, value: box.id }))
  }
  return bankAccounts.value
    .filter(account => account.active && account.currency_code === currency)
    .map(account => ({ label: `${account.name} · ${account.bank_name} · ${currency}`, value: account.id }))
})

const selectedTarget = computed(() => {
  const source = treasuryTargetType.value === 'CASH_BOX' ? cashBoxes.value : bankAccounts.value
  return source.find(item => item.id === treasuryTargetId.value)
})

const isOutflow = computed(() => ['RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(createForm.value.type))

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
  treasuryTargetType.value = 'CASH_BOX'
  treasuryTargetId.value = ''
  pendingCreatedValeId.value = null
}

async function handleCreate() {
  if (saving.value || withdrawalBlocked.value) return
  try {
    saving.value = true
    const vale = pendingCreatedValeId.value
      ? { id: pendingCreatedValeId.value }
      : await hrStore.createVale({
          ...createForm.value,
          rate_type: 'OFFICIAL',
          converted_amount: convertedAmount.value ?? createForm.value.amount,
        })
    pendingCreatedValeId.value = vale.id
    if (confirmAutomatically.value) {
      await hrStore.confirmVale(vale.id, requiresDirectTreasury.value ? {
        treasury_target_type: treasuryTargetType.value,
        treasury_target_id: treasuryTargetId.value
      } : undefined)
      toast.add({ title: 'Vale creado y confirmado', color: 'success' })
    } else {
      toast.add({ title: 'Vale creado como borrador', color: 'success' })
    }
    pendingCreatedValeId.value = null
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
  if (val) {
    loadTreasuryTargets()
    loadLatestExchangeRate()
  }
  if (!val) {
    resetForm()
    alertDismissed.value = false
    confirmAutomatically.value = true
  }
})

watch([treasuryTargetType, () => createForm.value.currency_code], () => {
  treasuryTargetId.value = ''
})
</script>

<template>
  <UModal v-model:open="open" title="Nuevo vale" description="Registrá un movimiento de empleado o socio." :ui="{ content: 'w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto' }">
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

      <div class="space-y-5">
      <div class="flex items-center justify-between gap-4 p-4 border border-default bg-muted/20 rounded-xl">
        <div>
          <p class="text-sm font-medium">Forma de registro</p>
          <p class="text-xs text-muted">Podés dejarlo pendiente o registrar su impacto ahora.</p>
        </div>
        <USwitch
          v-model="confirmAutomatically"
          label="Confirmar automáticamente"
        />
      </div>

      <!-- Tipo de persona -->
      <UPageCard variant="subtle" class="space-y-4">
        <div>
          <p class="font-medium">1. Persona y concepto</p>
          <p class="text-sm text-muted">Indicá quién realiza el movimiento y por qué concepto.</p>
        </div>
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
            size="lg"
            class="w-full"
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

      </UPageCard>

        <!-- Monto + Moneda -->
        <UPageCard variant="subtle" class="space-y-4">
          <div>
            <p class="font-medium">2. Importe</p>
            <p class="text-sm text-muted">El tipo de cambio queda guardado como referencia histórica.</p>
          </div>
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] gap-4">
          <UFormField label="Monto" required>
            <UInput v-model.number="createForm.amount" type="number" placeholder="0.00" :min="0" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Moneda" required>
            <USelect v-model="createForm.currency_code" :items="currencyOptions" size="lg" class="w-full" />
          </UFormField>
        </div>

        <div v-if="isPartner && createForm.party_id" class="rounded-xl border border-default p-4 flex flex-col gap-2">
          <p class="font-medium">Aportes disponibles · {{ createForm.currency_code }}</p>
          <p v-if="loadingFunds" class="text-sm text-muted">Consultando aportes…</p>
          <p v-else-if="fundsError" class="text-sm text-error">No se pudo consultar el disponible. Volvé a seleccionar el socio para reintentar.</p>
          <template v-else-if="partnerFunds">
            <div class="flex justify-between text-sm"><span>Aportes confirmados</span><span>{{ formatFunds(partnerFunds.contributions) }}</span></div>
            <div class="flex justify-between text-sm"><span>Retiros confirmados</span><span>{{ formatFunds(partnerFunds.withdrawals) }}</span></div>
            <div class="flex justify-between font-semibold"><span>Disponible para retirar</span><span>{{ formatFunds(partnerFunds.available) }}</span></div>
            <div class="flex justify-between text-sm"><span>Remuneraciones pendientes de pago</span><span>{{ formatFunds(partnerFunds.remuneration_pending) }}</span></div>
            <div v-if="isWithdrawal" class="flex justify-between text-sm" :class="withdrawalBlocked ? 'text-error' : 'text-muted'"><span>Saldo después del retiro</span><span>{{ formatFunds(partnerFunds.balance - Number(createForm.amount || 0)) }}</span></div>
            <p v-if="isWithdrawal && withdrawalBlocked" class="text-sm text-error">El retiro supera los aportes disponibles. Reducí el importe o registrá un préstamo si corresponde.</p>
            <p v-if="partnerFunds.balance < 0" class="text-sm text-warning">Los retiros históricos superan los aportes registrados. Revisá los movimientos antes de registrar nuevos retiros.</p>
          </template>
          <p class="text-xs text-muted">El disponible se calcula con vales de aporte y retiro confirmados en esta moneda. Las remuneraciones, reembolsos y préstamos no aumentan los aportes disponibles.</p>
        </div>

        <!-- Tipo de cambio -->
        <div class="space-y-2">
          <div class="grid grid-cols-1 md:grid-cols-[minmax(260px,0.65fr)_minmax(0,1.35fr)] gap-4">
            <UFormField label="Tipo de cambio" description="Cotización ARS por USD. Podés modificarla para este vale." required>
              <UInput
                v-model.number="createForm.exchange_rate"
                type="number"
                placeholder="Ej: 1200"
                :min="0"
                :step="0.01"
                size="lg"
                class="w-full"
                :loading="loadingExchangeRate"
                @update:model-value="markExchangeRateAsManual"
              />
              <div class="flex items-center gap-2 mt-2">
                <UBadge
                  :label="isAutoResolved ? 'Última cotización cargada' : 'Cotización modificada'"
                  :color="isAutoResolved ? 'info' : 'warning'"
                  variant="subtle"
                  size="sm"
                />
                <UButton
                  label="Restaurar última"
                  icon="i-lucide-refresh-cw"
                  variant="link"
                  size="xs"
                  :loading="loadingExchangeRate"
                  @click="loadLatestExchangeRate"
                />
              </div>
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
        </UPageCard>

        <UPageCard v-if="requiresDirectTreasury" variant="subtle" class="space-y-4 ring-1" :class="isOutflow ? 'ring-error/20' : 'ring-success/20'">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">3. Movimiento financiero</p>
              <p class="text-sm text-muted">Elegí dónde {{ isOutflow ? 'se debitará' : 'se acreditará' }} el dinero al confirmar.</p>
            </div>
            <UBadge
              :label="isOutflow ? 'Sale dinero' : 'Entra dinero'"
              :color="isOutflow ? 'error' : 'success'"
              variant="subtle"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] gap-4">
            <UFormField label="Medio" required>
              <USelect
                v-model="treasuryTargetType"
                :items="[
                  { label: 'Caja', value: 'CASH_BOX' },
                  { label: 'Cuenta bancaria', value: 'BANK_ACCOUNT' }
                ]"
                size="lg"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="treasuryTargetType === 'CASH_BOX' ? 'Caja' : 'Cuenta bancaria'" required>
              <USelect
                v-model="treasuryTargetId"
                :items="treasuryTargetOptions"
                :placeholder="treasuryTargetOptions.length ? 'Seleccionar...' : `No hay opciones activas en ${createForm.currency_code}`"
                :disabled="!treasuryTargetOptions.length"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <div v-if="selectedTarget" class="flex items-center justify-between rounded-md border border-default bg-default px-3 py-2 text-sm">
            <span class="text-muted">Saldo actual</span>
            <span class="font-semibold">
              {{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: createForm.currency_code }).format(Number(selectedTarget.balance ?? selectedTarget.balances?.find((b: any) => b.currency_code === createForm.currency_code)?.balance ?? 0)) }}
            </span>
          </div>
        </UPageCard>

        <!-- Fecha -->
        <UPageCard variant="subtle" class="space-y-4">
          <div>
            <p class="font-medium">{{ requiresDirectTreasury ? '4' : '3' }}. Información adicional</p>
            <p class="text-sm text-muted">Completá la fecha y una referencia que permita identificar el movimiento.</p>
          </div>
        <UFormField label="Fecha" required>
          <UInput v-model="createForm.date" type="date" size="lg" class="w-full" />
        </UFormField>

        <!-- Descripción -->
        <UFormField label="Descripción">
          <UTextarea v-model="createForm.description" placeholder="Motivo del vale (sueldo, adelanto, etc.)" :rows="3" class="w-full" />
        </UFormField>
        </UPageCard>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <p class="hidden sm:block text-xs text-muted">
          {{ requiresDirectTreasury && confirmAutomatically ? `${isOutflow ? 'Se debitará' : 'Se acreditará'} en ${treasuryTargetType === 'CASH_BOX' ? 'caja' : 'banco'}.` : isPartner && createForm.type === 'SUELDO' ? 'La remuneración queda pendiente de pago en Tesorería.' : 'Revisá los datos antes de guardar.' }}
        </p>
        <div class="flex justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          v-if="!confirmAutomatically"
          label="Crear borrador"
          variant="outline"
          :loading="saving"
          :disabled="saving || withdrawalBlocked || !createForm.party_id || createForm.amount <= 0 || !createForm.exchange_rate"
          @click="handleCreate"
        />
        <UButton
          v-if="confirmAutomatically"
          label="Crear y confirmar"
          color="success"
          icon="i-lucide-check"
          :loading="saving"
          :disabled="saving || withdrawalBlocked || !createForm.party_id || createForm.amount <= 0 || !createForm.exchange_rate || (requiresDirectTreasury && !treasuryTargetId)"
          @click="handleCreate"
        />
        </div>
      </div>
    </template>
  </UModal>
</template>
