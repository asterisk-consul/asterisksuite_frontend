import { computed } from 'vue'
import { useDocumentSequencesStore } from '../store/document-sequences.store'
import type { CreateDocumentSequenceInput, UpdateDocumentSequenceInput } from '../types/document-sequences.types'

export interface SequenceSelectItem {
  label: string
  value: string
}

export function useDocumentSequences() {
  const store = useDocumentSequencesStore()

  const init = async () => {
    await store.fetchAll()
  }

  const create = async (payload: CreateDocumentSequenceInput) => store.create(payload)
  const update = async (id: string, payload: UpdateDocumentSequenceInput) => store.update(id, payload)
  const remove = async (id: string) => store.remove(id)

  const items = computed<SequenceSelectItem[]>(() =>
    store.items.map(seq => ({
      label: `${seq.name} (PV: ${seq.point_of_sale}${seq.prefix ? ' - ' + seq.prefix : ''})`,
      value: seq.id
    }))
  )

  const findById = (id: string) => store.items.find(s => s.id === id)

  const formatLabel = (id: string) => {
    const seq = store.items.find(s => s.id === id)
    return seq ? `${seq.name} (PV: ${seq.point_of_sale})` : ''
  }

  const getSequence = async (id: string) => {
    const local = findById(id)
    if (local) return local
    return await store.fetchOne(id)
  }

  const totalSequences = computed(() => store.items.length)
  const activeSequences = computed(() => store.items.filter(s => s.active !== false).length)

  return {
    sequences: computed(() => store.items),
    current: computed(() => store.current),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),
    items,
    activeSequences,
    totalSequences,
    findById,
    formatLabel,
    getSequence,
    init,
    create,
    update,
    remove
  }
}
