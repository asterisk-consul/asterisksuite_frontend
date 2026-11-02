<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const canGoBack = ref(false)

function refreshHistoryState() {
  canGoBack.value = Boolean(window.history.state?.back)
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
  )
}

function hasOpenOverlay() {
  return Boolean(document.querySelector([
    '[role="alertdialog"][data-state="open"]',
    '[role="alertdialog"][aria-modal="true"]',
    '[role="dialog"][data-state="open"]',
    '[role="dialog"][aria-modal="true"]',
    '[role="menu"][data-state="open"]',
    '[role="listbox"][data-state="open"]',
    '[role="combobox"][aria-expanded="true"]',
    '[aria-haspopup="listbox"][aria-expanded="true"]'
  ].join(', ')))
}

function goBack() {
  if (!canGoBack.value) return
  router.back()
}

function handleBackShortcut(event: KeyboardEvent) {
  if (
    !canGoBack.value
    || event.defaultPrevented
    || event.isComposing
    || event.repeat
    || event.key !== 'Escape'
    || event.ctrlKey
    || event.altKey
    || event.metaKey
    || event.shiftKey
    || isTypingTarget(event.target)
    || hasOpenOverlay()
  ) return

  event.preventDefault()
  event.stopPropagation()
  goBack()
}

watch(() => route.fullPath, () => nextTick(refreshHistoryState))

onMounted(() => {
  refreshHistoryState()
  window.addEventListener('keydown', handleBackShortcut)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleBackShortcut))
</script>

<template>
  <ShortcutButton
    v-if="canGoBack"
    label="Volver"
    icon="i-lucide-arrow-left"
    :shortcut-keys="['Esc']"
    help="Volver a la pantalla anterior"
    color="neutral"
    variant="ghost"
    @click="goBack"
  />
</template>
