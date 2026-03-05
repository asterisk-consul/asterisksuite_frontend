import { computed, type Ref } from 'vue'
import type { DocumentType } from '~/types/logistica/transport-document/document-types'

export interface SelectItem {
  label: string
  value: string
}

export function useDocuments(documents: Ref<DocumentType[]>) {
  const items = computed<SelectItem[]>(() =>
    documents.value.map((document) => {
      const label = document.name

      return {
        label,
        value: document.id
      }
    })
  )

  return {
    items
  }
}
