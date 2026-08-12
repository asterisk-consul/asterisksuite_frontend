<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const moduleCollapsed = ref(false)
const { items: breadcrumbs } = useBreadcrumbs()

provide('moduleSidebarCollapsed', moduleCollapsed)
provide('mainCollapsed', mainCollapsed)

const items = [
  {
    label: 'Nuevo pago',
    icon: 'i-lucide-plus',
    kbds: ['meta', 'p'],
    onSelect() {
      navigateTo('/erp/treasury/payments')
    }
  },
  {
    label: 'Nuevo cheque',
    icon: 'i-lucide-plus',
    kbds: ['meta', 'k'],
    onSelect() {
      navigateTo('/erp/treasury/checks')
    }
  }
]

defineShortcuts(extractShortcuts(items))
</script>

<template>
  <NuxtLayout name="default">
    <UDashboardPanel :ui="{ body: '!p-0' }">
      <template #header>
        <UDashboardNavbar title="Tesorería">
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
