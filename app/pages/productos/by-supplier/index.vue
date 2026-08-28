<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
await navigateTo('/productos/by-party?type=SUPPLIER', { replace: true })
</script>

<template><div /></template>
