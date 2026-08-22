<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMySalesStore } from '~/modulos/erp/sales/my-sales/my-sales.store'

definePageMeta({ middleware: ['auth'] })

const store = useMySalesStore()
const { summary, loading } = storeToRefs(store)

const currentPeriod = ref(new Date().toISOString().slice(0, 7))

const periodOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    options.push({ label, value })
  }
  return options
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value)
}

watch(currentPeriod, async () => {
  await store.fetchSummary(currentPeriod.value)
})

onMounted(async () => {
  await store.fetchSummary(currentPeriod.value)
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <div class="flex items-center justify-between">
      <AppPageHeader title="Mis Ventas" />
      <USelect
        v-model="currentPeriod"
        :items="periodOptions"
        class="w-48"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <USkeleton v-for="i in 8" :key="i" class="h-24" />
    </div>

    <!-- Dashboard -->
    <template v-else-if="summary">
      <!-- Fila principal -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard>
          <div class="text-sm text-muted">Ventas realizadas</div>
          <div class="text-2xl font-bold">{{ formatCurrency(summary.total_ventas) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Facturado</div>
          <div class="text-2xl font-bold text-blue-600">{{ formatCurrency(summary.total_facturado) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Cobrado</div>
          <div class="text-2xl font-bold text-green-600">{{ formatCurrency(summary.total_cobrado) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Pendiente de cobro</div>
          <div class="text-2xl font-bold text-red-600">{{ formatCurrency(summary.pendiente_cobro) }}</div>
        </UCard>
      </div>

      <!-- Fila secundaria -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard>
          <div class="text-sm text-muted">Órdenes de venta</div>
          <div class="text-2xl font-bold">{{ summary.cantidad_ov }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Clientes vendidos</div>
          <div class="text-2xl font-bold">{{ summary.clientes_vendidos }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Pendiente de facturar</div>
          <div class="text-2xl font-bold text-amber-600">{{ formatCurrency(summary.pendiente_facturar) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Comisión generada</div>
          <div class="text-2xl font-bold text-purple-600">{{ formatCurrency(summary.comision_generada) }}</div>
        </UCard>
      </div>

      <!-- Links rápidos -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NuxtLink to="/mis-ventas/ordenes" class="block">
          <UCard class="hover:border-primary transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-file-text" class="size-6 text-primary" />
              <div>
                <div class="font-medium text-sm">Mis órdenes</div>
                <div class="text-xs text-muted">Ver todas las OV</div>
              </div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/mis-ventas/pendientes" class="block">
          <UCard class="hover:border-primary transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-clock" class="size-6 text-amber-600" />
              <div>
                <div class="font-medium text-sm">Pend. de cobro</div>
                <div class="text-xs text-muted">Facturas impagas</div>
              </div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/mis-ventas/por-cliente" class="block">
          <UCard class="hover:border-primary transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-users" class="size-6 text-blue-600" />
              <div>
                <div class="font-medium text-sm">Por cliente</div>
                <div class="text-xs text-muted">Resumen por cliente</div>
              </div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/mis-ventas/analisis" class="block">
          <UCard class="hover:border-primary transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-bar-chart-3" class="size-6 text-green-600" />
              <div>
                <div class="font-medium text-sm">Análisis</div>
                <div class="text-xs text-muted">Comparación de períodos</div>
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </template>
  </UPage>
</template>
