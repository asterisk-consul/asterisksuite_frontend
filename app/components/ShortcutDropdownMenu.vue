<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  items: DropdownMenuItem[] | DropdownMenuItem[][]
  label?: string
  icon?: string
  shortcutKeys?: string[]
  disabled?: boolean
  content?: Record<string, unknown>
}>(), {
  label: 'Más',
  icon: 'i-lucide-ellipsis',
  shortcutKeys: () => ['Alt', 'Shift', 'M'],
  disabled: false,
  content: () => ({ align: 'end' })
})

const open = defineModel<boolean>('open', { default: false })

const modifierKeys = new Set(['Alt', 'Ctrl', 'Control', 'Shift', 'Meta'])
type ShortcutMenuItem = DropdownMenuItem & { __shortcutKey?: string }

const shortcutItems = computed(() => {
  let shortcutIndex = 0

  const decorate = (item: DropdownMenuItem): ShortcutMenuItem => {
    if (!item.label || item.disabled || shortcutIndex >= 9) return { ...item }
    shortcutIndex += 1
    return { ...item, __shortcutKey: String(shortcutIndex) }
  }

  const source = props.items
  return Array.isArray(source[0])
    ? (source as DropdownMenuItem[][]).map(group => group.map(decorate))
    : (source as DropdownMenuItem[]).map(decorate)
})

const actionableItems = computed(() => shortcutItems.value
  .flat() as ShortcutMenuItem[])

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
  )
}

function matchesShortcut(event: KeyboardEvent) {
  const keys = props.shortcutKeys
  const key = keys.find(value => !modifierKeys.has(value))
  if (!key || event.key.toLowerCase() !== key.toLowerCase()) return false

  const wantsCtrl = keys.includes('Ctrl') || keys.includes('Control')
  return event.altKey === keys.includes('Alt')
    && event.ctrlKey === wantsCtrl
    && event.shiftKey === keys.includes('Shift')
    && event.metaKey === keys.includes('Meta')
}

function handleShortcut(event: KeyboardEvent) {
  if (open.value && /^[1-9]$/.test(event.key) && !isTypingTarget(event.target)) {
    const item = actionableItems.value.find(candidate => candidate.__shortcutKey === event.key)
    if (!item || item.disabled) return

    event.preventDefault()
    event.stopPropagation()
    open.value = false
    const action = item.onSelect ?? item.onClick
    if (typeof action === 'function') action()
    return
  }

  if (
    props.disabled
    || event.defaultPrevented
    || event.isComposing
    || event.repeat
    || isTypingTarget(event.target)
    || !matchesShortcut(event)
  ) return

  event.preventDefault()
  event.stopPropagation()
  open.value = true
}

onMounted(() => window.addEventListener('keydown', handleShortcut, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut, true))
</script>

<template>
  <UDropdownMenu v-model:open="open" :items="shortcutItems" :content="content" :disabled="disabled">
    <ShortcutButton
      v-bind="$attrs"
      :label="label"
      :icon="icon"
      :shortcut-keys="shortcutKeys"
      :disabled="disabled"
      variant="ghost"
      size="sm"
      trailing-icon="i-lucide-chevron-down"
    />
    <template #item-trailing="{ item }">
      <KeyboardShortcutHint
        v-if="item.__shortcutKey"
        :keys="[item.__shortcutKey]"
        size="2xs"
        class="shortcut-menu-item-hint ml-4 opacity-70"
      />
    </template>
  </UDropdownMenu>
</template>

<style>
.shortcut-menu-item-hint {
  animation: shortcut-menu-hint-in 140ms ease-out both;
}

@keyframes shortcut-menu-hint-in {
  from { opacity: 0; transform: translateX(0.2rem); }
  to { opacity: 0.7; transform: translateX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .shortcut-menu-item-hint { animation: none; }
}
</style>
