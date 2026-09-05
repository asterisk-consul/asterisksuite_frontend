import { defineStore } from 'pinia'
import { usePriceListsService } from '../services/price-lists.service'
import type {
  PriceList,
  CreatePriceListInput,
  UpdatePriceListInput
} from '../types/price-list.types'

export const usePriceListsStore = defineStore('priceLists', () => {
  const items = ref<PriceList[]>([])
  const current = ref<PriceList | null>(null)
  const loading = ref(false)
  const service = usePriceListsService()

  const fetchAll = async (type?: string) => {
    loading.value = true
    try {
      items.value = await service.getAll(type)
    } finally {
      loading.value = false
    }
  }

  const fetchById = async (id: string) => {
    loading.value = true
    try {
      current.value = await service.getById(id)
    } finally {
      loading.value = false
    }
  }

  const create = async (data: CreatePriceListInput) => {
    const item = await service.create(data)
    items.value.unshift(item)
    return item
  }

  const update = async (id: string, data: UpdatePriceListInput) => {
    const updated = await service.update(id, data)
    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) items.value[index] = updated
    if (current.value?.id === id) current.value = updated
    return updated
  }

  const remove = async (id: string) => {
    await service.remove(id)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, current, loading, fetchAll, fetchById, create, update, remove }
})
