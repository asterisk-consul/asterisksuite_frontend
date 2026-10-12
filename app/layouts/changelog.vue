<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/branding/favicon.svg' }],
  htmlAttrs: { lang: 'es' }
})

useSeoMeta({
  title: 'Changelog',
  description: 'Historial de cambios del sistema'
})
</script>

<template>
  <div class="min-h-screen bg-default">
    <slot />
  </div>
</template>
