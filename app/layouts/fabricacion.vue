<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const moduleCollapsed = ref(false)
const { items: breadcrumbs } = useBreadcrumbs()
provide('moduleSidebarCollapsed', moduleCollapsed)
provide('mainCollapsed', mainCollapsed)
</script>

<template>
  <NuxtLayout name="default">
    <UDashboardPanel :ui="{ body: '!p-0' }">
      <!-- NAVBAR -->
      <template #header>
        <UDashboardNavbar title="Fabricacion">
          <template #title>
            <UBreadcrumb :items="breadcrumbs" />
          </template>
        </UDashboardNavbar>
      </template>
      <!-- BODY -->
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </NuxtLayout>
</template>
