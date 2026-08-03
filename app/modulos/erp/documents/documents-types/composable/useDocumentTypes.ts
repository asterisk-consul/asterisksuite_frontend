import { computed, ref } from 'vue'
import type { DocumentsType, CreateDocumentsTypeDto } from '../types/documents-types.types'

export interface DocumentTypeSelectItem {
  label: string
  value: string
}

export function useDocumentTypes() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const items = ref<DocumentsType[]>([])

  const init = async () => {
    loading.value = true
    try {
      items.value = await $fetch<DocumentsType[]>('/api/erp/documents/documents-types')
    } catch (e: any) {
      error.value = e?.data?.message || 'Error al cargar tipos'
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateDocumentsTypeDto) => {
    const created = await $fetch<DocumentsType>('/api/erp/documents/documents-types', {
      method: 'POST', body: payload
    })
    items.value.push(created)
    return created
  }

  const update = async (id: string, payload: Partial<CreateDocumentsTypeDto>) => {
    const updated = await $fetch<DocumentsType>(`/api/erp/documents/documents-types/${id}`, {
      method: 'PATCH', body: payload
    })
    const index = items.value.findIndex(i => i.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  const remove = async (id: string) => {
    await $fetch(`/api/trash/document_types/${id}`, { method: 'DELETE' })
    items.value = items.value.filter(i => i.id !== id)
  }

  const selectItems = computed<DocumentTypeSelectItem[]>(() =>
    items.value.map(dt => ({
      label: `${dt.code} - ${dt.description}`,
      value: dt.id
    }))
  )

  const saleTypes = computed(() => items.value.filter(dt => dt.direction === 1))
  const purchaseTypes = computed(() => items.value.filter(dt => dt.direction === -1))

  const findById = (id: string) => items.value.find(dt => dt.id === id)

  const formatLabel = (id: string) => {
    const dt = items.value.find(d => d.id === id)
    return dt ? `${dt.code} - ${dt.description}` : ''
  }

  return {
    items: computed(() => items.value),
    loading: computed(() => loading),
    error: computed(() => error),
    total: computed(() => items.value.length),
    selectItems,
    saleTypes,
    purchaseTypes,
    findById,
    formatLabel,
    init,
    create,
    update,
    remove
  }
}
