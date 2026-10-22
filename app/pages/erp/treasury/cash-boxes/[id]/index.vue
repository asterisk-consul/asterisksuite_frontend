<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useCashBoxMovements } from '~/modulos/erp/cash-box-movements/composables/useCashBoxMovements'
import { cashBoxMovementColumns, MOVEMENT_TYPE_CONFIG } from '~/modulos/erp/cash-box-movements/movement-columns'
import { useChecksService } from '~/modulos/erp/checks/service/checks.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import type { Check } from '~/modulos/erp/checks/types/checks.types'
import type { CashBoxMovement } from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const route = useRoute()
const router = useRouter()
const boxId = route.params.id as string
const toast = useToast()

const {
  current: box,
  balances,
  currentSession,
  sessions,
  fetchOne,
  fetchBalances,
  fetchCurrentSession,
  fetchSessions,
  openSession,
  closeSession,
  reset: resetStore
} = useCashBoxes()

const { movements, init: fetchMovements, create: createMovement, reverse: reverseMovement } = useCashBoxMovements()
const checksService = useChecksService()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const canCreateManualMovement = computed(() => isOwnerOrAdmin.value || hasPermission('cash_box_movements.create_manual'))
const canOperateChecks = computed(() => canCreateManualMovement.value && (isOwnerOrAdmin.value || hasPermission('checks.deposit')))
const canReverseMovement = computed(() => isOwnerOrAdmin.value || hasPermission('cash_box_movements.reverse'))

useBreadcrumbEntityLabel(
  `/erp/treasury/cash-boxes/${boxId}`,
  computed(() => box.value?.name)
)

const sorting = ref<SortingState>([])
const sessionUserNames = ref<Map<string, string>>(new Map())

onMounted(async () => {
  // Reset state from previous box
  resetStore()

  try {
    await fetchOne(boxId)
  } catch (e) {
    // silent
  }

  try {
    await Promise.all([
      fetchBalances(boxId),
      fetchCurrentSession(boxId),
      fetchSessions(boxId),
      fetchMovements({ cash_box_id: boxId })
    ])
  } catch (e) {
    console.error('[CashBoxDetail] Error fetching data:', e)
  }

  // Fetch user names for sessions
  const userIds = new Set<string>()
  if (currentSession.value?.user_id) userIds.add(currentSession.value.user_id)
  for (const s of sessions.value) {
    if (s.user_id) userIds.add(s.user_id)
  }

  if (userIds.size > 0) {
    try {
      const users = await $fetch<{ id: string; name: string }[]>('/api/access-control/users/batch', {
        query: { ids: Array.from(userIds).join(',') }
      })
      for (const u of users) {
        sessionUserNames.value.set(u.id, u.name)
      }
    } catch {}
  }
})

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(num)
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatShortDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatTime = (date: string | null | undefined) => {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getUserName = (userId: any) => {
  if (!userId || typeof userId !== 'string') return '—'
  return sessionUserNames.value.get(userId) ?? userId.slice(0, 8)
}

const sessionStatusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Abierta', color: 'success' },
  CLOSED: { label: 'Cerrada', color: 'neutral' },
  FORCED: { label: 'Forzado', color: 'error' }
}

const getSessionStatus = (status: string) => sessionStatusConfig[status] ?? { label: status, color: 'neutral' }

const boxHasActiveSession = computed(() => box.value?.status === 'OPEN' && currentSession.value)

const isSessionFromDifferentDay = computed(() => {
  if (!currentSession.value?.opened_at) return false
  const openedDate = new Date(currentSession.value.opened_at).toDateString()
  const today = new Date().toDateString()
  return openedDate !== today
})

const sessionModalOpen = ref(false)
const sessionAction = ref<'open' | 'close'>('open')
const sessionForm = reactive({ opening_balance: 0, actual_balance: 0, notes: '' })
const sessionSaving = ref(false)
const canEnterInitialBalance = computed(() => box.value?.can_set_initial_balance === true)
const expectedBalance = ref(0)
const balanceDifference = ref(0)

