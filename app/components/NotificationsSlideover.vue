<script setup lang="ts">
import { useDashboard } from '~/composables/useDashboard'
import { useNotifications } from '~/composables/useNotifications'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'
import { useChecksService } from '~/modulos/erp/checks/service/checks.service'
import type { CheckNotificationAlerts } from '~/modulos/erp/checks/types/checks.types'

const { isNotificationsSlideoverOpen } = useDashboard()
const {
  items: notifications, unreadCount, loading, refresh, dismissNotification, markAllRead, remove,
  setCompanyAlertCount, refreshDismissals, dismissAlert: persistAlertDismissal, isAlertDismissed
} = useNotifications()
const toast = useToast()
const busyNotificationId = ref<string | null>(null)
const fiscalAlerts = ref<any[]>([])
const treasuryAlerts = ref<any[]>([])
const stockAlerts = ref<any[]>([])
const oldAccountAlerts = ref<any[]>([])
const checkAlerts = ref<CheckNotificationAlerts>({
  third_party: { count: 0, checks: [] },
  own: { count: 0, checks: [] },
  upcoming: { count: 0, checks: [], days: 30 }
})
const cardAlerts = ref<any | null>(null)
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canReadChecks = computed(() => isOwnerOrAdmin.value || hasPermission('checks.read'))

const cardSettlementAlertKey = 'CARD_SETTLEMENTS:PENDING'
const corporateCardAlertKey = 'CORPORATE_CARD:UPCOMING_INSTALLMENTS'
const showCardSettlementAlert = computed(() => Boolean(cardAlerts.value?.pending_collections) && !isAlertDismissed(cardSettlementAlertKey))
const showCorporateCardAlert = computed(() => Boolean(cardAlerts.value?.upcoming_installments_count) && !isAlertDismissed(corporateCardAlertKey))
const checkAlertCards = computed(() => {
  const cards = [
    {
      id: 'third-party' as const,
      key: 'CHECKS:THIRD_PARTY',
      title: 'Cheques de terceros por resolver',
      count: checkAlerts.value.third_party.count,
      description: 'Vencieron o vencen hoy. Depositá, cobrá en caja o aplicalos a un pago.',
      icon: 'i-lucide-calendar-clock',
      tone: 'warning' as const,
      path: '/erp/treasury/checks?alert=third-party'
    },
    {
      id: 'own' as const,
      key: 'CHECKS:OWN',
      title: 'Débitos de cheques propios por registrar',
      count: checkAlerts.value.own.count,
      description: 'Vencieron o vencen hoy. Verificá el extracto y registrá el débito cuando aparezca.',
      icon: 'i-lucide-landmark',
      tone: 'primary' as const,
      path: '/erp/treasury/checks?alert=own'
    },
    {
      id: 'upcoming' as const,
      key: 'CHECKS:UPCOMING',
      title: 'Cheques próximos a vencer',
      count: checkAlerts.value.upcoming.count,
      description: `Vencen dentro de los próximos ${checkAlerts.value.upcoming.days ?? 30} días. Prepará su gestión.`,
      icon: 'i-lucide-calendar-days',
      tone: 'info' as const,
      path: `/erp/treasury/checks?alert=upcoming&days=${checkAlerts.value.upcoming.days ?? 30}`
    }
  ]
  return cards.filter(card => card.count > 0 && !isAlertDismissed(card.key))
})
const totalItems = computed(() => notifications.value.length + fiscalAlerts.value.length + treasuryAlerts.value.length + stockAlerts.value.length + oldAccountAlerts.value.length + checkAlertCards.value.length + Number(showCardSettlementAlert.value) + Number(showCorporateCardAlert.value))

const fiscalAlertKey = (alert: any) => `FISCAL_AUTHORIZATION:${alert.id}`
const treasuryAlertKey = (alert: any) => `TREASURY_OBLIGATION:${alert.id}`
const stockAlertKey = (alert: any) => `STOCK_REPLENISHMENT:${alert.id}`
const accountAlertKey = (alert: any) => `OLD_ACCOUNT_BALANCE:${alert.id}`

