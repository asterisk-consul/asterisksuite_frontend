<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
await navigateTo('/erp/treasury/taxes-services?view=regulatory', { replace: true })
</script>
