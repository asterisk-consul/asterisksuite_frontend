import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDocumentSequencesService } from '../service/document-sequences.service'
import type {
  DocumentSequence,
  CreateDocumentSequenceInput,
  UpdateDocumentSequenceInput
} from '../types/document-sequences.types'

export const useDocumentSequencesStore = defineStore('documentSequences', () => {
  const service = useDocumentSequencesService()

  const items = ref<DocumentSequence[]>([])
  const current = ref<DocumentSequence | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeItems = computed(() => items.value.filter(i => i.active !== false))

  const fetchAll = async () => {
    try {
      loading.value = true
      items.value = await service.findAll()
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      const data = await service.findOne(id)
      current.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateDocumentSequenceInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(payload)
      items.value.push(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear secuencia'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdateDocumentSequenceInput) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.update(id, payload)
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) items.value[index] = updated
      if (current.value?.id === id) current.value = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
    if (current.value?.id === id) current.value = null
  }

  return {
    items, current, loading, error,
    activeItems,
    fetchAll, fetchOne, create, update, remove
  }
})