function notificationIcon(type: string) {
  if (type === 'CHECK_DUE') return 'i-lucide-calendar-days'
  if (type === 'CHECK_OVERDUE') return 'i-lucide-calendar-clock'
  return 'i-lucide-user-round-check'
}

function notificationIconTone(type: string) {
  if (type === 'CHECK_DUE') return 'info'
  if (type === 'CHECK_OVERDUE') return 'warning'
  return 'primary'
}

function formatNotificationTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'ahora'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return `hace ${Math.floor(seconds / 86400)} d`
}

async function loadFiscalAlerts() {
  try {
    const rows = await $fetch<any[]>('/api/backend/fiscal-authorizations/alerts/current')
    fiscalAlerts.value = rows.filter(alert => !isAlertDismissed(fiscalAlertKey(alert)))
  } catch {
    fiscalAlerts.value = []
  }
}

async function loadCardAlerts() {
  if (!isOwnerOrAdmin.value && !hasPermission('card_settlements.read')) {
    cardAlerts.value = null
    return
  }
  try {
    cardAlerts.value = await useCreditCardsService().dashboard(7)
  } catch {
    cardAlerts.value = null
  }
}

async function loadTreasuryAlerts() {
  try {
    const rows = await $fetch<any[]>('/api/backend/treasury/obligations/notifications')
    treasuryAlerts.value = rows.filter(alert => !isAlertDismissed(treasuryAlertKey(alert)))
  } catch {
    // Usuarios sin acceso a Tesorería no deben ver estos vencimientos.
    treasuryAlerts.value = []
  }
}

async function loadCheckAlerts() {
  if (!isOwnerOrAdmin.value && !hasPermission('checks.read')) {
    checkAlerts.value = {
      third_party: { count: 0, checks: [] },
      own: { count: 0, checks: [] },
      upcoming: { count: 0, checks: [], days: 30 }
    }
    return
  }
  try {
    checkAlerts.value = await useChecksService().findNotificationAlerts(30)
  } catch {
    checkAlerts.value = {
      third_party: { count: 0, checks: [] },
      own: { count: 0, checks: [] },
      upcoming: { count: 0, checks: [], days: 30 }
    }
  }
}

async function loadOperationalAlerts() {
  const requests: Promise<void>[] = []
  if (hasPermission('stock.read')) {
    requests.push($fetch<any[]>('/api/backend/dashboard/notifications/stock-replenishment')
      .then((rows) => { stockAlerts.value = rows.filter(alert => !isAlertDismissed(stockAlertKey(alert))) })
      .catch(() => { stockAlerts.value = [] }))
  } else {
    stockAlerts.value = []
  }
  if (hasPermission('treasury.current_accounts.read')) {
    requests.push($fetch<any[]>('/api/backend/dashboard/notifications/old-account-balances')
      .then((rows) => { oldAccountAlerts.value = rows.filter(alert => !isAlertDismissed(accountAlertKey(alert))) })
      .catch(() => { oldAccountAlerts.value = [] }))
  } else {
    oldAccountAlerts.value = []
  }
  await Promise.all(requests)
}

async function refreshAlerts() {
  await refreshDismissals()
  await Promise.all([refresh(), loadFiscalAlerts(), loadTreasuryAlerts(), loadCheckAlerts(), loadCardAlerts(), loadOperationalAlerts()])
  setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
}

async function dismissCompanyAlert(key: string) {
  busyNotificationId.value = key
  try {
    await persistAlertDismissal(key)
    fiscalAlerts.value = fiscalAlerts.value.filter(alert => fiscalAlertKey(alert) !== key)
    treasuryAlerts.value = treasuryAlerts.value.filter(alert => treasuryAlertKey(alert) !== key)
    stockAlerts.value = stockAlerts.value.filter(alert => stockAlertKey(alert) !== key)
    oldAccountAlerts.value = oldAccountAlerts.value.filter(alert => accountAlertKey(alert) !== key)
    setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
    return true
  } catch {
    toast.add({ title: 'No se pudo ocultar el aviso', color: 'error' })
    return false
  } finally {
    busyNotificationId.value = null
  }
}

async function openFiscalAlert(alert: any) {
  if (!await dismissCompanyAlert(fiscalAlertKey(alert))) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/settings/fiscal-authorizations')
}

