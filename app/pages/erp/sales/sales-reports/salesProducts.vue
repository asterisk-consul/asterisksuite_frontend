<script setup lang="ts">
import ProductDocumentsReport from '~/components/erp/reports/ProductDocumentsReport.vue'

definePageMeta({ layout: 'default', middleware: ['auth'] })
useHead({ title: 'Productos vendidos | Asterisk Suite' })
</script>

<template>
  <ProductDocumentsReport direction="sales" />
</template>
