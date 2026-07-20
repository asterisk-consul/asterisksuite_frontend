import { computed } from 'vue'
import { useBankConceptsStore } from '../store/bank-concepts.store'

export interface SelectItem {
  label: string
  value: string
}

export function useBankConcepts() {
  const store = useBankConceptsStore()

  const init = async () => {
    await store.fetchAll()
  }

  const create = async (payload: any) => store.create(payload)
  const update = async (id: string, payload: any) => store.update(id, payload)
  const remove = async (id: string) => store.remove(id)

  const items = computed(() =>
    store.items.map(c => ({
      label: `${c.code} - ${c.name}`,
      value: c.id
    }))
  )

  const conceptsByType = computed(() => {
    const map = new Map<string, any[]>()
    for (const c of store.items) {
      if (!map.has(c.concept_type)) map.set(c.concept_type, [])
      map.get(c.concept_type)!.push(c)
    }
    return map
  })

  const findById = (id: string) => store.items.find(c => c.id === id)

  return {
    concepts: computed(() => store.items),
    activeConcepts: computed(() => store.activeItems),
    loading: computed(() => store.loading),
    total: computed(() => store.items.length),
    items,
    conceptsByType,
    findById,
    init,
    create,
    update,
    remove
  }
}
