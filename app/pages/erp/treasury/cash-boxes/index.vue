<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import type { CashBox } from '~/modulos/erp/cash-boxes/types/cash-boxes.types'

const {
  cashBoxes,
  loading,
  init,
  remove,
  openSession,
  closeSession,
  fetchCurrentSession,
  fetchBalances,
  balances,
  currentSession
} = useCashBoxes()

const router = useRouter()
const toast = useToast()

const searchQuery = ref('')
const deleteModalOpen = ref(false)
const deletingBox = ref<CashBox | null>(null)

const sessionModalOpen = ref(false)
const sessionBox = ref<CashBox | null>(null)
const sessionAction = ref<'open' | 'close'>('open')
const sessionForm = reactive({ opening_balance: 0, actual_balance: 0, notes: '' })
const sessionSaving = ref(false)
const expectedBalance = ref(0)
const balanceDifference = ref(0)

const forceCloseModalOpen = ref(false)
const forceCloseBox = ref<CashBox | null>(null)
const forceCloseForm = reactive({ actual_balance: 0, reason: '' })
const forceCloseSaving = ref(false)

// Transfer modal state
const transferModalOpen = ref(false)
const transferSourceBox = ref<CashBox | null>(null)
const transferForm = reactive({ target_box_id: '', amount: 0, notes: '' })
const transferSaving = ref(false)

const availableTargetBoxes = computed(() => {
  if (!transferSourceBox.value) return []
  return cashBoxes.value.filter((b) => b.id !== transferSourceBox.value?.id && b.active && b.status === 'OPEN')
})

onMounted(() => init())

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

const isSessionFromDifferentDay = (box: CashBox): boolean => {
  if (!box.current_session?.opened_at) return false
  const openedDate = new Date(box.current_session.opened_at).toDateString()
  const today = new Date().toDateString()
  return openedDate !== today
}

const BOX_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  MAIN: { label: 'Principal', icon: 'i-lucide-crown', color: 'text-warning', bg: 'bg-warning/10' },
  FIXED: { label: 'Fija', icon: 'i-lucide-landmark', color: 'text-primary', bg: 'bg-primary/10' },
  REGISTER: { label: 'Registradora', icon: 'i-lucide-monitor', color: 'text-info', bg: 'bg-info/10' }
}

const filteredBoxes = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return cashBoxes.value
  return cashBoxes.value.filter((b) => b.name?.toLowerCase().includes(q) || b.type?.toLowerCase().includes(q))
})

const openBoxes = computed(() => filteredBoxes.value.filter((b) => b.status === 'OPEN'))
const closedBoxes = computed(() => filteredBoxes.value.filter((b) => b.status === 'CLOSED'))

const totalBalance = computed(() => cashBoxes.value.reduce((sum, b) => sum + (Number(b.opening_balance) || 0), 0))

const openSessionsCount = computed(() => openBoxes.value.length)
const needAttention = computed(() => openBoxes.value.filter((b) => isSessionFromDifferentDay(b)))

const confirmDelete = (box: CashBox) => {
  const balance = Number(box.opening_balance) || 0
  if (balance !== 0) {
    // Has balance - show transfer modal first
    transferSourceBox.value = box
    transferForm.target_box_id = ''
    transferForm.amount = balance
    transferForm.notes = ''
    transferModalOpen.value = true
    return
  }
  deletingBox.value = box
  deleteModalOpen.value = true
}