async function hideFiscalAlert(alert: any) {
  await dismissCompanyAlert(fiscalAlertKey(alert))
}

function companyAlertCountFromCurrentAlerts() {
  return fiscalAlerts.value.filter(alert => !alert.is_read).length
    + treasuryAlerts.value.length
    + stockAlerts.value.length
    + oldAccountAlerts.value.length
    + checkAlertCards.value.length
    + Number(showCardSettlementAlert.value)
    + Number(showCorporateCardAlert.value)
}

async function openNotification(notification: UserNotification) {
  busyNotificationId.value = notification.id
  try {
    await dismissCheckGroupForNotification(notification)
    await dismissNotification(notification.id)
  } catch {
    toast.add({ title: 'No se pudo ocultar la notificación', color: 'error' })
    return
  } finally {
    busyNotificationId.value = null
  }
  isNotificationsSlideoverOpen.value = false
  if (notification.target_path) await navigateTo(notification.target_path)
}

async function hideNotification(notification: UserNotification) {
  busyNotificationId.value = notification.id
  try {
    await dismissCheckGroupForNotification(notification)
    await dismissNotification(notification.id)
  } catch {
    toast.add({ title: 'No se pudo ocultar la notificación', color: 'error' })
  } finally {
    busyNotificationId.value = null
  }
}

async function deleteNotification(notification: UserNotification) {
  busyNotificationId.value = notification.id
  try {
    await dismissCheckGroupForNotification(notification)
    await remove(notification.id)
  } catch {
    toast.add({ title: 'No se pudo eliminar la notificación', color: 'error' })
  } finally {
    busyNotificationId.value = null
  }
}

async function handleMarkAllRead() {
  try {
    const activeCheckAlertKeys = [
      ...(checkAlerts.value.third_party.count ? ['CHECKS:THIRD_PARTY'] : []),
      ...(checkAlerts.value.own.count ? ['CHECKS:OWN'] : []),
      ...(checkAlerts.value.upcoming.count ? ['CHECKS:UPCOMING'] : [])
    ]
    await Promise.all(activeCheckAlertKeys
      .filter(key => !isAlertDismissed(key))
      .map(key => persistAlertDismissal(key)))
    await markAllRead()
    setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
  } catch {
    toast.add({ title: 'No se pudieron marcar las notificaciones', color: 'error' })
  }
}

async function dismissCheckGroupForNotification(notification: UserNotification) {
  const key = notification.type === 'CHECK_DUE'
    ? 'CHECKS:UPCOMING'
    : notification.type === 'CHECK_OVERDUE'
      ? notification.target_path?.includes('alert=own')
        ? 'CHECKS:OWN'
        : 'CHECKS:THIRD_PARTY'
      : null
  if (key && !isAlertDismissed(key)) await persistAlertDismissal(key)
  setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
}

async function openTreasuryAlert(alert?: any) {
  if (alert && !await dismissCompanyAlert(treasuryAlertKey(alert))) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/taxes-services')
}

async function openCardAlerts(dismiss = false) {
  if (dismiss && !await dismissCompanyAlert(cardSettlementAlertKey)) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/card-settlements')
}

async function openCorporateCardAlerts(dismiss = false) {
  if (dismiss && !await dismissCompanyAlert(corporateCardAlertKey)) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/cards')
}

async function openStockAlerts(alert?: any) {
  if (alert && !await dismissCompanyAlert(stockAlertKey(alert))) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/stock')
}

async function openAccountAlerts(alert?: any) {
  if (alert && !await dismissCompanyAlert(accountAlertKey(alert))) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo({ path: '/erp/treasury/current-accounts', query: alert ? { party_type: alert.party_type } : {} })
}

async function openCheckAlert(card: (typeof checkAlertCards.value)[number]) {
  if (!await dismissCompanyAlert(card.key)) return
  isNotificationsSlideoverOpen.value = false
  await navigateTo(card.path)
}

function checkAlertExamples(card: (typeof checkAlertCards.value)[number]) {
  const group = card.id === 'third-party' ? 'third_party' : card.id
  const checks = checkAlerts.value[group].checks
  return checks.slice(0, 3).map(check => `N° ${check.check_number} · ${check.bank_name} · ${check.due_date.slice(0, 10)}`).join(' · ')
}

