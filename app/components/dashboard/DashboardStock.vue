<script setup lang="ts">
const props = defineProps<{
  data?: {
    totalProducts: number
    totalQuantity: number
    totalReserved: number
    lowStockCount: number
  }
  loading?: boolean
}>()

const stats = computed(() => {
  if (!props.data) return []
  return [
    {
      label: 'Productos con stock',
      value: props.data.totalProducts,
      icon: 'i-lucide-box',
      color: 'primary',
    },
    {
      label: 'Stock total',
      value: props.data.totalQuantity.toLocaleString('es-AR'),
      icon: 'i-lucide-packages',
      color: 'success',
    },
    {
      label: 'Reservado',
      value: props.data.totalReserved.toLocaleString('es-AR'),
      icon: 'i-lucide-lock',
      color: 'warning',
    },
    {
      label: 'Bajo stock',
      value: props.data.lowStockCount,
      icon: 'i-lucide-alert-triangle',
      color: props.data.lowStockCount > 0 ? 'error' : 'success',
    },
  ]
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-box" class="size-5 text-primary" />
          <h3 class="text-sm font-semibold">Stock</h3>
        </div>
        <NuxtLink to="/stock" class="text-xs text-primary hover:underline font-medium">
          Ver más
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="grid grid-cols-2 gap-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <div v-else-if="!data || data.totalProducts === 0" class="text-center py-6 text-muted text-sm">
      No hay stock registrado
    </div>

    <div v-else class="grid grid-cols-2 gap-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="p-3 rounded-lg bg-muted/30"
      >
        <div class="flex items-center gap-2 mb-1">
          <UIcon :name="stat.icon" class="size-4" :class="`text-${stat.color}`" />
          <span class="text-xs text-muted">{{ stat.label }}</span>
        </div>
        <p class="text-lg font-bold">{{ stat.value }}</p>
      </div>
    </div>
  </UPageCard>
</template>
