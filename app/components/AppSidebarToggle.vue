<script setup lang="ts">
defineProps<{
  collapsed: boolean
}>()
defineEmits(['click'])
</script>

<template>
  <UTooltip :text="collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'">
    <UButton
      :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
      :aria-label="collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'"
      :aria-expanded="!collapsed"
      color="neutral"
      variant="ghost"
      size="xs"
      class="shrink-0"
      @click="$emit('click')"
    />
  </UTooltip>
</template>