const openSessionModal = async (action: 'open' | 'close') => {
  if (sessionSaving.value) return
  sessionAction.value = action
  if (action === 'open') {
    const currentBalances = await fetchBalances(boxId)
    sessionForm.opening_balance = Number(currentBalances.find(balance => balance.currency_code === box.value?.currency_code)?.balance ?? 0)
  } else {
    sessionForm.notes = ''
    const currentBalances = await fetchBalances(boxId)
    expectedBalance.value = Number(currentBalances.find(balance => balance.currency_code === box.value?.currency_code)?.balance ?? 0)
    sessionForm.actual_balance = expectedBalance.value
    balanceDifference.value = 0
  }
  sessionModalOpen.value = true
}

const handleSession = async () => {
  if (sessionSaving.value) return
  sessionSaving.value = true
  try {
    if (sessionAction.value === 'open') {
      const payload = { opening_balance: Number(sessionForm.opening_balance) || 0 }
      console.log('[CashBox] Opening session with:', payload)
      await openSession(boxId, payload)
      toast.add({ title: 'Sesión abierta', color: 'success' })
    } else {
      await closeSession(boxId, {
        actual_balance: Number(sessionForm.actual_balance) || 0,
        notes: sessionForm.notes.trim() || undefined
      })
      toast.add({ title: 'Sesión cerrada', color: 'success' })
    }
    sessionModalOpen.value = false
    await Promise.all([fetchOne(boxId), fetchCurrentSession(boxId), fetchSessions(boxId)])
  } catch (e: any) {
    console.error('[CashBox] Error:', JSON.stringify(e?.data || e?.response?._data || e, null, 2))
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.response?._data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    sessionSaving.value = false
  }
}

watch(
  () => sessionForm.actual_balance,
  (val) => {
    balanceDifference.value = Number(val || 0) - expectedBalance.value
  }
)

const hasDifference = computed(() => Math.abs(balanceDifference.value) > 0.01)
const canCloseSession = computed(() => {
  if (!hasDifference.value) return true
  return sessionForm.notes.trim().length > 0
})

const columns = cashBoxMovementColumns({
  onSortFieldSelect,
  onReverse: openReverseModal,
  canReverse: movement => canReverseMovement.value
    && movement.reference_type === 'manual_cash_movement'
    && !reversedMovementIds.value.has(movement.id)
    && Boolean(boxHasActiveSession.value)
})

