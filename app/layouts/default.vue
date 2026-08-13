<script setup lang="ts">
import { navigationTree } from '~/data/navigationTree'
import { useVersion } from '~/composables/useVersion'
import DrilldownSidebar from '~/components/ui/DrilldownSidebar.vue'
const { mainCollapsed } = useSidebarState()
const { items: breadcrumbs } = useBreadcrumbs()
const open = ref(false)

const versions = useVersion()
const route = useRoute()
const toast = useToast()

const links = navigationTree

const groups = computed(() => [
  {
    id: 'links',
    label: 'Ir a',
    items: links.flatMap(n => n.children ?? [n])
  }
])

onMounted(async () => {
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
</script>

<template>
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
