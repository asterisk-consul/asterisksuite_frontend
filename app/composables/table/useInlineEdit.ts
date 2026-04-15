import { ref, h, type Component } from 'vue'
import { UInput } from '#components'

export type EditableValue = string | null | undefined

export interface InlineEditActions<T, F extends string> {
  onInlineSave?: (row: T, field: F, value: EditableValue) => void
}

export function useInlineEdit<T extends { id: string }, F extends string>() {
  const editing = ref<{ id: string; field: F } | null>(null)

  // 👉 estado LOCAL del input
  const localValue = ref<EditableValue>('')

  const startEdit = (id: string, field: F, value: EditableValue) => {
    editing.value = { id, field }
    localValue.value = value ?? ''
  }

  const stopEdit = () => {
    editing.value = null
  }

  const isEditing = (id: string, field: F) =>
    editing.value?.id === id && editing.value?.field === field

  function editableCell(field: F, row: T, actions: InlineEditActions<T, F>) {
    const id = row.id
    const originalValue = (row as any)[field]
    const displayValue = originalValue ?? ''

    const save = () => {
      if (localValue.value !== originalValue) {
        actions.onInlineSave?.(row, field, localValue.value)
      }
      stopEdit()
    }

    const cancel = () => {
      localValue.value = originalValue
      stopEdit()
    }

    if (isEditing(id, field)) {
      return h(UInput as unknown as Component, {
        modelValue: localValue.value,
        size: 'lg',
        autofocus: true,

        // 🔥 SOLO estado local
        'onUpdate:modelValue': (v: string) => {
          localValue.value = v
        },

        onBlur: save,

        onKeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }
      })
    }

    return h(
      'div',
      {
        class:
          'cursor-pointer hover:bg-primary/5 hover:text-primary px-2 py-1 rounded',
        onClick: () => startEdit(id, field, displayValue)
      },
      displayValue || '—'
    )
  }

  return {
    editableCell,
    startEdit,
    stopEdit,
    isEditing
  }
}
