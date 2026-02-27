<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
const open = ref(false)
defineProps<{
  links: NavigationMenuItem[][]
}>()
</script>

<template>
  <UNavigationMenu :items="links[0]" orientation="vertical" tooltip popover />

  <UNavigationMenu
    :items="links[1]"
    orientation="vertical"
    tooltip
    class="mt-auto"
  />
</template>
