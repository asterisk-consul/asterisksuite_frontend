import { computed, ref } from 'vue'
import type { DocumentsType, CreateDocumentsTypeDto } from '../types/documents-types.types'
import { useDocumentsTypesService } from '../services/documents-types.service'

import { useDocumentsTypesStore } from '../store/documents-types.store'

export interface DocumentTypeSelectItem {
  label: string
  value: string
}

export function useDocumentTypes() {
  const service = useDocumentsTypesService()
  const sharedStore = useDocumentsTypesStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const items = ref<DocumentsType[]>([])

  const init = async () => {
    loading.value = true
    try {
      const requestedScope = sharedStore.currentCacheScope()
      const fetchedItems = await sharedStore.fetchAll({ force: true })
      if (sharedStore.currentCacheScope() === requestedScope) items.value = fetchedItems
    } catch (e: any) {
      error.value = e?.data?.message || 'Error al cargar tipos'
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateDocumentsTypeDto) => {
    const requestedScope = sharedStore.currentCacheScope()
    const created = await service.create(payload)
    if (requestedScope && sharedStore.currentCacheScope() === requestedScope) {
      items.value.push(created)
      sharedStore.upsert(created, requestedScope)
    }
    return created
  }

  const update = async (id: string, payload: Partial<CreateDocumentsTypeDto>) => {
    const requestedScope = sharedStore.currentCacheScope()
    const updated = await service.update(id, payload)
    if (requestedScope && sharedStore.currentCacheScope() === requestedScope) {
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) items.value[index] = updated
      sharedStore.upsert(updated, requestedScope)
    }
    return updated
  }

  const remove = async (id: string) => {
    const requestedScope = sharedStore.currentCacheScope()
    await service.remove(id)
    if (requestedScope && sharedStore.currentCacheScope() === requestedScope) {
      items.value = items.value.filter(i => i.id !== id)
      sharedStore.removeFromCache(id, requestedScope)
    }
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
