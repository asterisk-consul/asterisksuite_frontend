<script setup lang="ts">
const props = defineProps<{
  totalCost: number
  materialCost: number
  laborCost: number
  overheadCost: number
  currencySymbol?: string
}>()

const currencySymbol = computed(() => props.currencySymbol ?? '$')

const formatMoney = (value: number) => {
  return `${currencySymbol.value} ${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`
}

const percentages = computed(() => {
  const total = props.totalCost || 1

  return {
    material: (props.materialCost / total) * 100,
    labor: (props.laborCost / total) * 100,
    overhead: (props.overheadCost / total) * 100
  }
})
</script>

<template>
  <UCard>
    <div class="space-y-5">
      <!-- Total -->
      <div>
        <p class="text-sm text-muted">Costo Total</p>

        <p class="text-3xl font-bold">
          {{ formatMoney(totalCost) }}
        </p>
      </div>

      <!-- Barra visual -->
      <div class="overflow-hidden h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 flex">
        <div class="bg-success" :style="{ width: `${percentages.material}%` }" />

        <div class="bg-warning" :style="{ width: `${percentages.labor}%` }" />

        <div class="bg-info" :style="{ width: `${percentages.overhead}%` }" />
      </div>

      <!-- Detalle -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Materiales</p>

          <p class="font-semibold">
            {{ formatMoney(materialCost) }}
          </p>

          <p class="text-xs text-success">{{ percentages.material.toFixed(1) }}%</p>
        </div>

        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Mano de obra</p>

          <p class="font-semibold">
            {{ formatMoney(laborCost) }}
          </p>

          <p class="text-xs text-warning">{{ percentages.labor.toFixed(1) }}%</p>
        </div>

        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted">Overhead</p>

          <p class="font-semibold">
            {{ formatMoney(overheadCost) }}
          </p>

          <p class="text-xs text-info">{{ percentages.overhead.toFixed(1) }}%</p>
        </div>
      </div>
    </div>
  </UCard>
</template>
