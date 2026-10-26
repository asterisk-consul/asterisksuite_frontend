<script setup lang="ts">
import { useDashboard } from '~/composables/useDashboard'
import { useNotifications } from '~/composables/useNotifications'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'

const { isNotificationsSlideoverOpen } = useDashboard()
const { items: notifications, unreadCount, loading, refresh, markRead, markAllRead, remove, setCompanyAlertCount } = useNotifications()
const toast = useToast()
const busyNotificationId = ref<string | null>(null)
const fiscalAlerts = ref<any[]>([])
const treasuryAlerts = ref<any[]>([])
const cardAlerts = ref<any | null>(null)
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const totalItems = computed(() => notifications.value.length + fiscalAlerts.value.length + treasuryAlerts.value.length + (cardAlerts.value?.pending_collections ? 1 : 0) + (cardAlerts.value?.upcoming_installments_count ? 1 : 0))

function formatNotificationTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'ahora'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return `hace ${Math.floor(seconds / 86400)} d`
}

async function loadFiscalAlerts() {
  try {
    fiscalAlerts.value = await $fetch<any[]>('/api/backend/fiscal-authorizations/alerts/current')
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
    treasuryAlerts.value = await $fetch<any[]>('/api/backend/treasury/obligations/notifications')
  } catch {
    // Usuarios sin acceso a Tesorería no deben ver estos vencimientos.
    treasuryAlerts.value = []
  }
}

async function refreshAlerts() {
  await Promise.all([refresh(), loadFiscalAlerts(), loadTreasuryAlerts(), loadCardAlerts()])
  setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
}

async function openFiscalAlert(alert: any) {
  if (!alert.is_read) await markFiscalAlertRead(alert)
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/settings/fiscal-authorizations')
}

async function markFiscalAlertRead(alert: any) {
  if (alert.is_read) return
  const busyId = `fiscal-${alert.id}`
  busyNotificationId.value = busyId
  try {
    await $fetch(`/api/backend/fiscal-authorizations/alerts/${alert.id}/read`, { method: 'PATCH' })
    alert.is_read = true
    setCompanyAlertCount(companyAlertCountFromCurrentAlerts())
  } catch {
    toast.add({ title: 'No se pudo marcar la alerta como leída', color: 'error' })
  } finally {
    busyNotificationId.value = null
  }
}

function companyAlertCountFromCurrentAlerts() {
  return fiscalAlerts.value.filter(alert => !alert.is_read).length
    + treasuryAlerts.value.length
    + (cardAlerts.value?.pending_collections ? 1 : 0)
    + (cardAlerts.value?.upcoming_installments_count ? 1 : 0)
}

async function openNotification(notification: UserNotification) {
  if (!notification.read_at) {
    try {
      await markRead(notification.id)
    } catch {}
  }
  isNotificationsSlideoverOpen.value = false
  if (notification.target_path) await navigateTo(notification.target_path)
}

async function markNotificationRead(notification: UserNotification) {
  if (notification.read_at) return
  busyNotificationId.value = notification.id
  try {
    await markRead(notification.id)
  } catch {
    toast.add({ title: 'No se pudo marcar como leída', color: 'error' })
  } finally {
    busyNotificationId.value = null
  }
}

async function deleteNotification(notification: UserNotification) {
  busyNotificationId.value = notification.id
  try {
    await remove(notification.id)
  } catch {
    toast.add({ title: 'No se pudo eliminar la notificación', color: 'error' })
  } finally {
    busyNotificationId.value = null
  }
}

async function handleMarkAllRead() {
  try {
    await markAllRead()
  } catch {
    toast.add({ title: 'No se pudieron marcar las notificaciones', color: 'error' })
  }
}

async function openTreasuryAlert() {
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/taxes-services')
}

async function openCardAlerts() {
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/card-settlements')
}

async function openCorporateCardAlerts() {
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/cards')
}

watch(isNotificationsSlideoverOpen, (isOpen) => {
  if (isOpen) void refreshAlerts()
})

onMounted(() => {
  void refreshAlerts()
})
</script>

<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Notificaciones">
    <template #body>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-sm text-muted">Asignaciones y avisos de la empresa</p>
        <UButton
          v-if="unreadCount > 0"
          label="Marcar todas leídas"
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
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide-user-round-check" class="size-5 text-primary" />
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
            <span v-if="notification.read_at" class="mr-auto text-xs text-muted">Leída</span>
            <UButton
              v-if="!notification.read_at"
              label="Marcar leída"
              icon="i-lucide-check"
              color="success"
              variant="soft"
              size="xs"
              :loading="busyNotificationId === notification.id"
              :disabled="busyNotificationId !== null"
              :aria-label="`Marcar como leída: ${notification.title}`"
              @click="markNotificationRead(notification)"
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

      <p v-if="notifications.length" class="px-3 pt-1 text-xs text-muted">
        Los avisos leídos quedan en la lista hasta que los elimines.
      </p>

      <div v-if="notifications.length && (fiscalAlerts.length || treasuryAlerts.length || cardAlerts?.pending_collections || cardAlerts?.upcoming_installments_count)" class="border-t border-default my-3" />

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
          <span v-if="alert.is_read" class="mr-auto text-xs text-muted">Leída</span>
          <UButton
            v-if="!alert.is_read"
            label="Marcar leída"
            icon="i-lucide-check"
            color="success"
            variant="soft"
            size="xs"
            :loading="busyNotificationId === `fiscal-${alert.id}`"
            :disabled="busyNotificationId !== null"
            @click="markFiscalAlertRead(alert)"
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

      <div v-if="fiscalAlerts.length && (treasuryAlerts.length || cardAlerts?.pending_collections || cardAlerts?.upcoming_installments_count)" class="border-t border-default my-3" />

      <div v-if="treasuryAlerts.length" class="flex items-center justify-between px-3 py-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Impuestos y servicios</p>
        <UButton label="Ver todos" size="xs" color="neutral" variant="ghost" @click="openTreasuryAlert" />
      </div>

      <button
        v-for="obligation in treasuryAlerts"
        :key="`treasury-${obligation.id}`"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openTreasuryAlert"
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

      <div v-if="treasuryAlerts.length && (cardAlerts?.pending_collections || cardAlerts?.upcoming_installments_count)" class="border-t border-default my-3" />

      <button
        v-if="cardAlerts?.pending_collections"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openCardAlerts"
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

      <div v-if="cardAlerts?.pending_collections && cardAlerts?.upcoming_installments_count" class="border-t border-default my-3" />

      <button
        v-if="cardAlerts?.upcoming_installments_count"
        class="w-full rounded-md px-3 py-2.5 hover:bg-elevated/50 flex items-start gap-3 text-left"
        @click="openCorporateCardAlerts"
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
