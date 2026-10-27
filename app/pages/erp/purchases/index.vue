<script setup lang="ts">
import CommercialSummaryDashboard from '~/components/erp/CommercialSummaryDashboard.vue'

definePageMeta({ middleware: ['auth'] })
const route = useRoute()
if (typeof route.query.category === 'string') {
  await navigateTo({ path: '/erp/purchases/comprobantes', query: { ...route.query } }, { replace: true })
}
</script>

<template>
  <CommercialSummaryDashboard
    title="Resumen de compras"
    description="Seguimiento de facturas, órdenes y recepción de compras en un solo lugar."
    endpoint="/api/backend/purchases/dashboard-summary"
    area="purchases"
    order-label="Órdenes de compra"
    show-remitos
  />
</template>
