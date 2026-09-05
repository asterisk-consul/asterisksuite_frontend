<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
definePageMeta({
  middleware: ['auth'],
})

const { init, activeProducts } = useProducts()

const shortcuts = computed(() => [
  {
    label: 'Productos',
    to: '/productos',
    badge: activeProducts.value,
    icon: 'i-lucide-package'
  },
  {
    label: 'Depósitos',
    to: '/productos/warehouses',
    icon: 'i-lucide-warehouse'
  },
  {
    label: 'BOM',
    to: '/bom',
    icon: 'i-lucide-git-branch'
  },
  {
    label: 'Costos',
    to: '/productos/costos',
    icon: 'i-lucide-dollar-sign'
  },
  {
    label: 'Configuraciones',
    to: '/productos/settings',
    icon: 'i-lucide-settings'
  }
])

const sections = [
  {
    title: 'Gestión de Stock',
    items: [
      {
        label: 'Productos',
        to: '/productos'
      },
      {
        label: 'Depósitos',
        to: '/productos/warehouses'
      }
    ]
  },
  {
    title: 'Configuración',
    items: [
      {
        label: 'Categorías',
        to: '/productos/settings/categorias'
      },
      {
        label: 'Etiquetas',
        to: '/productos/settings/tags'
      },
      {
        label: 'Unidades',
        to: '/productos/settings/unidades'
      },
      {
        label: 'Atributos',
        to: '/productos/settings/attributes'
      }
    ]
  },
  {
    title: 'Ingeniería y Costos',
    items: [
      {
        label: 'BOM (Ingeniería)',
        to: '/bom'
      },
      {
        label: 'Plantillas de costo',
        to: '/cost-templates'
      },
      {
        label: 'Costos de productos',
        to: '/productos/costos'
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
