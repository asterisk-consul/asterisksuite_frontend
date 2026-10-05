<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const route = useRoute()
await navigateTo(`/bom/${route.params.id}`, { replace: true })
</script>
