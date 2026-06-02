<!-- components/AppPageHeader.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  showModuleToggle?: boolean
  ui?: Record<string, string>
}>()

const mainCollapsed = inject('mainCollapsed', ref(false))
const { moduleCollapsed } = useModuleSidebarState()

function toggleMain() {
  mainCollapsed.value = !mainCollapsed.value
}

function toggleModule() {
  moduleCollapsed.value = !moduleCollapsed.value
}
</script>

<template>
  <UPageHeader :description="description" :ui="ui">
    <template #title>
      <div class="flex items-center gap-2">
        <AppSidebarToggle v-if="!showModuleToggle" :collapsed="mainCollapsed" @click="toggleMain" />
        <AppSidebarToggle v-else :collapsed="moduleCollapsed" @click="toggleModule" />

        <span>{{ title }}</span>
      </div>
    </template>
  </UPageHeader>
</template>
