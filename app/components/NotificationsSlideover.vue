<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import { useDashboard } from '~/composables/useDashboard'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'

const { isNotificationsSlideoverOpen } = useDashboard()

const { data: notifications } =
  await useFetch<Notification[]>('/api/notifications')

const fiscalAlerts = ref<any[]>([])
const treasuryAlerts = ref<any[]>([])
const cardAlerts = ref<any | null>(null)
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

async function loadFiscalAlerts() {
  try {
    fiscalAlerts.value = await $fetch<any[]>('/api/backend/fiscal-authorizations/alerts/current')
  } catch {
    fiscalAlerts.value = []
  }
}

async function loadCardAlerts() {
  if (!isOwnerOrAdmin.value && !hasPermission('card_settlements.read')) return
  try { cardAlerts.value = await useCreditCardsService().dashboard(7) } catch { cardAlerts.value = null }
}

async function loadTreasuryAlerts() {
  try {
    const obligations = await $fetch<any[]>('/api/backend/treasury/obligations')
    treasuryAlerts.value = obligations.filter(obligation => obligation.should_notify)
  } catch {
    // Usuarios sin acceso a Tesorería no deben ver estos vencimientos.
    treasuryAlerts.value = []
  }
}

async function openFiscalAlert(alert: any) {
  try {
    await $fetch(`/api/backend/fiscal-authorizations/alerts/${alert.id}/read`, { method: 'PATCH' })
    alert.is_read = true
  } catch {}
  await navigateTo('/settings/fiscal-authorizations')
}

async function openTreasuryAlert() {
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/taxes-services?view=upcoming')
}

async function openCardAlerts() {
  isNotificationsSlideoverOpen.value = false
  await navigateTo('/erp/treasury/card-settlements')
}

onMounted(() => Promise.all([loadFiscalAlerts(), loadTreasuryAlerts(), loadCardAlerts()]))
</script>

<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Notifications">
    <template #body>
      <button
        v-for="alert in fiscalAlerts"
        :key="`fiscal-${alert.id}`"
        class="w-full px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 text-left"
        @click="openFiscalAlert(alert)"
      >
        <UChip :color="alert.severity === 'ERROR' ? 'error' : 'warning'" :show="!alert.is_read" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-badge-alert" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="text-sm flex-1 min-w-0">
          <p class="font-medium text-highlighted">{{ alert.title }}</p>
          <p class="text-dimmed">{{ alert.message }}</p>
        </div>
      </button>

      <div v-if="fiscalAlerts.length && (treasuryAlerts.length || notifications?.length)" class="border-t border-default my-2" />

      <button
        v-for="obligation in treasuryAlerts"
        :key="`treasury-${obligation.id}`"
        class="w-full px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 text-left"
        @click="openTreasuryAlert"
      >
        <UChip :color="obligation.effective_status === 'OVERDUE' ? 'error' : 'warning'" :show="true" inset>
          <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-calendar-clock" class="size-5 text-warning" />
          </div>
        </UChip>
        <div class="text-sm flex-1 min-w-0">
          <p class="font-medium text-highlighted">{{ obligation.description }}</p>
          <p class="text-dimmed">{{ obligation.notification_reason }} · {{ obligation.party?.name }}</p>
        </div>
      </button>

      <div v-if="treasuryAlerts.length && notifications?.length" class="border-t border-default my-2" />

      <button v-if="cardAlerts?.pending_collections" class="w-full px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 text-left" @click="openCardAlerts">
        <UChip :color="cardAlerts.overdue_collections ? 'error' : 'warning'" :show="true" inset><div class="size-10 rounded-full bg-warning/10 flex items-center justify-center"><UIcon name="i-lucide-credit-card" class="size-5 text-warning" /></div></UChip>
        <div class="text-sm flex-1 min-w-0"><p class="font-medium text-highlighted">Liquidaciones de tarjeta pendientes</p><p class="text-dimmed">{{ cardAlerts.pending_collections }} pendientes<span v-if="cardAlerts.overdue_collections"> · {{ cardAlerts.overdue_collections }} demoradas</span></p></div>
      </button>

      <NuxtLink
        v-for="notification in notifications"
        :key="notification.id"
        :to="`/inbox?id=${notification.id}`"
        class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3"
      >
        <UChip color="error" :show="!!notification.unread" inset>
          <UAvatar
            v-bind="notification.sender.avatar"
            :alt="notification.sender.name"
            size="md"
          />
        </UChip>

        <div class="text-sm flex-1">
          <p class="flex items-center justify-between">
            <span class="text-highlighted font-medium">
              {{ notification.sender.name }}
            </span>

            <time
              :datetime="notification.date"
              class="text-muted text-xs"
              v-text="formatTimeAgo(new Date(notification.date))"
            />
          </p>

          <p class="text-dimmed">
            {{ notification.body }}
          </p>
        </div>
      </NuxtLink>
    </template>
  </USlideover>
</template>
