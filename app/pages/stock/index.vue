<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
definePageMeta({
  middleware: ['auth'],
  layout: 'fabricacion'
})

const { init, activeProducts } = useProducts() // {activeProducts}

const shortcuts = [
  {
    label: 'Productos',
    to: '/productos',
    badge: activeProducts.value
  },
  {
    label: 'Ingeniería',
    to: '/fabricacion/engineering',
    badge: 13
  },
  {
    label: 'BOM',
    to: '/bom'
  },
  {
    label: 'Costos',
    to: '/fabricacion/costing',
    badge: 16
  },
  {
    label: 'Configuraciones',
    to: '/productos/settings'
  }
]

const sections = [
  {
    title: 'Maestros',
    items: [
      {
        label: 'Productos',
        to: '/fabricacion/master-data/products'
      },
      {
        label: 'Categorías',
        to: '/fabricacion/master-data/categories'
      },
      {
        label: 'Etiquetas',
        to: '/fabricacion/master-data/tags'
      },
      {
        label: 'Plantillas de Costos',
        to: '/fabricacion/cost-templates'
      }
    ]
  },
  {
    title: 'Producción',
    items: [
      {
        label: 'Ingeniería',
        to: '/fabricacion/engineering'
      },
      {
        label: 'BOM',
        to: '/fabricacion/bom'
      },
      {
        label: 'Rutas',
        to: '/fabricacion/routes'
      }
    ]
  },
  {
    title: 'Reportes',
    items: [
      {
        label: 'Costos de Productos',
        to: '/fabricacion/reports/costs'
      },
      {
        label: 'Lista de Materiales',
        to: '/fabricacion/reports/bom'
      },
      {
        label: 'Variación de Costos',
        to: '/fabricacion/reports/cost-variance'
      }
    ]
  }
]
onMounted(async () => {
  await init()
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Stock" />

    <ModuleNavigationCard :shortcuts="shortcuts" :sections="sections" />
  </UPage>
</template>
