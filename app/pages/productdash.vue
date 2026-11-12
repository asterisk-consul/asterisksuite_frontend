<script setup lang="ts">
import ProductDocumentsReport from '~/components/erp/reports/ProductDocumentsReport.vue'

definePageMeta({ layout: 'default', middleware: ['auth'] })
useHead({ title: 'Productos comprados | Asterisk Suite' })
</script>

<template>
  <ProductDocumentsReport direction="purchases" />
</template>
