<script setup lang="ts">
import { links as rrhh } from '~/pages/erp/rrhh/rrhhNavigation'
import SidebarModules from '~/components/ui/SidebarModules.vue'

const { mainCollapsed } = useSidebarState()
const moduleCollapsed = ref(false)
const { items: breadcrumbs } = useBreadcrumbs()

provide('moduleSidebarCollapsed', moduleCollapsed)
provide('mainCollapsed', mainCollapsed)
</script>

<template>
  <UDashboardPanel :ui="{ body: '!p-0' }">
    <template #header>
      <UDashboardNavbar title="RRHH">
        <template #left>
          <div class="flex items-center gap-2 min-w-0">
            <TeamsMenu class="cursor-pointer" />
            <UBreadcrumb :items="breadcrumbs" class="min-w-0 truncate" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <SidebarModules :links="rrhh" v-model:collapsed="mainCollapsed" />

        <main class="flex-1 flex flex-col">
          <div class="flex-1 overflow-y-auto p-6">
            <slot />
          </div>
        </main>
      </div>
    </template>
  </UDashboardPanel>
</template>
