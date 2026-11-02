<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
await navigateTo('/settings/users', { replace: true })
</script>