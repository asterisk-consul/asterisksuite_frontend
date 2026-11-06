<script setup lang="ts">
const props = defineProps<{
  action: {
    label: string
    help?: string
    icon?: string
    [key: string]: any
  }
  shortcutKeys?: string[]
}>()

</script>

<template>
  <ShortcutButton
    v-bind="{ ...action, label: undefined, help: undefined }"
    :label="action.label"
    :help="action.help"
    :shortcut-keys="shortcutKeys"
    size="sm"
    class="gap-2"
  >
    <span>{{ action.label }}</span>
  </ShortcutButton>
</template>
