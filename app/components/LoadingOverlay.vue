<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-default/80 backdrop-blur-sm">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-10 text-primary mb-4" />
      <p class="text-sm text-muted">Ingresando a {{ companyName }}...</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ companyName?: string }>()
</script>
