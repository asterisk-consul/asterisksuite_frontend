<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useCashBoxMovements } from '~/modulos/erp/cash-box-movements/composables/useCashBoxMovements'
import { cashBoxMovementColumns, MOVEMENT_TYPE_CONFIG } from '~/modulos/erp/cash-box-movements/movement-columns'

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

const { movements, init: fetchMovements } = useCashBoxMovements()

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
const expectedBalance = ref(0)
const balanceDifference = ref(0)

const openSessionModal = (action: 'open' | 'close') => {
  sessionAction.value = action
  if (action === 'open') {
    sessionForm.opening_balance = Number(box.value?.opening_balance) || 0
  } else {
    sessionForm.notes = ''
    const session = currentSession.value
    if (session) {
      expectedBalance.value =
        Number(session.opening_balance || 0) + Number(session.total_income || 0) - Number(session.total_expenses || 0)
    } else {
      expectedBalance.value = Number(box.value?.opening_balance || 0)
    }
    sessionForm.actual_balance = expectedBalance.value
    balanceDifference.value = 0
  }
  sessionModalOpen.value = true
}

const handleSession = async () => {
  sessionSaving.value = true
  try {
    if (sessionAction.value === 'open') {
      const payload = { opening_balance: Number(sessionForm.opening_balance) || 0 }
      console.log('[CashBox] Opening session with:', payload)
      await openSession(boxId, payload)
      toast.add({ title: 'Sesión abierta', color: 'success' })
    } else {
      await closeSession(boxId, { actual_balance: Number(sessionForm.actual_balance) || 0 })
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

const columns = cashBoxMovementColumns({ onSortFieldSelect })

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

const realIncome = computed(() =>
  sessionMovements.value
    .filter(m => Number(m.amount) > 0)
    .reduce((sum, m) => sum + Number(m.amount), 0)
)

const realExpenses = computed(() =>
  sessionMovements.value
    .filter(m => Number(m.amount) < 0)
    .reduce((sum, m) => sum + Math.abs(Number(m.amount)), 0)
)

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
          <p class="text-sm font-semibold text-success">+{{ formatCurrency(realIncome) }}</p>
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Egresos</p>
          <p class="text-sm font-semibold text-error">-{{ formatCurrency(realExpenses) }}</p>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-default">
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
        <p class="text-xl font-bold mt-1 text-success">+{{ formatCurrency(realIncome) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Egresos sesión</p>
        <p class="text-xl font-bold mt-1 text-error">-{{ formatCurrency(realExpenses) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Saldo sesión</p>
        <p class="text-xl font-bold mt-1 text-primary">
          {{
            formatCurrency(
              Number(currentSession?.opening_balance ?? box.opening_balance ?? 0) +
                realIncome -
                realExpenses
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
            <UFormField label="Saldo de apertura" name="opening_balance">
              <UInput v-model.number="sessionForm.opening_balance" type="number" />
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
            <UButton label="Cancelar" variant="ghost" @click="sessionModalOpen = false" />
            <UButton
              :label="sessionAction === 'open' ? 'Abrir' : 'Cerrar sesión'"
              :color="sessionAction === 'open' ? 'success' : 'warning'"
              type="submit"
              :loading="sessionSaving"
              :disabled="!canCloseSession"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </UPage>
</template>
