<script setup lang="ts">
import { useEngineering } from '../composables/useEngineering'
import type { ProductType } from '~/modulos/logistica/master-data/product/types/product.types'

const props = defineProps<{
  productId: string
}>()

const { flattenTree, tree, loading, hasTree } = useEngineering(props.productId)

const flatNodes = computed(() => flattenTree())

type BadgeColor = 'error' | 'success' | 'neutral' | 'primary' | 'secondary' | 'info' | 'warning'

const PRODUCT_TYPE_COLORS: Record<ProductType, BadgeColor> = {
  RAW_MATERIAL: 'neutral',
  SEMI_FINISHED: 'info',
  FINISHED_PRODUCT: 'success',
  SERVICE: 'warning',
  CONSUMABLE: 'secondary'
}
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'MP',
  SEMI_FINISHED: 'ST',
  FINISHED_PRODUCT: 'PT',
  SERVICE: 'SV'
}
</script>

<template>
  <div class="space-y-1">
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="size-5 animate-spin text-muted" />
    </div>

    <div v-else-if="!hasTree" class="flex flex-col items-center gap-2 py-8 text-center">
      <UIcon name="i-heroicons-circle-stack" class="size-8 text-muted" />
      <p class="text-sm text-muted">Sin componentes de ingeniería</p>
    </div>

    <div
      v-for="{ node, depth } in flatNodes"
      :key="node.id"
      class="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-elevated transition-colors"
      :style="{ paddingLeft: `${depth * 1.5 + 0.75}rem` }"
    >
      <!-- Indentación visual -->
      <div v-if="depth > 0" class="flex items-center">
        <div class="h-px w-4 bg-default mr-1" />
      </div>

      <!-- Tipo badge -->
      <UBadge
        :label="PRODUCT_TYPE_LABELS[node.child_product.product_type] ?? '—'"
        :color="PRODUCT_TYPE_COLORS[node.child_product.product_type as ProductType] ?? 'neutral'"
        variant="subtle"
        size="xs"
        class="shrink-0"
      />

      <!-- Info producto -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium truncate">
            {{ node.child_product.name }}
          </span>
          <span v-if="node.child_variant" class="text-xs text-muted">· {{ node.child_variant.name }}</span>
        </div>
        <span v-if="node.child_product.sku" class="text-xs text-muted font-mono">
          {{ node.child_product.sku }}
        </span>
      </div>

      <!-- Cantidad y unidad -->
      <div class="text-right shrink-0">
        <span class="text-sm font-medium tabular-nums">× {{ node.quantity }}</span>
        <span v-if="node.units" class="text-xs text-muted ml-1">
          {{ node.units.symbol }}
        </span>
      </div>

      <!-- Desperdicio -->
      <UBadge
        v-if="node.waste_percentage"
        :label="`+${node.waste_percentage}%`"
        color="warning"
        variant="subtle"
        size="xs"
      />

      <!-- Costo -->
      <span v-if="node.child_product.current_cost" class="text-sm tabular-nums text-muted shrink-0">
        ${{ Number(node.child_product.current_cost).toLocaleString('es-AR') }}
      </span>
    </div>
  </div>
</template>
