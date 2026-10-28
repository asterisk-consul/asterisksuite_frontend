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

const tooltipText = computed(() => [
  props.action.help,
  props.shortcutKeys?.length ? `Atajo: ${props.shortcutKeys.join(' + ')}` : null,
].filter(Boolean).join(' · '))
</script>

<template>
  <UTooltip
    :text="tooltipText"
    :delay-duration="350"
    :content="{ side: 'bottom', align: 'center', sideOffset: 8 }"
    :ui="{ content: 'max-w-72 whitespace-normal text-left leading-5' }"
  >
    <UButton
      v-bind="{ ...action, label: undefined, 'aria-keyshortcuts': shortcutKeys?.join('+') }"
      size="sm"
      class="gap-2"
    >
      <span>{{ action.label }}</span>
      <KeyboardShortcutHint v-if="shortcutKeys?.length" :keys="shortcutKeys" size="2xs" />
    </UButton>
  </UTooltip>
</template>
