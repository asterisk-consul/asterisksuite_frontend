<script setup lang="ts">
import CommercialSummaryDashboard from '~/components/erp/CommercialSummaryDashboard.vue'

definePageMeta({ middleware: ['auth'] })
const route = useRoute()
const legacyCategory = typeof route.query.category === 'string' ? route.query.category : undefined
if (legacyCategory) {
  await navigateTo({ path: '/erp/sales/comprobantes', query: { ...route.query } }, { replace: true })
}
</script>

<template>
  <CommercialSummaryDashboard
    title="Resumen de ventas"
    description="Una lectura rápida de la actividad, los comprobantes confirmados y el ritmo de ventas."
    endpoint="/api/backend/sales-reports/dashboard-summary"
    area="sales"
    order-label="Órdenes de venta"
    show-quotes
  />
</template>