const filterFields: FilterField[] = [
  { id: 'type', label: 'Filtrar por tipo...', class: 'w-40' },
  { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Saldo', value: 'balance_after' }
]

// Movements tabs
const movementsTab = ref('today')
const movementsTabs = [
  { label: 'Hoy', icon: 'i-lucide-calendar-check', value: 'today', slot: 'today' },
  { label: 'Histórico', icon: 'i-lucide-history', value: 'history', slot: 'history' }
]
const todayMovements = computed(() => {
  const todayDate = today()
  return movements.value.filter((m) => {
    const moveDate = m.date?.split('T')[0]
    return moveDate === todayDate
  })
})

const sessionMovements = computed(() =>
  movements.value.filter(m => m.session_id === currentSession.value?.id)
)

const sessionIncome = computed(() => Number(currentSession.value?.total_income ?? 0))
const sessionExpenses = computed(() => Number(currentSession.value?.total_expenses ?? 0))

type MovementOperation = 'MANUAL_CREDIT' | 'MANUAL_DEBIT' | 'CHECK_TO_CASH' | 'CASH_TO_OWN_CHECK'
const movementModalOpen = ref(false)
const movementSaving = ref(false)
const checksLoading = ref(false)
const savedMovementId = ref<string | null>(null)
const availableChecks = ref<Check[]>([])
const movementForm = reactive({
  operation: 'MANUAL_CREDIT' as MovementOperation,
  concept: 'Aporte',
  amount: null as number | null,
  description: '',
  check_id: '',
  date: ''
})

const manualConcepts = [
  { label: 'Aporte de efectivo', value: 'Aporte' },
  { label: 'Gasto menor', value: 'Gasto menor' },
  { label: 'Viático', value: 'Viático' },
  { label: 'Retiro de efectivo', value: 'Retiro' },
  { label: 'Ajuste', value: 'Ajuste' },
  { label: 'Otro', value: 'Otro' }
]
const movementOperationOptions = computed(() => [
  ...(canCreateManualMovement.value ? [
    { label: 'Ingreso manual de efectivo', value: 'MANUAL_CREDIT' },
    { label: 'Egreso manual de efectivo', value: 'MANUAL_DEBIT' }
  ] : []),
  ...(canOperateChecks.value ? [
    { label: 'Cobrar cheque por ventanilla e ingresar a caja', value: 'CHECK_TO_CASH' },
    { label: 'Depositar desde caja y pagar cheque propio', value: 'CASH_TO_OWN_CHECK' }
  ] : [])
])
const isManualMovement = computed(() => movementForm.operation.startsWith('MANUAL_'))
const selectedCheck = computed(() => availableChecks.value.find(check => check.id === movementForm.check_id) ?? null)
const checkOptions = computed(() => availableChecks.value.map(check => ({
  label: `#${check.check_number} · ${check.bank_name} · ${formatCurrency(check.available_amount ?? check.amount, check.currency_code)}`,
  value: check.id
})))
const currentCashBalance = computed(() => Number(
  balances.value.find(balance => balance.currency_code === box.value?.currency_code)?.balance ?? 0
))
const movementAmount = computed(() => isManualMovement.value
  ? Number(movementForm.amount || 0)
  : Number(selectedCheck.value?.available_amount ?? selectedCheck.value?.amount ?? 0)
)
const movementIsOutflow = computed(() => ['MANUAL_DEBIT', 'CASH_TO_OWN_CHECK'].includes(movementForm.operation))
const resultingCashBalance = computed(() => currentCashBalance.value + (movementIsOutflow.value ? -movementAmount.value : movementAmount.value))
const canSaveMovement = computed(() => {
  if (!boxHasActiveSession.value || movementSaving.value || savedMovementId.value) return false
  if (!movementAmount.value || movementAmount.value <= 0 || resultingCashBalance.value < 0) return false
  if (isManualMovement.value) return Boolean(movementForm.concept && movementForm.description.trim())
  return Boolean(movementForm.check_id)
})

const localDateTimeValue = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

async function loadChecksForOperation(operation: MovementOperation) {
  if (!['CHECK_TO_CASH', 'CASH_TO_OWN_CHECK'].includes(operation)) return
  checksLoading.value = true
  try {
    availableChecks.value = operation === 'CHECK_TO_CASH'
      ? await checksService.findAll({ status: 'PENDING', is_own: false })
      : await checksService.findAll({ status: 'CONFIRMED', is_own: true })
    availableChecks.value = availableChecks.value.filter(check => check.currency_code === box.value?.currency_code)
  } finally {
    checksLoading.value = false
  }
}

async function openMovementModal() {
  savedMovementId.value = null
  movementForm.operation = (movementOperationOptions.value[0]?.value as MovementOperation) || 'MANUAL_CREDIT'
  movementForm.concept = 'Aporte'
  movementForm.amount = null
  movementForm.description = ''
  movementForm.check_id = ''
  movementForm.date = localDateTimeValue()
  availableChecks.value = []
  movementModalOpen.value = true
  await loadChecksForOperation(movementForm.operation)
}

watch(() => movementForm.operation, async (operation) => {
  movementForm.check_id = ''
  movementForm.amount = null
  if (!operation.startsWith('MANUAL_')) await loadChecksForOperation(operation)
})

async function refreshCashBoxActivity() {
  await Promise.all([
    fetchBalances(boxId),
    fetchCurrentSession(boxId),
    fetchMovements({ cash_box_id: boxId })
  ])
}

async function saveMovement() {
  if (movementSaving.value || !canSaveMovement.value) return
  movementSaving.value = true
  try {
    if (movementForm.operation === 'MANUAL_CREDIT' || movementForm.operation === 'MANUAL_DEBIT') {
      const movement = await createMovement({
        cash_box_id: boxId,
        type: movementForm.operation === 'MANUAL_DEBIT' ? 'DEBIT' : 'CREDIT',
        amount: movementAmount.value,
        currency_code: box.value?.currency_code || 'ARS',
        concept: movementForm.concept,
        description: movementForm.description.trim(),
        date: movementForm.date
      })
      savedMovementId.value = movement.id
    } else if (movementForm.operation === 'CHECK_TO_CASH') {
      await checksService.collectInCashBox(movementForm.check_id, boxId, movementForm.date)
      await fetchMovements({ cash_box_id: boxId })
      savedMovementId.value = movements.value.find(movement =>
        movement.reference_type === 'check_cash_collection' && movement.reference_id === movementForm.check_id
      )?.id ?? null
    } else {
      await checksService.settleOwnCheckFromCashBox(movementForm.check_id, boxId, movementForm.date)
      await fetchMovements({ cash_box_id: boxId })
      savedMovementId.value = movements.value.find(movement =>
        movement.reference_type === 'check_cash_payment' && movement.reference_id === movementForm.check_id
      )?.id ?? null
    }
    await refreshCashBoxActivity()
    toast.add({ title: 'Movimiento registrado', description: 'El saldo y la sesión fueron actualizados.', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo registrar el movimiento',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  } finally {
    movementSaving.value = false
  }
}

const reverseModalOpen = ref(false)
const reversingMovement = ref<CashBoxMovement | null>(null)
const reverseReason = ref('')
const reverseSaving = ref(false)
const reversedMovementIds = computed(() => new Set(
  movements.value
    .filter(movement => movement.reference_type === 'manual_cash_movement_reversal' && movement.reference_id)
    .map(movement => movement.reference_id as string)
))
function openReverseModal(movement: CashBoxMovement) {
  reversingMovement.value = movement
  reverseReason.value = ''
  reverseModalOpen.value = true
}
async function submitReversal() {
  if (reverseSaving.value || !reversingMovement.value || !reverseReason.value.trim()) return
  reverseSaving.value = true
  try {
    await reverseMovement(reversingMovement.value.id, { cash_box_id: boxId, reason: reverseReason.value.trim() })
    reverseModalOpen.value = false
    await refreshCashBoxActivity()
    toast.add({ title: 'Movimiento anulado', description: 'Se registró el movimiento inverso.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo anular', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    reverseSaving.value = false
  }
}

const links = computed(() => [
  {
    label: 'Volver',
    icon: 'i-lucide-arrow-left',
    variant: 'ghost' as const,
    onClick: () => router.push('/erp/treasury/cash-boxes')
  },
  {
    label: 'Editar',
    icon: 'i-lucide-pencil',
    color: 'primary' as const,
    variant: 'solid' as const,
    to: `/erp/treasury/cash-boxes/${boxId}/edit`
  }
])
</script>

<template>
  <UPage v-if="box" class="space-y-6 px-4">
    <AppPageHeader
      :title="box.name"
      :description="`${box.type === 'MAIN' ? 'Principal' : box.type === 'FIXED' ? 'Fija' : 'Registradora'} · ${box.status === 'OPEN' ? 'Abierta' : 'Cerrada'}`"
      :links="links"
    />

    <UAlert
      v-if="box.can_set_initial_balance"
      color="info"
      variant="soft"
      icon="i-lucide-banknote"
      title="Saldo inicial pendiente"
      description="Esta caja todavía no tiene movimientos. Registrá el dinero disponible antes de abrir la primera sesión; después quedará bloqueado para preservar el historial."
    >
      <template #actions>
        <UButton
          label="Establecer saldo inicial"
          icon="i-lucide-pencil"
          color="info"
          variant="outline"
          :to="`/erp/treasury/cash-boxes/${boxId}/edit`"
        />
      </template>
    </UAlert>

    <!-- SESSION STATUS -->
    <div
      v-if="boxHasActiveSession"
      class="p-5 rounded-xl border"
      :class="isSessionFromDifferentDay ? 'border-warning/50 bg-warning/5' : 'border-success/50 bg-success/5'"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-lg flex items-center justify-center"
            :class="isSessionFromDifferentDay ? 'bg-warning/10' : 'bg-success/10'"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-5"
              :class="isSessionFromDifferentDay ? 'text-warning' : 'text-success'"
            />
          </div>
          <div>
            <p class="text-sm font-semibold">Sesión activa</p>
            <p class="text-xs text-muted">Abierta el {{ formatDate(currentSession.opened_at) }}</p>
          </div>
        </div>
        <UBadge
          v-if="isSessionFromDifferentDay"
          label="Sesión del día anterior"
          color="warning"
          variant="soft"
          size="sm"
        />
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <p class="text-xs text-muted font-medium uppercase">Abierta por</p>
          <p class="text-sm font-semibold">{{ getUserName(currentSession.user_id) }}</p>
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Fecha apertura</p>
          <p class="text-sm font-semibold">{{ formatShortDate(currentSession.opened_at) }}</p>
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Saldo apertura</p>
          <p class="text-sm font-semibold">{{ formatCurrency(currentSession.opening_balance) }}</p>
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Ingresos</p>
          <p class="text-sm font-semibold text-success">+{{ formatCurrency(sessionIncome) }}</p>
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Egresos</p>
          <p class="text-sm font-semibold text-error">-{{ formatCurrency(sessionExpenses) }}</p>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-default">
        <UButton
          v-if="movementOperationOptions.length"
          label="Registrar movimiento"
          icon="i-lucide-arrow-left-right"
          color="primary"
          size="sm"
          @click="openMovementModal"
        />
        <UButton
          label="Cerrar sesión"
          icon="i-lucide-lock"
          color="warning"
          variant="outline"
          size="sm"
          @click="openSessionModal('close')"
        />
      </div>
    </div>

    <div v-else class="p-5 rounded-xl border border-default bg-default text-center">
      <UIcon name="i-lucide-lock" class="size-8 mx-auto mb-2 text-muted opacity-50" />
      <p class="text-sm text-muted mb-3">No hay sesión abierta</p>
      <UButton
        label="Abrir sesión"
        icon="i-lucide-lock-open"
        color="success"
        size="sm"
        @click="openSessionModal('open')"
      />
    </div>

    <!-- BALANCES (solo cuando hay sesión abierta) -->
    <div v-if="boxHasActiveSession" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Saldo apertura</p>
        <p class="text-xl font-bold mt-1">
          {{ formatCurrency(currentSession?.opening_balance ?? box.opening_balance ?? 0) }}
        </p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Ingresos sesión</p>
        <p class="text-xl font-bold mt-1 text-success">+{{ formatCurrency(sessionIncome) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Egresos sesión</p>
        <p class="text-xl font-bold mt-1 text-error">-{{ formatCurrency(sessionExpenses) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Saldo sesión</p>
        <p class="text-xl font-bold mt-1 text-primary">
          {{
            formatCurrency(
              Number(currentSession?.opening_balance ?? box.opening_balance ?? 0) +
                sessionIncome -
                sessionExpenses
            )
          }}
        </p>
      </div>
    </div>

    <!-- MOVEMENTS TABS -->
    <UTabs v-model="movementsTab" :items="movementsTabs" variant="link" :ui="{ trigger: 'cursor-pointer' }">
      <template #today>
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar-check" class="size-4 text-success" />
              <h3 class="text-sm font-semibold">Movimientos de hoy</h3>
              <UBadge :label="`${todayMovements.length}`" color="success" variant="soft" size="xs" />
            </div>
          </template>
          <div v-if="todayMovements.length === 0" class="text-center py-8 text-muted text-sm">
            <UIcon name="i-lucide-inbox" class="size-8 mx-auto mb-2 opacity-30" />
            No hay movimientos hoy
          </div>
          <div v-else class="overflow-x-auto">
            <LogisticaTable
              :loading="false"
              :data="todayMovements"
              :columns="columns"
              :filter-fields="filterFields"
              :sort-fields="sortFields"
              v-model:sorting="sorting"
            />
          </div>
        </UPageCard>
      </template>

      <template #history>
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-history" class="size-4 text-muted" />
              <h3 class="text-sm font-semibold">Historial completo</h3>
              <UBadge :label="`${movements.length}`" color="neutral" variant="soft" size="xs" />
            </div>
          </template>
          <div v-if="movements.length === 0" class="text-center py-8 text-muted text-sm">
            <UIcon name="i-lucide-inbox" class="size-8 mx-auto mb-2 opacity-30" />
            No hay movimientos registrados
          </div>
          <div v-else class="overflow-x-auto">
            <LogisticaTable
              :loading="false"
              :data="movements"
              :columns="columns"
              :filter-fields="filterFields"
              :sort-fields="sortFields"
              v-model:sorting="sorting"
            />
          </div>
        </UPageCard>
      </template>
    </UTabs>

    <!-- SESSION HISTORY -->
    <UPageCard variant="subtle" class="mt-6">
      <template #header>
        <h3 class="text-sm font-semibold">Historial de sesiones</h3>
      </template>
      <div v-if="!sessions || sessions.length === 0" class="text-center py-8 text-muted text-sm">
        No hay sesiones registradas
      </div>
      <div v-else class="overflow-x-auto py-4">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="text-left py-3 px-3 text-xs text-muted font-medium">Apertura</th>
              <th class="text-left py-3 px-3 text-xs text-muted font-medium">Cierre</th>
              <th class="text-left py-3 px-3 text-xs text-muted font-medium">Usuario</th>
              <th class="text-right py-3 px-3 text-xs text-muted font-medium">Saldo ini.</th>
              <th class="text-right py-3 px-3 text-xs text-muted font-medium">Ingresos</th>
              <th class="text-right py-3 px-3 text-xs text-muted font-medium">Egresos</th>
              <th class="text-right py-3 px-3 text-xs text-muted font-medium">Saldo fin (contado)</th>
              <th class="text-right py-3 px-3 text-xs text-muted font-medium">Diferencia</th>
              <th class="text-center py-3 px-3 text-xs text-muted font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in sessions || []"
              :key="session.id"
              class="border-b border-default last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
                  <span>{{ formatShortDate(session.opened_at) }}</span>
                </div>
                <p class="text-xs text-muted mt-0.5">{{ formatTime(session.opened_at) }}</p>
              </td>
              <td class="py-3 px-3">
                <template v-if="session?.closed_at">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar-check" class="size-3.5 text-muted" />
                    <span>{{ formatShortDate(session.closed_at) }}</span>
                  </div>
                  <p class="text-xs text-muted mt-0.5">{{ formatTime(session.closed_at) }}</p>
                </template>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <UIcon name="i-lucide-user" class="size-3 text-primary" />
                  </div>
                  <span class="text-xs">{{ getUserName(session?.user_id) }}</span>
                </div>
              </td>
              <td class="py-3 px-3 text-right font-medium">{{ formatCurrency(session.opening_balance) }}</td>
              <td class="py-3 px-3 text-right text-success font-medium">+{{ formatCurrency(session.total_income) }}</td>
              <td class="py-3 px-3 text-right text-error font-medium">-{{ formatCurrency(session.total_expenses) }}</td>
              <td class="py-3 px-3 text-right font-semibold">
                {{ formatCurrency(session.actual_balance ?? session.closing_balance ?? session.opening_balance) }}
              </td>
              <td class="py-3 px-3 text-right">
                <span
                  v-if="session.difference != null && Number(session.difference) !== 0"
                  class="font-medium"
                  :class="Number(session.difference) > 0 ? 'text-success' : 'text-error'"
                >
                  {{ Number(session.difference) > 0 ? '+' : '' }}{{ formatCurrency(session.difference) }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="py-3 px-3 text-center">
                <UBadge
                  :label="getSessionStatus(session.status).label"
                  :color="getSessionStatus(session.status).color"
                  variant="soft"
                  size="xs"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <!-- SESSION MODAL -->
    <UModal
      v-model:open="sessionModalOpen"
      :title="sessionAction === 'open' ? 'Abrir sesión' : 'Cerrar sesión'"
      :ui="{ width: 'max-w-lg' }"
    >
      <template #body>
        <UForm :state="sessionForm" class="space-y-4" @submit="handleSession">
          <template v-if="sessionAction === 'open'">
            <UFormField
              label="Saldo de apertura"
              name="opening_balance"
              :description="canEnterInitialBalance ? 'Primera apertura: ingresá el efectivo inicial o dejalo en cero.' : 'Se toma automáticamente el saldo disponible de la caja.'"
            >
              <UInput v-model.number="sessionForm.opening_balance" type="number" min="0" :readonly="!canEnterInitialBalance" class="w-full" />
            </UFormField>
          </template>
          <template v-else>
            <div class="p-4 rounded-lg border border-default bg-muted/30">
              <p class="text-xs text-muted font-medium uppercase mb-2">Saldo esperado (según movimientos)</p>
              <p class="text-2xl font-bold text-primary">{{ formatCurrency(expectedBalance) }}</p>
            </div>
            <UFormField label="Saldo actual (contado)" name="actual_balance" required>
              <UInput v-model.number="sessionForm.actual_balance" type="number" />
            </UFormField>
            <div
              v-if="hasDifference"
              class="p-4 rounded-lg border"
              :class="balanceDifference > 0 ? 'border-success/50 bg-success/5' : 'border-error/50 bg-error/5'"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Diferencia</span>
                <span class="text-lg font-bold" :class="balanceDifference > 0 ? 'text-success' : 'text-error'">
                  {{ balanceDifference > 0 ? '+' : '' }}{{ formatCurrency(balanceDifference) }}
                </span>
              </div>
            </div>
            <UFormField
              :label="hasDifference ? 'Descripción (obligatoria)' : 'Descripción (opcional)'"
              name="notes"
              :required="hasDifference"
            >
              <UInput
                v-model="sessionForm.notes"
                :placeholder="hasDifference ? 'Explique la diferencia...' : 'Notas (opcional)'"
              />
            </UFormField>
          </template>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" :disabled="sessionSaving" @click="sessionModalOpen = false" />
            <UButton
              :label="sessionAction === 'open' ? 'Abrir' : 'Cerrar sesión'"
              :color="sessionAction === 'open' ? 'success' : 'warning'"
              type="submit"
              :loading="sessionSaving"
              :disabled="sessionSaving || !canCloseSession"
            />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal
      v-model:open="movementModalOpen"
      :title="savedMovementId ? 'Movimiento registrado' : 'Registrar movimiento de caja'"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <div class="space-y-5">
          <UAlert
            v-if="savedMovementId"
            color="success"
            variant="soft"
            icon="i-lucide-circle-check"
            title="El movimiento quedó confirmado"
            description="El saldo y los totales de la sesión ya fueron actualizados. Podés adjuntar un comprobante antes de finalizar."
          />

          <template v-else>
            <UFormField label="Operación" required>
              <USelect
                v-model="movementForm.operation"
                :items="movementOperationOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="movementForm.operation === 'CHECK_TO_CASH'"
              color="info"
              variant="soft"
              icon="i-lucide-badge-dollar-sign"
              title="Cobro por ventanilla"
              description="El cheque de tercero quedará cobrado y su importe ingresará como efectivo en esta caja."
            />
            <UAlert
              v-else-if="movementForm.operation === 'CASH_TO_OWN_CHECK'"
              color="warning"
              variant="soft"
              icon="i-lucide-landmark"
              title="Depósito y pago de cheque propio"
              description="El efectivo saldrá de la caja. En el banco quedarán registrados el depósito y el débito del cheque como dos movimientos vinculados."
            />

            <div v-if="isManualMovement" class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Concepto" required>
                <USelect
                  v-model="movementForm.concept"
                  :items="manualConcepts"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Importe" required>
                <UInput v-model.number="movementForm.amount" type="number" min="0.01" step="0.01" class="w-full" />
              </UFormField>
            </div>
            <UFormField v-else label="Cheque" required>
              <USelectMenu
                v-model="movementForm.check_id"
                :items="checkOptions"
                value-key="value"
                label-key="label"
                searchable
                :loading="checksLoading"
                class="w-full"
                :placeholder="checksLoading ? 'Cargando cheques...' : 'Seleccionar cheque'"
              />
              <p v-if="!checksLoading && checkOptions.length === 0" class="mt-2 text-xs text-warning">
                No hay cheques compatibles con esta operación y la moneda de la caja.
              </p>
            </UFormField>

            <UFormField label="Fecha y hora" required>
              <UInput v-model="movementForm.date" type="datetime-local" class="w-full" />
            </UFormField>
            <UFormField v-if="isManualMovement" label="Descripción" required description="Indicá el motivo para que el movimiento sea auditable.">
              <UTextarea v-model="movementForm.description" :rows="3" class="w-full" placeholder="Detalle del ingreso o egreso..." />
            </UFormField>

            <div class="grid grid-cols-3 gap-3 rounded-xl border border-default bg-muted/20 p-4 text-sm">
              <div>
                <p class="text-xs text-muted">Saldo actual</p>
                <p class="font-semibold">{{ formatCurrency(currentCashBalance, box.currency_code || 'ARS') }}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-muted">Movimiento</p>
                <p class="font-semibold" :class="movementIsOutflow ? 'text-error' : 'text-success'">
                  {{ movementIsOutflow ? '-' : '+' }}{{ formatCurrency(movementAmount, box.currency_code || 'ARS') }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-muted">Saldo resultante</p>
                <p class="font-bold" :class="resultingCashBalance < 0 ? 'text-error' : 'text-primary'">
                  {{ formatCurrency(resultingCashBalance, box.currency_code || 'ARS') }}
                </p>
              </div>
            </div>
            <UAlert
              v-if="resultingCashBalance < 0"
              color="error"
              variant="soft"
              title="Saldo insuficiente"
              description="El egreso no puede superar el efectivo disponible en la caja."
            />
          </template>

          <UiAttachmentManager
            v-if="savedMovementId"
            entity-type="cash_box_movement"
            :entity-id="savedMovementId"
            :max-files="5"
            default-expanded
          />

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              :label="savedMovementId ? 'Finalizar' : 'Cancelar'"
              variant="ghost"
              :disabled="movementSaving"
              @click="() => { movementModalOpen = false }"
            />
            <UButton
              v-if="!savedMovementId"
              label="Confirmar movimiento"
              icon="i-lucide-check"
              :loading="movementSaving"
              :disabled="!canSaveMovement"
              @click="saveMovement"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="reverseModalOpen" title="Anular movimiento manual" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-history"
            title="Se registrará un movimiento inverso"
            description="El movimiento original permanecerá visible para conservar la auditoría."
          />
          <div v-if="reversingMovement" class="rounded-lg border border-default p-4 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-muted">Movimiento original</span>
              <strong>{{ formatCurrency(reversingMovement.amount, reversingMovement.currency_code) }}</strong>
            </div>
            <p class="mt-2 text-muted">{{ reversingMovement.description }}</p>
          </div>
          <UFormField label="Motivo de la anulación" required>
            <UTextarea v-model="reverseReason" :rows="3" class="w-full" placeholder="Explicá por qué se revierte..." />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="ghost" :disabled="reverseSaving" @click="() => { reverseModalOpen = false }" />
            <UButton
              label="Registrar reversión"
              color="error"
              icon="i-lucide-undo-2"
              :loading="reverseSaving"
              :disabled="reverseSaving || !reverseReason.trim()"
              @click="submitReversal"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
