<script setup lang="ts">
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

defineProps<{
  product: Product | null
}>()
</script>

<template>
  <div class="space-y-5">
    <!-- Imagen -->

    <div class="aspect-square rounded-xl border border-default overflow-hidden bg-elevated">
      <img
        v-if="(product as any)?.image"
        :src="(product as any).image"
        :alt="product?.name"
        class="h-full w-full object-cover"
      />

      <div v-else class="h-full flex items-center justify-center">
        <UIcon name="i-lucide-package" class="size-12 text-muted" />
      </div>
    </div>

    <!-- Datos -->

    <div class="space-y-3">
      <div>
        <p class="text-xs text-muted">SKU</p>

        <p class="text-sm font-medium">
          {{ product?.sku }}
        </p>
      </div>

      <div>
        <p class="text-xs text-muted">Tipo</p>

        <p class="text-sm font-medium">
          {{ product?.product_type }}
        </p>
      </div>
    </div>

    <USeparator />

    <!-- Tags -->

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Etiquetas</span>

        <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="neutral" />
      </div>

      <div class="flex flex-wrap gap-1">
        <UBadge
          v-for="tag in (product as any)?.product_tags ?? []"
          :key="tag"
          :label="tag"
          size="sm"
          variant="subtle"
        />
      </div>
    </div>
  </div>
</template>
