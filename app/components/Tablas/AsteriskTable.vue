<script setup lang="ts">
import LogisticaTable from './LogisticaTable.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <LogisticaTable v-bind="$attrs">
    <template v-for="(_, name) in $slots" :key="name" v-slot:[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </LogisticaTable>
</template>
