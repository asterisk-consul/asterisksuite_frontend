<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'
import BomTable from '~/modulos/logistica/master-data/product/costing/components/BomTable.vue'
import BomNavigation from '~/modulos/logistica/master-data/product/costing/components/BomNavigation.vue'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

definePageMeta({
  middleware: ['auth'],
  breadcrumb: [{ label: 'Fabricación', to: '/fabricacion' }, { label: 'BOM' }]
})

const { moduleCollapsed } = useModuleSidebarState()
const mobileOpen = ref(false)
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

// Cuando el toggle abre el módulo en móvil, abre el slideover
watch(moduleCollapsed, (collapsed) => {
  if (!collapsed && window.innerWidth < 1024) {
    mobileOpen.value = true
    // Volvemos a colapsar para que el aside de desktop no aparezca
    moduleCollapsed.value = true
  }
})

// Al cerrar el slideover, aseguramos que quede colapsado
watch(mobileOpen, (open) => {
  if (!open) moduleCollapsed.value = true
})

onMounted(init)
const pageUi = computed(() => ({
  root: moduleCollapsed.value ? 'flex flex-col' : 'flex flex-col lg:grid lg:grid-cols-[200px_1fr] lg:gap-2',
  left: 'lg:col-span-1 min-w-0',
  center: moduleCollapsed.value ? 'lg:col-span-full' : 'lg:col-span-1 min-w-0'
}))
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader title="BOM e ingeniería" description="Estructuras de materiales y costos de fabricación" show-module-toggle class="sticky top-0 z-10 px-4" :links="links" />

    <!-- Slideover para móvil/tablet -->
    <USlideover v-model:open="mobileOpen" side="left" title="Navegación" :ui="{ content: 'max-w-xs' }">
      <template #body>
        <BomNavigation />
      </template>
    </USlideover>

    <UPage :ui="pageUi">
      <!-- Sidebar solo en desktop -->
      <template v-if="!moduleCollapsed" #left>
        <UPageAside
          :ui="{
            root: 'hidden overflow-y-auto lg:block lg:sticky lg:top-(--ui-header-height) lg:max-h-[calc(100vh-var(--ui-header-height))]'
          }"
        >
          <BomNavigation />
        </UPageAside>
      </template>

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
