<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
defineProps<{
  data: any[]
  columns: TableColumn<any>[]
  loading: boolean
}>()
</script>
<template>
  <UTable
    :loading="loading"
    sticky
    :data="data"
    :columns="columns"
    class="border border-default rounded-lg"
  />
</template>
