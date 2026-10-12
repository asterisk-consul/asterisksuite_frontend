<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false
  }
)
</script>

<template>
  <NuxtLink
    to="/"
    class="flex min-w-0 items-center justify-center"
    aria-label="Ir al inicio de Asterisk Suite"
  >
    <span v-if="compact" class="block size-9 shrink-0 overflow-hidden" aria-hidden="true">
      <img
        src="/branding/logo-light.svg"
        alt=""
        class="h-9 w-auto max-w-none dark:hidden"
      >
      <img
        src="/branding/logo-dark.svg"
        alt=""
        class="hidden h-9 w-auto max-w-none dark:block"
      >
    </span>

    <template v-else>
      <img
        src="/branding/logo-light.svg"
        alt="Asterisk Suite"
        class="h-10 max-w-full w-auto dark:hidden"
      >

      <img
        src="/branding/logo-dark.svg"
        alt="Asterisk Suite"
        class="hidden h-10 max-w-full w-auto dark:block"
      >
    </template>
  </NuxtLink>
</template>
