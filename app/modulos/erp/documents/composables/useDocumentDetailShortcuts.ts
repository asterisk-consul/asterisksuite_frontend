import type { ComputedRef, Ref } from 'vue'

type DocumentAction = {
  label?: string
  disabled?: boolean
  onClick?: () => unknown
}

const actionShortcuts: Record<string, string> = {
  Editar: 'm',
  Imprimir: 'i',
  Confirmar: 'c',
}

export function useDocumentDetailShortcuts(
  actions: ComputedRef<DocumentAction[]>,
  modalStates: Array<Ref<boolean>> = [],
) {
  function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || event.repeat || isTypingTarget(event.target)) return
    if (modalStates.some(modal => modal.value)) return
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

    const shortcutKey = event.key.toLowerCase()
    const label = Object.keys(actionShortcuts).find(actionLabel => actionShortcuts[actionLabel] === shortcutKey)
    if (!label) return

    const action = actions.value.find(item => item.label === label)
    if (!action?.onClick || action.disabled) return

    event.preventDefault()
    event.stopPropagation()
    void action.onClick()
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown, true))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown, true))

  return {
    shortcutKeys: (label: string) => {
      const key = actionShortcuts[label]
      return key ? ['Alt', key.toUpperCase()] : undefined
    },
  }
}
