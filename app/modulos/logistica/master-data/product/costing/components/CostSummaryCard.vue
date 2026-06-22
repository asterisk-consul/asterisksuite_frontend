<script setup lang="ts">
const props = defineProps<{
  totalCost: number | string
  materialCost: number | string
  laborCost: number | string
  overheadCost: number | string
  currencySymbol?: string
}>()

const symbol = computed(() => props.currencySymbol ?? '$')

const toNum = (val: number | string) => {
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

const formatMoney = (value: number | string) => {
  return `${symbol.value} ${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNum(value))}`
}

const percentages = computed(() => {
  const total = toNum(props.totalCost) || 1
  return {
    material: (toNum(props.materialCost) / total) * 100,
    labor: (toNum(props.laborCost) / total) * 100,
    overhead: (toNum(props.overheadCost) / total) * 100
  }
})
</script>

<template>
  <UCard>
    <div class="space-y-5">
      <div>
        <p class="text-sm text-muted">Costo Total</p>
        <p class="text-3xl font-bold">{{ formatMoney(totalCost) }}</p>
      </div>

      <div class="overflow-hidden h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 flex">
        <div class="bg-success transition-all" :style="{ width: `${percentages.material}%` }" />
        <div class="bg-warning transition-all" :style="{ width: `${percentages.labor}%` }" />
        <div class="bg-info transition-all" :style="{ width: `${percentages.overhead}%` }" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Materiales</p>
          <p class="font-semibold">{{ formatMoney(materialCost) }}</p>
          <p class="text-xs text-success">{{ percentages.material.toFixed(1) }}%</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Mano de obra</p>
          <p class="font-semibold">{{ formatMoney(laborCost) }}</p>
          <p class="text-xs text-warning">{{ percentages.labor.toFixed(1) }}%</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Overhead</p>
          <p class="font-semibold">{{ formatMoney(overheadCost) }}</p>
          <p class="text-xs text-info">{{ percentages.overhead.toFixed(1) }}%</p>
        </div>
      </div>
    </div>
  </UCard>
</template>
