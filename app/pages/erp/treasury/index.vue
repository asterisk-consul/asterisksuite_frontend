<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

navigateTo('/erp/treasury/dashboard')
</script>
