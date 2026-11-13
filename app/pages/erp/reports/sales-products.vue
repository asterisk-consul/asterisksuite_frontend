<script setup lang="ts">
import SalesProductsCompanyReport from '~/components/erp/reports/SalesProductsCompanyReport.vue'

definePageMeta({ middleware: ['auth', 'management-reports'] })
useHead({ title: 'Productos vendidos por empresa | AsteriskSuite' })
</script>

<template>
  <SalesProductsCompanyReport />
</template>
