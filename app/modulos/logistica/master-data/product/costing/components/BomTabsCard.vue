<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const activeTab = defineModel<string>('activeTab', {
  default: 'general'
})

const tabs: TabsItem[] = [
  {
    label: 'General',
    value: 'general'
  },
  {
    label: 'Ingeniería',
    value: 'ingenieria'
  },
  {
    label: 'Costos',
    value: 'costos'
  }
]
</script>

<template>
  <div class="rounded-xl border border-default bg-default overflow-hidden">
    <div class="border-b border-default px-4">
      <UTabs v-model="activeTab" :items="tabs" :content="false" variant="link" />
    </div>

    <div class="p-6 min-h-150">
      <slot :active-tab="activeTab" />
    </div>
  </div>
</template>
