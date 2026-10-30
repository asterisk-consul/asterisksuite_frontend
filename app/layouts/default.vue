<script setup lang="ts">
import { useVersion } from '~/composables/useVersion'
import { useAppVersion } from '~/composables/useAppVersion'
import { filterNavigationTree } from '~/composables/useDrilldownNavigation'
import { navigationTree } from '~/data/navigationTree'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useCurrentUserEmployee } from '~/composables/useCurrentUserEmployee'
import DrilldownSidebar from '~/components/ui/DrilldownSidebar.vue'
import AppVersionBanner from '~/components/AppVersionBanner/AppVersionBanner.vue'
const { mainCollapsed } = useSidebarState()
const { items: breadcrumbs } = useBreadcrumbs()
const { isNotificationsSlideoverOpen } = useDashboard()
const isHelpAssistantOpen = ref(false)
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

const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const { isSalesperson } = useCurrentUserEmployee()
const permittedNavigation = computed(() =>
  filterNavigationTree(navigationTree, hasPermission, isOwnerOrAdmin.value, isSalesperson.value)
)

function openNotifications() {
  isNotificationsSlideoverOpen.value = true
}

const groups = computed(() => {
  const seenDestinations = new Set<string>()
  const navigationGroups = permittedNavigation.value.map((root, index) => {
    const items: Array<{ label: string; to: string; icon?: string; suffix?: string }> = []

    const visit = (node: typeof root, ancestors: string[]) => {
      if (node.to && !seenDestinations.has(node.to)) {
        seenDestinations.add(node.to)
        items.push({
          label: node.label,
          to: node.to,
          icon: node.icon,
          suffix: ancestors.slice(1).join(' / ') || undefined
        })
      }

      for (const child of node.children ?? []) {
        visit(child, [...ancestors, node.label])
      }
    }

    visit(root, [root.label])
    return { id: `navigation-${index}`, label: root.label, items }
  })

  const labelCounts = new Map<string, number>()
  for (const group of navigationGroups) {
    for (const item of group.items) {
      labelCounts.set(item.label, (labelCounts.get(item.label) ?? 0) + 1)
    }
  }

  return navigationGroups
    .map(group => ({
      ...group,
      items: group.items.map(item => labelCounts.get(item.label)! > 1
        ? { ...item, suffix: [group.label, item.suffix].filter(Boolean).join(' / ') }
        : item)
    }))
    .filter(group => group.items.length > 0)
})

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

    <UDashboardSearch
      :groups="groups"
      :fuse="{ fuseOptions: { ignoreDiacritics: true, ignoreLocation: true } }"
      placeholder="Buscar páginas, módulos o configuración..."
    />
    <NotificationsSlideover />
    <HelpAssistantSlideover v-model:open="isHelpAssistantOpen" :page-title="pageTitle" />

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
            <UButton
              icon="i-lucide-message-circle-question"
              color="neutral"
              variant="ghost"
              aria-label="Preguntar a la ayuda"
              title="Preguntar a la ayuda"
              @click="isHelpAssistantOpen = true"
            />
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
