<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

const reports = [
  {
    title: 'Movimientos',
    description: 'Historial de movimientos bancarios y de cajas',
    icon: 'i-lucide-activity',
    color: 'primary',
    to: '/erp/treasury/reports/movements'
  },
  {
    title: 'Pagos por usuario',
    description: 'Reporte de pagos agrupados por usuario',
    icon: 'i-lucide-users',
    color: 'info',
    to: '/erp/treasury/reports/by-user'
  },
  {
    title: 'Libro IVA',
    description: 'Registro de facturas con IVA discriminado',
    icon: 'i-lucide-book-open',
    color: 'success',
    to: '/erp/treasury/reports/libro-iva'
  },
  {
    title: 'Reportes Contables',
    description: 'Estados contables y reportes financieros',
    icon: 'i-lucide-calculator',
    color: 'warning',
    to: '/erp/treasury/reports/accounting'
  },
  {
    title: 'Informe Consolidado',
    description: 'Estado de situación patrimonial y resultados',
    icon: 'i-lucide-file-text',
    color: 'secondary',
    to: '/erp/treasury/reports/consolidated'
  }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Reportes"
      description="Centro de reportes de tesorería y contabilidad"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="report in reports"
        :key="report.to"
        :to="report.to"
        class="block p-5 rounded-xl border border-default bg-default hover:border-primary/50 hover:shadow-md transition-all"
      >
        <div class="flex items-center gap-4 mb-3">
          <div class="size-12 rounded-xl flex items-center justify-center" :class="`bg-${report.color}/10`">
            <UIcon :name="report.icon" class="size-6" :class="`text-${report.color}`" />
          </div>
          <div>
            <p class="text-sm font-semibold">{{ report.title }}</p>
            <p class="text-xs text-muted">{{ report.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-1 text-xs text-primary">
          <span>Ver reporte</span>
          <UIcon name="i-lucide-arrow-right" class="size-3" />
        </div>
      </NuxtLink>
    </div>
  </UPage>
</template>
