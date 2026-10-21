<script setup lang="ts">
import LogisticaTable from './LogisticaTable.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <LogisticaTable v-bind="$attrs" v-slots="$slots" />
</template>
