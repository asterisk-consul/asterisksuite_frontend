<script setup lang="ts">
import FinancialResultsReport from '~/components/erp/reports/FinancialResultsReport.vue'

definePageMeta({ middleware: ['auth', 'management-reports'] })
useHead({ title: 'Resultado y composición por empresa | AsteriskSuite' })
</script>

<template>
  <FinancialResultsReport />
</template>
