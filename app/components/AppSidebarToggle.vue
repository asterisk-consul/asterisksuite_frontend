<script setup lang="ts">
const { mainCollapsed } = useSidebarState()
const sidebarOpen = useState('main-sidebar-open', () => false)

function toggleMain() {
  mainCollapsed.value = !mainCollapsed.value
}
</script>

<template>
  <UTooltip :text="sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'">
    <UDashboardSidebarToggle
      color="neutral"
      variant="ghost"
      size="xs"
      class="shrink-0 lg:hidden"
    />
  </UTooltip>
  <UTooltip :text="mainCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'">
    <UButton
      :icon="mainCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
      :aria-label="mainCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'"
      :aria-expanded="!mainCollapsed"
      color="neutral"
      variant="ghost"
      size="xs"
      class="hidden shrink-0 lg:inline-flex"
      @click="toggleMain"
    />
  </UTooltip>
</template>