function formatAlertAmount(amount: number, currencyCode?: string | null) {
  if (!currencyCode) return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(amount)
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyCode }).format(amount)
}

watch(isNotificationsSlideoverOpen, (isOpen) => {
  if (isOpen) void refreshAlerts()
})

watch(canReadChecks, (canRead, couldRead) => {
  // The layout can mount before the active company permissions finish loading.
  // Retry once access becomes available so the bell badge is populated without
  // requiring the user to open the notifications panel or refresh the page.
  if (canRead && !couldRead) {
    void refreshAlerts()
  } else if (!canRead && couldRead) {
    checkAlerts.value = {
      third_party: { count: 0, checks: [] },
      own: { count: 0, checks: [] },
      upcoming: { count: 0, checks: [], days: 30 }
    }
    setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
  }
}, { immediate: false })

function refreshCheckAlertsOnFocus() {
  if (document.visibilityState !== 'visible') return
  void loadCheckAlerts().then(() => setCompanyAlertCount(companyAlertCountFromCurrentAlerts()))
}

onMounted(() => {
  void refreshAlerts()
  document.addEventListener('visibilitychange', refreshCheckAlertsOnFocus)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', refreshCheckAlertsOnFocus)
})
</script>

<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Notificaciones">
    <template #body>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-sm text-muted">Asignaciones y avisos de la empresa</p>
        <UButton
          v-if="unreadCount > 0"
          label="Ocultar avisos personales nuevos hasta mañana"
          size="xs"
          color="neutral"
          variant="ghost"
          :loading="loading"
          @click="handleMarkAllRead"
        />
      </div>

      <div v-if="notifications.length" class="space-y-1">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/30"
          :class="{ 'bg-elevated/30': !notification.read_at }"
        >
          <div class="flex w-full min-w-0 items-start gap-3 py-1">
            <UChip color="error" :show="!notification.read_at" inset>
              <div
                class="flex size-10 items-center justify-center rounded-full"
                :class="{
                  'bg-info/10': notificationIconTone(notification.type) === 'info',
                  'bg-warning/10': notificationIconTone(notification.type) === 'warning',
                  'bg-primary/10': notificationIconTone(notification.type) === 'primary'
                }"
              >
                <UIcon
                  :name="notificationIcon(notification.type)"
                  class="size-5"
                  :class="{
                    'text-info': notificationIconTone(notification.type) === 'info',
                    'text-warning': notificationIconTone(notification.type) === 'warning',
                    'text-primary': notificationIconTone(notification.type) === 'primary'
                  }"
                />
              </div>
            </UChip>
            <div class="min-w-0 flex-1 text-sm">
              <p class="flex items-start justify-between gap-2">
                <span class="font-medium text-highlighted">{{ notification.title }}</span>
                <time :datetime="notification.created_at" class="shrink-0 text-xs text-muted">
                  {{ formatNotificationTime(notification.created_at) }}
                </time>
              </p>
              <p class="mt-0.5 text-dimmed">{{ notification.message }}</p>
              <p v-if="notification.actor" class="mt-1 text-xs text-muted">De {{ notification.actor.name }}</p>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap items-center justify-end gap-2">
            <UButton
              label="Ocultar hasta mañana"
              icon="i-lucide-eye-off"
              color="neutral"
              variant="outline"
              size="xs"
              :loading="busyNotificationId === notification.id"
              :disabled="busyNotificationId !== null"
              :aria-label="`Ocultar hasta mañana: ${notification.title}`"
              @click="hideNotification(notification)"
            />
            <UButton
              v-if="notification.target_path"
              label="Abrir"
              icon="i-lucide-arrow-up-right"
              color="primary"
              variant="solid"
              size="xs"
              :disabled="busyNotificationId !== null"
              @click="openNotification(notification)"
            />
            <UButton
              label="Eliminar"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              size="xs"
              :loading="busyNotificationId === notification.id"
              :disabled="busyNotificationId !== null"
              :aria-label="`Eliminar: ${notification.title}`"
              @click="deleteNotification(notification)"
            />
          </div>
        </div>
      </div>

      <p v-if="totalItems" class="px-3 pt-1 text-xs text-muted">
        Al abrir u ocultar un aviso, desaparece hasta mañana. Si sigue pendiente, vuelve a aparecer; al resolverlo, deja de mostrarse.
      </p>

      <div v-if="notifications.length && (checkAlertCards.length || fiscalAlerts.length || treasuryAlerts.length || stockAlerts.length || oldAccountAlerts.length || showCardSettlementAlert || showCorporateCardAlert)" class="border-t border-default my-3" />

      <div v-if="checkAlertCards.length" class="space-y-1">
        <p class="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">Cheques</p>
        <div
          v-for="alert in checkAlertCards"
          :key="`check-${alert.id}`"
          class="rounded-md px-3 py-2.5 hover:bg-elevated/30"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-full"
              :class="{
                'bg-warning/10': alert.tone === 'warning',
                'bg-primary/10': alert.tone === 'primary',
                'bg-info/10': alert.tone === 'info'
              }"
            >
              <UIcon
                :name="alert.icon"
                class="size-4.5"
                :class="{
                  'text-warning': alert.tone === 'warning',
                  'text-primary': alert.tone === 'primary',
                  'text-info': alert.tone === 'info'
                }"
              />
            </div>
            <div class="min-w-0 flex-1 text-sm">
              <p class="flex items-center gap-2 font-medium text-highlighted">
                <span>{{ alert.title }}</span>
                <UBadge :label="String(alert.count)" :color="alert.tone" variant="subtle" size="xs" />
              </p>
              <p class="mt-0.5 text-dimmed">{{ alert.description }}</p>
              <p v-if="checkAlertExamples(alert)" class="mt-1 truncate text-xs text-muted">
                {{ checkAlertExamples(alert) }}<span v-if="alert.count > 3"> · y {{ alert.count - 3 }} más</span>
              </p>
              <div class="mt-2 flex items-center justify-end gap-2">
                <UButton
                  label="Ocultar hasta mañana"
                  icon="i-lucide-eye-off"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :loading="busyNotificationId === alert.key"
                  :disabled="busyNotificationId !== null"
                  @click="dismissCompanyAlert(alert.key)"
                />
                <UButton
                  label="Ver cheques"
                  icon="i-lucide-arrow-up-right"
                  color="primary"
                  variant="solid"
                  size="xs"
                  :disabled="busyNotificationId !== null"
                  @click="openCheckAlert(alert)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="checkAlertCards.length && (fiscalAlerts.length || treasuryAlerts.length || stockAlerts.length || oldAccountAlerts.length || showCardSettlementAlert || showCorporateCardAlert)" class="my-3 border-t border-default" />

      <div
        v-for="alert in fiscalAlerts"
        :key="`fiscal-${alert.id}`"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/30"
      >
        <div class="flex w-full min-w-0 items-start gap-3 py-1">
          <UChip :color="alert.severity === 'ERROR' ? 'error' : 'warning'" :show="!alert.is_read" inset>
            <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
              <UIcon name="i-lucide-badge-alert" class="size-5 text-warning" />
            </div>
          </UChip>
          <div class="min-w-0 flex-1 text-sm">
            <p class="font-medium text-highlighted">{{ alert.title }}</p>
            <p class="text-dimmed">{{ alert.message }}</p>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center justify-end gap-2">
          <UButton
            label="Ocultar hasta mañana"
            icon="i-lucide-eye-off"
            color="neutral"
            variant="outline"
            size="xs"
            :loading="busyNotificationId === fiscalAlertKey(alert)"
            :disabled="busyNotificationId !== null"
            @click="hideFiscalAlert(alert)"
          />
          <UButton
            label="Abrir"
            icon="i-lucide-arrow-up-right"
            color="primary"
            variant="solid"
            size="xs"
            :disabled="busyNotificationId !== null"
            @click="openFiscalAlert(alert)"
          />
        </div>
      </div>

      <div v-if="fiscalAlerts.length && (treasuryAlerts.length || stockAlerts.length || oldAccountAlerts.length || showCardSettlementAlert || showCorporateCardAlert)" class="border-t border-default my-3" />

      <div v-if="stockAlerts.length" class="flex items-center justify-between px-3 py-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Reposición de stock</p>
        <UButton label="Ver stock" size="xs" color="neutral" variant="ghost" @click="openStockAlerts()" />
      </div>

      <button
        v-for="alert in stockAlerts"
        :key="`stock-${alert.id}`"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openStockAlerts(alert)"
      >
        <UChip :color="alert.critical ? 'error' : 'warning'" :show="true" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-package-open" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-medium text-highlighted">{{ alert.product_name }}<span v-if="alert.product_sku" class="ml-1 text-muted">· {{ alert.product_sku }}</span></p>
          <p class="text-dimmed">{{ alert.warehouse_name }} · Disponible {{ alert.available }} · Reposición en {{ alert.reorder_point }}</p>
        </div>
      </button>

      <div v-if="stockAlerts.length && oldAccountAlerts.length" class="border-t border-default my-3" />

      <div v-if="oldAccountAlerts.length" class="flex items-center justify-between px-3 py-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Saldos sin movimiento · 30+ días</p>
        <UButton label="Ver cuentas" size="xs" color="neutral" variant="ghost" @click="openAccountAlerts()" />
      </div>

      <button
        v-for="alert in oldAccountAlerts"
        :key="`account-${alert.id}`"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openAccountAlerts(alert)"
      >
        <UChip :color="alert.severity === 'HIGH' ? 'error' : alert.severity === 'MEDIUM' ? 'warning' : 'primary'" :show="true" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-wallet" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-medium text-highlighted">{{ alert.party_name }} · {{ alert.party_type === 'CUSTOMER' ? 'Cliente' : 'Proveedor' }}</p>
          <p class="text-dimmed">Saldo pendiente sin movimientos hace {{ alert.days_without_movement }} días · {{ formatAlertAmount(alert.balance, alert.currency_code) }}</p>
        </div>
      </button>

      <div v-if="(stockAlerts.length || oldAccountAlerts.length) && treasuryAlerts.length" class="border-t border-default my-3" />

      <div v-if="!treasuryAlerts.length && (stockAlerts.length || oldAccountAlerts.length) && (showCardSettlementAlert || showCorporateCardAlert)" class="border-t border-default my-3" />

      <div v-if="treasuryAlerts.length" class="flex items-center justify-between px-3 py-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Impuestos y servicios</p>
        <UButton label="Ver todos" size="xs" color="neutral" variant="ghost" @click="openTreasuryAlert()" />
      </div>

      <button
        v-for="obligation in treasuryAlerts"
        :key="`treasury-${obligation.id}`"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openTreasuryAlert(obligation)"
      >
        <UChip :color="obligation.effective_status === 'OVERDUE' ? 'error' : 'warning'" :show="true" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-calendar-clock" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-medium text-highlighted">{{ obligation.description }}</p>
          <p class="text-dimmed">{{ obligation.notification_reason }} · {{ obligation.party?.name }}</p>
        </div>
      </button>

      <div v-if="treasuryAlerts.length && (showCardSettlementAlert || showCorporateCardAlert)" class="border-t border-default my-3" />

      <button
        v-if="showCardSettlementAlert"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openCardAlerts(true)"
      >
        <UChip :color="cardAlerts.overdue_collections ? 'error' : 'warning'" :show="true" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-credit-card" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-medium text-highlighted">Liquidaciones de tarjeta pendientes</p>
          <p class="text-dimmed">
            {{ cardAlerts.pending_collections }} pendientes<span v-if="cardAlerts.overdue_collections"> · {{ cardAlerts.overdue_collections }} demoradas</span>
          </p>
        </div>
      </button>

      <div v-if="showCardSettlementAlert && showCorporateCardAlert" class="border-t border-default my-3" />

      <button
        v-if="showCorporateCardAlert"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openCorporateCardAlerts(true)"
      >
        <UChip color="warning" :show="true" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-credit-card" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-medium text-highlighted">Vencimientos de tarjetas corporativas</p>
          <p class="text-dimmed">{{ cardAlerts.upcoming_installments_count }} cuota(s) pendientes hasta {{ cardAlerts.days }} días</p>
        </div>
      </button>

      <div v-if="!loading && totalItems === 0" class="py-8 text-center text-sm text-muted">
        No hay notificaciones por el momento.
      </div>
    </template>
  </USlideover>
</template>
