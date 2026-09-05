<script setup lang="ts">
const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const option = computed(() => ({
  tooltip: {},
  xAxis: { data: props.labels },
  yAxis: {},
  series: [{ name: 'Stock', type: 'bar', data: props.values }]
}))
</script>

<template>
  <VChart :option="option" style="height: 300px" autoresize />
</template>
