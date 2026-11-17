<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'

definePageMeta({ middleware: ['auth', 'management-reports'] })
useHead({ title: 'Reportes | AsteriskSuite' })

const { hasPermission } = useRoles()
const reports = [
  {
    title: 'Resultado y composición por empresa',
    description: 'Consultá ventas, compras, cobros y pagos, con acceso al detalle que compone cada importe.',
    icon: 'i-lucide-chart-no-axes-combined',
    permission: 'management_reports.financial_results.read',
    to: '/erp/reports/financial-results',
  },
  {
    title: 'Productos vendidos por empresa',
    description: 'Compará productos, cantidades y órdenes de venta entre empresas en un período.',
    icon: 'i-lucide-chart-no-axes-column-increasing',
    permission: 'management_reports.sales_products.read',
    to: '/erp/reports/sales-products',
  },
]

const availableReports = computed(() => reports.filter(report =>
  hasPermission('management_reports.read') || hasPermission(report.permission),
))
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6">
    <div class="flex flex-col gap-6">
      <AppPageHeader
        title="Reportes"
        description="Elegí un informe para analizar la actividad de tus empresas."
      />

      <section v-if="availableReports.length" class="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Reportes disponibles">
        <NuxtLink
          v-for="report in availableReports"
          :key="report.to"
          :to="report.to"
          class="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
        >
          <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-primary/50 group-hover:bg-elevated/40">
            <div class="flex items-start gap-4">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon :name="report.icon" class="size-6" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-highlighted">{{ report.title }}</h2>
                <p class="mt-1 text-sm leading-relaxed text-muted">{{ report.description }}</p>
                <span class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Abrir reporte
                  <UIcon name="i-lucide-arrow-right" class="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </UPageCard>
        </NuxtLink>
      </section>

      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-lucide-chart-no-axes-column"
        title="No hay reportes habilitados"
        description="Pedile al administrador de la empresa que te asigne permisos para los reportes."
      />
    </div>
  </UPage>
</template>
