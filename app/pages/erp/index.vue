<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

await navigateTo('/', { replace: true })
</script>

<template>
  <div class="flex min-h-48 items-center justify-center">
    <ULoader />
  </div>
</template>
