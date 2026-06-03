<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import BomTable from '~/modulos/logistica/master-data/product/costing/components/BomTable.vue'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion',
  breadcrumb: [{ label: 'Fabricación', to: '/fabricacion' }, { label: 'BOM' }]
})

const { moduleCollapsed } = useModuleSidebarState()
const mobileOpen = ref(false)

// Cuando el toggle abre el módulo en móvil, abre el slideover
watch(moduleCollapsed, (collapsed) => {
  if (!collapsed && window.innerWidth < 1024) {
    mobileOpen.value = true
    // Volvemos a colapsar para que el aside de desktop no aparezca
    moduleCollapsed.value = true
  }
})

// Al cerrar el slideover, aseguramos que quede colapsado
watch(mobileOpen, (open) => {
  if (!open) moduleCollapsed.value = true
})

const items: NavigationMenuItem[] = [
  { label: 'General', icon: 'i-lucide-layout-dashboard', to: '/fabricacion/bom' },
  { label: 'Materiales', icon: 'i-lucide-package', to: '/fabricacion/bom/materiales' },
  { label: 'Operaciones', icon: 'i-lucide-settings', to: '/fabricacion/bom/operaciones' }
]
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader title="BOM" show-module-toggle class="sticky top-0 z-10 px-4" />

    <!-- Slideover para móvil/tablet -->
    <USlideover v-model:open="mobileOpen" side="left" title="Navegación" :ui="{ content: 'max-w-xs' }">
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" :ui="{ link: 'p-1.5 overflow-hidden' }" />
      </template>
    </USlideover>

    <UPage>
      <!-- Sidebar solo en desktop -->
      <template v-if="!moduleCollapsed" #left>
        <UPageAside class="hidden lg:flex">
          <UNavigationMenu :items="items" orientation="vertical" :ui="{ link: 'p-1.5 overflow-hidden' }" />
        </UPageAside>
      </template>

      <div class="space-y-4 p-4">
        <BomTable />
      </div>
    </UPage>
  </div>
</template>
