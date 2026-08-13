<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

defineProps<{
  title: string
  description?: string
  showModuleToggle?: boolean
  links?: ButtonProps[]
  ui?: Record<string, string>
}>()

const { mainCollapsed } = useSidebarState()

function toggleMain() {
  mainCollapsed.value = !mainCollapsed.value
}
</script>

<template>
  <div>
    <slot name="breadcrumb" />
    <UPageHeader :description="description || undefined" :ui="ui" :links="links">
      <template #title>
        <div class="flex items-center gap-2">
          <AppSidebarToggle :collapsed="mainCollapsed" @click="toggleMain" />

          <span>{{ title }}</span>
        </div>
      </template>
      <template v-if="$slots.links" #links>
        <slot name="links" />
      </template>
    </UPageHeader>
  </div>
</template>
