<script setup lang="ts">
defineProps<{
  data?: {
    planned: number
    inProgress: number
  }
  loading?: boolean
}>()
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-route" class="size-5 text-info" />
          <h3 class="text-sm font-semibold">Viajes Activos</h3>
        </div>
        <NuxtLink to="/logistica/viajes" class="text-xs text-primary hover:underline font-medium">
          Ver todos
        </NuxtLink>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-16 rounded-lg" />
    </div>

    <div v-else-if="(data?.planned ?? 0) + (data?.inProgress ?? 0) === 0" class="text-center py-6 text-muted text-sm">
      No hay viajes activos
    </div>

    <div v-else class="space-y-3">
      <div v-if="(data?.planned ?? 0) > 0" class="p-3 rounded-lg bg-info/5 border border-info/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-info" />
            <span class="text-xs text-muted font-medium">Planificados</span>
          </div>
          <span class="text-sm font-bold text-info">{{ data?.planned ?? 0 }}</span>
        </div>
      </div>
      <div v-if="(data?.inProgress ?? 0) > 0" class="p-3 rounded-lg bg-warning/5 border border-warning/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-warning" />
            <span class="text-xs text-muted font-medium">En curso</span>
          </div>
          <span class="text-sm font-bold text-warning">{{ data?.inProgress ?? 0 }}</span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
