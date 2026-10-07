<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'
import BomTable from '~/modulos/logistica/master-data/product/costing/components/BomTable.vue'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

definePageMeta({
  middleware: ['auth'],
  breadcrumb: [{ label: 'Fabricación', to: '/fabricacion' }, { label: 'BOM' }]
})

const { init, products } = useProducts()

const bomProducts = computed(() => products.value.filter(product => ['BOM', 'ENGINEERING'].includes(product.cost_source)))
const calculatedProducts = computed(() => bomProducts.value.filter(product => product.last_cost_calculated_at).length)
const pendingProducts = computed(() => bomProducts.value.length - calculatedProducts.value)

const links = computed<ButtonProps[]>(() => [{
  label: 'Nuevo BOM',
  icon: 'i-lucide-plus',
  to: '/bom/create',
  color: 'primary',
  variant: 'solid'
}])

onMounted(init)
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader title="BOM e ingeniería" description="Estructuras de materiales y costos de fabricación" class="sticky top-0 z-10 px-4" :links="links" />

    <UPage>
      <UPageBody>
        <div class="grid gap-3 sm:grid-cols-3">
          <UCard>
            <p class="text-xs text-muted">Estructuras</p>
            <p class="mt-1 text-2xl font-semibold">{{ bomProducts.length }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted">Con costo calculado</p>
            <p class="mt-1 text-2xl font-semibold text-success">{{ calculatedProducts }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted">Pendientes de calcular</p>
            <p class="mt-1 text-2xl font-semibold" :class="pendingProducts ? 'text-warning' : 'text-muted'">{{ pendingProducts }}</p>
          </UCard>
        </div>
        <BomTable />
      </UPageBody>
    </UPage>
  </div>
</template>
