<script setup lang="ts">
const route = useRoute()

const createTarget = shallowRef<HTMLElement | null>(null)
let observer: MutationObserver | null = null
let scanFrame: number | null = null

const isVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
}

const isDisabled = (element: HTMLElement) =>
  element.matches(':disabled, [aria-disabled="true"], [data-disabled]')

function findCreateTarget() {
  const explicitTargets = Array.from(document.querySelectorAll<HTMLElement>('[data-global-create-shortcut]'))
    .filter(element => isVisible(element) && !isDisabled(element))

  if (explicitTargets.length === 1) {
    createTarget.value = explicitTargets[0] ?? null
    return
  }

  const inferredTargets = Array.from(document.querySelectorAll<HTMLElement>('button, a[href]'))
    .filter(element => !element.hasAttribute('data-global-create-control'))
    .filter(element => isVisible(element) && !isDisabled(element))
    .filter((element) => {
      const label = element.getAttribute('aria-label') || element.textContent || ''
      return /^\s*nuev[oa]\b/i.test(label)
    })

  createTarget.value = inferredTargets.length === 1 ? (inferredTargets[0] ?? null) : null
}

function scheduleTargetScan() {
  if (scanFrame != null) cancelAnimationFrame(scanFrame)
  scanFrame = requestAnimationFrame(() => {
    scanFrame = null
    findCreateTarget()
  })
}

const isTypingTarget = (target: EventTarget | null) => target instanceof HTMLElement && (
  target.isContentEditable
  || Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
)

function hasOpenDialog() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).some(isVisible)
}

function triggerCreate() {
  if (!createTarget.value || hasOpenDialog()) return
  createTarget.value.click()
}

function handleCreateShortcut(event: KeyboardEvent) {
  if (
    event.defaultPrevented
    || event.isComposing
    || event.repeat
    || event.key.toLowerCase() !== 'n'
    || !event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || isTypingTarget(event.target)
    || hasOpenDialog()
    || !createTarget.value
  ) return

  event.preventDefault()
  event.stopImmediatePropagation()
  triggerCreate()
}

watch(() => route.fullPath, () => nextTick(scheduleTargetScan))

onMounted(() => {
  scheduleTargetScan()
  observer = new MutationObserver(scheduleTargetScan)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'style']
  })
  window.addEventListener('keydown', handleCreateShortcut, true)
})

onBeforeUnmount(() => {
  if (scanFrame != null) cancelAnimationFrame(scanFrame)
  observer?.disconnect()
  window.removeEventListener('keydown', handleCreateShortcut, true)
})
</script>

<template>
  <UButton
    v-if="createTarget && !createTarget.hasAttribute('data-hide-global-create-control')"
    data-global-create-control
    label="Crear"
    icon="i-lucide-plus"
    color="neutral"
    variant="ghost"
    class="group/create"
    aria-keyshortcuts="Alt+N"
    title="Crear nuevo (Alt + N)"
    @click="triggerCreate"
  >
    <template #trailing>
      <KeyboardShortcutHint :keys="['Alt', 'N']" size="2xs" reveal-on-hover />
    </template>
  </UButton>
</template>
