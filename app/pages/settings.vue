<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-6">
    <NuxtPage />
  </div>
</template>
