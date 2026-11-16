<script setup lang="ts">
import FinancialResultsReport from '~/components/erp/reports/FinancialResultsReport.vue'

definePageMeta({ middleware: ['auth', 'management-reports'] })
useHead({ title: 'Resultado financiero · Vista de prueba | AsteriskSuite' })
</script>

<template>
  <FinancialResultsReport variant="executive" />
</template>
