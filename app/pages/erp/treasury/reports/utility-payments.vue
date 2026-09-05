<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
await navigateTo('/erp/treasury/taxes-services?view=utilities', { replace: true })
</script>
