<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const moduleCollapsed = ref(false)
const { items: breadcrumbs } = useBreadcrumbs()

provide('moduleSidebarCollapsed', moduleCollapsed)
provide('mainCollapsed', mainCollapsed)
</script>

<template>
  <NuxtLayout name="default">
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :ui="{ left: 'flex items-center gap-2 min-w-0 flex-1' }">
          <template #left>
            <div class="flex items-center gap-2 min-w-0">
              <TeamsMenu class="cursor-pointer" />
              <UBreadcrumb :items="breadcrumbs" class="min-w-0 truncate" />
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </NuxtLayout>
</template>
