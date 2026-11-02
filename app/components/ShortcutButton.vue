<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label: string
  shortcutKeys?: string[]
  help?: string
  revealShortcut?: boolean
}>(), {
  shortcutKeys: () => [],
  help: undefined,
  revealShortcut: true
})

const ariaKeyNames: Record<string, string> = {
  Ctrl: 'Control',
  Esc: 'Escape',
  '↵': 'Enter'
}

const ariaShortcut = computed(() => props.shortcutKeys.length
  ? props.shortcutKeys.map(key => ariaKeyNames[key] ?? key).join('+')
  : undefined)

const tooltipText = computed(() => [
  props.help,
  props.shortcutKeys.length ? `Atajo: ${props.shortcutKeys.join(' + ')}` : null
].filter(Boolean).join(' · '))
</script>

<template>
  <UTooltip
    :text="tooltipText"
    :disabled="!tooltipText"
    :delay-duration="350"
    :content="{ side: 'bottom', align: 'center', sideOffset: 8 }"
    :ui="{ content: 'max-w-72 whitespace-normal text-left leading-5' }"
  >
    <UButton
      v-bind="$attrs"
      :label="label"
      :aria-keyshortcuts="ariaShortcut"
      class="group/create"
    >
      <template v-if="$slots.leading" #leading>
        <slot name="leading" />
      </template>
      <slot />
      <template v-if="$slots.trailing || shortcutKeys.length" #trailing>
        <slot name="trailing" />
        <KeyboardShortcutHint
          v-if="shortcutKeys.length"
          :keys="shortcutKeys"
          size="2xs"
          :reveal-on-hover="revealShortcut"
        />
      </template>
    </UButton>
  </UTooltip>
</template>
