<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const moduleCollapsed = ref(false)
const { items: breadcrumbs } = useBreadcrumbs()

provide('moduleSidebarCollapsed', moduleCollapsed)
provide('mainCollapsed', mainCollapsed)
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :ui="{ left: 'flex items-center gap-2 min-w-0 flex-1' }">
        <template #left>
          <div class="flex items-center gap-2 min-w-0">
            <TeamsMenu :collapsed="true" class="max-w-8 cursor-pointer" />
            <UBreadcrumb :items="breadcrumbs" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <slot />
    </template>
  </UDashboardPanel>
</template>
