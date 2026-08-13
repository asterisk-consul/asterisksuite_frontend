<script setup lang="ts">
defineProps<{
  data?: {
    pending: number
  }
  loading?: boolean
}>()
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-package-check" class="size-5 text-warning" />
          <h3 class="text-sm font-semibold">Picking Pendiente</h3>
        </div>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
    </div>

    <div v-else class="space-y-3">
      <div class="p-3 rounded-lg bg-muted/30">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted font-medium">Órdenes sin ejecutar</span>
          <span
            class="text-sm font-bold"
            :class="(data?.pending ?? 0) > 0 ? 'text-warning' : 'text-success'"
          >
            {{ data?.pending ?? 0 }}
          </span>
        </div>
      </div>
      <p v-if="(data?.pending ?? 0) > 0" class="text-xs text-muted text-center">
        Hay picking pendiente para ejecutar
      </p>
      <p v-else class="text-xs text-success text-center">
        No hay picking pendiente
      </p>
    </div>
  </UPageCard>
</template>
