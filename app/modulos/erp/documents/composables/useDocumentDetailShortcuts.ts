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
  'Registrar cobro': 'p',
  Pagar: 'p',
  'Marcar pagado': 'p',
  Rechazar: 'r',
  Anular: 'a',
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
    if (document.querySelector('[role="dialog"][data-state="open"], [role="dialog"][aria-modal="true"], [role="alertdialog"][data-state="open"], [role="alertdialog"][aria-modal="true"], [role="listbox"][data-state="open"]')) return

    const shortcutKey = event.key.toLowerCase()
    const action = actions.value.find(item => item.label && actionShortcuts[item.label] === shortcutKey)
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
