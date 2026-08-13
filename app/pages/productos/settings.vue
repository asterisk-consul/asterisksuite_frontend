<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full mx-auto">
    <NuxtPage />
  </div>
</template>
