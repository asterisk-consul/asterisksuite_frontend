<script setup lang="ts">
import { navigationTree } from '~/data/navigationTree'
import { useVersion } from '~/composables/useVersion'
import { useAppVersion } from '~/composables/useAppVersion'
import DrilldownSidebar from '~/components/ui/DrilldownSidebar.vue'
import AppVersionBanner from '~/components/AppVersionBanner/AppVersionBanner.vue'
const { mainCollapsed } = useSidebarState()
const { items: breadcrumbs } = useBreadcrumbs()
const { isNotificationsSlideoverOpen } = useDashboard()
const { totalCount, companyAlertCount, refresh: refreshNotifications } = useNotifications()
const notificationBadgeCount = computed(() => totalCount.value + companyAlertCount.value)
const open = ref(false)

const pageTitle = computed(() => {
  const current = [...breadcrumbs.value].reverse().find(item => 'label' in item && item.label)
  return current && 'label' in current ? String(current.label) : 'Asterisk Suite'
})

useHead({ title: pageTitle })

const versions = useVersion()
const route = useRoute()
const toast = useToast()
const refreshNotificationsOnFocus = () => {
  if (document.visibilityState === 'visible') void refreshNotifications()
}

const { init: initVersionCheck, showBanner, dismiss: dismissVersionBanner, currentVersion } = useAppVersion()

const links = navigationTree

function openNotifications() {
  isNotificationsSlideoverOpen.value = true
}

const groups = computed(() => [
  {
    id: 'links',
    label: 'Ir a',
    items: links.flatMap(n => n.children ?? [n])
  }
])

onMounted(() => {
  void refreshNotifications()
  document.addEventListener('visibilitychange', refreshNotificationsOnFocus)
  initVersionCheck()

  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'Este sitio utiliza cookies',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Aceptar',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted'
        }
      },
      {
        label: 'Rechazar',
        color: 'neutral',
        variant: 'ghost'
      }
    ]
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', refreshNotificationsOnFocus)
})
</script>

<template>
  <AppVersionBanner
    v-if="showBanner"
    :version="currentVersion"
    :changelog-url="'/changelog'"
    @dismiss="dismissVersionBanner"
  />
  <UDashboardGroup unit="rem">
    <DrilldownSidebar id="default" v-model:open="open" v-model:collapsed="mainCollapsed" resizable with-footer />

    <UDashboardSearch :groups="groups" />
    <NotificationsSlideover />

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <UBreadcrumb :items="breadcrumbs" />
          </template>
          <template #right>
            <div class="relative">
              <UButton
                icon="i-lucide-bell"
                color="neutral"
                variant="ghost"
                aria-label="Abrir notificaciones"
                @click="openNotifications"
              />
              <span
                v-if="notificationBadgeCount > 0"
                :aria-label="`Notificaciones: ${notificationBadgeCount}`"
                title="Cantidad de avisos y alertas"
                class="absolute -right-1 -top-1 min-w-4 rounded-full bg-error px-1 text-center text-[10px] leading-4 text-white"
              >
                {{ notificationBadgeCount > 99 ? '99+' : notificationBadgeCount }}
              </span>
            </div>
            <slot name="navbar-actions" />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
