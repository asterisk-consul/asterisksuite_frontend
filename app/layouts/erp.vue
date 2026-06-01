<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const { items: breadcrumbs } = useBreadcrumbs()

const items = [
  {
    label: 'Crear Orden de Venta',
    icon: 'i-lucide-shopping-cart',
    kbds: ['meta', 'o'],
    onSelect() {
      navigateTo('/erp/sales/orders/new')
    }
  },
  {
    label: 'Crear Factura',
    icon: 'i-lucide-file-plus',
    kbds: ['meta', 'f'],
    onSelect() {
      navigateTo('/erp/sales/new')
    }
  },
  {
    label: 'Crear Remito',
    icon: 'i-lucide-file-text',
    kbds: ['meta', 'r'],
    onSelect() {
      navigateTo('/erp/sales/remitos/new')
    }
  }
]

defineShortcuts(extractShortcuts(items))
</script>

<template>
  <NuxtLayout name="default">
    <UDashboardPanel :ui="{ body: '!p-0' }">
      <template #header>
        <UDashboardNavbar title="ERP">
          <template #leading>
            <UButton
              icon="i-lucide-panel-left-close"
              variant="ghost"
              color="neutral"
              @click="mainCollapsed = !mainCollapsed"
            />
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
          <UBreadcrumb :items="breadcrumbs" class="pl-6 pt-6" />

          <div class="flex-1 overflow-y-auto p-6">
            <slot />
          </div>
        </main>
      </template>
    </UDashboardPanel>
  </NuxtLayout>
</template>
