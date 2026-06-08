<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

const { init, productsWithCostTemplate, costCards } = useProducts()

const router = useRouter()

const openEdit = (product: any) => {
  router.push(`/bom/${product.id}`)
}
definePageMeta({
  middleware: ['auth'],
  layout: 'fabricacion'
})
const shortcuts = [
  { label: 'BOM Creator', to: '/bom/create' },
  { label: 'BOM', to: '/bom', badge: productsWithCostTemplate.value },
  { label: 'Production Plan', to: '/fabricacion/production-plans' },
  { label: 'Work Order', to: '/fabricacion/work-orders' }
]

const sections = [
  {
    title: 'Producción',
    items: [
      { label: 'Ordenes de Producción' },
      { label: 'Planes de Producción' },
      { label: 'Partes de Producción' },
      { label: 'Control de Calidad' },
      { label: 'Paradas' }
    ]
  },
  {
    title: 'Ingeniería',
    items: [
      { label: 'Productos' },
      { label: 'BOM' },
      { label: 'Operaciones' },
      { label: 'Rutas' },
      { label: 'Centros de Trabajo' }
    ]
  },
  {
    title: 'Reportes',
    items: [
      { label: 'Costos' },
      { label: 'Consumos' },
      { label: 'Eficiencia' },
      { label: 'Tiempos' },
      { label: 'Trazabilidad' }
    ]
  }
]
onMounted(async () => {
  await init()
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Fabricación" />
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
      <UCard v-for="product in costCards" :key="product.id" @click="openEdit(product)" class="cursor-pointer">
        <div class="flex flex-col gap-1">
          <span class="font-medium">
            {{ product.name }}
          </span>

          <span class="text-sm text-muted">
            {{ product.sku }}
          </span>

          <span class="text-xl font-bold">
            {{ product.currency?.symbol }}
            {{ product.current_cost }}
          </span>
        </div>
      </UCard>
    </div>
    <ModuleNavigationCard :shortcuts="shortcuts" :sections="sections" />
  </UPage>
</template>
