import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBankConceptsService } from '../service/bank-concepts.service'

export const useBankConceptsStore = defineStore('bankConcepts', () => {
  const service = useBankConceptsService()

  const items = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeItems = computed(() => items.value.filter(i => i.is_active !== false))

  const fetchAll = async () => {
    try {
      loading.value = true
      items.value = await service.findAll()
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: any) => {
    const created = await service.create(payload)
    items.value.push(created)
    return created
  }

  const update = async (id: string, payload: any) => {
    const updated = await service.update(id, payload)
    const index = items.value.findIndex(i => i.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  const remove = async (id: string) => {
    await service.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  return {
    items, loading, error,
    activeItems,
    fetchAll, create, update, remove
  }
})
