<script setup lang="ts">
import { useCosting } from '../composables/useCosting'

const props = defineProps<{
  productId: string
  currencyId: string
}>()

const { latestCost, latestMaterialCost, latestLaborCost, latestOverheadCost, latestSnapshot, formatCurrency } =
  useCosting(props.productId, props.currencyId)

const cards = computed(() => [
  {
    label: 'Costo total',
    value: latestCost.value,
    symbol: latestSnapshot.value?.currencies?.symbol ?? '$',
    icon: 'i-heroicons-banknotes',
    color: 'primary'
  },
  {
    label: 'Material',
    value: latestMaterialCost.value,
    symbol: latestSnapshot.value?.currencies?.symbol ?? '$',
    icon: 'i-heroicons-cube',
    color: 'blue'
  },
  {
    label: 'Mano de obra',
    value: latestLaborCost.value,
    symbol: latestSnapshot.value?.currencies?.symbol ?? '$',
    icon: 'i-heroicons-wrench-screwdriver',
    color: 'green'
  },
  {
    label: 'Costos indirectos',
    value: latestOverheadCost.value,
    symbol: latestSnapshot.value?.currencies?.symbol ?? '$',
    icon: 'i-heroicons-building-office',
    color: 'orange'
  }
])
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <UCard v-for="card in cards" :key="card.label">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <p class="text-xs text-muted">{{ card.label }}</p>
          <p class="text-xl font-bold tabular-nums">
            {{ formatCurrency(card.value, card.symbol) }}
          </p>
        </div>
        <UIcon :name="card.icon" class="size-5 text-muted mt-0.5" />
      </div>
    </UCard>
  </div>
</template>
