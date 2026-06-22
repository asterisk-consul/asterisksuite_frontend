<!-- components/AppSidebarToggle.vue -->
<script setup lang="ts">
defineProps<{
  collapsed: boolean
}>()
defineEmits(['click'])
</script>

<template>
  <div
    class="group relative flex items-center justify-center w-5 h-5 rounded-md cursor-pointer hover:bg-elevated transition-colors"
    @click="$emit('click')"
  >
    <UIcon
      name="i-lucide-menu"
      class="absolute transition-all duration-200 opacity-100 group-hover:opacity-0 group-hover:scale-75"
    />
    <UIcon
      :name="collapsed ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left'"
      class="absolute transition-all duration-200 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
    />
  </div>
</template>
