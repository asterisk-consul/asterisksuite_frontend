<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({
  middleware: ['auth']
})

const links = [
  [
    {
      label: 'Unidades',
      icon: 'i-lucide-ruler',
      to: '/logistica/warehouse/productos/settings/unidades',
      exact: true
    },
    {
      label: 'Atributos',
      icon: 'i-lucide-tag',
      to: '/logistica/warehouse/productos/settings/attributes',
      exact: true
    },
    {
      label: 'Categorías',
      icon: 'i-lucide-folder-tree',
      to: '/logistica/warehouse/productos/settings/categorias',
      exact: true
    },
    {
      label: 'Tags',
      icon: 'i-lucide-hash',
      to: '/logistica/warehouse/productos/settings/tags',
      exact: true
    }
  ]
] satisfies NavigationMenuItem[][]
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
