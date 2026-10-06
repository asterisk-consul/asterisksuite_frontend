<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Historial de fabricación' })

const { data: productions, status, refresh } = await useFetch<any[]>('/api/backend/warehouse/stock/production/history', { query: { limit: 50 }, default: () => [] })
const dateFormatter = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="flex h-full flex-col">
    <AppPageHeader title="Historial de fabricación" description="Productos ingresados y referencias de cada fabricación" show-module-toggle class="sticky top-0 z-20 border-b border-default bg-default px-4">
      <template #right><UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" @click="refresh" /></template>
    </AppPageHeader>
    <UPage><UPageBody class="mx-auto w-full max-w-6xl">
      <UCard>
        <div v-if="status === 'pending'" class="space-y-3"><USkeleton v-for="i in 5" :key="i" class="h-14 w-full" /></div>
        <div v-else-if="!productions.length" class="py-12 text-center"><UIcon name="i-lucide-history" class="mx-auto size-10 text-muted" /><p class="mt-3 font-medium">Todavía no hay fabricaciones</p><UButton class="mt-4" label="Registrar fabricación" to="/fabricacion/fabricar" /></div>
        <div v-else class="divide-y divide-default">
          <div v-for="production in productions" :key="`${production.id}-${production.created_at}`" class="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_120px_220px] sm:items-center">
            <div><p class="font-medium">{{ production.product?.name }}</p><p class="text-xs text-muted">{{ production.product?.sku || 'Sin SKU' }} · Ref. {{ production.id?.slice(0, 8) }}</p></div>
            <div><p class="text-xs text-muted">Cantidad</p><p class="font-semibold">{{ Number(production.quantity).toLocaleString('es-AR') }}</p></div>
            <div class="sm:text-right"><p class="text-sm">{{ production.warehouse?.name }}</p><p class="text-xs text-muted">{{ dateFormatter.format(new Date(production.created_at)) }}</p></div>
          </div>
        </div>
      </UCard>
    </UPageBody></UPage>
  </div>
</template>
