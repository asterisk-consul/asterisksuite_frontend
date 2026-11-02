<script setup lang="ts">
import LogisticaTable from './LogisticaTable.vue'
import type { TableFilter } from './types/tablas.types'

defineOptions({ inheritAttrs: false })
// Este componente es un alias histórico y reenvía cualquier prop/evento al genérico.
const LogisticaTableCompat = LogisticaTable as any
const filters = defineModel<TableFilter[]>('filters', { default: () => [] })
</script>

<template>
  <LogisticaTableCompat v-bind="$attrs" v-model:filters="filters">
    <template v-for="(_, name) in $slots" :key="name" v-slot:[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </LogisticaTableCompat>
</template>
