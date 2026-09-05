<script setup lang="ts">
const props = defineProps<{
  data?: {
    totalProducts: number
    costed: number
    uncosted: number
  }
  loading?: boolean
}>()

const costPercentage = computed(() => {
  if (!props.data || props.data.totalProducts === 0) return 0
  return Math.round((props.data.costed / props.data.totalProducts) * 100)
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calculator" class="size-5 text-info" />
          <h3 class="text-sm font-semibold">Costeados vs No Costeados</h3>
        </div>
        <NuxtLink to="/productos/costos" class="text-xs text-primary hover:underline font-medium">
          Ver productos
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-16 rounded-lg" />
    </div>

    <div v-else-if="!data || data.totalProducts === 0" class="text-center py-6 text-muted text-sm">
      No hay productos
    </div>

    <div v-else class="space-y-3">
      <div class="p-3 rounded-lg bg-success/5 border border-success/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success" />
            <span class="text-xs text-muted font-medium">Costeados</span>
          </div>
          <span class="text-sm font-bold text-success">{{ data.costed }}</span>
        </div>
      </div>
      <div class="p-3 rounded-lg bg-error/5 border border-error/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-error" />
            <span class="text-xs text-muted font-medium">Sin costear</span>
          </div>
          <span class="text-sm font-bold text-error">{{ data.uncosted }}</span>
        </div>
      </div>
      <div class="pt-2 border-t border-default">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs text-muted">Cobertura de costeo</span>
          <span class="text-sm font-bold text-primary">{{ costPercentage }}%</span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
