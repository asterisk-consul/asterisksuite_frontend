<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'fabricacion'
})
const shortcuts = [
  { label: 'BOM Creator', to: '/fabricacion/bom/create' },
  { label: 'BOM', to: '/bom' },
  { label: 'Production Plan', to: '/fabricacion/production-plans' },
  { label: 'Work Order', to: '/fabricacion/work-orders' }
]

const sections = [
  {
    title: 'Producción',
    items: ['Ordenes de Producción', 'Planes de Producción', 'Partes de Producción', 'Control de Calidad', 'Paradas']
  },
  {
    title: 'Ingeniería',
    items: ['Productos', 'BOM', 'Operaciones', 'Rutas', 'Centros de Trabajo']
  },
  {
    title: 'Reportes',
    items: ['Costos', 'Consumos', 'Eficiencia', 'Tiempos', 'Trazabilidad']
  }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Fabricación" />

    <UCard>
      <div class="space-y-8">
        <!-- SHORTCUTS -->
        <section>
          <h2 class="text-xl font-semibold mb-4">Atajos</h2>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ULink
              v-for="shortcut in shortcuts"
              :key="shortcut.label"
              :to="shortcut.to"
              class="flex items-center gap-2 hover:text-primary"
            >
              {{ shortcut.label }}

              <UIcon name="i-lucide-arrow-up-right" class="size-4" />
            </ULink>
          </div>
        </section>

        <!-- REPORTS & MASTERS -->
        <section>
          <h2 class="text-xl font-semibold mb-6">Reportes y Maestros</h2>

          <div class="grid md:grid-cols-3 gap-10">
            <div v-for="section in sections" :key="section.title">
              <h3 class="font-semibold text-lg mb-4">
                {{ section.title }}
              </h3>

              <div class="flex flex-col gap-3">
                <ULink v-for="item in section.items" :key="item" class="flex items-center gap-2">
                  {{ item }}

                  <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-muted" />
                </ULink>
              </div>
            </div>
          </div>
        </section>
      </div>
    </UCard>
  </UPage>
</template>