const handleTransferAndDelete = async () => {
  if (!transferSourceBox.value || !transferForm.target_box_id) return

  transferSaving.value = true
  try {
    // Create transfer between boxes
    await $fetch('/api/logistica/cash-box-transfers', {
      method: 'POST',
      body: {
        from_cash_box_id: transferSourceBox.value.id,
        to_cash_box_id: transferForm.target_box_id,
        amount: transferForm.amount,
        notes: transferForm.notes || `Transferencia para eliminar caja ${transferSourceBox.value.name}`
      }
    })

    toast.add({ title: 'Transferencia realizada', color: 'success' })
    transferModalOpen.value = false

    // Now delete the box
    await remove(transferSourceBox.value.id)
    toast.add({ title: 'Caja eliminada', color: 'success' })
  } catch (e: any) {
    toast.add({
      title: 'Error en la transferencia',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    transferSaving.value = false
  }
}

const handleDelete = async () => {
  if (!deletingBox.value) return
  try {
    await remove(deletingBox.value.id)
    toast.add({ title: 'Caja eliminada', color: 'success' })
    deleteModalOpen.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al eliminar',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

const openSessionModal = (box: CashBox) => {
  if (isSessionFromDifferentDay(box)) {
    forceCloseBox.value = box
    forceCloseForm.actual_balance = 0
    forceCloseForm.reason = ''
    forceCloseModalOpen.value = true
    return
  }
  sessionBox.value = box
  sessionAction.value = 'open'
  sessionForm.opening_balance = box.opening_balance ?? 0
  sessionModalOpen.value = true
}

const closeSessionModal = async (box: CashBox) => {
  sessionBox.value = box
  sessionAction.value = 'close'
  sessionForm.actual_balance = 0
  sessionForm.notes = ''

  // Calculate expected balance from session data
  const session = box.current_session
  if (session) {
    expectedBalance.value =
      Number(session.opening_balance || 0) + Number(session.total_income || 0) - Number(session.total_expenses || 0)
  } else {
    expectedBalance.value = Number(box.opening_balance || 0)
  }
  balanceDifference.value = 0

  sessionModalOpen.value = true
}

const handleSession = async () => {
  if (!sessionBox.value) return
  sessionSaving.value = true
  try {
    if (sessionAction.value === 'open') {
      await openSession(sessionBox.value.id, { opening_balance: sessionForm.opening_balance })
      toast.add({ title: 'Sesión abierta', color: 'success' })
    } else {
      await closeSession(sessionBox.value.id, { actual_balance: sessionForm.actual_balance })
      toast.add({ title: 'Sesión cerrada', color: 'success' })
    }
    sessionModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    sessionSaving.value = false
  }
}

const handleForceClose = async () => {
  if (!forceCloseBox.value) return
  forceCloseSaving.value = true
  try {
    await closeSession(forceCloseBox.value.id, { actual_balance: forceCloseForm.actual_balance })
    toast.add({ title: 'Sesión cerrada (forzado)', color: 'warning' })
    forceCloseModalOpen.value = false
    forceCloseBox.value = null
  } catch (e: any) {
    toast.add({
      title: 'Error al cerrar',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    forceCloseSaving.value = false
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

const goToDetail = (box: CashBox) => {
  router.push(`/erp/treasury/cash-boxes/${box.id}`)
}

const goToEdit = (box: CashBox) => {
  router.push(`/erp/treasury/cash-boxes/${box.id}/edit`)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Cajas" description="Gestión de cajas y sesiones">
      <template #links>
        <UButton
          label="Nueva caja"
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          @click="router.push('/erp/treasury/cash-boxes/create')"
        />
      </template>
    </AppPageHeader>

    <!-- ALERT: SESSIONS NEED CLOSING -->
    <UAlert
      v-if="needAttention.length > 0"
      icon="i-lucide-alert-triangle"
      color="warning"
      variant="subtle"
      title="Sesiones del día anterior"
      :description="`Hay ${needAttention.length} caja(s) con sesión abierta de otro día. Deben cerrarse antes de usarlas.`"
    />

    <!-- SUMMARY -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
      <div class="flex items-center gap-4 p-4 rounded-xl border border-default bg-default">
        <div class="size-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-lock-open" class="size-6 text-success" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Abiertas</p>
          <p class="text-2xl font-bold">{{ openSessionsCount }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4 p-4 rounded-xl border border-default bg-default">
        <div class="size-12 rounded-xl bg-neutral/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-lock" class="size-6 text-muted" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Cerradas</p>
          <p class="text-2xl font-bold">{{ closedBoxes.length }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4 p-4 rounded-xl border border-default bg-default">
        <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-wallet" class="size-6 text-primary" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Saldo total</p>
          <p class="text-2xl font-bold">{{ formatCurrency(totalBalance) }}</p>
        </div>
      </div>
    </div>

    <!-- SEARCH -->
    <UInput v-model="searchQuery" placeholder="Buscar por nombre o tipo..." icon="i-lucide-search" class="max-w-md" />

    <!-- CASH BOXES GRID -->
    <div v-if="loading" class="flex justify-center py-12">
      <ULoader />
    </div>

    <div v-else-if="filteredBoxes.length === 0" class="text-center py-12 text-muted">
      <UIcon name="i-lucide-wallet" class="size-12 mx-auto mb-3 opacity-30" />
      <p>No hay cajas registradas</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
      <div
        v-for="box in filteredBoxes"
        :key="box.id"
        class="group relative p-5 rounded-xl border transition-all cursor-pointer"
        :class="
          box.status === 'OPEN'
            ? 'border-success/50 bg-success/5 hover:border-success hover:shadow-md'
            : 'border-default bg-default hover:border-primary/50 hover:shadow-md'
        "
        @click="goToDetail(box)"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-lg flex items-center justify-center shrink-0"
              :class="BOX_TYPE_CONFIG[box.type]?.bg ?? 'bg-muted/10'"
            >
              <UIcon
                :name="BOX_TYPE_CONFIG[box.type]?.icon ?? 'i-lucide-circle-dot'"
                class="size-5"
                :class="BOX_TYPE_CONFIG[box.type]?.color ?? 'text-muted'"
              />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{{ box.name }}</p>
              <p class="text-xs text-muted">{{ BOX_TYPE_CONFIG[box.type]?.label ?? box.type }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge v-if="box.is_main" label="Principal" color="warning" variant="soft" size="xs" />
            <UBadge
              :label="box.status === 'OPEN' ? 'Abierta' : 'Cerrada'"
              :color="box.status === 'OPEN' ? 'success' : 'neutral'"
              variant="soft"
              size="xs"
            />
          </div>
        </div>

        <!-- Session Warning -->
        <div
          v-if="box.status === 'OPEN' && isSessionFromDifferentDay(box)"
          class="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-triangle" class="size-4 text-warning shrink-0" />
            <p class="text-xs text-warning font-medium">Sesión del día anterior — cerrar antes de usar</p>
          </div>
        </div>

        <!-- Session Info -->
        <div
          v-if="box.status === 'OPEN' && box.current_session"
          class="mb-4 p-3 rounded-lg bg-success/5 border border-success/20"
        >
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-lucide-clock" class="size-3.5 text-success" />
            <span class="text-xs text-success font-medium">Sesión activa</span>
          </div>
          <p class="text-xs text-muted">Abrió: {{ formatDate(box.current_session.opened_at) }}</p>
          <p class="text-xs text-muted">Saldo apertura: {{ formatCurrency(box.current_session.opening_balance) }}</p>
        </div>

        <!-- Balance -->
        <div class="mb-4">
          <p class="text-xs text-muted font-medium uppercase mb-1">Saldo</p>
          <p class="text-2xl font-bold" :class="Number(box.opening_balance) >= 0 ? 'text-foreground' : 'text-error'">
            {{ formatCurrency(box.opening_balance) }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-3 border-t border-default">
          <UButton
            v-if="box.status === 'CLOSED'"
            label="Abrir"
            icon="i-lucide-lock-open"
            color="success"
            variant="outline"
            size="xs"
            @click.stop="openSessionModal(box)"
          />
          <UButton
            v-else
            label="Cerrar"
            icon="i-lucide-lock"
            color="warning"
            variant="outline"
            size="xs"
            @click.stop="closeSessionModal(box)"
          />
          <div class="flex-1" />
          <UButton icon="i-lucide-eye" variant="ghost" size="xs" @click.stop="goToDetail(box)" />
          <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click.stop="goToEdit(box)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click.stop="confirmDelete(box)" />
        </div>
      </div>
    </div>

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar caja">
      <template #body>
        <p>
          ¿Estás seguro de que deseas eliminar la caja
          <strong>{{ deletingBox?.name }}</strong>
          ?
        </p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" :loading="sessionSaving" @click="handleDelete" />
        </div>
      </template>
    </UModal>

    <!-- SESSION MODAL -->
    <UModal
      v-model:open="sessionModalOpen"
      :title="sessionAction === 'open' ? 'Abrir sesión' : 'Cerrar sesión'"
      :ui="{ width: 'max-w-lg' }"
    >
      <template #body>
        <UForm :state="sessionForm" class="space-y-4" @submit="handleSession">
          <!-- OPEN SESSION -->
          <template v-if="sessionAction === 'open'">
            <UFormField label="Saldo de apertura" name="opening_balance">
              <UInput v-model.number="sessionForm.opening_balance" type="number" />
            </UFormField>
          </template>

          <!-- CLOSE SESSION -->
          <template v-else>
            <!-- EXPECTED BALANCE -->
            <div class="p-4 rounded-lg border border-default bg-muted/30">
              <p class="text-xs text-muted font-medium uppercase mb-2">Saldo esperado (según movimientos)</p>
              <p class="text-2xl font-bold text-primary">{{ formatCurrency(expectedBalance) }}</p>
              <div class="mt-2 space-y-1 text-xs text-muted">
                <p>
                  Saldo apertura:
                  {{ formatCurrency(sessionBox?.current_session?.opening_balance ?? sessionBox?.opening_balance ?? 0) }}
                </p>
                <p>
                  Ingresos:
                  <span class="text-success">
                    +{{ formatCurrency(sessionBox?.current_session?.total_income ?? 0) }}
                  </span>
                </p>
                <p>
                  Egresos:
                  <span class="text-error">
                    -{{ formatCurrency(sessionBox?.current_session?.total_expenses ?? 0) }}
                  </span>
                </p>
              </div>
            </div>

            <!-- ACTUAL BALANCE INPUT -->
            <UFormField label="Saldo actual (contado)" name="actual_balance" required>
              <UInput v-model.number="sessionForm.actual_balance" type="number" />
            </UFormField>

            <!-- DIFFERENCE ALERT -->
            <div
              v-if="hasDifference"
              class="p-4 rounded-lg border"
              :class="balanceDifference > 0 ? 'border-success/50 bg-success/5' : 'border-error/50 bg-error/5'"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="balanceDifference > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                    class="size-5"
                    :class="balanceDifference > 0 ? 'text-success' : 'text-error'"
                  />
                  <span class="text-sm font-medium">Diferencia</span>
                </div>
                <span class="text-lg font-bold" :class="balanceDifference > 0 ? 'text-success' : 'text-error'">
                  {{ balanceDifference > 0 ? '+' : '' }}{{ formatCurrency(balanceDifference) }}
                </span>
              </div>
              <p class="text-xs mt-2" :class="balanceDifference > 0 ? 'text-success' : 'text-error'">
                {{
                  balanceDifference > 0
                    ? 'Sobra dinero en caja — verificar sobrantes'
                    : 'Falta dinero en caja — verificar faltantes'
                }}
              </p>
            </div>

            <!-- NOTES (REQUIRED IF DIFFERENCE) -->
            <UFormField
              :label="hasDifference ? 'Descripción (obligatoria)' : 'Descripción (opcional)'"
              name="notes"
              :required="hasDifference"
            >
              <UInput
                v-model="sessionForm.notes"
                :placeholder="hasDifference ? 'Explique la diferencia de saldo...' : 'Notas del cierre (opcional)'"
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

    <!-- FORCE CLOSE MODAL -->
    <UModal v-model:open="forceCloseModalOpen" title="Cerrar sesión del día anterior">
      <template #body>
        <div class="space-y-4">
          <UAlert
            icon="i-lucide-alert-triangle"
            color="warning"
            variant="subtle"
            title="Sesión de otro día detectada"
            description="Esta caja tiene una sesión abierta de un día diferente al actual. Debe cerrarse antes de abrir una nueva."
          />
          <UFormField label="Saldo actual (contado)" name="actual_balance">
            <UInput v-model.number="forceCloseForm.actual_balance" type="number" />
          </UFormField>
          <UFormField label="Motivo del cierre" name="reason">
            <UInput v-model="forceCloseForm.reason" placeholder="Motivo del cierre..." />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="forceCloseModalOpen = false" />
            <UButton label="Cerrar sesión" color="warning" :loading="forceCloseSaving" @click="handleForceClose" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- TRANSFER MODAL (before delete) -->
    <UModal v-model:open="transferModalOpen" title="Transferir saldo antes de eliminar" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UAlert
            icon="i-lucide-alert-triangle"
            color="warning"
            variant="subtle"
            title="La caja tiene saldo"
            :description="`La caja ${transferSourceBox?.name} tiene un saldo de ${formatCurrency(transferSourceBox?.opening_balance ?? 0)}. Debe transferir este saldo a otra caja antes de eliminar.`"
          />

          <div class="p-4 rounded-lg border border-default bg-muted/30">
            <p class="text-xs text-muted font-medium uppercase">Saldo a transferir</p>
            <p class="text-xl font-bold text-primary">{{ formatCurrency(transferForm.amount) }}</p>
          </div>

          <UFormField label="Caja destino" name="target_box_id" required>
            <USelectMenu
              v-model="transferForm.target_box_id"
              :items="
                availableTargetBoxes.map((b) => ({
                  label: `${b.name} (${formatCurrency(b.opening_balance)})`,
                  value: b.id
                }))
              "
              placeholder="Seleccionar caja destino"
            />
          </UFormField>

          <UFormField label="Notas" name="notes">
            <UInput v-model="transferForm.notes" placeholder="Motivo de la transferencia..." />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="transferModalOpen = false" />
            <UButton
              label="Transferir y eliminar"
              color="error"
              :loading="transferSaving"
              :disabled="!transferForm.target_box_id"
              @click="handleTransferAndDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
