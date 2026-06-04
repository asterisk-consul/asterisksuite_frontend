<script setup lang="ts">
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

import BomSidebarContent from './BomSidebarContent.vue'

defineProps<{
  product: Product | null
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  'update:mobileOpen': [value: boolean]
}>()
</script>

<template>
  <!-- MOBILE -->

  <USlideover
    :open="mobileOpen"
    side="left"
    title="Información"
    :ui="{ content: 'max-w-sm' }"
    @update:open="emit('update:mobileOpen', $event)"
  >
    <template #body>
      <BomSidebarContent :product="product" />
    </template>
  </USlideover>

  <!-- DESKTOP -->

  <UPageAside
    :ui="{
      root: 'hidden overflow-y-auto lg:block lg:sticky lg:top-(--ui-header-height) lg:max-h-[calc(100vh-var(--ui-header-height))]'
    }"
  >
    <BomSidebarContent :product="product" class="w-full" />
  </UPageAside>
</template>
