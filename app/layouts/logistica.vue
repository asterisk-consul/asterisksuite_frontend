<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const moduleCollapsed = ref(false)
const { items: breadcrumbs } = useBreadcrumbs()

provide('moduleSidebarCollapsed', moduleCollapsed)
provide('mainCollapsed', mainCollapsed)

const items = [
  {
    label: 'Crear Viaje',
    icon: 'i-lucide-plus',
    to: '/logistica/viajes/trips/create',
    kbds: ['meta', 'v'],
    onSelect() {
      navigateTo('/logistica/viajes/create')
    }
  },
  {
    label: 'Crear Orden de Despacho',
    icon: 'i-lucide-plus',
    to: '/logistica/transport/dispatch-orders/create',
    kbds: ['meta', 'd'],
    onSelect() {
      navigateTo('/logistica/viajes/dispatch-orders/create')
    }
  },
  {
    label: 'Crear un Corredor',
    icon: 'i-lucide-plus',
    to: '/logistica/viajes/corridors/create',
    kbds: ['meta', 'e'],
    onSelect() {
      navigateTo('/logistica/viajas/corridors/create')
    }
  }
]

defineShortcuts(extractShortcuts(items))
</script>

<template>
  <NuxtLayout name="default">
    <UDashboardPanel :ui="{ body: '!p-0' }">
      <!-- NAVBAR -->

      <template #header>
        <UDashboardNavbar title="Logística">
          <template #left>
            <div class="flex items-center gap-2 min-w-0">
              <TeamsMenu class="cursor-pointer" />
              <UBreadcrumb :items="breadcrumbs" class="min-w-0 truncate" />
            </div>
          </template>
          <template #right>
            <UDropdownMenu
              :items="items"
              :content="{
                align: 'start',
                side: 'left',
                sideOffset: 8
              }"
            >
              <UTooltip text="Crear">
                <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
              </UTooltip>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <!-- BODY -->
      <template #body>
        <main class="flex-1 flex flex-col">
          <div class="flex-1 overflow-y-auto p-6">
            <slot />
          </div>
        </main>
      </template>
    </UDashboardPanel>
  </NuxtLayout>
</template>
